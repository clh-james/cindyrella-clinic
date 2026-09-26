/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { voidTransaction } from "./actions";
import { Search, ReceiptText, Ban, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export function TransactionsClient({ sales, appointments }: { sales: any[], appointments: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<{id: string, type: "retail"|"appointment"} | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // Combine and sort
  const combined = [
    ...sales.map(s => ({
      id: s.id,
      ref: s.reference_number,
      amount: s.total_amount,
      method: s.payment_method,
      type: "retail",
      date: new Date(s.created_at),
      status: s.status,
      customer: s.customers ? `${s.customers.first_name} ${s.customers.last_name}` : "Walk-in"
    })),
    ...appointments.map(a => ({
      id: a.id,
      ref: a.reference_number,
      amount: a.amount_due,
      method: a.payment_method,
      type: "appointment",
      date: new Date(a.created_at),
      status: a.payment_status,
      customer: a.customers ? `${a.customers.first_name} ${a.customers.last_name}` : "Unknown"
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filtered = combined.filter(t => 
    t.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.customer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVoid = () => {
    if (!voidTarget || !voidReason) return toast.error("Reason is required");
    startTransition(async () => {
      const res = await voidTransaction({ id: voidTarget.id, type: voidTarget.type, reason: voidReason });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Transaction voided successfully.");
        setVoidModalOpen(false);
        setVoidTarget(null);
        setVoidReason("");
      }
    });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Transactions</h1>
          <p className="text-sm text-ink-soft mt-1">View, refund, or void sales and bookings.</p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search reference or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal w-full sm:w-72"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-pale text-ink-soft font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-ink-soft">
                    <div className="flex flex-col items-center gap-2">
                      <ReceiptText size={32} className="text-ink-soft/50" />
                      <p>No transactions found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className={`hover:bg-pale/50 transition-colors ${t.status === 'voided' ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 text-ink-soft">
                      {t.date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">{t.ref}</td>
                    <td className="px-6 py-4 text-ink">{t.customer}</td>
                    <td className="px-6 py-4 text-ink-soft capitalize">{t.type}</td>
                    <td className="px-6 py-4 text-ink-soft capitalize">{t.method}</td>
                    <td className="px-6 py-4 text-right font-bold text-ink">{peso(t.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                        t.status === 'completed' || t.status === 'paid' ? 'bg-green-100 text-green-700' :
                        t.status === 'voided' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(t.status === 'completed' || t.status === 'paid') && (
                        <button 
                          onClick={() => { setVoidTarget({id: t.id, type: t.type as any}); setVoidModalOpen(true); }}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 ml-auto text-xs font-semibold"
                        >
                          <Ban size={14} /> Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {voidModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-ink">Void Transaction</h3>
                <p className="text-sm text-ink-soft">This action is irreversible.</p>
              </div>
            </div>
            
            <p className="text-sm text-ink mb-4">
              Voiding this transaction will mark it as invalid in financial reports and automatically return any sold products back into inventory.
            </p>

            <label className="block text-sm font-semibold text-ink-soft mb-2">Reason for Void</label>
            <input 
              type="text" 
              placeholder="e.g. Mistake in POS, Customer asked for refund"
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              className="w-full border border-line rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-500 mb-6"
            />

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setVoidModalOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-pale rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleVoid}
                disabled={isPending || !voidReason}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
