/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { 
  BarChart3, TrendingUp, CalendarDays, WalletCards, BriefcaseMedical, UserRoundCog,
  CreditCard, Banknote, Smartphone
} from "lucide-react";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export function ReportsClient({ appointments, sales, staff }: { appointments: any[], sales: any[], staff: any[] }) {
  
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

    // 5. Staff Performance (Retail Sales only for MVP)
    const staffSales = new Map<string, { total: number, count: number }>();
    sales.forEach(s => {
      const staffId = s.created_by;
      if (staffId) {
        const current = staffSales.get(staffId) || { total: 0, count: 0 };
        staffSales.set(staffId, { total: current.total + s.total_amount, count: current.count + 1 });
      }
    });
    
    const staffPerformance = [...staffSales.entries()].map(([id, data]) => {
      const staffMember = staff.find(st => st.id === id);
      return {
        name: staffMember?.full_name || "Unknown Staff",
        role: staffMember?.roles?.name || "N/A",
        total: data.total,
        count: data.count
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Reports Dashboard</h1>
          <p className="text-sm text-ink-soft mt-1">Summary for the current month.</p>
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
        <div className="p-6 border-b border-line">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <UserRoundCog size={16} className="text-royal" /> Staff Retail Sales Performance
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-pale text-ink-soft font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Sales Count</th>
                <th className="px-6 py-4 text-right">Total Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stats.staffPerformance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-ink-soft">No retail sales recorded by staff this month.</td>
                </tr>
              ) : (
                stats.staffPerformance.map((staff, idx) => (
                  <tr key={idx} className="hover:bg-pale/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-ink">{staff.name}</td>
                    <td className="px-6 py-4 text-ink-soft capitalize">{staff.role}</td>
                    <td className="px-6 py-4 text-ink-soft">{staff.count}</td>
                    <td className="px-6 py-4 text-right font-bold text-ink">{peso(staff.total)}</td>
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
