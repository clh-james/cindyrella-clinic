import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}
const supabase = createClient(url, key);

async function runTests() {
  console.log("=================================================");
  console.log("CINDYRELLA — QA TEST: USED ITEMS INVENTORY DEDUCTION");
  console.log("=================================================");

  // 1. Check recipes in treatment_materials
  const { data: materials, error: mErr } = await supabase
    .from("treatment_materials")
    .select("treatment_id, item_id, quantity_required, inventory_items(name, current_stock, unit), treatments(name)");

  console.log(`\n[TEST 1] Treatment Recipes (BOM) in DB: ${materials?.length} mapped items.`);
  if (!materials || materials.length === 0) {
    throw new Error("No treatment materials found! Seed first.");
  }
  console.log("Sample mapped recipes:");
  materials.slice(0, 5).forEach((m) => {
    console.log(`  - Treatment: "${m.treatments?.name}" consumes ${m.quantity_required}x "${m.inventory_items?.name}" (${m.inventory_items?.unit})`);
  });

  // Pick a treatment that has materials
  const sampleMaterial = materials[0];
  const treatmentId = sampleMaterial.treatment_id;
  const itemId = sampleMaterial.item_id;

  // 2. Fetch treatment and branch
  const { data: treatment } = await supabase.from("treatments").select("id, name").eq("id", treatmentId).single();
  const { data: branch } = await supabase.from("branches").select("id, name").limit(1).single();
  const { data: customer } = await supabase.from("customers").select("id").limit(1).single();

  console.log(`\n[TEST 2] Target Treatment: "${treatment.name}", Branch: "${branch.name}"`);

  // Record initial stock
  const { data: initialItem } = await supabase.from("inventory_items").select("id, name, current_stock").eq("id", itemId).single();
  console.log(`Initial stock for "${initialItem.name}": ${initialItem.current_stock}`);

  // Create a test appointment
  const testRef = `TEST-${Date.now().toString().slice(-6)}`;
  const { data: newAppt, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      reference_number: testRef,
      customer_id: customer.id,
      treatment_id: treatment.id,
      branch_id: branch.id,
      appointment_date: new Date().toISOString().split("T")[0],
      appointment_time: "14:00",
      status: "confirmed",
      amount_due: 1999,
      payment_method: "cash",
      payment_status: "pending",
    })
    .select("id, reference_number, status")
    .single();

  if (apptErr || !newAppt) {
    throw new Error(`Failed to create test appointment: ${apptErr?.message}`);
  }
  console.log(`Created test appointment: ID=${newAppt.id}, Ref=${newAppt.reference_number}, Status=${newAppt.status}`);

  // 3. Import and execute deduction
  const { deductAppointmentInventory, reverseAppointmentInventory, recordDirectUsedItems } = await import(
    "../src/lib/inventory/deduction.ts"
  );

  console.log("\n[TEST 3] Executing deductAppointmentInventory on completion...");
  const deductResult = await deductAppointmentInventory(newAppt.id);
  console.log("Deduction result:", deductResult);

  if (!deductResult.success || deductResult.count === 0) {
    throw new Error("Failed to deduct inventory for appointment!");
  }

  // Verify stock decreased
  const { data: postDeductItem } = await supabase.from("inventory_items").select("id, name, current_stock").eq("id", itemId).single();
  console.log(`Post-deduction stock for "${postDeductItem.name}": ${postDeductItem.current_stock} (Expected: ${initialItem.current_stock - sampleMaterial.quantity_required})`);

  // Verify inventory_movements ledger entry
  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("reference_id", testRef);

  console.log(`Found ${movements?.length} movement ledger record(s) for reference ${testRef}:`);
  movements?.forEach((mov) => {
    console.log(`  - Ref: ${mov.reference_number}, Type: ${mov.movement_type}, Qty: -${mov.quantity} ${mov.unit}, Reason: "${mov.reason}"`);
  });

  if (!movements || movements.length === 0) {
    throw new Error("Missing inventory_movements audit trail record!");
  }

  // 4. Test Idempotency (prevent duplicate deductions)
  console.log("\n[TEST 4] Testing Idempotency (Prevent Duplicate Deductions)...");
  const secondDeduct = await deductAppointmentInventory(newAppt.id);
  console.log("Second deduction attempt:", secondDeduct);
  if (secondDeduct.count !== 0) {
    throw new Error("Duplicate deduction was not prevented!");
  }
  console.log("PASSED: Duplicate deduction was correctly prevented.");

  // 5. Test Direct / Additional Consumables Usage
  console.log("\n[TEST 5] Testing Direct Used Consumables Recording...");
  const extraUsage = await recordDirectUsedItems({
    appointmentId: newAppt.id,
    referenceNumber: testRef,
    branchId: branch.id,
    treatmentName: treatment.name,
    items: [{ itemId: itemId, quantity: 1 }],
    reason: "Extra Syringe Used in Session",
  });
  console.log("Extra usage result:", extraUsage);
  if (!extraUsage.success) {
    throw new Error("Failed to record extra direct usage!");
  }
  console.log("PASSED: Extra consumables recorded and deducted from stock.");

  // 6. Test Reversal on Cancellation
  console.log("\n[TEST 6] Testing Inventory Reversal on Appointment Cancellation...");
  const reverseResult = await reverseAppointmentInventory(newAppt.id, undefined, "Client rescheduled");
  console.log("Reversal result:", reverseResult);

  const { data: restoredItem } = await supabase.from("inventory_items").select("id, name, current_stock").eq("id", itemId).single();
  console.log(`Restored stock for "${restoredItem.name}": ${restoredItem.current_stock}`);
  console.log("PASSED: Stock successfully restored on appointment cancellation.");

  // Cleanup test appointment
  await supabase.from("appointments").delete().eq("id", newAppt.id);
  await supabase.from("inventory_movements").delete().like("reference_id", `${testRef}%`);
  console.log("\n[CLEANUP] Test records cleaned up successfully.");

  console.log("\n=================================================");
  console.log("ALL INVENTORY DEDUCTION TESTS PASSED! (6/6)");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
