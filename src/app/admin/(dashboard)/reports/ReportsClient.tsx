/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { 
  BarChart3, TrendingUp, CalendarDays, WalletCards, BriefcaseMedical, UserRoundCog,
  CreditCard, Banknote, Smartphone, Scale, ArrowRight, FileSpreadsheet, Calendar
} from "lucide-react";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

interface ReportsClientProps {
  appointments: any[];
  sales: any[];
  staff: any[];
  selectedMonth?: number;
  selectedYear?: number;
  monthName?: string;
}

export function ReportsClient({ 
  appointments, 
  sales, 
  staff,
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear(),
  monthName = "Current Month",
}: ReportsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const stats = useMemo(() => {
    // 1. Revenue
    const apptRevenue = appointments
      .filter(a => a.payment_status === "paid" && a.status !== "cancelled")
      .reduce((sum, a) => sum + (a.amount_due || 0), 0);
      
    const retailRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalRevenue = apptRevenue + retailRevenue;

    // 2. Appointments Breakdown
    const totalAppts = appointments.length;
    const completedAppts = appointments.filter(a => a.status === "completed").length;
    const pendingAppts = appointments.filter(a => a.status === "pending" || a.status === "confirmed").length;
    const cancelledAppts = appointments.filter(a => a.status === "cancelled").length;

    // 3. Payment Methods
    const paymentMethods = {
      cash: 0,
      gcash: 0,
      card: 0,
    };
    
    [...appointments.filter(a => a.payment_status === "paid"), ...sales].forEach(item => {
      const method = (item.payment_method || "").toLowerCase();
      const amount = item.amount_due || item.total_amount || 0;
      if (method.includes("cash")) paymentMethods.cash += amount;
      else if (method.includes("gcash") || method.includes("maya")) paymentMethods.gcash += amount;
      else paymentMethods.card += amount;
    });

    // 4. Top Treatments
    const treatments = new Map<string, number>();
    appointments.forEach(a => {
      const name = a.treatments?.name;
      if (name) {
        treatments.set(name, (treatments.get(name) || 0) + 1);
      }
    });
    const topTreatments = [...treatments.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    // 5. Staff Performance (Services & Treatments handled + Retail Sales)
    const staffSales = new Map<string, { total: number, count: number, servicesTotal: number, retailTotal: number }>();
    
    // Add appointments handled by staff
    appointments
      .filter(a => a.payment_status === "paid" && a.status !== "cancelled" && a.handled_by)
      .forEach(a => {
        const staffId = a.handled_by;
        const current = staffSales.get(staffId) || { total: 0, count: 0, servicesTotal: 0, retailTotal: 0 };
        staffSales.set(staffId, {
          total: current.total + (a.amount_due || 0),
          count: current.count + 1,
          servicesTotal: current.servicesTotal + (a.amount_due || 0),
          retailTotal: current.retailTotal,
        });
      });

    // Add retail sales
    sales.forEach(s => {
      const staffId = s.created_by;
      if (staffId) {
        const current = staffSales.get(staffId) || { total: 0, count: 0, servicesTotal: 0, retailTotal: 0 };
        staffSales.set(staffId, {
          total: current.total + (s.total_amount || 0),
          count: current.count + 1,
          servicesTotal: current.servicesTotal,
          retailTotal: current.retailTotal + (s.total_amount || 0),
        });
      }
    });
    
    const staffPerformance = [...staffSales.entries()].map(([id, data]) => {
      const staffMember = staff.find(st => st.id === id);
      return {
        name: staffMember?.full_name || "Unknown Staff",
        role: staffMember?.roles?.name || "Aesthetician",
        total: data.total,
        count: data.count,
        servicesTotal: data.servicesTotal,
        retailTotal: data.retailTotal,
      };
    }).sort((a, b) => b.total - a.total);

    return {
      apptRevenue,
      retailRevenue,
      totalRevenue,
      totalAppts,
      completedAppts,
      pendingAppts,
      cancelledAppts,
      paymentMethods,
      topTreatments,
      staffPerformance
    };
  }, [appointments, sales, staff]);

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleMonthChange = (newMonth: number) => {
    startTransition(() => {
      router.push(`/admin/reports?month=${newMonth}&year=${selectedYear}`);
    });
  };

  const handleYearChange = (newYear: number) => {
    startTransition(() => {
      router.push(`/admin/reports?month=${selectedMonth}&year=${newYear}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Reports Dashboard</h1>
          <p className="text-sm text-ink-soft mt-1">
            Financial & operational performance summary for <strong className="text-ink">{monthName} {selectedYear}</strong>.
          </p>
        </div>

        {/* Date Filters & Quick Links */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-line rounded-xl p-1 shadow-2xs">
            <Calendar size={14} className="text-ink-soft ml-2 mr-1" />
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              disabled={isPending}
              className="text-xs font-semibold text-ink bg-transparent py-1.5 px-2 focus:outline-none cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              disabled={isPending}
              className="text-xs font-semibold text-ink bg-transparent py-1.5 px-2 border-l border-line focus:outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <Link
            href={`/admin/reports/sales?month=${selectedMonth}&year=${selectedYear}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <FileSpreadsheet size={15} /> Detailed Sales
            <ArrowRight size={13} />
          </Link>
          <Link
            href="/admin/reports/financials"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-royal to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <Scale size={15} /> P&L & Balance Sheet
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-2xl font-bold text-ink mt-2">{peso(stats.totalRevenue)}</h3>
            </div>
            <div className="p-2 bg-royal/10 text-royal rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Services Rev.</p>
              <h3 className="text-2xl font-bold text-ink mt-2">{peso(stats.apptRevenue)}</h3>
            </div>
            <div className="p-2 bg-royal/10 text-royal rounded-xl">
              <BriefcaseMedical size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Retail Sales</p>
              <h3 className="text-2xl font-bold text-ink mt-2">{peso(stats.retailRevenue)}</h3>
            </div>
            <div className="p-2 bg-royal/10 text-royal rounded-xl">
              <WalletCards size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Total Appts.</p>
              <h3 className="text-2xl font-bold text-ink mt-2">{stats.totalAppts}</h3>
            </div>
            <div className="p-2 bg-royal/10 text-royal rounded-xl">
              <CalendarDays size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Appointments Summary */}
        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-royal" /> Appointments Summary
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Completed</span>
              <span className="font-semibold text-green-600">{stats.completedAppts}</span>
            </div>
            <div className="w-full bg-line/30 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.totalAppts ? (stats.completedAppts/stats.totalAppts)*100 : 0}%` }}></div>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Pending / Upcoming</span>
              <span className="font-semibold text-amber-500">{stats.pendingAppts}</span>
            </div>
            <div className="w-full bg-line/30 rounded-full h-2">
              <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${stats.totalAppts ? (stats.pendingAppts/stats.totalAppts)*100 : 0}%` }}></div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Cancelled</span>
              <span className="font-semibold text-red-500">{stats.cancelledAppts}</span>
            </div>
            <div className="w-full bg-line/30 rounded-full h-2">
              <div className="bg-red-400 h-2 rounded-full" style={{ width: `${stats.totalAppts ? (stats.cancelledAppts/stats.totalAppts)*100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Revenue by Method */}
        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-royal" /> Revenue by Payment Method
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-line rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pale rounded-lg text-ink-soft"><Banknote size={16} /></div>
                <span className="text-sm font-medium text-ink">Cash</span>
              </div>
              <span className="font-bold text-ink">{peso(stats.paymentMethods.cash)}</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-line rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pale rounded-lg text-ink-soft"><Smartphone size={16} /></div>
                <span className="text-sm font-medium text-ink">GCash / E-Wallet</span>
              </div>
              <span className="font-bold text-ink">{peso(stats.paymentMethods.gcash)}</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-line rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pale rounded-lg text-ink-soft"><CreditCard size={16} /></div>
                <span className="text-sm font-medium text-ink">Card / Bank</span>
              </div>
              <span className="font-bold text-ink">{peso(stats.paymentMethods.card)}</span>
            </div>
          </div>
        </div>

        {/* Top Treatments */}
        <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
            <BriefcaseMedical size={16} className="text-royal" /> Top Treatments
          </h2>
          <ul className="space-y-3">
            {stats.topTreatments.length === 0 ? (
              <li className="text-sm text-ink-soft">No treatments booked yet.</li>
            ) : (
              stats.topTreatments.map(([name, count], idx) => (
                <li key={name} className="flex justify-between items-center text-sm gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-bold text-royal/50 text-xs w-4 shrink-0">{idx + 1}.</span>
                    <span className="font-medium text-ink truncate">{name}</span>
                  </div>
                  <span className="font-semibold text-ink-soft shrink-0">{count} booked</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <UserRoundCog size={16} className="text-royal" /> Staff Performance (Services & Retail)
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Service treatments serviced and product sales attributed per aesthetician/staff.
            </p>
          </div>
          <span className="text-xs font-semibold text-royal bg-royal/10 px-2.5 py-1 rounded-full">
            {stats.staffPerformance.length} Active Performers
          </span>
        </div>

        {/* Mobile View (< lg) */}
        <div className="p-3 sm:p-4 space-y-2.5 lg:hidden">
          {stats.staffPerformance.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-soft">
              No services or sales recorded by staff this month.
            </div>
          ) : (
            stats.staffPerformance.map((st, idx) => (
              <div key={idx} className="bg-pale/30 border border-line rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink text-sm">{st.name}</span>
                  <span className="font-mono font-bold text-ink text-sm sm:text-base">
                    {peso(st.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-soft">
                  <span className="capitalize">{st.role} &bull; {st.count} client sessions</span>
                  <span>Services: {peso(st.servicesTotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= lg) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-pale text-ink-soft font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-center">Sessions / Sales</th>
                <th className="px-6 py-4 text-right">Service Revenue</th>
                <th className="px-6 py-4 text-right">Total Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stats.staffPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-ink-soft">
                    No services or sales recorded by staff this month.
                  </td>
                </tr>
              ) : (
                stats.staffPerformance.map((st, idx) => (
                  <tr key={idx} className="hover:bg-pale/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-ink flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-royal/10 text-royal flex items-center justify-center font-bold text-xs shrink-0">
                        {st.name.slice(0, 1)}
                      </div>
                      <span>{st.name}</span>
                    </td>
                    <td className="px-6 py-4 text-ink-soft capitalize">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pale border border-line text-ink">
                        {st.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-ink">
                      {st.count}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-ink-soft">
                      {peso(st.servicesTotal)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                      {peso(st.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
