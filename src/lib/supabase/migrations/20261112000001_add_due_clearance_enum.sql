-- Migration 1: Add due_clearance to payment_type enum
-- Must be committed before any constraint or table references it.
ALTER TYPE public.payment_type ADD VALUE IF NOT EXISTS 'due_clearance';

