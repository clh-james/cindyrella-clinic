/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { voidTransaction } from "./actions";
import { setAppointmentHandler } from "@/app/admin/actions";
import { Search, ReceiptText, Ban, AlertTriangle, UserCheck, User, Loader2, Calendar, Filter, X, Printer } from "lucide-react";
import toast from "react-hot-toast";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

function getDateSearchStrings(dateObj: Date): { iso: string; search: string } {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  const iso = `${y}-${m}-${d}`;

  const shortMonth = dateObj.toLocaleDateString("en-US", { month: "short" });
  const longMonth = dateObj.toLocaleDateString("en-US", { month: "long" });
  const dayNum = dateObj.getDate();

  const search = [
    iso,
    `${shortMonth} ${dayNum}`,
    `${longMonth} ${dayNum}`,
    `${shortMonth} ${dayNum}, ${y}`,
    `${longMonth} ${dayNum}, ${y}`,
    `${m}/${d}/${y}`,
    `${dateObj.getMonth() + 1}/${dayNum}`,
    shortMonth,
    longMonth,
    String(y),
  ]
    .join(" ")
    .toLowerCase();

  return { iso, search };
}

function getMethodSearchString(method?: string): string {
  const m = (method || "").toLowerCase();
  const extra: string[] = [];
  if (m.includes("card")) extra.push("card credit card debit mastercard visa");
  if (m === "cash") extra.push("cash pera");
  if (m.includes("maya")) extra.push("maya paymaya e-wallet");
  if (m.includes("gcash")) extra.push("gcash e-wallet");
  if (m.includes("bank")) extra.push("bank transfer bdo bpi online bank");
  return `${m} ${extra.join(" ")}`.toLowerCase();
}

export function TransactionsClient({ 
  sales, 
  appointments,
  staffList = []
}: { 
  sales: any[]; 
  appointments: any[];
  staffList?: { id: string; full_name: string; role?: string; branch_id?: string | null }[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [updatingHandlerId, setUpdatingHandlerId] = useState<string | null>(null);

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<{id: string, type: "retail"|"appointment"} | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const staffMap = useMemo(() => {
    return new Map(staffList.map((s) => [s.id, s.full_name]));
  }, [staffList]);

  const getClassificationBadge = (c?: string) => {
    const norm = (c || "").toLowerCase();
    if (norm === "booked") {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">Booked</span>;
    }
    if (norm.includes("boost")) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200">Boosting Main</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-sky-50 text-sky-700 border-sky-200">Walk-in</span>;
  };

  const extractAppointmentTreatments = (a: any): string => {
    if (a.notes) {
      const trimmed = a.notes.trim();
      if (trimmed.startsWith("[")) {
        try {
          let bracketCount = 0;
          let endIndex = -1;
          for (let i = 0; i < trimmed.length; i++) {
            if (trimmed[i] === "[") bracketCount++;
            else if (trimmed[i] === "]") {
              bracketCount--;
              if (bracketCount === 0) {
                endIndex = i;
                break;
              }
            }
          }
          const jsonSub = endIndex !== -1 ? trimmed.slice(0, endIndex + 1) : trimmed;
          const parsed = JSON.parse(jsonSub);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.name) {
            return parsed
              .map((item: any) => (item.quantity > 1 ? `${item.name} (x${item.quantity})` : item.name))
              .join(", ");
          }
        } catch {
          // fallback
        }
      }
    }

    const tName = Array.isArray(a.treatments) ? a.treatments[0]?.name : a.treatments?.name;
    if (tName) return tName;
    return a.service_name || a.treatment_name || "Appointment Service";
  };

  const extractRetailItems = (s: any): string => {
    if (s.pos_sale_items && Array.isArray(s.pos_sale_items) && s.pos_sale_items.length > 0) {
      return s.pos_sale_items
        .map((it: any) => {
          const name = it.inventory_items?.name || "Item";
          return it.quantity > 1 ? `${name} (x${it.quantity})` : name;
        })
        .join(", ");
    }
    return "Retail Products";
  };

  // Build combined transactions
  const initialCombined = useMemo(() => {
    return [
      ...sales.map(s => {
        let classification = s.client_classification;
        if (!classification && s.discount_reason) {
          const m = s.discount_reason.match(/\[Classification:([^\]]+)\]/i);
          if (m) classification = m[1];
        }
        const handlerName = staffMap.get(s.created_by) || null;
        const dateObj = new Date(s.created_at);
        const { iso, search: dateSearch } = getDateSearchStrings(dateObj);
        const methodSearch = getMethodSearchString(s.payment_method);

        return {
          id: s.id,
          ref: s.reference_number,
          amount: s.total_amount,
          method: s.payment_method,
          methodSearch,
          type: "retail",
          treatment: extractRetailItems(s),
          handlerId: s.created_by || "",
          handlerName: handlerName || "Store Staff",
          classification: classification || "walk-in",
          date: dateObj,
          dateISO: iso,
          dateSearch,
          status: s.status,
          customer: s.customers ? `${s.customers.first_name} ${s.customers.last_name}` : "Walk-in"
        };
      }),
      ...appointments.map(a => {
        let classification = a.client_classification;
        if (!classification && a.notes) {
          const m = a.notes.match(/\[Classification:([^\]]+)\]/i);
          if (m) classification = m[1];
        }

        let handlerId = a.handled_by || a.staff?.id || "";
        let handlerName = a.staff?.full_name || "";
        if (!handlerName && a.notes) {
          const m = a.notes.match(/\[HandledBy:([a-f0-9\-]+)\]/i);
          if (m) {
            handlerId = m[1];
            handlerName = staffMap.get(m[1]) || "";
          }
        }

        let dateObj: Date;
        if (a.appointment_date) {
          const parts = a.appointment_date.split("-").map(Number);
          let hours = 12;
          let minutes = 0;
          if (a.appointment_time) {
            const timeMatch = a.appointment_time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (timeMatch) {
              let h = parseInt(timeMatch[1], 10);
              const min = parseInt(timeMatch[2], 10);
              const meridian = timeMatch[3]?.toUpperCase();
              if (meridian === "PM" && h < 12) h += 12;
              if (meridian === "AM" && h === 12) h = 0;
              hours = h;
              minutes = min;
            }
          }
          dateObj = new Date(parts[0], parts[1] - 1, parts[2], hours, minutes);
        } else {
          dateObj = new Date(a.created_at);
        }
        const { iso, search: dateSearch } = getDateSearchStrings(dateObj);
        const methodSearch = getMethodSearchString(a.payment_method);

        return {
          id: a.id,
          ref: a.reference_number,
          amount: a.amount_due,
          method: a.payment_method,
          methodSearch,
          type: "appointment",
          treatment: extractAppointmentTreatments(a),
          handlerId: handlerId || "",
          handlerName: handlerName || "Unassigned",
          classification: classification || "walk-in",
          date: dateObj,
          dateISO: iso,
          dateSearch,
          status: a.payment_status,
          customer: a.customers ? `${a.customers.first_name} ${a.customers.last_name}` : "Unknown"
        };
      })
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sales, appointments, staffMap]);

  const [txList, setTxList] = useState(initialCombined);

  useEffect(() => {
    setTxList(initialCombined);
  }, [initialCombined]);

  const handleUpdateHandler = async (txId: string, staffId: string) => {
    setUpdatingHandlerId(txId);
    try {
      const res = await setAppointmentHandler(txId, staffId);
      if (res && "error" in res && res.error) {
        toast.error(res.error);
      } else {
        const assignedName = staffMap.get(staffId) || "Unassigned";
        toast.success(`Attending therapist updated to ${assignedName}.`);
        setTxList(prev => prev.map(item => {
          if (item.id === txId) {
            return { ...item, handlerId: staffId, handlerName: assignedName };
          }
          return item;
        }));
      }
    } catch {
      toast.error("Failed to update attending therapist.");
    } finally {
      setUpdatingHandlerId(null);
    }
  };

  const filtered = txList.filter(t => {
    // Filter by payment method dropdown
    if (selectedMethod !== "all") {
      const normMethod = (t.method || "").toLowerCase();
      if (selectedMethod === "card") {
        if (!normMethod.includes("card")) return false;
      } else if (selectedMethod === "cash") {
        if (normMethod !== "cash") return false;
      } else if (selectedMethod === "maya") {
        if (!normMethod.includes("maya")) return false;
      } else if (selectedMethod === "gcash") {
        if (!normMethod.includes("gcash")) return false;
      } else if (selectedMethod === "bank_transfer") {
        if (!normMethod.includes("bank") && !normMethod.includes("transfer")) return false;
      } else if (normMethod !== selectedMethod) {
        return false;
      }
    }

    // Filter by date picker
    if (selectedDate && t.dateISO !== selectedDate) {
      return false;
    }

    // Free-form search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchRef = t.ref?.toLowerCase().includes(q);
      const matchCustomer = t.customer?.toLowerCase().includes(q);
      const matchTreatment = t.treatment?.toLowerCase().includes(q);
      const matchHandler = t.handlerName?.toLowerCase().includes(q);
      const matchClass = t.classification?.toLowerCase().includes(q);
      const matchMethod = t.methodSearch?.includes(q) || t.method?.toLowerCase().includes(q);
      const matchDate = t.dateSearch?.includes(q);

      if (!matchRef && !matchCustomer && !matchTreatment && !matchHandler && !matchClass && !matchMethod && !matchDate) {
        return false;
      }
    }

    return true;
  });

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Transactions</h1>
          <p className="text-sm text-ink-soft mt-1">View, refund, or void sales and bookings.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {/* Text Search Bar (Ref, Customer, Treatment, Date, Method) */}
          <div className="relative w-full sm:w-64 md:w-72">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Search reference, customer, treatment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal w-full shadow-sm placeholder:text-ink-soft/60"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Quick Date Picker Filter */}
            <div className="relative flex items-center flex-1 sm:flex-initial">
              <Calendar size={14} className="absolute left-3 text-ink-soft pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-2 py-2 bg-white border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal shadow-sm cursor-pointer w-full sm:w-auto"
                title="Filter by exact date"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="ml-1 text-ink-soft hover:text-red-500 p-1 transition-colors"
                  title="Clear date filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Payment Method Dropdown Filter */}
            <div className="relative flex items-center flex-1 sm:flex-initial">
              <Filter size={13} className="absolute left-3 text-ink-soft pointer-events-none" />
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="pl-7 pr-3 py-2 bg-white border border-line rounded-xl text-xs font-medium text-ink focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal shadow-sm cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card / Credit Card</option>
                <option value="maya">Maya</option>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Reset All Filters Button */}
            {(searchTerm || selectedDate || selectedMethod !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDate("");
                  setSelectedMethod("all");
                }}
                className="px-2.5 py-2 text-xs font-medium text-ink-soft hover:text-ink hover:bg-pale border border-line rounded-xl transition-colors shadow-sm shrink-0"
                title="Reset all filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (< lg) */}
      <div className="space-y-3 lg:hidden">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-line p-8 text-center text-ink-soft">
            <ReceiptText size={32} className="mx-auto text-ink-soft/40 mb-2" />
            <p className="font-medium text-sm">No transactions found</p>
            <p className="text-xs text-ink-soft/70 mt-0.5">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border border-line p-4 shadow-xs space-y-3 transition-all ${
                t.status === "voided" ? "opacity-60 bg-pale/20" : ""
              }`}
            >
              {/* Header row: Ref & Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-ink bg-pale px-2 py-0.5 rounded border border-line">
                    {t.ref}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.status === "completed" || t.status === "paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : t.status === "voided"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-[10px] font-medium text-ink-soft bg-slate-100 px-2 py-0.5 rounded capitalize">
                    {t.type}
                  </span>
                </div>
                <div className="font-mono text-sm font-bold text-ink">
                  {peso(t.amount)}
                </div>
              </div>

              {/* Customer & Date */}
              <div className="border-t border-b border-line/60 py-2.5 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-medium text-ink">
                    <span>{t.customer}</span>
                    {getClassificationBadge(t.classification)}
                  </div>
                  <span className="text-ink-soft text-[11px]">
                    {t.date.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-ink-soft text-xs font-normal">
                  <span className="font-medium text-ink">Availed: </span>
                  <span className="text-ink">{t.treatment}</span>
                </div>
              </div>

              {/* Handled By Selector on Mobile */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] font-semibold text-ink-soft flex items-center gap-1">
                  <UserCheck size={13} className="text-purple-600" />
                  Staff:
                </span>
                {t.type === "appointment" ? (
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <select
                      value={t.handlerId || ""}
                      disabled={updatingHandlerId === t.id}
                      onChange={(e) => handleUpdateHandler(t.id, e.target.value)}
                      className={`rounded-lg border px-2 py-1 text-xs font-medium outline-none transition-all cursor-pointer max-w-[200px] truncate ${
                        t.handlerId
                          ? "border-purple-200 bg-purple-50/70 text-purple-900"
                          : "border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                    {updatingHandlerId === t.id && (
                      <Loader2 size={12} className="animate-spin text-purple-600 shrink-0" />
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-ink-soft font-medium">
                    {t.handlerName || "Store Staff"}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <span className="text-[11px] text-ink-soft capitalize bg-pale/70 px-2 py-0.5 rounded">
                  Method: {t.method}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`/admin/receipt/${t.ref}`, "_blank")}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink hover:bg-pale transition-colors touch-manipulation min-h-[36px]"
                    title="Print Receipt"
                  >
                    <Printer size={13} />
                    Receipt
                  </button>
                  {(t.status === "completed" || t.status === "paid") && (
                    <button
                      onClick={() => {
                        setVoidTarget({ id: t.id, type: t.type as any });
                        setVoidModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors touch-manipulation min-h-[36px]"
                    >
                      <Ban size={13} />
                      Void
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW (>= lg) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-pale text-ink-soft font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Treatment / Items</th>
                <th className="px-6 py-4">Handled By</th>
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
                  <td colSpan={10} className="px-6 py-8 text-center text-ink-soft">
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
                    <td className="px-6 py-4 text-ink">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{t.customer}</span>
                        {getClassificationBadge(t.classification)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink max-w-[280px]">
                      <div className="truncate font-medium text-ink" title={t.treatment}>
                        {t.treatment}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink">
                      {t.type === "appointment" ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={14} className={t.handlerId ? "text-purple-600 shrink-0" : "text-ink-soft/40 shrink-0"} />
                          <select
                            value={t.handlerId || ""}
                            disabled={updatingHandlerId === t.id}
                            onChange={(e) => handleUpdateHandler(t.id, e.target.value)}
                            className={`rounded-lg border px-2 py-1 text-xs font-medium outline-none transition-all cursor-pointer max-w-[170px] truncate ${
                              t.handlerId
                                ? "border-purple-200 bg-purple-50/70 text-purple-900 focus:border-purple-400 focus:bg-white"
                                : "border-amber-300 bg-amber-50 text-amber-800 focus:border-amber-500 focus:bg-white"
                            }`}
                            title={t.handlerName ? `Handled by: ${t.handlerName}` : "Unassigned - Click to assign therapist"}
                          >
                            <option value="">Unassigned</option>
                            {staffList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.full_name}
                              </option>
                            ))}
                          </select>
                          {updatingHandlerId === t.id && (
                            <Loader2 size={12} className="animate-spin text-purple-600 shrink-0" />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-ink-soft flex items-center gap-1.5">
                          <User size={13} className="text-ink-soft/50 shrink-0" />
                          <span className="truncate max-w-[150px]">{t.handlerName || "Store Staff"}</span>
                        </span>
                      )}
                    </td>
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
