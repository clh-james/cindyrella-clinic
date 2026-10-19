-- ==============================================================================
-- Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
-- Migration 0040: Automated Used Items Deduction & Treatment Materials (BOM)
-- ==============================================================================

-- 1. Ensure indexes on treatment_materials
CREATE INDEX IF NOT EXISTS idx_treatment_materials_treatment_id ON treatment_materials(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_materials_item_id ON treatment_materials(item_id);

-- 2. Stored Procedure: Deduct inventory for an appointment atomically
CREATE OR REPLACE FUNCTION deduct_inventory_for_appointment(
  p_appointment_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_appointment record;
  v_treatment_name text;
  v_material record;
  v_item record;
  v_prev_stock integer;
  v_new_stock integer;
  v_prev_branch_stock integer;
  v_new_branch_stock integer;
  v_already_deducted boolean;
  v_deducted_count integer := 0;
  v_ref text;
  v_movement_ref text;
BEGIN
  -- Get appointment
  SELECT a.id, a.reference_number, a.treatment_id, a.branch_id, t.name as treatment_name
  INTO v_appointment
  FROM appointments a
  JOIN treatments t ON t.id = a.treatment_id
  WHERE a.id = p_appointment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;

  v_ref := v_appointment.reference_number;
  v_treatment_name := v_appointment.treatment_name;

  -- Guard: check if already deducted to prevent duplicate stock out
  SELECT EXISTS(
    SELECT 1 FROM inventory_movements 
    WHERE reference_id = v_ref 
    AND movement_type = 'stock_out'
  ) INTO v_already_deducted;

  IF v_already_deducted THEN
    RETURN jsonb_build_object('success', true, 'message', 'Inventory already deducted for this appointment', 'count', 0);
  END IF;

  -- Loop through materials for this treatment
  FOR v_material IN
    SELECT tm.item_id, tm.quantity_required, i.name as item_name, i.unit, i.current_stock
    FROM treatment_materials tm
    JOIN inventory_items i ON i.id = tm.item_id
    WHERE tm.treatment_id = v_appointment.treatment_id
  LOOP
    v_prev_stock := v_material.current_stock;
    v_new_stock := GREATEST(0, v_prev_stock - v_material.quantity_required);

    -- 1. Decrement global current_stock
    UPDATE inventory_items
    SET current_stock = v_new_stock,
        updated_at = now()
    WHERE id = v_material.item_id;

    -- 2. Decrement branch stock balance if branch_id is set
    IF v_appointment.branch_id IS NOT NULL THEN
      SELECT quantity INTO v_prev_branch_stock
      FROM inventory_stock_balances
      WHERE item_id = v_material.item_id AND branch_id = v_appointment.branch_id;

      IF FOUND THEN
        v_new_branch_stock := GREATEST(0, v_prev_branch_stock - v_material.quantity_required);
        UPDATE inventory_stock_balances
        SET quantity = v_new_branch_stock,
            updated_at = now()
        WHERE item_id = v_material.item_id AND branch_id = v_appointment.branch_id;
      ELSE
        v_new_branch_stock := 0;
        INSERT INTO inventory_stock_balances (item_id, branch_id, quantity, updated_at)
        VALUES (v_material.item_id, v_appointment.branch_id, 0, now())
        ON CONFLICT (item_id, branch_id) DO UPDATE
        SET quantity = GREATEST(0, inventory_stock_balances.quantity - v_material.quantity_required),
            updated_at = now();
      END IF;
    END IF;

    -- 3. Log movement in audit ledger
    v_movement_ref := 'OUT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4));

    INSERT INTO inventory_movements (
      reference_number,
      item_id,
      movement_type,
      quantity,
      unit,
      source_branch_id,
      previous_quantity,
      new_quantity,
      reason,
      notes,
      reference_id,
      performed_by
    ) VALUES (
      v_movement_ref,
      v_material.item_id,
      'stock_out',
      v_material.quantity_required,
      v_material.unit,
      v_appointment.branch_id,
      v_prev_stock,
      v_new_stock,
      'Treatment Completed: ' || v_treatment_name,
      'Automated deduction for appointment #' || v_ref,
      v_ref,
      p_user_id
    );

    -- 4. Legacy log fallback
    INSERT INTO inventory_logs (
      item_id,
      change_amount,
      reason,
      created_by
    ) VALUES (
      v_material.item_id,
      -v_material.quantity_required,
      'Treatment Completed: ' || v_treatment_name || ' (' || v_ref || ')',
      p_user_id
    );

    v_deducted_count := v_deducted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Deducted ' || v_deducted_count || ' items from inventory',
    'count', v_deducted_count,
    'appointment_ref', v_ref
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Stored Procedure: Reverse inventory deduction if appointment cancelled/reset
CREATE OR REPLACE FUNCTION reverse_inventory_deduction_for_appointment(
  p_appointment_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Appointment Cancelled'
)
RETURNS jsonb AS $$
DECLARE
  v_appointment record;
  v_movement record;
  v_restored_count integer := 0;
  v_curr_stock integer;
  v_rev_ref text;
BEGIN
  SELECT a.id, a.reference_number, a.branch_id, t.name as treatment_name
  INTO v_appointment
  FROM appointments a
  JOIN treatments t ON t.id = a.treatment_id
  WHERE a.id = p_appointment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;

  -- Find all stock_out movements for this reference_id
  FOR v_movement IN
    SELECT * FROM inventory_movements
    WHERE reference_id = v_appointment.reference_number
    AND movement_type = 'stock_out'
  LOOP
    SELECT current_stock INTO v_curr_stock FROM inventory_items WHERE id = v_movement.item_id;

    -- Restore global stock
    UPDATE inventory_items
    SET current_stock = current_stock + v_movement.quantity,
        updated_at = now()
    WHERE id = v_movement.item_id;

    -- Restore branch stock
    IF v_appointment.branch_id IS NOT NULL THEN
      UPDATE inventory_stock_balances
      SET quantity = quantity + v_movement.quantity,
          updated_at = now()
      WHERE item_id = v_movement.item_id AND branch_id = v_appointment.branch_id;
    END IF;

    -- Log reversal movement
    v_rev_ref := 'RET-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4));

    INSERT INTO inventory_movements (
      reference_number,
      item_id,
      movement_type,
      quantity,
      unit,
      destination_branch_id,
      previous_quantity,
      new_quantity,
      reason,
      notes,
      reference_id,
      performed_by
    ) VALUES (
      v_rev_ref,
      v_movement.item_id,
      'customer_return',
      v_movement.quantity,
      v_movement.unit,
      v_appointment.branch_id,
      v_curr_stock,
      v_curr_stock + v_movement.quantity,
      'Reversal: ' || p_reason,
      'Reversed appointment #' || v_appointment.reference_number,
      v_appointment.reference_number || '-REV',
      p_user_id
    );

    v_restored_count := v_restored_count + 1;
  END LOOP;

  -- Delete or mark original stock_outs so reversal isn't double-run
  DELETE FROM inventory_movements 
  WHERE reference_id = v_appointment.reference_number 
  AND movement_type = 'stock_out';

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Restored ' || v_restored_count || ' items to inventory',
    'count', v_restored_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
