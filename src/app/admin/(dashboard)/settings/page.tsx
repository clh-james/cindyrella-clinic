import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { SettingsClient } from "./SettingsClient";

export const metadata = { title: "Account & Clinic Settings — Admin" };

export default async function SettingsPage() {
  const user = await requireStaff();
  const supabase = await createClient();

  const [
    { data: currentStaff },
    { data: branches },
    { data: blockedDates },
    { data: branchSettings }
  ] = await Promise.all([
    supabase
      .from("staff")
      .select("*, roles(name), branches(name)")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("branches").select("*").order("name"),
    supabase
      .from("blocked_dates")
      .select("id, blocked_date, reason, branch_id, branches(name)")
      .order("blocked_date"),
    supabase
      .from("branch_settings")
      .select("branch_id, max_bookings_per_slot, branches(name)"),
  ]);

  return (
    <SettingsClient
      currentStaff={currentStaff}
      userEmail={user.email || ""}
      branches={branches ?? []}
      blockedDates={blockedDates ?? []}
      branchSettings={branchSettings ?? []}
    />
  );
}

