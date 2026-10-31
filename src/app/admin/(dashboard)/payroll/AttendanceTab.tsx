"use client";

import { useState } from "react";
import {
  Clock,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { AttendanceRecord, BranchInfo, StaffBasic } from "./types";
import { approveOvertime } from "./actions";
import { OVERTIME_LABELS, OvertimeType } from "@/lib/payroll/philippine-tax";
import { exportAttendanceReportExcel } from "@/lib/payroll/export-helpers";
import toast from "react-hot-toast";

interface AttendanceTabProps {
  attendance: AttendanceRecord[];
  branches: BranchInfo[];
  staffList?: StaffBasic[];
  onOpenLogModal: (record?: AttendanceRecord | null) => void;
  onRefresh: () => void;
}

export function AttendanceTab({
  attendance,
  branches,
  onOpenLogModal,
  onRefresh,
}: AttendanceTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [otFilter, setOtFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const filteredAttendance = attendance.filter((a) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const nameMatch = a.staff?.full_name?.toLowerCase().includes(q);
      const notesMatch = a.notes?.toLowerCase().includes(q);
      if (!nameMatch && !notesMatch) return false;
    }

    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (otFilter !== "all" && a.overtime_status !== otFilter) return false;
    if (branchFilter !== "all" && a.branch_id !== branchFilter) return false;

    return true;
  });

  // Pending OT requests
  const pendingOTCount = attendance.filter((a) => a.overtime_status === "pending").length;

  const handleApproveOT = async (id: string, isApproved: boolean) => {
    try {
      const res = await approveOvertime(id, isApproved);
      if (!res.success) {
        toast.error(res.error || "Failed to update overtime");
      } else {
        toast.success(isApproved ? "Overtime approved!" : "Overtime request rejected.");
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to process overtime");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-ink">Attendance & Overtime Ledger</h2>
          <p className="text-xs text-ink-soft">
            Verified shift hours, late arrivals, undertime deductions, and DOLE overtime authorizations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAttendanceReportExcel(filteredAttendance)}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-pale shadow-2xs"
          >
            <Download size={14} /> Export Logs
          </button>
          <button
            onClick={() => onOpenLogModal(null)}
            className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 transition-colors"
          >
            <Plus size={14} /> Log Attendance / OT
          </button>
        </div>
      </div>

      {/* Pending Overtime Alert Bar */}
      {pendingOTCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Clock size={18} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-amber-900">
                {pendingOTCount} Overtime Claim{pendingOTCount > 1 ? "s" : ""} Awaiting Review
              </h4>
              <p className="text-[11px] text-amber-700">
                Review and approve valid clinic duty hours before finalizing the payroll calculation.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOtFilter("pending")}
            className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
          >
            Filter Pending OT
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff name..."
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          />
        </div>

        <div>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Shift Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="on_leave">On Leave</option>
            <option value="rest_day">Rest Day</option>
            <option value="holiday">Holiday</option>
          </select>
        </div>

        <div>
          <select
            value={otFilter}
            onChange={(e) => setOtFilter(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Overtime States</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved Overtime</option>
            <option value="rejected">Rejected Overtime</option>
            <option value="none">No Overtime</option>
          </select>
        </div>
      </div>

      {/* Main Attendance Table */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pale/50 border-b border-line text-ink-soft uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Date & Employee</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 font-mono">Rendered Hours</th>
                <th className="py-3 px-3 font-mono">Late / Undertime</th>
                <th className="py-3 px-3">Overtime Request</th>
                <th className="py-3 px-3">OT Status</th>
                <th className="py-3 px-3">Notes & Reason</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredAttendance.map((a) => {
                const isLateOrUndertime = a.late_minutes > 0 || a.undertime_minutes > 0;

                return (
                  <tr key={a.id} className="hover:bg-pale/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-ink">
                      <div className="font-bold text-xs text-ink">
                        {a.staff?.full_name || "Employee"}
                      </div>
                      <div className="text-[11px] font-mono text-ink-soft">
                        {a.work_date}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          a.status === "present"
                            ? "bg-emerald-50 text-emerald-700"
                            : a.status === "on_leave"
                            ? "bg-blue-50 text-blue-700"
                            : a.status === "absent"
                            ? "bg-red-50 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {a.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-ink">
                      {a.hours_worked} hrs
                    </td>

                    <td className="py-3.5 px-3 font-mono">
                      {isLateOrUndertime ? (
                        <div className="text-red-600 font-semibold text-[11px]">
                          {a.late_minutes > 0 && (
                            <span>
                              +{a.late_minutes}m late{" "}
                              <span className="text-[10px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                -₱{(a.late_minutes * 10).toLocaleString()}
                              </span>{" "}
                            </span>
                          )}
                          {a.undertime_minutes > 0 && <span>+{a.undertime_minutes}m UT</span>}
                        </div>
                      ) : (
                        <span className="text-emerald-600 text-[11px]">On time</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {a.overtime_hours > 0 ? (
                        <div>
                          <span className="font-mono font-bold text-royal">
                            {a.overtime_hours} hrs
                          </span>
                          <span className="block text-[10px] text-ink-soft truncate max-w-[140px]">
                            {OVERTIME_LABELS[a.overtime_type as OvertimeType] || a.overtime_type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {a.overtime_hours > 0 && (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            a.overtime_status === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : a.overtime_status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {a.overtime_status}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-[11px] text-ink-soft max-w-[180px] truncate">
                      {a.notes || (a.is_approved_leave ? "Approved Paid Leave" : "—")}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {a.overtime_status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveOT(a.id, true)}
                            title="Approve Overtime"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={() => handleApproveOT(a.id, false)}
                            title="Reject Overtime"
                            className="rounded-lg bg-red-50 p-1.5 text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenLogModal(a)}
                          className="rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold text-royal hover:bg-pale"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-ink-soft">
                    <Clock size={28} className="mx-auto mb-2 text-ink-soft/40" />
                    No attendance records found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
