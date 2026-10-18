// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Customers Management & Client File Extraction Server Page
// ==============================================================================

import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { CustomersClient } from "./CustomersClient";

export const metadata = {
  title: "Customers & Client Files — Cindyrella Admin",
  description: "Comprehensive customer accounts, installment agreements, treatment history, and file exports.",
};

export default async function CustomersPage() {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const isSuperAdmin = staff.role === "super_admin" || staff.role === "owner";

  // Permissions Check
  const canExport =
    isSuperAdmin ||
    (await hasServerPermission("customers.export_file")) ||
    (await hasServerPermission("reports.financial"));

  const canViewHistory =
    isSuperAdmin ||
    (await hasServerPermission("customers.view_history")) ||
    (await hasServerPermission("customers.view"));

  const canPay =
    isSuperAdmin ||
    (await hasServerPermission("installments.pay")) ||
    (await hasServerPermission("pos.process_payment"));

  // Fetch branches
  const { data: rawBranches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const branches = rawBranches || [];

  // Fetch Customers with appointments count and branch
  let custQuery = supabase
    .from("customers")
    .select("*, branches(name), appointments(count)")
    .order("created_at", { ascending: false });

  // Branch isolation for non-super admins
  if (!isSuperAdmin && staff.branchId) {
    custQuery = custQuery.or(`branch_id.eq.${staff.branchId},branch_id.is.null`);
  }

  const { data: rawCustomers } = await custQuery;

  const customers = (rawCustomers || []).map((c: any) => {
    const apptCount = Array.isArray(c.appointments) ? c.appointments[0]?.count : 0;
    return {
      id: c.id,
      customer_code: c.customer_code || `CUST-${c.id.slice(0, 6).toUpperCase()}`,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      medical_conditions: c.medical_conditions,
      allergies: c.allergies,
      branch_id: c.branch_id,
      branch_name: c.branches?.name || null,
      account_status: c.account_status || "active",
      loyalty_points: c.loyalty_points || 0,
      created_at: c.created_at,
      appointments_count: apptCount || 0,
    };
  });

  return (
    <CustomersClient
      initialCustomers={customers}
      branches={branches}
      canExport={canExport}
      canViewHistory={canViewHistory}
      canPay={canPay}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
