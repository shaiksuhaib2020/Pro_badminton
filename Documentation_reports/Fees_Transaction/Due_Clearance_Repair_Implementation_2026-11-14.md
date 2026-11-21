# Development fee repair implementation

Prepared 14 November 2026. The live database was inspected read-only; these SQL
files have not been executed against Supabase.

## Files and behavior

- `src/lib/supabase/migrations/20261112000003_normalize_legacy_fee_units.sql` now
  converts only the explicit audited legacy student/payment fields, checks their
  expected starting values, preserves newer paise rows, and uses a completion
  marker to avoid rescaling on rerun. Old receipts keep their empty date pairs;
  no historical coverage is fabricated. Batch defaults were checked only for the
  fee cutover: both are NULL, and no batch values are converted.
- `20261112000004_due_clearance_and_adjustment.sql` repairs existing test clearances
  once, voids duplicate/excess entries oldest first, installs atomic deduction and
  reversal, and rebuilds pending amounts. The seven-argument RPC, transaction ID,
  optional original receipt mode, and audited due-date action remain compatible
  with current application code. The obsolete six-argument overload is removed.
  The privileged RPC authorizes role and academy explicitly, supports receptionist
  row locks, and refuses collection when its deduction trigger is unavailable.
- Financial guards require coverage for new original receipts, prevent direct
  amount/identity/start-date/balance edits and hard deletion, and prevent restoring
  voided receipts. Legacy undated originals remain settleable. Pending aggregate
  updates lock the student before summing. Table RLS policies are unchanged.
- `src/lib/supabase/database_schema.sql` now includes matching accounting for fresh
  databases, fixing the previous missing-function/trigger omission.
- The migration README and project architecture/structure references document
  execution order, checkpoint comments, development assumptions, and pending live
  verification. The integration harness is in `migrations/tests/`.

## Development-data decisions

The legacy clearance with raw amount 500 is treated as the intended Rs 500 test
settlement and becomes 50000 paise along with its original balance. No production
cash reconciliation is inferred from this choice. The first valid Rs 500
clearance on original `988f160e-9195-48e1-8805-e0c411da66e3` settles it; later
duplicate `b885a912-89a7-4909-8f82-7324833d1563` is voided with an explanatory note.
Both audited original balances and their student pending amounts become zero.
No receipt is physically deleted.

## Application currency review

Student creation, re-enrollment, fee receipts, due clearance, and student fee edits
already use the server `paise()` conversion. Batch creation/edits use
`batchFeePaise()`. Student/payment and batch queries divide stored paise by 100.
These paths were inspected and require no additional currency conversion change.
The current clearance RPC arguments already match the revised SQL.

## Validation

Twenty integration checks passed against isolated PostgreSQL/PGlite using the
actual revised files and fixtures matching the 13 student and 15 payment financial
records, plus relevant authenticated RLS policies. Checks include:

- Selective normalization and preservation of valid paise records.
- Existing clearance reconciliation, duplicate voiding, and no row deletion.
- Repeated scripts before and after subsequent payments/date adjustments.
- Duplicate, stale, wrong-amount, zero, unauthorized, and cross-academy collection.
- Exact clearance, reversal once, and recollection after a legitimate reversal.
- Receptionist and accountant flows despite their restricted table permissions.
- Legacy receipt settlement and coverage requirements for new originals.
- Protected financial edits, original voiding, and physical deletion.
- Atomic rollback of the original/pending deduction if clearance insertion fails.
- Fail-closed collection when the deduction trigger is disabled or absent.
- Audited date adjustment and omission of undated receipts from membership.
- Required execution order, empty schemas, changed-input rollback, and agreement
  between fresh-schema function definitions and the migration.

The test dependency was installed in isolated `.tmp/fee-migration-test`, without
changing application dependencies or its lockfile. The harness uses one PostgreSQL
connection: true simultaneous requests and authenticated browser/cache behavior
were not exercised. Neither application TypeScript nor UI behavior was changed,
so no application build was required for this SQL-only behavior change.

## Manual handoff

Pause application writes. Run all of revised `00003` in SQL Editor, then all of
revised `00004`. Do not rerun the already-installed modal-fields migration or the
complete fresh-database schema. Restart/refresh the application after both succeed.
Each SQL file ends with a read-only confirmation query. Full details and local
test commands are in `src/lib/supabase/migrations/README.md`.
