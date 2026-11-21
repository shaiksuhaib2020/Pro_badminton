## The Problem
Student enrollment and fee payments were tangled together:
- Enrolling a student previously created a fake payment and set coverage dates on the student row. A fee typed at enrollment showed up as "paid" even though zero money had been collected.
- Student validity status (Active / Due Soon / Overdue) came from static columns on the student table instead of actual payment receipts.
- Renew, Re-enroll, and Collect Fee were separate fragmented modals, each mutating payments and dates inconsistently.

## What the System Should Be
- **Enrollment only creates the student profile:** Identity, batch, optional default fee (defaults to ₹0 if empty), joining date. No payment row and no coverage dates are created.
- **A Fee Receipt is the SOLE source of coverage:** Each receipt in `student_payments` defines `start_date` and `next_due_date` (the next due date), plus payment date ("amount received on"), amount paid now, remaining due, and payment method. The new `FeeReceiptModal` replaces the old `CollectFeeModal`.
- **Membership is derived from the latest active receipt:** Student status (Active / Due Soon within $\le 3$ days / Overdue) is computed dynamically from that receipt.
- **Unpaid students:** A student with zero receipts has an active profile but appears in the **Pending** tab with an amount of `—` (or their default fee) waiting for their first fee collection.
- **Decouple money from coverage:** A partial payment still grants full coverage until `next_due_date`. The leftover balance appears under the **Partially Paid** tab.
- **Due Clearance:** Paying off an outstanding balance later is a dedicated `due_clearance` receipt. It grants no new coverage dates (`NULL`), but reduces the original receipt's `remaining_amount` so total dues reconcile to ₹0.

## What's Already Done (Applied in Production)
The migration `supabase/migrations/20261112000001_decouple_fees_and_enrollment.sql` has been run on Supabase:
- Renamed `students.start_date` to `joining_date` (immutable).
- Dropped `students.next_due_date` and removed the old static status computation triggers.
- In `student_payments`: renamed coverage columns to `start_date` and `next_due_date`.
- Added the `due_clearance` payment type enum and `settles_payment_id UUID REFERENCES student_payments(id)`.
- Added the `student_payments_receipt_shape` CHECK constraint and audit indexes.
- Created the `student_membership` SQL view (latest active receipt per student).

*Please don't edit that migration file. Any further DB changes should go in a new migration. Run `npm run db:types` first to synchronize `database.types.ts`.*

## Recommended Tasks

**1. Fix Broken Types & Queries across the App**
- Run `npm run db:types` and fix all code currently expecting `next_due_date` on `students`, old `start_date`, or `coveredFrom` / `coveredUntil`.
- *Note on Supabase client:* In PostgREST, views lack foreign keys, so `supabase.from('students').select('*, student_membership(*)')` will fail. Either query `student_membership` separately and merge by `student_id`, or embed `student_payments(start_date, next_due_date, payment_type, status)` ordered by date desc. Pick whichever is cleanest.
- Ensure status helpers use $\le 3$ days for "Due Soon" in IST (`Asia/Kolkata`) — check `deriveStudentStatus` in `src/lib/utils.ts`.

**2. Database Follow-ups for the Due Clearance Flow**
Create a new migration for a trigger / function (`security definer`) that:
- When a `due_clearance` receipt is inserted, atomically reduces the target receipt's `remaining_amount`.
- Rejects the transaction if the clearance amount is 0 or exceeds what is owed.
- Restores the balance if the clearance receipt is voided (`status = 'deleted'`).
- Blocks voiding an original receipt if active clearances are already attached to it.

**3. Server Actions (`src/app/(management)/students/actions.ts`)**
- `createStudent`: Inserts student profile only (zero payment rows). `fees` is optional (defaults to 0).
- `createFeeReceipt`: Inserts into `student_payments` with full/partial payment math, coverage dates, and payment method.
- `settlePendingDue`: Inserts a `due_clearance` receipt referencing `settles_payment_id`.
- `reEnrollStudent`: Reactivates an inactive student (updates profile/batch if changed) without creating a fake payment.
- Delete obsolete `renewStudent` and `collectRemaining`. Never write pending amounts or due dates from JavaScript.

**4. UI Components**
- **Slim down `AddStudentModal.tsx`:** Remove payment mode pills, partial payment box, start date, and end date. Make Guardian Name optional. If re-enrolling from the Inactive tab, prefill student info.
- **Build `FeeReceiptModal.tsx`:** Locked student header, editable start date (defaults to previous due date if active, or today/joining date if new/expired), next due date picker with quick-pick presets (+1 Month, +3 Months), amount received on date picker, partial payment math (Paying Now vs Due), and live preview of the resulting coverage.
- **Decompose `src/app/(management)/transactions/page.tsx`:** Break the 1,300-line monolithic file into modular tab components under `_components/`:
  - `RecentTab`: Chronological feed of all receipts.
  - `PaidTab`: Fully cleared receipts filtered by date range.
  - `PendingTab`: New unpaid students (`amount: —`) + students with upcoming/overdue dues.
  - `PartialTab`: Students with active outstanding dues (`remaining_amount > 0`).
  *(A student can appear in both Pending and Partially Paid if their next month is due while an old balance remains).*
- **Student Profile View (`/students/[id]`):** Show `joining_date`, total dues, and a clean "Current Membership" card derived from their latest active receipt.

**5. Adjust Due Date (Student Profile)**
Allow academy owners/managers to manually shift the `next_due_date` on the latest active receipt (e.g. for injury leave, academy holidays, or date corrections) without voiding and re-issuing:
- Restrict to owner/manager (enforce via Supabase RPC or server action check).
- Only allow modifying the latest active receipt, with the new date strictly after its `start_date`.
- Append an audit trail note to the receipt (`"Due date adjusted from [old] to [new] by [user] on [date]. Reason: [reason]"`).
- Implement as a neat inline expander on the profile card, not a heavy modal.

## Edge Cases Worth Handling
- Overpayment prevention (paying now cannot exceed fee).
- Voiding the only receipt returns the student to the "Pending" new/unpaid state.
- Lapsed students (renewing after months of absence defaults `start_date` to today, not the ancient due date).
- Back-dated receipts handled gracefully.
- Prevent duplicate receipt submissions with button disabling / loading spinners.

## Standards to Follow
- Amounts in paise in DB ($\times 100$), Rupees in UI ($\div 100$).
- Dates stored as `YYYY-MM-DD` strings in IST (`Asia/Kolkata`).
- Client components never call Supabase directly; use Server Actions with `revalidatePath`.
- Strict TypeScript (`npx tsc --noEmit` must pass with 0 errors).
- Walk through the verification flow:
  1. Enroll a student with ₹0 / blank fee $\rightarrow$ appears in Pending tab with `—`.
  2. Issue a full fee receipt $\rightarrow$ moves out of Pending to Paid & Recent.
  3. Issue a partial fee receipt $\rightarrow$ appears in Partially Paid with remaining due.
  4. Clear due balance $\rightarrow$ balance reconciles to ₹0.
  5. Void receipt & adjust due date on student profile.



  ## When you're done: report back
Please finish with a brief, plain-English report I can use for documentation. Keep it factual and short:

1. **What changed, in a few lines.** The behavior before and after, and any place you chose a different approach than I recommended, with the reason.
2. **Files changed.** Group them by area (database, queries, server actions, pages and components, utilities and types, docs). For each file, say whether it was added, modified, renamed or deleted, with one line on what changed.
3. **CRUD operations.** For each feature (enroll student, re-enroll, fee receipt, settle due, void receipt, adjust due date, student and transaction lists), list which tables or views are read, created, updated or deleted. Say whether it happens through a server action, an RPC, a trigger or a query.
4. **Business rules and edge cases.** Which ones are now enforced, and where (database, server action or UI).
5. **Loose ends.** Anything left unfinished, any assumption you made, any legacy-data issue, and anything that needs my decisi6n.
6. **Doc updates.** Whether you updated the architecture and structure docs, and which secti7ns.
7. **Verification.** What you ran and tested (type check, flows walked through) and the results.