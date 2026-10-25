-- ================================================================
-- Badminton Wing — Supabase PostgreSQL Schema
-- Version : 3.0
-- Date    : 11 Oct 2026
-- Scope   : Academies · Branches · Staff · Membership types ·
--           Batches · Students · Student payments · Attendance ·
--           Account entries · Inventory · Court plans ·
--           Court memberships · Court people · Court payments ·
--           Court check-ins · Enquiries · Events · Message logs
--
-- Consolidation notes (v2 → v3):
--   • Staff self-link policy restricted to only set user_id + status
--     via a dedicated RPC function (prevent privilege escalation)
--   • Hard-delete replaced with soft-delete for students and
--     court_memberships; ON DELETE CASCADE changed to RESTRICT
--     for payment/history child tables
--   • court_memberships UPDATE policy: removed accountant (matrix says view)
--   • Cross-academy FK validation triggers added for all tables
--     that reference entities from potentially different academies
--   • sync_student_pending_amount() now uses SECURITY DEFINER with
--     pinned search_path so accountant-created payments update students
--   • get_my_academy_id() and get_my_role() now pin search_path and
--     enforce unique active staff row per user per academy
--   • Enquiry trial_date constraint tightened: NOT NULL for
--     scheduled/completed statuses
--   • Enum mapping comments corrected: student_status uses 'due-soon'
--     (hyphen) as the actual DB value; PostgreSQL does support hyphens
--   • Pending amount trigger now also fires on student_id changes
--   • Currency convention documented: all INTEGER amounts are in the
--     smallest currency unit (paise for INR)
--   • account_entries income entries documented as "other income only"
--   • Denormalized price/balance fields documented with authoritative
--     layer labels
--   • court_payment_entries gains sessions_added column for auditability
--   • attendance_records.records validated by trigger
--   • court_membership_people count enforced by trigger
--   • batches uniqueness changed to per-branch (academy_id, branch_id, name)
--   • Redundant leading-column indexes removed (12 indexes)
--   • staff_members gains UNIQUE constraint on (academy_id, user_id)
--     for active rows to prevent ambiguous RLS helper results
-- ================================================================
-- Run this entire file once in Supabase → SQL Editor.
-- ================================================================


-- ================================================================
-- 0. EXTENSIONS
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================================
-- 1. ENUMS
-- ================================================================


-- ── Coaching / shared ─────────────────────────────────────────

-- Student lifecycle — LOCKED, never add 'on-hold' or 'off-court'
-- NOTE: PostgreSQL enum labels CAN contain hyphens. The app uses
-- 'due-soon' both as the DB value and app value for student_status.
CREATE TYPE student_status AS ENUM (
  'active',
  'due-soon',
  'expired',
  'inactive',
  'dropout'
);

-- Coaching payment classification
CREATE TYPE payment_type AS ENUM (
  'full',
  'partial',
  'advance'
);

-- Shared payment method — used by BOTH student_payments AND
-- court_payment_entries. Do not create a separate court enum.
CREATE TYPE payment_method AS ENUM (
  'cash',
  'upi',
  'card',
  'other'
);

-- Soft-delete lifecycle for student payment rows
CREATE TYPE payment_status AS ENUM (
  'active',
  'inactive',
  'deleted'
);

-- Membership period unit (coaching plans)
CREATE TYPE duration_type AS ENUM (
  'months',
  'days'
);

-- How a coaching student was acquired
CREATE TYPE enrollment_source AS ENUM (
  'walk-in',
  'referral',
  'social-media',
  'other'
);

-- Staff roles
CREATE TYPE staff_role AS ENUM (
  'owner',
  'manager',
  'coach',
  'accountant',
  'receptionist'
);

-- Staff account lifecycle
CREATE TYPE staff_status AS ENUM (
  'active',
  'invited',     -- record created; person has not yet signed up
  'suspended'
);

-- Income vs expense discriminator for account_entries
CREATE TYPE account_entry_type AS ENUM (
  'expense',
  'income'
);

-- WhatsApp message delivery state
CREATE TYPE message_log_status AS ENUM (
  'sent',
  'delivered',
  'read',
  'failed'
);

-- What triggered a WhatsApp message
CREATE TYPE message_trigger_type AS ENUM (
  'manual',
  'auto'
);

-- Day-of-week for batch scheduling
CREATE TYPE day_of_week AS ENUM (
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
);

-- Event / occasion type
CREATE TYPE event_category AS ENUM (
  'tournament',
  'sports-meet',
  'maintenance',
  'holiday',
  'other'
);

-- ── Enquiries ─────────────────────────────────────────────────
-- Trial scheduling state. Replaces the old enquiry_source enum.
CREATE TYPE enquiry_status AS ENUM (
  'not_scheduled',  -- lead received, trial not yet booked   (badge: amber)
  'scheduled',      -- trial date confirmed, not yet attended (badge: blue)
  'completed'       -- trial attended, decision pending       (badge: green)
);

-- ── Court memberships ─────────────────────────────────────────
CREATE TYPE court_membership_status AS ENUM (
  'active',
  'due_soon',       -- monthly: due date approaching
  'expired',        -- monthly: due date passed
  'sessions_low',   -- sessions: remaining ≤ 2
  'exhausted',      -- sessions: remaining = 0
  'inactive',
  'dropout'
);

-- Whether a court plan is time-based or session-based
CREATE TYPE court_plan_type AS ENUM (
  'monthly',
  'sessions'
);

-- Type of payment entry recorded against a court membership
CREATE TYPE court_payment_entry_type AS ENUM (
  'new',            -- initial purchase / enrolment
  'renewal',        -- monthly plan renewal
  'session_topup'   -- buying more sessions
);

-- Soft-delete state for court payment rows
CREATE TYPE court_payment_entry_status AS ENUM (
  'active',
  'deleted'         -- voided; excluded from totals
);


-- ================================================================
-- 2. TABLES
-- Creation order respects FK dependencies.
--
-- CURRENCY CONVENTION (applies to all INTEGER amount fields):
--   All monetary values are stored in the smallest currency unit.
--   For INR this means PAISE (1 rupee = 100 paise).
--   Example: ₹1,500.00 is stored as 150000.
--   This convention applies uniformly to: membership_types.price,
--   batches.fees, students.fees, students.pending_amount,
--   student_payments.amount, student_payments.remaining_amount,
--   court_plans.price, court_memberships.amount_paid,
--   court_memberships.pending_amount, court_payment_entries.amount,
--   account_entries.amount, inventory_items.price,
--   inventory_items.selling_price.
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 2.1  academies
-- Top-level entity. One row per academy.
-- academy_id on every other table points here.
-- Feature toggles live here — academy-level preferences.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE academies (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT        NOT NULL,
  phone                    TEXT,
  address                  TEXT,
  timezone                 TEXT        NOT NULL DEFAULT 'Asia/Kolkata',
  logo_url                 TEXT,

  -- Feature gates
  court_membership_enabled BOOLEAN     NOT NULL DEFAULT false,
  multi_branch_enabled     BOOLEAN     NOT NULL DEFAULT false,
  fee_reminder_enabled     BOOLEAN     NOT NULL DEFAULT true,
  fee_ack_enabled          BOOLEAN     NOT NULL DEFAULT true,
  birthday_wish_enabled    BOOLEAN     NOT NULL DEFAULT true,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────────
-- 2.2  branches
-- Optional multi-center support within a single academy.
-- Visible in UI only when academies.multi_branch_enabled = true.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE branches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  address    TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  is_primary BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT branches_name_per_academy UNIQUE (academy_id, name)
);

-- At most one primary branch per academy
CREATE UNIQUE INDEX idx_branches_one_primary
  ON branches (academy_id)
  WHERE is_primary = true;

-- NOTE: standalone idx_branches_academy_id removed — covered by
-- the leading column of UNIQUE (academy_id, name).


-- ────────────────────────────────────────────────────────────────
-- 2.3  staff_members
-- Linked to auth.users once the invited person signs up.
-- user_id is NULL until they accept the invitation.
--
-- UNIQUENESS: At most one active staff row per user per academy.
-- This prevents get_my_academy_id()/get_my_role() from returning
-- ambiguous results. If multi-academy support is needed later,
-- implement an explicit "active academy" session selection.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE staff_members (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID         NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  user_id    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  name       TEXT         NOT NULL,
  email      TEXT         NOT NULL,
  role       staff_role   NOT NULL DEFAULT 'receptionist',
  branch_id  UUID         REFERENCES branches(id) ON DELETE SET NULL,
  status     staff_status NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT staff_members_email_per_academy UNIQUE (academy_id, email)
);

-- At most one active staff row per user (prevents ambiguous RLS helpers)
CREATE UNIQUE INDEX idx_staff_members_one_active_per_user
  ON staff_members (user_id)
  WHERE user_id IS NOT NULL AND status = 'active';

-- Critical: used inside get_my_academy_id() on every RLS check
CREATE INDEX idx_staff_members_user_id    ON staff_members (user_id);
CREATE INDEX idx_staff_members_academy_id ON staff_members (academy_id);


-- ────────────────────────────────────────────────────────────────
-- 2.4  membership_types
-- Coaching membership plans (Monthly / Quarterly / Annual etc.)
-- PRICE SEMANTICS: This is the current catalogue/list price.
-- When a student enrols, students.fees is COPIED from this value
-- and becomes a historical snapshot — it does NOT auto-update
-- when the plan price changes.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE membership_types (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id    UUID          NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name          TEXT          NOT NULL,
  duration_type duration_type NOT NULL DEFAULT 'months',
  duration      SMALLINT      NOT NULL CHECK (duration > 0),
  price         INTEGER       NOT NULL CHECK (price >= 0),  -- paise
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT membership_types_name_per_academy UNIQUE (academy_id, name)
);

-- NOTE: standalone idx_membership_types_academy_id removed — covered
-- by the leading column of UNIQUE (academy_id, name).


-- ────────────────────────────────────────────────────────────────
-- 2.5  batches
-- Scheduled training groups within an academy.
-- students.batch_id references here (P1 fix: was a name string).
-- UNIQUENESS: per branch (not per academy) to allow the same batch
-- name in different branches of the same academy. When branch_id
-- is NULL, uniqueness is per academy (partial unique index).
-- FEES SEMANTICS: Optional per-batch override. When set, this is
-- the default fee for new students in this batch. It does NOT
-- override an existing student's fees.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE batches (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID          NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  branch_id   UUID          REFERENCES branches(id) ON DELETE SET NULL,
  name        TEXT          NOT NULL,
  description TEXT,                       -- e.g. "6:00 AM – 8:00 AM"
  days        day_of_week[] NOT NULL DEFAULT '{}',
  fees        INTEGER       CHECK (fees IS NULL OR fees >= 0),  -- paise
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Unique batch name per branch (when branch is specified)
CREATE UNIQUE INDEX idx_batches_name_per_branch
  ON batches (academy_id, branch_id, name)
  WHERE branch_id IS NOT NULL;

-- Unique batch name when no branch is assigned
CREATE UNIQUE INDEX idx_batches_name_no_branch
  ON batches (academy_id, name)
  WHERE branch_id IS NULL;

-- NOTE: standalone idx_batches_academy_id removed — covered by
-- the leading column of the above unique indexes.
CREATE INDEX idx_batches_branch_id  ON batches (branch_id);


-- ────────────────────────────────────────────────────────────────
-- 2.6  students
-- Core coaching-student table. Coaching only — court members
-- are a separate entity under court_memberships.
-- start_date is IMMUTABLE (trigger 3.3 enforces this).
-- status is auto-derived from next_due_date (trigger 3.2).
--
-- FEES SEMANTICS: Copied from membership_types.price at enrolment.
-- This is a historical snapshot — intentionally stays fixed when
-- the plan's catalogue price changes. Only updated by explicit
-- user action (e.g. plan change, fee override).
--
-- SOFT-DELETE: Students are never hard-deleted. Set status to
-- 'inactive' or 'dropout' instead. ON DELETE RESTRICT on child
-- tables prevents accidental data loss of payment/attendance history.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE students (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id            UUID              NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name                  TEXT              NOT NULL,
  phone                 TEXT              NOT NULL,
  alternate_phone       TEXT,
  guardian_name         TEXT,
  membership_type_id    UUID              NOT NULL REFERENCES membership_types(id),
  batch_id              UUID              REFERENCES batches(id) ON DELETE SET NULL,
  fees                  INTEGER           NOT NULL CHECK (fees >= 0),  -- paise; snapshot from membership_types.price

  -- IMMUTABLE — original enrollment date, never changes
  start_date            DATE              NOT NULL,

  -- Mutable — advances to previous nextDueDate on each renewal
  membership_start_date DATE              NOT NULL,

  -- When the next payment is due (drives status computation)
  next_due_date         DATE              NOT NULL,

  -- LOCKED values — never add 'on-hold' or 'off-court'
  status                student_status    NOT NULL DEFAULT 'active',

  date_of_birth         DATE,
  enrollment_source     enrollment_source,
  dropout_reason        TEXT,
  dropout_date          DATE,

  -- Outstanding partial-payment balance — always ≥ 0
  -- Kept in sync by trigger 3.4 (sync_student_pending_amount)
  -- Sums remaining_amount of active AND inactive payments (not deleted).
  -- 'inactive' payments still represent outstanding debt.
  pending_amount        INTEGER           NOT NULL DEFAULT 0 CHECK (pending_amount >= 0),  -- paise
  internal_notes        TEXT              NOT NULL DEFAULT '',

  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT students_dropout_date_required
    CHECK (status != 'dropout' OR dropout_date IS NOT NULL),

  CONSTRAINT students_phone_per_academy UNIQUE (academy_id, phone)
);

-- NOTE: standalone idx_students_academy_id removed — covered by
-- the leading column of UNIQUE (academy_id, phone).
CREATE INDEX idx_students_batch_id           ON students (batch_id);
CREATE INDEX idx_students_membership_type_id ON students (membership_type_id);
CREATE INDEX idx_students_status             ON students (status);
CREATE INDEX idx_students_next_due_date      ON students (next_due_date);
CREATE INDEX idx_students_academy_status     ON students (academy_id, status);
CREATE INDEX idx_students_academy_due_date   ON students (academy_id, next_due_date);


-- ────────────────────────────────────────────────────────────────
-- 2.7  student_payments
-- Normalised from Student.paymentHistory[] embedded array.
-- One row = one coaching payment transaction.
-- Void = status 'deleted' (soft delete, never hard-delete).
--
-- student_id is IMMUTABLE after insert (trigger 3.5 enforces this).
-- If a payment was recorded against the wrong student, void it
-- and create a new one.
--
-- ON DELETE RESTRICT prevents orphaning payment history when a
-- student record is removed. Soft-delete/archive students instead.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE student_payments (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID           NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academy_id       UUID           NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  date             DATE           NOT NULL,
  amount           INTEGER        NOT NULL CHECK (amount >= 0),       -- paise
  remaining_amount INTEGER        NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),  -- paise
  payment_type     payment_type   NOT NULL,
  months_covered   SMALLINT       NOT NULL DEFAULT 1 CHECK (months_covered > 0),
  payment_method   payment_method NOT NULL,
  status           payment_status NOT NULL DEFAULT 'active',
  note             TEXT           NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- NOTE: standalone idx_student_payments_student_id removed — covered
-- by the leading column of (student_id, date DESC).
CREATE INDEX idx_student_payments_academy_id  ON student_payments (academy_id);
CREATE INDEX idx_student_payments_date        ON student_payments (date);
CREATE INDEX idx_student_payments_status      ON student_payments (status);
CREATE INDEX idx_student_payments_student_date ON student_payments (student_id, date DESC);

-- Dashboard "Collected This Month" — most frequent revenue query
CREATE INDEX idx_student_payments_academy_date
  ON student_payments (academy_id, date)
  WHERE status != 'deleted';


-- ────────────────────────────────────────────────────────────────
-- 2.8  attendance_records
-- One record per batch per day.
-- records JSONB: { "<student-uuid>": "present" | "absent" }
-- Saving an existing date OVERWRITES the record (upsert pattern).
-- Validated by trigger 3.7 (validate_attendance_records).
-- ────────────────────────────────────────────────────────────────

CREATE TABLE attendance_records (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   UUID        NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  academy_id UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  records    JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT attendance_records_batch_date_unique UNIQUE (batch_id, date)
);

-- NOTE: standalone idx_attendance_academy_id and idx_attendance_batch_id
-- removed — covered by leading columns of (batch_id, date) unique and
-- (batch_id, date DESC) composite.
CREATE INDEX idx_attendance_date        ON attendance_records (date);
CREATE INDEX idx_attendance_batch_date  ON attendance_records (batch_id, date DESC);

-- Enables: WHERE records ? '<student-id>'
CREATE INDEX idx_attendance_records_gin ON attendance_records USING GIN (records);


-- ────────────────────────────────────────────────────────────────
-- 2.9  account_entries
-- Unified table for expenses and "other" income.
-- entry_type = 'expense' | 'income' is the discriminator.
-- All amounts are positive; direction is entry_type.
--
-- REVENUE RULE: This table records ONLY non-operational income
-- (e.g. sponsorships, facility rentals, miscellaneous). Coaching
-- fee revenue lives in student_payments; court fee revenue lives
-- in court_payment_entries. Dashboard P&L must query all three
-- tables — never duplicate operational payments here.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE account_entries (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id     UUID               NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  date           DATE               NOT NULL,
  entry_type     account_entry_type NOT NULL,
  category       TEXT               NOT NULL,
  description    TEXT               NOT NULL,
  amount         INTEGER            NOT NULL CHECK (amount > 0),  -- paise
  payment_method payment_method     NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- NOTE: standalone idx_account_entries_academy_id removed — covered
-- by the leading column of (academy_id, entry_type, date).
CREATE INDEX idx_account_entries_date       ON account_entries (date);
CREATE INDEX idx_account_entries_entry_type ON account_entries (entry_type);

-- Monthly P&L / net balance queries (dashboard + accounts page)
CREATE INDEX idx_account_entries_academy_type_date
  ON account_entries (academy_id, entry_type, date);


-- ────────────────────────────────────────────────────────────────
-- 2.10  inventory_items
-- Product catalogue with stock tracking.
-- Stock classification is derived in the app layer, not stored:
--   0    → Out of Stock
--   1–3  → Critical
--   4–7  → Low
--   > 7  → Adequate
-- ────────────────────────────────────────────────────────────────

CREATE TABLE inventory_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id    UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  sku           TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  unit          TEXT        NOT NULL,
  quantity      INTEGER     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  price         INTEGER     NOT NULL CHECK (price >= 0),          -- paise; cost price
  selling_price INTEGER     NOT NULL CHECK (selling_price >= 0),  -- paise
  icon          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inventory_items_sku_per_academy UNIQUE (academy_id, sku)
);

-- NOTE: standalone idx_inventory_academy_id removed — covered by
-- the leading column of UNIQUE (academy_id, sku).
CREATE INDEX idx_inventory_quantity   ON inventory_items (quantity);

-- Dashboard "Low Stock Alert" widget — only scans rows that qualify
CREATE INDEX idx_inventory_low_stock
  ON inventory_items (academy_id, quantity ASC)
  WHERE quantity <= 7;


-- ────────────────────────────────────────────────────────────────
-- 2.11  court_plans
-- Configurable plan catalogue managed from Settings.
-- Never hard-deleted — use is_active = false to retire a plan.
-- Existing memberships retain the FK reference even after retirement.
-- PRICE SEMANTICS: Current catalogue price. When a membership is
-- created, court_memberships financial fields are COPIED from here
-- and become historical snapshots.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE court_plans (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id      UUID            NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name            TEXT            NOT NULL CHECK (length(trim(name)) > 0),
  plan_type       court_plan_type NOT NULL,
  price           INTEGER         NOT NULL CHECK (price >= 0),  -- paise

  -- Monthly plan fields
  duration_months INTEGER         CHECK (duration_months > 0),

  -- Sessions plan fields
  total_sessions  INTEGER         CHECK (total_sessions > 0),

  -- Grace window (days) before a session pack expires.
  -- NULL means no expiry enforced — matches current app behaviour.
  validity_days   INTEGER         CHECK (validity_days > 0),

  is_active       BOOLEAN         NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT court_plans_name_per_academy UNIQUE (academy_id, name),

  -- Monthly plans must declare a duration
  CONSTRAINT court_plans_monthly_requires_duration
    CHECK (plan_type != 'monthly' OR duration_months IS NOT NULL),

  -- Session plans must declare a session count
  CONSTRAINT court_plans_sessions_requires_count
    CHECK (plan_type != 'sessions' OR total_sessions IS NOT NULL)
);

-- NOTE: standalone idx_court_plans_academy_id removed — covered by
-- the leading columns of UNIQUE (academy_id, name) and (academy_id, is_active).
CREATE INDEX idx_court_plans_academy_active ON court_plans (academy_id, is_active);


-- ────────────────────────────────────────────────────────────────
-- 2.12  court_memberships
-- One row per membership (individual or group, 1–8 people).
-- "Membership" is the billing/account unit.
-- Named people under the membership live in court_membership_people.
--
-- SOFT-DELETE: Court memberships are never hard-deleted. Set status
-- to 'inactive' or 'dropout'. ON DELETE RESTRICT on child tables
-- prevents accidental loss of payment/check-in history.
--
-- BALANCE SEMANTICS:
--   amount_paid    = running total of all active payment entries (app-maintained)
--   pending_amount = outstanding balance (app-maintained)
--   These are denormalized running totals kept in sync by app logic.
--   The authoritative source is the sum of court_payment_entries.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE court_memberships (
  id                    UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id            UUID                    NOT NULL REFERENCES academies(id) ON DELETE CASCADE,

  -- Optional display label for a group (e.g. "Family Pack").
  -- When NULL, UI falls back to contact_name.
  group_name            TEXT,

  -- Primary contact for billing and WhatsApp communications
  contact_name          TEXT                    NOT NULL CHECK (length(trim(contact_name)) > 0),
  contact_phone         TEXT                    NOT NULL CHECK (length(trim(contact_phone)) >= 7),

  -- How many people this membership covers (1–8).
  -- Enforced by trigger 3.8 (enforce_people_count).
  people_count          INTEGER                 NOT NULL DEFAULT 1
                          CHECK (people_count BETWEEN 1 AND 8),

  -- Plan reference; SET NULL if plan is retired (not hard-deleted)
  plan_id               UUID                    REFERENCES court_plans(id) ON DELETE SET NULL,
  plan_type             court_plan_type         NOT NULL,

  -- Monthly plan fields
  duration_months       INTEGER                 CHECK (duration_months > 0),
  membership_start_date DATE,
  next_due_date         DATE,

  -- Sessions plan fields
  total_sessions        INTEGER                 CHECK (total_sessions > 0),
  remaining_sessions    INTEGER                 CHECK (remaining_sessions >= 0),

  joining_date          DATE                    NOT NULL,
  status                court_membership_status NOT NULL DEFAULT 'active',

  -- Denormalised running totals — kept in sync with court_payment_entries
  -- by application logic (no trigger yet; add one when backend is wired).
  -- Authoritative source: SUM of court_payment_entries WHERE status='active'.
  amount_paid           INTEGER                 NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),    -- paise
  pending_amount        INTEGER                 NOT NULL DEFAULT 0 CHECK (pending_amount >= 0), -- paise

  notes                 TEXT,
  created_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

  -- Monthly plans must have both date fields
  CONSTRAINT court_memberships_monthly_fields CHECK (
    plan_type != 'monthly'
    OR (membership_start_date IS NOT NULL AND next_due_date IS NOT NULL)
  ),

  -- Session plans must have both session count fields
  CONSTRAINT court_memberships_sessions_fields CHECK (
    plan_type != 'sessions'
    OR (total_sessions IS NOT NULL AND remaining_sessions IS NOT NULL)
  ),

  -- Sessions remaining can never exceed sessions ever purchased
  CONSTRAINT court_memberships_sessions_remaining CHECK (
    remaining_sessions IS NULL
    OR remaining_sessions <= total_sessions
  )
);

-- NOTE: standalone idx_court_memberships_academy_id removed — covered
-- by the leading column of (academy_id, status).

CREATE INDEX idx_court_memberships_academy_status
  ON court_memberships (academy_id, status);

CREATE INDEX idx_court_memberships_plan_id
  ON court_memberships (plan_id);

CREATE INDEX idx_court_memberships_next_due_date
  ON court_memberships (academy_id, next_due_date)
  WHERE next_due_date IS NOT NULL;

-- sessions-low / exhausted fast lookup
CREATE INDEX idx_court_memberships_sessions
  ON court_memberships (academy_id, remaining_sessions)
  WHERE remaining_sessions IS NOT NULL;

CREATE INDEX idx_court_memberships_created_at
  ON court_memberships (academy_id, created_at DESC);


-- ────────────────────────────────────────────────────────────────
-- 2.13  court_membership_people
-- Optional named individuals within a group membership.
-- Row count per membership_id is enforced by trigger 3.8
-- (enforce_people_count) — no longer app-only validation.
-- Names are deleted and re-added, never edited in place.
--
-- ON DELETE RESTRICT: prevents deleting a court membership that
-- still has people attached. Soft-delete the membership instead.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE court_membership_people (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID        NOT NULL REFERENCES court_memberships(id) ON DELETE RESTRICT,
  academy_id    UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL CHECK (length(trim(name)) > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — rows are deleted and re-inserted, not modified.
);

CREATE INDEX idx_court_membership_people_membership_id
  ON court_membership_people (membership_id);

CREATE INDEX idx_court_membership_people_academy_id
  ON court_membership_people (academy_id);


-- ────────────────────────────────────────────────────────────────
-- 2.14  court_payment_entries
-- Append-only payment ledger for each court membership.
-- Voided entries use status = 'deleted' (soft delete, never hard-delete).
-- Uses the shared payment_method enum — no separate court enum needed.
--
-- ON DELETE RESTRICT: prevents deleting a court membership that
-- still has payment history. Soft-delete the membership instead.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE court_payment_entries (
  id             UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id  UUID                       NOT NULL REFERENCES court_memberships(id) ON DELETE RESTRICT,
  academy_id     UUID                       NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  date           DATE                       NOT NULL,
  amount         INTEGER                    NOT NULL CHECK (amount >= 0),  -- paise
  payment_method payment_method             NOT NULL DEFAULT 'cash',
  entry_type     court_payment_entry_type   NOT NULL,
  status         court_payment_entry_status NOT NULL DEFAULT 'active',

  -- How many sessions were added by this payment (session_topup / new).
  -- NULL for monthly plans or renewals that don't add sessions.
  -- Enables full reconstruction of session history from the payment ledger.
  sessions_added INTEGER                    CHECK (sessions_added IS NULL OR sessions_added > 0),

  -- session_topup entries MUST record how many sessions were added
  CONSTRAINT court_payment_sessions_topup_requires_count CHECK (
    entry_type != 'session_topup' OR sessions_added IS NOT NULL
  ),

  note           TEXT,
  created_at     TIMESTAMPTZ                NOT NULL DEFAULT NOW()
  -- No updated_at — entries are soft-deleted, not modified in place.
);

-- All payments for one membership (Transactions tab on detail page)
CREATE INDEX idx_court_payment_entries_membership_id
  ON court_payment_entries (membership_id, date DESC);

-- Academy-wide: Fee Transactions page (court segment)
CREATE INDEX idx_court_payment_entries_academy_id
  ON court_payment_entries (academy_id, date DESC);

-- Active-only queries (exclude voided entries)
CREATE INDEX idx_court_payment_entries_active
  ON court_payment_entries (membership_id)
  WHERE status = 'active';


-- ────────────────────────────────────────────────────────────────
-- 2.15  court_check_ins
-- Immutable visit log. One row per court visit (group, not per person).
-- "Log session" deducts 1 from remaining_sessions regardless of
-- people_count. The 5-second undo deletes the last row — that is
-- the only permitted DELETE (policy below reflects this).
--
-- ON DELETE RESTRICT: prevents deleting a court membership that
-- still has check-in history. Soft-delete the membership instead.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE court_check_ins (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id     UUID        NOT NULL REFERENCES court_memberships(id) ON DELETE RESTRICT,
  academy_id        UUID        NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  checked_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Remaining sessions after this check-in.
  -- NULL for monthly-plan memberships (no session tracking).
  sessions_after    INTEGER     CHECK (sessions_after >= 0),

  -- Headcount at this visit (captured at check-in time)
  people_checked_in INTEGER     NOT NULL DEFAULT 1
                      CHECK (people_checked_in BETWEEN 1 AND 8),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — check-ins are immutable.
);

CREATE INDEX idx_court_check_ins_membership_id
  ON court_check_ins (membership_id, checked_in_at DESC);

CREATE INDEX idx_court_check_ins_academy_id
  ON court_check_ins (academy_id, checked_in_at DESC);


-- ────────────────────────────────────────────────────────────────
-- 2.16  enquiries
-- Coaching-only lead tracking. Flat — no embedded arrays.
-- Simplified design (v2): tracks only trial scheduling state.
--
-- Status flow:
--   not_scheduled → scheduled (trial date set) → completed (attended)
--   Any status    → DELETE    (lead lost or no longer relevant)
--
-- Removed from v1: age, preferred_batch_id, source, follow_up_date,
--   converted_student_id, enquiry_source enum.
-- Added in v2:    guardian_name, status (enquiry_status enum).
-- ────────────────────────────────────────────────────────────────

CREATE TABLE enquiries (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id    UUID           NOT NULL REFERENCES academies(id) ON DELETE CASCADE,

  name          TEXT           NOT NULL CHECK (length(trim(name)) > 0),
  phone         TEXT           NOT NULL CHECK (length(trim(phone)) >= 7),
  guardian_name TEXT           NOT NULL CHECK (length(trim(guardian_name)) > 0),

  notes         TEXT,

  status        enquiry_status NOT NULL DEFAULT 'not_scheduled',

  -- Required once status advances past not_scheduled.
  -- Must be NULL when status = not_scheduled.
  -- Must be NOT NULL when status = scheduled or completed.
  trial_date    DATE,

  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- DB-enforced contract between status and trial_date:
  --   not_scheduled → trial_date MUST be NULL
  --   scheduled / completed → trial_date MUST be set
  CONSTRAINT enquiries_trial_date_consistency CHECK (
    (status = 'not_scheduled' AND trial_date IS NULL)
    OR (status IN ('scheduled', 'completed') AND trial_date IS NOT NULL)
  )
);

CREATE INDEX idx_enquiries_academy_status
  ON enquiries (academy_id, status);

CREATE INDEX idx_enquiries_academy_created_at
  ON enquiries (academy_id, created_at DESC);

-- Upcoming trial calendar widget
CREATE INDEX idx_enquiries_trial_date
  ON enquiries (academy_id, trial_date)
  WHERE trial_date IS NOT NULL;


-- ────────────────────────────────────────────────────────────────
-- 2.17  events
-- Academy calendar events (tournaments, maintenance days etc.)
-- Managed in Settings → Events.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE events (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  UUID           NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name        TEXT           NOT NULL,
  event_type  event_category NOT NULL DEFAULT 'other',
  date        DATE           NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- NOTE: standalone idx_events_academy_id removed — covered by
-- the leading column of (academy_id, date ASC).
CREATE INDEX idx_events_date       ON events (academy_id, date ASC);


-- ────────────────────────────────────────────────────────────────
-- 2.18  message_logs
-- Append-only WhatsApp send log. No UPDATE or DELETE.
-- template_id matches the string keys in the Communications module
-- (e.g. 'fee-reminder', 'birthday-wish').
-- ────────────────────────────────────────────────────────────────

CREATE TABLE message_logs (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id      UUID                 NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  template_id     TEXT                 NOT NULL,
  sent_at         TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  recipient_count INTEGER              NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  status          message_log_status   NOT NULL DEFAULT 'sent',
  trigger_type    message_trigger_type NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW()
  -- No updated_at — append-only.
);

-- NOTE: standalone idx_message_logs_academy_id removed — covered by
-- the leading column of (academy_id, sent_at DESC).
CREATE INDEX idx_message_logs_sent_at    ON message_logs (academy_id, sent_at DESC);


-- ================================================================
-- 3. TRIGGERS
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 3.1  updated_at auto-maintenance
-- Single reusable function; one trigger per table that has updated_at.
-- Note: the uploaded court/enquiry schema file called this
-- update_updated_at_column() — unified here to update_updated_at().
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Coaching and shared tables
CREATE TRIGGER tr_academies_updated_at
  BEFORE UPDATE ON academies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_membership_types_updated_at
  BEFORE UPDATE ON membership_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_batches_updated_at
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_student_payments_updated_at
  BEFORE UPDATE ON student_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_account_entries_updated_at
  BEFORE UPDATE ON account_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Court tables
CREATE TRIGGER tr_court_plans_updated_at
  BEFORE UPDATE ON court_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_court_memberships_updated_at
  BEFORE UPDATE ON court_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enquiries and academy tables
CREATE TRIGGER tr_enquiries_updated_at
  BEFORE UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ────────────────────────────────────────────────────────────────
-- 3.2  Auto-compute student status from next_due_date
-- Resolves P1: "Status not auto-computed from current date."
-- Fires BEFORE INSERT or when next_due_date changes.
-- Skips 'dropout' and 'inactive' — those are set by user action.
-- IST (Asia/Kolkata) used for date comparison.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_student_status()
RETURNS TRIGGER AS $$
DECLARE
  today DATE;
BEGIN
  today := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

  IF NEW.status IN ('dropout', 'inactive') THEN
    RETURN NEW;
  END IF;

  IF NEW.next_due_date < today THEN
    NEW.status := 'expired';
  ELSIF NEW.next_due_date <= today + INTERVAL '7 days' THEN
    NEW.status := 'due-soon';
  ELSE
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_students_compute_status
  BEFORE INSERT OR UPDATE OF next_due_date ON students
  FOR EACH ROW
  EXECUTE FUNCTION compute_student_status();

-- ── Daily nightly recompute (pg_cron — Pro tier only) ─────────
-- Ensures statuses advance even when no user action touches the row.
-- Uncomment after confirming pg_cron is available on your plan.

 SELECT cron.schedule(
   'recompute-student-statuses',
   '0 1 * * *',   -- 01:00 UTC = 06:30 IST
   $$
     UPDATE students
     SET next_due_date = next_due_date
     WHERE status NOT IN ('dropout', 'inactive');
   $$
 );


-- ────────────────────────────────────────────────────────────────
-- 3.3  Protect students.start_date immutability
-- start_date = original enrollment date. NEVER changes.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_start_date_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date <> OLD.start_date THEN
    RAISE EXCEPTION
      'students.start_date is immutable — original enrollment date '
      'cannot be changed. Delete and re-enroll the student to correct.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_students_immutable_start_date
  BEFORE UPDATE OF start_date ON students
  FOR EACH ROW EXECUTE FUNCTION prevent_start_date_change();


-- ────────────────────────────────────────────────────────────────
-- 3.4  Sync students.pending_amount from student_payments
-- Recomputes pending_amount whenever a payment row is inserted,
-- voided (status → 'deleted'), its remaining_amount changes,
-- or its student_id changes (both old and new student recalculated).
-- Keeps the student ledger always consistent.
--
-- SECURITY DEFINER: Required because the students UPDATE policy
-- does not include 'accountant', but accountants CAN insert
-- payments. Without SECURITY DEFINER, the trigger's UPDATE on
-- students would silently affect zero rows for accountant-created
-- payments, leaving pending_amount stale.
--
-- search_path is pinned to prevent search-path injection attacks.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_student_pending_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_student_id UUID;
  old_student_id    UUID;
  new_pending       INTEGER;
BEGIN
  -- Handle student_id change: recalculate BOTH old and new students
  IF TG_OP = 'UPDATE' AND OLD.student_id IS DISTINCT FROM NEW.student_id THEN
    -- Recalculate old student
    SELECT COALESCE(SUM(remaining_amount), 0)
    INTO new_pending
    FROM public.student_payments
    WHERE student_id = OLD.student_id
      AND status != 'deleted';

    UPDATE public.students
    SET pending_amount = new_pending
    WHERE id = OLD.student_id;

    -- Recalculate new student
    SELECT COALESCE(SUM(remaining_amount), 0)
    INTO new_pending
    FROM public.student_payments
    WHERE student_id = NEW.student_id
      AND status != 'deleted';

    UPDATE public.students
    SET pending_amount = new_pending
    WHERE id = NEW.student_id;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    target_student_id := OLD.student_id;
  ELSE
    target_student_id := NEW.student_id;
  END IF;

  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO new_pending
  FROM public.student_payments
  WHERE student_id = target_student_id
    AND status != 'deleted';

  UPDATE public.students
  SET pending_amount = new_pending
  WHERE id = target_student_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_sync_pending_amount_after_payment
  AFTER INSERT OR UPDATE OF remaining_amount, status, student_id OR DELETE ON student_payments
  FOR EACH ROW EXECUTE FUNCTION sync_student_pending_amount();


-- ────────────────────────────────────────────────────────────────
-- 3.5  Protect student_payments.student_id immutability
-- student_id must not change after insert. If a payment was
-- recorded against the wrong student, void it and create a new one.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_payment_student_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION
      'student_payments.student_id is immutable after insert. '
      'Void this payment and create a new one for the correct student.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_payments_immutable_student_id
  BEFORE UPDATE OF student_id ON student_payments
  FOR EACH ROW EXECUTE FUNCTION prevent_payment_student_id_change();


-- ────────────────────────────────────────────────────────────────
-- 3.6  Cross-academy FK validation
-- Ensures that FK references within the same row all belong to
-- the same academy. Prevents a row in academy A from referencing
-- a branch, batch, membership_type, court_plan, or parent
-- membership from academy B.
--
-- These triggers fire BEFORE INSERT OR UPDATE and validate that
-- the referenced entity's academy_id matches the row's academy_id.
-- ────────────────────────────────────────────────────────────────

-- 3.6a  staff_members.branch_id must belong to the same academy
CREATE OR REPLACE FUNCTION validate_staff_branch_academy()
RETURNS TRIGGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM branches
      WHERE id = NEW.branch_id AND academy_id = NEW.academy_id
    ) THEN
      RAISE EXCEPTION 'staff_members.branch_id (%) does not belong to academy %',
        NEW.branch_id, NEW.academy_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_staff_validate_branch_academy
  BEFORE INSERT OR UPDATE OF branch_id, academy_id ON staff_members
  FOR EACH ROW EXECUTE FUNCTION validate_staff_branch_academy();

-- 3.6b  batches.branch_id must belong to the same academy
CREATE OR REPLACE FUNCTION validate_batch_branch_academy()
RETURNS TRIGGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM branches
      WHERE id = NEW.branch_id AND academy_id = NEW.academy_id
    ) THEN
      RAISE EXCEPTION 'batches.branch_id (%) does not belong to academy %',
        NEW.branch_id, NEW.academy_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_batches_validate_branch_academy
  BEFORE INSERT OR UPDATE OF branch_id, academy_id ON batches
  FOR EACH ROW EXECUTE FUNCTION validate_batch_branch_academy();

-- 3.6c  students: batch_id and membership_type_id must belong to same academy
CREATE OR REPLACE FUNCTION validate_student_fk_academy()
RETURNS TRIGGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NEW.batch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM batches
      WHERE id = NEW.batch_id AND academy_id = NEW.academy_id
    ) THEN
      RAISE EXCEPTION 'students.batch_id (%) does not belong to academy %',
        NEW.batch_id, NEW.academy_id;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM membership_types
    WHERE id = NEW.membership_type_id AND academy_id = NEW.academy_id
  ) THEN
    RAISE EXCEPTION 'students.membership_type_id (%) does not belong to academy %',
      NEW.membership_type_id, NEW.academy_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_students_validate_fk_academy
  BEFORE INSERT OR UPDATE OF batch_id, membership_type_id, academy_id ON students
  FOR EACH ROW EXECUTE FUNCTION validate_student_fk_academy();

-- 3.6d  student_payments.student_id must belong to same academy
CREATE OR REPLACE FUNCTION validate_payment_student_academy()
RETURNS TRIGGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM students
    WHERE id = NEW.student_id AND academy_id = NEW.academy_id
  ) THEN
    RAISE EXCEPTION 'student_payments.student_id (%) does not belong to academy %',
      NEW.student_id, NEW.academy_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_student_payments_validate_academy
  BEFORE INSERT OR UPDATE OF student_id, academy_id ON student_payments
  FOR EACH ROW EXECUTE FUNCTION validate_payment_student_academy();

-- 3.6e  attendance_records.batch_id must belong to same academy
CREATE OR REPLACE FUNCTION validate_attendance_batch_academy()
RETURNS TRIGGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM batches
    WHERE id = NEW.batch_id AND academy_id = NEW.academy_id
  ) THEN
    RAISE EXCEPTION 'attendance_records.batch_id (%) does not belong to academy %',
      NEW.batch_id, NEW.academy_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_attendance_validate_batch_academy
  BEFORE INSERT OR UPDATE OF batch_id, academy_id ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION validate_attendance_batch_academy();

-- 3.6f  court_memberships.plan_id must belong to same academy
CREATE OR REPLACE FUNCTION validate_court_membership_plan_academy()
RETURNS TRIGGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NEW.plan_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM court_plans
      WHERE id = NEW.plan_id AND academy_id = NEW.academy_id
    ) THEN
      RAISE EXCEPTION 'court_memberships.plan_id (%) does not belong to academy %',
        NEW.plan_id, NEW.academy_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_court_memberships_validate_plan_academy
  BEFORE INSERT OR UPDATE OF plan_id, academy_id ON court_memberships
  FOR EACH ROW EXECUTE FUNCTION validate_court_membership_plan_academy();

-- 3.6g  court child tables: membership_id must belong to same academy
CREATE OR REPLACE FUNCTION validate_court_child_membership_academy()
RETURNS TRIGGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM court_memberships
    WHERE id = NEW.membership_id AND academy_id = NEW.academy_id
  ) THEN
    RAISE EXCEPTION '%.membership_id (%) does not belong to academy %',
      TG_TABLE_NAME, NEW.membership_id, NEW.academy_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_court_people_validate_membership_academy
  BEFORE INSERT OR UPDATE OF membership_id, academy_id ON court_membership_people
  FOR EACH ROW EXECUTE FUNCTION validate_court_child_membership_academy();

CREATE TRIGGER tr_court_payments_validate_membership_academy
  BEFORE INSERT OR UPDATE OF membership_id, academy_id ON court_payment_entries
  FOR EACH ROW EXECUTE FUNCTION validate_court_child_membership_academy();

CREATE TRIGGER tr_court_checkins_validate_membership_academy
  BEFORE INSERT OR UPDATE OF membership_id, academy_id ON court_check_ins
  FOR EACH ROW EXECUTE FUNCTION validate_court_child_membership_academy();


-- ────────────────────────────────────────────────────────────────
-- 3.7  Validate attendance_records.records JSONB shape
-- Ensures all keys are valid UUIDs and all values are either
-- 'present' or 'absent'. Does NOT validate that students belong
-- to the batch (that would require cross-table checks that are
-- expensive per-row; app layer validates student-batch membership).
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_attendance_records()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  rec_key   TEXT;
  rec_value TEXT;
BEGIN
  -- Empty records are allowed
  IF NEW.records = '{}'::JSONB THEN
    RETURN NEW;
  END IF;

  FOR rec_key, rec_value IN
    SELECT key, value #>> '{}'
    FROM jsonb_each(NEW.records)
  LOOP
    -- Validate key is a valid UUID format
    BEGIN
      PERFORM rec_key::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'attendance_records.records key "%" is not a valid UUID', rec_key;
    END;

    -- Validate value is 'present' or 'absent'
    IF rec_value NOT IN ('present', 'absent') THEN
      RAISE EXCEPTION 'attendance_records.records value for key "%" must be "present" or "absent", got "%"',
        rec_key, rec_value;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_attendance_validate_records
  BEFORE INSERT OR UPDATE OF records ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION validate_attendance_records();


-- ────────────────────────────────────────────────────────────────
-- 3.8  Enforce court_membership_people count <= people_count
-- Prevents concurrent inserts from exceeding the people_count
-- limit declared on the parent court_membership.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_people_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count INTEGER;
  max_count     INTEGER;
BEGIN
  SELECT people_count INTO max_count
  FROM court_memberships
  WHERE id = NEW.membership_id;

  IF max_count IS NULL THEN
    RAISE EXCEPTION 'court_membership (%) not found', NEW.membership_id;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM court_membership_people
  WHERE membership_id = NEW.membership_id;

  -- current_count includes the row being inserted (AFTER trigger would be too late
  -- for RESTRICT; use BEFORE and count doesn't include NEW yet)
  IF current_count >= max_count THEN
    RAISE EXCEPTION 'court_membership (%) already has % people (max: %)',
      NEW.membership_id, current_count, max_count;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_court_people_enforce_count
  BEFORE INSERT ON court_membership_people
  FOR EACH ROW EXECUTE FUNCTION enforce_people_count();


-- ================================================================
-- 4. RLS HELPER FUNCTIONS
-- SECURITY DEFINER: run as the function owner (postgres), not the
-- calling user. Required because these functions read staff_members
-- which itself has RLS — without SECURITY DEFINER the lookup would
-- be blocked before it can resolve who the user is.
--
-- search_path is pinned to 'public' to prevent search-path injection
-- attacks. All table references are schema-qualified.
--
-- UNIQUENESS: The unique index idx_staff_members_one_active_per_user
-- guarantees at most one active staff row per user, so LIMIT 1
-- always returns a deterministic result.
-- ================================================================

CREATE OR REPLACE FUNCTION get_my_academy_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT academy_id
  FROM   public.staff_members
  WHERE  user_id = auth.uid()
    AND  status  = 'active'
  LIMIT  1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS staff_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
  FROM   public.staff_members
  WHERE  user_id = auth.uid()
    AND  status  = 'active'
  LIMIT  1;
$$;


-- ────────────────────────────────────────────────────────────────
-- 4.1  Staff self-link RPC
-- Dedicated function for invited staff to claim their account.
-- This replaces the permissive staff_self_link UPDATE policy that
-- could allow privilege escalation (user could modify role, status,
-- or academy_id while claiming their invitation).
--
-- This function ONLY sets user_id and status='active' on the row
-- whose email matches the authenticated user AND is currently
-- in 'invited' status with no user_id linked.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION claim_staff_invitation()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email TEXT;
  updated_rows INTEGER;
BEGIN
  -- Get the authenticated user's email
  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = auth.uid();

  IF caller_email IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;

  -- Update ONLY user_id and status on the matching invited row
  UPDATE public.staff_members
  SET user_id = auth.uid(),
      status  = 'active'
  WHERE email   = caller_email
    AND user_id IS NULL
    AND status  = 'invited';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows = 0 THEN
    RAISE EXCEPTION 'No pending invitation found for email %', caller_email;
  END IF;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION claim_staff_invitation() TO authenticated;


-- ================================================================
-- 5. ROW LEVEL SECURITY
-- Permission matrix (from PERMISSION_MATRIX in mock-data.ts):
--
--   Module             owner  manager  coach  accountant  receptionist
--   ────────────────── ─────  ───────  ─────  ──────────  ────────────
--   Dashboard          full   full     view   view        view
--   Students           full   full     view   view        partial
--   Batches            full   full     view   none        none
--   Attendance         full   full     mark   none        none
--   Fee Transactions   full   full     none   full        collect
--   Accounts           full   view     none   full        none
--   Inventory          full   full     none   view        none
--   Court Memberships  full   full     none   view        collect
--   Events             full   full     view   none        view
--   Settings           full   partial  none   none        none
--   Staff Management   full   view     none   none        none
--   Enquiries          full   full     view   view        partial
-- ================================================================

ALTER TABLE academies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches               ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_memberships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_membership_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_payment_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_check_ins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs           ENABLE ROW LEVEL SECURITY;


-- ── academies ─────────────────────────────────────────────────────

CREATE POLICY academies_select ON academies
  FOR SELECT TO authenticated
  USING (id = get_my_academy_id());

CREATE POLICY academies_update ON academies
  FOR UPDATE TO authenticated
  USING     (id = get_my_academy_id() AND get_my_role() = 'owner')
  WITH CHECK (id = get_my_academy_id() AND get_my_role() = 'owner');

-- INSERT/DELETE via service-role key only (provisioning flow).


-- ── branches ──────────────────────────────────────────────────────

CREATE POLICY branches_select ON branches
  FOR SELECT TO authenticated
  USING (academy_id = get_my_academy_id());

CREATE POLICY branches_insert ON branches
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  );

CREATE POLICY branches_update ON branches
  FOR UPDATE TO authenticated
  USING     (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'manager'))
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY branches_delete ON branches
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() = 'owner');


-- ── staff_members ─────────────────────────────────────────────────
-- NOTE: The old staff_self_link UPDATE policy has been REMOVED.
-- Invited staff now call claim_staff_invitation() RPC instead,
-- which safely sets only user_id and status='active'.

CREATE POLICY staff_select ON staff_members
  FOR SELECT TO authenticated
  USING (academy_id = get_my_academy_id());

CREATE POLICY staff_insert ON staff_members
  FOR INSERT TO authenticated
  WITH CHECK (academy_id = get_my_academy_id() AND get_my_role() = 'owner');

CREATE POLICY staff_update ON staff_members
  FOR UPDATE TO authenticated
  USING     (academy_id = get_my_academy_id() AND get_my_role() = 'owner')
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY staff_delete ON staff_members
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() = 'owner');


-- ── membership_types ──────────────────────────────────────────────

CREATE POLICY membership_types_select ON membership_types
  FOR SELECT TO authenticated
  USING (academy_id = get_my_academy_id());

CREATE POLICY membership_types_insert ON membership_types
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  );

CREATE POLICY membership_types_update ON membership_types
  FOR UPDATE TO authenticated
  USING     (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'manager'))
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY membership_types_delete ON membership_types
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() = 'owner');


-- ── batches ───────────────────────────────────────────────────────
-- coach can view; accountant and receptionist cannot

CREATE POLICY batches_select ON batches
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'coach')
  );

CREATE POLICY batches_insert ON batches
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  );

CREATE POLICY batches_update ON batches
  FOR UPDATE TO authenticated
  USING     (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'manager'))
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY batches_delete ON batches
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() = 'owner');


-- ── students ──────────────────────────────────────────────────────
-- receptionist = partial (can add/edit, not delete)
-- NOTE: No DELETE policy for students — soft-delete via status only.
-- The students_delete policy is intentionally omitted to prevent
-- hard-deleting students that have payment/attendance history.

CREATE POLICY students_select ON students
  FOR SELECT TO authenticated
  USING (academy_id = get_my_academy_id());

CREATE POLICY students_insert ON students
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY students_update ON students
  FOR UPDATE TO authenticated
  USING     (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  )
  WITH CHECK (academy_id = get_my_academy_id());

-- students_delete policy intentionally omitted.
-- Use status = 'inactive' or 'dropout' instead of hard-delete.
-- ON DELETE RESTRICT on student_payments provides a safety net
-- even if a DELETE policy is added later.


-- ── student_payments ──────────────────────────────────────────────
-- receptionist = collect (INSERT only, no UPDATE/DELETE)
-- coach = none

CREATE POLICY student_payments_select ON student_payments
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY student_payments_insert ON student_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY student_payments_update ON student_payments
  FOR UPDATE TO authenticated
  USING     (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant')
  )
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY student_payments_delete ON student_payments
  FOR DELETE TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  );


-- ── attendance_records ────────────────────────────────────────────
-- coach = mark (INSERT + UPDATE), accountant/receptionist = none

CREATE POLICY attendance_select ON attendance_records
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'coach')
  );

CREATE POLICY attendance_insert ON attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'coach')
  );

CREATE POLICY attendance_update ON attendance_records
  FOR UPDATE TO authenticated
  USING     (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'coach')
  )
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY attendance_delete ON attendance_records
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'manager'));


-- ── account_entries ───────────────────────────────────────────────
-- manager = view only; coach/receptionist = none

CREATE POLICY account_entries_select ON account_entries
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant')
  );

CREATE POLICY account_entries_insert ON account_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'accountant')
  );

CREATE POLICY account_entries_update ON account_entries
  FOR UPDATE TO authenticated
  USING     (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'accountant')
  )
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY account_entries_delete ON account_entries
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'accountant'));


-- ── inventory_items ───────────────────────────────────────────────
-- accountant = view; coach/receptionist = none

CREATE POLICY inventory_select ON inventory_items
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant')
  );

CREATE POLICY inventory_insert ON inventory_items
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  );

CREATE POLICY inventory_update ON inventory_items
  FOR UPDATE TO authenticated
  USING     (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  )
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY inventory_delete ON inventory_items
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'manager'));


-- ── court_plans ───────────────────────────────────────────────────
-- Managed in Settings — owner and manager only for writes.
-- All roles that can see court memberships need to read plans.

CREATE POLICY court_plans_select ON court_plans
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY court_plans_insert ON court_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  );

CREATE POLICY court_plans_update ON court_plans
  FOR UPDATE TO authenticated
  USING     (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'manager'))
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY court_plans_delete ON court_plans
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() = 'owner');


-- ── court_memberships ─────────────────────────────────────────────
-- Permission matrix: owner=full, manager=full, accountant=VIEW ONLY,
--                    receptionist=collect, coach=none
-- FIX: accountant removed from UPDATE policy (was incorrectly included).
-- The matrix says accountant = view for Court Memberships.

CREATE POLICY court_memberships_select ON court_memberships
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY court_memberships_insert ON court_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  );

-- FIX v3: accountant REMOVED — matrix says view only for Court Memberships
CREATE POLICY court_memberships_update ON court_memberships
  FOR UPDATE TO authenticated
  USING     (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  )
  WITH CHECK (academy_id = get_my_academy_id());

-- No hard-delete policy — soft-delete via status only.
-- ON DELETE RESTRICT on child tables provides a safety net.


-- ── court_membership_people ───────────────────────────────────────
-- Follows the same access as court_memberships.
-- No UPDATE policy — names are deleted and re-inserted.

CREATE POLICY court_membership_people_select ON court_membership_people
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY court_membership_people_insert ON court_membership_people
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY court_membership_people_delete ON court_membership_people
  FOR DELETE TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  );


-- ── court_payment_entries ─────────────────────────────────────────
-- receptionist = collect (INSERT only)
-- accountant = full (can also UPDATE to void)
-- coach = none

CREATE POLICY court_payment_entries_select ON court_payment_entries
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY court_payment_entries_insert ON court_payment_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant', 'receptionist')
  );

-- Soft void (status → 'deleted'): owner / manager / accountant only
CREATE POLICY court_payment_entries_update ON court_payment_entries
  FOR UPDATE TO authenticated
  USING     (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant')
  )
  WITH CHECK (academy_id = get_my_academy_id());

-- No hard-delete policy — soft-delete via status = 'deleted' only.


-- ── court_check_ins ───────────────────────────────────────────────
-- Check-ins are immutable records.
-- The 5-second undo is the only permitted DELETE (owner/manager/receptionist).

CREATE POLICY court_check_ins_select ON court_check_ins
  FOR SELECT TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'accountant', 'receptionist')
  );

CREATE POLICY court_check_ins_insert ON court_check_ins
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  );

-- Undo delete only — no UPDATE policy.
CREATE POLICY court_check_ins_delete ON court_check_ins
  FOR DELETE TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  );


-- ── enquiries ─────────────────────────────────────────────────────
-- Coaching-only leads.
-- receptionist = partial (add/edit, not delete)
-- coach / accountant = view

CREATE POLICY enquiries_select ON enquiries
  FOR SELECT TO authenticated
  USING (academy_id = get_my_academy_id());
  -- All roles can view the enquiry list

CREATE POLICY enquiries_insert ON enquiries
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  );

CREATE POLICY enquiries_update ON enquiries
  FOR UPDATE TO authenticated
  USING     (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  )
  WITH CHECK (academy_id = get_my_academy_id());

-- Delete = mark as lost — owner/manager only
CREATE POLICY enquiries_delete ON enquiries
  FOR DELETE TO authenticated
  USING (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  );


-- ── events ────────────────────────────────────────────────────────
-- Visible to all roles; writable by owner and manager only

CREATE POLICY events_select ON events
  FOR SELECT TO authenticated
  USING (academy_id = get_my_academy_id());

CREATE POLICY events_insert ON events
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager')
  );

CREATE POLICY events_update ON events
  FOR UPDATE TO authenticated
  USING     (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'manager'))
  WITH CHECK (academy_id = get_my_academy_id());

CREATE POLICY events_delete ON events
  FOR DELETE TO authenticated
  USING (academy_id = get_my_academy_id() AND get_my_role() IN ('owner', 'manager'));


-- ── message_logs ──────────────────────────────────────────────────
-- Append-only — no UPDATE or DELETE policies.

CREATE POLICY message_logs_select ON message_logs
  FOR SELECT TO authenticated
  USING (academy_id = get_my_academy_id());

CREATE POLICY message_logs_insert ON message_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    academy_id = get_my_academy_id()
    AND get_my_role() IN ('owner', 'manager', 'receptionist')
  );


-- Changes in columns 
BEGIN;

ALTER TABLE public.court_memberships
  DROP COLUMN group_name,
  DROP COLUMN membership_start_date,
  DROP COLUMN next_due_date,
  DROP COLUMN duration_months;

ALTER TABLE public.court_memberships
  RENAME COLUMN joining_date TO start_date;

ALTER TABLE public.court_memberships
  ADD COLUMN end_date date,
  ADD COLUMN address text,
  ADD COLUMN email text;

ALTER TABLE public.court_memberships
  DROP CONSTRAINT IF EXISTS court_memberships_monthly_fields;

ALTER TABLE public.court_memberships
  ADD CONSTRAINT court_memberships_monthly_fields
  CHECK (plan_type <> 'monthly' OR start_date IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_court_memberships_end_date
  ON public.court_memberships (academy_id, end_date)
  WHERE end_date IS NOT NULL;

COMMIT;

ALTER TABLE court_payment_entries
  ADD COLUMN paying_now INTEGER,    -- amount paid today in a partial payment
  ADD COLUMN partial_due INTEGER;   -- remaining balance from that entry
  

-- ================================================================
-- 6. POST-DEPLOYMENT NOTES
-- ================================================================

-- ── App ↔ DB enum value mapping ────────────────────────────────
-- PostgreSQL enum labels CAN contain hyphens. The following enums
-- use underscores as DB values because they were designed that way,
-- NOT because of a PostgreSQL limitation:
--
--   DB value           App value        Table
--   ──────────────     ──────────────   ──────────────────────
--   due_soon           due-soon         court_memberships.status
--   sessions_low       sessions-low     court_memberships.status
--   session_topup      session-topup    court_payment_entries.entry_type
--   not_scheduled      not-scheduled    enquiries.status
--
-- EXCEPTION: student_status uses 'due-soon' (with hyphen) as the
-- actual DB value. Do NOT apply the generic replace(/-/g, '_')
-- conversion to student_status — it would produce 'due_soon' which
-- is NOT a valid label in that enum.
--
-- Recommended approach: Use per-enum mapping objects in TypeScript
-- instead of generic string replacement. Example:
--
--   const COURT_STATUS_TO_DB: Record<string, string> = {
--     'due-soon':     'due_soon',
--     'sessions-low': 'sessions_low',
--   };
--   const COURT_STATUS_TO_APP: Record<string, string> = {
--     'due_soon':     'due-soon',
--     'sessions_low': 'sessions-low',
--   };

-- ── Provision the first academy (one-time, service-role key) ───
-- After running this schema, use the Supabase service-role key
-- server-side to INSERT one row into academies and one 'owner'
-- row into staff_members. Never from the client.
--
-- INSERT INTO academies (name, phone, timezone)
-- VALUES ('Badminton Wing', '+91-XXXXXXXXXX', 'Asia/Kolkata')
-- RETURNING id;
--
-- INSERT INTO staff_members (academy_id, user_id, name, email, role, status)
-- VALUES ('<id from above>', '<auth.uid>', 'Owner Name',
--         'owner@badmintonwing.in', 'owner', 'active');

-- ── Staff invitation flow ──────────────────────────────────────
-- When an invited staff member signs up:
--   1. They create an auth account (email + password) via Supabase Auth.
--   2. After signing in, the app calls: SELECT claim_staff_invitation();
--   3. The RPC sets user_id and status='active' on the matching row.
--   4. Subsequent requests use get_my_academy_id()/get_my_role()
--      which now resolve correctly via the linked user_id.

-- ── Supabase Realtime (optional) ───────────────────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
-- ALTER PUBLICATION supabase_realtime ADD TABLE students;
-- ALTER PUBLICATION supabase_realtime ADD TABLE court_memberships;

-- ── pg_cron (Pro tier only) ────────────────────────────────────
-- Uncomment the cron.schedule() call in Section 3.2 above once
-- pg_cron is confirmed available (Dashboard → Extensions).

-- ================================================================
-- END OF SCHEMA
-- ================================================================
