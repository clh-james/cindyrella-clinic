/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, Fragment } from "react";
import { Search, ScrollText, ChevronDown, ChevronUp } from "lucide-react";

export function AuditLogsClient({ initialLogs, staff, branches }: { initialLogs: any[], staff: any[], branches: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStaffName = (userId: string) => {
    const s = staff.find(st => st.id === userId);
    return s ? s.full_name : "System / Unknown";
  };
  
  const getBranchName = (branchId: string) => {
    if (!branchId) return "Global";
    const b = branches.find(br => br.id === branchId);
    return b ? b.name : "Unknown Branch";
  };

  const filteredLogs = initialLogs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.resource_type?.toLowerCase().includes(term) ||
      getStaffName(log.user_id).toLowerCase().includes(term) ||
      log.resource_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">System Audit Logs</h1>
          <p className="text-sm text-ink-soft mt-1">Review system activities, modifications, and access events.</p>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-line rounded-lg text-sm focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal w-full sm:w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-pale text-ink-soft font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-ink-soft">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText size={32} className="text-ink-soft/50" />
                      <p>No audit logs found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedRows[log.id];
                  
                  return (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-pale/50 transition-colors">
                        <td className="px-6 py-4 text-ink-soft">
                          {new Date(log.created_at).toLocaleString('en-US', { 
                            month: 'short', day: 'numeric', year: 'numeric', 
                            hour: 'numeric', minute: '2-digit', second: '2-digit' 
                          })}
                        </td>
                        <td className="px-6 py-4 font-medium text-ink">{getStaffName(log.user_id)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                            log.action?.includes('CREATE') || log.action?.includes('INSERT') ? 'bg-green-100 text-green-700' :
                            log.action?.includes('UPDATE') || log.action?.includes('EDIT') ? 'bg-amber-100 text-amber-700' :
                            log.action?.includes('DELETE') || log.action?.includes('REMOVE') ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {log.action || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-ink">{log.resource_type || "N/A"}</span>
                          {log.resource_id && <span className="text-ink-soft ml-1 text-xs">#{log.resource_id.substring(0, 8)}</span>}
                        </td>
                        <td className="px-6 py-4 text-ink-soft">{getBranchName(log.branch_id)}</td>
                        <td className="px-6 py-4 text-right">
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <button 
                              onClick={() => toggleRow(log.id)}
                              className="p-1.5 text-ink-soft hover:text-royal hover:bg-royal/10 rounded-lg transition-colors"
                              title="View Details"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                      </tr>
                      
                      {isExpanded && log.metadata && (
                        <tr className="bg-pale/30 border-b border-line">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white border border-line rounded-lg p-4 overflow-x-auto">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">Metadata / Payload</h4>
                              <pre className="text-xs font-mono text-ink">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
