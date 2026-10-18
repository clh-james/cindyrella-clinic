// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Bill Reminder Policy & Notification Settings Modal
// ==============================================================================

"use client";

import { useState } from "react";
import {
  X,
  Settings,
  Bell,
  Mail,
  Smartphone,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  BillReminderSettings,
  ReminderStage,
} from "@/app/admin/(dashboard)/bills/types";
import { updateReminderSettings } from "@/app/admin/(dashboard)/bills/actions";
import toast from "react-hot-toast";

interface BillReminderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings?: BillReminderSettings | null;
  branches: { id: string; name: string }[];
  isSuperAdmin?: boolean;
  onSuccess?: () => void;
}

export function BillReminderSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  branches,
  isSuperAdmin = false,
  onSuccess,
}: BillReminderSettingsModalProps) {
  const [stages, setStages] = useState<Record<ReminderStage, boolean>>({
    "7_days": currentSettings?.stages_enabled?.["7_days"] !== false,
    "3_days": currentSettings?.stages_enabled?.["3_days"] !== false,
    "1_day": currentSettings?.stages_enabled?.["1_day"] !== false,
    due_date: currentSettings?.stages_enabled?.due_date !== false,
    overdue: currentSettings?.stages_enabled?.overdue !== false,
  });

  const [overdueDays, setOverdueDays] = useState<number>(
    currentSettings?.overdue_frequency_days || 3
  );
  const [inAppEnabled, setInAppEnabled] = useState(
    currentSettings?.in_app_enabled !== false
  );
  const [emailEnabled, setEmailEnabled] = useState(
    currentSettings?.email_enabled !== false
  );
  const [smsEnabled, setSmsEnabled] = useState(
    !!currentSettings?.sms_enabled
  );
  const [notifyManagers, setNotifyManagers] = useState(
    currentSettings?.notify_branch_managers !== false
  );
  const [notifySuperAdmins, setNotifySuperAdmins] = useState(
    currentSettings?.notify_super_admins !== false
  );
  const [targetBranchId, setTargetBranchId] = useState<string>(
    currentSettings?.branch_id || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleStage = (st: ReminderStage) => {
    setStages((prev) => ({ ...prev, [st]: !prev[st] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await updateReminderSettings({
        branch_id: targetBranchId || null,
        stages_enabled: stages,
        overdue_frequency_days: overdueDays,
        in_app_enabled: inAppEnabled,
        email_enabled: emailEnabled,
        sms_enabled: smsEnabled,
        notify_branch_managers: notifyManagers,
        notify_super_admins: notifySuperAdmins,
      });

      if (res.success) {
        toast.success("Reminder automation policies saved!");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Failed to save settings");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Reminder Automation Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure reminder stages, overdue follow-up policies, and delivery channels.
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
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Branch scope selector (Super Admin only) */}
          {isSuperAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Configuration Scope
              </label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Company-Wide (All Branches Default)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Branch Specific: {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Reminder Stages */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Active Reminder Stages
            </span>
            <div className="space-y-2">
              {[
                { stage: "7_days" as ReminderStage, label: "7 days before due date" },
                { stage: "3_days" as ReminderStage, label: "3 days before due date" },
                { stage: "1_day" as ReminderStage, label: "1 day before due date" },
                { stage: "due_date" as ReminderStage, label: "On the due date" },
                { stage: "overdue" as ReminderStage, label: "Overdue bills follow-up" },
              ].map((item) => (
                <label key={item.stage} className="flex items-center justify-between text-xs cursor-pointer p-1.5 rounded hover:bg-white transition-colors">
                  <span className="text-slate-700 font-medium">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={stages[item.stage]}
                    onChange={() => toggleStage(item.stage)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Overdue Frequency */}
          {stages.overdue && (
            <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  Overdue Follow-Up Frequency
                </span>
                <span className="text-[11px] text-amber-700">
                  How often to re-send notices while a bill remains unpaid.
                </span>
              </div>
              <select
                value={overdueDays}
                onChange={(e) => setOverdueDays(Number(e.target.value) || 3)}
                className="h-9 px-2.5 text-xs font-bold rounded-lg border border-amber-300 bg-white text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value={1}>Every 1 Day (Daily)</option>
                <option value={2}>Every 2 Days</option>
                <option value={3}>Every 3 Days (Recommended)</option>
                <option value={5}>Every 5 Days</option>
                <option value={7}>Every 7 Days (Weekly)</option>
              </select>
            </div>
          )}

          {/* Delivery Channels */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Delivery Channels
            </span>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs cursor-pointer p-1.5 rounded hover:bg-white">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-800">In-App Staff Notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={inAppEnabled}
                  onChange={(e) => setInAppEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer p-1.5 rounded hover:bg-white">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-semibold text-slate-800 block">Email Delivery (Resend)</span>
                    <span className="text-[10px] text-slate-400">Sends formatted reminder emails to authorized staff</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer p-1.5 rounded hover:bg-white">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-semibold text-slate-800 block">SMS Notifications (Twilio)</span>
                    <span className="text-[10px] text-slate-400">Requires configured Twilio account</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
              </label>
            </div>
          </div>

          {/* Escalation Targets */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Recipient Escalation Policy
            </span>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={notifyManagers}
                onChange={(e) => setNotifyManagers(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-slate-700">
                Always notify Branch Managers for bills within their branch
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={notifySuperAdmins}
                onChange={(e) => setNotifySuperAdmins(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-slate-700">
                Escalate overdue bills and bills due today to Super Admins
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Reminder Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
