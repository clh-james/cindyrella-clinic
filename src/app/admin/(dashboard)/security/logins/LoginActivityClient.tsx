// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Staff System Login & Authentication Activity Client Component
// ==============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  Search,
  Activity,
  LogOut,
  XCircle,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  Download,
  Calendar,
  Building2,
  Filter,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { exportStaffLoginActivityExcel } from "@/lib/attendance/attendance-export";
import toast from "react-hot-toast";

export function LoginActivityClient({
  initialSessions,
  staff,
  branches,
}: {
  initialSessions: any[];
  staff: any[];
  branches: any[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const getStaff = (userId: string) => {
    return (
      staff.find((st) => st.id === userId) || {
        full_name: "System / External",
        role: "Unknown",
        roles: { name: "User" },
      }
    );
  };

  const getBranchName = (branchId: string) => {
    if (!branchId) return "Company-Wide / Global";
    const b = branches.find((br) => br.id === branchId);
    return b ? b.name : "Unassigned Branch";
  };

  // Deduplicate sessions by user and key if identical
  const deduplicatedSessions = Array.from(
    initialSessions
      .reduce((acc, session) => {
        const timeKey = session.login_at ? new Date(session.login_at).toISOString().substring(0, 10) : "";
        const key = `${session.user_id}-${session.device_type}-${session.operating_system}-${session.browser}-${timeKey}-${session.id}`;
        if (!acc.has(key)) {
          acc.set(key, session);
        }
        return acc;
      }, new Map())
      .values() as IterableIterator<any>
  );

  const filteredSessions = deduplicatedSessions.filter((session) => {
    const s = getStaff(session.user_id);
    const searchMatch =
      !searchTerm ||
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.ip_address?.includes(searchTerm) ||
      session.browser?.toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch =
      statusFilter === "All" ||
      (statusFilter === "ACTIVE" && session.status === "ACTIVE") ||
      (statusFilter === "LOGGED_OUT" && session.status === "LOGGED_OUT") ||
      (statusFilter === "EXPIRED" &&
        (session.status === "SESSION_EXPIRED" || session.logout_reason?.includes("INACTIVITY") || session.logout_reason?.includes("TIMEOUT")));

    const branchMatch = branchFilter === "all" || session.branch_id === branchFilter;
    const staffMatch = staffFilter === "all" || session.user_id === staffFilter;

    let dateMatch = true;
    if (fromDate && session.login_at) {
      dateMatch = dateMatch && session.login_at >= `${fromDate}T00:00:00Z`;
    }
    if (toDate && session.login_at) {
      dateMatch = dateMatch && session.login_at <= `${toDate}T23:59:59Z`;
    }

    return searchMatch && statusMatch && branchMatch && staffMatch && dateMatch;
  });

  const totalLogins = deduplicatedSessions.length;
  const activeUsers = deduplicatedSessions.filter((s) => s.status === "ACTIVE").length;
  const loggedOut = deduplicatedSessions.filter((s) => s.status === "LOGGED_OUT").length;
  const expiredSessions = deduplicatedSessions.filter(
    (s) => s.status === "SESSION_EXPIRED" || s.logout_reason?.includes("INACTIVITY")
  ).length;

  const totalPages = Math.ceil(filteredSessions.length / pageSize) || 1;
  const paginatedSessions = filteredSessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getDeviceIcon = (device: string) => {
    if (!device) return <Monitor size={16} />;
    const d = device.toLowerCase();
    if (d.includes("mobile") || d.includes("phone")) return <Smartphone size={16} />;
    if (d.includes("tablet") || d.includes("ipad")) return <Tablet size={16} />;
    return <Monitor size={16} />;
  };

  const handleExportExcel = async () => {
    try {
      const mapped = filteredSessions.map((s) => ({
        id: s.id,
        user_id: s.user_id,
        employee_name: getStaff(s.user_id).full_name,
        branch_name: getBranchName(s.branch_id),
        login_at: s.login_at,
        logout_at: s.logout_at,
        duration_seconds: s.duration_seconds,
        status: s.status,
        logout_reason: s.logout_reason,
        auth_result: "SUCCESS" as const,
        ip_address: s.ip_address,
        device_type: s.device_type,
        device_name: s.device_name,
        browser: s.browser,
        operating_system: s.operating_system,
      }));

      const blob = await exportStaffLoginActivityExcel(mapped);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cindyrella_Staff_Login_Activity_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Login activity report exported to Excel!");
    } catch {
      toast.error("Failed to export Excel report.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Staff System Login Activity</h1>
          <p className="text-xs text-ink-soft mt-1">
            Audit system authentications, active sessions, and client devices (separate from attendance)
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink hover:bg-pale shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Download size={14} className="text-royal" /> Export Audit Log
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-line shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-ink-soft">Recorded Logins</p>
            <p className="text-2xl font-bold text-ink font-mono">{totalLogins}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-line shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Monitor size={24} />
          </div>
          <div>
            <p className="text-xs text-ink-soft">Active Sessions</p>
            <p className="text-2xl font-bold text-ink font-mono">{activeUsers}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-line shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <LogOut size={24} />
          </div>
          <div>
            <p className="text-xs text-ink-soft">Explicit Logouts</p>
            <p className="text-2xl font-bold text-ink font-mono">{loggedOut}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-line shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-ink-soft">Session Timeouts</p>
            <p className="text-2xl font-bold text-ink font-mono">{expiredSessions}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-line shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-1.5 bg-pale/50 px-3 py-1.5 rounded-xl border border-line">
            <Calendar size={13} className="text-ink-soft" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-ink focus:outline-none"
              placeholder="From"
            />
            <span className="text-ink-soft">&mdash;</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-ink focus:outline-none"
              placeholder="To"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-pale/50 px-3 py-1.5 rounded-xl border border-line">
            <Building2 size={13} className="text-ink-soft" />
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-ink focus:outline-none"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div className="flex items-center gap-1.5 bg-pale/50 px-3 py-1.5 rounded-xl border border-line">
            <User size={13} className="text-ink-soft" />
            <select
              value={staffFilter}
              onChange={(e) => {
                setStaffFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-ink focus:outline-none max-w-[160px]"
            >
              <option value="all">All Staff Members</option>
              {staff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-pale/50 px-3 py-1.5 rounded-xl border border-line">
            <Filter size={13} className="text-ink-soft" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-ink focus:outline-none"
            >
              <option value="All">All Session Statuses</option>
              <option value="ACTIVE">Currently Active</option>
              <option value="LOGGED_OUT">Explicitly Logged Out</option>
              <option value="EXPIRED">Session Timeout / Inactive</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search User, IP, or Browser..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-royal"
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-3xl border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-pale/70 text-ink-soft font-semibold border-b border-line">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-5 py-3.5">Branch Context</th>
                <th className="px-5 py-3.5">Login Date & Time</th>
                <th className="px-5 py-3.5">Logout Time</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Device & IP</th>
                <th className="px-5 py-3.5">Status & Termination Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {paginatedSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-ink-soft">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} className="text-ink-soft/40" />
                      <p>No login activity matched your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((session) => {
                  const staffInfo = getStaff(session.user_id);
                  const roleName = staffInfo.roles?.name || "Clinic Staff";
                  const durationMins = session.duration_seconds
                    ? Math.round(session.duration_seconds / 60)
                    : null;

                  return (
                    <tr key={session.id} className="hover:bg-pale/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-royal/10 text-royal flex items-center justify-center font-bold text-xs shrink-0">
                            {staffInfo.full_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-bold text-ink">{staffInfo.full_name}</p>
                            <p className="text-[10px] uppercase text-ink-soft font-mono">
                              ID: {session.user_id?.slice(0, 8)} &bull; {roleName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-ink">{getBranchName(session.branch_id)}</td>
                      <td className="px-5 py-3.5 text-ink font-mono">
                        <p className="font-semibold">
                          {new Date(session.login_at).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[10px] text-ink-soft">
                          {new Date(session.login_at).toLocaleTimeString("en-PH", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-ink font-mono">
                        {session.logout_at ? (
                          <>
                            <p className="font-semibold">
                              {new Date(session.logout_at).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-[10px] text-ink-soft">
                              {new Date(session.logout_at).toLocaleTimeString("en-PH", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </>
                        ) : (
                          <span className="text-ink-soft italic">Active / Not Logged Out</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-ink">
                        {durationMins !== null ? `${durationMins} mins` : "--"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-ink">
                          {getDeviceIcon(session.device_type)}
                          <div>
                            <p className="text-xs font-medium">
                              {session.browser || "Browser"} &bull; {session.operating_system || "OS"}
                            </p>
                            <p className="text-[10px] font-mono text-ink-soft">{session.ip_address || "Local"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              session.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : session.logout_reason === "AUTO_LOGOUT_INACTIVITY" || session.logout_reason === "SESSION_TIMEOUT"
                                ? "bg-amber-100 text-amber-800"
                                : session.status === "LOGGED_OUT"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {session.status === "ACTIVE"
                              ? "ACTIVE"
                              : session.logout_reason === "AUTO_LOGOUT_INACTIVITY"
                              ? "INACTIVE TIMEOUT"
                              : session.status}
                          </span>
                          {session.logout_reason && session.logout_reason !== "AUTO_LOGOUT_INACTIVITY" && (
                            <span className="text-[10px] text-ink-soft">({session.logout_reason})</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 bg-pale/30 border-t border-line flex items-center justify-between text-xs text-ink-soft">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} &mdash;{" "}
              {Math.min(currentPage * pageSize, filteredSessions.length)} of {filteredSessions.length} sessions
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-line bg-white hover:bg-pale disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-mono font-bold text-ink">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-line bg-white hover:bg-pale disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
