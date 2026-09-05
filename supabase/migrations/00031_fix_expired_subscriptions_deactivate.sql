
-- Deactivate any subscriptions that are past expires_at (catch ones that expired without being deactivated)
UPDATE user_subscriptions
SET is_active = false
WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at <= now();

-- Deactivate k10_single subscriptions where upload has been used
UPDATE user_subscriptions
SET is_active = false
WHERE is_active = true
  AND plan_type = 'k10_single'
  AND uploads_used >= uploads_allowed;
