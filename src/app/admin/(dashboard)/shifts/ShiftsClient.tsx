/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { openShift, closeShift, approveVariance, getShiftTransactions, getShiftAuditLogs } from "./actions";
import { 
  WalletCards, Play, Square, AlertCircle, FileText, Filter, LayoutDashboard, 
  Clock, History, FileSearch, Search, UserCheck, CheckCircle2, ArrowLeft, 
  ExternalLink, Loader2, AlertTriangle, ShieldCheck, Banknote, CreditCard, 
  RefreshCw, X 
} from "lucide-react";
import toast from "react-hot-toast";

const peso = (n: number | null | undefined) => n == null ? "-" : `₱${n.toLocaleString("en-PH")}`;

export function ShiftsClient({ branches, initialShifts, currentUserId, currentUserRole, currentUserBranchId }: { branches: any[], initialShifts: any[], currentUserId: string, currentUserRole: string, currentUserBranchId: string }) {
  const [isPending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(currentUserBranchId || branches[0]?.id || "");
  const [startingCash, setStartingCash] = useState<number | "">("");
  
  const [closeShiftId, setCloseShiftId] = useState<string | null>(null);
  const [actualCash, setActualCash] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"details" | "transactions" | "audit">("details");
  const [shiftTransactions, setShiftTransactions] = useState<any[] | null>(null);
  const [shiftAuditLogs, setShiftAuditLogs] = useState<any[] | null>(null);
  const [loadingSubdata, setLoadingSubdata] = useState(false);
  const [txFilter, setTxFilter] = useState("");

  const handleOpenShiftDrawer = (shiftId: string, initialTab: "details" | "transactions" | "audit" = "details") => {
    setSelectedShiftId(shiftId);
    setDrawerTab(initialTab);
    setShiftTransactions(null);
    setShiftAuditLogs(null);
    setTxFilter("");
    if (initialTab === "transactions") {
      fetchTransactions(shiftId);
    } else if (initialTab === "audit") {
      fetchAuditLogs(shiftId);
    }
  };

  const fetchTransactions = async (shiftId: string) => {
    setLoadingSubdata(true);
    const res = await getShiftTransactions(shiftId);
    if (res.transactions) {
      setShiftTransactions(res.transactions);
    } else {
      toast.error(res.error || "Failed to load transactions");
    }
    setLoadingSubdata(false);
  };

  const fetchAuditLogs = async (shiftId: string) => {
    setLoadingSubdata(true);
    const res = await getShiftAuditLogs(shiftId);
    if (res.timeline) {
      setShiftAuditLogs(res.timeline);
    } else {
      toast.error(res.error || "Failed to load audit logs");
    }
    setLoadingSubdata(false);
  };

  const myOpenShift = initialShifts.find(s => s.cashier_id === currentUserId && s.status === "open");

  const handleOpen = () => {
    if (!branchId) return toast.error("Please select a branch.");
    if (startingCash === "" || startingCash < 0) return toast.error("Enter a valid starting cash amount.");
    
    startTransition(async () => {
      const res = await openShift({ branchId, startingCash: Number(startingCash) });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Shift opened successfully.");
        setStartingCash("");
      }
    });
  };

  const handleClose = (expectedCash: number) => {
    if (!closeShiftId) return;
    if (actualCash === "" || actualCash < 0) return toast.error("Enter a valid actual cash amount.");
    
    const variance = Number(actualCash) - expectedCash;
    if (variance !== 0 && !reason) return toast.error("Reason is required for variance.");

    startTransition(async () => {
      const res = await closeShift({ shiftId: closeShiftId, actualCash: Number(actualCash), notes, reason });
      if (res.error) toast.error(res.error);
      else {
        toast.success(res.variance === 0 ? "Shift closed successfully." : "Shift submitted for variance review.");
        setCloseShiftId(null);
        setActualCash("");
        setNotes("");
        setReason("");
      }
    });
  };

  const handleApprove = (shiftId: string) => {
    startTransition(async () => {
      const res = await approveVariance(shiftId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Variance approved and shift closed.");
        setSelectedShiftId(null);
      }
    });
  };

  // Metrics
  const activeCount = initialShifts.filter(s => s.status === 'open').length;
  const closedCount = initialShifts.filter(s => s.status === 'closed').length;
  const reviewCount = initialShifts.filter(s => s.status === 'variance_review').length;
  const todayCash = initialShifts.filter(s => s.status === 'closed' && new Date(s.closed_at).toDateString() === new Date().toDateString()).reduce((acc, s) => acc + (s.actual_cash || 0), 0);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'open': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max">🟢 OPEN</span>;
      case 'closed': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max">🔵 CLOSED</span>;
      case 'variance_review': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max">🟡 REVIEW</span>;
      case 'investigation': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max">🔴 INVESTIGATE</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max">⚪ {status}</span>;
    }
  };

  const selectedShiftDetails = initialShifts.find(s => s.id === selectedShiftId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Cashier Shifts</h1>
          <p className="text-sm text-ink-soft mt-1">Manage drawer cash, shift sessions, reconciliation, and cashier accountability.</p>
        </div>
        <div className="flex gap-4 text-xs font-semibold">
          <div className="bg-white px-3 py-1.5 rounded-lg border border-line flex gap-2 shadow-sm text-ink">
            <span className="text-ink-soft">Branch:</span> {branches.find(b => b.id === currentUserBranchId)?.name || "All"}
          </div>
          <div className="bg-white px-3 py-1.5 rounded-lg border border-line flex gap-2 shadow-sm text-ink uppercase">
            <span className="text-ink-soft">Role:</span> {currentUserRole}
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-line shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg"><Clock size={20} /></div>
          <div><p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Active Shifts</p><p className="text-xl font-bold text-ink leading-none mt-1">{activeCount}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-line shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-royal/10 text-royal rounded-lg"><WalletCards size={20} /></div>
          <div><p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Today&apos;s Cash (Closed)</p><p className="text-xl font-bold text-ink leading-none mt-1">{peso(todayCash)}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-line shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><AlertCircle size={20} /></div>
          <div><p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Variance Reviews</p><p className="text-xl font-bold text-ink leading-none mt-1">{reviewCount}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-line shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle2 size={20} /></div>
          <div><p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Closed Shifts</p><p className="text-xl font-bold text-ink leading-none mt-1">{closedCount}</p></div>
        </div>
      </div>

      {/* MY CURRENT SHIFT */}
      <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
        <div className="bg-pale/30 p-4 border-b border-line flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <LayoutDashboard size={18} className="text-royal" /> My Current Shift
          </h2>
        </div>
        <div className="p-5">
        {myOpenShift ? (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                <p className="font-bold text-sm text-green-700 uppercase">Shift Open</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-ink-soft text-xs mb-0.5">Cashier</p><p className="font-medium text-ink">{myOpenShift.staff?.full_name}</p></div>
                <div><p className="text-ink-soft text-xs mb-0.5">Branch</p><p className="font-medium text-ink">{myOpenShift.branches?.name}</p></div>
                <div><p className="text-ink-soft text-xs mb-0.5">Opened</p><p className="font-medium text-ink">{new Date(myOpenShift.opened_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}</p></div>
              </div>
            </div>
            
            <div className="w-px bg-line hidden md:block"></div>
            
            <div className="flex-1 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-ink-soft">Opening Cash</span><span className="font-medium">{peso(myOpenShift.starting_cash)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink-soft">Cash Sales</span><span className="font-medium text-green-600">+{peso(myOpenShift.cash_sales || 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink-soft">Cash Refunds</span><span className="font-medium text-red-500">-{peso(myOpenShift.cash_refunds || 0)}</span></div>
              <div className="pt-2 border-t border-line border-dashed flex justify-between font-bold text-base">
                <span>Expected Cash</span><span className="text-royal">{peso(myOpenShift.starting_cash + (myOpenShift.cash_sales || 0) - (myOpenShift.cash_refunds || 0))}</span>
              </div>
            </div>

            <div className="w-px bg-line hidden md:block"></div>
            
            <div className="flex flex-col justify-end gap-3 md:w-48 shrink-0">
              <button onClick={() => handleOpenShiftDrawer(myOpenShift.id)} className="w-full py-2 border border-line rounded-lg text-sm font-semibold hover:bg-pale transition-colors text-ink">View Details</button>
              <button onClick={() => setCloseShiftId(myOpenShift.id)} className="w-full py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:bg-ink/90 transition-colors flex justify-center items-center gap-2"><Square size={16}/> Close Shift</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100 mb-2">
              <AlertCircle size={16} />
              <p className="text-xs font-semibold">You do not have an active shift. Open a shift before processing POS transactions.</p>
            </div>
            <div className="flex items-end gap-4 w-full max-w-lg">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase">Branch</label>
                <select 
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  disabled={currentUserRole === "CASHIER"} // Cashier cannot change branch
                  className="px-3 py-2 w-full border border-line rounded-lg text-sm focus:outline-none focus:border-royal bg-pale/30 disabled:opacity-70"
                >
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase">Opening Cash</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm">₱</span>
                  <input 
                    type="number" min="0" value={startingCash} onChange={e => setStartingCash(e.target.value === "" ? "" : Number(e.target.value))}
                    className="pl-7 pr-3 py-2 w-full border border-line rounded-lg text-sm focus:outline-none focus:border-royal bg-white"
                  />
                </div>
              </div>
              <button onClick={handleOpen} disabled={isPending || startingCash === ""} className="bg-royal hover:bg-royal-deep text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 h-[38px] flex items-center gap-2">
                <Play size={16} /> Open Shift
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* SHIFT HISTORY TABLE */}
      <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between bg-pale/30">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <History size={18} className="text-royal" /> Shift History
          </h2>
          <div className="flex gap-2">
             <div className="relative">
               <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
               <input type="text" placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg outline-none focus:border-royal w-40" />
             </div>
             <button className="p-1.5 border border-line rounded-lg text-ink-soft hover:text-ink"><Filter size={16}/></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-pale/50 text-ink-soft font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3">Closed</th>
                <th className="px-4 py-3 text-right">Expected</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {initialShifts.map(shift => (
                <tr key={shift.id} className="hover:bg-pale/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-ink">{shift.staff?.full_name}</td>
                  <td className="px-4 py-3 text-ink-soft">{shift.branches?.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{new Date(shift.opened_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</td>
                  <td className="px-4 py-3 text-ink-soft">{shift.closed_at ? new Date(shift.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : '-'}</td>
                  <td className="px-4 py-3 text-right text-ink-soft font-mono">{peso(shift.expected_cash)}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink font-mono">{peso(shift.actual_cash)}</td>
                  <td className="px-4 py-3 text-right font-medium font-mono">
                    {shift.variance === 0 ? <span className="text-green-600">₱0.00</span> : shift.variance ? <span className={shift.variance < 0 ? "text-red-500" : "text-amber-500"}>{peso(shift.variance)}</span> : '-'}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(shift.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleOpenShiftDrawer(shift.id)} className="text-royal font-semibold hover:underline">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLOSE SHIFT MODAL */}
      {closeShiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-5 border-b border-line bg-pale/30 font-bold text-ink flex items-center gap-2">
              <Square size={18} className="text-ink-soft" /> CLOSE SHIFT
            </div>
            <div className="p-5 space-y-4">
              
              {(() => {
                const s = initialShifts.find(x => x.id === closeShiftId);
                const expected = (s?.starting_cash || 0) + (s?.cash_sales || 0) - (s?.cash_refunds || 0);
                const variance = actualCash === "" ? 0 : Number(actualCash) - expected;
                
                return (
                  <>
                    <div className="space-y-2 text-sm border-b border-line pb-4">
                      <div className="flex justify-between text-ink-soft"><span>Opening Cash</span><span>{peso(s?.starting_cash)}</span></div>
                      <div className="flex justify-between text-ink-soft"><span>Cash Sales</span><span>+{peso(s?.cash_sales)}</span></div>
                      <div className="flex justify-between text-ink-soft"><span>Cash Refunds</span><span>-{peso(s?.cash_refunds)}</span></div>
                      <div className="flex justify-between font-bold text-base pt-2"><span>Expected Cash</span><span className="text-royal">{peso(expected)}</span></div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase">Actual Physical Cash</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft font-mono">₱</span>
                        <input type="number" value={actualCash} onChange={e => setActualCash(e.target.value === "" ? "" : Number(e.target.value))} className="pl-8 pr-3 py-2.5 w-full border border-line rounded-lg text-lg font-mono font-bold focus:border-royal outline-none" placeholder="0.00" />
                      </div>
                    </div>

                    {actualCash !== "" && (
                      <div className={`p-3 rounded-lg border flex justify-between items-center ${variance === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        <span className="text-xs font-bold uppercase">{variance === 0 ? 'Balanced' : 'Variance'}</span>
                        <span className="font-mono font-bold">{peso(variance)}</span>
                      </div>
                    )}

                    {actualCash !== "" && variance !== 0 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div>
                          <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase">Variance Reason</label>
                          <select value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg text-sm outline-none focus:border-royal bg-white">
                            <option value="">Select reason...</option>
                            <option value="Cash count discrepancy">Cash count discrepancy</option>
                            <option value="Change error">Change error</option>
                            <option value="Unrecorded expense">Unrecorded expense</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-ink-soft mb-1 uppercase">Notes</label>
                          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-line rounded-lg text-sm outline-none focus:border-royal resize-none" placeholder="Explain the discrepancy..." />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setCloseShiftId(null)} className="flex-1 py-2 bg-pale font-semibold rounded-lg text-sm">Cancel</button>
                      <button onClick={() => handleClose(expected)} disabled={isPending || actualCash === "" || (variance !== 0 && !reason)} className="flex-1 py-2 bg-ink text-white font-semibold rounded-lg text-sm disabled:opacity-50">Submit Closing</button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SHIFT DETAILS DRAWER */}
      {selectedShiftDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-ink/40 backdrop-blur-sm sm:p-0">
          <div className="bg-white shadow-2xl w-full max-w-md sm:max-w-lg h-full sm:h-screen flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* DRAWER HEADER */}
            <div className="p-4 border-b border-line bg-pale/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="text-royal" size={20}/>
                <div>
                  <h2 className="font-serif font-bold text-base text-ink">SHIFT DETAILS</h2>
                  <p className="text-[11px] font-mono text-ink-soft">ID: {selectedShiftDetails.id.slice(0, 18)}...</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedShiftId(null)} 
                className="p-1.5 text-ink-soft hover:text-ink hover:bg-line/50 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* SEGMENTED TAB SWITCHER */}
            <div className="flex border-b border-line bg-pale/20 px-4 shrink-0">
              <button
                onClick={() => setDrawerTab("details")}
                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                  drawerTab === "details"
                    ? "border-royal text-royal"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => {
                  setDrawerTab("transactions");
                  if (!shiftTransactions) fetchTransactions(selectedShiftDetails.id);
                }}
                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  drawerTab === "transactions"
                    ? "border-royal text-royal"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                <FileSearch size={14} /> Transactions
                {shiftTransactions && (
                  <span className="text-[10px] bg-royal/10 text-royal px-1.5 py-0.2 rounded-full font-bold">
                    {shiftTransactions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setDrawerTab("audit");
                  if (!shiftAuditLogs) fetchAuditLogs(selectedShiftDetails.id);
                }}
                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  drawerTab === "audit"
                    ? "border-royal text-royal"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                <UserCheck size={14} /> Audit Log
                {shiftAuditLogs && (
                  <span className="text-[10px] bg-royal/10 text-royal px-1.5 py-0.2 rounded-full font-bold">
                    {shiftAuditLogs.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* TAB 1: OVERVIEW */}
              {drawerTab === "details" && (
                <div className="space-y-5">
                  <div className="space-y-1.5 text-sm bg-pale/20 p-3.5 rounded-xl border border-line/60">
                    <div className="flex justify-between items-center"><span className="text-ink-soft text-xs">Cashier</span><span className="font-semibold text-ink">{selectedShiftDetails.staff?.full_name}</span></div>
                    <div className="flex justify-between items-center"><span className="text-ink-soft text-xs">Branch</span><span className="font-semibold text-ink">{selectedShiftDetails.branches?.name}</span></div>
                    <div className="flex justify-between items-center"><span className="text-ink-soft text-xs">Status</span>{getStatusBadge(selectedShiftDetails.status)}</div>
                  </div>

                  {selectedShiftDetails.status === "variance_review" && currentUserRole !== "CASHIER" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-amber-700 font-bold text-sm"><AlertCircle size={16}/> ACTION REQUIRED</div>
                      <p className="text-sm text-amber-900/80 text-xs">This shift reported a variance of <span className="font-bold">{peso(selectedShiftDetails.variance)}</span>.</p>
                      <div className="bg-white/50 p-2 rounded text-xs">
                        <span className="font-semibold text-amber-800">Reason:</span> {selectedShiftDetails.variance_reason}<br/>
                        <span className="font-semibold text-amber-800">Notes:</span> {selectedShiftDetails.notes || "None"}
                      </div>
                      <button onClick={() => handleApprove(selectedShiftDetails.id)} disabled={isPending} className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50">Approve & Close Shift</button>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2.5 border-b border-line pb-1">OPENING</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-ink-soft">Opening Cash</span><span className="font-mono font-medium">{peso(selectedShiftDetails.starting_cash)}</span></div>
                      <div className="flex justify-between"><span className="text-ink-soft">Opened</span><span className="text-ink">{new Date(selectedShiftDetails.opened_at).toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2.5 border-b border-line pb-1">SALES & ADJUSTMENTS</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-ink-soft">Cash Sales</span><span className="font-mono font-bold text-green-600">+{peso(selectedShiftDetails.cash_sales || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-ink-soft">Cash Refunds</span><span className="font-mono text-red-500">-{peso(selectedShiftDetails.cash_refunds || 0)}</span></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2.5 border-b border-line pb-1">RECONCILIATION</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between font-bold">
                        <span className="text-ink">Expected Cash</span>
                        <span className="font-mono text-royal flex items-center gap-1.5">
                          {peso(selectedShiftDetails.expected_cash ?? ((selectedShiftDetails.starting_cash || 0) + (selectedShiftDetails.cash_sales || 0) - (selectedShiftDetails.cash_refunds || 0)))}
                          {selectedShiftDetails.status === "open" && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-royal/10 text-royal font-semibold rounded tracking-wider uppercase">Live</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-ink">Actual Cash</span>
                        <span className="font-mono">
                          {selectedShiftDetails.status === "open" ? (
                            <span className="text-xs font-normal text-ink-soft italic">Pending close</span>
                          ) : (
                            peso(selectedShiftDetails.actual_cash)
                          )}
                        </span>
                      </div>
                      <div className={`flex justify-between font-bold p-2.5 rounded-lg ${
                        selectedShiftDetails.status === "open"
                          ? "bg-pale/50 text-ink-soft"
                          : selectedShiftDetails.variance === 0
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        <span>Variance</span>
                        <span className="font-mono">
                          {selectedShiftDetails.status === "open" ? (
                            <span className="text-xs font-normal italic">Pending close</span>
                          ) : (
                            peso(selectedShiftDetails.variance)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedShiftDetails.closed_at && (
                    <div>
                      <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2.5 border-b border-line pb-1">CLOSING</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-ink-soft">Closed</span><span>{new Date(selectedShiftDetails.closed_at).toLocaleString()}</span></div>
                      </div>
                    </div>
                  )}
                  
                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="pt-2 flex gap-2.5">
                    <button 
                      onClick={() => {
                        setDrawerTab("transactions");
                        if (!shiftTransactions) fetchTransactions(selectedShiftDetails.id);
                      }} 
                      className="flex-1 py-2.5 border border-line rounded-xl text-sm font-semibold hover:bg-royal/5 hover:border-royal text-ink flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <FileSearch size={16} className="text-royal"/> Transactions
                    </button>
                    <button 
                      onClick={() => {
                        setDrawerTab("audit");
                        if (!shiftAuditLogs) fetchAuditLogs(selectedShiftDetails.id);
                      }} 
                      className="flex-1 py-2.5 border border-line rounded-xl text-sm font-semibold hover:bg-royal/5 hover:border-royal text-ink flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <UserCheck size={16} className="text-royal"/> Audit Log
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: TRANSACTIONS */}
              {drawerTab === "transactions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setDrawerTab("details")} 
                      className="text-xs text-ink-soft hover:text-ink font-semibold flex items-center gap-1.5 px-2 py-1 rounded hover:bg-pale transition-colors"
                    >
                      <ArrowLeft size={14}/> Back to Overview
                    </button>
                    <button 
                      onClick={() => fetchTransactions(selectedShiftDetails.id)} 
                      disabled={loadingSubdata} 
                      className="text-xs text-royal font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={loadingSubdata ? "animate-spin" : ""}/> Refresh
                    </button>
                  </div>

                  {loadingSubdata ? (
                    <div className="py-16 text-center text-ink-soft space-y-2">
                      <Loader2 size={24} className="animate-spin mx-auto text-royal" />
                      <p className="text-xs">Loading shift transactions...</p>
                    </div>
                  ) : !shiftTransactions || shiftTransactions.length === 0 ? (
                    <div className="py-12 text-center text-ink-soft space-y-2 bg-pale/30 rounded-xl border border-line">
                      <FileSearch size={32} className="mx-auto text-ink-soft/40" />
                      <p className="text-sm font-medium text-ink">No transactions recorded yet</p>
                      <p className="text-xs">Transactions processed during this shift will appear here.</p>
                    </div>
                  ) : (
                    <>
                      {/* STATS SUMMARY BAR */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 bg-pale/40 border border-line rounded-lg">
                          <p className="text-[10px] text-ink-soft uppercase font-bold tracking-wider">Total Orders</p>
                          <p className="text-sm font-bold text-ink font-mono mt-0.5">{shiftTransactions.length}</p>
                        </div>
                        <div className="p-2.5 bg-green-50 border border-green-200/60 rounded-lg">
                          <p className="text-[10px] text-green-700 uppercase font-bold tracking-wider">Cash Total</p>
                          <p className="text-sm font-bold text-green-700 font-mono mt-0.5">
                            {peso(
                              shiftTransactions
                                .filter(t => t.payment_method?.toLowerCase() === "cash" && t.status !== "voided")
                                .reduce((sum, t) => sum + (t.amount || 0), 0)
                            )}
                          </p>
                        </div>
                        <div className="p-2.5 bg-royal/10 border border-royal/20 rounded-lg">
                          <p className="text-[10px] text-royal uppercase font-bold tracking-wider">Gross Total</p>
                          <p className="text-sm font-bold text-royal font-mono mt-0.5">
                            {peso(
                              shiftTransactions
                                .filter(t => t.status !== "voided")
                                .reduce((sum, t) => sum + (t.amount || 0), 0)
                            )}
                          </p>
                        </div>
                      </div>

                      {/* FILTER INPUT */}
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                        <input
                          type="text"
                          placeholder="Search ref, customer, or service..."
                          value={txFilter}
                          onChange={e => setTxFilter(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-line rounded-lg outline-none focus:border-royal"
                        />
                      </div>

                      {/* TRANSACTIONS LIST */}
                      <div className="space-y-2.5">
                        {shiftTransactions
                          .filter(t => {
                            if (!txFilter) return true;
                            const term = txFilter.toLowerCase();
                            return (
                              t.reference_number?.toLowerCase().includes(term) ||
                              t.customer_name?.toLowerCase().includes(term) ||
                              t.description?.toLowerCase().includes(term) ||
                              t.payment_method?.toLowerCase().includes(term)
                            );
                          })
                          .map((tx: any) => {
                            const isVoided = tx.status === "voided" || tx.status === "cancelled";
                            return (
                              <div 
                                key={tx.id} 
                                className={`p-3 rounded-xl border transition-all ${
                                  isVoided 
                                    ? "bg-red-50/40 border-red-200" 
                                    : "bg-white border-line hover:border-royal/40 shadow-sm"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-bold text-ink">
                                        {tx.reference_number}
                                      </span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                        isVoided 
                                          ? "bg-red-100 text-red-700" 
                                          : "bg-green-100 text-green-700"
                                      }`}>
                                        {isVoided ? "VOIDED" : "PAID"}
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-pale text-ink-soft">
                                        {tx.type === "retail" ? "Retail" : "Treatment"}
                                      </span>
                                    </div>
                                    <p className="text-xs font-semibold text-ink mt-1">
                                      {tx.customer_name}
                                    </p>
                                    <p className="text-[11px] text-ink-soft line-clamp-1">
                                      {tx.description}
                                    </p>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <p className={`font-mono font-bold text-sm ${isVoided ? "line-through text-red-500" : "text-ink"}`}>
                                      {peso(tx.amount)}
                                    </p>
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-ink-soft mt-0.5">
                                      {tx.payment_method === "cash" ? (
                                        <Banknote size={11} className="text-green-600" />
                                      ) : (
                                        <CreditCard size={11} className="text-royal" />
                                      )}
                                      {tx.payment_method || "cash"}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center justify-between text-[11px]">
                                  <span className="text-ink-soft">
                                    {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <Link 
                                    href={`/admin/receipt/${tx.reference_number}`} 
                                    target="_blank" 
                                    className="text-royal font-semibold hover:underline flex items-center gap-1"
                                  >
                                    View Receipt <ExternalLink size={11} />
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: AUDIT LOG */}
              {drawerTab === "audit" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setDrawerTab("details")} 
                      className="text-xs text-ink-soft hover:text-ink font-semibold flex items-center gap-1.5 px-2 py-1 rounded hover:bg-pale transition-colors"
                    >
                      <ArrowLeft size={14}/> Back to Overview
                    </button>
                    <button 
                      onClick={() => fetchAuditLogs(selectedShiftDetails.id)} 
                      disabled={loadingSubdata} 
                      className="text-xs text-royal font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={loadingSubdata ? "animate-spin" : ""}/> Refresh
                    </button>
                  </div>

                  {loadingSubdata ? (
                    <div className="py-16 text-center text-ink-soft space-y-2">
                      <Loader2 size={24} className="animate-spin mx-auto text-royal" />
                      <p className="text-xs">Loading audit logs...</p>
                    </div>
                  ) : !shiftAuditLogs || shiftAuditLogs.length === 0 ? (
                    <div className="py-12 text-center text-ink-soft space-y-2 bg-pale/30 rounded-xl border border-line">
                      <UserCheck size={32} className="mx-auto text-ink-soft/40" />
                      <p className="text-sm font-medium text-ink">No audit entries yet</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                      {shiftAuditLogs.map((item: any) => {
                        let icon = <Clock size={12} className="text-ink-soft" />;
                        let badgeBg = "bg-pale text-ink";
                        let title = item.action;

                        if (item.action === "SHIFT_OPENED") {
                          icon = <Play size={12} className="text-green-600 fill-green-600" />;
                          badgeBg = "bg-green-100 text-green-700";
                          title = "Shift Opened";
                        } else if (item.action === "SHIFT_CLOSED") {
                          icon = <Square size={12} className="text-blue-600 fill-blue-600" />;
                          badgeBg = "bg-blue-100 text-blue-700";
                          title = "Shift Closed";
                        } else if (item.action === "VOID_TRANSACTION") {
                          icon = <AlertTriangle size={12} className="text-red-600" />;
                          badgeBg = "bg-red-100 text-red-700";
                          title = "Transaction Voided";
                        } else if (item.action.includes("VARIANCE")) {
                          icon = <ShieldCheck size={12} className="text-purple-600" />;
                          badgeBg = "bg-purple-100 text-purple-700";
                          title = "Variance Action";
                        }

                        return (
                          <div key={item.id} className="relative group">
                            {/* TIMELINE DOT */}
                            <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border border-line flex items-center justify-center shadow-xs">
                              {icon}
                            </div>

                            <div className="bg-pale/30 p-3 rounded-xl border border-line space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${badgeBg}`}>
                                  {title}
                                </span>
                                <span className="text-[11px] text-ink-soft">
                                  {new Date(item.created_at).toLocaleString([], { 
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                  })}
                                </span>
                              </div>

                              <p className="text-xs text-ink font-medium">
                                By <span className="font-semibold text-royal">{item.user_name}</span>
                              </p>

                              {item.details && Object.keys(item.details).length > 0 && (
                                <div className="text-[11px] bg-white/70 p-2 rounded-lg border border-line/40 space-y-0.5 font-mono text-ink-soft">
                                  {item.details.opening_cash != null && (
                                    <div>Opening Cash: <span className="font-bold text-ink">{peso(item.details.opening_cash)}</span></div>
                                  )}
                                  {item.details.actual_cash != null && (
                                    <div>Actual Cash: <span className="font-bold text-ink">{peso(item.details.actual_cash)}</span></div>
                                  )}
                                  {item.details.variance != null && (
                                    <div>Variance: <span className="font-bold text-ink">{peso(item.details.variance)}</span></div>
                                  )}
                                  {item.details.reason && (
                                    <div className="text-amber-800 font-sans">Reason: {item.details.reason}</div>
                                  )}
                                  {item.details.notes && (
                                    <div className="text-ink-soft font-sans italic">Notes: &ldquo;{item.details.notes}&rdquo;</div>
                                  )}
                                  {item.details.branch && (
                                    <div>Branch: {item.details.branch}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
