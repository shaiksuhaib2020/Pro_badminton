-- Enrollment fields, optional receipt mode, and exact-balance due clearance.
BEGIN;
ALTER TABLE public.students
  ADD COLUMN address text,
  ADD COLUMN email text,
  ADD COLUMN enroll_days public.day_of_week[] NOT NULL DEFAULT '{}';
ALTER TABLE public.students ADD CONSTRAINT students_enroll_days_no_nulls CHECK (array_position(enroll_days, NULL) IS NULL);
ALTER TABLE public.student_payments ALTER COLUMN payment_method DROP NOT NULL;
-- Replace the old signature so PostgREST resolves calls unambiguously.
DROP FUNCTION IF EXISTS public.record_student_due_clearance(uuid, uuid, integer, date, public.payment_method, text);
CREATE FUNCTION public.record_student_due_clearance(
  p_student_id uuid, p_receipt_id uuid, p_amount integer, p_date date,
  p_payment_method public.payment_method, p_note text DEFAULT '', p_transaction_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  new_id uuid;
  actor_academy uuid;
  target public.student_payments%ROWTYPE;
BEGIN
  actor_academy := public.get_my_academy_id();
  IF actor_academy IS NULL OR public.get_my_role()::text NOT IN ('owner', 'manager', 'accountant', 'receptionist') THEN
    RAISE EXCEPTION 'Not authorized to collect fees';
  END IF;
  SELECT * INTO target FROM public.student_payments
    WHERE id = p_receipt_id AND student_id = p_student_id AND academy_id = actor_academy FOR UPDATE;
  IF NOT FOUND OR target.status = 'deleted' OR target.payment_type = 'due_clearance' THEN
    RAISE EXCEPTION 'Original receipt is missing or not eligible for clearance';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> target.remaining_amount THEN
    RAISE EXCEPTION 'Outstanding balance changed. Refresh and try again.';
  END IF;
  IF p_date IS NULL OR p_payment_method IS NULL THEN
    RAISE EXCEPTION 'Payment date and mode are required for clearance';
  END IF;
  INSERT INTO public.student_payments (
    academy_id, student_id, date, amount, remaining_amount, payment_type,
    settles_payment_id, start_date, next_due_date, payment_method, status, note, transaction_id
  ) VALUES (
    actor_academy, p_student_id, p_date, p_amount, 0, 'due_clearance',
    p_receipt_id, NULL, NULL, p_payment_method, 'active', COALESCE(p_note, ''), NULLIF(btrim(p_transaction_id), '')
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_student_due_clearance(uuid, uuid, integer, date, public.payment_method, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_due_clearance(uuid, uuid, integer, date, public.payment_method, text, text) TO authenticated;
COMMIT;
