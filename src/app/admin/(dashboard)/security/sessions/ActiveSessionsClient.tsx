/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { Monitor, Smartphone, Tablet, PowerOff, ShieldAlert, CheckCircle2 } from "lucide-react";
import { forceLogoutSession } from "./actions";

export function ActiveSessionsClient({ activeSessions, staff, branches }: { activeSessions: any[], staff: any[], branches: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [sessionToForceLogout, setSessionToForceLogout] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getStaff = (userId: string) => {
    return staff.find(st => st.id === userId) || { full_name: "Unknown", role: "Unknown", roles: { name: "Unknown" } };
  };

  const getBranchName = (branchId: string) => {
    if (!branchId) return "Global";
    const b = branches.find(br => br.id === branchId);
    return b ? b.name : "Unknown";
  };

  const getDeviceIcon = (device: string) => {
    if (!device) return <Monitor size={16} />;
    const d = device.toLowerCase();
    if (d.includes("mobile") || d.includes("phone")) return <Smartphone size={16} />;
    if (d.includes("tablet") || d.includes("ipad")) return <Tablet size={16} />;
    return <Monitor size={16} />;
  };

  const handleForceLogout = async () => {
    if (!sessionToForceLogout) return;
    setError(null);
    startTransition(async () => {
      const res = await forceLogoutSession(sessionToForceLogout.id);
      if (res.error) {
        setError(res.error);
      } else {
        setSessionToForceLogout(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Active Sessions
          </h1>
          <p className="text-sm text-ink-soft mt-1">Real-time view of currently logged-in users across all branches.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeSessions.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-line shadow-sm text-center">
            <CheckCircle2 size={40} className="mx-auto text-ink-soft/50 mb-3" />
            <h3 className="text-lg font-bold text-ink">No Active Sessions</h3>
            <p className="text-ink-soft text-sm">There are no other active sessions at this time.</p>
          </div>
        ) : (
          activeSessions.map((session) => {
            const staffInfo = getStaff(session.user_id);
            const roleName = staffInfo.roles?.name || "N/A";
            
            return (
              <div key={session.id} className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden flex flex-col hover:border-royal/30 transition-colors">
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-royal/10 text-royal flex items-center justify-center font-bold text-sm shrink-0">
                        {staffInfo.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-ink truncate max-w-[150px]" title={staffInfo.full_name}>{staffInfo.full_name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold">{roleName}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                      Active
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line/50">
                    <div>
                      <p className="text-[10px] text-ink-soft uppercase font-bold tracking-wider mb-0.5">Branch</p>
                      <p className="text-xs text-ink font-medium">{getBranchName(session.branch_id)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-soft uppercase font-bold tracking-wider mb-0.5">Logged In</p>
                      <p className="text-xs text-ink font-medium">
                        {new Date(session.login_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-ink-soft uppercase font-bold tracking-wider mb-0.5">Device</p>
                      <div className="flex items-center gap-1.5 text-xs text-ink font-medium">
                        {getDeviceIcon(session.device_type)}
                        <span className="truncate">{session.operating_system || "Unknown OS"} • {session.browser || "Unknown Browser"}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-pale/50 border-t border-line flex justify-end">
                  <button 
                    onClick={() => setSessionToForceLogout(session)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  >
                    <PowerOff size={14} />
                    Force Logout
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Force Logout Modal */}
      {sessionToForceLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-lg font-bold text-ink text-center mb-1">Force Logout User?</h3>
              <p className="text-sm text-ink-soft text-center mb-6">
                <span className="font-bold text-ink">{getStaff(sessionToForceLogout.user_id).full_name}</span> is currently logged in on their {sessionToForceLogout.operating_system} device. 
                This action will terminate their session and record an audit log.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-medium text-center">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSessionToForceLogout(null)}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-pale hover:bg-line/50 text-ink font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleForceLogout}
                  disabled={isPending}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <PowerOff size={16} />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
