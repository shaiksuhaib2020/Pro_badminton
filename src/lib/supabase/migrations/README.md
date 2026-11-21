# Supabase migrations

## Development fee repair (14 November 2026)

These two revised SQL files target the mixed-unit development database inspected
through Supabase MCP. The modal-fields migration is already installed there.

1. Pause application writes (stop the development server and other test clients).
2. In Supabase SQL Editor, run the **entire**
   `20261112000003_normalize_legacy_fee_units.sql` file.
3. After it succeeds, run the **entire**
   `20261112000004_due_clearance_and_adjustment.sql` file.
4. Restart/refresh the application. A new partial receipt of Rs 2,000 with Rs 1,500
   received should store `amount = 150000` and `remaining_amount = 50000`.
   Collecting the Rs 500 balance should set the original balance and the student's
   pending amount to zero. It should leave Partially Paid; another attempt to
   collect that original must fail. Voiding the clearance restores Rs 500 once.

Do not rerun `20261113000001_modal_fields.sql`: its fields and current RPC already
exist. Do not run the complete `database_schema.sql` against this existing DB;
that file is for creating a fresh database.

### What the repair does

- `00003` converts nine audited student fee fields, eight old original receipts,
  and the one legacy test clearance using explicit IDs and expected raw values.
  It preserves new paise receipts and new paise fees, including new receipts for
  old students. The two audited batch fee defaults are NULL and remain so.
- Test-data policy: the legacy raw-500 clearance is treated as the intended
  Rs 500 settlement. In `00004`, clearances apply oldest first; later duplicate
  or excess test entries are voided with a note. Nothing is physically deleted.
  For the audited fixture this voids `b885a912-89a7-4909-8f82-7324833d1563`.
- Old receipts can keep empty coverage dates and can be settled/voided. A database
  INSERT guard requires valid coverage on every new original receipt.
- `00004` installs atomic clearance/reversal, financial guards, pending-balance
  synchronization, and the audited due-date RPC. It preserves the current
  seven-argument clearance RPC, including transaction ID, and removes its obsolete
  six-argument overload. Role/academy checks protect the privileged RPC, including
  receptionist row locking; table policies remain unchanged.
- The RPC refuses collection if its deduction trigger is absent or disabled.
- Each file is transactional and uses column-comment completion markers. After
  success, rerunning either file skips its data conversion/reconciliation rather
  than repeating it. `00004` recreates its infrastructure on rerun. Preserve the
  markers on `students.fees` and `student_payments.settles_payment_id`.
- If an audited field was edited before its first conversion, the transaction
  aborts with that row's ID. If either file fails, stop and inspect the error;
  do not continue application writes between the two steps. After a failed SQL
  transaction, run `ROLLBACK;` if the editor keeps that transaction open.

These are development-data decisions, not a production money reconciliation.
Future direct SQL money writes must also use paise; an INTEGER type alone cannot
infer the intended unit. Current student/batch actions already multiply once on
write, and their queries divide once on read. No second conversion belongs in the UI.

## Local PostgreSQL verification

The integration harness executes the actual files in an isolated PGlite database,
with fixtures matching the audited financial records and relevant RLS policies.
It does not connect to Supabase. Install the test-only dependency separately;
the application's package manifest and lockfile do not need changes.

PowerShell, from the repository root:

```powershell
npm.cmd install --prefix .tmp/fee-migration-test --no-save --package-lock=false --ignore-scripts @electric-sql/pglite
$env:PGLITE_MODULE_PATH = (Resolve-Path '.tmp/fee-migration-test/node_modules/@electric-sql/pglite').Path
node.exe 'src/lib/supabase/migrations/tests/verify-fee-migrations.cjs'
```

All 20 integration checks passed locally on 14 November 2026. They cover normalization, fixture reconciliation, replay protection,
clearance/void behavior, rollback, role/tenant boundaries, missing infrastructure,
legacy coverage, due-date audit, and fresh-schema consistency. The harness uses a
single database connection; simultaneous requests and authenticated browser/cache
behavior still need verification after the SQL files are applied.

