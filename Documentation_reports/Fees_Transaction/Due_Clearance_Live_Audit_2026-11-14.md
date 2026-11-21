# Live student fee and due-clearance audit

Date: 14 November 2026 (IST).

## Scope and method

Read-only Supabase MCP queries against `public.students`, `public.student_payments`, their column/constraint/trigger metadata, the associated trigger functions, the clearance/date-adjustment functions, and the related `student_membership` view definition. No unrelated table data, project-wide advisories, logs, keys, or other modules were inspected. Local verification compared the current student server actions and queries with their committed predecessor and the prepared migrations.

No database mutation, migration, collection, reversal, or application code change was performed. This document is the audit output. Queries inspected a total of 13 student financial records and 15 payment records; personal/contact fields were not selected.

## Confirmed root causes

### 1. The live clearance RPC inserts receipts without reducing the original balance

The live database contains the seven-argument function:

`record_student_due_clearance(uuid, uuid, integer, date, payment_method, text, text)`

It authorizes the caller, locks the original receipt, checks that the submitted amount equals its remaining balance, and inserts a linked `due_clearance` receipt with `remaining_amount = 0`. Its body does not update the original receipt. That update is expected to happen through a separate trigger.

The live database is missing all of these expected accounting objects:

- Function `apply_student_due_clearance()`.
- Trigger `tr_student_due_clearance`.
- Function/trigger pair `guard_student_receipt_amounts()` / `tr_guard_student_receipt_amounts`.
- Function/trigger pair `guard_student_receipt_due_date()` / `tr_guard_student_receipt_due_date`.
- Function `adjust_student_receipt_due_date(...)`.

These objects are defined in local migration `20261112000004_due_clearance_and_adjustment.sql`. Its required accounting infrastructure is absent, while the newer modal-fields RPC is present. This establishes an incomplete database rollout; migration execution history itself was not inspected, so the audit does not claim exactly which SQL files were run or later overridden.

The existing `tr_sync_pending_amount_after_payment` trigger is present and enabled. Its SECURITY DEFINER function sums `remaining_amount` over non-deleted receipts. All 13 students' pending amounts agree with that sum: zero mismatches. It correctly sums the balances it is given, but those balances were never reduced by clearance.

The UI consequently shows the new zero-balance clearance in Paid and the unchanged original in Partially Paid. Repeated collection also passes the RPC's equality check because the original balance remains unchanged. The row lock cannot prevent a later duplicate when the locked balance is never changed.

### Direct live evidence

All amounts below are raw stored integers, without any assumed conversion.

| Original receipt | Original amount | Remaining | Linked live clearance amounts | Student pending |
|---|---:|---:|---|---:|
| `988f160e-9195-48e1-8805-e0c411da66e3` | 150000 | 50000 | 50000 + 50000 | 50000 |
| `8b6e9fb0-9777-4bf4-be7f-268175e56642` | 2000 | 500 | 500 | 500 |

Both original receipts retain their insertion-time `updated_at`, despite the later clearances. All three clearance receipts are active and reference the correct student/academy.

The newer original represents Rs 1,500 paid and Rs 500 outstanding under the current paise convention. Its clearance entries are:

- `82c15046-beb0-42a2-9509-390196fdb134`: 50000, created 14 November at 12:08:04 IST.
- `b885a912-89a7-4909-8f82-7324833d1563`: 50000, created 14 November at 14:51:44 IST.

The ledger therefore records two Rs 500 clearances for the same Rs 500 balance and still advertises that balance as collectible. The database proves duplicate settlement entries; it cannot establish whether the second entry represents real additional cash, a test, or a duplicate recording.

### 2. Currency conversion was not completed before paise-writing code started creating records

The inspected money columns are INTEGER columns. Their types do not supply a rupees/paise unit or automatically convert amounts.

The committed predecessor of `students/actions.ts` wrote `data.fees`, `data.amountPaying`, and remaining amounts directly, without multiplying by 100. The current implementation calls `paise(...)` before writing. Current queries divide fees, receipt amounts, remaining amounts, and pending amounts by 100.

The live records match that transition:

- Eight original receipts created from 27 October through 7 November contain raw amounts 1500, 2000, 2500, 2600, and 3000. The legacy partial receipt contains raw amount 2000 and raw remaining 500. Together with the former write path and the recorded historical confirmation in `R1_Decoupling_report.md`, these identify the legacy rupee cohort.
- Four newer original receipts, created on 12 and 14 November, contain raw amounts 50000, 150000, 150000, and 20000, consistent with the current paise-writing path.
- Student fee values also span both generations: nine older profiles have positive raw fees between 1500 and 3023; two newer profiles have 200000 and 300000; two have zero fees.

This is mixed-unit data, not a database uniformly storing all values as rupees. Older records are read 100 times smaller by the current application: legacy raw 2000 is rendered as Rs 20, and legacy raw 500 is rendered as Rs 5.

An older student already owns a newer paise receipt. Normalization cannot safely classify all of a student's records together or rely on an amount threshold alone.

### Important ambiguity in the legacy clearance

Clearance `7a26a9d1-82a0-4ef0-9b5b-b5c1d9a41b92`, created 14 November at 12:12:13 IST, has raw amount 500 and references the older receipt with raw balance 500.

Under the current application's paise contract, that clearance records Rs 5. The older outstanding balance was historically Rs 500. Its original balance and the new clearance compare equal numerically despite their inconsistent provenance. The amount of money actually received must be checked before choosing whether this new clearance needs any correction. It must not automatically be multiplied simply because it references an old receipt.

## Additional blocker for repairing legacy receipts

Eight non-deleted original receipts have no `start_date` or `next_due_date`. This includes the older partial receipt above. The live `student_payments_receipt_shape` constraint is NOT VALID and requires coverage for original receipts.

NOT VALID allows pre-existing violations to remain, but does not exempt a subsequently updated row from the check. Installing the deduction trigger alone would make clearance attempt to update the older original's balance, which would fail the shape constraint. Legacy receipt handling therefore has to be addressed alongside the accounting repair, without inventing historical coverage dates.

The membership view is also still the earlier definition that does not explicitly exclude missing coverage dates. This is another expected `00004` change absent from the live definition; it is not the cause of the duplicate collection demonstrated above.

## Consequences for the existing migration files

`20261112000003_normalize_legacy_fee_units.sql` explicitly assumes that every existing relevant value is still in rupees and that no paise-writing application has written live rows. That assumption is now false. Running it unchanged would multiply newer valid paise values by another 100; raw 150000 would become 15000000 and display as Rs 150,000 instead of Rs 1,500. Its pending recalculation would also continue summing uncleared original balances. It does not repair clearance accounting.

`20261112000004_due_clearance_and_adjustment.sql` contains the missing accounting behavior, but creating a trigger does not replay historical inserts. It will not repair the three existing clearance entries or resolve the duplicate settlement. It also defines an older six-argument RPC, whereas the live application uses the newer seven-argument RPC. A repair should preserve the current RPC contract and account for the existing schema instead of blindly replaying the migration sequence.

The main local `database_schema.sql` includes the later modal-fields RPC but omits the clearance deduction function/trigger. Thus it is not currently a complete source for setting up this accounting behavior on its own.

## Required repair sequence for a later authorized task

1. Export the affected financial rows and temporarily stop collecting or voiding these affected balances during reconciliation.
2. Establish explicit per-record/per-field rupee-versus-paise classifications using provenance and the actual fees/payment records. Preserve newer paise values.
3. Confirm whether the second Rs 500 clearance is a duplicate/test entry or a real additional payment, and what was actually received for the raw-500 legacy clearance. These facts cannot be inferred from the database alone.
4. Prepare a targeted, transactional repair that handles legacy receipt constraints, restores the missing accounting/guard objects while preserving the current RPC, reconciles existing original balances and clearances, and recomputes pending amounts through the authoritative database flow. Normalization and balance reconciliation must use consistent units.
5. Verify full clearance, concurrent/repeated submission rejection, and reversal with authenticated tests. Verify that Paid and Partially Paid agree with the repaired receipts.

Existing unapplied clearances require special handling when installing reversal logic: voiding one after installing the trigger could otherwise add back an amount that was never deducted. Actual extra money must retain an accurate accounting treatment rather than being silently deleted or clamped away.

No database repair is authorized or performed by this audit. The business confirmations above are needed before deciding historical financial corrections; there is no need to execute either existing migration unchanged now.
