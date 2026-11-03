-- ==============================================================================
-- Cindyrella Aesthetic & Wellness Clinic
-- Migration 0050: Clinic Announcements & Bulletin System
-- Broadcast internal memos, holiday operating schedules, and staff notices
-- ==============================================================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'cashier', 'staff', 'therapist', 'manager')),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = all branches
  author_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  author_name TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_branch ON announcements(branch_id);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view active announcements" ON announcements
  FOR SELECT USING (has_permission(auth.uid(), 'announcements.view') OR is_super_admin());

CREATE POLICY "Admin can insert announcements" ON announcements
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'announcements.create') OR is_super_admin());

CREATE POLICY "Admin can update announcements" ON announcements
  FOR UPDATE USING (has_permission(auth.uid(), 'announcements.edit') OR is_super_admin());

CREATE POLICY "Admin can delete announcements" ON announcements
  FOR DELETE USING (has_permission(auth.uid(), 'announcements.delete') OR is_super_admin());

