// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Aesthetician Personal Daily Commission & Session Performance Page
// ==============================================================================

import { requireStaff } from "@/lib/auth";
import { getMyDailyCommissions } from "@/app/admin/(dashboard)/payroll/actions";
import { MyCommissionsClient } from "./MyCommissionsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "My Daily Earnings & Commissions — Cindyrella Clinic",
  description: "Personal daily treatment commissions, serviced clients, and shift summary.",
};

export default async function MyCommissionsPage() {
  await requireStaff();
  const res = await getMyDailyCommissions();

  if (!res.success || !res.data) {
    redirect("/admin");
  }

  return <MyCommissionsClient initialData={res.data} />;
}
