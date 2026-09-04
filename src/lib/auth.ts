import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type StaffSession = {
  id: string;
  fullName: string;
  role: "admin" | "receptionist" | "nurse" | "doctor";
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
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff || !staff.is_active) redirect("/admin/login");

  return { id: staff.id, fullName: staff.full_name, role: staff.role };
}
