-- ==============================================================================
-- Cindyrella Clinic & Spa Management System
-- Migration 0055: Consumables / Back-Bar Inventory Auto-Deduction System
-- ==============================================================================

-- 1. Extend treatment_materials table with metadata and unit cost tracking
ALTER TABLE treatment_materials 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS unit_cost numeric(10,2) DEFAULT 0;

-- 2. Seed Standard Clinic Back-Bar Consumable Items
DO $$
DECLARE
  v_cat_ivs uuid;
  v_cat_atp uuid;
  v_cat_mcp uuid;
  v_cat_skn uuid;
BEGIN
  SELECT id INTO v_cat_ivs FROM inventory_categories WHERE code = 'IVS';
  SELECT id INTO v_cat_atp FROM inventory_categories WHERE code = 'ATP';
  SELECT id INTO v_cat_mcp FROM inventory_categories WHERE code = 'MCP';
  SELECT id INTO v_cat_skn FROM inventory_categories WHERE code = 'SKN';

  -- Seed default supplies if not existing by SKU
  INSERT INTO inventory_items (name, sku, category, category_id, subcategory, unit, current_stock, low_stock_threshold, cost_price, reorder_quantity, brand, description)
  VALUES
    ('Glutathione 1200mg Drip Solution Vial', 'DRIP-GLUTA-1200', 'Consumables', v_cat_atp, 'Vials', 'vials', 120, 15, 180, 50, 'PharmaDerm', 'Pure reduced clinical-grade glutathione sterile solution for IV infusion'),
    ('Ascorbic Acid Vitamin C 500mg Ampoule', 'VITC-AMP-500', 'Consumables', v_cat_atp, 'Ampoules', 'ampoules', 200, 25, 35, 100, 'MedSupply', 'High potency vitamin C booster ampoule for skin brightening drip'),
    ('PNSS 500ml 0.9% Normal Saline Bag', 'IVS-PNSS-500', 'IV Bags', v_cat_ivs, 'IV Bags', 'bags', 95, 20, 65, 40, 'Euro-Med', 'Sterile 0.9% sodium chloride infusion bag 500ml carrier'),
    ('Butterfly Needle & Infusion Set 24G', 'MED-BUTTERFLY-24G', 'Consumables', v_cat_ivs, 'Infusion Sets', 'sets', 150, 30, 28, 60, 'Nipro Medical', 'Ultra-thin wall safety winged infusion needle set 24G with tubing'),
    ('Alcohol Prep Swabs (70% Isopropyl)', 'MED-ALCOHOL-SWAB', 'Consumables', v_cat_mcp, 'Alcohol Swabs', 'pcs', 600, 100, 2, 200, 'MedSupply', 'Individually wrapped antiseptic disinfectant swabs for clinical prep'),
    ('Deep Facial Cleanser Solution (10ml dose)', 'CLN-FACIAL-10ML', 'Consumables', v_cat_skn, 'Cleansers', 'ml', 1200, 200, 15, 500, 'BeautyGlow', 'Gentle clarifying pH-balanced cleanser solution for pre-treatment facials'),
    ('Medical Sterile Cotton Pads & Gauze', 'MED-COTTON-PADS', 'Consumables', v_cat_mcp, 'Gauze & Cotton', 'pcs', 850, 150, 3, 300, 'MedSupply', 'Lint-free 100% pure medical absorbent cotton pads for skin extraction & toning'),
    ('Cooling Ultrasound Transmission Gel', 'GEL-ULTRASOUND-20ML', 'Consumables', v_cat_mcp, 'Serums', 'ml', 2500, 350, 10, 800, 'ClinicPro', 'Acoustically correct laser and HIFU cooling transmission gel'),
    ('Topical Anesthetic Numbing Cream 30g', 'NUMB-CREAM-30G', 'Consumables', v_cat_atp, 'Creams', 'tubes', 45, 10, 140, 20, 'PharmaDerm', 'Fast-acting topical lidocaine numbing cream for painless clinical procedures'),
    ('Collagen Hydrating Sheet Mask', 'MASK-COLLAGEN-HYDRA', 'Consumables', v_cat_skn, 'Serums', 'sheets', 110, 20, 45, 50, 'BeautyGlow', 'Soothing post-facial recovery sheet mask infused with marine collagen')
  ON CONFLICT DO NOTHING;

  -- Distribute initial stock across all existing branches in inventory_stock_balances
  INSERT INTO inventory_stock_balances (item_id, branch_id, quantity, low_stock_threshold, reorder_quantity)
  SELECT 
    i.id,
    b.id,
    CASE WHEN b.name = 'Davao' THEN i.current_stock ELSE FLOOR(i.current_stock / 2)::int END,
    i.low_stock_threshold,
    i.reorder_quantity
  FROM inventory_items i
  CROSS JOIN branches b
  WHERE i.sku IN (
    'DRIP-GLUTA-1200', 'VITC-AMP-500', 'IVS-PNSS-500', 'MED-BUTTERFLY-24G',
    'MED-ALCOHOL-SWAB', 'CLN-FACIAL-10ML', 'MED-COTTON-PADS', 'GEL-ULTRASOUND-20ML',
    'NUMB-CREAM-30G', 'MASK-COLLAGEN-HYDRA'
  )
  ON CONFLICT (item_id, branch_id) DO NOTHING;
END $$;

-- 3. Link Standard Consumables Recipes (BOM) to Existing Treatments
DO $$
DECLARE
  v_item_gluta uuid;
  v_item_vitc uuid;
  v_item_pnss uuid;
  v_item_needle uuid;
  v_item_alcohol uuid;
  v_item_cleanser uuid;
  v_item_cotton uuid;
  v_item_mask uuid;
  v_item_gel uuid;
  v_treatment record;
BEGIN
  SELECT id INTO v_item_gluta FROM inventory_items WHERE sku = 'DRIP-GLUTA-1200' LIMIT 1;
  SELECT id INTO v_item_vitc FROM inventory_items WHERE sku = 'VITC-AMP-500' LIMIT 1;
  SELECT id INTO v_item_pnss FROM inventory_items WHERE sku = 'IVS-PNSS-500' LIMIT 1;
  SELECT id INTO v_item_needle FROM inventory_items WHERE sku = 'MED-BUTTERFLY-24G' LIMIT 1;
  SELECT id INTO v_item_alcohol FROM inventory_items WHERE sku = 'MED-ALCOHOL-SWAB' LIMIT 1;
  SELECT id INTO v_item_cleanser FROM inventory_items WHERE sku = 'CLN-FACIAL-10ML' LIMIT 1;
  SELECT id INTO v_item_cotton FROM inventory_items WHERE sku = 'MED-COTTON-PADS' LIMIT 1;
  SELECT id INTO v_item_mask FROM inventory_items WHERE sku = 'MASK-COLLAGEN-HYDRA' LIMIT 1;
  SELECT id INTO v_item_gel FROM inventory_items WHERE sku = 'GEL-ULTRASOUND-20ML' LIMIT 1;

  -- A. Link Drip treatments (Glutathione, Total Glow, Luxury Glow, Recovery Drip)
  FOR v_treatment IN 
    SELECT id, name, slug FROM treatments 
    WHERE slug IN ('luxury-glow', 'total-glow-drip', 'glow-boost', 'radiance-plus', 'recovery-drip')
       OR lower(name) LIKE '%drip%'
       OR lower(name) LIKE '%glow%'
  LOOP
    IF v_item_gluta IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_gluta, 1, '1 sterile vial active glutathione solution')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;

    IF v_item_vitc IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_vitc, 1, '1 ampoule ascorbic acid antioxidant booster')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;

    IF v_item_pnss IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_pnss, 1, '500ml normal saline carrier bag')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;

    IF v_item_needle IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_needle, 1, '24G butterfly needle & infusion tubing set')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;

    IF v_item_alcohol IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_alcohol, 2, '2 alcohol prep pads for venipuncture site')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;
  END LOOP;

  -- B. Link Facial treatments
  FOR v_treatment IN 
    SELECT id, name, slug FROM treatments 
    WHERE lower(name) LIKE '%facial%' 
       OR lower(slug) LIKE '%facial%'
  LOOP
    IF v_item_cleanser IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_cleanser, 10, '10ml clarifying cleanser solution')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;

    IF v_item_cotton IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_cotton, 4, '4 lint-free sterile cotton pads')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;

    IF v_item_mask IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_mask, 1, '1 hydrating soothing post-treatment mask')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;
  END LOOP;

  -- C. Link Laser & Diode treatments
  FOR v_treatment IN 
    SELECT id, name, slug FROM treatments 
    WHERE lower(name) LIKE '%laser%' 
       OR lower(slug) LIKE '%laser%'
       OR lower(name) LIKE '%diode%'
  LOOP
    IF v_item_gel IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_gel, 20, '20ml cooling optical transmission gel')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;

    IF v_item_alcohol IS NOT NULL THEN
      INSERT INTO treatment_materials (treatment_id, item_id, quantity_required, notes)
      VALUES (v_treatment.id, v_item_alcohol, 2, 'Sanitization of handpiece and treatment area')
      ON CONFLICT (treatment_id, item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END IF;
  END LOOP;
END $$;

-- 4. Stored Procedure: Deduct inventory atomically for a package session redemption
CREATE OR REPLACE FUNCTION deduct_inventory_for_package_redemption(
  p_package_id uuid,
  p_session_number integer,
  p_branch_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_pkg record;
  v_treatment_id uuid;
  v_treatment_name text;
  v_material record;
  v_prev_stock integer;
  v_new_stock integer;
  v_prev_branch_stock integer;
  v_new_branch_stock integer;
  v_ref text;
  v_movement_ref text;
  v_deducted_count integer := 0;
  v_deducted_items jsonb := '[]'::jsonb;
  v_branch_id uuid;
  v_already_deducted boolean;
BEGIN
  -- 1. Fetch package
  SELECT id, package_name, treatment_id, branch_id
  INTO v_pkg
  FROM customer_packages
  WHERE id = p_package_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Package not found');
  END IF;

  v_ref := 'PKG-' || upper(substr(p_package_id::text, 1, 8)) || '-S' || p_session_number;
  v_branch_id := COALESCE(p_branch_id, v_pkg.branch_id);

  -- 2. Guard: Prevent double deduction for this specific session
  SELECT EXISTS(
    SELECT 1 FROM inventory_movements 
    WHERE reference_id = v_ref 
    AND movement_type = 'stock_out'
  ) INTO v_already_deducted;

  IF v_already_deducted THEN
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Inventory was already deducted for ' || v_ref,
      'count', 0,
      'reference', v_ref
    );
  END IF;

  -- 3. Resolve treatment_id
  v_treatment_id := v_pkg.treatment_id;
  IF v_treatment_id IS NULL THEN
    SELECT id, name INTO v_treatment_id, v_treatment_name
    FROM treatments
    WHERE lower(v_pkg.package_name) LIKE '%' || lower(name) || '%'
       OR lower(name) LIKE '%' || lower(v_pkg.package_name) || '%'
    LIMIT 1;
  ELSE
    SELECT name INTO v_treatment_name FROM treatments WHERE id = v_treatment_id;
  END IF;

  IF v_treatment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No matching treatment found to deduct supplies for package "' || v_pkg.package_name || '".',
      'count', 0,
      'reference', v_ref
    );
  END IF;

  -- 4. Loop through materials linked to this treatment
  FOR v_material IN
    SELECT tm.item_id, tm.quantity_required, i.name as item_name, i.unit, i.current_stock, i.low_stock_threshold
    FROM treatment_materials tm
    JOIN inventory_items i ON i.id = tm.item_id
    WHERE tm.treatment_id = v_treatment_id
  LOOP
    v_prev_stock := v_material.current_stock;
    v_new_stock := GREATEST(0, v_prev_stock - v_material.quantity_required);

    -- Deduct global stock
    UPDATE inventory_items
    SET current_stock = v_new_stock,
        updated_at = now()
    WHERE id = v_material.item_id;

    -- Deduct branch stock balance if branch is set
    IF v_branch_id IS NOT NULL THEN
      SELECT quantity INTO v_prev_branch_stock
      FROM inventory_stock_balances
      WHERE item_id = v_material.item_id AND branch_id = v_branch_id;

      IF FOUND THEN
        v_new_branch_stock := GREATEST(0, v_prev_branch_stock - v_material.quantity_required);
        UPDATE inventory_stock_balances
        SET quantity = v_new_branch_stock,
            updated_at = now()
        WHERE item_id = v_material.item_id AND branch_id = v_branch_id;
      ELSE
        INSERT INTO inventory_stock_balances (item_id, branch_id, quantity, updated_at)
        VALUES (v_material.item_id, v_branch_id, 0, now())
        ON CONFLICT (item_id, branch_id) DO UPDATE
        SET quantity = GREATEST(0, inventory_stock_balances.quantity - v_material.quantity_required),
            updated_at = now();
      END IF;
    END IF;

    -- Audit ledger entry
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
      v_branch_id,
      v_prev_stock,
      v_new_stock,
      'Package Redemption: ' || v_pkg.package_name || ' (Session ' || p_session_number || ')',
      'Auto-deducted consumables for package ' || v_pkg.package_name || ' session ' || p_session_number,
      v_ref,
      p_user_id
    );

    -- Legacy fallback
    INSERT INTO inventory_logs (
      item_id,
      change_amount,
      reason,
      created_by
    ) VALUES (
      v_material.item_id,
      -v_material.quantity_required,
      'Package Session ' || p_session_number || ': ' || v_pkg.package_name,
      p_user_id
    );

    -- Check if stock hit low stock threshold and trigger staff notification
    IF v_new_stock <= v_material.low_stock_threshold THEN
      BEGIN
        INSERT INTO staff_notifications (
          recipient_id,
          branch_id,
          title,
          message,
          type,
          link,
          metadata
        )
        SELECT 
          s.id,
          v_branch_id,
          '⚠️ Low Stock Alert: ' || v_material.item_name,
          'Remaining stock is now ' || v_new_stock || ' ' || v_material.unit || ' (threshold: ' || v_material.low_stock_threshold || '). Reorder recommended.',
          'inventory_low_stock',
          '/admin/inventory',
          jsonb_build_object(
            'item_id', v_material.item_id,
            'item_name', v_material.item_name,
            'current_stock', v_new_stock,
            'low_stock_threshold', v_material.low_stock_threshold
          )
        FROM staff s
        JOIN roles r ON r.id = s.role_id
        WHERE r.name IN ('super_admin', 'admin', 'manager')
          AND s.is_active = true
          AND (s.branch_id = v_branch_id OR s.branch_id IS NULL)
        LIMIT 5;
      EXCEPTION WHEN OTHERS THEN
        -- Graceful skip if notification table schema differs
      END;
    END IF;

    v_deducted_count := v_deducted_count + 1;
    v_deducted_items := v_deducted_items || jsonb_build_object(
      'itemId', v_material.item_id,
      'itemName', v_material.item_name,
      'quantity', v_material.quantity_required,
      'unit', v_material.unit,
      'newStock', v_new_stock
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Deducted ' || v_deducted_count || ' back-bar consumables for ' || v_pkg.package_name,
    'count', v_deducted_count,
    'deductedItems', v_deducted_items,
    'referenceNumber', v_ref
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

