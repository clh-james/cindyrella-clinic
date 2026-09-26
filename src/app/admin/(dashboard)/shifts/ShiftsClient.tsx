/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { openShift, closeShift } from "./actions";
import { WalletCards, Play, Square, Banknote, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const peso = (n: number | null | undefined) => n == null ? "-" : `₱${n.toLocaleString("en-PH")}`;

export function ShiftsClient({ branches, initialShifts, currentUserId }: { branches: any[], initialShifts: any[], currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [startingCash, setStartingCash] = useState(0);
  
  const [closeShiftId, setCloseShiftId] = useState<string | null>(null);
  const [actualCash, setActualCash] = useState(0);
  const [notes, setNotes] = useState("");

  const myOpenShift = initialShifts.find(s => s.cashier_id === currentUserId && s.status === "open");

  const handleOpen = () => {
    if (!branchId) return toast.error("Please select a branch.");
    startTransition(async () => {
      const res = await openShift({ branchId, startingCash });
      if (res.error) toast.error(res.error);
      else toast.success("Shift opened successfully.");
    });
  };

  const handleClose = () => {
    if (!closeShiftId) return;
    startTransition(async () => {
      const res = await closeShift({ shiftId: closeShiftId, actualCash, notes });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Shift closed successfully.");
        setCloseShiftId(null);
        setActualCash(0);
        setNotes("");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">Cashier Shifts</h1>
        <p className="text-sm text-ink-soft mt-1">Manage drawer cash and shift sessions for financial accountability.</p>
      </div>

      {/* Active Shift Card */}
      <div className="bg-white rounded-2xl border border-line shadow-sm p-6">
        <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
          <WalletCards className="text-royal" size={20} /> My Current Shift
        </h2>

        {myOpenShift ? (
          <div className="bg-pale border border-royal/20 p-5 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-royal uppercase tracking-wider">Shift is Active</p>
                <p className="text-sm text-ink mt-1">
                  Opened at {new Date(myOpenShift.opened_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} 
                  <span className="mx-2 text-line">•</span> 
                  Branch: {myOpenShift.branches?.name}
                </p>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-line shadow-sm">
                <p className="text-xs text-ink-soft uppercase font-semibold">Starting Cash</p>
                <p className="text-lg font-bold text-ink">{peso(myOpenShift.starting_cash)}</p>
              </div>
            </div>

            <hr className="border-line" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Actual Drawer Cash (End of Shift)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">₱</span>
                  <input 
                    type="number" 
                    min="0"
                    value={actualCash}
                    onChange={e => setActualCash(Number(e.target.value))}
                    className="pl-8 pr-4 py-2 w-full border border-line rounded-lg text-sm focus:outline-none focus:border-royal"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Closing Notes (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g., Short by 50 due to incorrect change"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="px-4 py-2 w-full border border-line rounded-lg text-sm focus:outline-none focus:border-royal"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => {
                  setCloseShiftId(myOpenShift.id);
                  handleClose();
                }}
                disabled={isPending}
                className="bg-ink hover:bg-ink/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Square size={16} /> Close Shift
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-line p-5 rounded-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
              <AlertCircle size={20} />
              <p className="text-sm">You do not have an active shift. Open a shift to process transactions.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Branch</label>
                <select 
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="px-4 py-2 w-full border border-line rounded-lg text-sm focus:outline-none focus:border-royal"
                  disabled={isPending}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Starting Cash (Float)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">₱</span>
                  <input 
                    type="number" 
                    min="0"
                    value={startingCash}
                    onChange={e => setStartingCash(Number(e.target.value))}
                    className="pl-8 pr-4 py-2 w-full border border-line rounded-lg text-sm focus:outline-none focus:border-royal"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleOpen}
                disabled={isPending || branches.length === 0}
                className="bg-royal hover:bg-royal/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Play size={16} /> Open Shift
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shift History Table */}
      <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="p-6 border-b border-line">
          <h2 className="text-sm font-bold text-ink">Shift History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-pale text-ink-soft font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Cashier</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">Opened</th>
                <th className="px-6 py-4">Closed</th>
                <th className="px-6 py-4 text-right">Expected</th>
                <th className="px-6 py-4 text-right">Actual</th>
                <th className="px-6 py-4 text-right">Variance</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {initialShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-ink-soft">No shifts recorded yet.</td>
                </tr>
              ) : (
                initialShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-pale/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-ink">{shift.staff?.full_name}</td>
                    <td className="px-6 py-4 text-ink-soft">{shift.branches?.name}</td>
                    <td className="px-6 py-4 text-ink-soft">
                      {new Date(shift.opened_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-ink-soft">
                      {shift.closed_at ? new Date(shift.closed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-ink-soft">{peso(shift.expected_cash)}</td>
                    <td className="px-6 py-4 text-right font-medium text-ink">{peso(shift.actual_cash)}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      <span className={shift.variance === 0 ? "text-green-600" : shift.variance && shift.variance < 0 ? "text-red-500" : "text-amber-500"}>
                        {peso(shift.variance)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${shift.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {shift.status}
                      </span>
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
