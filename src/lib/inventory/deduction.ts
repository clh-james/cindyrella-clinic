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

async function checkAndAlertLowStock(
  supabase: ReturnType<typeof getAdminClient>,
  item: { id: string; name: string; unit: string; low_stock_threshold?: number },
  newStock: number,
  branchId?: string | null
) {
  const threshold = item.low_stock_threshold ?? 5;
  if (newStock <= threshold) {
    try {
      const { data: staffAdmins } = await supabase
        .from("staff")
        .select("id, branch_id, roles(name)")
        .eq("is_active", true);

      const targetRecipients = (staffAdmins || []).filter((s: any) => {
        const role = Array.isArray(s.roles) ? s.roles[0]?.name : s.roles?.name;
        const matchesRole = ["super_admin", "admin", "manager"].includes(role);
        const matchesBranch = !branchId || !s.branch_id || s.branch_id === branchId;
        return matchesRole && matchesBranch;
      });

      for (const recipient of targetRecipients.slice(0, 5)) {
        await supabase.from("staff_notifications").insert({
          recipient_id: recipient.id,
          branch_id: branchId || null,
          title: `⚠️ Low Stock Alert: ${item.name}`,
          message: `Stock level dropped to ${newStock} ${item.unit} (threshold: ${threshold}). Please reorder back-bar supplies.`,
          type: "inventory_low_stock",
          link: "/admin/inventory",
          metadata: {
            item_id: item.id,
            item_name: item.name,
            current_stock: newStock,
            threshold,
          },
        });
      }
    } catch {
      // Non-blocking fallback
    }
  }
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
    // 1. Fetch appointment details including notes
    const { data: appointment, error: apptErr } = await supabase
      .from("appointments")
      .select("id, reference_number, treatment_id, branch_id, notes, treatments(id, name)")
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
    const defaultTreatmentName = treatment?.name || "Clinic Treatment";

    // 2. Fetch existing movements for this referenceNumber to prevent duplicate deductions per item
    const { data: existingMovements } = await supabase
      .from("inventory_movements")
      .select("id, item_id")
      .eq("reference_id", refNumber)
      .eq("movement_type", "stock_out");

    const alreadyDeductedItemIds = new Set((existingMovements || []).map((m) => m.item_id));

    // 3. Parse all cart items from appointment.notes (e.g. multi-treatment or add-on items like PENILE MEDICATION SET)
    let cartItems: Array<{ id: string; name: string; quantity: number }> = [];
    if (appointment.notes && appointment.notes.trim().startsWith("[")) {
      try {
        const firstLine = appointment.notes.trim().split("\n")[0];
        const parsed = JSON.parse(firstLine);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cartItems = parsed.map((p) => ({
            id: p.id,
            name: p.name || "",
            quantity: Math.max(1, Number(p.quantity) || 1),
          }));
        }
      } catch {
        // Fallback below
      }
    }

    // Fallback if notes did not contain JSON array
    if (cartItems.length === 0 && appointment.treatment_id) {
      cartItems = [
        {
          id: appointment.treatment_id,
          name: defaultTreatmentName,
          quantity: 1,
        },
      ];
    }

    const deductedItems: DeductedItemSummary[] = [];

    // Helper to perform deduction of a specific inventory item
    const performItemDeduction = async (
      item: { id: string; name: string; unit: string; current_stock: number; low_stock_threshold?: number },
      qtyToDeduct: number,
      reasonTitle: string
    ) => {
      if (alreadyDeductedItemIds.has(item.id)) {
        return; // Already deducted previously for this appointment
      }

      const prevStock = Number(item.current_stock) || 0;
      const newStock = Math.max(0, prevStock - qtyToDeduct);

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
            const branchNew = Math.max(0, branchPrev - qtyToDeduct);
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
          quantity: qtyToDeduct,
          unit: item.unit || "pcs",
          source_branch_id: appointment.branch_id || null,
          previous_quantity: prevStock,
          new_quantity: newStock,
          reason: `Treatment Completed: ${reasonTitle}`,
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
          change_amount: -qtyToDeduct,
          reason: `Treatment Completed: ${reasonTitle} (${refNumber})`,
          created_by: performedByUserId || null,
        });
      } catch {
        // Ignore fallback error
      }

      // Check low stock and alert
      await checkAndAlertLowStock(supabase, item, newStock, appointment.branch_id);

      alreadyDeductedItemIds.add(item.id);
      deductedItems.push({
        itemId: item.id,
        itemName: item.name,
        quantity: qtyToDeduct,
        unit: item.unit,
        previousStock: prevStock,
        newStock: newStock,
      });
    };

    // 4. Iterate each cart item and deduct its materials or direct inventory item
    for (const cartItem of cartItems) {
      // A. Check if cartItem has treatment_materials recipe
      const { data: materials } = await supabase
        .from("treatment_materials")
        .select("item_id, quantity_required, inventory_items(id, name, unit, current_stock, low_stock_threshold)")
        .eq("treatment_id", cartItem.id);

      if (materials && materials.length > 0) {
        for (const mat of materials) {
          const invItem = mat.inventory_items as unknown as {
            id: string;
            name: string;
            unit: string;
            current_stock: number;
            low_stock_threshold?: number;
          } | null;

          if (!invItem) continue;

          const qtyToDeduct = (Number(mat.quantity_required) || 1) * cartItem.quantity;
          await performItemDeduction(invItem, qtyToDeduct, cartItem.name || defaultTreatmentName);
        }
      } else {
        // B. If no treatment recipe, check if cartItem directly matches an inventory item (e.g. PENILE MEDICATION SET or retail item)
        let directItem: { id: string; name: string; unit: string; current_stock: number; low_stock_threshold?: number } | null = null;
        
        // Try match by id
        const { data: byId } = await supabase
          .from("inventory_items")
          .select("id, name, unit, current_stock, low_stock_threshold")
          .eq("id", cartItem.id)
          .maybeSingle();

        if (byId) {
          directItem = byId;
        } else if (cartItem.name) {
          // Try match by name
          const { data: byName } = await supabase
            .from("inventory_items")
            .select("id, name, unit, current_stock, low_stock_threshold")
            .ilike("name", cartItem.name.trim())
            .maybeSingle();
          if (byName) {
            directItem = byName;
          }
        }

        if (directItem) {
          await performItemDeduction(directItem, cartItem.quantity, cartItem.name);
        }
      }
    }

    return {
      success: true,
      message: `Successfully processed inventory deductions (${deductedItems.length} items updated) for #${refNumber}.`,
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
 * Automatically deducts back-bar consumables from inventory
 * when a package session is redeemed.
 */
export async function deductPackageSessionInventory(
  packageId: string,
  sessionNumber: number,
  performedByUserId?: string,
  branchId?: string,
  customNotes?: string
): Promise<DeductionResult> {
  const supabase = getAdminClient();

  try {
    // 1. First attempt to execute optimized atomic stored procedure
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc(
        "deduct_inventory_for_package_redemption",
        {
          p_package_id: packageId,
          p_session_number: sessionNumber,
          p_branch_id: branchId || null,
          p_user_id: performedByUserId || null,
        }
      );

      if (!rpcErr && rpcRes && typeof rpcRes === "object") {
        const typedRpc = rpcRes as {
          success: boolean;
          message?: string;
          count?: number;
          deductedItems?: DeductedItemSummary[];
          referenceNumber?: string;
          error?: string;
        };

        if (typedRpc.success) {
          return {
            success: true,
            message: typedRpc.message || `Deducted consumables for session ${sessionNumber}.`,
            count: typedRpc.count || 0,
            deductedItems: (typedRpc.deductedItems as DeductedItemSummary[]) || [],
            referenceNumber: typedRpc.referenceNumber || `PKG-${packageId.slice(0, 8)}-S${sessionNumber}`,
          };
        }
      }
    } catch {
      // Fall through to manual TypeScript deduction logic below
    }

    // 2. Fetch package info
    const { data: pkg, error: pkgErr } = await supabase
      .from("customer_packages")
      .select("id, package_name, treatment_id, branch_id")
      .eq("id", packageId)
      .single();

    if (pkgErr || !pkg) {
      return {
        success: false,
        error: "Package not found.",
        count: 0,
        deductedItems: [],
      };
    }

    const refNumber = `PKG-${packageId.slice(0, 8).toUpperCase()}-S${sessionNumber}`;
    const effectiveBranchId = branchId || pkg.branch_id || null;

    // 3. Prevent duplicate deduction for this session
    const { data: existingMovements } = await supabase
      .from("inventory_movements")
      .select("id")
      .eq("reference_id", refNumber)
      .eq("movement_type", "stock_out")
      .limit(1);

    if (existingMovements && existingMovements.length > 0) {
      return {
        success: true,
        message: `Inventory already deducted for ${refNumber}.`,
        count: 0,
        deductedItems: [],
        referenceNumber: refNumber,
      };
    }

    // 4. Resolve treatment ID
    let treatmentId = pkg.treatment_id;
    let treatmentName = pkg.package_name;

    if (!treatmentId) {
      const { data: matchedTreatments } = await supabase
        .from("treatments")
        .select("id, name");

      if (matchedTreatments && matchedTreatments.length > 0) {
        const found = matchedTreatments.find(
          (t) =>
            pkg.package_name.toLowerCase().includes(t.name.toLowerCase()) ||
            t.name.toLowerCase().includes(pkg.package_name.toLowerCase())
        );
        if (found) {
          treatmentId = found.id;
          treatmentName = found.name;
        }
      }
    }

    if (!treatmentId) {
      return {
        success: true,
        message: `No matching treatment recipe found for package "${pkg.package_name}".`,
        count: 0,
        deductedItems: [],
        referenceNumber: refNumber,
      };
    }

    // 5. Fetch recipe materials
    const { data: materials, error: matErr } = await supabase
      .from("treatment_materials")
      .select("item_id, quantity_required, inventory_items(id, name, unit, current_stock, low_stock_threshold)")
      .eq("treatment_id", treatmentId);

    if (matErr || !materials || materials.length === 0) {
      return {
        success: true,
        message: `No consumables mapped for ${treatmentName}.`,
        count: 0,
        deductedItems: [],
        referenceNumber: refNumber,
      };
    }

    const deductedItems: DeductedItemSummary[] = [];

    for (const mat of materials) {
      const item = mat.inventory_items as unknown as {
        id: string;
        name: string;
        unit: string;
        current_stock: number;
        low_stock_threshold?: number;
      } | null;

      if (!item) continue;

      const qtyRequired = Number(mat.quantity_required) || 1;
      const prevStock = Number(item.current_stock) || 0;
      const newStock = Math.max(0, prevStock - qtyRequired);

      // Update global stock
      await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      // Update branch stock
      if (effectiveBranchId) {
        try {
          const { data: bStock } = await supabase
            .from("inventory_stock_balances")
            .select("quantity")
            .eq("item_id", item.id)
            .eq("branch_id", effectiveBranchId)
            .maybeSingle();

          if (bStock) {
            const bPrev = Number(bStock.quantity) || 0;
            const bNew = Math.max(0, bPrev - qtyRequired);
            await supabase
              .from("inventory_stock_balances")
              .update({
                quantity: bNew,
                updated_at: new Date().toISOString(),
              })
              .eq("item_id", item.id)
              .eq("branch_id", effectiveBranchId);
          } else {
            await supabase
              .from("inventory_stock_balances")
              .upsert(
                {
                  item_id: item.id,
                  branch_id: effectiveBranchId,
                  quantity: newStock,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "item_id,branch_id" }
              );
          }
        } catch (bErr) {
          console.error("Failed to update branch balance during package redemption:", bErr);
        }
      }

      // Log movement in audit ledger
      const movRef = generateMovementRef("OUT");
      try {
        await supabase.from("inventory_movements").insert({
          reference_number: movRef,
          item_id: item.id,
          movement_type: "stock_out",
          quantity: qtyRequired,
          unit: item.unit || "pcs",
          source_branch_id: effectiveBranchId,
          previous_quantity: prevStock,
          new_quantity: newStock,
          reason: `Package Redemption: ${pkg.package_name} (Session ${sessionNumber})`,
          notes: customNotes || `Auto-deducted for package ${pkg.package_name} session ${sessionNumber}`,
          reference_id: refNumber,
          performed_by: performedByUserId || null,
        });
      } catch (movErr) {
        console.error("Failed to insert inventory movement for package:", movErr);
      }

      // Legacy fallback
      try {
        await supabase.from("inventory_logs").insert({
          item_id: item.id,
          change_amount: -qtyRequired,
          reason: `Package Session ${sessionNumber}: ${pkg.package_name} (${refNumber})`,
          created_by: performedByUserId || null,
        });
      } catch {
        // Ignore fallback error
      }

      // Check low stock and alert
      await checkAndAlertLowStock(supabase, item, newStock, effectiveBranchId);

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
      message: `Auto-deducted ${deductedItems.length} consumables for ${pkg.package_name} (Session ${sessionNumber}).`,
      count: deductedItems.length,
      deductedItems,
      referenceNumber: refNumber,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error during package inventory deduction";
    console.error("deductPackageSessionInventory error:", err);
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
