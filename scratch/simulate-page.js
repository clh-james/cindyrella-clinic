import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simulateInventoryPage() {
  console.log("Simulating InventoryPage...");

  const userId = "9197d369-18d1-4f24-9f07-d2c1fe84154f";

  // 1. Staff check
  const { data: staff, error: sErr } = await supabase
    .from("staff")
    .select("id, full_name, is_active, branch_id, roles(name)")
    .eq("id", userId)
    .maybeSingle();

  if (sErr) throw sErr;
  console.log("Staff resolved:", staff.full_name, staff.roles);

  // 2. Branches
  const { data: branchesData, error: bErr } = await supabase
    .from("branches")
    .select("id, name, address, phone")
    .order("name", { ascending: true });
  if (bErr) throw bErr;
  console.log("Branches loaded:", branchesData.length);

  // 3. Items
  const { data: itemsData, error: iErr } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name", { ascending: true });
  if (iErr) throw iErr;
  console.log("Items loaded:", itemsData.length);

  // 4. Categories & Suppliers
  const { data: categories, error: cErr } = await supabase
    .from("inventory_categories")
    .select("*")
    .order("name", { ascending: true });
  if (cErr) throw cErr;
  console.log("Categories loaded:", categories.length);

  const { data: suppliers, error: supErr } = await supabase
    .from("inventory_suppliers")
    .select("*")
    .order("name", { ascending: true });
  if (supErr) throw supErr;
  console.log("Suppliers loaded:", suppliers.length);

  // 5. Movements
  const { data: movementsData, error: movErr } = await supabase
    .from("inventory_movements")
    .select("*, inventory_items(name, sku)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (movErr) console.error("Movements query error:", movErr);
  else console.log("Movements loaded:", movementsData.length);

  // 6. Transfers
  const { data: transfersData, error: trfErr } = await supabase
    .from("inventory_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (trfErr) console.error("Transfers query error:", trfErr);
  else console.log("Transfers loaded:", transfersData.length);

  // 7. POs
  const { data: poData, error: poErr } = await supabase
    .from("inventory_purchase_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (poErr) console.error("POs query error:", poErr);
  else console.log("POs loaded:", poData.length);

  // 8. has_permission RPC test
  try {
    const { data: perm, error: pErr } = await supabase.rpc('has_permission', {
      p_user_id: userId,
      p_permission_key: 'inventory.create'
    });
    console.log("RPC has_permission result:", perm, "Error:", pErr);
  } catch (err) {
    console.error("RPC call failed:", err);
  }

  console.log("ALL DATA QUERIES PASSED SUCCESSFUL!");
}

simulateInventoryPage().catch(console.error);
