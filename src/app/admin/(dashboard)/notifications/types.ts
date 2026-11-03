export interface StaffNotificationItem {
  id: string;
  recipient_id: string;
  branch_id?: string | null;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

