-- ==============================================================================
-- Migration: 20261112000002_decouple_fees_and_enrollment.sql
-- Purpose:
--   1. Decouple student enrollment from fee receipts.
--   2. Make student_payments the SOLE source of truth for membership coverage.
--   3. Drop students.next_due_date and clean up all obsolete status/sync triggers.
--   4. Introduce student_payments.settles_payment_id for due clearance tracking.
--   5. Add shape constraint, audit indexes, and student_membership view.
-- ==============================================================================

BEGIN;

-- 1. Student table defaults and immutable joining_date
ALTER TABLE public.students 
  ALTER COLUMN fees SET DEFAULT 0;

DROP TRIGGER IF EXISTS tr_students_immutable_start_date ON public.students;
DROP FUNCTION IF EXISTS public.prevent_start_date_change();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.students RENAME COLUMN start_date TO joining_date;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_joining_date_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.joining_date <> OLD.joining_date THEN
    RAISE EXCEPTION
      'students.joining_date is immutable — original enrollment date cannot be changed. Student: %',
      OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_students_immutable_joining_date ON public.students;
CREATE TRIGGER tr_students_immutable_joining_date
  BEFORE UPDATE OF joining_date ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.prevent_joining_date_change();

-- 2. In student_payments: rename coverage columns to start_date and next_due_date
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_payments' AND column_name = 'covered_from'
  ) THEN
    ALTER TABLE public.student_payments RENAME COLUMN covered_from TO start_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_payments' AND column_name = 'covered_until'
  ) THEN
    ALTER TABLE public.student_payments RENAME COLUMN covered_until TO next_due_date;
  END IF;
END $$;

-- 3. Remove all triggers and functions that read/touch students.next_due_date
DROP TRIGGER  IF EXISTS tr_sync_student_next_due_date ON public.student_payments;
DROP FUNCTION IF EXISTS public.sync_student_next_due_date_from_payment();
DROP TRIGGER  IF EXISTS tr_students_compute_status ON public.students;
DROP FUNCTION IF EXISTS public.compute_student_status();
DROP FUNCTION IF EXISTS public.sync_student_statuses();

-- 4. Drop next_due_date column from students (auto-drops its dependent indexes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'next_due_date'
  ) THEN
    ALTER TABLE public.students DROP COLUMN next_due_date;
  END IF;
END $$;

-- Reset transient due-soon/expired statuses to active; status in DB now tracks administrative state
UPDATE public.students 
SET status = 'active' 
WHERE status IN ('due-soon', 'expired');

-- 5. Receipt model: settles_payment_id for due clearance
ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS settles_payment_id UUID
    REFERENCES public.student_payments(id) ON DELETE RESTRICT;

-- Constraint on receipt shape (NOT VALID allows existing historical data to remain valid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_payments_receipt_shape'
  ) THEN
    ALTER TABLE public.student_payments ADD CONSTRAINT student_payments_receipt_shape CHECK (
      (payment_type = 'due_clearance' AND settles_payment_id IS NOT NULL
         AND start_date IS NULL AND next_due_date IS NULL AND remaining_amount = 0)
      OR
      (payment_type <> 'due_clearance' AND settles_payment_id IS NULL
         AND start_date IS NOT NULL AND next_due_date > start_date)
    ) NOT VALID;
  END IF;
END $$;

-- 6. Receipt indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_payments_one_receipt_per_period
  ON public.student_payments (student_id, start_date)
  WHERE status = 'active' AND payment_type <> 'due_clearance';

CREATE INDEX IF NOT EXISTS idx_student_payments_latest_receipt
  ON public.student_payments (student_id, start_date DESC)
  WHERE status = 'active' AND payment_type <> 'due_clearance';

CREATE INDEX IF NOT EXISTS idx_student_payments_settles
  ON public.student_payments (settles_payment_id) 
  WHERE settles_payment_id IS NOT NULL;

-- 7. Membership view: latest active receipt per student (invoker security for RLS)
CREATE OR REPLACE VIEW public.student_membership
WITH (security_invoker = true) AS
SELECT DISTINCT ON (student_id)
       student_id, 
       id AS receipt_id, 
       start_date, 
       next_due_date
FROM public.student_payments
WHERE status = 'active' AND payment_type <> 'due_clearance'
ORDER BY student_id, start_date DESC, created_at DESC;

COMMIT;

