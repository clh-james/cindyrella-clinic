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

  const [todayAppts, monthAppts, upcoming, treatmentCounts] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, amount_due, status")
      .eq("appointment_date", today),
    supabase
      .from("appointments")
      .select("id, amount_due, status, appointment_date, created_at, customer_id")
      .gte("appointment_date", monthStart),
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

  const todayList = todayAppts.data ?? [];
  const monthList = monthAppts.data ?? [];

  const todayRevenue = todayList
    .filter((a) => a.status !== "cancelled")
    .reduce((sum, a) => sum + a.amount_due, 0);

  const monthRevenue = monthList
    .filter((a) => a.status !== "cancelled")
    .reduce((sum, a) => sum + a.amount_due, 0);

  const newClientIds = new Set(monthList.map((a) => a.customer_id));

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { iso: isoDate(d), label: d.toLocaleDateString("en-US", { weekday: "short" }) };
  });

  const revenueByDay = last7.map(({ iso, label }) => ({
    day: label,
    revenue: monthList
      .filter((a) => a.appointment_date === iso && a.status !== "cancelled")
      .reduce((sum, a) => sum + a.amount_due, 0),
  }));

  const popularity = new Map<string, number>();
  (treatmentCounts.data ?? []).forEach((row) => {
    const t = row.treatments as unknown as { name: string } | null;
    if (!t) return;
    popularity.set(t.name, (popularity.get(t.name) ?? 0) + 1);
  });
  const mostPopular = [...popularity.entries()].sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: "Today's bookings", value: String(todayList.length), icon: CalendarDays },
    { label: "Today's revenue", value: peso(todayRevenue), icon: PhilippinePeso },
    { label: "Monthly revenue", value: peso(monthRevenue), icon: TrendingUp },
    { label: "New clients (month)", value: String(newClientIds.size), icon: Users },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Overview</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {mostPopular ? `${mostPopular[0]} is this month's most-booked drip.` : "No bookings yet this month."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-line p-5">
            <Icon size={18} className="text-royal" />
            <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs text-ink-soft">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-line p-6">
          <h2 className="text-sm font-semibold text-ink">Revenue, last 7 days</h2>
          <div className="mt-4">
            <RevenueChart data={revenueByDay} />
          </div>
        </div>

        <div className="rounded-2xl border border-line p-6">
          <h2 className="text-sm font-semibold text-ink">Upcoming appointments</h2>
          <ul className="mt-4 space-y-4">
            {(upcoming.data ?? []).length === 0 && (
              <li className="text-sm text-ink-soft">Nothing scheduled yet.</li>
            )}
            {(upcoming.data ?? []).map((a) => {
              const treatment = a.treatments as unknown as { name: string } | null;
              const branch = a.branches as unknown as { name: string } | null;
              const customer = a.customers as unknown as { first_name: string; last_name: string } | null;
              return (
                <li key={a.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-ink">
                    {customer?.first_name} {customer?.last_name}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {treatment?.name} · {branch?.name} · {a.appointment_date} {a.appointment_time}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
