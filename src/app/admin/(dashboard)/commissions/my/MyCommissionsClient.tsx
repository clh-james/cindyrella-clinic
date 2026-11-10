// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Aesthetician Personal Daily Commission & Session Performance Client
// ==============================================================================

"use client";

import { useState } from "react";
import {
  Sparkles,
  Calendar,
  PhilippinePeso,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Eye,
  Award,
  ChevronRight,
  UserCheck,
  Stethoscope,
  Camera,
  Coins,
  History,
  Info,
} from "lucide-react";
import { formatPHP } from "@/lib/payroll/philippine-tax";
import { createCommissionRecord } from "@/app/admin/(dashboard)/payroll/actions";
import toast from "react-hot-toast";

interface MyCommissionsClientProps {
  initialData: {
    staff: {
      id: string;
      fullName: string;
      role: string;
    };
    date: string;
    kpis: {
      todayCommissionTotal: number;
      todayPendingCommission: number;
      monthCommissionTotal: number;
      clientsServedToday: number;
      totalSessionsToday: number;
    };
    todayCommissions: any[];
    monthCommissions: any[];
    todayAppointments: any[];
    todayRedemptions: any[];
  };
}

export function MyCommissionsClient({ initialData }: MyCommissionsClientProps) {
  const [data, setData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState<string>(initialData.date);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Claim modal form state
  const [claimItemName, setClaimItemName] = useState("");
  const [claimBaseAmount, setClaimBaseAmount] = useState("");
  const [claimCommissionRate, setClaimCommissionRate] = useState("10");
  const [claimNotes, setClaimNotes] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  const kpis = data.kpis;

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimItemName.trim()) {
      toast.error("Please enter treatment or service name.");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const res = await createCommissionRecord({
        employee_id: data.staff.id,
        source_type: "manual_service",
        item_name: claimItemName.trim(),
        base_amount: Number(claimBaseAmount || 0),
        commission_rate: Number(claimCommissionRate || 10),
        is_percentage: true,
        date_earned: selectedDate,
        status: "pending",
        notes: claimNotes.trim() || "Aesthetician self-logged treatment session",
      });

      if (res.success) {
        toast.success("Commission claim submitted for manager review!");
        setIsClaimModalOpen(false);
        setClaimItemName("");
        setClaimBaseAmount("");
        setClaimNotes("");
      } else {
        toast.error(res.error || "Failed to submit claim.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
          <Sparkles size={280} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-white/10 backdrop-blur-xs border border-white/20 text-rose-200 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                <Coins size={14} className="text-rose-300" /> My Daily Earnings
              </span>
              <span className="text-xs text-rose-200/80 font-medium">
                {data.staff.role === "aesthetician" ? "Clinical Aesthetician" : data.staff.role.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight">
              Welcome back, {data.staff.fullName}!
            </h1>
            <p className="text-xs text-rose-100 max-w-xl">
              Track your daily serviced clients, treatment commissions, and take-home earnings in real-time before wrapping up your shift today.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl px-3 py-2 text-xs">
              <Calendar size={14} className="text-rose-200" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              />
            </div>

            {/* Quick Claim Button */}
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-white text-rose-950 hover:bg-rose-50 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} /> Log Manual Session
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Commission Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Today&apos;s Commission</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700">
                <PhilippinePeso size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
              {formatPHP(kpis.todayCommissionTotal)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Pending Review:</span>
            <span className="font-bold text-amber-700 font-mono">
              {formatPHP(kpis.todayPendingCommission)}
            </span>
          </div>
        </div>

        {/* Card 2: Clients / Sessions Serviced Today */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Clients Serviced Today</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-teal-800 tracking-tight">
              {kpis.clientsServedToday} <span className="text-base font-normal text-slate-400">clients</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Total Treatments:</span>
            <span className="font-bold text-slate-800 font-mono">
              {kpis.totalSessionsToday} sessions
            </span>
          </div>
        </div>

        {/* Card 3: Month / Cutoff Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>This Month / Cutoff</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-900 tracking-tight">
              {formatPHP(kpis.monthCommissionTotal)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Payroll Status:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 size={12} /> Auto-crediting
            </span>
          </div>
        </div>

        {/* Card 4: Daily Shift Target */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Shift Target Goal</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                <Award size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
              {kpis.clientsServedToday} / 5
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((kpis.clientsServedToday / 5) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("today")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "today"
              ? "bg-rose-700 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Clock size={14} /> Today&apos;s Shift Sessions ({data.todayAppointments.length + data.todayRedemptions.length})
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-rose-700 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <History size={14} /> Monthly Commission Ledger ({data.monthCommissions.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TODAY'S CLIENT SESSIONS BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === "today" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-serif font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users size={16} className="text-rose-700" />
                Clients &amp; Treatments Handled Today ({selectedDate})
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Official Credited Sessions
              </span>
            </div>

            {data.todayAppointments.length === 0 && data.todayRedemptions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <Sparkles size={36} className="mx-auto text-slate-300 mb-2" />
                No appointments or package redemptions recorded under your name for {selectedDate} yet.
                <p className="text-[11px] text-slate-400 mt-1">
                  Once an appointment is completed or a package session is redeemed with you as the handler, it will automatically appear here!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Time / Ref #</th>
                      <th className="py-3 px-3">Patient / Client</th>
                      <th className="py-3 px-3">Treatment Performed</th>
                      <th className="py-3 px-3 text-right">Service Value</th>
                      <th className="py-3 px-3 text-right">Commission Earned</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Appointments */}
                    {data.todayAppointments.map((appt: any) => {
                      const commAmt = Number(appt.commission_amount || (Number(appt.amount_due || 0) * 0.1));
                      return (
                        <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-slate-900 block">{appt.appointment_time || "Scheduled"}</span>
                            <span className="text-[10px] text-slate-400">{appt.reference_number}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">
                              {appt.customers?.first_name} {appt.customers?.last_name}
                            </span>
                            <span className="text-[10px] text-slate-400">{appt.customers?.phone}</span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700">
                            {appt.treatments?.name || "Clinic Treatment"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {formatPHP(appt.amount_due || appt.treatments?.session_price || 0)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 text-sm">
                            +{formatPHP(commAmt)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={10} /> Credited
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Package Redemptions */}
                    {data.todayRedemptions.map((red: any) => (
                      <tr key={red.id} className="hover:bg-slate-50/60 transition-colors bg-teal-50/20">
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-teal-900 block">Session {red.session_number}</span>
                          <span className="text-[10px] text-slate-400">{new Date(red.redeemed_at).toLocaleTimeString("en-PH")}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 block">
                            {red.customer_packages?.customers?.first_name} {red.customer_packages?.customers?.last_name}
                          </span>
                          <span className="text-[10px] text-teal-700 font-semibold">Package Client</span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {red.customer_packages?.package_name || "Package Treatment Session"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          Package Credit
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-teal-800 text-sm">
                          +₱250.00
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                            <CheckCircle2 size={10} /> Redeemed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY COMMISSION LEDGER */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-serif font-bold text-slate-900 text-sm flex items-center gap-2">
              <PhilippinePeso size={16} className="text-rose-700" />
              Monthly Treatment Commission Ledger
            </h3>
            <span className="text-xs text-slate-500 font-mono font-bold">
              Total: {formatPHP(kpis.monthCommissionTotal)}
            </span>
          </div>

          {data.monthCommissions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No commission claims or approved entries recorded for this month yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date Earned</th>
                    <th className="py-3 px-3">Reference #</th>
                    <th className="py-3 px-3">Service / Treatment Item</th>
                    <th className="py-3 px-3 text-right">Base Amount</th>
                    <th className="py-3 px-3 text-right">Commission Rate</th>
                    <th className="py-3 px-3 text-right">Net Commission</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.monthCommissions.map((comm: any) => (
                    <tr key={comm.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {comm.date_earned}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {comm.reference_number || "COMM-DIRECT"}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {comm.item_name}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatPHP(comm.base_amount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {comm.is_percentage ? `${comm.commission_rate}%` : formatPHP(comm.commission_rate)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 text-sm">
                        {formatPHP(comm.commission_amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            comm.status === "approved" || comm.status === "paid"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {comm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LOG MANUAL SESSION / COMMISSION CLAIM MODAL */}
      {/* ========================================================================= */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                  <Sparkles size={16} />
                </div>
                <h3 className="font-serif font-bold text-slate-800 text-sm">
                  Log Treatment Commission Claim
                </h3>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Treatment / Service Name
                </label>
                <input
                  type="text"
                  required
                  value={claimItemName}
                  onChange={(e) => setClaimItemName(e.target.value)}
                  placeholder="e.g. Cinderella Glutathione Drip"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Service Price (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={claimBaseAmount}
                    onChange={(e) => setClaimBaseAmount(e.target.value)}
                    placeholder="3500.00"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={claimCommissionRate}
                    onChange={(e) => setClaimCommissionRate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Client Name (Optional)
                </label>
                <input
                  type="text"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="e.g. Walk-in client Maria Santos"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-rose-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingClaim ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

