import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AnnouncementsClient from "./AnnouncementsClient";
import { ClinicAnnouncement, BranchOption } from "./types";

export const metadata = {
  title: "Announcements & Bulletins — Admin",
  description: "Clinic memos, notices, holiday schedules, and staff announcements.",
};

export default async function AnnouncementsPage() {
  await requireStaff();
  const supabase = createAdminClient();

  // 1. Fetch branches for branch filter & creation
  let branches: BranchOption[] = [];
  try {
    const { data: bData } = await supabase
      .from("branches")
      .select("id, name")
      .order("name");

    if (bData) {
      branches = bData;
    }
  } catch (err) {
    console.warn("Failed to load branches:", err);
  }

  // 2. Fetch announcements
  let announcements: ClinicAnnouncement[] = [];
  try {
    const { data: aData } = await supabase
      .from("announcements")
      .select(`
        *,
        branch:branch_id(name)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (aData) {
      announcements = aData.map((a) => {
        const branchObj = a.branch as unknown as { name?: string } | null;
        return {
          id: a.id,
          title: a.title,
          content: a.content,
          priority: a.priority || "normal",
          target_audience: a.target_audience || "all",
          branch_id: a.branch_id || null,
          branch_name: branchObj?.name || null,
          author_id: a.author_id || null,
          author_name: a.author_name || "Admin Staff",
          is_pinned: a.is_pinned ?? false,
          is_active: a.is_active ?? true,
          expires_at: a.expires_at || null,
          created_at: a.created_at,
        };
      });
    }
  } catch (err) {
    console.warn("Failed to load announcements:", err);
  }

  return (
    <AnnouncementsClient
      initialAnnouncements={announcements}
      branches={branches}
    />
  );
}

