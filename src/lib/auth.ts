import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type StaffSession = {
  id: string;
  fullName: string;
  role: string;
  branchId?: string | null;
  email?: string | null;
};

export async function requireStaff(): Promise<StaffSession> {
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) {
    redirect("/admin/setup-required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, is_active, branch_id, roles(name)")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff || !staff.is_active) redirect("/admin/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rolesObj = staff.roles as any;
  const roleName = Array.isArray(rolesObj) ? rolesObj[0]?.name : rolesObj?.name;

  return { 
    id: staff.id, 
    fullName: staff.full_name, 
    role: roleName || "staff",
    branchId: staff.branch_id || null,
    email: user.email || null,
  };
}
