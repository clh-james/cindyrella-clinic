"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Users,
  Calendar,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  Eye,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Branch } from "./types";
import BranchModal from "./BranchModal";
import BranchDetailsModal from "./BranchDetailsModal";
import { toggleBranchStatus, deleteBranch } from "./actions";
import { useRouter } from "next/navigation";

interface BranchesClientProps {
  initialBranches: Branch[];
}

export default function BranchesClient({ initialBranches }: BranchesClientProps) {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);
  const [detailsBranch, setDetailsBranch] = useState<Branch | null>(null);

  // Deletion & Action state
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Sync when initial branches change
  useState(() => {
    setBranches(initialBranches);
  });

  const filteredBranches = branches.filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (branch.address && branch.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (branch.phone && branch.phone.includes(searchQuery));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && branch.is_active) ||
      (statusFilter === "inactive" && !branch.is_active);

    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.is_active).length;
  const inactiveBranches = totalBranches - activeBranches;
  const totalStaffAssigned = branches.reduce((sum, b) => sum + (b.staff_count || 0), 0);

  const handleOpenAdd = () => {
    setBranchToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setBranchToEdit(branch);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleToggleStatus = async (branch: Branch) => {
    setActionError(null);
    setActiveMenuId(null);
    const newStatus = !branch.is_active;

    try {
      const res = await toggleBranchStatus(branch.id, newStatus);
      if (res.error) {
        setActionError(res.error);
        return;
      }

      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, is_active: newStatus } : b))
      );
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update branch status.";
      setActionError(msg);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!window.confirm(`Are you sure you want to delete branch "${branch.name}"? This action cannot be undone.`)) {
      return;
    }

    setActionError(null);
    setIsDeletingId(branch.id);
    setActiveMenuId(null);

    try {
      const res = await deleteBranch(branch.id);
      if (res.error) {
        setActionError(res.error);
        setIsDeletingId(null);
        return;
      }

      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete branch.";
      setActionError(msg);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-royal" />
            Clinic Branches
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Manage your clinic branches, location contact details, and branch rosters.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-royal/90 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add New Branch
        </button>
      </div>

      {actionError && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-semibold underline text-red-700 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Total Branches</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal/10 text-royal">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{totalBranches}</p>
          <p className="text-xs text-ink-soft mt-0.5">Operating locations</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Active Locations</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{activeBranches}</p>
          <p className="text-xs text-ink-soft mt-0.5">Available for POS & bookings</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Inactive Locations</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{inactiveBranches}</p>
          <p className="text-xs text-ink-soft mt-0.5">Temporarily closed / dormant</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Assigned Staff</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{totalStaffAssigned}</p>
          <p className="text-xs text-ink-soft mt-0.5">Across all branches</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-line bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            type="text"
            placeholder="Search branch name, address, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-line pl-10 pr-4 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(["all", "active", "inactive"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === status
                  ? "bg-royal text-white shadow-sm"
                  : "bg-mist/50 text-ink-soft hover:bg-mist hover:text-ink"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Branches Grid */}
      {filteredBranches.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
          <Building2 className="mx-auto h-12 w-12 text-ink-soft/40 mb-3" />
          <h3 className="text-base font-semibold text-ink">No branches found</h3>
          <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No branch results matched "${searchQuery}". Try adjusting your filters.`
              : "No branches registered yet. Click \"Add New Branch\" to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                branch.is_active ? "border-line" : "border-zinc-200 bg-zinc-50/50 opacity-80"
              }`}
            >
              {/* Branch Header */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                        branch.is_active
                          ? "bg-royal/10 text-royal"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-ink text-base line-clamp-1">{branch.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            branch.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {branch.is_active ? (
                            <>
                              <CheckCircle2 className="h-2.5 w-2.5" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-2.5 w-2.5" /> Inactive
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu button */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === branch.id ? null : branch.id)
                      }
                      className="rounded-lg p-1.5 text-ink-soft hover:bg-mist transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {activeMenuId === branch.id && (
                      <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-line bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                        <button
                          onClick={() => {
                            setDetailsBranch(branch);
                            setActiveMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-mist text-left"
                        >
                          <Eye className="h-3.5 w-3.5 text-royal" />
                          View Details & Team
                        </button>

                        <button
                          onClick={() => handleOpenEdit(branch)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-mist text-left"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-ink-soft" />
                          Edit Branch
                        </button>

                        <button
                          onClick={() => handleToggleStatus(branch)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-mist text-left"
                        >
                          <Power
                            className={`h-3.5 w-3.5 ${
                              branch.is_active ? "text-amber-500" : "text-emerald-600"
                            }`}
                          />
                          {branch.is_active ? "Mark as Inactive" : "Activate Branch"}
                        </button>

                        <div className="my-1 border-t border-line" />

                        <button
                          onClick={() => handleDelete(branch)}
                          disabled={isDeletingId === branch.id}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 text-left disabled:opacity-50"
                        >
                          {isDeletingId === branch.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete Branch
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Branch Info */}
                <div className="mt-4 space-y-2 text-xs text-ink-soft">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-royal mt-0.5" />
                    <span className="line-clamp-2 text-ink">
                      {branch.address || <span className="italic text-ink-soft/70">No address specified</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-royal" />
                    <span className="text-ink">
                      {branch.phone || <span className="italic text-ink-soft/70">No contact number</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Branch Stats & Footer */}
              <div className="mt-5 pt-3.5 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDetailsBranch(branch)}
                  className="flex items-center gap-1.5 rounded-lg bg-royal/5 px-2.5 py-1 text-xs font-semibold text-royal hover:bg-royal/10 transition-colors"
                >
                  <Users className="h-3 w-3" />
                  <span>{branch.staff_count} Staff</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <Calendar className="h-3 w-3 text-purple-600" />
                  <span>{branch.appointments_count} Appointments</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <BranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        branchToEdit={branchToEdit}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Details / Staff Roster Modal */}
      <BranchDetailsModal
        branch={detailsBranch}
        onClose={() => setDetailsBranch(null)}
        onEdit={(branch) => handleOpenEdit(branch)}
      />
    </div>
  );
}

