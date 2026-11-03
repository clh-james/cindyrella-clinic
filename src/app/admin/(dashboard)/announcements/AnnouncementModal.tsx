"use client";

import { useState, useEffect } from "react";
import { Megaphone, X, Loader2, AlertCircle, Pin } from "lucide-react";
import { ClinicAnnouncement, BranchOption } from "./types";
import { createAnnouncement, updateAnnouncement } from "./actions";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcementToEdit?: ClinicAnnouncement | null;
  branches: BranchOption[];
  onSuccess: () => void;
}

export default function AnnouncementModal({
  isOpen,
  onClose,
  announcementToEdit,
  branches,
  onSuccess,
}: AnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal");
  const [targetAudience, setTargetAudience] = useState<
    "all" | "cashier" | "staff" | "therapist" | "manager"
  >("all");
  const [branchId, setBranchId] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (announcementToEdit) {
      setTitle(announcementToEdit.title);
      setContent(announcementToEdit.content);
      setPriority(announcementToEdit.priority);
      setTargetAudience(announcementToEdit.target_audience);
      setBranchId(announcementToEdit.branch_id || "");
      setIsPinned(announcementToEdit.is_pinned);
    } else {
      setTitle("");
      setContent("");
      setPriority("normal");
      setTargetAudience("all");
      setBranchId("");
      setIsPinned(false);
    }
    setError(null);
  }, [announcementToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (announcementToEdit) {
        const res = await updateAnnouncement(announcementToEdit.id, {
          title,
          content,
          priority,
          target_audience: targetAudience,
          branch_id: branchId || null,
          is_pinned: isPinned,
        });
        if (res.error) {
          setError(res.error);
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await createAnnouncement({
          title,
          content,
          priority,
          target_audience: targetAudience,
          branch_id: branchId || null,
          is_pinned: isPinned,
        });
        if (res.error) {
          setError(res.error);
          setIsSubmitting(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save announcement.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-mist/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal/10 text-royal">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                {announcementToEdit ? "Edit Clinic Announcement" : "Create New Announcement"}
              </h2>
              <p className="text-xs text-ink-soft">
                Broadcast memos and clinic notices to staff across branches
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-2 text-ink-soft hover:bg-mist transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Announcement Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Holiday Clinic Schedule, New Treatment Protocol"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all font-semibold"
            />
          </div>

          {/* Priority & Target Audience */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "normal" | "important" | "urgent")}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-xs text-ink outline-none focus:border-royal bg-white"
              >
                <option value="normal">Normal (Routine memo)</option>
                <option value="important">Important (Key updates)</option>
                <option value="urgent">Urgent (Immediate attention)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Target Role
              </label>
              <select
                value={targetAudience}
                onChange={(e) =>
                  setTargetAudience(
                    e.target.value as "all" | "cashier" | "staff" | "therapist" | "manager"
                  )
                }
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-xs text-ink outline-none focus:border-royal bg-white"
              >
                <option value="all">All Clinic Staff</option>
                <option value="cashier">Cashiers only</option>
                <option value="therapist">Therapists only</option>
                <option value="manager">Managers only</option>
                <option value="staff">Staff only</option>
              </select>
            </div>
          </div>

          {/* Target Branch */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Target Branch Location
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-xs text-ink outline-none focus:border-royal bg-white"
            >
              <option value="">All Branches (Nationwide)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} Branch
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Notice Content / Details <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Write the full announcement details, instructions, or clinic policy changes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all resize-none"
            />
          </div>

          {/* Pin */}
          <div className="pt-2 border-t border-line">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-line text-royal focus:ring-royal"
              />
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Pin className="h-3.5 w-3.5 text-royal" /> Pin this announcement to top of dashboard
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-mist transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-royal px-5 py-2 text-sm font-semibold text-white hover:bg-royal/90 shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : announcementToEdit ? (
                "Save Changes"
              ) : (
                "Publish Announcement"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

