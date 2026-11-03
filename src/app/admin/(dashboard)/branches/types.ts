export interface BranchStaffMember {
  id: string;
  full_name: string;
  role_name?: string;
  is_active: boolean;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  staff_count: number;
  appointments_count: number;
  staff_members?: BranchStaffMember[];
}
