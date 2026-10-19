/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { 
  ShieldCheck, Calendar, Lock, User, Building2, Eye, EyeOff, 
  Loader2, CheckCircle2, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { changeStaffPasswordAction } from "@/app/admin/actions";
import { BlockDateForm } from "@/components/admin/BlockDateForm";
import { RemoveBlockedDate } from "@/components/admin/RemoveBlockedDate";

interface SettingsClientProps {
  currentStaff: any;
  userEmail: string;
  branches: any[];
  blockedDates: any[];
  branchSettings: any[];
}

export function SettingsClient({
  currentStaff,
  userEmail,
  branches,
  blockedDates,
  branchSettings,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"security" | "schedule">("security");

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password strength
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strength = getStrength(newPassword);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const strengthColors = ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);
    try {
      const res = await changeStaffPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!res.ok) {
        setError(res.error || "Failed to update password.");
      } else {
        setSuccess(res.message || "Your password has been changed successfully!");
        toast.success("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const roleName = currentStaff?.roles?.name || "Staff Member";
  const branchName = currentStaff?.branches?.name || "All Branches";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">Account & Clinic Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Manage your personal credentials, password security, and clinic schedule settings.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-line flex items-center gap-2">
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === "security"
              ? "border-royal text-royal font-bold"
              : "border-transparent text-ink-soft hover:text-ink hover:border-line"
          }`}
        >
          <Lock size={16} /> My Account & Password
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
            activeTab === "schedule"
              ? "border-royal text-royal font-bold"
              : "border-transparent text-ink-soft hover:text-ink hover:border-line"
          }`}
        >
          <Calendar size={16} /> Clinic Schedule & Bookings
        </button>
      </div>

      {/* TAB 1: MY ACCOUNT & PASSWORD */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Profile Overview Card */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} className="text-royal" /> Staff Profile Details
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-pale/60 rounded-xl border border-line/60">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-royal to-royal-deep text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  {(currentStaff?.full_name || "S").charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-ink text-base">{currentStaff?.full_name || "Staff Member"}</h3>
                  <p className="text-xs text-ink-soft mt-0.5">{userEmail}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-royal/10 text-royal px-2.5 py-0.5 rounded-full border border-royal/20">
                      {roleName}
                    </span>
                    <span className="text-[10px] font-medium text-ink-soft flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-line">
                      <Building2 size={11} /> {branchName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-royal/10 text-royal rounded-xl">
                <Lock size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink">Change Account Password</h2>
                <p className="text-xs text-ink-soft">
                  Update your credentials regularly to protect clinic records and patient privacy.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="max-w-lg space-y-4 pt-2">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    disabled={loading}
                    className="w-full text-sm bg-pale border border-line rounded-xl px-3.5 py-2.5 pr-10 text-ink focus:outline-none focus:ring-2 focus:ring-royal/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter minimum 8 characters"
                    required
                    disabled={loading}
                    className="w-full text-sm bg-pale border border-line rounded-xl px-3.5 py-2.5 pr-10 text-ink focus:outline-none focus:ring-2 focus:ring-royal/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength Meter */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-ink-soft">
                      <span>Strength: {strengthLabels[Math.min(strength, 4)]}</span>
                      <span>{newPassword.length} characters</span>
                    </div>
                    <div className="h-1.5 w-full bg-line/50 rounded-full overflow-hidden flex gap-1">
                      {[0, 1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-full flex-1 transition-all duration-300 ${
                            strength > level ? strengthColors[Math.min(strength - 1, 4)] : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    disabled={loading}
                    className={`w-full text-sm bg-pale border rounded-xl px-3.5 py-2.5 pr-10 text-ink focus:outline-none focus:ring-2 ${
                      confirmPassword && confirmPassword === newPassword
                        ? "border-emerald-500 focus:ring-emerald-200"
                        : confirmPassword && confirmPassword !== newPassword
                        ? "border-rose-400 focus:ring-rose-200"
                        : "border-line focus:ring-royal/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 size={12} /> Passwords match
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  className="px-6 py-2.5 bg-royal text-white rounded-xl text-xs font-bold hover:bg-royal/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: CLINIC SCHEDULE & BOOKING SETTINGS */}
      {activeTab === "schedule" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <section className="bg-white rounded-2xl border border-line p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Blocked Dates & Holidays</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Block holidays, facility maintenance, or closed clinic dates per branch.
            </p>
            <div className="mt-4">
              <BlockDateForm branches={branches ?? []} />
            </div>

            <ul className="mt-6 divide-y divide-line">
              {(blockedDates ?? []).length === 0 && (
                <li className="py-3 text-sm text-ink-soft">No blocked dates yet.</li>
              )}
              {(blockedDates ?? []).map((b) => {
                const branch = b.branches as unknown as { name: string } | null;
                return (
                  <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <span className="font-medium text-ink">{b.blocked_date}</span>
                      <span className="ml-2 text-ink-soft">
                        {branch?.name ?? "All branches"}
                        {b.reason ? ` · ${b.reason}` : ""}
                      </span>
                    </div>
                    <RemoveBlockedDate id={b.id} />
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-line p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Bookings Per Time Slot Capacity</h2>
            <p className="mt-1 text-xs text-ink-soft">
              Maximum concurrent clients that can be scheduled into the same time slot at each branch.
            </p>
            <ul className="mt-4 divide-y divide-line">
              {(branchSettings ?? []).map((s) => {
                const branch = s.branches as unknown as { name: string } | null;
                return (
                  <li key={s.branch_id} className="flex items-center justify-between py-3 text-sm">
                    <span className="text-ink font-medium">{branch?.name}</span>
                    <span className="font-bold text-royal">{s.max_bookings_per_slot} clients / slot</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
