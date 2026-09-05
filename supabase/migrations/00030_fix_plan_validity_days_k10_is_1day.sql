
-- K10: 1 day validity (expires after 1 day regardless of upload count)
-- K100: 7 days (already correct)
-- K300: 365 days (already correct)
UPDATE upload_plans SET validity_days = 1  WHERE plan_type = 'k10_single';
UPDATE upload_plans SET validity_days = 7  WHERE plan_type = 'k100_weekly' AND (validity_days IS NULL OR validity_days != 7);
UPDATE upload_plans SET validity_days = 365 WHERE plan_type = 'k300_yearly' AND (validity_days IS NULL OR validity_days != 365);
