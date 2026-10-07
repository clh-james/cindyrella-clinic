/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition, useMemo } from "react";
import { openShift, closeShift, approveVariance } from "./actions";
import { WalletCards, Play, Square, AlertCircle, FileText, Filter, LayoutDashboard, Clock, History, FileSearch, Search, UserCheck, CheckCircle2 } from "lucide-react";
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
          <div><p className="text-xs font-bold text-ink-soft uppercase tracking-wider">Today's Cash (Closed)</p><p className="text-xl font-bold text-ink leading-none mt-1">{peso(todayCash)}</p></div>
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
              <button onClick={() => setSelectedShiftId(myOpenShift.id)} className="w-full py-2 border border-line rounded-lg text-sm font-semibold hover:bg-pale transition-colors text-ink">View Details</button>
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
                    <button onClick={() => setSelectedShiftId(shift.id)} className="text-royal font-semibold hover:underline">Details</button>
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

      {/* SHIFT DETAILS DRAWER/MODAL */}
      {selectedShiftDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-ink/40 backdrop-blur-sm sm:p-0">
          <div className="bg-white shadow-2xl w-full max-w-md h-full sm:h-screen overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-line bg-pale/30 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
              <h2 className="font-serif font-bold text-lg text-ink flex items-center gap-2"><FileText className="text-royal" size={20}/> SHIFT DETAILS</h2>
              <button onClick={() => setSelectedShiftId(null)} className="p-2 text-ink-soft hover:bg-line/50 rounded-full">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-ink-soft">Shift ID</span><span className="font-mono text-xs">{selectedShiftDetails.id}</span></div>
                <div className="flex justify-between"><span className="text-ink-soft">Cashier</span><span className="font-semibold">{selectedShiftDetails.staff?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-ink-soft">Branch</span><span className="font-semibold">{selectedShiftDetails.branches?.name}</span></div>
                <div className="flex justify-between items-center"><span className="text-ink-soft">Status</span>{getStatusBadge(selectedShiftDetails.status)}</div>
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
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 border-b border-line pb-1">OPENING</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-ink-soft">Opening Cash</span><span className="font-mono">{peso(selectedShiftDetails.starting_cash)}</span></div>
                  <div className="flex justify-between"><span className="text-ink-soft">Opened</span><span>{new Date(selectedShiftDetails.opened_at).toLocaleString()}</span></div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 border-b border-line pb-1">SALES & ADJUSTMENTS</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-ink-soft">Cash Sales</span><span className="font-mono text-green-600">+{peso(selectedShiftDetails.cash_sales || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-ink-soft">Cash Refunds</span><span className="font-mono text-red-500">-{peso(selectedShiftDetails.cash_refunds || 0)}</span></div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 border-b border-line pb-1">RECONCILIATION</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-bold"><span className="text-ink">Expected Cash</span><span className="font-mono text-royal">{peso(selectedShiftDetails.expected_cash)}</span></div>
                  <div className="flex justify-between font-bold"><span className="text-ink">Actual Cash</span><span className="font-mono">{peso(selectedShiftDetails.actual_cash)}</span></div>
                  <div className={`flex justify-between font-bold p-2 rounded ${selectedShiftDetails.variance === 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}><span className="">Variance</span><span className="font-mono">{peso(selectedShiftDetails.variance)}</span></div>
                </div>
              </div>
              
              {selectedShiftDetails.closed_at && (
                <div>
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3 border-b border-line pb-1">CLOSING</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-ink-soft">Closed</span><span>{new Date(selectedShiftDetails.closed_at).toLocaleString()}</span></div>
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex gap-2">
                 <button className="flex-1 py-2.5 border border-line rounded-xl text-sm font-semibold hover:bg-pale text-ink flex items-center justify-center gap-2"><FileSearch size={16}/> Transactions</button>
                 <button className="flex-1 py-2.5 border border-line rounded-xl text-sm font-semibold hover:bg-pale text-ink flex items-center justify-center gap-2"><UserCheck size={16}/> Audit Log</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
