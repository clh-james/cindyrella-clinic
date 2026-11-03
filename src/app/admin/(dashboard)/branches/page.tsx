import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import BranchesClient from "./BranchesClient";
import { Branch } from "./types";

export const metadata = {
  title: "Branches Management — Admin",
  description: "Manage clinic branches, locations, contact info, and team rosters.",
};

export default async function BranchesPage() {
  await requireStaff();
  const supabase = createAdminClient();

  // 1. Fetch all branches
  const { data: rawBranches, error: branchErr } = await supabase
    .from("branches")
    .select("*")
    .order("name", { ascending: true });

  if (branchErr) {
    console.error("Failed to load branches:", branchErr);
  }

  // 2. Fetch staff to compute per-branch team members
  const { data: rawStaff } = await supabase
    .from("staff")
    .select("id, full_name, is_active, branch_id, roles(name)")
    .order("full_name");

  // 3. Fetch appointments count per branch
  const { data: rawAppointments } = await supabase
    .from("appointments")
    .select("id, branch_id");

  // Assemble enriched branch list
  const branches: Branch[] = (rawBranches || []).map((b) => {
    const assignedStaff = (rawStaff || [])
      .filter((s) => s.branch_id === b.id)
      .map((s) => {
        const roleData = s.roles as unknown as { name?: string } | { name?: string }[] | null;
        const roleName = Array.isArray(roleData)
          ? roleData[0]?.name
          : roleData?.name;

        return {
          id: s.id,
          full_name: s.full_name,
          role_name: roleName || "Staff",
          is_active: s.is_active,
        };
      });

    const appointmentsCount = (rawAppointments || []).filter(
      (a) => a.branch_id === b.id
    ).length;

    return {
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      is_active: b.is_active,
      created_at: b.created_at,
      staff_count: assignedStaff.length,
      appointments_count: appointmentsCount,
      staff_members: assignedStaff,
    };
  });

  return <BranchesClient initialBranches={branches} />;
}

