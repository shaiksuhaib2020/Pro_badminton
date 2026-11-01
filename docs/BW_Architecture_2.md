# EzyFee — Architecture Reference

> **Source:** CODEBASE_AUDIT.md v1.0 (01 Oct 2026) + V1_changes_oct1.md (01 Oct 2026) + project memory reconciliation
> **Purpose:** Carry architectural decisions, business rules, and data-model invariants across context windows. Structural details (file tree, routes, component lists, exports) live in **Structure.md**.
> **Update rule:** Edit this file whenever an architectural decision changes, a business rule is clarified, or a new invariant is established. Do not let it drift from the code.

---

## 1. System Overview

EzyFee (repo name: `pro-badminton`) is a **coaching academy management SaaS** purpose-built for badminton academies in India. It manages the full student lifecycle — enrollment, fee collection, attendance, and communications — from a single-pane dashboard. The current architecture supports a **single academy with optional multi-branch** within it; it is not yet a multi-tenant platform. Primary users are the academy owner, manager, coach, accountant, and receptionist, each with a defined role. Authentication is live on Supabase; **six features are now wired to Supabase** (Membership Types, Students, Batches, Attendance, Enquiries); remaining features use in-memory mock state pending migration. The canonical product name throughout the UI and all new code is **EzyFee**.

---

## 2. Stack and Constraints

| Layer | Choice | Constraint / Note |
|---|---|---|
| **Framework** | Next.js 16.3.1 (App Router) | App Router only — no Pages directory. All new routes go under `src/app/`. |
| **Language** | TypeScript 5 (strict mode) | No `any` in new code. |
| **Runtime** | React 19.2.8 | Server Components are available and must be the default for new pages. |
| **Styling** | Tailwind CSS v4 + PostCSS | `so-*` design tokens from `globals.css` only. No inline styles, no CSS modules. |
| **Icons** | Lucide React ^1.34.0 | Exclusively Lucide. Convention: `w-5 h-5 shrink-0 strokeWidth={1.75}`. |
| **Charts** | Recharts ^3.10.1 | Dashboard and Reports only. No charts inside modals or list views. |
| **Auth** | Supabase Auth (email/password) | Supabase SSR for cookie-based sessions. Browser client (`client.ts`) for the login page only. |
| **Database** | PostgreSQL via Supabase | Full schema in `badmintonw_schema.sql`. Connected for Auth + six migrated features. RLS enforced on all wired tables. |
| **Date handling** | date-fns ^4.4.0 | All date arithmetic via date-fns. All dates stored as `YYYY-MM-DD` strings. Timezone: `Asia/Kolkata` (IST) throughout. |
| **Build (dev)** | Turbopack (`next dev --turbopack`) | Dev only. Production uses standard Next.js build. |
| **Hosting (target)** | Netlify + Supabase free tier | Not yet deployed. Local dev server only. |

---

## 3. Layering and Boundaries

### 3.1 Request → Render Pipeline

```
HTTP Request
  → proxy.ts (Middleware)
      Session refresh + auth redirect
    → (management)/layout.tsx  [Server Component — auth guard]
        Renders Sidebar + TopBar shell
      → page.tsx  [Server Component — data fetch via lib/queries/ OR Supabase direct]
          Passes data as props
        → <FeatureView>  ['use client' — all interactivity + state]
            → <FeatureModal>  ['use client' — CRUD, mutations via server actions]
```

**Rules:**
- `(management)/layout.tsx` is the **only** auth guard. Do not add auth checks inside page files.
- All page.tsx files for migrated features are **async Server Components** that call `lib/queries/<feature>.ts` and pass data down as props.
- **Server Actions** (`actions.ts` per feature, under the route directory) handle all write operations. Modals call server actions — never call Supabase from a client component.
- **Query functions** (`src/lib/queries/<feature>.ts`) handle reads — called from Server Components only.
- `getServerSession()` from `src/lib/auth-context.ts` is the standard auth + academy_id + role resolver used in all query functions and server actions.

### 3.2 Feature Folder Rules

```
src/app/(management)/<feature>/
  page.tsx              — Server Component: calls lib/queries/, passes data as props
  loading.tsx           — Skeleton loader (required for every route)
  error.tsx             — Error boundary (required for data-fetching routes)
  actions.ts            — Server actions for write operations
  _components/          — Client view components local to this feature only
    <Feature>View.tsx   — 'use client' — interactive list/table; receives data as props
    <Feature>Detail.tsx — 'use client' — interactive detail view

src/components/<domain>/
  — Shared modals and UI used across multiple features
  — Must NOT import from app/ routes

src/lib/
  auth-context.ts           — getServerSession() — session + academy_id + role; server-only
  queries/<feature>.ts      — Read queries, server-only; called from Server Component pages
  utils.ts                  — Pure formatting/date helpers + enum mappers; no side effects
  mock-data.ts              — TEMPORARY: types + seed state for un-migrated features
  supabase/                 — Supabase client factories
```

**Import direction:** `app/` → `components/` → `lib/`. Never reverse. `lib/` must not import from `components/` or `app/`.

### 3.3 Logic Placement (Current → Target)

| Logic Type | Current Location | Target Location |
|---|---|---|
| Fee calculation | Server actions (`actions.ts`) for migrated features; inline in modal components for un-migrated | Server action (`actions.ts`) — ✅ in progress |
| Status derivation | DB trigger `tr_students_compute_status` (fires on INSERT / next_due_date change) | DB trigger (✅ live) + pg_cron nightly job (Pro tier) |
| Date arithmetic | `utils.ts` (shared), called from server actions | `utils.ts` — ✅ |
| Form validation | Inline in modals (client-only) | Zod schema in server action + client mirror |
| Auth check | Middleware + server layout + `getServerSession()` in queries/actions | Middleware + server layout (no change) |
| Permission check | `getServerSession()` role check in server actions | RLS on all tables + role check in server action — ✅ in progress |
| Enum mapping | `toAppEnum()`/`toDbEnum()` in `utils.ts` | `utils.ts` — ✅ |

---

## 4. Data Model

### 4.1 Entity Relationships

```
Settings (1 per academy)
  ├── Branch (1:N)
  ├── StaffMember (1:N) → assigned to Branch
  ├── MembershipType (1:N)              ← ✅ Supabase-wired
  ├── CourtPlan (1:N)
  └── Batch (1:N) → belongs to Branch   ← ✅ Supabase-wired

Student                                  ← ✅ Supabase-wired
  ├── student_payments: PaymentEntry[]   ← ✅ Supabase-wired (normalized table)
  ├── MembershipType (N:1)
  └── Batch (N:1) — stored as batch_id UUID FK in DB; mock-data.ts still uses name string

Enquiry                                  ← ✅ Supabase-wired
  └── (flat — no embedded arrays)

AttendanceRecord                         ← ✅ Supabase-wired
  ├── Batch (N:1)
  └── records: { studentId → 'present' | 'absent' }  (JSONB map)

CourtMember
  ├── paymentHistory: CourtPaymentEntry[]  (1:N — will normalize)
  ├── checkInHistory: CheckIn[]            (1:N — will normalize)
  └── CourtPlan (N:1)

AccountEntry  (expenses and income — two separate arrays currently, one table with entry_type in DB)
InventoryItem
Event
MessageLog
```

### 4.2 Type Definitions

#### `Student`
```typescript
type Student = {
  id: string
  name: string
  phone: string
  alternatePhone: string
  guardianName: string
  membershipTypeId: string          // FK → MembershipType.id
  currentBatch: string              // Mock: batch name string. DB: batch_id UUID FK → batches.id
  fees: number                      // Override fee — may differ from MembershipType.price
  startDate: string                 // Original enrollment date (YYYY-MM-DD) — IMMUTABLE
  membershipStartDate: string       // Current period start (YYYY-MM-DD) — mutable on renewal
  nextDueDate: string               // Next payment due date (YYYY-MM-DD)
  status: StudentStatus
  dateOfBirth?: string              // YYYY-MM-DD
  address?: string                  // Optional mailing/contact address
  email?: string                    // Optional contact email
  enrollmentSource?: EnrollmentSource
  dropoutReason?: string
  dropoutDate?: string              // YYYY-MM-DD
  pendingAmount: number             // Outstanding partial payment balance — always ≥ 0
  internalNotes: string
  paymentHistory: PaymentEntry[]
}
```

#### `PaymentEntry`
```typescript
type PaymentEntry = {
  id: string
  date: string                      // YYYY-MM-DD
  amount: number                    // Amount actually collected (not total fee if partial)
  remainingAmount: number           // Amount still owed from this entry
  paymentType: 'full' | 'partial' | 'advance'
  monthsCovered: number             // Number of membership periods this entry covers
  paymentMethod: PaymentMethod
  status: 'active' | 'inactive' | 'deleted'
  note: string
}
```

#### `MembershipType`
```typescript
type MembershipType = {
  id: string                        // UUID (Supabase) or e.g. 'monthly', 'quarterly' (mock)
  name: string
  durationType: 'months' | 'days'
  duration: number                  // e.g., 1, 3, 12
  price: number                     // Base price in ₹
}
```

#### `Batch`
```typescript
interface Batch {
  id: string
  name: string
  branchId: string
  days: string[]                    // e.g., ['Monday', 'Wednesday', 'Friday']
  fees?: number                     // Per-batch fee override — takes precedence over MembershipType.price
  description?: string              // e.g., '6:00 AM – 8:00 AM'
}
```

#### `AttendanceRecord`
```typescript
type AttendanceRecord = {
  id: string                        // Supabase UUID (was compound `${batchId}-${YYYY-MM-DD}` in mock)
  batchId: string
  date: string                      // YYYY-MM-DD
  records: Record<string, 'present' | 'absent'>  // studentId → status
}
```

#### `Enquiry`
```typescript
type Enquiry = {
  id: string
  name: string
  phone: string
  guardianName: string
  notes?: string
  status: 'not-scheduled' | 'scheduled' | 'completed'  // app values (DB uses underscores)
  trialDate?: string                // YYYY-MM-DD; required when status is 'scheduled' or 'completed'
  createdAt: string                 // ISO timestamp
  updatedAt?: string                // ISO timestamp
}
```

#### `CourtMember`
```typescript
type CourtMember = {
  id: string
  name: string
  phone: string
  planId?: string                   // FK → CourtPlan.id
  planType: 'monthly' | 'sessions'
  joiningDate: string               // YYYY-MM-DD
  membershipStartDate?: string      // Monthly plans only (YYYY-MM-DD)
  nextDueDate?: string              // Monthly plans only (YYYY-MM-DD)
  totalSessions?: number            // Session plans only
  remainingSessions?: number        // Session plans only
  status: CourtMemberStatus
  amountPaid: number
  pendingAmount?: number
  notes?: string
  paymentHistory: CourtPaymentEntry[]
  checkInHistory: Array<{ id: string; date: string; sessionsAfter: number }>
}
```

#### `CourtPlan`
```typescript
type CourtPlan = {
  id: string
  name: string                      // e.g., 'Monthly Unlimited', 'Session Pack — 10'
  planType: 'monthly' | 'sessions'
  price: number
  durationMonths?: number           // Monthly plans only
  totalSessions?: number            // Session plans only
  validityDays?: number             // Session pack expiry — defined but NOT currently enforced
}
```

#### `CourtPaymentEntry`
```typescript
type CourtPaymentEntry = {
  id: string
  date: string                      // YYYY-MM-DD
  amount: number
  paymentMethod: PaymentMethod
  entryType: 'new' | 'renewal' | 'session-topup'
  status: 'active' | 'deleted'
  note?: string
}
```

#### `AccountEntry`
```typescript
type AccountEntry = {
  id: string
  date: string                      // YYYY-MM-DD
  category: string                  // From EXPENSE_CATEGORIES or INCOME_CATEGORIES
  description: string
  amount: number                    // Always positive — expense vs income = which array it's in
  paymentMethod: PaymentMethod
  notes?: string
}
```

#### `InventoryItem`
```typescript
type InventoryItem = {
  id: string
  sku: string
  name: string
  category: string                  // From BUILTIN_INVENTORY_CATEGORIES or user-created
  description: string
  unit: string                      // e.g., 'tube', 'piece', 'pair'
  quantity: number
  price: number                     // Purchase price in ₹
  sellingPrice: number              // Selling price in ₹
  icon?: string
}
```

#### `Settings`
```typescript
type Settings = {
  courtMembershipEnabled: boolean   // DEFAULTS TO FALSE — gates the entire court segment
  courtPlans: CourtPlan[]
  courtName: string
  tenantPhone?: string
  tenantAddress?: string
  tenantTimezone?: string
  multiBranchEnabled: boolean
  branches: Branch[]
  staffMembers: StaffMember[]
  membershipTypes: MembershipType[]
  batches: string[]                 // Batch name strings (not Batch objects — inconsistency)
  feeReminderEnabled: boolean
  feeAckEnabled: boolean
  birthdayWishEnabled: boolean
}
```

### 4.3 Enums

```typescript
type StudentStatus       = 'active' | 'due-soon' | 'expired' | 'inactive' | 'dropout'
// ⚠ LOCKED — never use 'on-hold' or 'off-court'
// DB note: student_status uses 'due-soon' (with hyphen) as the actual PG enum label.

type CourtMemberStatus   = 'active' | 'due-soon' | 'expired' | 'sessions-low' | 'exhausted' | 'inactive' | 'dropout'
// DB: uses underscores (due_soon, sessions_low). Use toAppEnum/toDbEnum when reading/writing.

type EnquiryStatus       = 'not-scheduled' | 'scheduled' | 'completed'
// DB: uses underscores (not_scheduled). Use toAppEnum/toDbEnum.

type PaymentMethod       = 'cash' | 'upi' | 'card' | 'other'
type PaymentType         = 'full' | 'partial' | 'advance'
type StaffRole           = 'owner' | 'manager' | 'coach' | 'accountant' | 'receptionist'
type EnrollmentSource    = 'walk-in' | 'referral' | 'social-media' | 'other'
type CourtPayEntryType   = 'new' | 'renewal' | 'session-topup'
// DB: uses session_topup (underscore). Use toDbEnum when inserting.
type PlanType            = 'monthly' | 'sessions'
```

### 4.4 Money and Date Representation

- **Currency:** `number` in Indian Rupees (no paise/decimal usage in app layer). Always formatted via `formatCurrency()` → `₹1,500` using `Intl.NumberFormat('en-IN')`. **DB stores paise (INTEGER)** — multiply by 100 before insert, divide by 100 after select in all query and action files.
- **Dates:** Always `YYYY-MM-DD` strings in state and storage. Never raw `Date` objects in state. `date-fns` for all arithmetic. IST enforced via `getTodayIST()`.
- **Pending amount:** Represents outstanding balance from a partial payment. Separate from "due" (where a renewal period has begun but no payment recorded at all). Kept in sync by DB trigger `tr_sync_pending_amount_after_payment`.

### 4.5 Constants

```typescript
EXPENSE_CATEGORIES = [
  'Shuttlecocks', 'Equipment & Gear', 'Court Rent', 'Coaching Staff',
  'Utilities', 'Maintenance & Repairs', 'Marketing', 'Tournament Expenses', 'Miscellaneous'
]

INCOME_CATEGORIES = [
  'Court Rental', 'Membership Fees', 'Equipment Sales', 'Shuttle Sales',
  'Racket Restringing', 'Merchandise', 'Sponsorship', 'Tournament Entry', 'Other'
]

BUILTIN_INVENTORY_CATEGORIES = [
  'Racquet Sports', 'Footwear', 'Apparel', 'Accessories / Miscellaneous'
]

UNIT_PRESETS = ['piece', 'tube', 'pair', 'roll', 'box', 'set']
```

---

## 5. Data Access Layer

### 5.1 Current State

**Migrated features** read from and write to Supabase. Their pages are async Server Components; mutations go through server actions. Mock arrays for these features are preserved in `mock-data.ts` only to avoid breaking still-unmigrated consumers (e.g. Dashboard, Reports).

| Feature | Status |
|---|---|
| Authentication | ✅ Supabase Auth |
| Membership Types (Settings) | ✅ Supabase |
| Students + Student Payments | ✅ Supabase |
| Batches | ✅ Supabase |
| Attendance | ✅ Supabase |
| Enquiries | ✅ Supabase |
| Dashboard | ⚠ Mock (reads mockStudents, mockBatches, mockAttendance) |
| Court Members | ⚠ Mock |
| Fee Transactions | ⚠ Mock |
| Accounts | ⚠ Mock |
| Inventory | ⚠ Mock |
| Reports | ⚠ Mock |
| Communications | ⚠ Mock + Stub |

**Session + tenancy helper:** `getServerSession()` in `src/lib/auth-context.ts` — used in every query function and server action to get `{ user, academyId, role }` and redirect to `/login` if unauthenticated.

### 5.2 Data Layer Files (Live)

```
src/lib/
  auth-context.ts              — getServerSession(): { user, academyId, role }
  queries/
    settings.ts                — getMembershipTypes()
    students.ts                — getStudents(), getStudentById(id), getStudentsByBatch(batchId)
    batches.ts                 — getBatches(), getBatchById(id)
    attendance.ts              — getAttendanceByBatch(batchId), getAttendanceByStudent(studentId, batchId)
    enquiries.ts               — getEnquiries()

src/app/(management)/
  settings/actions.ts          — createMembershipType, updateMembershipType, deleteMembershipType
  students/actions.ts          — createStudent, renewStudent, dropoutStudent, reEnrollStudent,
                                 deactivateStudent, activateStudent, collectRemaining,
                                 voidPayment, updateStudent, deleteStudentPermanently
  batches/actions.ts           — createBatch, updateBatch, deleteBatch, getBatchesAction
  batches/[id]/actions.ts      — saveAttendance
  enquiries/actions.ts         — createEnquiry, updateEnquiry, advanceEnquiryStatus, deleteEnquiry
```

**Data access rules:**
- All writes → server actions. Never call Supabase from a client component.
- All reads for initial render → query functions in `lib/queries/`, called from Server Component pages.
- Client-side optimistic updates acceptable for UX; must reconcile with server state.
- After any mutation, call `revalidatePath()` for the affected route.
- Always use the server Supabase client (`lib/supabase/server.ts`) in queries and actions.
- RLS is the final authorization layer. Server actions also verify role via `getServerSession()`.

---

## 6. Auth, Authorization and Tenancy

### 6.1 Login Flow

```
GET /protected-route
  → proxy.ts (Middleware)
      supabase.auth.getUser()
      No session → redirect /login
      Has session → continue

/login page (CSR)
  supabase.auth.signInWithPassword()
  Success → router.push('/dashboard')

(management)/layout.tsx (SSR)
  supabase.auth.getUser()   ← second guard
  Not authenticated → redirect('/login')
  Authenticated → render Sidebar + TopBar + children

lib/auth-context.ts — getServerSession()
  Used in every query function and server action:
  Calls supabase.auth.getUser(), looks up staff_members for academy_id + role
  No session or no staff record → redirect('/login')
```

**Double guard** (both must remain): Middleware (`proxy.ts`) + Server Layout (`(management)/layout.tsx`).

### 6.2 Middleware — `src/proxy.ts`

- Runs on every request
- Refreshes Supabase session cookie
- Redirect rules:
  - `/` → `/dashboard` (session) or `/login` (no session)
  - `/login` with valid session → `/dashboard`
  - Any protected route without session → `/login`

### 6.3 Roles and Permission Matrix

**Five roles:** `owner | manager | coach | accountant | receptionist`

| Module | Owner | Manager | Coach | Accountant | Receptionist |
|---|---|---|---|---|---|
| Dashboard | full | full | view | view | view |
| Students | full | full | view | view | partial |
| Batches | full | full | view | none | none |
| Attendance | full | full | mark | none | none |
| Fee Transactions | full | full | none | full | collect |
| Accounts | full | view | none | full | none |
| Inventory | full | full | none | view | none |
| Court Members | full | full | none | view | collect |
| Events | full | full | view | none | view |
| Settings | full | partial | none | none | none |
| Staff Management | full | view | none | none | none |
| Enquiries | full | full | view | view | partial |

**Current status:** RLS policies are live for migrated tables. Role checks run inside server actions via `getServerSession().role`. UI-level role gating is not yet applied (all authenticated users see all UI elements).

### 6.4 Tenancy

**Current:** Single academy per deployment. `getServerSession()` returns the `academyId` scoped to the authenticated staff member. All queries and actions pass `academyId` to Supabase; RLS enforces this at the DB layer.

**Target:** Full multi-tenant when expanded to SaaS. Architecture is already laid out — `academy_id` FK on all tables, RLS in place.

---

## 7. Business Rules and Domain Logic

> **These rules are locked.** Do not change them without explicit confirmation.

### 7.1 Student Lifecycle

**State machine:**
```
[*] → active (Enroll via AddStudentModal)
active → due-soon   (DB trigger when nextDueDate ≤ today + 7 days)
due-soon → expired  (DB trigger when nextDueDate < today)
active/due-soon/expired → dropout  (DropoutConfirmModal → dropoutStudent action)
dropout → active    (ReEnrollModal ONLY → reEnrollStudent action)
active/due-soon/expired → inactive (deactivateStudent action)
inactive → active   (activateStudent action)
active/due-soon/expired → active (renewStudent action — DB trigger then recomputes)
```

**Status auto-computation:** DB trigger `tr_students_compute_status` fires BEFORE INSERT or when `next_due_date` changes. It derives status from `next_due_date` in IST, skipping rows with `status IN ('dropout', 'inactive')`. Server actions do NOT need to manually set status for active/due-soon/expired — the trigger handles it. A pg_cron nightly job (Pro tier) sweeps all non-dropout/non-inactive students daily.

**Enrollment logic (AddStudentModal → createStudent action):**
1. Duplicate check by phone within academy before creating
2. `nextDueDate = startDate + membershipType.duration` (in months)
3. Optional discount: flat (₹) or percentage (%)
4. Partial payment: `pendingAmount = totalFee − amountPaying`
5. Creates `PaymentEntry` with `paymentType: 'full' | 'partial'`
6. `startDate` is set here and is **immutable** (DB trigger enforces this)

**Renewal logic (RenewModal → renewStudent action):**
1. `membershipStartDate` = previous `nextDueDate` (chain — no gaps or overlaps)
2. `nextDueDate` = new `membershipStartDate + (duration × periods)`
3. Supports partial payment and optional batch switch
4. Creates new `PaymentEntry`; does not touch existing entries
5. **File:** `src/components/coaching/RenewModal.tsx`

**Dropout logic (DropoutConfirmModal → dropoutStudent action):**
1. Captures dropout reason (free text)
2. Sets `status: 'dropout'`, `dropoutReason`, `dropoutDate = today`
3. Sets all active payment entries to `status: 'inactive'`
4. **File:** `src/components/students/DropoutConfirmModal.tsx`

**Re-enrollment logic (ReEnrollModal → reEnrollStudent action):**
1. Fresh membership: new type, batch, start date
2. Previous `paymentHistory` preserved
3. `pendingAmount` reset to 0 (or partial if applicable)
4. `startDate` updates to the new enrollment date (this is a new membership, not a renewal)
5. **File:** `src/components/students/ReEnrollModal.tsx`

### 7.2 Enquiry Lifecycle

```
[*] → not-scheduled  (AddEnquiryModal → createEnquiry)
not-scheduled → scheduled   (advanceEnquiryStatus — sets trial_date)
scheduled → completed       (advanceEnquiryStatus — marks trial attended)
any → DELETE                (deleteEnquiry — hard delete; lead lost)
completed → Enroll          (opens AddStudentModal pre-filled with name/phone/guardian)
```

**DB constraint:** `trial_date` MUST be NULL when `status = 'not_scheduled'`; MUST be NOT NULL when `status IN ('scheduled', 'completed')`.

### 7.3 Court Member Lifecycle

**Monthly plan states:** `active → due-soon → expired` (same as coaching)
**Session plan states:** `active → sessions-low (≤2) → exhausted (0)`

**Session check-in (Log In button — Members page only):**
1. Deduct `remainingSessions` by 1
2. Append `{ id, date, sessionsAfter }` to `checkInHistory`
3. Recompute status: `0 → exhausted`, `≤2 → sessions-low`, else `active`
4. Show 5-second undo strip — reverts only if member has a check-in logged today
5. **Check In is an operational action, not a fee action.** It lives on Members page. Fee actions (Renew, Buy Sessions, Collect) live only in Fee Transactions.

**`validityDays`** on CourtPlan is defined but **not enforced** — session packs do not currently expire.

### 7.4 Fee Calculation

```
baseFee = membershipType.price
discount = discountType === '₹'
  ? discountValue
  : baseFee × discountValue / 100
finalFee = Math.max(0, baseFee − discount)
totalForRenewal = finalFee × periods

// Partial payment
if (amountPaying < totalForRenewal):
  paymentType = 'partial'
  pendingAmount = totalForRenewal − amountPaying
  PaymentEntry.remainingAmount = totalForRenewal − amountPaying
```

**Fee collection events:**

| Event | Action |
|---|---|
| New enrollment | Creates first `PaymentEntry`, sets `nextDueDate`, sets `pendingAmount` |
| Renewal | Creates new `PaymentEntry`, chains `nextDueDate`, updates `pendingAmount` |
| Collect remaining | Collects `pendingAmount`, sets to 0, `pendingAmount = 0` |
| Bulk collect (Pending tab) | Iterates checked students, creates full `PaymentEntry` for each |
| Void | Sets `PaymentEntry.status = 'deleted'` — **soft void only, no hard deletes** |

**Files:** `AddStudentModal.tsx`, `RenewModal.tsx`, `CollectRemainingModal.tsx`, `transactions/page.tsx`

### 7.5 Dashboard Revenue Calculation

```typescript
// Collected — date-filtered
collectedAmount = students
  .flatMap(s => s.paymentHistory)
  .filter(p => p.status !== 'deleted' && isWithinInterval(p.date, dateRange))
  .reduce((sum, p) => sum + p.amount, 0)

// Due — NOT date-filtered (all outstanding dues across the academy)
dueAmount = students
  .filter(s => s.status !== 'dropout')
  .reduce((sum, s) => {
    if (s.pendingAmount > 0) return sum + s.pendingAmount
    if (s.status === 'expired' || s.status === 'due-soon') return sum + s.fees
    return sum
  }, 0)
```

**FeesSegment Report fix (V1):** Batch Revenue `collected` is now filtered by `isWithinInterval(parseISO(p.date), { start, end })` for the selected month only. Percentage is capped at 100% to guard against advance payments. Both Batch Revenue and Payment Mode share a single `monthOffset` navigator.

**File:** `src/app/(management)/dashboard/page.tsx`, `src/app/(management)/reports/_components/FeesSegment.tsx`

### 7.6 Attendance Logic

**Recording:**
1. Staff selects date + batch in Batch Detail → Attendance → Marking mode
2. Each student toggled `present` / `absent`
3. Save calls `saveAttendance` server action — upserts with `{ onConflict: 'batch_id,date' }`
4. No partial updates — saving overwrites the entire record for that date+batch

**Insight calculations:**
- Per-student %: `(days present / days with any record) × 100`
- Batch average %: `(total present / total marks) × 100`
- Risk classification thresholds: configurable in Reports (50/60/70/80 or custom)

**File:** `src/app/(management)/batches/[id]/_components/BatchDetail.tsx`

### 7.7 Court Membership Feature Gate

`mockSettings.courtMembershipEnabled` **defaults to `false`**. When `false`:
- Court tab is hidden on `/students` (Members page)
- Court segment is hidden on `/transactions`
- The Members page and Fee Transactions look exactly as they did before court was introduced

Toggle lives in Settings → Academy section.

### 7.8 Inventory Stock Classification

| Quantity | Classification | Color |
|---|---|---|
| `0` | Out of Stock | Red |
| `1–3` | Critical | Red |
| `4–7` | Low | Yellow |
| `>7` | Adequate | Green |

**File:** `src/app/(management)/inventory/page.tsx`

### 7.9 Fee Action Placement Rule (Locked)

- **Fee Transactions page:** Renew, Collect Remaining, Buy Sessions, Void — all fee actions
- **Members page:** Directory, status management, Check In (session decrement) only
- **Never** place fee actions (Renew, Collect, Buy Sessions) on the Members page

---

## 8. Shared Modules Index

| Name | Path | Purpose |
|---|---|---|
| `formatCurrency` | `src/lib/utils.ts` | Format number as ₹1,500 (en-IN locale) |
| `formatDate` | `src/lib/utils.ts` | Format Date/string as DD/MM/YYYY in IST |
| `formatTime` | `src/lib/utils.ts` | Convert "06:00" → "6:00 AM" |
| `formatSlot` | `src/lib/utils.ts` | Combine two times: "6:00 AM – 7:00 AM" |
| `getTodayIST` | `src/lib/utils.ts` | Today as YYYY-MM-DD in IST |
| `getDateDaysAgoIST` | `src/lib/utils.ts` | N days ago as YYYY-MM-DD in IST |
| `getFirstDayOfMonthIST` | `src/lib/utils.ts` | First day of current month as YYYY-MM-DD |
| `calcAge` | `src/lib/utils.ts` | Compute age from DOB string (YYYY-MM-DD) |
| `toAppEnum` | `src/lib/utils.ts` | Convert DB underscore value to app hyphen value (e.g. `due_soon` → `due-soon`) |
| `toDbEnum` | `src/lib/utils.ts` | Convert app hyphen value to DB underscore value (e.g. `due-soon` → `due_soon`) |
| `getServerSession` | `src/lib/auth-context.ts` | Server-only: returns `{ user, academyId, role }`; redirects to /login if unauthenticated |
| `getMembershipTypes` | `src/lib/queries/settings.ts` | Fetch active membership types for authenticated academy |
| `getStudents` | `src/lib/queries/students.ts` | Fetch all students (lightweight — no payment history) |
| `getStudentById` | `src/lib/queries/students.ts` | Fetch one student with full payment history |
| `getStudentsByBatch` | `src/lib/queries/students.ts` | Fetch active/due-soon students for a batch |
| `getBatches` | `src/lib/queries/batches.ts` | Fetch all active batches for authenticated academy |
| `getBatchById` | `src/lib/queries/batches.ts` | Fetch one batch by ID |
| `getAttendanceByBatch` | `src/lib/queries/attendance.ts` | Fetch all attendance records for a batch, ordered by date DESC |
| `getAttendanceByStudent` | `src/lib/queries/attendance.ts` | Fetch attendance records for a student within a batch |
| `getEnquiries` | `src/lib/queries/enquiries.ts` | Fetch all enquiries for authenticated academy, ordered by created_at DESC |
| `mockStudents` | `src/lib/mock-data.ts` | Mutable student array — 12 seed records (preserved for Dashboard/Reports/Transactions) |
| `mockCourtMembers` | `src/lib/mock-data.ts` | Mutable court member array — 3 seed records |
| `mockAttendance` | `src/lib/mock-data.ts` | Mutable attendance array — preserved for legacy consumers |
| `mockExpenses` | `src/lib/mock-data.ts` | Mutable expense array — 6 seed entries |
| `mockIncomeEntries` | `src/lib/mock-data.ts` | Mutable income array — 4 seed entries |
| `mockInventory` | `src/lib/mock-data.ts` | Mutable inventory array — 6 seed items |
| `mockSettings` | `src/lib/mock-data.ts` | Mutable settings object — academy config |
| `mockBatches` | `src/lib/mock-data.ts` | Mutable batch array — preserved for Dashboard/Reports |
| `mockMessageLogs` | `src/lib/mock-data.ts` | Mutable message log array — 6 seed entries |
| `EXPENSE_CATEGORIES` | `src/lib/mock-data.ts` | 9 expense category strings (const) |
| `INCOME_CATEGORIES` | `src/lib/mock-data.ts` | 9 income category strings (const) |
| `BUILTIN_INVENTORY_CATEGORIES` | `src/lib/mock-data.ts` | 4 inventory category strings (const) |
| `UNIT_PRESETS` | `src/lib/mock-data.ts` | 6 unit preset strings (const) |
| `PERMISSION_MATRIX` | `src/lib/mock-data.ts` | 11 modules × 5 roles permission table (const) |
| `StatusBadge` | `src/components/ui/StatusBadge.tsx` | Colored status pill (Available/Booked/Blocked) |
| `ConfirmDialog` | `src/components/ui/ConfirmDialog.tsx` | ⚠ Empty placeholder — renders `<div />` |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Fixed left nav — brand, nav items, sign-out |
| `TopBar` | `src/components/layout/TopBar.tsx` | Header — branch switcher + live clock |
| `LiveClock` | `src/components/layout/LiveClock.tsx` | Real-time IST clock with pulsing indicator |
| `createClient` (browser) | `src/lib/supabase/client.ts` | Supabase browser client — login page only |
| `createClient` (server) | `src/lib/supabase/server.ts` | Supabase server client (strongly typed `<Database>`) — middleware + layouts + queries |

---

## 9. Cross-Cutting Conventions

### Error Handling

- Per-route `error.tsx` files for route-level boundaries (Dashboard, Students, Transactions, Settings have them)
- Toast notifications for operation feedback — see Toast section below
- Server actions surface named error codes (e.g. `DUPLICATE_PHONE`) for client-side handling
- No global error handler

### Form Validation

- Currently: inline conditional checks in modal components (`useState`), client-side only
- No form library or Zod currently
- Server actions perform their own validation (e.g. duplicate phone check in `createStudent`)
- **Target:** Zod schemas in server actions, mirrored client-side

### Loading / Empty / Error State Pattern

| State | Implementation |
|---|---|
| Loading | Per-route `loading.tsx` with animated `animate-pulse` skeleton placeholders |
| Empty | Inline conditional in page — icon + message + CTA button |
| Error | Per-route `error.tsx` with retry button |

### Toasts

```typescript
// Pattern
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
// Auto-dismiss
setTimeout(() => setToast(null), 3000)
// Colors
success: bg-emerald-50 text-emerald-700 border-emerald-200
error:   bg-red-50 text-red-700 border-red-200
// Position: bottom of screen (fixed), above modal overlay when inside a modal
```

### Timezone Handling

- All display times and date comparisons use **IST (Asia/Kolkata)**
- `getTodayIST()` for "today" — never `new Date()` directly for date comparisons
- Live clock in TopBar uses `{ timeZone: 'Asia/Kolkata' }`
- date-fns for all arithmetic; no raw `Date` constructors in display code

### Currency Formatting

- Always `₹` prefix
- `formatCurrency(amount)` → `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`
- Amounts are whole numbers in the app layer — no paise/cents in display
- **DB stores paise**: multiply by 100 on INSERT; divide by 100 on SELECT in all query/action files
- Inline: `toLocaleString('en-IN')` acceptable for quick formatting

### Enum Mapping (DB ↔ App)

- **Rule:** PostgreSQL enums for court and enquiry tables use underscores; the app uses hyphens.
- `toAppEnum(v: string)` in `utils.ts` converts `due_soon → due-soon`, `not_scheduled → not-scheduled`, etc.
- `toDbEnum(v: string)` does the reverse: `due-soon → due_soon`, `session-topup → session_topup`, etc.
- **Exception:** `student_status` uses hyphen `'due-soon'` as the actual DB enum label — do NOT convert it. Apply `toDbEnum` only for `court_membership_status`, `court_payment_entry_type`, and `enquiry_status`.

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Component files | PascalCase | `AddStudentModal.tsx` |
| Route directories | kebab-case | `court-members/` |
| Utility functions | camelCase | `formatCurrency` |
| CSS tokens | `so-*` prefix | `bg-so-card`, `text-so-muted` |
| Entity IDs | `crypto.randomUUID()` for new entities |
| Check-in IDs | `Date.now().toString()` |
| Attendance IDs | Supabase UUID (was compound `${batchId}-${YYYY-MM-DD}` in mock) |
| Path alias | `@/*` → `./src/*` (tsconfig.json) |

### Lucide Icons

- Size: `w-5 h-5` (standard), `w-4 h-4` (compact/inline)
- Stroke: `strokeWidth={1.75}` — always
- `shrink-0` on all icons inside flex containers

### Force Re-render Pattern (mock-only — being retired)

```typescript
const [, forceUpdate] = useState(0)
const refresh = () => forceUpdate(n => n + 1)
// Called after any mock-data mutation
// Eliminated naturally as each feature migrates to server actions + revalidatePath
```

---

## 10. External Services and Environment

| Service | Purpose | Status | Env Vars |
|---|---|---|---|
| Supabase Auth | Email/password authentication + session management | ✅ Active | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase PostgreSQL | Application data storage | ✅ Connected for 6 features | Same two vars above |
| Meta WhatsApp Cloud API | Fee reminders, birthday wishes, holiday notices | 🔲 Stub — console.log only | `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID` |

**API Routes:**
- `POST /api/whatsapp/send` — stub handler, logs to console, returns mock response ID

---

## 11. Known Architectural Issues

| Issue | Severity | Status | Resolution |
|---|---|---|---|
| Dashboard, Reports, Transactions, Court Members, Accounts, Inventory, Communications still on mock data | P0 | 🔲 Open | Migrate feature by feature |
| `forceUpdate` + mutable arrays — no cross-component reactivity | P2 | Partially resolved | Eliminated naturally as each feature migrates to server actions + revalidatePath |
| Permission matrix enforced in DB/actions but not in UI (all roles see all elements) | P1 | 🔲 Open | Role-conditional rendering after deployment |
| `currentBatch` in mock-data.ts uses name string; DB uses batch_id UUID FK | P2 | Partially resolved | Mock preserved for legacy consumers; all new server actions use batch_id |
| `mockSettings.batches` is still a string array | P2 | 🔲 Open | Eliminate when Settings page is fully migrated |
| `next.config.ts` has dual export bug (`export default` + `module.exports`) | P2 | 🔲 Open | Remove `module.exports`, use only `export default nextConfig` |
| `pro_logo.png` in project root, not `/public/` | P2 | 🔲 Open | Move to `public/pro_logo.png` |
| `ConfirmDialog` component is an empty `<div />` | P2 | 🔲 Open | Implement or remove |
| StudentsSegment report has hardcoded 12-month enrollment chart data | P3 | 🔲 Open | Wire to actual Supabase data |
| Scratch files at project root (`scratch.ts`, `scratch.txt`, `scratch_accounts.tsx`) | P3 | 🔲 Open | Delete before production |
| Three branding identities: `pro-badminton` / `EzyFee` / `so-*` tokens | P3 | 🔲 Open | Canonical name is **EzyFee**; `so-*` prefix is legacy |
| `validityDays` on CourtPlan not enforced | P3 | 🔲 Open | Add expiry logic when Court Members migrated |
