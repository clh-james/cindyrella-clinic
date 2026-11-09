import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xccqulxjgdrikmgvbmth.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjY3F1bHhqZ2RyaWttZ3ZibXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ5Nzk2NSwiZXhwIjoyMTA0MDczOTY1fQ.djm_M-cxKXpfsyLmmOgDNIBKtDw3ILlzTWeATbCeWRk";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const targetKeys = [
  "announcements.create",
  "announcements.view",
  "appointments.view",
  "attendance.view",
  "branches.view",
  "cashier.view",
  "customers.view",
  "dashboard.view",
  "expenses.export",
  "expenses.reimburse",
  "expenses.view",
  "gallery.view",
  "installments.view",
  "memberships.view",
  "bills.approve",
  "approvals.view",
  "packages.view",
  "payments.view",
  "pos.custom_discount",
  "pos.view",
  "promos.view",
  "reports.financial",
  "reports.sales",
  "reports.staff",
  "reports.view",
  "services.view",
  "transactions.view"
];

async function seedAestheticianRole() {
  console.log("1. Fetching all permissions...");
  const { data: permissions, error: pErr } = await supabase
    .from("permissions")
    .select("id, key, name");

  if (pErr) throw pErr;

  const permMap = new Map();
  permissions.forEach((p) => permMap.set(p.key, p.id));

  const matched = [];
  for (const k of targetKeys) {
    if (permMap.has(k)) {
      matched.push({ key: k, id: permMap.get(k) });
    } else {
      console.warn("⚠️ Permission key not found:", k);
    }
  }

  console.log(`Matched ${matched.length} of ${targetKeys.length} permissions.`);

  console.log("2. Checking / creating role 'aesthetician'...");
  let roleId;
  const { data: existingRoles, error: rErr } = await supabase
    .from("roles")
    .select("id, name")
    .ilike("name", "aesthetician");

  if (rErr) throw rErr;

  if (existingRoles && existingRoles.length > 0) {
    roleId = existingRoles[0].id;
    console.log(`Role 'aesthetician' already exists (ID: ${roleId}). Updating permissions...`);
  } else {
    const { data: newRole, error: insertRoleErr } = await supabase
      .from("roles")
      .insert({
        name: "aesthetician",
        description: "Aesthetician - Clinical treatment, services, and operational access",
      })
      .select("id")
      .single();

    if (insertRoleErr) throw insertRoleErr;
    roleId = newRole.id;
    console.log(`Role 'aesthetician' created successfully with ID: ${roleId}`);
  }

  console.log("3. Clearing existing permissions for this role...");
  await supabase.from("role_permissions").delete().eq("role_id", roleId);

  console.log("4. Assigning all 27 permissions...");
  const records = matched.map((m) => ({
    role_id: roleId,
    permission_id: m.id,
  }));

  const { error: assignErr } = await supabase
    .from("role_permissions")
    .insert(records);

  if (assignErr) throw assignErr;

  console.log(`✅ Success! Role 'aesthetician' is now configured with ${records.length} permissions.`);
}

seedAestheticianRole()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error seeding aesthetician role:", err);
    process.exit(1);
  });

