-- Drop the duplicate UNIQUE constraint on lipila_transaction_id
-- Two constraints exist: payments_lipila_transaction_id_key and payments_lipila_transaction_id_unique
-- Both enforce the same thing; the duplicate causes confusion and can cause unexpected errors.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_lipila_transaction_id_unique;

-- Verify only one remains
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.payments'::regclass AND contype = 'u'
ORDER BY conname;