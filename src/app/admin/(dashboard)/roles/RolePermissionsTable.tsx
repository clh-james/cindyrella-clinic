/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Check, Plus, Trash2, Shield, Search, Lock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { toggleRolePermission, deleteRole } from "./actions";
import { AddRoleModal } from "./AddRoleModal";

type Permission = { id: string; key: string; name: string; module: string };
type Role = { id: string; name: string; description: string; role_permissions: { permission_id: string }[] };

const SYSTEM_ROLE_KEYS = ["super_admin", "admin", "manager", "cashier", "staff"];

interface RolePermissionsTableProps {
  roles: Role[];
  permissions: Permission[];
}

export function RolePermissionsTable({ roles, permissions }: RolePermissionsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  // Group filtered permissions by module
  const filteredPermissions = useMemo(() => {
    if (!searchTerm.trim()) return permissions;
    const term = searchTerm.toLowerCase();
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.key.toLowerCase().includes(term) ||
        p.module.toLowerCase().includes(term)
    );
  }, [permissions, searchTerm]);

  const modules = useMemo(() => {
    return filteredPermissions.reduce((acc: Record<string, Permission[]>, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});
  }, [filteredPermissions]);

  const handleToggle = (roleId: string, permissionId: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleRolePermission(roleId, permissionId, !currentStatus);
        toast.success(currentStatus ? "Permission removed" : "Permission granted", {
          duration: 1500,
        });
      } catch (err: any) {
        toast.error(err.message || "Failed to update permission");
      }
    });
  };

  const handleDeleteRole = (role: Role) => {
    if (SYSTEM_ROLE_KEYS.includes(role.name.toLowerCase())) {
      toast.error("Cannot delete a core system role.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the role "${role.name.replace(/_/g, " ").toUpperCase()}"?\n\nThis will remove all assigned permissions for this role.`
    );
    if (!confirmed) return;

    setDeletingRoleId(role.id);
    startTransition(async () => {
      try {
        await deleteRole(role.id);
        toast.success(`Role "${role.name.replace(/_/g, " ")}" deleted successfully!`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete role");
      } finally {
        setDeletingRoleId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search permissions or modules..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-line bg-white text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all"
          />
        </div>

        {/* Add Role Button */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-royal hover:bg-royal-deep rounded-xl shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>Add New Role</span>
        </button>
      </div>

      {/* Permissions Matrix Table */}
      <div className="overflow-x-auto touch-scroll rounded-2xl border border-line bg-white shadow-sm relative">
        {isPending && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-30 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow border border-line">
              <Loader2 className="h-5 w-5 animate-spin text-royal" />
              <span className="text-xs font-medium text-ink">Updating...</span>
            </div>
          </div>
        )}

        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-[#f4f7f9] text-ink-soft sticky top-0 z-10 border-b border-line">
            <tr>
              <th className="px-4 sm:px-6 py-3.5 sm:py-4 font-semibold sticky left-0 bg-[#f4f7f9] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] min-w-[220px]">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-royal" />
                  <span>Permission Module</span>
                </div>
              </th>
              {roles.map((r) => {
                const isSystem = SYSTEM_ROLE_KEYS.includes(r.name.toLowerCase());
                const isSuperAdmin = r.name.toLowerCase() === "super_admin";

                return (
                  <th
                    key={r.id}
                    className="px-3 sm:px-4 py-3 sm:py-4 text-center font-semibold border-l border-line/50 min-w-[130px] max-w-[180px]"
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="capitalize font-bold text-ink text-sm">
                          {r.name.replace(/_/g, " ")}
                        </span>
                        {isSuperAdmin && (
                          <span title="Locked System Role" className="text-amber-600">
                            <Lock size={12} />
                          </span>
                        )}
                      </div>

                      {/* Role Type Badge & Delete Control */}
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isSystem
                              ? "bg-slate-100 text-slate-600"
                              : "bg-royal/10 text-royal font-semibold"
                          }`}
                        >
                          {isSystem ? "System" : "Custom"}
                        </span>

                        {!isSystem && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(r)}
                            disabled={deletingRoleId === r.id || isPending}
                            title={`Delete custom role "${r.name}"`}
                            className="p-1 text-ink-soft hover:text-rose-600 rounded hover:bg-rose-50 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {r.description && (
                        <span className="text-[10px] text-ink-soft line-clamp-1 font-normal max-w-[140px] mt-0.5">
                          {r.description}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {Object.entries(modules).length === 0 ? (
              <tr>
                <td
                  colSpan={roles.length + 1}
                  className="px-6 py-12 text-center text-ink-soft text-sm"
                >
                  No permissions found matching &quot;{searchTerm}&quot;.
                </td>
              </tr>
            ) : (
              Object.entries(modules).map(([moduleName, perms]) => (
                <React.Fragment key={moduleName}>
                  <tr className="bg-pale/40">
                    <td
                      colSpan={roles.length + 1}
                      className="px-4 sm:px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-royal sticky left-0"
                    >
                      {moduleName} Module
                    </td>
                  </tr>

                  {perms.map((p) => (
                    <tr key={p.id} className="hover:bg-pale/30 transition-colors">
                      <td className="px-4 sm:px-6 py-3 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-10">
                        <p className="font-medium text-ink">{p.name}</p>
                        <p className="text-[11px] text-ink-soft font-mono mt-0.5">{p.key}</p>
                      </td>

                      {roles.map((r) => {
                        const hasPerm = r.role_permissions.some((rp) => rp.permission_id === p.id);
                        const isSuperAdmin = r.name.toLowerCase() === "super_admin";

                        return (
                          <td
                            key={r.id}
                            className="px-4 py-3 text-center border-l border-line/50"
                          >
                            {isSuperAdmin ? (
                              <Check size={18} className="mx-auto text-emerald-500 opacity-60" />
                            ) : (
                              <label className="cursor-pointer inline-flex items-center justify-center p-2 rounded-lg hover:bg-royal/5 transition-all">
                                <input
                                  type="checkbox"
                                  checked={hasPerm}
                                  onChange={() => handleToggle(r.id, p.id, hasPerm)}
                                  disabled={isPending}
                                  className="h-4 w-4 cursor-pointer rounded border-line text-royal focus:ring-royal/20 transition-all hover:border-royal disabled:opacity-40"
                                />
                              </label>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Role Modal */}
      <AddRoleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingRoles={roles.map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}
