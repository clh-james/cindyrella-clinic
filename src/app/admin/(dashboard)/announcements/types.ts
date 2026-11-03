export interface ClinicAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  target_audience: "all" | "cashier" | "staff" | "therapist" | "manager";
  branch_id?: string | null;
  branch_name?: string | null;
  author_id?: string | null;
  author_name: string;
  is_pinned: boolean;
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
}

export interface BranchOption {
  id: string;
  name: string;
}

