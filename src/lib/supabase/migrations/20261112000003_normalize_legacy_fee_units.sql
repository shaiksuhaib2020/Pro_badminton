-- STEP 1 OF 2. Development database repair, based on the 14 Nov 2026 audit.
-- Run this entire file in SQL Editor, then run 20261112000004.
-- Pause application writes until BOTH files finish. No data is deleted.
-- Convert only the explicitly audited legacy fields; preserve newer paise rows.
-- Test-data decision: the raw-500 legacy clearance is the intended Rs 500
-- settlement, so it and its original raw-500 debt both become 50000 paise.
-- A column-comment marker makes successful reruns skip the conversion.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE public.students, public.student_payments, public.batches
  IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE fee_unit_cutover (
  entity text NOT NULL,
  id uuid NOT NULL,
  amount_rupees integer NOT NULL,
  remaining_rupees integer NOT NULL DEFAULT 0,
  PRIMARY KEY (entity, id)
) ON COMMIT DROP;

INSERT INTO fee_unit_cutover (entity, id, amount_rupees, remaining_rupees) VALUES
  ('student', '3f22821d-92a5-45c0-bbe6-46f001301a8d', 3023, 0),
  ('student', 'e16c6ecb-b3bf-4454-9cc6-9a20ad7a3b0b', 2000, 0),
  ('student', '4b0e069f-f87f-43db-bc6e-601907ea3106', 1500, 0),
  ('student', '235b46b5-cbdd-4499-9632-bda82a735d09', 2000, 0),
  ('student', '2e84eb77-eb30-4083-81c6-7f21ec6c2b06', 2500, 0),
  ('student', 'b08b40c0-fbb5-4e9b-80d4-fad4eb692594', 2500, 0),
  ('student', 'd90880ef-feee-444a-b847-24371f7a73e0', 2600, 0),
  ('student', '35a7b9bb-59f6-4b9c-91c7-38c510f1b8f3', 3000, 0),
  ('student', '989e7807-1c95-4d1e-88b9-8e846caa1295', 3000, 0),
  ('payment', 'aa250c15-c9ed-45a2-b504-e466dff8a76a', 2000, 0),
  ('payment', '10ac1d15-3668-4573-8262-539f54d247fb', 1500, 0),
  ('payment', '339e6dda-6a07-4eea-b407-33f2e99c38c2', 2000, 0),
  ('payment', '8b6e9fb0-9777-4bf4-be7f-268175e56642', 2000, 500),
  ('payment', '3a75d3ca-ad34-46b4-8262-92669fc907bf', 2500, 0),
  ('payment', '3c697d74-9c13-4525-a58a-bfeb6fb9deb5', 2600, 0),
  ('payment', '090d1f74-3bd8-4c03-a3bc-f76445d57bdc', 3000, 0),
  ('payment', '3d38b083-8fbd-4b18-9f37-66388fa053ba', 3000, 0),
  ('payment', '7a26a9d1-82a0-4ef0-9b5b-b5c1d9a41b92', 500, 0);

-- Allow old originals to retain an empty coverage pair. STEP 2 requires real
-- coverage for new receipts through an INSERT guard. Never invent old dates.
ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_receipt_shape;
ALTER TABLE public.student_payments
  ADD CONSTRAINT student_payments_receipt_shape CHECK (
    status = 'deleted'
    OR (
      payment_type = 'due_clearance' AND settles_payment_id IS NOT NULL
      AND start_date IS NULL AND next_due_date IS NULL AND remaining_amount = 0
    )
    OR (
      payment_type <> 'due_clearance' AND settles_payment_id IS NULL
      AND (
        (start_date IS NULL AND next_due_date IS NULL)
        OR (start_date IS NOT NULL AND next_due_date IS NOT NULL AND next_due_date > start_date)
      )
    )
  ) NOT VALID;

DO $$
DECLARE
  item record;
  current_amount integer;
  current_remaining integer;
  marker constant text := 'INR paise. Fee unit cutover 20261112000003/v2 complete.';
BEGIN
  IF col_description('public.students'::regclass,
       (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.students'::regclass AND attname = 'fees')) = marker THEN
    RAISE NOTICE 'Paise cutover already complete; no amounts converted again.';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.student_payments'::regclass
             AND tgname IN ('tr_student_due_clearance', 'tr_guard_student_receipt_amounts') AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Run normalization before installing clearance accounting. Existing accounting requires a separate reviewed cutover.';
  END IF;
  FOR item IN SELECT * FROM fee_unit_cutover LOOP
    IF item.entity = 'student' THEN
      SELECT fees, 0 INTO current_amount, current_remaining FROM public.students WHERE id = item.id;
    ELSE
      SELECT amount, remaining_amount INTO current_amount, current_remaining FROM public.student_payments WHERE id = item.id;
    END IF;
    -- Missing test rows are harmless (also permits an empty development DB).
    IF NOT FOUND THEN CONTINUE; END IF;
    IF current_amount <> item.amount_rupees OR current_remaining <> item.remaining_rupees THEN
      RAISE EXCEPTION 'Audited % % changed (amount %, remaining %). Conversion rolled back; review this row.',
        item.entity, item.id, current_amount, current_remaining;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.student_payments
             WHERE id = '7a26a9d1-82a0-4ef0-9b5b-b5c1d9a41b92'
               AND (payment_type <> 'due_clearance' OR settles_payment_id IS DISTINCT FROM '8b6e9fb0-9777-4bf4-be7f-268175e56642'::uuid)) THEN
    RAISE EXCEPTION 'Legacy test clearance identity changed; normalization aborted.';
  END IF;

  UPDATE public.students s SET fees = m.amount_rupees * 100
  FROM fee_unit_cutover m WHERE m.entity = 'student' AND s.id = m.id;
  UPDATE public.student_payments p
  SET amount = m.amount_rupees * 100, remaining_amount = m.remaining_rupees * 100
  FROM fee_unit_cutover m WHERE m.entity = 'payment' AND p.id = m.id;

  -- Both audited batch defaults are NULL. Preserve them and any newer paise
  -- defaults; there are no audited batch rupee values to convert.
  UPDATE public.students s SET pending_amount = COALESCE((
    SELECT SUM(p.remaining_amount) FROM public.student_payments p
    WHERE p.student_id = s.id AND p.status <> 'deleted'
  ), 0);

  COMMENT ON COLUMN public.students.fees IS 'INR paise. Fee unit cutover 20261112000003/v2 complete.';
  COMMENT ON COLUMN public.students.pending_amount IS 'INR paise; maintained by the student payment balance trigger.';
  COMMENT ON COLUMN public.student_payments.amount IS 'INR paise actually received on this receipt.';
  COMMENT ON COLUMN public.student_payments.remaining_amount IS 'INR paise outstanding on the original receipt; changed by clearance accounting.';
  COMMENT ON COLUMN public.batches.fees IS 'Optional default coaching fee in INR paise.';
END;
$$;

COMMIT;

-- Read-only confirmation. STEP 2 reconciles these balances with clearances.
SELECT id, fees AS fees_paise, pending_amount AS pending_paise FROM public.students ORDER BY id;
