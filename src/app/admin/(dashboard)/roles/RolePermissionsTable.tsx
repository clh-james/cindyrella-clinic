/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useTransition } from "react";
import { Check } from "lucide-react";
import { toggleRolePermission } from "./actions";

type Permission = { id: string, key: string, name: string, module: string };
type Role = { id: string, name: string, description: string, role_permissions: { permission_id: string }[] };

interface RolePermissionsTableProps {
  roles: Role[];
  permissions: Permission[];
}

export function RolePermissionsTable({ roles, permissions }: RolePermissionsTableProps) {
  const [isPending, startTransition] = useTransition();

  // Group permissions by module
  const modules = permissions.reduce((acc: Record<string, Permission[]>, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const handleToggle = (roleId: string, permissionId: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleRolePermission(roleId, permissionId, !currentStatus);
      } catch (err: any) {
        alert(err.message || "Failed to update permission");
      }
    });
  };

  return (
    <div className="overflow-x-auto touch-scroll rounded-2xl border border-line bg-white shadow-sm relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-royal border-t-transparent"></div>
        </div>
      )}
      
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="bg-[#f4f7f9] text-ink-soft sticky top-0 z-10">
          <tr>
            <th className="px-4 sm:px-6 py-3.5 sm:py-4 font-semibold sticky left-0 bg-[#f4f7f9] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] min-w-[200px]">
              Permission Module
            </th>
            {roles.map(r => (
              <th key={r.id} className="px-3 sm:px-4 py-3.5 sm:py-4 text-center font-semibold capitalize border-l border-line/50 min-w-[100px]">
                {r.name.replace('_', ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {Object.entries(modules).map(([moduleName, perms]) => (
            <React.Fragment key={moduleName}>
              <tr className="bg-pale/30">
                <td colSpan={roles.length + 1} className="px-4 sm:px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-royal sticky left-0">
                  {moduleName}
                </td>
              </tr>
              {perms.map((p) => (
                <tr key={p.id} className="hover:bg-pale/50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-10">
                    <p className="font-medium text-ink">{p.name}</p>
                    <p className="text-[11px] text-ink-soft font-mono mt-0.5">{p.key}</p>
                  </td>
                  {roles.map((r) => {
                    const hasPerm = r.role_permissions.some((rp) => rp.permission_id === p.id);
                    return (
                      <td key={r.id} className="px-4 py-3 text-center border-l border-line/50">
                        {r.name === 'super_admin' ? (
                          <Check size={18} className="mx-auto text-emerald-500 opacity-50" />
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center w-full h-full p-2">
                            <input 
                              type="checkbox" 
                              checked={hasPerm} 
                              onChange={() => handleToggle(r.id, p.id, hasPerm)}
                              className="h-4 w-4 cursor-pointer rounded border-line text-royal focus:ring-royal/20 transition-all hover:border-royal"
                            />
                          </label>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
