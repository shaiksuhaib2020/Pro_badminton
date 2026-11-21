# Badminton Wing — Architecture Reference

> **Purpose:** Authoritative architectural decisions, domain invariants, business rules, and tenancy models across context windows.
> **Companions:** Structural routes, component layouts, and migration tracker live in `BW_Structure_2.md`. Database definitions live in `database.types.ts` and `database_schema.sql`.

---

## 1. System Overview

**Badminton Wing** is a dedicated **coaching academy management SaaS** tailored for badminton academies in India. It manages the full academy lifecycle: student enrollment, fee collection, batch scheduling, attendance marking, court membership plans, inventory stock tracking, and sales/expense ledgers.

### Product Scope & Platform Strategy
- **Desktop Web Application (Current Scope):** Exclusively designed for the **Owner** and **Manager**. It serves as the single administrative command center for all business operations, financials, staff, and configurations.
- **Coach Mobile Application (Post-Deployment Scope):** Coaches do not use the desktop dashboard. A separate, lightweight mobile experience will be provided specifically for court-side operations (batch overview and attendance marking).
- **Receptionist & Accountant:** Secondary roles with strict, scoped permissions enforced at both the database RLS layer and server action authorization checks.

---

## 2. Stack & Immutable Constraints

| Layer | Technology | Hard Constraints |
|---|---|---|
| **Framework** | Next.js 16.3.1 (App Router) | All routes under `src/app/(management)/` or `src/app/(auth)/`. No Pages router. |
| **Language** | TypeScript 5 (Strict Mode) | No `any`. Rely on generated types from `src/lib/supabase/database.types.ts`. |
| **Runtime** | React 19.2.8 | Async Server Components by default for pages; Client Components (`'use client'`) for interactive views. |
| **Styling** | Tailwind CSS v4 | Strict adherence to `so-*` design tokens defined in `docs/UIPatterns.md`. No inline styles. |
| **Icons** | Lucide React | Sole icon library. Standard size: `w-5 h-5 shrink-0 strokeWidth={1.75}` (or `w-4 h-4` for compact UI). |
| **Charts** | Recharts ^3.10.1 | Allowed on `/dashboard` and `/reports` only. Never inside modals or table rows. |
| **Auth & DB** | Supabase (PostgreSQL 15+) | Multi-tenant RLS on every table. SSR cookie authentication (`@supabase/ssr`). |
| **Timezone & Dates** | IST (`Asia/Kolkata`), date-fns | All dates stored as `YYYY-MM-DD` strings. Never store raw JavaScript `Date` objects in state or DB. |
| **Currency** | INR (Paise in DB, Rupees in UI) | **DB stores paise (INTEGER)**. App displays whole Rupees (`₹1,500`). Multiply by 100 on write, divide by 100 on read. |

---

## 3. Tenancy, Auth & Role-Based Access Control

### 3.1 Multi-Tenant SaaS Architecture
1. **Tenant Isolation:** Every table in Supabase contains an `academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE`.
2. **Row Level Security (RLS):** All data access is filtered through PostgreSQL RLS functions (`get_my_academy_id()` and `get_my_role()`). No academy can read or write another academy's records under any circumstance.
3. **Branching Model:** 
   - **Current State:** Single-branch SaaS module per academy.
   - **Target State:** Multi-branch scaling is built into the schema (`branch_id` nullable FK), but the UI multi-branch toggle is intentionally deferred until post-deployment.

### 3.2 Dual Auth Guard Pipeline
```
HTTP Request
  ├── 1. Middleware Guard (src/proxy.ts)
  │      Refreshes Supabase session cookie. Redirects unauthenticated requests to /login.
  └── 2. Layout Server Guard (src/app/(management)/layout.tsx)
         Verifies session server-side with supabase.auth.getUser().
         Renders Sidebar + TopBar administrative shell.
```
In server actions and queries, **`getServerSession()`** (`src/lib/supabase/auth-context.ts`) resolves `{ supabase, user, academyId, role }` and verifies tenant identity before business queries execute.

### 3.3 Role Permission Matrix
Five staff roles exist in the database (`owner`, `manager`, `coach`, `accountant`, `receptionist`):

| Module | Owner | Manager | Coach (Mobile) | Accountant | Receptionist |
|---|---|---|---|---|---|
| **Dashboard** | Full | Full | View | View | View |
| **Students** | Full | Full | View | View | Partial (Add/Edit) |
| **Batches** | Full | Full | View | None | None |
| **Attendance** | Full | Full | Mark | None | None |
| **Fee Transactions** | Full | Full | None | Full | Collect |
| **Accounts & Sales** | Full | View | None | Full | None |
| **Inventory** | Full | Full | None | View | None |
| **Court Members** | Full | Full | None | View | Collect |
| **Settings** | Full | Partial | None | None | None |
| **Enquiries** | Full | Full | View | View | Partial (Add/Edit) |

---

## 4. Layering & Request Pipeline

```
Page Request
  → page.tsx [Server Component]
      Fetches data via src/lib/queries/<feature>.ts (Server-only)
      Passes clean props to Client View
    → _components/<Feature>View.tsx ['use client']
        Manages UI state, search/filters, and modal visibility
      → _components/<Modal>.tsx ['use client']
          Triggers mutation via Server Actions (actions.ts)
        → actions.ts ['use server']
            1. Calls getServerSession() (tenancy + auth check)
            2. Validates inputs & converts currency (Rupees → Paise)
            3. Executes Supabase mutation via server client
            4. Calls revalidatePath() to purge Next.js router cache
```

**Cardinal Rules:**
- `lib/` must never import from `components/` or `app/`.
- Migrated Client Components **never** read or write Supabase business records directly. Business mutations go through `actions.ts`.
- Every mutation must call `revalidatePath('/<route>')` upon completion.

### 4.1 Application models and data-source boundaries

- Application models live under `src/lib/types/` by feature and use explicit `import type`. They retain rupee values, camelCase fields, optional legacy timestamps, and derived statuses. Generated Supabase row types remain the database-boundary types; they are not interchangeable with application models.
- Legitimate built-in categories and the permission display matrix live under `src/lib/constants/`. The matrix is a UI reference; authorization still depends on server checks and database RLS. Pure court label/count helpers live in `src/lib/court-utils.ts`.
- `src/lib/mock-data.ts` contains sample records and in-memory demo state only. Migrated business modules must not import it. ESLint enforces that restriction; all query modules import `server-only` to prevent accidental client use.
- Supabase Auth is also used in the browser for Login and Sidebar sign-out. Business-record reads/writes retain the server boundary described above.
- Settings currently persists academy/staff/event/communication edits only in memory. Reports, Court Memberships, Communications and shell feature/branch settings also retain explicit demo dependencies. The dashboard reads live Supabase business data, with an isolated monthly accounts Demo card. An async page or an unused query helper does not establish migration. The current per-route inventory is in `BW_Structure_2.md`.
- Empty database results stay empty. StudentList does not substitute sample batches; ExpenseModal requires custom categories plus a persistence callback and updates its list only after successful persistence.

---

## 5. Domain Logic & Business Rules

### 5.1 Student Lifecycle & Dynamic Status Derivation
- **State Machine:**
  ```
  [Enrolled, no receipt] → active profile / Pending fee ──(first receipt)──► active membership
  [Active membership] ──(Due in ≤3 days)──► due-soon ──(Past due date)──► expired (Overdue)
     │                                                                           │
     ├──► inactive (deactivateStudent) ◄─────────────────────────────────────────┤
     └──► dropout (DropoutConfirmModal) ──(AddStudentModal isReEnroll)──► active ┘
  ```
- **Real-Time Dynamic Derivation (Critical Rule):**
  PostgreSQL triggers are event-driven (`INSERT`/`UPDATE`), not time-driven. Without a paid `pg_cron` extension, static DB rows will not advance as calendar days pass.
  Therefore, queries read the latest active coverage receipt from `student_membership` and dynamically derive student status using `deriveStudentStatus(nextDueDate)`:
  - `status IN ('dropout', 'inactive')` $\rightarrow$ Preserved as set by staff.
  - No active coverage receipt $\rightarrow$ active administrative profile; shown in academy/batch Pending with no due date or collected amount. Individual financial histories omit this enrollment placeholder.
  - `nextDueDate < todayIST` $\rightarrow$ `'expired'` *(Displayed in UI as **Overdue** in bold red)*.
  - `nextDueDate <= todayIST + 3 days` $\rightarrow$ `'due-soon'` *(Displayed in UI as **Due Soon** in amber)*.
  - `nextDueDate > todayIST + 3 days` $\rightarrow$ `'active'` *(Displayed in UI as **Active** in green)*.

### 5.2 Enrollment, Re-Enrollment & Fee Receipts
- **New Enrollment (`AddStudentModal.tsx`):**
  - Duplicate check by phone within the academy.
  - Creates only a `students` profile. Optional default `fees` starts at zero; no payment or coverage row is created.
  - `joining_date` is immutable (enforced by `tr_students_immutable_joining_date`).
- **Consolidated Re-Enrollment (`AddStudentModal.tsx` with `isReEnroll={true}`):**
  - Standalone `ReEnrollModal.tsx` and `RenewModal.tsx` have been **permanently removed**.
  - Inactive/Dropout students are re-enrolled by clicking "Re-enroll" in the inactive list, which opens `AddStudentModal` pre-filled with the student's personal details.
  - Reactivates the profile and preserves historical receipts without creating a payment. Coverage is established separately.
- **Fee Collection (`FeeReceiptModal.tsx`):**
  - Each active non-clearance `student_payments` receipt owns `start_date` and `next_due_date`; `student_membership` selects the latest by coverage start date and ignores legacy rows missing coverage dates.
  - Partial payment still grants full coverage; `remaining_amount` records the unpaid portion.
  - A `due_clearance` receipt references the original receipt and has no coverage dates. The `record_student_due_clearance` RPC inserts it, and the database trigger atomically reduces the original balance; voiding the clearance restores it.
  - Historical unpaid balances remain collectible after dropout and re-enrollment. Inactive original receipts retain their remaining balance and can be settled by a clearance receipt.
  - The latest active receipt's due date can be adjusted by owner/manager through an audited RPC.
  - Database trigger `sync_student_pending_amount()` (SECURITY DEFINER) automatically recalculates `students.pending_amount` whenever a payment row is inserted, updated, or voided.
- **Dropout (`DropoutConfirmModal.tsx`):**
  - Requires dropout reason and date. Sets status to `'dropout'` and marks active payment records as inactive.

### 5.3 Accounts & Sales Module (V2 Segregated Ledger)
- **Dual Tab Architecture:** `/accounts` is segregated into **Expenses** and **Sales / Income**.
- **Sales Flow:**
  - **Quick Sale (`QuickSaleForm.tsx`):** For ad-hoc walk-in sales or non-inventory revenue (e.g. racket restringing, grip wrapping). Requires item name, price > 0, date, payment method, optional notes.
  - **Inventory Sale (`InventorySaleForm.tsx`):** Atomic two-phase sale. Staff selects an inventory item, sets quantity bounded by live stock.
  - **Atomic Stock Deduction:** Handled by Supabase RPC `record_inventory_sale(p_academy_id, p_inventory_item_id, p_quantity, ...)`. Row-locks inventory record, verifies stock, decrements quantity, and writes the `sales` row in one atomic transaction.
  - **Sale Reversal:** `reverse_inventory_sale()` RPC restores stock on edit or delete.
- **Expense Flow (`ExpenseModal.tsx`):**
  - Description, Date (default `getTodayIST()`), Category, Amount, Mode (optional), Vendor (optional), Notes (optional).
  - Custom categories are saved per academy in the `custom_expense_categories` table and become available in the dropdown after the server callback succeeds.

### 5.4 Attendance Marking
- Recorded per batch and date in `/batches/[id]`.
- Upserts the full day's attendance as JSONB map `{ "<student-uuid>": "present" | "absent" }` with `onConflict: 'batch_id, date'`.
- Saving overwrites the record for that date. No partial row updates. Validated by database trigger `tr_attendance_validate_records`.

### 5.5 Court Membership & Action Placement Rule
- **Plan Types:** Monthly (time-based with `start_date`, `end_date`) vs Sessions (count-based with `total_sessions`, `remaining_sessions`).
- **Strict Separation of Operational vs Fee Actions (Locked Invariant):**
  - **Members Page (`/court-memberships`, profile at `/court-memberships/[id]`):** Directory, member profiles, and operational **Check In** (decrements `remaining_sessions` with 5-second undo strip). This court flow currently uses in-memory demo records.
  - **Fee Transactions Page (`/transactions`):** All financial actions (**Renew, Buy Sessions, Collect Pending**).
  - **Never place fee actions on the Members page.**

---

## 6. Data & Representation Invariants

1. **Currency in Paise:**
   - Database columns (`fees`, `amount`, `pending_amount`, `price`, `selling_price`, `unit_price`, `paying_now`, `partial_due`) are **integers in paise**.
   - Multiply by 100 before writing to Supabase; divide by 100 after reading.
   - Always display in UI using `formatCurrency(amount)` (which outputs Rupee amounts like `₹1,500`).
2. **Dates in IST:**
   - Always store and compare as `YYYY-MM-DD` strings.
   - Always obtain current date via `getTodayIST()`. Never compare against UTC dates.
3. **Enum Conventions & Quirks:**
   - PostgreSQL `student_status` uses `'due-soon'` (with hyphen) as the DB enum value. Do not convert it.
   - PostgreSQL court and enquiry enums use underscores (`due_soon`, `sessions_low`, `not_scheduled`, `session_topup`).
   - Use `toAppEnum()` and `toDbEnum()` from `src/lib/utils.ts` when crossing the DB boundary for court and enquiry states.

---

## 7. Key Database Invariants & Triggers

PostgreSQL triggers enforce critical side-effects and constraints in the database. Understanding these prevents coding agents from writing conflicting client calculations or triggering database exceptions.

| Invariant / Trigger | Target Table | Trigger Timing & Scope | Enforced Behavior | Agent Implementation Guardrail |
|---|---|---|---|---|
| `tr_sync_pending_amount_after_payment` | `student_payments` | AFTER INSERT, UPDATE (`remaining_amount`, `status`, `student_id`), DELETE | Automatically recalculates `students.pending_amount` by summing `remaining_amount` of non-deleted payment rows. Uses `SECURITY DEFINER`. | **NEVER manually calculate or update `students.pending_amount` in JavaScript.** Inserting or updating a payment entry automatically adjusts the balance. |
| `tr_students_immutable_joining_date` | `students` | BEFORE UPDATE OF `joining_date` | Preserves the original enrollment date. | Never edit `joining_date` during re-enrollment or student edit. |
| `tr_student_due_clearance` | `student_payments` | BEFORE INSERT or relevant UPDATE | Applies and reverses clearance against the original receipt under row lock, rejects overpayment, and blocks voiding an original with non-voided clearances. | Insert via `record_student_due_clearance`; never update the original balance in application code. Requires migration `20261112000004_due_clearance_and_adjustment.sql`. |
| `tr_guard_student_receipt_amounts`, `tr_guard_student_receipt_due_date` | `student_payments` | BEFORE UPDATE of financial fields or due date | Blocks direct financial edits and unaudited due-date changes. | Use due-clearance receipts for balances and `adjust_student_receipt_due_date` RPC for due-date changes. |
| `tr_payments_immutable_student_id` | `student_payments` | BEFORE UPDATE OF `student_id` | Throws an exception if `student_id` is modified. A payment entry can never be transferred to another student. | **Never reassign payment records.** Void the incorrect payment (`status = 'deleted'`) and create a new payment for the correct student. |
| `tr_attendance_validate_records` | `attendance_records` | BEFORE INSERT OR UPDATE OF `records` | Validates JSONB map: all keys must be valid student UUIDs and values must be strictly `'present'` or `'absent'`. | **Pass only `{ [studentId: string]: 'present' \| 'absent' }`.** Never put arbitrary strings or flags in `records`. |
| `tr_court_people_enforce_count` | `court_membership_people` | BEFORE INSERT | Enforces that attached individual records do not exceed `court_memberships.people_count` (capped at 1–8). | **Do not bypass the `people_count` check in court member modals.** |
| `Cross-Tenant FK Validation Triggers` | `students`, `batches`, `court_memberships` | BEFORE INSERT OR UPDATE | Ensures referenced entities (e.g., student batch, court plan) belong to the exact same `academy_id`. | **Never attempt cross-academy associations.** Always scope queries and actions by `academyId`. |

---

## 8. Reuse, Never Reimplement

Do NOT write custom formatting, date math, or enum conversions. Import and use these canonical helpers:

| Helper | File Path | Signature | Purpose & Rule |
|---|---|---|---|
| `formatCurrency` | `src/lib/utils.ts` | `(amount: number) => string` | Formats Rupee amounts as `₹1,500` (en-IN). Never format currency inline. |
| `getTodayIST` | `src/lib/utils.ts` | `() => string` | Returns current date in `YYYY-MM-DD` in `Asia/Kolkata`. Never use `new Date().toISOString()`. |
| `getDateDaysAgoIST` | `src/lib/utils.ts` | `(daysAgo: number) => string` | Returns past date string `YYYY-MM-DD` in IST. |
| `deriveStudentStatus` | `src/lib/utils.ts` | `(nextDueDate: string) => StudentStatus` | Dynamic real-time calculation in IST (Due in $\le 3$ days = `due-soon`, overdue = `expired`). Administrative inactive/dropout overrides are applied in queries. |
| `toAppEnum` | `src/lib/utils.ts` | `(v: string) => string` | Converts DB underscores to app hyphens (e.g., `due_soon` → `due-soon`). |
| `toDbEnum` | `src/lib/utils.ts` | `(v: string) => string` | Converts app hyphens to DB underscores (e.g., `due-soon` → `due_soon`). *(Exception: student_status uses hyphen in DB).* |
| `getServerSession` | `src/lib/supabase/auth-context.ts` | `() => Promise<{ supabase, user, academyId, role }>` | Authenticated tenant & role context. Server-only. Redirects to `/login` if unauthenticated. |

---

## 9. External Services & Environment

| Service | Purpose | Live Status | Required Environment Variables | Architecture Notes |
|---|---|---|---|---|
| **Supabase Auth** | User authentication & session management | ✅ Active | `NEXT_PUBLIC_SUPABASE_URL`<br>`NEXT_PUBLIC_SUPABASE_ANON_KEY` | SSR cookie sessions. Browser client for Login and Sidebar sign-out; authenticated business queries/actions use the server client. |
| **Supabase PostgreSQL** | Multi-tenant relational database | ✅ Active | Same as above | RLS enforced via `get_my_academy_id()`. Direct API type generation via `npm run db:types`. |
| **Meta WhatsApp Cloud API** | Fee receipts, fee reminder alerts, birthday wishes | 🔲 Stub (`/api/whatsapp/send`) | `WHATSAPP_API_KEY`<br>`WHATSAPP_PHONE_NUMBER_ID` | Mock route logs message payload to console. Full production provider integration planned post-v1. |

---

## 10. Known Architectural Boundaries & Deferred Items

| Item | Scope / Classification | Target Resolution |
|---|---|---|
| **Coach Mobile App** | Mobile-only feature | Deferred to post-deployment dedicated mobile interface. |
| **Multi-Branch Module** | Scaling feature | Database schema supports `branch_id`; UI switcher activated post-v1 launch. |
| **Offline Mode** | Network tolerance | Not supported in v1; application requires active internet connection. |
| **WhatsApp Notifications** | Automated messaging | `/api/whatsapp/send` is an active stub; production integration planned post-launch. |
| **Reports Migration** | Supabase migration | Fees uses live coaching receipts. Students and Attendance still consume mock seed arrays. Dashboard feature cards are live; its accounts summary remains explicitly Demo. |
| **Settings, Court, Communications and shell settings** | Persistence migration | Business records/feature flags remain in memory; each requires separate migration work. |

### 5.2 supplement: enrollment and receipt fields (2026-11-13)

Enrollment and re-enrollment persist optional address, email, and independent multi-select enroll_days (Monday?Sunday). Existing records default to empty days. Re-enrollment preserves joining_date and creates no payment.

Fee Receipt labels coverage as Payment For (Start Date / Next Due Date). Amount is the total charge; unchecked Partial Payment collects it in full. Checked Partial Payment requires a positive Paying Now below Amount; Partial Due is calculated in paise and read-only. Payment Mode, Transaction ID, and Notes are optional. Blank mode is stored as NULL and reported as Unspecified without dropping collected revenue. Transaction ID is stored on the receipt, including clearance receipts.

### 7 supplement: exact balance clearance

Migration 20261113000001_modal_fields.sql adds students.address, email, enroll_days; allows NULL student_payments.payment_method; and replaces record_student_due_clearance with a transaction-ID parameter. The RPC locks the original receipt and requires the submitted positive amount to equal its current remaining_amount. Stale balances fail rather than silently changing the collection amount. Existing apply/reversal and pending-balance triggers remain authoritative. Clearance retains its required mode. Paid Already shows the original receipt amount (not cumulative historical clearances); missing legacy coverage displays Unavailable.

Deployment: migration prepared locally; hosted application remains pending explicit deployment instruction and authenticated verification. Apply after migrations through 20261112000004. Deploy the database change before the updated application.

### 5.2 supplement: coaching transaction displays (2026-11-14)

Recent/Paid share the same receipt table: Name, Phone Number, Amount Paid, Date, Payment For, Mode, Action. Remaining balances appear below Amount Paid only when positive. Type/Status are hidden display columns; data and membership/filtering rules are unchanged. Recent still includes voided receipts, with no repeat-void action. A bin icon invokes the existing void confirmation, not physical deletion. Blank modes remain Unspecified.

Pending shows Name, Phone Number, Amount, Due Date, Action. Amount remains the student fee reference for students with active coverage; no-coverage profiles show a hyphen. Due-soon/overdue rows remain eligible. No new debt is created when coverage expires. Partial balances remain in Partially Paid, with original receipt amount and current remaining amount shown separately.

Dates use dd MMM, yyyy locally to transaction tabs. A shared IST today value supplies Overdue Today / Overdue Nd / Due in Nd / New indicators and receipt aging. Future-dated receipts clamp age to zero. Linked due-clearance Payment For resolves the original receipt; missing/invalid legacy coverage displays a hyphen.

Remind Now opens a user-reviewed WhatsApp draft using an Indian mobile number normalized to country code 91. It does not call the messaging API, auto-send, create message logs, or mutate database records. Missing/invalid numbers disable the action. Pending and partial reminders use their respective fee/balance context.

### Development fee repair supplement (2026-11-14)

Live inspection confirmed mixed legacy rupee/current paise data and a seven-argument clearance RPC without its deduction trigger. Revised migrations 20261112000003 and 20261112000004 must run in that order against the existing development database. The first converts explicit audited legacy fields, preserving newer paise rows; the second reconciles test clearances oldest first, voids duplicate/excess test entries, and installs accounting. Completion markers in column comments prevent repeated conversion or historical deduction. See src/lib/supabase/migrations/README.md for execution and verification.

The clearance RPC uses SECURITY DEFINER with explicit allowed-role and academy checks so receptionists can lock an original without direct table UPDATE permission. It retains transaction ID and exact-current-balance checks, and refuses collection if its deduction trigger is missing or disabled. The trigger applies/reverses balances atomically; pending synchronization locks the student before summing. Financial guards prevent direct amount/identity/start-date edits, balance edits, physical deletion, and restoration of voided receipts. New originals require coverage; legacy originals may retain an empty date pair and remain settleable. Audited due-date adjustment excludes undated legacy rows.

Current student/batch actions already multiply rupees by 100 on writes and queries divide paise by 100 on reads; no additional UI conversion is needed. The baseline database_schema.sql now includes the same accounting functions and triggers for fresh databases. The development repair scripts are prepared locally; hosted execution and authenticated browser/concurrency verification remain pending.

### 5.2 supplement: transaction ordering (2026-11-14)

Recent, Paid, and Partially Paid use one shared receipt ordering: creation timestamp descending, payment date descending, then receipt ID ascending for deterministic ties. Issue time is independent of the editable Amount Received On date; a newly entered backdated receipt appears first when it matches the payment-date filter. Updates, settlements, and voids do not promote old receipts by updated_at.

Pending uses one ascending reference timeline without status/type tiers: active-coverage rows use next_due_date from the selected receipt at 00:00 IST; New rows use the actual students.created_at timestamp. A due date today therefore precedes an enrollment later today, and both precede a future due date. Older New rows can precede overdue memberships when their creation timestamps are earlier. Equal references use newest receipt/enrollment activity, then student ID. Missing/invalid reference dates sort last. joining_date is never used. In this tab only, today is red Overdue Today; past dates are red Overdue Nd, future dates are amber Due in Nd, and New is grey. Reminder drafts describe today as overdue. Global student lifecycle status derivation is unchanged.

Existing students.created_at and student_payments.created_at are mapped to optional createdAt app fields. Receipt logs retain their payment-date fallback for missing/invalid issue timestamps. Pending uses the active receipt due date or New student creation time; there is no joining-date fallback. Equal references use receipt created_at (student created_at if unavailable), then ID. No schema or write changes are required. Tab eligibility, displayed dates, and date-range filtering remain unchanged.

### Shared directories and scoped coaching transactions (current implementation)

StudentList lives in src/components/students/StudentList.tsx. The student route supplies academy students; Batch Detail supplies historyStudents and batchScope. The scoped directory includes inactive and dropout students in their respective tabs, retains common columns/actions, hides cross-batch filters, and defaults enrollment to the batch UUID. getStudentsByBatch returns two named lists from the same current-batch result: attendanceStudents includes active/due-soon/expired; historyStudents includes all five statuses. It recognizes the standard 8-4-4-4-12 UUID form and retains authenticated academy lookup. Missing or empty batches return both lists empty.

CoachingTransactions in src/components/transactions/ owns the four coaching tabs, search/date filters, collection/clearance modals and void confirmation. The route wrapper owns the Coaching/Court switch. Batch Detail and Student Profile embed the same controller instead of maintaining tables. transaction-data.ts applies a typed academy, batch, or student scope before constructing rows, totals, searches and action targets.

- Academy scope: all loaded academy students; New placeholders remain in Pending.
- Batch scope: current associated members matched by currentBatchId, including inactive/dropout receipt histories and partial balances. Pending excludes inactive/dropout profiles; New remains available for eligible active profiles. Full student payment histories follow the current batch after a transfer. Receipts are not attributed to the batch at payment time because no such field exists.
- Student scope: only the selected student; no New enrollment placeholder in Pending. Pending requires active coverage and a due-soon/expired profile. Historical partial balances remain collectible here after inactivity/dropout.
- Recent/Paid remain receipt rows. Partial is one row per non-voided original receipt with a positive remaining amount, never a single latest receipt or student-level balance. Clearance receives the exact selected receipt.
- All contexts start with All history; payment-date filters apply to Recent/Paid, while Pending/Partial remain current work queues. Approved receipt and Pending comparators, readable dates, aging, Unspecified mode and manual WhatsApp drafts are shared.

### 5.4 supplement: batch attendance roster and refresh (2026-11-15)

The enrolled card/header count includes inactive and excludes dropout members; the directory's Dropout tab still shows associated dropout students. Attendance uses only active members (including due-soon/expired fee statuses). Insights show the active roster even before the first record exists. Marking counters, completion and Mark All Present use only that roster. Drafts preserve all existing saved marks, including hidden inactive/dropout/transferred students, so saving does not erase history. Attendance retains its existing full-day upsert contract.

BatchDetail owns header/tab navigation and calls useBatchAttendance unconditionally. The extracted Attendance, Students and Transactions tabs are view adapters. Attendance state survives tab switches; changed URL requests initialize their saved day, and refreshed server records update insights without resetting an unsaved draft. The server page keys BatchDetail by batch UUID, preserving state on same-batch refresh while resetting it on batch navigation. AttendanceInsights and AttendanceMarking keep the existing UI; attendance-utils contains pure calculations. See the Phase 1/2 reports for local verification and remaining browser checks.

Student/payment mutations invalidate /batches and the /batches/[id] page pattern as well as existing student/transaction routes. Batch membership is derived from refreshed props rather than copied student state. No schema, RPC, trigger, RLS or financial-write behavior was changed by this UI/data-loading refinement.

### Dashboard reporting boundaries

The dashboard is read-only: receipt balances and membership coverage are read from persisted rows; reporting never changes accounting. Collected counts non-voided receipt amounts, including clearance receipts exactly once. Money sums use integer paise arithmetic before formatting rupees. Pending Dues is the current remaining balance on original receipts whose coverage due date is in the selected period, across all student statuses. Renewal reminders never manufacture debt from the fee reference. Undated legacy balances are disclosed separately.

Exact historical overdue/balance and inactive-status snapshots cannot be reconstructed from current rows. Past periods show Unavailable for dues/overdue and hide Fee Alerts. Active Members and Inactive Students are labeled current snapshots. Enrollment activity uses original joining dates; dropout activity uses retained dropout dates, which re-enrollment clears. The UI states these limitations.

Attendance rates use explicitly marked student-sessions in the selected period; no mark is not an absence. Historical inactive/dropout/transferred marks are retained in reporting. Student alerts are evaluated per recorded batch, with a three-session minimum and 60% threshold; daily alerts list absences. There is no stored attendance threshold setting, so these explicit defaults retain the existing policy. Empty or insufficient data is distinguished from good attendance.
