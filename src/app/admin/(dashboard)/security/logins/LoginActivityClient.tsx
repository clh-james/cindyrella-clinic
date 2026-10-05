/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Search, Activity, LogOut, XCircle, AlertTriangle, Monitor, Smartphone, Tablet } from "lucide-react";

export function LoginActivityClient({ initialSessions, staff, branches }: { initialSessions: any[], staff: any[], branches: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const getStaff = (userId: string) => {
    return staff.find(st => st.id === userId) || { full_name: "Unknown", role: "Unknown", roles: { name: "Unknown" } };
  };

  const getBranchName = (branchId: string) => {
    if (!branchId) return "Global";
    const b = branches.find(br => br.id === branchId);
    return b ? b.name : "Unknown";
  };

  const deduplicatedSessions = Array.from(new Map(initialSessions.map(session => {
    const timeKey = session.login_at ? new Date(session.login_at).toISOString().substring(0, 16) : '';
    return [
      `${session.user_id}-${session.device_type}-${session.operating_system}-${session.browser}-${timeKey}`, 
      session
    ];
  })).values());

  const filteredSessions = deduplicatedSessions.filter(session => {
    const s = getStaff(session.user_id);
    const searchMatch = !searchTerm || 
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.ip_address?.includes(searchTerm);
      
    const statusMatch = statusFilter === "All" || session.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  const getDeviceIcon = (device: string) => {
    if (!device) return <Monitor size={16} />;
    const d = device.toLowerCase();
    if (d.includes("mobile") || d.includes("phone")) return <Smartphone size={16} />;
    if (d.includes("tablet") || d.includes("ipad")) return <Tablet size={16} />;
    return <Monitor size={16} />;
  };

  const totalLogins = deduplicatedSessions.length;
  const activeUsers = deduplicatedSessions.filter(s => s.status === "ACTIVE").length;
  const loggedOut = deduplicatedSessions.filter(s => s.status === "LOGGED_OUT").length;
  const failedLogins = deduplicatedSessions.filter(s => s.status === "FAILED").length; // Mock failed if none

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">User Login Activity</h1>
          <p className="text-sm text-ink-soft mt-1">Monitor system access, device details, and authentication events.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Search User or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal w-full sm:w-64"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-royal text-ink"
          >
            <option value="All">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="LOGGED_OUT">Logged Out</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-line shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Activity size={24} /></div>
          <div><p className="text-sm text-ink-soft">Total Logins</p><p className="text-2xl font-bold text-ink">{totalLogins}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-line shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Monitor size={24} /></div>
          <div><p className="text-sm text-ink-soft">Active Users</p><p className="text-2xl font-bold text-ink">{activeUsers}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-line shadow-sm flex items-center gap-4">
          <div className="p-3 bg-gray-50 text-gray-600 rounded-xl"><LogOut size={24} /></div>
          <div><p className="text-sm text-ink-soft">Logged Out</p><p className="text-2xl font-bold text-ink">{loggedOut}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-line shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={24} /></div>
          <div><p className="text-sm text-ink-soft">Failed Logins</p><p className="text-2xl font-bold text-ink">{failedLogins}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-pale text-ink-soft font-semibold text-xs uppercase tracking-wider border-b border-line">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">Login Date / Time</th>
                <th className="px-6 py-4">Logout Time</th>
                <th className="px-6 py-4">Device Info</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-ink-soft">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} className="text-ink-soft/50" />
                      <p>No login activity found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const staffInfo = getStaff(session.user_id);
                  const roleName = staffInfo.roles?.name || "N/A";
                  
                  return (
                    <tr key={session.id} className="hover:bg-pale/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-royal/10 text-royal flex items-center justify-center font-bold text-xs shrink-0">
                            {staffInfo.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-ink">{staffInfo.full_name}</p>
                            <p className="text-[10px] uppercase tracking-wider text-ink-soft">{roleName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-ink-soft">{getBranchName(session.branch_id)}</td>
                      <td className="px-6 py-4 text-ink">
                        <p className="font-medium">
                          {new Date(session.login_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {new Date(session.login_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {session.logout_at ? (
                          new Date(session.logout_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-ink">
                          {getDeviceIcon(session.device_type)}
                          <div>
                            <p className="text-sm">{session.browser || "Unknown"} • {session.operating_system || "Unknown"}</p>
                            <p className="text-xs text-ink-soft">{session.ip_address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          session.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          session.status === 'LOGGED_OUT' ? 'bg-gray-100 text-gray-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
