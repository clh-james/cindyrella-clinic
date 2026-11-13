import { requireStaff } from "@/lib/auth";
import { ReportsClient } from "./ReportsClient";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  searchParams?: Promise<{
    month?: string;
    year?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireStaff();
  
  const supabase = await createClient();
  const resolvedParams = searchParams ? await searchParams : {};
  
  const now = new Date();
  const year = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();
  const month = resolvedParams.month ? parseInt(resolvedParams.month, 10) : (now.getMonth() + 1);

  const mPadded = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${mPadded}-01`;
  const endDate = `${year}-${mPadded}-${String(lastDay).padStart(2, "0")}`;
  const startIso = `${startDate}T00:00:00.000Z`;
  const endIso = `${endDate}T23:59:59.999Z`;
  
  const [appointmentsRes, salesRes, staffRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, amount_due, status, payment_status, appointment_date, created_at, treatment_id, treatments(name), payment_method, handled_by, commission_amount")
      .gte("appointment_date", startDate)
      .lte("appointment_date", endDate),
    supabase
      .from("pos_sales")
      .select("id, total_amount, payment_method, created_at, created_by")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("staff")
      .select("id, full_name, is_active, roles(name)")
  ]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <ReportsClient 
      appointments={appointmentsRes.data || []} 
      sales={salesRes.data || []} 
      staff={staffRes.data || []}
      selectedMonth={month}
      selectedYear={year}
      monthName={monthNames[month - 1] || "Current Month"}
    />
  );
}
