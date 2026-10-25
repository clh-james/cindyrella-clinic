-- ==============================================================================
-- Cindyrella Aesthetic & Wellness Clinic
-- Migration 0043: Add Photo/Selfie Verification to Staff Attendance Records
-- ==============================================================================

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS time_in_photo_url TEXT;

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS time_out_photo_url TEXT;

COMMENT ON COLUMN attendance_records.time_in_photo_url IS 'URL of the selfie captured upon Time In for anti-fraud verification';
COMMENT ON COLUMN attendance_records.time_out_photo_url IS 'URL of the selfie captured upon Time Out for anti-fraud verification';
