# Batch detail and shared transaction modules

## 1. What changed

The batch student query rejected standard UUIDs because its regex omitted a group, leaving all detail tabs empty. The corrected lookup returns current batch members, and batch cards count by ID rather than name.

Batch Detail now reuses the primary student directory and coaching transaction modules. Individual profiles reuse the same financial tables. The legacy batch/profile tables were removed, including the logic that selected only one outstanding receipt per student. Each partial receipt now has its own row and clearance target.

Approved scope rules are preserved: New placeholders appear in academy and batch Pending, but not individual financial histories. Current batch members bring their full financial history after a transfer. Inactive members remain in directory counts; attendance uses active members only and preserves historical marks. Embedded histories default to All. No implementation approach was intentionally changed.

## 2. Files changed

Paths are relative to the repository root. Existing uncommitted work was preserved.

### Database

No schema, migration, RPC, trigger, RLS, or database-type files changed. No live records were written.

### Queries and server actions

| File | Operation and change |
|---|---|
| `src/lib/queries/students.ts` | Modified: corrected UUID detection in `getStudentsByBatch`; retained academy-scoped batch lookup and non-dropout membership filter. |
| `src/app/(management)/students/actions.ts` | Modified: `revalidateStudent` also invalidates `/batches` and the batch-detail page pattern after student/payment mutations. |

### Pages and components

| File | Operation and change |
|---|---|
| `src/app/(management)/batches/_components/BatchesView.tsx` | Modified: member counts match `currentBatchId`, not batch names. |
| `src/app/(management)/batches/[id]/page.tsx` | Modified: supplies academy batch choices to the shared directory. |
| `src/app/(management)/batches/[id]/_components/BatchDetail.tsx` | Modified: embeds shared directory/transactions, derives roster from props, limits attendance to active members, and shows insights roster before first attendance record. |
| `src/app/(management)/students/_components/StudentList.tsx` -> `src/components/students/StudentList.tsx` | Renamed and modified: batch-scoped embedded mode, same columns/actions, hidden cross-batch filters, batch UUID enrollment default, edit refresh. |
| `src/app/(management)/students/page.tsx` | Modified: imports shared `StudentList`. |
| `src/app/(management)/students/[id]/_components/StudentProfileView.tsx` | Modified: embeds individual-scoped financial history; preserves details, summaries, attendance, first-receipt action, editing, and due-date adjustment. |
| `src/app/(management)/transactions/_components/TransactionsView.tsx` | Modified: retains route header and Coaching/Court switch; delegates coaching to shared controller. |
| `src/app/(management)/transactions/_components/{RecentTab,PaidTab,PendingTab,PartialTab,ReminderLink}.tsx` -> `src/components/transactions/` | Renamed: retained the refined table layouts, indicators, reminders, and action callbacks. |
| `src/components/transactions/CoachingTransactions.tsx` | Added: shared tab/search/filter state, exact-receipt collection/clearance, void confirmation, and route refresh. |

### Utilities and types

| File | Operation and change |
|---|---|
| `src/app/(management)/transactions/_components/transaction-utils.ts` -> `src/components/transactions/transaction-utils.ts` | Renamed: shared sorting, dates, aging and reminder helpers; existing behavior retained. |
| `src/app/(management)/transactions/_components/types.ts` -> `src/components/transactions/types.ts` | Renamed and modified: added explicit academy/batch/student scopes and shared range type. |
| `src/components/transactions/transaction-data.ts` | Added: scopes students before building receipt rows, filters, pending entries, and outstanding receipt lists. |

### Docs

| File | Operation and change |
|---|---|
| `docs/BW_Architecture_2.md` | Modified: section 4.1 shared-controller/scoping rules and section 5.4 attendance/refresh supplement; clarified individual Pending behavior. |
| `docs/BW_Structure_2.md` | Modified: shared module locations, callers, data boundaries and verification reference. |
| `docs/UIPatterns.md` | Modified: reuse rules for scoped directories and financial histories. |
| `Documentation_reports/Batch_Detail_Shared_Modules_Report.md` | Added: this report. |

## 3. CRUD operations

Financial writes are existing behavior, not new accounting operations introduced here.

| Feature | Reads | Creates / updates / deletes | Path |
|---|---|---|---|
| Enroll student | `students` duplicate lookup; `batches` selection/resolution | Creates `students` only; no receipt or coverage write | Existing server action and database constraints. |
| Re-enroll | `students` status; `batches` | Updates `students`, preserving joining date and receipt history | Existing server action and immutable-date trigger. |
| Fee receipt | `students` status | Creates `student_payments`; trigger recalculates `students.pending_amount` | Existing server action and pending-balance trigger. |
| Settle due | Exact original `student_payments` receipt | Creates linked clearance; updates original `remaining_amount` and student pending amount | Existing action -> `record_student_due_clearance` RPC -> clearance/pending triggers. |
| Void receipt | Matching `student_payments` | Updates status to deleted; clearance reversal restores original balance and recalculates pending amount; no physical delete | Existing action and accounting triggers. |
| Adjust due date | Latest eligible `student_payments` receipt | Updates receipt due date and appends audit details to its note | Existing `adjust_student_receipt_due_date` RPC. |
| Student and transaction lists | `students`, `batches`, `student_payments`, `student_membership` | No writes from list rendering | Existing server queries; shared client scope/filter selectors. |
| Attendance | Batch `attendance_records` | Existing full-day upsert | Existing attendance query/action; visible roster is active-only, saved hidden entries are retained. |
| Remind Now | Already-loaded scoped student/receipt | No database write or automatic send | Existing WhatsApp draft link. |

## 4. Business rules and edge cases

- **Data layer:** standard UUIDs resolve by ID, academy lookup remains enforced, and dropout profiles are excluded from current batch rosters. Batch ID comparisons avoid name collisions.
- **Shared UI:** scope is applied before rows, totals, search and action targets. Individual Pending requires an active coverage receipt and due-soon/overdue profile; New placeholders remain in academy/batch Pending.
- **Receipt accounting UI:** Partially Paid lists every eligible outstanding original receipt, not an aggregate student balance. Clearance receives the selected receipt. Individual histories preserve collectible balances after inactivity/dropout; academy/batch partial eligibility remains unchanged.
- **Batch transfers:** the new batch shows the current member's entire history. Historical batch attribution is deliberately not inferred.
- **Attendance UI:** current active members drive rows, counters, completion and Mark All Present. Existing hidden inactive/transferred marks are preserved in the saved map. Students with no recorded attendance are still visible in Insights.
- **Shared behavior:** approved ordering, red Overdue Today, amber upcoming dues, aging, Unspecified payment mode, date filters, reminders and void confirmation are retained. New histories start at All; Pending/Partial remain current queues rather than payment-date-filtered reports.
- **Database/server:** role checks, tenancy, paise conversion, exact-balance clearance locking, immutable joining dates, void reversal and audited date adjustment are unchanged.

## 5. Loose ends

- Browser visual QA and authenticated live mutation flows could not be run: both browser and Windows inspection runtimes failed to initialize with `failed to write kernel assets` / path-not-found. No messages or financial operations were performed in the live application.
- Targeted ESLint still reports four pre-existing `react-hooks/set-state-in-effect` errors: two in Batch Detail, one in Batches View, and one in StudentList. Baseline comparison confirms these were inherited; one additional old Batch Detail effect error was removed with copied student state.
- Read-only inspection before implementation found Evening: 6 non-dropout members, including 1 inactive; Morning: 7. Counts remain data-driven and may change with enrollment/status updates.
- No database deployment is required for this change. Batch-at-payment attribution would require additional data if requested later; current-member full history was explicitly approved.

## 6. Doc updates

Architecture, structure and UI-pattern docs were updated as listed above. Older implementation reports were left intact as historical records.

## 7. Verification

- TypeScript `--noEmit`: passed.
- Next.js production build: passed compilation, TypeScript and all 17 generated static pages.
- ESLint: zero errors/warnings across the 15 shared transaction, query/action, route-wrapper and profile files checked separately. The full changed-file check has only the four inherited roster-component errors described above.
- Executable local TypeScript/component fixtures: passed UUID/name/tenant lookup, batch isolation, transferred-member history, New policy by scope, multiple outstanding receipts, exact clearance and void callbacks, active-only attendance, hidden mark preservation, insights without prior records, shared directory enrollment defaults, individual profile integration, filters and input immutability.
- Moved table fixtures: passed exact headers, aging/overdue indicators, Unspecified mode and encoded WhatsApp drafts.
- Real `revalidateStudent` function with mocked cache API: passed batch-list/detail and existing-route invalidation checks.
- These checks used isolated fixtures and mocked writes; they do not substitute for authenticated browser/concurrency testing.
