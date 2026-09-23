-- ==============================================================================
-- Pro Badminton (EzyFee) — Production Database Schema Definition
-- Database Target: PostgreSQL / Supabase SQL Editor
-- Extracted & Updated: 18 Sep 2026
--
-- EXCLUSION NOTICE:
-- Upcoming Events, Inventory, and Accounts (Expenses & Income) have been
-- COMPLETELY EXCLUDED per user requirements.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. ENUM TYPE DEFINITIONS
-- ==============================================================================

-- Student status lifecycle enum (Updated per latest spec: inactive & dropout)
CREATE TYPE student_status AS ENUM (
  'active',
  'due-soon',
  'expired',
  'inactive',
  'dropout'
);

-- Court Member status lifecycle enum
CREATE TYPE court_member_status AS ENUM (
  'active',
  'due-soon',
  'expired',
  'sessions-low',
  'exhausted',
  'inactive',
  'dropout'
);

-- Duration unit enum for membership types
CREATE TYPE duration_unit AS ENUM (
  'months',
  'days'
);

-- Court plan category enum
CREATE TYPE plan_category AS ENUM (
  'monthly',
  'sessions'
);

-- Shared payment method enum
CREATE TYPE payment_method_enum AS ENUM (
  'cash',
  'upi',
  'card',
  'other'
);

-- Student payment type classification
CREATE TYPE student_payment_type AS ENUM (
  'full',
  'partial',
  'advance'
);

-- Court payment entry classification
CREATE TYPE court_payment_entry_type AS ENUM (
  'new',
  'renewal',
  'session-topup'
);

-- Payment record activity status
CREATE TYPE record_status AS ENUM (
  'active',
  'inactive',
  'deleted'
);

-- Attendance status
CREATE TYPE attendance_status AS ENUM (
  'present',
  'absent'
);


-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Table: settings (Facility & System Configuration)
-- ------------------------------------------------------------------------------
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_name VARCHAR(255) NOT NULL DEFAULT 'EzyFee',
  court_membership_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: membership_types (Coaching Membership Plans)
-- ------------------------------------------------------------------------------
CREATE TABLE membership_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  duration_type duration_unit NOT NULL DEFAULT 'months',
  duration INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: batches (Coaching Batches)
-- ------------------------------------------------------------------------------
CREATE TABLE batches (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  days TEXT[] NOT NULL DEFAULT '{}',
  fees NUMERIC(10, 2) NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: students (Coaching Students Master)
-- ------------------------------------------------------------------------------
CREATE TABLE students (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20) NULL DEFAULT '',
  guardian_name VARCHAR(255) NULL DEFAULT '',
  membership_type_id VARCHAR(50) NOT NULL REFERENCES membership_types(id) ON DELETE RESTRICT,
  batch_id VARCHAR(50) NULL REFERENCES batches(id) ON DELETE SET NULL,
  current_batch VARCHAR(100) NOT NULL,
  fees NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  membership_start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  status student_status NOT NULL DEFAULT 'active',
  pending_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  internal_notes TEXT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: student_payments (Coaching Fee Ledger & Payment Entries)
-- ------------------------------------------------------------------------------
CREATE TABLE student_payments (
  id VARCHAR(50) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10, 2) NOT NULL,
  remaining_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_type student_payment_type NOT NULL DEFAULT 'full',
  months_covered INTEGER NOT NULL DEFAULT 1,
  payment_method payment_method_enum NOT NULL DEFAULT 'upi',
  status record_status NOT NULL DEFAULT 'active',
  note TEXT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: attendance_records (Batch Daily Attendance Header)
-- ------------------------------------------------------------------------------
CREATE TABLE attendance_records (
  id VARCHAR(100) PRIMARY KEY, -- Compound format: batchId-yyyy-MM-dd
  batch_id VARCHAR(50) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_batch_date UNIQUE (batch_id, date)
);

-- ------------------------------------------------------------------------------
-- Table: student_attendance (Per-Student Attendance Detail Mapping)
-- ------------------------------------------------------------------------------
CREATE TABLE student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id VARCHAR(100) NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_record_student UNIQUE (attendance_record_id, student_id)
);

-- ------------------------------------------------------------------------------
-- Table: court_plans (Court Membership Plans)
-- ------------------------------------------------------------------------------
CREATE TABLE court_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan_type plan_category NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  duration_months INTEGER NULL,
  total_sessions INTEGER NULL,
  validity_days INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: court_members (Court Members Master)
-- ------------------------------------------------------------------------------
CREATE TABLE court_members (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  plan_id VARCHAR(50) NULL REFERENCES court_plans(id) ON DELETE SET NULL,
  plan_type plan_category NOT NULL DEFAULT 'monthly',
  duration_months INTEGER NULL,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  membership_start_date DATE NULL,
  next_due_date DATE NULL,
  total_sessions INTEGER NULL,
  remaining_sessions INTEGER NULL,
  status court_member_status NOT NULL DEFAULT 'active',
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  pending_amount NUMERIC(10, 2) NULL DEFAULT 0.00,
  notes TEXT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: court_payments (Court Membership Payment Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE court_payments (
  id VARCHAR(50) PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL REFERENCES court_members(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method payment_method_enum NOT NULL DEFAULT 'upi',
  entry_type court_payment_entry_type NOT NULL DEFAULT 'new',
  status record_status NOT NULL DEFAULT 'active',
  note TEXT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table: court_check_ins (Session Member Check-In Log)
-- ------------------------------------------------------------------------------
CREATE TABLE court_check_ins (
  id VARCHAR(50) PRIMARY KEY,
  member_id VARCHAR(50) NOT NULL REFERENCES court_members(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sessions_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- 3. INDEXES FOR HIGH-FREQUENCY QUERIES
-- ==============================================================================

-- Students lookup & filtering
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_batch ON students(current_batch);
CREATE INDEX idx_students_next_due ON students(next_due_date);
CREATE INDEX idx_students_phone ON students(phone);

-- Student payments lookup & reports
CREATE INDEX idx_student_payments_student ON student_payments(student_id);
CREATE INDEX idx_student_payments_date ON student_payments(date);
CREATE INDEX idx_student_payments_status ON student_payments(status);

-- Attendance lookup
CREATE INDEX idx_attendance_records_batch_date ON attendance_records(batch_id, date);
CREATE INDEX idx_student_attendance_student ON student_attendance(student_id);

-- Court members lookup & filtering
CREATE INDEX idx_court_members_status ON court_members(status);
CREATE INDEX idx_court_members_plan_type ON court_members(plan_type);
CREATE INDEX idx_court_members_phone ON court_members(phone);

-- Court payments lookup
CREATE INDEX idx_court_payments_member ON court_payments(member_id);
CREATE INDEX idx_court_payments_date ON court_payments(date);

-- Court check-ins log
CREATE INDEX idx_court_check_ins_member ON court_check_ins(member_id);


-- ==============================================================================
-- 4. AUTOMATIC UPDATED_AT TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_types_updated_at BEFORE UPDATE ON membership_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_payments_updated_at BEFORE UPDATE ON student_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_court_plans_updated_at BEFORE UPDATE ON court_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_court_members_updated_at BEFORE UPDATE ON court_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_court_payments_updated_at BEFORE UPDATE ON court_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
