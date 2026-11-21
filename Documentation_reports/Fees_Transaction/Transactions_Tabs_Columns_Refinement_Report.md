# Coaching transaction tabs refinement

## What changed
Recent and Paid now separate Name and Phone Number and use the approved seven-column order. Amount Paid has a small Due tag only for a positive receipt balance; readable coverage/payment dates replace numeric dates. Type/Status are hidden and the bin icon retains void confirmation. Pending has five columns, actual due-day indicators and reminder drafts. Partially Paid has seven columns, full payment coverage, and receipt age. Collection operations and tab eligibility are preserved. No approved approach was changed.

## Files changed
All paths below are relative to src/app/(management)/transactions/_components/ unless otherwise stated. Existing uncommitted work was preserved.

| Area | File | Operation and purpose |
|---|---|---|
| Components | RecentTab.tsx | Modified: column order, due tag, dates, coverage and accessible void icon. |
| Components | PaidTab.tsx | Unchanged: continues using RecentTab; automatically receives the same layout. |
| Components | PendingTab.tsx | Modified: five columns, New/due/overdue indicators, collection and reminders. |
| Components | PartialTab.tsx | Modified: seven columns, coverage dates, aging and reminders. |
| Components | ReminderLink.tsx | Added: WhatsApp draft link with invalid-number disabling. |
| Components | TransactionsView.tsx | Modified: passes the shared IST date into Pending/Partial. |
| Utilities | transaction-utils.ts | Added: local date/coverage formatting, due/aging counts, phone normalization and reminder text. |
| Types | types.ts | Modified: PartialTabProps includes today. |
| Docs | docs/BW_Architecture_2.md | Modified: section 5.2 supplement on tab semantics/reminders. |
| Docs | docs/BW_Structure_2.md | Modified: transaction-component/helper supplement. |
| Docs | docs/UIPatterns.md | Modified: compact balance/due indicators and reminder conventions. |
| Docs | Documentation_reports/Transactions_Tabs_Columns_Refinement_Report.md | Added: this report. |

Database, queries, server actions and global utilities were unchanged. No files were renamed or deleted.

## CRUD operations
These are existing operations reached from the application, not new writes introduced by this task.

| Feature | Tables/views and operation | Execution path |
|---|---|---|
| Enroll student | Read students for duplicates, batches for selection; create students only | Existing query/server action. |
| Re-enroll | Read students and batches; update students without changing original joining_date or creating payment | Existing server action and immutable-date trigger. |
| Fee receipt | Read students; create student_payments; recalculate students.pending_amount | Existing server action and pending-balance trigger. |
| Settle due | Read original student_payments; insert linked due_clearance; update original remaining_amount and students.pending_amount | Existing server action, record_student_due_clearance RPC, clearance/pending triggers. |
| Void receipt | Update student_payments.status to deleted; reverse a clearance into the original balance and recalculate pending amount | Existing server action and triggers; no physical delete. |
| Adjust due date | Read latest eligible student_payments; update next_due_date and append audit details to note | Existing adjust_student_receipt_due_date RPC. |
| Student/transaction lists | Read students, batches, student_payments, student_membership; no writes | Existing server queries and client filtering/display. |
| Remind Now | No database read/write beyond already-loaded row data | Opens a WhatsApp draft; staff reviews/sends it. |

## Rules and edge cases
- Existing tab membership remains intact: Recent includes voided receipts; Paid includes non-deleted zero-balance receipts; Pending excludes inactive/dropout students and includes no-coverage/due-soon/expired profiles; Partial retains existing eligibility.
- Pending Amount remains student.fees for coverage profiles, including upcoming rows. New/no-coverage students show a hyphen. This amount is a fee reference, not an automatically posted ledger debt.
- Partial Amount Paid is the original receipt amount, not the sum of historical clearances. Due Amount is current remainingAmount. Cleared receipts no longer have the Due tag.
- All displayed dates use dd MMM, yyyy. Invalid/missing legacy dates show a hyphen. Due clearances derive Payment For through settlesPaymentId and the original receipt.
- Calendar-day differences use date-fns and the shared IST today string. Due today is explicit, and future receipt ages clamp to 0d. New indicates no current coverage receipt, matching the existing Pending semantics.
- Reminder links accept valid Indian ten-digit mobile numbers or the same number prefixed with 91/+91; missing/invalid numbers disable the action. Draft text is URL-encoded, supports names with punctuation, and separates upcoming/overdue/partial reminders. No automatic message is sent or logged.
- Blank modes remain Unspecified. Existing confirmations, callbacks and database safeguards are unchanged.

## Verification
- TypeScript noEmit: passed.
- Targeted ESLint across all eight transaction component/helper/type files: passed.
- Focused executable TypeScript/React component checks: passed exact headers for all four tabs, positive/zero balance tags, blank modes, bin/collection callbacks, deleted receipt action suppression, linked and missing coverage, date validation, empty states, due-today/upcoming/overdue counts, future-age clamping, and year-boundary arithmetic.
- Date/aging checks passed in UTC, Asia/Kolkata and America/Los_Angeles. WhatsApp checks passed local/+91/91 normalization, invalid-number rejection, encoded message roundtrip, safe new-tab attributes and disabled state.
- Production build: passed, including compilation, TypeScript, page-data collection and all 17 generated static pages.

## Loose ends
No schema migration or hosted database changes were made. Browser visual QA and authenticated live collection/void flows were not run; callback checks used local component fixtures. WhatsApp drafts were inspected as generated links, without opening a conversation or sending a message. Earlier modal migration deployment remains a separate prerequisite for those earlier fields; this task adds no database deployment requirement. Recent continues to include voided rows with Status hidden, as explicitly approved.
