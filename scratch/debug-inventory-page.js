import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase env vars!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  console.log("1. Testing branches fetch...");
  const { data: branches, error: bErr } = await supabase
    .from("branches")
    .select("id, name, address, phone")
    .order("name", { ascending: true });
  if (bErr) console.error("Branches error:", bErr);
  else console.log("Branches count:", branches?.length);

  console.log("2. Testing items fetch...");
  const { data: items, error: iErr } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name", { ascending: true });
  if (iErr) console.error("Items error:", iErr);
  else console.log("Items count:", items?.length);

  console.log("3. Testing inventory_categories fetch...");
  const { data: cats, error: cErr } = await supabase
    .from("inventory_categories")
    .select("*")
    .order("name", { ascending: true });
  if (cErr) console.error("Categories error:", cErr.message);
  else console.log("Categories count:", cats?.length);

  console.log("4. Testing inventory_suppliers fetch...");
  const { data: supps, error: sErr } = await supabase
    .from("inventory_suppliers")
    .select("*")
    .order("name", { ascending: true });
  if (sErr) console.error("Suppliers error:", sErr.message);
  else console.log("Suppliers count:", supps?.length);

  console.log("5. Testing inventory_movements fetch...");
  const { data: movs, error: mErr } = await supabase
    .from("inventory_movements")
    .select("*, inventory_items(name, sku)")
    .order("created_at", { ascending: false })
    .limit(10);
  if (mErr) console.error("Movements error:", mErr.message);
  else console.log("Movements count:", movs?.length);

  console.log("6. Testing inventory_transfers fetch...");
  const { data: trfs, error: tErr } = await supabase
    .from("inventory_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (tErr) console.error("Transfers error:", tErr.message);
  else console.log("Transfers count:", trfs?.length);

  console.log("7. Testing inventory_purchase_orders fetch...");
  const { data: pos, error: pErr } = await supabase
    .from("inventory_purchase_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (pErr) console.error("POs error:", pErr.message);
  else console.log("POs count:", pos?.length);
}

testFetch().catch(console.error);
