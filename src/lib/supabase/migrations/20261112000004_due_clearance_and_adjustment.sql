-- STEP 2 OF 2. Run AFTER the revised 20261112000003, with app writes paused.
-- Compatible with the already-installed modal-fields migration and its current
-- seven-argument RPC. Do not rerun 20261113000001_modal_fields.sql.
-- Development policy: apply existing clearances oldest first; void duplicate/
-- excess test clearances instead of making balances negative. Repair runs once.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE public.students, public.student_payments IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  original public.student_payments%ROWTYPE;
  clearance public.student_payments%ROWTYPE;
  balance integer;
BEGIN
  IF col_description('public.students'::regclass,
       (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.students'::regclass AND attname = 'fees'))
       IS DISTINCT FROM 'INR paise. Fee unit cutover 20261112000003/v2 complete.' THEN
    RAISE EXCEPTION 'First run the revised 20261112000003_normalize_legacy_fee_units.sql.';
  END IF;
  IF col_description('public.student_payments'::regclass,
       (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.student_payments'::regclass AND attname = 'settles_payment_id'))
       = 'Original receipt settled by a clearance. Development repair 20261112000004/v2 complete.' THEN
    RAISE NOTICE 'Existing clearances already reconciled; repair will not be replayed.';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.student_payments'::regclass
             AND tgname = 'tr_student_due_clearance' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Clearance accounting exists without this repair marker; aborting to avoid double deductions.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.student_payments c
    LEFT JOIN public.student_payments o ON o.id = c.settles_payment_id
    WHERE c.payment_type = 'due_clearance' AND c.status <> 'deleted'
      AND (o.id IS NULL OR o.student_id <> c.student_id OR o.academy_id <> c.academy_id
           OR o.payment_type = 'due_clearance' OR o.status = 'deleted' OR c.amount <= 0)
  ) THEN
    RAISE EXCEPTION 'Invalid existing clearance reference; repair rolled back.';
  END IF;
  FOR original IN
    SELECT o.* FROM public.student_payments o
    WHERE o.payment_type <> 'due_clearance' AND o.status <> 'deleted'
      AND EXISTS (SELECT 1 FROM public.student_payments c
                  WHERE c.settles_payment_id = o.id AND c.payment_type = 'due_clearance' AND c.status <> 'deleted')
    ORDER BY o.id FOR UPDATE
  LOOP
    balance := original.remaining_amount;
    FOR clearance IN
      SELECT * FROM public.student_payments
      WHERE settles_payment_id = original.id AND payment_type = 'due_clearance' AND status <> 'deleted'
      ORDER BY created_at, id FOR UPDATE
    LOOP
      IF clearance.amount <= balance THEN
        balance := balance - clearance.amount;
      ELSE
        -- Deduction/reversal trigger is absent during this initial repair.
        UPDATE public.student_payments SET status = 'deleted',
          note = concat_ws(E'\n', NULLIF(note, ''), 'Development repair 20261112000004/v2: voided duplicate/excess test clearance.')
        WHERE id = clearance.id;
      END IF;
    END LOOP;
    UPDATE public.student_payments SET remaining_amount = balance WHERE id = original.id;
  END LOOP;
  COMMENT ON COLUMN public.student_payments.settles_payment_id IS
    'Original receipt settled by a clearance. Development repair 20261112000004/v2 complete.';
END;
$$;

DROP TRIGGER IF EXISTS tr_student_due_clearance ON public.student_payments;
DROP TRIGGER IF EXISTS tr_guard_student_receipt_amounts ON public.student_payments;
DROP TRIGGER IF EXISTS tr_guard_student_receipt_due_date ON public.student_payments;

CREATE OR REPLACE VIEW public.student_membership
WITH (security_invoker = true) AS
SELECT DISTINCT ON (student_id) student_id, id AS receipt_id, start_date, next_due_date
FROM public.student_payments
WHERE status = 'active' AND payment_type <> 'due_clearance'
  AND start_date IS NOT NULL AND next_due_date IS NOT NULL
ORDER BY student_id, start_date DESC, created_at DESC;

CREATE OR REPLACE FUNCTION public.apply_student_due_clearance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target public.student_payments%ROWTYPE;
  previous_authorization text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_type <> 'due_clearance' THEN RETURN NEW; END IF;
    IF NEW.status <> 'active' OR NEW.amount <= 0 OR NEW.settles_payment_id IS NULL
       OR NEW.remaining_amount <> 0 OR NEW.payment_method IS NULL THEN
      RAISE EXCEPTION 'Clearance requires an active positive receipt, original receipt, and payment mode';
    END IF;
    SELECT * INTO target FROM public.student_payments WHERE id = NEW.settles_payment_id FOR UPDATE;
    IF NOT FOUND OR target.student_id <> NEW.student_id OR target.academy_id <> NEW.academy_id
       OR target.payment_type = 'due_clearance' OR target.status = 'deleted' THEN
      RAISE EXCEPTION 'Original receipt is missing or not eligible for clearance';
    END IF;
    IF NEW.amount <> target.remaining_amount THEN
      RAISE EXCEPTION 'Outstanding balance changed. Refresh and try again.';
    END IF;
    previous_authorization := current_setting('app.due_clearance_balance_change', true);
    PERFORM set_config('app.due_clearance_balance_change', 'authorized', true);
    UPDATE public.student_payments SET remaining_amount = remaining_amount - NEW.amount WHERE id = target.id;
    PERFORM set_config('app.due_clearance_balance_change', COALESCE(previous_authorization, ''), true);
    RETURN NEW;
  END IF;
  IF OLD.payment_type = 'due_clearance' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT ((OLD.status = 'active' AND NEW.status = 'inactive')
              OR (OLD.status IN ('active', 'inactive') AND NEW.status = 'deleted')) THEN
        RAISE EXCEPTION 'Invalid due clearance status change';
      END IF;
      IF NEW.status = 'deleted' THEN
        SELECT * INTO target FROM public.student_payments WHERE id = OLD.settles_payment_id FOR UPDATE;
        IF NOT FOUND OR target.status = 'deleted' THEN RAISE EXCEPTION 'Original receipt is unavailable'; END IF;
        previous_authorization := current_setting('app.due_clearance_balance_change', true);
        PERFORM set_config('app.due_clearance_balance_change', 'authorized', true);
        UPDATE public.student_payments SET remaining_amount = remaining_amount + OLD.amount WHERE id = target.id;
        PERFORM set_config('app.due_clearance_balance_change', COALESCE(previous_authorization, ''), true);
      END IF;
    END IF;
  ELSIF NEW.status = 'deleted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF EXISTS (SELECT 1 FROM public.student_payments
               WHERE settles_payment_id = OLD.id AND payment_type = 'due_clearance' AND status <> 'deleted') THEN
      RAISE EXCEPTION 'Void active due clearances before voiding their original receipt';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_student_receipt_amounts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Void receipts instead of deleting them'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.amount <= 0 OR NEW.status <> 'active' THEN RAISE EXCEPTION 'New receipts must be active and positive'; END IF;
    IF NEW.payment_type <> 'due_clearance' AND
       (NEW.start_date IS NULL OR NEW.next_due_date IS NULL OR NEW.next_due_date <= NEW.start_date) THEN
      RAISE EXCEPTION 'New fee receipts require a coverage start and a later next due date';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.settles_payment_id IS DISTINCT FROM OLD.settles_payment_id
     OR NEW.payment_type IS DISTINCT FROM OLD.payment_type OR NEW.academy_id IS DISTINCT FROM OLD.academy_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.start_date IS DISTINCT FROM OLD.start_date THEN
    RAISE EXCEPTION 'Receipt identity, amount, and coverage start cannot be edited; void and reissue it';
  END IF;
  IF OLD.status = 'deleted' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Voided receipts cannot be restored; issue a new receipt';
  END IF;
  IF NEW.remaining_amount IS DISTINCT FROM OLD.remaining_amount AND
     (pg_trigger_depth() < 2 OR current_setting('app.due_clearance_balance_change', true) IS DISTINCT FROM 'authorized') THEN
    RAISE EXCEPTION 'Outstanding balance changes require a due clearance receipt';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_student_receipt_due_date()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.next_due_date IS DISTINCT FROM OLD.next_due_date AND
     current_setting('app.membership_due_adjustment', true) IS DISTINCT FROM 'authorized' THEN
    RAISE EXCEPTION 'Use the audited due-date adjustment action';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_guard_student_receipt_amounts
  BEFORE INSERT OR UPDATE OR DELETE ON public.student_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_receipt_amounts();
CREATE TRIGGER tr_guard_student_receipt_due_date
  BEFORE UPDATE OF next_due_date ON public.student_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_receipt_due_date();
CREATE TRIGGER tr_student_due_clearance
  BEFORE INSERT OR UPDATE OF status ON public.student_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_student_due_clearance();

-- Lock the student before summing receipts to serialize aggregate updates.
CREATE OR REPLACE FUNCTION public.sync_student_pending_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_student_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN target_student_id := OLD.student_id;
  ELSE target_student_id := NEW.student_id; END IF;
  PERFORM 1 FROM public.students WHERE id = target_student_id FOR UPDATE;
  UPDATE public.students s SET pending_amount = COALESCE((
    SELECT SUM(p.remaining_amount) FROM public.student_payments p
    WHERE p.student_id = target_student_id AND p.status <> 'deleted'
  ), 0) WHERE s.id = target_student_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tr_sync_pending_amount_after_payment ON public.student_payments;
CREATE TRIGGER tr_sync_pending_amount_after_payment
  AFTER INSERT OR UPDATE OF remaining_amount, status, student_id OR DELETE ON public.student_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_pending_amount();

-- Remove obsolete overload; keep the current application contract.
DROP FUNCTION IF EXISTS public.record_student_due_clearance(uuid, uuid, integer, date, public.payment_method, text);
CREATE OR REPLACE FUNCTION public.record_student_due_clearance(
  p_student_id uuid, p_receipt_id uuid, p_amount integer, p_date date,
  p_payment_method public.payment_method, p_note text DEFAULT '', p_transaction_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
  actor_academy uuid;
  actor_role text;
  target public.student_payments%ROWTYPE;
BEGIN
  actor_academy := public.get_my_academy_id();
  actor_role := public.get_my_role()::text;
  IF actor_academy IS NULL OR actor_role IS NULL OR actor_role NOT IN ('owner', 'manager', 'accountant', 'receptionist') THEN
    RAISE EXCEPTION 'Not authorized to collect fees';
  END IF;
  -- SECURITY DEFINER permits the row lock for receptionist callers, whose
  -- table policy intentionally denies direct UPDATE. Scope every row to the
  -- authenticated actor's academy and allowed role before performing writes.
  -- Fail closed if a future incomplete deployment removes the deduction trigger.
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.student_payments'::regclass
                 AND tgname = 'tr_student_due_clearance' AND tgenabled IN ('O', 'A')
                 AND tgfoid = 'public.apply_student_due_clearance()'::regprocedure) THEN
    RAISE EXCEPTION 'Due clearance accounting is unavailable; collection was not recorded';
  END IF;
  SELECT * INTO target FROM public.student_payments
    WHERE id = p_receipt_id AND student_id = p_student_id AND academy_id = actor_academy FOR UPDATE;
  IF NOT FOUND OR target.status = 'deleted' OR target.payment_type = 'due_clearance' THEN
    RAISE EXCEPTION 'Original receipt is missing or not eligible for clearance';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> target.remaining_amount THEN
    RAISE EXCEPTION 'Outstanding balance changed. Refresh and try again.';
  END IF;
  IF p_date IS NULL OR p_payment_method IS NULL THEN RAISE EXCEPTION 'Payment date and mode are required for clearance'; END IF;
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
REVOKE ALL ON FUNCTION public.record_student_due_clearance(uuid, uuid, integer, date, public.payment_method, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_student_due_clearance(uuid, uuid, integer, date, public.payment_method, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.adjust_student_receipt_due_date(
  p_student_id uuid, p_next_due_date date, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target public.student_payments%ROWTYPE;
  actor_role text;
  actor_academy uuid;
  audit_line text;
  previous_authorization text;
BEGIN
  actor_role := public.get_my_role()::text;
  actor_academy := public.get_my_academy_id();
  IF actor_role IS NULL OR actor_role NOT IN ('owner', 'manager') OR actor_academy IS NULL THEN
    RAISE EXCEPTION 'Only owners and managers can adjust due dates';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN RAISE EXCEPTION 'An adjustment reason is required'; END IF;
  SELECT * INTO target FROM public.student_payments
    WHERE student_id = p_student_id AND academy_id = actor_academy AND status = 'active'
      AND payment_type <> 'due_clearance' AND start_date IS NOT NULL AND next_due_date IS NOT NULL
    ORDER BY start_date DESC, created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active membership receipt found'; END IF;
  IF p_next_due_date IS NULL OR p_next_due_date <= target.start_date THEN RAISE EXCEPTION 'Next due date must be after coverage start'; END IF;
  IF p_next_due_date = target.next_due_date THEN RAISE EXCEPTION 'The next due date is unchanged'; END IF;
  audit_line := format('Due date adjusted from %s to %s by %s on %s. Reason: %s',
    target.next_due_date, p_next_due_date, auth.uid(), (now() AT TIME ZONE 'Asia/Kolkata')::date, btrim(p_reason));
  previous_authorization := current_setting('app.membership_due_adjustment', true);
  PERFORM set_config('app.membership_due_adjustment', 'authorized', true);
  UPDATE public.student_payments SET next_due_date = p_next_due_date,
    note = concat_ws(E'\n', NULLIF(target.note, ''), audit_line) WHERE id = target.id;
  PERFORM set_config('app.membership_due_adjustment', COALESCE(previous_authorization, ''), true);
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_student_receipt_due_date(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_student_receipt_due_date(uuid, date, text) TO authenticated;

UPDATE public.students s SET pending_amount = COALESCE((
  SELECT SUM(p.remaining_amount) FROM public.student_payments p
  WHERE p.student_id = s.id AND p.status <> 'deleted'
), 0);
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Read-only confirmation: both audited partial originals should now be zero;
-- the later duplicate test clearance should have status = deleted.
SELECT id, payment_type, amount AS amount_paise, remaining_amount AS remaining_paise, status, settles_payment_id
FROM public.student_payments
WHERE payment_type IN ('partial', 'due_clearance') ORDER BY created_at, id;
