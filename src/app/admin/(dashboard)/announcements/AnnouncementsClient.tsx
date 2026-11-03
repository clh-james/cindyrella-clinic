"use client";

import { useState } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  Info,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ClinicAnnouncement, BranchOption } from "./types";
import AnnouncementModal from "./AnnouncementModal";
import { togglePinAnnouncement, deleteAnnouncement } from "./actions";
import { useRouter } from "next/navigation";

interface AnnouncementsClientProps {
  initialAnnouncements: ClinicAnnouncement[];
  branches: BranchOption[];
}

export default function AnnouncementsClient({
  initialAnnouncements,
  branches,
}: AnnouncementsClientProps) {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<ClinicAnnouncement[]>(initialAnnouncements);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<ClinicAnnouncement | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useState(() => {
    setAnnouncements(initialAnnouncements);
  });

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesQuery =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      priorityFilter === "all" || a.priority === priorityFilter;

    const matchesBranch =
      branchFilter === "all" ||
      (branchFilter === "nationwide" && !a.branch_id) ||
      a.branch_id === branchFilter;

    return matchesQuery && matchesPriority && matchesBranch;
  });

  const pinnedList = filteredAnnouncements.filter((a) => a.is_pinned);
  const regularList = filteredAnnouncements.filter((a) => !a.is_pinned);

  const handleOpenAdd = () => {
    setEditingAnnouncement(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: ClinicAnnouncement) => {
    setEditingAnnouncement(a);
    setIsModalOpen(true);
  };

  const handleTogglePin = async (a: ClinicAnnouncement) => {
    const nextPin = !a.is_pinned;
    try {
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, is_pinned: nextPin } : item))
      );
      await togglePinAnnouncement(a.id, nextPin);
      router.refresh();
    } catch {
      setActionError("Failed to update pin status.");
    }
  };

  const handleDelete = async (a: ClinicAnnouncement) => {
    if (!window.confirm(`Are you sure you want to delete announcement "${a.title}"?`)) {
      return;
    }

    setIsDeletingId(a.id);
    setActionError(null);

    try {
      const res = await deleteAnnouncement(a.id);
      if (res.error) {
        setActionError(res.error);
        setIsDeletingId(null);
        return;
      }

      setAnnouncements((prev) => prev.filter((item) => item.id !== a.id));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete announcement.";
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
            <Megaphone className="h-7 w-7 text-royal" />
            Clinic Announcements & Bulletins
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Broadcast clinic memos, holiday schedules, and important operating notices to all staff.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-royal/90 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Announcement
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
            className="text-xs font-semibold underline text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-2xl border border-line bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            type="text"
            placeholder="Search announcements by title, content, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-line pl-10 pr-4 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-royal bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="important">Important</option>
            <option value="normal">Normal</option>
          </select>

          {/* Branch filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink outline-none focus:border-royal bg-white"
          >
            <option value="all">All Locations</option>
            <option value="nationwide">Nationwide only</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} Branch
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PINNED ANNOUNCEMENTS */}
      {pinnedList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="h-3.5 w-3.5 text-royal" /> Pinned Announcements ({pinnedList.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedList.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onEdit={handleOpenEdit}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                isDeleting={isDeletingId === announcement.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* REGULAR ANNOUNCEMENTS */}
      <div className="space-y-3">
        {pinnedList.length > 0 && (
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            All Bulletins ({regularList.length})
          </h2>
        )}

        {filteredAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
            <Megaphone className="mx-auto h-12 w-12 text-ink-soft/40 mb-3" />
            <h3 className="text-base font-semibold text-ink">No announcements found</h3>
            <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No bulletins matched "${searchQuery}".`
                : "No announcements posted yet. Click \"Create Announcement\" to publish a clinic memo."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {regularList.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onEdit={handleOpenEdit}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                isDeleting={isDeletingId === announcement.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        announcementToEdit={editingAnnouncement}
        branches={branches}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

function AnnouncementCard({
  announcement,
  onEdit,
  onTogglePin,
  onDelete,
  isDeleting,
}: {
  announcement: ClinicAnnouncement;
  onEdit: (a: ClinicAnnouncement) => void;
  onTogglePin: (a: ClinicAnnouncement) => void;
  onDelete: (a: ClinicAnnouncement) => void;
  isDeleting: boolean;
}) {
  const isUrgent = announcement.priority === "urgent";
  const isImportant = announcement.priority === "important";

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        announcement.is_pinned
          ? "border-royal/30 ring-1 ring-royal/20"
          : isUrgent
          ? "border-red-200"
          : isImportant
          ? "border-amber-200"
          : "border-line"
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isUrgent
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : isImportant
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {isUrgent ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Info className="h-3 w-3" />
              )}
              {announcement.priority}
            </span>

            {announcement.target_audience !== "all" && (
              <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold text-ink-soft capitalize">
                {announcement.target_audience}s
              </span>
            )}

            <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold text-ink-soft flex items-center gap-1">
              <Building2 className="h-2.5 w-2.5" />
              {announcement.branch_name || "All Branches"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onTogglePin(announcement)}
            className={`p-1 rounded-lg transition-colors ${
              announcement.is_pinned
                ? "text-royal bg-royal/10"
                : "text-ink-soft hover:bg-mist"
            }`}
            title={announcement.is_pinned ? "Unpin notice" : "Pin to top"}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Title */}
        <h3 className="font-bold text-ink text-base leading-snug">{announcement.title}</h3>

        {/* Content */}
        <p className="mt-2 text-xs text-ink/80 whitespace-pre-line line-clamp-4 leading-relaxed">
          {announcement.content}
        </p>
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-5 pt-3.5 border-t border-line flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-ink-soft">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 text-royal" />
            {announcement.author_name}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-ink-soft" />
            {new Date(announcement.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(announcement)}
            className="p-1.5 rounded-lg text-ink-soft hover:bg-mist hover:text-ink transition-colors"
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onDelete(announcement)}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-ink-soft hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

