-- ==============================================================================
-- Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
-- Migration 0039: Daily Staff Attendance, Timekeeping & Login Monitoring System
-- ==============================================================================

-- 1. EMPLOYEE SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  shift_name TEXT NOT NULL DEFAULT 'Standard Clinic Shift',
  scheduled_start TIME NOT NULL DEFAULT '09:00:00',
  scheduled_end TIME NOT NULL DEFAULT '18:00:00',
  break_minutes INTEGER NOT NULL DEFAULT 60 CHECK (break_minutes >= 0),
  grace_period_minutes INTEGER NOT NULL DEFAULT 15 CHECK (grace_period_minutes >= 0),
  rest_days INTEGER[] NOT NULL DEFAULT ARRAY[0], -- 0=Sunday, 1=Monday, ..., 6=Saturday
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_emp ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_branch ON employee_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_active ON employee_schedules(is_active);

-- 2. ENHANCE ATTENDANCE RECORDS TABLE
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS scheduled_shift_id UUID REFERENCES employee_schedules(id) ON DELETE SET NULL;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS shift_name TEXT DEFAULT 'Standard Clinic Shift';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS scheduled_start_time TIME DEFAULT '09:00:00';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS scheduled_end_time TIME DEFAULT '18:00:00';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS break_start TIMESTAMPTZ;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS break_end TIMESTAMPTZ;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'present';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS correction_status TEXT DEFAULT 'none' CHECK (correction_status IN ('none', 'pending', 'approved', 'rejected', 'cancelled'));
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS approved_overtime_minutes INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_attendance_records_emp ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_branch ON attendance_records(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(attendance_status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_correction ON attendance_records(correction_status);

-- 3. ATTENDANCE BREAKS TABLE (Supports multiple breaks per shift)
CREATE TABLE IF NOT EXISTS attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  break_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  break_end TIMESTAMPTZ,
  duration_minutes INTEGER,
  break_type TEXT NOT NULL DEFAULT 'meal' CHECK (break_type IN ('meal', 'rest', 'coffee', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_breaks_rec ON attendance_breaks(attendance_record_id);

-- 4. ATTENDANCE CORRECTION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  original_time_in TIMESTAMPTZ,
  original_time_out TIMESTAMPTZ,
  requested_time_in TIMESTAMPTZ,
  requested_time_out TIMESTAMPTZ,
  correction_type TEXT NOT NULL CHECK (correction_type IN (
    'missed_time_in', 'missed_time_out', 'incorrect_time', 'missed_break', 'undertime_excusal', 'other'
  )),
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Separation of duties check: employee cannot approve their own correction
  CONSTRAINT chk_separation_of_duties CHECK (
    status <> 'approved' OR reviewed_by IS NULL OR reviewed_by <> submitted_by
  )
);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_emp ON attendance_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_date ON attendance_corrections(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON attendance_corrections(status);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_branch ON attendance_corrections(branch_id);

-- 5. ATTENDANCE AUDIT EVENTS TABLE (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS attendance_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ATTENDANCE_TIME_IN',
    'ATTENDANCE_BREAK_STARTED',
    'ATTENDANCE_BREAK_ENDED',
    'ATTENDANCE_TIME_OUT',
    'ATTENDANCE_CORRECTION_SUBMITTED',
    'ATTENDANCE_CORRECTION_APPROVED',
    'ATTENDANCE_CORRECTION_REJECTED',
    'ATTENDANCE_CORRECTION_CANCELLED',
    'ATTENDANCE_MANUAL_ADJUSTMENT'
  )),
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  device_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_emp ON attendance_audit_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_type ON attendance_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_created ON attendance_audit_events(created_at DESC);

-- 6. SEED ATTENDANCE PERMISSIONS
INSERT INTO permissions (key, name, description, module) VALUES
('attendance.view', 'View Attendance Records', 'View daily attendance ledgers and dashboard', 'attendance'),
('attendance.self_record', 'Record Own Attendance', 'Self-service clock in, out, and breaks', 'attendance'),
('attendance.manage', 'Manage Attendance', 'Create and adjust staff attendance records', 'attendance'),
('attendance.approve_corrections', 'Approve Attendance Corrections', 'Review and approve/reject staff correction requests', 'attendance'),
('attendance.manage_schedules', 'Manage Employee Schedules', 'Configure staff shifts and rest days', 'attendance'),
('attendance.export', 'Export Attendance Reports', 'Download daily and monthly attendance summaries', 'attendance')
ON CONFLICT (key) DO NOTHING;

-- 7. ASSIGN PERMISSIONS TO ROLES
DO $$
DECLARE
  v_super_admin_id UUID;
  v_admin_id UUID;
  v_manager_id UUID;
  v_cashier_id UUID;
  v_staff_id UUID;
BEGIN
  SELECT id INTO v_super_admin_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO v_admin_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_manager_id FROM roles WHERE name = 'manager';
  SELECT id INTO v_cashier_id FROM roles WHERE name = 'cashier';
  SELECT id INTO v_staff_id FROM roles WHERE name = 'staff';

  -- Super Admin & Admin get all attendance permissions
  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_super_admin_id, id FROM permissions WHERE module = 'attendance'
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_id, id FROM permissions WHERE module = 'attendance'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Managers can view, manage, approve corrections, manage schedules, and export
  IF v_manager_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_manager_id, id FROM permissions 
    WHERE key IN (
      'attendance.view', 'attendance.self_record', 'attendance.manage', 
      'attendance.approve_corrections', 'attendance.manage_schedules', 'attendance.export'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Cashier & Staff can record own attendance and view own attendance
  IF v_cashier_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_cashier_id, id FROM permissions 
    WHERE key IN ('attendance.self_record', 'attendance.view')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_staff_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_staff_id, id FROM permissions 
    WHERE key IN ('attendance.self_record', 'attendance.view')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit_events ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES
-- Employee Schedules: Staff can view their own; managers/admins can manage
DROP POLICY IF EXISTS "Staff view schedules" ON employee_schedules;
CREATE POLICY "Staff view schedules" ON employee_schedules
  FOR SELECT USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM staff
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() AND (roles.name IN ('super_admin', 'admin', 'manager'))
    )
  );

DROP POLICY IF EXISTS "Admins manage schedules" ON employee_schedules;
CREATE POLICY "Admins manage schedules" ON employee_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() AND (roles.name IN ('super_admin', 'admin', 'manager'))
    )
  );

-- Attendance Breaks: Staff can view/insert their own breaks
DROP POLICY IF EXISTS "Staff view own breaks" ON attendance_breaks;
CREATE POLICY "Staff view own breaks" ON attendance_breaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM attendance_records
      WHERE attendance_records.id = attendance_breaks.attendance_record_id
      AND (
        attendance_records.employee_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM staff
          LEFT JOIN roles ON roles.id = staff.role_id
          WHERE staff.id = auth.uid() AND roles.name IN ('super_admin', 'admin', 'manager')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Staff manage own breaks" ON attendance_breaks;
CREATE POLICY "Staff manage own breaks" ON attendance_breaks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM attendance_records
      WHERE attendance_records.id = attendance_breaks.attendance_record_id
      AND attendance_records.employee_id = auth.uid()
    )
  );

-- Attendance Corrections
DROP POLICY IF EXISTS "Staff view own corrections" ON attendance_corrections;
CREATE POLICY "Staff view own corrections" ON attendance_corrections
  FOR SELECT USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM staff
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() AND roles.name IN ('super_admin', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff submit corrections" ON attendance_corrections;
CREATE POLICY "Staff submit corrections" ON attendance_corrections
  FOR INSERT WITH CHECK (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM staff
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() AND roles.name IN ('super_admin', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Managers review corrections" ON attendance_corrections;
CREATE POLICY "Managers review corrections" ON attendance_corrections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM staff
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() AND roles.name IN ('super_admin', 'admin', 'manager')
    )
  );

-- Attendance Audit Events
DROP POLICY IF EXISTS "Staff view own audit events" ON attendance_audit_events;
CREATE POLICY "Staff view own audit events" ON attendance_audit_events
  FOR SELECT USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM staff
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() AND roles.name IN ('super_admin', 'admin', 'manager')
    )
  );
