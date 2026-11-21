# Badminton Wing — Structure Reference

> **Purpose:** Structural knowledge for coding agents across context windows — routes, server/client boundaries, live migration status, and reusable utilities.
> **Companions:** Architectural rules, domain invariants, and business logic live in `BW_Architecture_2.md`. Database definitions live in `database.types.ts` and `database_schema.sql`.

---

## 1. Route Map

| Route | Route Group | Render Type | Data Source | Auth Guard | Notes |
|---|---|---|---|---|---|
| `/login` | `(auth)` | Client Component | Supabase Auth | Public | Email/password login via browser client |
| `/dashboard` | `(management)` | Server to Client | Supabase + isolated Demo accounts card | Layout Guard | Day/Week/Month activity, receipts, fee and attendance alerts, current inventory |
| `/students` | `(management)` | Server → Client | ✅ Supabase | Layout Guard | Shared coaching directory: Active, Inactive and Dropout; Court Memberships has a separate route |
| `/students/[id]` | `(management)` | Server → Client | ✅ Supabase | Layout Guard | Profile tabs: Details, Transactions (voidable), Attendance |
| `/batches` | `(management)` | Server → Client | ✅ Supabase | Layout Guard | Batch cards, active schedule, student counts |
| `/batches/[id]` | `(management)` | Server → Client | ✅ Supabase | Layout Guard | Separate Attendance, Students and Transactions modules; explicit attendance/history rosters |
| `/enquiries` | `(management)` | Server → Client | ✅ Supabase | Layout Guard | Lead management, status transitions (`not_scheduled` → `scheduled` → `completed`) |
| `/inventory` | `(management)` | Server → Client | ✅ Supabase | Layout Guard | Stock catalogue, SKU uniqueness, selling/cost price in paise |
| `/accounts` | `(management)` | Server → Client | ✅ Supabase | Layout Guard | Dual ledger: "Expenses" + "Sales / Income" (Inventory & Quick sales) |
| `/court-memberships` | `(management)` | Client Component | ⚠ Mock | Layout Guard | Membership directory, enrollment and check-in; controlled by mock settings |
| `/court-memberships/[id]` | `(management)` | Client Component | ⚠ Mock | Layout Guard | Membership profile, session balance and check-in history |
| `/transactions` | `(management)` | Server → Client | Coaching: Supabase; Court: Mock | Layout Guard | Coaching uses `src/components/transactions/`; route wrapper owns Coaching/Court switch |
| `/reports` | `(management)` | Server to Client | Fees: Supabase; Students and Attendance: mock | Layout Guard | Fees shares one Week/Month and batch filter across four cards and export |
| `/communications` | `(management)` | Client Component | ⚠ Mock + Stub | Layout Guard | Template gallery, message logs, WhatsApp API stub |
| `/settings` | `(management)` | Server → Client | ⚠ In-memory mock records | Layout Guard | Server page renders academy/staff/communications/events sections without fetching business records; permissions are a static display reference |

---

## 2. Client / Server Boundary Architecture

> **The Single Architectural Boundary Rule:**
> **All `page.tsx` files for migrated features MUST be async Server Components** that fetch initial data through server-only queries (`src/lib/queries/<feature>.ts`) and pass props down.
> **All interactive views, modals, filters, and forms live inside `_components/` or `src/components/` and MUST be Client Components (`'use client'`).**
> **Migrated Client Components NEVER call Supabase directly for business-record writes or reads.** All business mutations MUST call Server Actions (`actions.ts` co-located in the route folder), which verify permissions via `getServerSession()`, perform the database mutation, and invoke `revalidatePath()`.

This boundary applies to migrated business data. Browser Supabase Auth is used by Login and Sidebar sign-out. Sidebar feature flags and TopBar branch selection still consume mock settings/branches; their persistence migration is outstanding.

### Folder Layout Standard
```
src/app/(management)/<feature>/
  page.tsx              — Async Server Component: calls queries, passes data as props
  loading.tsx           — Skeleton loader for route transitions
  error.tsx             — Error boundary for server-side exceptions
  actions.ts            — Server Actions ('use server') for all mutations
  _components/          — Client Components ('use client') for UI, state & modals
```

### Domain models, constants, and demo records

- `src/lib/types/{students,payments,batches,attendance,enquiries,inventory,accounts,court,settings,communications}.ts`: application types. Import with `import type`. These retain rupee amounts, camelCase fields, optional legacy timestamps and derived statuses; raw database rows remain in `src/lib/supabase/database.types.ts`.
- `src/lib/constants/accounts.ts`: built-in expense/income categories.
- `src/lib/constants/inventory.ts`: built-in inventory categories.
- `src/lib/constants/permissions.ts`: permission display matrix, not authorization enforcement.
- `src/lib/court-utils.ts`: pure membership label/people-count helpers.
- `src/lib/mock-data.ts`: sample records and mutable demo state only. It does not re-export application types, constants or helpers.
- All `src/lib/queries/` modules import `server-only`. Next.js enforces this marker without an additional package installation.
- `eslint.config.mjs` prohibits mock-data imports in migrated feature modules and the new types/constants/helper modules. The route shell, explicit mock features, and unused legacy AccountEntryModal remain outside that restriction.
- StudentList uses only supplied batch choices; empty results stay empty. ExpenseModal requires real custom-category data and a persistence callback, and adds a category only after persistence succeeds.

### Batch Detail module layout and state lifetime

```text
batches/[id]/
  page.tsx                         — Server fetching; BatchDetail keyed by batch UUID
  actions.ts                      — Existing full-day attendance upsert
  _components/
    BatchDetail.tsx                — Header, tabs and always-mounted attendance controller
    BatchAttendanceTab.tsx         — Insight/marking composition
    BatchStudentsTab.tsx           — Shared StudentList adapter
    BatchTransactionsTab.tsx       — Shared CoachingTransactions adapter
    attendance/
      AttendanceInsights.tsx
      AttendanceMarking.tsx        — Marking view and sticky action export
      useBatchAttendance.ts       — Drafts, navigation synchronization, saving and refresh
      attendance-utils.ts         — Pure navigation/date/roster calculations
```

The query returns `{ attendanceStudents, historyStudents }`. Attendance includes active/due-soon/expired profiles. History includes inactive and dropout members associated with the current batch. Enrolled card/header counts include inactive and exclude dropout. The attendance controller remains mounted across tab switches, retaining unsaved drafts. Full-day drafts preserve saved marks for hidden students. URL requests and refreshed records synchronize without resetting a draft on ordinary tab clicks.

---

## 3. Migration Tracker (Data Source Per Feature)

Verify the actual page-to-query/action flow when classifying a feature. Merely having an async server page or a query file does not prove persistence. Feature-level live modules have no mock-data imports; remaining shell dependencies are recorded separately.

| Feature | Route | Live Data Source | Migration Status |
|---|---|---|---|
| **Authentication** | `/login` | Supabase Auth (SSR cookies) | ✅ Fully Migrated |
| **Students (Coaching)** | `/students`, `/students/[id]` | Supabase `students`, `student_payments`, `student_membership` | 🟡 Fee refactor implemented in code; unit normalization, DB follow-up, and live flow verification pending |
| **Batches** | `/batches`, `/batches/[id]` | Supabase `batches` | ✅ Fully Migrated |
| **Attendance** | `/batches/[id]` | Supabase `attendance_records` | ✅ Fully Migrated |
| **Enquiries** | `/enquiries` | Supabase `enquiries` | ✅ Fully Migrated |
| **Inventory** | `/inventory` | Supabase `inventory_items` | ✅ Fully Migrated |
| **Accounts & Sales** | `/accounts` | Supabase `account_entries` (expenses), `sales`, `custom_expense_categories` | ✅ Feature data migrated |
| **Settings** | `/settings` | In-memory `mockSettings`, `mockStaffMembers`, `mockEvents`; static permission matrix | ⚠ Persistence migration pending; `queries/settings.ts` only re-exports batch queries |
| **Dashboard** | `/dashboard` | Academy-scoped students, receipts, batches, attendance, enquiries and inventory | Live feature data; monthly accounts summary remains explicitly Demo |
| **Court Memberships** | `/court-memberships`, `/court-memberships/[id]` | `mockCourtMemberships`, `mockCourtPlans`, `mockSettings` | ⚠ Pending Migration |
| **Fee Transactions** | `/transactions` | Coaching: Supabase `student_payments` and `student_membership`; Court: mock memberships | 🟡 Coaching wired; Court pending migration |
| **Reports** | `/reports` | Fees: `student_payments`, `students`, `batches`; Students/Attendance: `mockStudents`, `mockAttendance`, `mockBatches` | Fees migrated; Students and Attendance pending |
| **Communications** | `/communications` | `mockMessageLogs` + `/api/whatsapp/send` stub | ⚠ Pending Migration |

Sidebar/TopBar still use mock settings/branches. `AccountEntryModal.tsx` and `settings/_components/BranchesSection.tsx` are legacy components outside the current management-page import graph; their demo branches are not counted as live feature behavior.

---

## 4. Reuse, Never Reimplement

Do NOT write custom formatting, date math, or enum conversions. when required import and use these canonical helpers:

| Helper | File Path | Signature | Purpose & Rule |
|---|---|---|---|
| `formatCurrency` | `src/lib/utils.ts` | `(amount: number) => string` | Formats Rupee amounts as `₹1,500` (en-IN). Never format currency inline. |
| `getTodayIST` | `src/lib/utils.ts` | `() => string` | Returns current date in `YYYY-MM-DD` in `Asia/Kolkata`. Never use `new Date().toISOString()`. |
| `getDateDaysAgoIST` | `src/lib/utils.ts` | `(daysAgo: number) => string` | Returns past date string `YYYY-MM-DD` in IST. |
| `deriveStudentStatus` | `src/lib/utils.ts` | `(nextDueDate: string) => StudentStatus` | Computes dynamic real-time status from the latest active receipt in IST (Due in <= 3 days = due-soon, overdue = expired). |
| `toAppEnum` | `src/lib/utils.ts` | `(v: string) => string` | Converts DB underscores to app hyphens (e.g., `due_soon` → `due-soon`). |
| `toDbEnum` | `src/lib/utils.ts` | `(v: string) => string` | Converts app hyphens to DB underscores (e.g., `due-soon` → `due_soon`). *(Exception: student_status uses hyphen in DB).* |
| `getServerSession` | `src/lib/supabase/auth-context.ts` | `() => Promise<{ supabase, user, academyId, role }>` | Authenticated tenant & role context. Server-only. Redirects to `/login` if unauthenticated. |

---

## 5. Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client & Server | Hosted Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client & Server | Supabase anonymous public API key |
| `WHATSAPP_API_KEY` | Server-only | Meta WhatsApp Cloud API bearer token (stub) |
| `WHATSAPP_PHONE_NUMBER_ID` | Server-only | Meta registered business sender ID (stub) |
 

### Modal refinement supplement (2026-11-13)

- AddStudentModal: Personal Details / Coaching Details vertical tabs, address, email, enroll days; shared enrollment/re-enrollment persistence.
- FeeReceiptModal: Payment For, Amount, conditional partial payment fields, optional mode dropdown and transaction ID.
- DueClearanceModal: locked outstanding amount, original payment/coverage summary, transaction ID.
- students/actions.ts and queries/students.ts: new profile fields, nullable receipt mode, transaction ID mapping and typed clearance RPC.
- FeesSegment: Unspecified payment bucket is included in chart totals, percentages and exported rows. Reports still consume existing mock data; this task does not migrate their source.
- Database migration: src/lib/supabase/migrations/20261113000001_modal_fields.sql. Generated-style database types updated locally to match; regenerate from Supabase after deployment.
- Migration and authenticated end-to-end verification remain pending. Existing transaction-tab columns are unchanged.

### Coaching transaction tab refinement (2026-11-14)

Shared modules now live under src/components/transactions/ (promoted from the transaction route):
- RecentTab owns the shared seven-column Recent/Paid receipt layout; PaidTab continues delegating.
- PendingTab owns five columns, due badges, and Collect Fee / Remind Now.
- PartialTab owns seven columns, full coverage range, receipt aging, and Collect Remaining / Remind Now.
- transaction-utils.ts provides local date/range formatting, day counts, phone normalization, and reminder drafts.
- ReminderLink.tsx provides the shared WhatsApp draft link and invalid-number disabled state.
- CoachingTransactions passes one IST today value to Pending/Partial and owns shared tab/filter/modal state. TransactionsView retains the route heading and Coaching/Court switch. types.ts includes PartialTabProps and explicit scope types.

No schema, query, server-action, or global formatter changes are required by this refinement. No migration was added. Details and verification are in Documentation_reports/Fees_Transaction/Transactions_Tabs_Columns_Refinement_Report.md.

### Development fee repair (2026-11-14)

- Revised src/lib/supabase/migrations/20261112000003_normalize_legacy_fee_units.sql converts the audited legacy fields only and preserves newer paise values.
- Revised 20261112000004_due_clearance_and_adjustment.sql reconciles existing test clearances, installs deduction/reversal and financial guards, preserves the current transaction-ID RPC, and repairs membership/pending synchronization. Run after 00003; the already-installed modal-fields migration should not be replayed.
- src/lib/supabase/migrations/README.md contains SQL Editor run order, test-data decisions, checkpoint behavior, and local verification commands.
- src/lib/supabase/migrations/tests/verify-fee-migrations.cjs executes the actual scripts in isolated PostgreSQL/PGlite with audited financial fixtures and relevant RLS policies. It also verifies that fresh-schema accounting definitions match the migration.
- src/lib/supabase/database_schema.sql now includes complete accounting for fresh databases. Existing DBs use the two repair scripts instead of replaying the full schema.

Current application money conversion already follows the paise contract. Hosted execution and authenticated UI/concurrent-request checks remain pending; these local changes do not modify Supabase.

### Transaction ordering fix (2026-11-14)

- src/lib/types/students.ts and payments.ts: Student and PaymentEntry expose optional createdAt for existing database timestamps; legacy/mock records remain compatible.
- src/lib/queries/students.ts: mapStudentRow/mapPaymentRow preserve created_at in createdAt, without changing directory or payment-history query ordering.
- src/components/transactions/transaction-utils.ts: compareReceiptRows and comparePendingStudents centralize deterministic ordering and legacy fallbacks.
- TransactionsView sorts freshly derived arrays; Recent/Paid/Partial inherit the same issue-time ordering. Pending compares one ascending reference across all rows: active membership next_due_date at IST midnight, or actual student created_at for New profiles. No tiers or joining_date fallback are used. Equal references use newest receipt/enrollment activity, then ID; missing/invalid references sort last. getDueIndicator renders today as red Overdue Today and reminder text treats today as overdue; global status derivation remains unchanged. Original student/payment arrays are not mutated.

No database objects, server actions, table components, global date formatting, or report files were changed for this fix.

### Batch detail and transaction reuse (2026-11-15)

- src/lib/queries/students.ts: corrected standard UUID detection in getStudentsByBatch; directory counts in BatchesView now match currentBatchId rather than batch name.
- batches/[id]/page.tsx supplies the scoped students, attendance and academy batch choices. BatchDetail retains attendance and embeds the shared StudentList and CoachingTransactions; the legacy tables/filter/modal code was removed.
- src/components/students/StudentList.tsx was moved from the students route. batchScope embeds the same directory with fixed membership and batch UUID enrollment defaults; the main students page uses the shared import.
- src/components/transactions/{RecentTab,PaidTab,PendingTab,PartialTab,ReminderLink}.tsx, transaction-utils.ts and types.ts were moved from the transaction route. CoachingTransactions.tsx and transaction-data.ts add the controller and pure scope/filter/row selection.
- The transaction page passes academy scope, Batch Detail passes batch scope, and StudentProfileView passes only one student plus student scope. New Pending placeholders are included in academy/batch views and excluded from individual financial histories.
- Historical partial balances for inactive/dropout students remain accessible in batch and individual histories; the academy partial work queue retains its active-profile policy. Current members bring their full history after batch transfers.
- Student actions revalidate batch listing and batch-detail page routes after mutations. No database objects changed.

Verification and the complete per-file/CRUD report: Documentation_reports/Batch_Detail_Shared_Modules_Report.md. Browser inspection was attempted but the computer-use runtime could not initialize; fixture checks and the production build cover the local implementation.

Current roster and structural checkpoint details: `Documentation_reports/Phase_1_Batch_Rosters_Report.md` and `Documentation_reports/Phase_2_Batch_Detail_Split_Report.md`. Authenticated browser checks remain outstanding; see those reports for the verified local scope.

### Live dashboard

`dashboard/page.tsx` is an async Server Component. `src/lib/queries/dashboard.ts` authenticates and scopes every paginated query by academy ID. Pure period/metric logic lives in `src/lib/dashboard/`; card DTOs live in `src/lib/types/dashboard.ts`. The only interactive filter is `_components/PeriodNavigation.tsx`; substantial card sections have separate modules.

Day/Week/Month periods use IST and Monday-based weeks. Historical dues/overdue snapshots are unavailable, not inferred from current balances. Paid Students shows one row per non-voided receipt, including clearances. Fee Alerts use current original-receipt balances due in the period, include inactive/dropout balances, and separate non-debt renewal reminders; they are hidden for past periods. Attendance rates count explicit marks, retain recorded hidden/transferred students, and use 60% / three sessions for weekly/monthly flags. Today-only scheduled-batch prompts compare marks against the active roster. Batch Revenue is removed. Low Stock is current inventory. Only DemoMonthlySummaryCard may import mock data.

Relevant student, batch, attendance, enquiry, inventory and inventory-sale writes invalidate `/dashboard`. Verification and limitations: `Documentation_reports/Dashboard_Live_Refinement_Report.md`; local command: `node scripts/verify-dashboard.mjs`.
