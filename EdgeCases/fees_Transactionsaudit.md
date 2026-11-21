**Turn 1 — Coaching fees and Transactions audit**

I found several issues worth resolving before deployment. This was read-only: no code, documentation, database, or migration changes. Six in-memory checks exercised the actual transaction selectors, formatter, and receipt rendering with synthetic records.

**Limitation:** No Supabase MCP tools are available in this session. Database observations below describe local SQL definitions, not verified live behavior. Live constraints, RLS, and concurrency protection still require the separate database audit.

**Critical**

No production-critical corruption or unauthorized financial write was verified in this turn. That is not a deployment clearance: the live database safeguards remain unverified.

**High**

**1. Voided receipts look like valid money received.**  
Where: [transaction-data.ts:39](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/components/transactions/transaction-data.ts:39>) and [RecentTab.tsx:13](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/components/transactions/RecentTab.tsx:13>).

Recent deliberately includes voided receipts, but renders their amounts in the same green style as valid receipts. It can also show their old remaining balance as “Due.” Only the void button disappears.

**Verified:** A rendered voided receipt contained no “Voided” indicator and retained the positive-money styling. Staff reconciling the list could count cancelled payments or pursue cancelled balances.

**Suggested fix:** Keep the historical row, clearly mark it Voided, visually distinguish its amount, and suppress collectible-balance messaging. The architecture supplement explicitly hides Status, so this needs a documented display-rule decision.

**2. Accepted payment precision differs from displayed precision.**  
Where: [FeeReceiptModal.tsx:86](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/components/students/FeeReceiptModal.tsx:86>) and [utils.ts:5](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/lib/utils.ts:5>).

Inputs and server validation accept two decimal places, while `formatCurrency()` rounds to whole rupees.

**Verified:** ₹0.49 displays as ₹0; ₹1,000.50 displays as ₹1,001. This affects receipt amounts, outstanding balances, clearance summaries, and reminders. Storage conversion appears correct; the discrepancy is in presentation.

**Suggested fix:** Either display paise whenever present or enforce whole-rupee amounts consistently at every write boundary. Do not silently round accepted money.

**3. Future or overlapping coverage can replace the current membership.**  
Where: [createFeeReceipt:163](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/app/(management)/students/actions.ts:163>), [membership view:73](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/lib/supabase/migrations/20261112000004_due_clearance_and_adjustment.sql:73>), and [status mapping:35](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/lib/queries/students.ts:35>).

The action checks that coverage ends after it starts. It does not check overlap with existing coverage. The local unique index prevents identical active start dates, but permits overlapping ranges with different starts. The membership view selects the greatest start date, including future dates; status derivation considers only the end date.

For example, an expired student given January coverage can appear Active in November, despite the gap.

**Suggested fix:** Define current versus scheduled coverage explicitly. Validate permitted overlaps atomically in the database, and derive current entitlement from the applicable interval. Whether advance payment should immediately confer membership is a business decision.

**4. Dropout and fee creation are not coordinated atomically.**  
Where: [dropoutStudent:268](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/app/(management)/students/actions.ts:268>) and `createFeeReceipt`.

Dropout updates the student, then separately marks receipts inactive. A failure between requests leaves mixed state. Fee creation separately reads student status before inserting a receipt; dropout can happen between those operations.

**Why it matters:** A receipt can be created against a student whose status changed, or coverage can survive an incomplete dropout. The outcome depends on timing.

**Suggested fix:** Put each operation in a database transaction and use the same student-row locking protocol for enrollment status changes and receipt creation. Verify concurrent interleavings against the live functions before deployment.

**5. Voiding has insufficient audit evidence.**  
Where: [voidPayment:242](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/app/(management)/students/actions.ts:242>) and the local `student_payments` definitions.

The action changes `status` to `deleted` without requiring a reason or recording the acting user in the receipt. The inspected local definitions do not provide a dedicated immutable void event. An `updated_at` timestamp alone cannot explain who cancelled money and why.

**Suggested fix:** Require a reason and atomically record receipt ID, actor, timestamp, and before/after state in an append-only audit record. Confirm whether live audit infrastructure already supplies this before adding anything.

**Medium**

**6. The academy collection queue hides departed students’ debt.**  
Where: [transaction-data.ts:48](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/components/transactions/transaction-data.ts:48>).

**Verified:** A dropout student with ₹500 outstanding appears in their individual financial history but contributes no row to academy Partially Paid.

This follows the current documented policy, so it is a business-risk ambiguity rather than an implementation mismatch. Collectible money becomes easy to overlook.

**Suggested fix:** Include all collectible balances by default, or provide a prominent Active / Inactive / All filter with separate totals.

**7. Pending eligibility becomes stale across date changes.**  
Where: [transaction-data.ts:41](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/components/transactions/transaction-data.ts:41>) and `CoachingTransactions.tsx`.

The controller obtains today again on rendering, but Pending eligibility uses the previously loaded `student.status`. There is no midnight refresh.

**Verified:** A student whose loaded status is Active remains absent from Pending even when the supplied current date makes the receipt due tomorrow.

**Suggested fix:** Recompute date-derived eligibility using one current IST date, preserving explicit inactive/dropout status. Refresh that date on midnight and window focus.

**8. Financial histories have inconsistent loading guarantees.**  
Where: [getStudents:69](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/lib/queries/students.ts:69>) and [getStudentById:123](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/lib/queries/students.ts:123>).

The Transactions page loads every student and receipt, then filters in the browser. Individual history uses an unpaginated payment query, so it can silently truncate at the configured API row limit. The limit itself needs live verification.

Separate student, membership, and payment requests also do not form a consistent database snapshot during concurrent changes.

**Suggested fix:** Use purpose-specific, paginated transaction queries with stable cursors. Fetch current debt queues separately and provide an explicit consistency contract for membership/balance summaries.

**9. Renewal reminders describe a fee reference as an overdue payment.**  
Where: [getPendingReminder](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/components/transactions/transaction-utils.ts:104>) and `PendingTab.tsx`.

Pending uses `student.fees`, while the architecture says expired coverage does not create new debt. The reminder nevertheless says that amount “is overdue.” A fully paid student whose membership expired can receive debt-like wording.

**Suggested fix:** Distinguish renewal invitations from outstanding receipt balances in both labels and reminder text. Reserve debt wording for actual unpaid receipts.

**Low**

**10. Due-date adjustment bypasses generated RPC typing.**  
Where: [adjustDueDate:253](</D:/DEVELOPMENT/SOFTWARES/SPORTS/Pro Badminton/src/app/(management)/students/actions.ts:253>).

The RPC call uses `as never`, and `adjust_student_receipt_due_date` is absent from the generated function declarations. Signature drift can therefore reach runtime undetected.

**Suggested fix:** After verifying the live function signature, regenerate database types and remove the casts.

**Safeguards that looked sound**

- Server actions check collection and void permissions and scope receipt mutations by academy.
- Amount conversion rejects negative, excessive, and over-precision inputs.
- A settled original plus its clearance correctly totalled ₹1,500 in the synthetic Paid-tab check.
- Local clearance SQL locks the original receipt, requires the exact remaining balance, restores it when clearance is voided, and blocks voiding an original with outstanding clearance dependencies. These protections still need live confirmation.

**Decisions needed**

1. Are fractional rupees allowed, or must all coaching money be whole rupees?
2. Should advance coverage grant membership immediately? Are overlapping coverage periods permitted?
3. Should the academy collection queue include inactive/dropout debt by default?
4. Should future “Amount Received On” dates be allowed? Current validation accepts them.
5. Should voiding require a reason and actor audit, and should accountants retain void authority?

Communications currently uses mock records and a WhatsApp stub, so detailed analysis is skipped under your exclusion. Its transaction reminder links were covered here. Reports and other mock areas were skipped; court membership was excluded completely.

**I’ll wait for your instruction before starting student enrollment and attendance.**