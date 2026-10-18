// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Recurring Bill Template Modal (Weekly, Monthly, Quarterly, Annual Schedules)
// ==============================================================================

"use client";

import { useState } from "react";
import {
  X,
  Repeat,
  RefreshCw,
} from "lucide-react";
import {
  RecurringBillTemplate,
  RecurringTemplateFormData,
  RecurrenceFrequency,
  ReminderStage,
  PaymentMethod,
} from "@/app/admin/(dashboard)/bills/types";
import { ExpenseCategory } from "@/app/admin/(dashboard)/expenses/types";
import {
  createRecurringTemplate,
  updateRecurringTemplate,
} from "@/app/admin/(dashboard)/bills/actions";
import { roundCurrency } from "@/lib/bills/bill-calculator";
import toast from "react-hot-toast";

interface RecurringTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  branches: { id: string; name: string }[];
  staffList: { id: string; full_name: string }[];
  currentStaffBranchId?: string | null;
  currentStaffId?: string;
  isSuperAdmin?: boolean;
  templateToEdit?: RecurringBillTemplate | null;
  onSuccess?: () => void;
}

const DEFAULT_STAGES: ReminderStage[] = [
  "7_days",
  "3_days",
  "1_day",
  "due_date",
  "overdue",
];

export function RecurringTemplateModal({
  isOpen,
  onClose,
  categories,
  branches,
  staffList,
  currentStaffBranchId,
  currentStaffId,
  isSuperAdmin = false,
  templateToEdit,
  onSuccess,
}: RecurringTemplateModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [templateName, setTemplateName] = useState(templateToEdit?.template_name || "");
  const [categoryId, setCategoryId] = useState(templateToEdit?.category_id || categories[0]?.id || "");
  const [vendorOrPayee, setVendorOrPayee] = useState(templateToEdit?.vendor_or_payee || "");
  const defaultBranch = !isSuperAdmin && currentStaffBranchId ? currentStaffBranchId : templateToEdit?.branch_id || branches[0]?.id || "";
  const [branchId, setBranchId] = useState(defaultBranch);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(templateToEdit?.frequency || "monthly");
  const [customDays, setCustomDays] = useState<number | "">(templateToEdit?.custom_interval_days || 30);
  const [defaultAmount, setDefaultAmount] = useState<number | "">(templateToEdit?.default_amount || "");
  const [taxAmount, setTaxAmount] = useState<number | "">(templateToEdit?.tax_amount || 0);
  const [dueDateRule, setDueDateRule] = useState<"day_of_month" | "days_after_billing">(
    templateToEdit?.due_date_rule || "day_of_month"
  );
  const [dueDayOffset, setDueDayOffset] = useState<number>(templateToEdit?.due_day_offset || 15);
  const [startDate, setStartDate] = useState(templateToEdit?.start_date || todayStr);
  const [nextBillingDate, setNextBillingDate] = useState(templateToEdit?.next_billing_date || todayStr);
  const [endDate, setEndDate] = useState(templateToEdit?.end_date || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (templateToEdit?.payment_method as PaymentMethod) || "bank_transfer"
  );
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState(
    templateToEdit?.responsible_employee_id || currentStaffId || ""
  );
  const [reminderStages, setReminderStages] = useState<ReminderStage[]>(
    templateToEdit?.reminder_schedule?.stages || DEFAULT_STAGES
  );
  const [notes, setNotes] = useState(templateToEdit?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const numDefault = roundCurrency(Number(defaultAmount) || 0);
  const numTax = roundCurrency(Number(taxAmount) || 0);
  const numTotal = roundCurrency(numDefault + numTax);

  const toggleStage = (st: ReminderStage) => {
    if (reminderStages.includes(st)) {
      setReminderStages(reminderStages.filter((s) => s !== st));
    } else {
      setReminderStages([...reminderStages, st]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateName.trim()) {
      toast.error("Please enter template name");
      return;
    }
    if (!vendorOrPayee.trim()) {
      toast.error("Please enter vendor / provider");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!nextBillingDate) {
      toast.error("Next billing date is required");
      return;
    }
    if (numTotal <= 0) {
      toast.error("Default bill amount must be greater than ₱0.00");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RecurringTemplateFormData = {
        template_name: templateName.trim(),
        category_id: categoryId,
        vendor_or_payee: vendorOrPayee.trim(),
        branch_id: branchId || null,
        frequency,
        custom_interval_days: frequency === "custom" ? Number(customDays) || 30 : undefined,
        default_amount: numDefault,
        tax_amount: numTax,
        due_date_rule: dueDateRule,
        due_day_offset: dueDayOffset,
        start_date: startDate,
        next_billing_date: nextBillingDate,
        end_date: endDate || undefined,
        payment_method: paymentMethod,
        responsible_employee_id: responsibleEmployeeId || null,
        reminder_stages: reminderStages,
        notes: notes.trim() || undefined,
      };

      let res;
      if (templateToEdit) {
        res = await updateRecurringTemplate(templateToEdit.id, payload);
      } else {
        res = await createRecurringTemplate(payload);
      }

      if (res.success) {
        toast.success(
          templateToEdit
            ? "Recurring schedule updated!"
            : "Recurring template created successfully!"
        );
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Operation failed");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">
                {templateToEdit ? "Edit Recurring Bill Template" : "Add Recurring Bill Schedule"}
              </h2>
              <p className="text-xs text-slate-500">
                Automate recurring utility bills, lease contracts, and software subscriptions safely.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Schedule / Bill Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Monthly Clinic Lease - Davao"
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vendor / Provider <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={vendorOrPayee}
                onChange={(e) => setVendorOrPayee(e.target.value)}
                placeholder="e.g. PLDT Enterprise, Landlord Inc."
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Branch <span className="text-rose-500">*</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={!isSuperAdmin && !!currentStaffBranchId}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency & Interval */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Recurrence Frequency <span className="text-rose-500">*</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="weekly">Weekly (Every 7 Days)</option>
                <option value="monthly">Monthly (Every Month)</option>
                <option value="quarterly">Quarterly (Every 3 Months)</option>
                <option value="semi_annually">Semi-Annually (Every 6 Months)</option>
                <option value="annually">Annually (Every 1 Year)</option>
                <option value="custom">Custom Interval</option>
              </select>
            </div>

            {frequency === "custom" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Interval Days <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 14 or 45"
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Due Date Rule
              </label>
              <select
                value={dueDateRule}
                onChange={(e) => setDueDateRule(e.target.value as "day_of_month" | "days_after_billing")}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="day_of_month">Fixed Day of Month (e.g. Due on the 15th)</option>
                <option value="days_after_billing">Days After Billing Cycle (e.g. 15 Days after cycle)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {dueDateRule === "day_of_month" ? "Day of Month (1 - 28)" : "Days After Cycle"}
              </label>
              <input
                type="number"
                min="1"
                max={dueDateRule === "day_of_month" ? 28 : 90}
                value={dueDayOffset}
                onChange={(e) => setDueDayOffset(Number(e.target.value) || 15)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-purple-200/60 bg-purple-50/30">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Default Amount (excl. Tax)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                required
                className="w-full h-10 px-3 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Tax / VAT (if applicable)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full h-10 px-3 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-900 mb-1">
                Total Per Cycle
              </label>
              <div className="h-10 px-3 flex items-center justify-between rounded-xl border border-purple-300 bg-white text-purple-900 font-mono font-bold text-sm">
                <span>₱</span>
                <span>{numTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Cycle Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Next Billing Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 font-bold text-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Optional End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Responsible Employee & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Responsible Employee
              </label>
              <select
                value={responsibleEmployeeId}
                onChange={(e) => setResponsibleEmployeeId(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">Unassigned (Branch Manager)</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="bank_transfer">Bank Transfer / Online Wire</option>
                <option value="check">Company Check</option>
                <option value="cashier_drawer">Cashier Drawer Float</option>
                <option value="petty_cash">Petty Cash Fund</option>
                <option value="gcash">GCash Enterprise</option>
                <option value="maya">Maya / PayMaya</option>
                <option value="credit_card">Corporate Credit Card</option>
              </select>
            </div>
          </div>

          {/* Reminder Stages */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Default Reminder Schedule for Generated Bills
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { stage: "7_days" as ReminderStage, label: "7 days before" },
                { stage: "3_days" as ReminderStage, label: "3 days before" },
                { stage: "1_day" as ReminderStage, label: "1 day before" },
                { stage: "due_date" as ReminderStage, label: "Due date" },
                { stage: "overdue" as ReminderStage, label: "Overdue" },
              ].map((item) => (
                <label key={item.stage} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderStages.includes(item.stage)}
                    onChange={() => toggleStage(item.stage)}
                    className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Template Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Account No. 0021-9942, Contact person Mr. Tan"
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Repeat className="w-4 h-4" />
                  {templateToEdit ? "Update Schedule" : "Save Recurring Template"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
