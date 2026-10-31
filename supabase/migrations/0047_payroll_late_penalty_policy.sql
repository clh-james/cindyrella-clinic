-- Migration 0047: Standard Clinic Late Penalty Policy (₱10/minute)
-- Ensures schedule_policy in payroll_settings records 10 pesos per minute late penalty.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM payroll_settings WHERE key = 'schedule_policy') THEN
    UPDATE payroll_settings
    SET 
      value = jsonb_set(
        COALESCE(value, '{}'::jsonb),
        '{late_rate_per_minute}',
        '10'::jsonb,
        true
      ),
      description = 'Cutoff rules, late penalty rate (₱10/min), and contribution deduction frequency settings',
      updated_at = NOW()
    WHERE key = 'schedule_policy';
  ELSE
    INSERT INTO payroll_settings (key, value, description)
    VALUES (
      'schedule_policy',
      '{
        "standard_daily_hours": 8,
        "working_days_per_month": 26,
        "contribution_schedule": "split_50_50",
        "late_rate_per_minute": 10,
        "semi_monthly_cutoffs": [
          { "period": "1st_half", "start_day": 1, "end_day": 15, "pay_day": 20 },
          { "period": "2nd_half", "start_day": 16, "end_day": "end_of_month", "pay_day": 5 }
        ]
      }'::jsonb,
      'Cutoff rules, late penalty rate (₱10/min), and contribution deduction frequency settings'
    );
  END IF;
END $$;
