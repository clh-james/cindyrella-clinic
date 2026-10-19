import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE env variables in deduction engine.");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface DeductedItemSummary {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  previousStock: number;
  newStock: number;
}

export interface DeductionResult {
  success: boolean;
  error?: string;
  message?: string;
  count: number;
  deductedItems: DeductedItemSummary[];
  referenceNumber?: string;
}

function generateMovementRef(prefix: string = "OUT") {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

/**
 * Automatically deducts used items (materials/consumables) from inventory
 * when an appointment or treatment is completed.
 * Updates both global stock (`inventory_items`) and branch balances (`inventory_stock_balances`),
 * and records the full audit trail in `inventory_movements`.
 */
export async function deductAppointmentInventory(
  appointmentId: string,
  performedByUserId?: string
): Promise<DeductionResult> {
  const supabase = getAdminClient();

  try {
    // 1. Fetch appointment details
    const { data: appointment, error: apptErr } = await supabase
      .from("appointments")
      .select("id, reference_number, treatment_id, branch_id, treatments(id, name)")
      .eq("id", appointmentId)
      .single();

    if (apptErr || !appointment) {
      return {
        success: false,
        error: "Appointment not found.",
        count: 0,
        deductedItems: [],
      };
    }

    const refNumber = appointment.reference_number;
    const treatment = appointment.treatments as unknown as { id: string; name: string } | null;
    const treatmentName = treatment?.name || "Clinic Treatment";

    // 2. Guard against duplicate deductions (Idempotency)
    const { data: existingMovements } = await supabase
      .from("inventory_movements")
      .select("id")
      .eq("reference_id", refNumber)
      .eq("movement_type", "stock_out")
      .limit(1);

    if (existingMovements && existingMovements.length > 0) {
      return {
        success: true,
        message: `Inventory was already deducted for appointment #${refNumber}.`,
        count: 0,
        deductedItems: [],
        referenceNumber: refNumber,
      };
    }

    // 3. Fetch materials / recipe for this treatment
    const { data: materials, error: matErr } = await supabase
      .from("treatment_materials")
      .select("item_id, quantity_required, inventory_items(id, name, unit, current_stock)")
      .eq("treatment_id", appointment.treatment_id);

    if (matErr) {
      return {
        success: false,
        error: `Failed to fetch treatment recipe: ${matErr.message}`,
        count: 0,
        deductedItems: [],
      };
    }

    if (!materials || materials.length === 0) {
      return {
        success: true,
        message: `No consumable recipe mapped for treatment "${treatmentName}".`,
        count: 0,
        deductedItems: [],
        referenceNumber: refNumber,
      };
    }

    const deductedItems: DeductedItemSummary[] = [];

    // 4. Deduct each required item from stock
    for (const mat of materials) {
      const item = mat.inventory_items as unknown as {
        id: string;
        name: string;
        unit: string;
        current_stock: number;
      } | null;

      if (!item) continue;

      const qtyRequired = Number(mat.quantity_required) || 1;
      const prevStock = Number(item.current_stock) || 0;
      const newStock = Math.max(0, prevStock - qtyRequired);

      // Decrement global inventory_items stock
      await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      // Decrement branch stock balance if branch_id is present
      if (appointment.branch_id) {
        try {
          const { data: branchBalance } = await supabase
            .from("inventory_stock_balances")
            .select("quantity")
            .eq("item_id", item.id)
            .eq("branch_id", appointment.branch_id)
            .maybeSingle();

          if (branchBalance) {
            const branchPrev = Number(branchBalance.quantity) || 0;
            const branchNew = Math.max(0, branchPrev - qtyRequired);
            await supabase
              .from("inventory_stock_balances")
              .update({
                quantity: branchNew,
                updated_at: new Date().toISOString(),
              })
              .eq("item_id", item.id)
              .eq("branch_id", appointment.branch_id);
          } else {
            // Initialize branch stock with remaining quantity
            await supabase
              .from("inventory_stock_balances")
              .upsert(
                {
                  item_id: item.id,
                  branch_id: appointment.branch_id,
                  quantity: newStock,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "item_id,branch_id" }
              );
          }
        } catch (bErr) {
          console.error("Failed to update branch balance:", bErr);
        }
      }

      // Log to inventory_movements ledger
      const movementRef = generateMovementRef("OUT");
      try {
        await supabase.from("inventory_movements").insert({
          reference_number: movementRef,
          item_id: item.id,
          movement_type: "stock_out",
          quantity: qtyRequired,
          unit: item.unit || "pcs",
          source_branch_id: appointment.branch_id || null,
          previous_quantity: prevStock,
          new_quantity: newStock,
          reason: `Treatment Completed: ${treatmentName}`,
          notes: `Automated deduction for appointment #${refNumber}`,
          reference_id: refNumber,
          performed_by: performedByUserId || null,
        });
      } catch (movErr) {
        console.error("Failed to insert inventory movement:", movErr);
      }

      // Legacy audit fallback to inventory_logs
      try {
        await supabase.from("inventory_logs").insert({
          item_id: item.id,
          change_amount: -qtyRequired,
          reason: `Treatment Completed: ${treatmentName} (${refNumber})`,
          created_by: performedByUserId || null,
        });
      } catch {
        // Ignore fallback error
      }

      deductedItems.push({
        itemId: item.id,
        itemName: item.name,
        quantity: qtyRequired,
        unit: item.unit,
        previousStock: prevStock,
        newStock: newStock,
      });
    }

    return {
      success: true,
      message: `Successfully deducted ${deductedItems.length} used items for ${treatmentName}.`,
      count: deductedItems.length,
      deductedItems,
      referenceNumber: refNumber,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error during deduction";
    console.error("deductAppointmentInventory error:", err);
    return {
      success: false,
      error: message,
      count: 0,
      deductedItems: [],
    };
  }
}

/**
 * Reverses inventory deductions if an appointment is cancelled or marked no-show
 * after having previously been marked completed.
 */
export async function reverseAppointmentInventory(
  appointmentId: string,
  performedByUserId?: string,
  reason: string = "Appointment Cancelled"
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = getAdminClient();

  try {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, reference_number, branch_id, treatments(name)")
      .eq("id", appointmentId)
      .single();

    if (!appointment) return { success: false, count: 0, error: "Appointment not found" };

    const refNumber = appointment.reference_number;

    // Find all stock_out movements for this appointment
    const { data: movements } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("reference_id", refNumber)
      .eq("movement_type", "stock_out");

    if (!movements || movements.length === 0) {
      return { success: true, count: 0 };
    }

    let restoredCount = 0;

    for (const mov of movements) {
      // Get current stock
      const { data: item } = await supabase
        .from("inventory_items")
        .select("id, current_stock")
        .eq("id", mov.item_id)
        .single();

      if (!item) continue;

      const restoredStock = item.current_stock + mov.quantity;

      // Update global stock
      await supabase
        .from("inventory_items")
        .update({
          current_stock: restoredStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      // Update branch stock
      if (appointment.branch_id) {
        const { data: bStock } = await supabase
          .from("inventory_stock_balances")
          .select("quantity")
          .eq("item_id", item.id)
          .eq("branch_id", appointment.branch_id)
          .maybeSingle();

        if (bStock) {
          await supabase
            .from("inventory_stock_balances")
            .update({
              quantity: bStock.quantity + mov.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq("item_id", item.id)
            .eq("branch_id", appointment.branch_id);
        }
      }

      // Log reversal movement
      const revRef = generateMovementRef("RET");
      await supabase.from("inventory_movements").insert({
        reference_number: revRef,
        item_id: item.id,
        movement_type: "customer_return",
        quantity: mov.quantity,
        unit: mov.unit,
        destination_branch_id: appointment.branch_id || null,
        previous_quantity: item.current_stock,
        new_quantity: restoredStock,
        reason: `Reversal: ${reason}`,
        notes: `Restored inventory for appointment #${refNumber}`,
        reference_id: `${refNumber}-REV`,
        performed_by: performedByUserId || null,
      });

      restoredCount++;
    }

    // Remove or neutralize the original stock_outs to avoid double reversals
    await supabase
      .from("inventory_movements")
      .delete()
      .eq("reference_id", refNumber)
      .eq("movement_type", "stock_out");

    return { success: true, count: restoredCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error reversing inventory";
    return { success: false, count: 0, error: message };
  }
}

/**
 * Records clinical used items or custom consumables directly
 * used during a treatment session (e.g. extra syringes, extra vials).
 */
export async function recordDirectUsedItems(input: {
  appointmentId?: string;
  referenceNumber?: string;
  branchId?: string;
  treatmentName?: string;
  items: { itemId: string; quantity: number }[];
  performedByUserId?: string;
  reason?: string;
  notes?: string;
}): Promise<DeductionResult> {
  const supabase = getAdminClient();

  try {
    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        error: "No items specified to deduct.",
        count: 0,
        deductedItems: [],
      };
    }

    const deductedItems: DeductedItemSummary[] = [];
    const ref = input.referenceNumber || (input.appointmentId ? `APPT-${input.appointmentId.slice(0, 8)}` : `USE-${Date.now()}`);

    for (const target of input.items) {
      if (target.quantity <= 0) continue;

      const { data: item } = await supabase
        .from("inventory_items")
        .select("id, name, unit, current_stock")
        .eq("id", target.itemId)
        .single();

      if (!item) continue;

      const prevStock = item.current_stock;
      const newStock = Math.max(0, prevStock - target.quantity);

      // Update global stock
      await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      // Update branch stock
      if (input.branchId) {
        const { data: bStock } = await supabase
          .from("inventory_stock_balances")
          .select("quantity")
          .eq("item_id", item.id)
          .eq("branch_id", input.branchId)
          .maybeSingle();

        if (bStock) {
          await supabase
            .from("inventory_stock_balances")
            .update({
              quantity: Math.max(0, bStock.quantity - target.quantity),
              updated_at: new Date().toISOString(),
            })
            .eq("item_id", item.id)
            .eq("branch_id", input.branchId);
        } else {
          await supabase.from("inventory_stock_balances").upsert(
            {
              item_id: item.id,
              branch_id: input.branchId,
              quantity: newStock,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "item_id,branch_id" }
          );
        }
      }

      // Log movement
      const movRef = generateMovementRef("OUT");
      await supabase.from("inventory_movements").insert({
        reference_number: movRef,
        item_id: item.id,
        movement_type: "stock_out",
        quantity: target.quantity,
        unit: item.unit,
        source_branch_id: input.branchId || null,
        previous_quantity: prevStock,
        new_quantity: newStock,
        reason: input.reason || (input.treatmentName ? `Treatment Usage: ${input.treatmentName}` : "Clinical Session Consumables"),
        notes: input.notes || `Direct item usage for ${ref}`,
        reference_id: ref,
        performed_by: input.performedByUserId || null,
      });

      deductedItems.push({
        itemId: item.id,
        itemName: item.name,
        quantity: target.quantity,
        unit: item.unit,
        previousStock: prevStock,
        newStock: newStock,
      });
    }

    return {
      success: true,
      message: `Recorded and deducted ${deductedItems.length} consumables from inventory.`,
      count: deductedItems.length,
      deductedItems,
      referenceNumber: ref,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error recording used items";
    return {
      success: false,
      error: message,
      count: 0,
      deductedItems: [],
    };
  }
}
