import { createClient } from "@/lib/supabase/server";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { CalendarDays, PhilippinePeso, TrendingUp, Users } from "lucide-react";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminOverview() {
  const supabase = await createClient();
  const today = isoDate(new Date());
  const monthStart = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [appointmentsRes, posSalesRes, upcoming, treatmentCounts] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, amount_due, status, appointment_date, customer_id")
      .gte("appointment_date", monthStart),
    supabase
      .from("pos_sales")
      .select("id, total_amount, created_at, status")
      .gte("created_at", `${monthStart}T00:00:00.000Z`),
    supabase
      .from("appointments")
      .select("id, reference_number, appointment_date, appointment_time, status, treatments(name), branches(name), customers(first_name, last_name)")
      .gte("appointment_date", today)
      .order("appointment_date", { ascending: true })
      .limit(6),
    supabase
      .from("appointments")
      .select("treatment_id, treatments(name)")
      .gte("appointment_date", monthStart),
  ]);

  const monthApptsList = appointmentsRes.data ?? [];
  const monthSalesList = posSalesRes.data ?? [];

  const todayApptsList = monthApptsList.filter(a => a.appointment_date === today);
  
  // Format dates for pos_sales to YYYY-MM-DD in local time
  const formatSaleDate = (isoString: string) => {
    const d = new Date(isoString);
    // Adjust for UTC offset if needed, but simple slice might work if it's stored in UTC and we want to align,
    // let's just use the robust Date approach for local YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const monthSalesFormatted = monthSalesList.map(s => ({
    ...s,
    sale_date: formatSaleDate(s.created_at)
  }));
  const todaySalesList = monthSalesFormatted.filter(s => s.sale_date === today);

  const calculateRevenue = (appts: typeof monthApptsList, sales: typeof monthSalesFormatted) => {
    const apptsRev = appts
      .filter((a) => a.status !== "cancelled" && a.status !== "voided")
      .reduce((sum, a) => sum + a.amount_due, 0);
    const salesRev = sales
      .filter((s) => s.status !== "voided")
      .reduce((sum, s) => sum + s.total_amount, 0);
    return apptsRev + salesRev;
  };

  const todayRevenue = calculateRevenue(todayApptsList, todaySalesList);
  const monthRevenue = calculateRevenue(monthApptsList, monthSalesFormatted);

  const newClientIds = new Set(monthApptsList.map((a) => a.customer_id).filter(Boolean));

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { iso: isoDate(d), label: d.toLocaleDateString("en-US", { weekday: "short" }) };
  });

  const revenueByDay = last7.map(({ iso, label }) => {
    const dayAppts = monthApptsList.filter((a) => a.appointment_date === iso);
    const daySales = monthSalesFormatted.filter((s) => s.sale_date === iso);
    return {
      day: label,
      revenue: calculateRevenue(dayAppts, daySales),
    };
  });

  const popularity = new Map<string, number>();
  (treatmentCounts.data ?? []).forEach((row) => {
    const t = row.treatments as unknown as { name: string } | null;
    if (!t) return;
    popularity.set(t.name, (popularity.get(t.name) ?? 0) + 1);
  });
  const mostPopular = [...popularity.entries()].sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: "Today's bookings", value: String(todayApptsList.length), icon: CalendarDays },
    { label: "Today's revenue", value: peso(todayRevenue), icon: PhilippinePeso },
    { label: "Monthly revenue", value: peso(monthRevenue), icon: TrendingUp },
    { label: "New clients (month)", value: String(newClientIds.size), icon: Users },
  ];

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink">Overview</h1>
      <p className="mt-1 text-xs sm:text-sm text-ink-soft">
        {mostPopular ? `${mostPopular[0]} is this month's most-booked drip.` : "No bookings yet this month."}
      </p>

      <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl sm:rounded-2xl border border-line p-4 sm:p-5 bg-white shadow-sm">
            <Icon size={18} className="text-royal" />
            <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs text-ink-soft">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 sm:mt-8 grid gap-4 sm:gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl sm:rounded-2xl border border-line p-4 sm:p-6 bg-white shadow-sm overflow-hidden">
          <h2 className="text-sm font-semibold text-ink">Revenue, last 7 days</h2>
          <div className="mt-4 -ml-2 sm:ml-0 overflow-x-auto">
            <div className="min-w-[400px]">
              <RevenueChart data={revenueByDay} />
            </div>
          </div>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-line p-4 sm:p-6 bg-white shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Upcoming appointments</h2>
          <ul className="mt-4 space-y-3 sm:space-y-4">
            {(upcoming.data ?? []).length === 0 && (
              <li className="text-sm text-ink-soft">Nothing scheduled yet.</li>
            )}
            {(upcoming.data ?? []).map((a) => {
              const treatment = a.treatments as unknown as { name: string } | null;
              const branch = a.branches as unknown as { name: string } | null;
              const customer = a.customers as unknown as { first_name: string; last_name: string } | null;
              return (
                <li key={a.id} className="border-b border-line border-dashed pb-3 last:border-0 last:pb-0 flex flex-col gap-1">
                  <p className="text-sm font-medium text-ink">
                    {customer?.first_name} {customer?.last_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                    <span className="font-medium text-royal">{treatment?.name}</span>
                    <span className="hidden sm:inline">·</span>
                    <span>{branch?.name}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="font-mono bg-pale px-1.5 py-0.5 rounded text-ink">{a.appointment_date} {a.appointment_time}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
