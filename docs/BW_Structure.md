# EzyFee — Structure Reference

> **Source:** CODEBASE_AUDIT.md v1.0 (01 Oct 2026) + project memory reconciliation
> **Purpose:** Carry structural knowledge — files, routes, components, exports, data sources, dependencies — across context windows. Architectural decisions, business rules, and data-model invariants live in **Architecture.md**.
> **Update rule:** Edit this file whenever a file is added, renamed, or deleted; whenever a route is added or changed; whenever a component's props change; whenever a new dependency is added.

---

## 10A. Directory Tree

```
Pro Badminton/                            ← repo root (product name: EzyFee)
├── .env.local                            # Supabase + WhatsApp keys — git-ignored
├── .gitignore
├── database_schema.sql                   # Full PostgreSQL schema — source of truth
├── next.config.ts                        # ⚠ Dual export bug (see Architecture.md §11)
├── next-env.d.ts
├── tsconfig.json                         # @/* → ./src/* path alias
├── eslint.config.mjs
├── postcss.config.mjs                    # Tailwind v4 PostCSS plugin
├── package.json
├── package-lock.json
├── pro_logo.png                          # ⚠ 1.5MB — should be in /public/, fails in prod
├── scratch.ts                            # ⚠ Delete before production
├── scratch.txt                           # ⚠ Delete before production (115 KB)
├── scratch_accounts.tsx                  # ⚠ Delete before production (64 KB)
│
├── public/                               # Static assets (Next.js serves from here)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg                        # All default Next.js placeholders
│
├── supabase/
│   ├── schema.sql                        # Mirror of database_schema.sql
│   └── SCHEMA_NOTES.md                   # Environment and migration notes
│
├── prompts/                              # Excluded from audit
│
└── src/
    ├── proxy.ts                          # Middleware — auth redirects + session refresh
    │
    ├── app/
    │   ├── globals.css                   # Tailwind @theme tokens, scrollbar, selection styles
    │   ├── layout.tsx                    # Root layout — metadata, Inter font, body [SERVER]
    │   ├── page.tsx                      # ⚠ Unreachable Next.js boilerplate — safe to delete
    │   ├── favicon.ico
    │   │
    │   ├── (auth)/                       # Auth group — no Sidebar or TopBar
    │   │   └── login/
    │   │       ├── layout.tsx            # Passthrough layout (renders children only) [SERVER]
    │   │       └── page.tsx              # Email/password login form [CLIENT]
    │   │
    │   ├── (management)/                 # Protected route group
    │   │   ├── layout.tsx                # SSR auth guard + Sidebar + TopBar shell [SERVER]
    │   │   │
    │   │   ├── dashboard/
    │   │   │   ├── page.tsx              # KPI cards, batch revenue, payment modes [CLIENT]
    │   │   │   ├── loading.tsx           # Skeleton loader
    │   │   │   └── error.tsx             # Error boundary
    │   │   │
    │   │   ├── enquiries/                # ⏳ PLANNED — not yet implemented
    │   │   │   └── page.tsx              # Admissions pipeline (New→Contacted→Trial→Enrolled/Lost)
    │   │   │
    │   │   ├── students/
    │   │   │   ├── page.tsx              # Members: coaching + court segment toggle [CLIENT]
    │   │   │   ├── loading.tsx
    │   │   │   ├── error.tsx
    │   │   │   └── [id]/
    │   │   │       └── page.tsx          # Student profile — details, transactions, attendance [CLIENT]
    │   │   │
    │   │   ├── batches/
    │   │   │   ├── page.tsx              # Batch cards list [CLIENT]
    │   │   │   ├── loading.tsx
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx          # Batch detail — attendance, students, transactions [CLIENT]
    │   │   │       └── loading.tsx
    │   │   │
    │   │   ├── court-members/
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx          # Court member profile — details, transactions, check-ins [CLIENT]
    │   │   │       └── loading.tsx
    │   │   │
    │   │   ├── transactions/
    │   │   │   ├── page.tsx              # Fee ledger — coaching + court segments [CLIENT]
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   │
    │   │   ├── accounts/
    │   │   │   ├── page.tsx              # Income + expense tracker [CLIENT]
    │   │   │   └── loading.tsx
    │   │   │
    │   │   ├── inventory/
    │   │   │   ├── page.tsx              # Product catalog with stock tracking [CLIENT]
    │   │   │   └── loading.tsx
    │   │   │
    │   │   ├── reports/
    │   │   │   ├── page.tsx              # Analytics hub — fees, students, attendance [CLIENT]
    │   │   │   └── _components/
    │   │   │       ├── FeesSegment.tsx       # Revenue chart, paid/pending donut, batch table
    │   │   │       ├── StudentsSegment.tsx   # Growth chart, age distribution, dropouts
    │   │   │       └── AttendanceSegment.tsx # Batch rates, present/absent donut, overview table
    │   │   │
    │   │   ├── communications/
    │   │   │   ├── page.tsx              # WhatsApp template gallery + detail shell [CLIENT]
    │   │   │   └── loading.tsx
    │   │   │
    │   │   └── settings/
    │   │       ├── page.tsx              # Settings hub [CLIENT]
    │   │       ├── loading.tsx
    │   │       ├── error.tsx
    │   │       └── _components/
    │   │           ├── AcademySection.tsx      # Name, phone, address, feature toggles
    │   │           ├── BranchesSection.tsx     # Multi-branch CRUD
    │   │           ├── StaffSection.tsx        # Staff CRUD + role assignment
    │   │           ├── PermissionsMatrix.tsx   # Read-only role permissions table
    │   │           ├── MembershipSection.tsx   # Coaching plan CRUD
    │   │           └── EventsSection.tsx       # Events CRUD
    │   │
    │   └── api/
    │       └── whatsapp/
    │           └── send/
    │               └── route.ts          # POST stub — logs to console, returns mock ID
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx               # Fixed left nav — w-64, h-screen, dark bg
    │   │   ├── TopBar.tsx                # Header — branch switcher + clock
    │   │   └── LiveClock.tsx             # Real-time IST clock with pulse indicator
    │   │
    │   ├── ui/
    │   │   ├── StatusBadge.tsx           # Colored status pill
    │   │   └── ConfirmDialog.tsx         # ⚠ Empty — renders <div /> only
    │   │
    │   ├── students/
    │   │   ├── AddStudentModal.tsx
    │   │   ├── EditStudentModal.tsx
    │   │   ├── ReEnrollModal.tsx
    │   │   ├── DropoutConfirmModal.tsx
    │   │   └── CollectRemainingModal.tsx
    │   │
    │   ├── coaching/
    │   │   └── RenewModal.tsx
    │   │
    │   ├── court/
    │   │   ├── AddMemberModal.tsx
    │   │   ├── EditCourtMemberModal.tsx
    │   │   ├── RenewCourtMemberModal.tsx
    │   │   ├── BuySessionsModal.tsx
    │   │   └── CollectCourtPaymentModal.tsx
    │   │
    │   ├── accounts/
    │   │   ├── AccountEntryModal.tsx
    │   │   ├── AddInventoryModal.tsx
    │   │   ├── EditInventoryModal.tsx
    │   │   └── InventoryDetailsModal.tsx
    │   │
    │   └── communications/
    │       ├── TemplateCard.tsx
    │       ├── TemplateDetailShell.tsx
    │       ├── TemplateHistory.tsx
    │       └── templates/               # ⚠ Empty directory
    │
    └── lib/
        ├── mock-data.ts                 # All types + seed data + mutable state (TEMPORARY)
        ├── utils.ts                     # Pure utility functions
        └── supabase/
            ├── client.ts               # Supabase browser client
            ├── server.ts               # Supabase server client + cookie handler
            └── database.types.ts       # Auto-generated Supabase DB types (not yet used by app)
```

---

## 11. Route Map

| Route | Route Group | Layout | Render | Auth Required | `loading.tsx` | `error.tsx` |
|---|---|---|---|---|---|---|
| `/` | — | root | — | — | — | — |
| `/login` | `(auth)` | `login/layout.tsx` (passthrough) | CLIENT | ❌ | — | — |
| `/dashboard` | `(management)` | `(management)/layout.tsx` (SSR, auth guard) | CLIENT | ✅ | ✅ | ✅ |
| `/enquiries` | `(management)` | same | CLIENT | ✅ | ⏳ | ⏳ |
| `/reports` | `(management)` | same | CLIENT | ✅ | — | — |
| `/students` | `(management)` | same | CLIENT | ✅ | ✅ | ✅ |
| `/students/[id]` | `(management)` | same | CLIENT | ✅ | — | — |
| `/batches` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/batches/[id]` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/court-members/[id]` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/transactions` | `(management)` | same | CLIENT | ✅ | ✅ | ✅ |
| `/inventory` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/accounts` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/communications` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/settings` | `(management)` | same | CLIENT | ✅ | ✅ | ✅ |

### Sidebar Navigation Items (in order)

| # | Label | Route | Icon | Condition |
|---|---|---|---|---|
| 1 | Dashboard | `/dashboard` | `LayoutDashboard` | Always |
| 2 | Enquiries | `/enquiries` | `UserSearch` (ti-user-search) | ⏳ Planned — between Dashboard and Members |
| 3 | Members | `/students` | `Users` | Always |
| 4 | Batches | `/batches` | `LayoutGrid` | Always |
| 5 | Fee Transactions | `/transactions` | `Receipt` | Always |
| 6 | Inventory | `/inventory` | `Package` | Always |
| 7 | Accounts | `/accounts` | `BookOpen` | Always |
| — | *divider* | — | — | — |
| 8 | Settings | `/settings` | `Settings` | Always |

**Footer:** User avatar (email initial), email, "Staff" label, Sign Out button.

### Internal Navigation Patterns

| Pattern | Where Used |
|---|---|
| **Segment toggle** (coaching ↔ court) | `/students`, `/transactions` — pill buttons, not separate routes |
| **Drill-down** | Student/batch/court-member rows → `router.push('/students/[id]')` etc. |
| **Modals** | All CRUD — overlay modals, no separate form routes |
| **Tab-based sub-views** | Detail pages: `details \| transactions \| attendance` state, not URL tabs |
| **Back navigation** | `ArrowLeft` button → `router.push('/students')` etc. |

---

## 12. Component Inventory

### Layout Shell

| Component | File | Key Behavior |
|---|---|---|
| `Sidebar` | `components/layout/Sidebar.tsx` | `w-64 h-screen` fixed. `usePathname()` for active state. `bg-so-nav (#232E44)`. Renders `NAV_ITEMS[]`. Sign-out via `supabase.auth.signOut()`. |
| `TopBar` | `components/layout/TopBar.tsx` | Branch switcher dropdown (only when `multiBranchEnabled`). `window.dispatchEvent('settingsChange')` listener to refresh branch list. |
| `LiveClock` | `components/layout/LiveClock.tsx` | `setInterval(1000ms)`. `{ timeZone: 'Asia/Kolkata' }`. Pulsing blue dot indicator. |

### UI Primitives

| Component | File | Props | Notes |
|---|---|---|---|
| `StatusBadge` | `components/ui/StatusBadge.tsx` | `status: string` | Renders colored pill — Available (green), Booked (blue), Blocked (red) |
| `ConfirmDialog` | `components/ui/ConfirmDialog.tsx` | — | ⚠ Empty — renders `<div />`. Not implemented. |

### Student-Domain Modals

| Component | File | Key Props | Behavior Summary |
|---|---|---|---|
| `AddStudentModal` | `components/students/AddStudentModal.tsx` | `onClose, onSuccess, defaultBatch?` | Enroll new student. Phone duplicate check. Discount + partial payment support. |
| `EditStudentModal` | `components/students/EditStudentModal.tsx` | `student, onClose, onSave` | Edit phone, batch, notes, guardian. Does NOT edit `startDate`. |
| `ReEnrollModal` | `components/students/ReEnrollModal.tsx` | `student, onClose, onConfirm` | Fresh membership — new type, batch, start date. Preserves payment history. |
| `DropoutConfirmModal` | `components/students/DropoutConfirmModal.tsx` | `student, onClose, onConfirm` | Captures reason. Sets all active payments to `inactive`. |
| `CollectRemainingModal` | `components/students/CollectRemainingModal.tsx` | `student, onClose, onConfirm` | Collects `pendingAmount`. Sets it to 0. |

### Coaching-Domain Modals

| Component | File | Key Props | Behavior Summary |
|---|---|---|---|
| `RenewModal` | `components/coaching/RenewModal.tsx` | `student, isCollectingRemaining?, onClose, onConfirm` | Select periods. Chains `nextDueDate`. Partial payment + batch switch support. |

### Court-Domain Modals

| Component | File | Key Props | Behavior Summary |
|---|---|---|---|
| `AddMemberModal` | `components/court/AddMemberModal.tsx` | `onClose, onSuccess` | Monthly or sessions plan. |
| `EditCourtMemberModal` | `components/court/EditCourtMemberModal.tsx` | `member, onClose, onSave` | Edit court member details. |
| `RenewCourtMemberModal` | `components/court/RenewCourtMemberModal.tsx` | `member, onClose, onConfirm` | Extends `nextDueDate` (monthly) or adds sessions. Pre-filled + locked name/phone. |
| `BuySessionsModal` | `components/court/BuySessionsModal.tsx` | `member, onClose, onConfirm` | Top-up sessions. Creates `session-topup` payment entry. |
| `CollectCourtPaymentModal` | `components/court/CollectCourtPaymentModal.tsx` | `member, onClose, onConfirm` | Collects pending court payment. |

### Accounts & Inventory Modals

| Component | File | Key Props | Behavior Summary |
|---|---|---|---|
| `AccountEntryModal` | `components/accounts/AccountEntryModal.tsx` | `type: 'expense' \| 'income', entry?, onClose, onSave` | Shared add/edit for expense and income entries. |
| `AddInventoryModal` | `components/accounts/AddInventoryModal.tsx` | `onClose, onSave` | Add item. Supports custom category creation. |
| `EditInventoryModal` | `components/accounts/EditInventoryModal.tsx` | `item, onClose, onSave` | Full edit form. |
| `InventoryDetailsModal` | `components/accounts/InventoryDetailsModal.tsx` | `item, onClose` | Read-only item detail view. |

### Communications Components

| Component | File | Notes |
|---|---|---|
| `TemplateCard` | `components/communications/TemplateCard.tsx` | Template preview card in gallery. |
| `TemplateDetailShell` | `components/communications/TemplateDetailShell.tsx` | Detail view wrapper with back navigation. |
| `TemplateHistory` | `components/communications/TemplateHistory.tsx` | Message send log — date, recipient count, status, trigger type. |

### Per-Feature Sub-Components (`_components/`)

| Component | Route | Feature Summary |
|---|---|---|
| `FeesSegment` | `/reports` | Monthly revenue bar chart, paid/pending donut, payment mode donut, batch revenue table, outstanding students table |
| `StudentsSegment` | `/reports` | Growth bar chart, enrollment trend line chart (⚠ hardcoded), age distribution bars, status donut, recent dropouts table |
| `AttendanceSegment` | `/reports` | Batch attendance rate bars, present/absent donut, student overview table with threshold classification |
| `AcademySection` | `/settings` | Academy name, phone, address; `courtMembershipEnabled` toggle; `multiBranchEnabled` toggle |
| `BranchesSection` | `/settings` | Add/edit/deactivate branches — only visible when `multiBranchEnabled` |
| `StaffSection` | `/settings` | Staff CRUD — name, role, branch assignment, status (active/invited/suspended) |
| `PermissionsMatrix` | `/settings` | Read-only 11×5 role permissions table |
| `MembershipSection` | `/settings` | Coaching membership plan CRUD — name, duration type, duration, price |
| `EventsSection` | `/settings` | Upcoming events CRUD — name, type, date, description |

### Planned Components (not yet built)

| Component | File (planned) | Purpose |
|---|---|---|
| `AddEnquiryModal` | `components/enquiries/AddEnquiryModal.tsx` | Add new enquiry to admissions pipeline |
| Enquiry page | `app/(management)/enquiries/page.tsx` | Pipeline stages: New → Contacted → Trial scheduled → Trial done → Enrolled/Lost |

---

## 13. Client / Server Boundary Map

### Server Components (no `'use client'`)

| File | Reason |
|---|---|
| `src/app/layout.tsx` | Root layout — metadata, font import only |
| `src/app/(auth)/login/layout.tsx` | Passthrough layout |
| `src/app/(management)/layout.tsx` | Auth guard — `supabase.auth.getUser()` server-side |
| `src/proxy.ts` | Middleware — not a React component |

### Client Components (`'use client'`)

| File | Primary Reason |
|---|---|
| `app/(auth)/login/page.tsx` | `useState`, `signInWithPassword()` |
| `app/(management)/dashboard/page.tsx` | `useState`, date filter, Recharts |
| `app/(management)/students/page.tsx` | `useState`, router, modal management, Check In |
| `app/(management)/students/[id]/page.tsx` | `useState`, attendance calendar, tab switching |
| `app/(management)/batches/page.tsx` | `useState`, `router.push()` |
| `app/(management)/batches/[id]/page.tsx` | `useState`, attendance marking, tabs |
| `app/(management)/court-members/[id]/page.tsx` | `useState`, tabs, check-in history |
| `app/(management)/transactions/page.tsx` | `useState`, bulk collect, date filter |
| `app/(management)/accounts/page.tsx` | `useState`, date filter, CRUD |
| `app/(management)/inventory/page.tsx` | `useState`, sort/filter, modals |
| `app/(management)/reports/page.tsx` | `useState`, segment switching |
| `app/(management)/reports/_components/FeesSegment.tsx` | `useState`, Recharts |
| `app/(management)/reports/_components/StudentsSegment.tsx` | `useState`, Recharts |
| `app/(management)/reports/_components/AttendanceSegment.tsx` | `useState`, Recharts |
| `app/(management)/communications/page.tsx` | `useState`, template selection |
| `app/(management)/settings/page.tsx` | `useState`, section management |
| `app/(management)/settings/_components/AcademySection.tsx` | `useState`, form handling |
| `app/(management)/settings/_components/BranchesSection.tsx` | `useState`, form handling |
| `app/(management)/settings/_components/StaffSection.tsx` | `useState`, form handling |
| `app/(management)/settings/_components/PermissionsMatrix.tsx` | Read display — but co-located with client siblings |
| `app/(management)/settings/_components/MembershipSection.tsx` | `useState`, form handling |
| `app/(management)/settings/_components/EventsSection.tsx` | `useState`, form handling |
| `components/layout/Sidebar.tsx` | `usePathname()`, sign-out handler |
| `components/layout/TopBar.tsx` | `useState` for branch switcher |
| `components/layout/LiveClock.tsx` | `useEffect` + `setInterval` |
| `components/students/AddStudentModal.tsx` | `useState`, form handling |
| `components/students/EditStudentModal.tsx` | `useState`, form handling |
| `components/students/ReEnrollModal.tsx` | `useState`, form handling |
| `components/students/DropoutConfirmModal.tsx` | `useState`, form handling |
| `components/students/CollectRemainingModal.tsx` | `useState`, form handling |
| `components/coaching/RenewModal.tsx` | `useState`, form handling |
| `components/court/AddMemberModal.tsx` | `useState`, form handling |
| `components/court/EditCourtMemberModal.tsx` | `useState`, form handling |
| `components/court/RenewCourtMemberModal.tsx` | `useState`, form handling |
| `components/court/BuySessionsModal.tsx` | `useState`, form handling |
| `components/court/CollectCourtPaymentModal.tsx` | `useState`, form handling |
| `components/accounts/AccountEntryModal.tsx` | `useState`, form handling |
| `components/accounts/AddInventoryModal.tsx` | `useState`, form handling |
| `components/accounts/EditInventoryModal.tsx` | `useState`, form handling |
| `components/accounts/InventoryDetailsModal.tsx` | Display only — but is a modal |
| `components/communications/TemplateCard.tsx` | Interactive card |
| `components/communications/TemplateDetailShell.tsx` | `useState`, navigation |
| `components/communications/TemplateHistory.tsx` | Display component |

---

## 14. Exports Index

### `src/lib/utils.ts`

| Export | Signature | Returns |
|---|---|---|
| `formatCurrency` | `(amount: number) → string` | `₹1,500` |
| `formatDate` | `(date: Date \| string) → string` | `DD/MM/YYYY` in IST |
| `formatTime` | `(time: string) → string` | `6:00 AM` |
| `formatSlot` | `(startTime: string, endTime: string) → string` | `6:00 AM – 7:00 AM` |
| `getTodayIST` | `() → string` | `YYYY-MM-DD` in IST |
| `getDateDaysAgoIST` | `(daysAgo: number) → string` | `YYYY-MM-DD` in IST |
| `getFirstDayOfMonthIST` | `() → string` | `YYYY-MM-01` |
| `calcAge` | `(dob: string) → number` | Integer age |

### `src/lib/mock-data.ts` — Mutable Data (Temporary)

| Export | Type | Seed Count |
|---|---|---|
| `mockStudents` | `let Student[]` | 12 (s1–s12, all statuses) |
| `mockCourtMembers` | `let CourtMember[]` | 3 (monthly active, sessions-low, exhausted) |
| `mockAttendance` | `let AttendanceRecord[]` | ~14 (7 days × 2 batches, 85% present) |
| `mockExpenses` | `let AccountEntry[]` | 6 |
| `mockIncomeEntries` | `let AccountEntry[]` | 4 |
| `mockInventory` | `let InventoryItem[]` | 6 |
| `mockSettings` | `let Settings` | Single settings object |
| `mockBatches` | `let Batch[]` | 2 (Morning 6d/wk, Evening 4d/wk) |
| `mockBranches` | `Branch[]` | 2 (Main Center, Kondapur Center) |
| `mockMessageLogs` | `let MessageLog[]` | 6 |

### `src/lib/mock-data.ts` — Constants (Stable)

| Export | Type | Count |
|---|---|---|
| `EXPENSE_CATEGORIES` | `string[]` | 9 |
| `INCOME_CATEGORIES` | `string[]` | 9 |
| `BUILTIN_INVENTORY_CATEGORIES` | `string[]` | 4 |
| `UNIT_PRESETS` | `string[]` | 6 |
| `PERMISSION_MATRIX` | `ModulePermission[]` | 11 rows |

### `src/lib/mock-data.ts` — Types

| Type | Key Fields |
|---|---|
| `Student` | id, name, phone, membershipTypeId, currentBatch, fees, startDate, membershipStartDate, nextDueDate, status, pendingAmount, paymentHistory |
| `PaymentEntry` | id, date, amount, remainingAmount, paymentType, monthsCovered, paymentMethod, status, note |
| `MembershipType` | id, name, durationType, duration, price |
| `Batch` | id, name, branchId, days, fees?, description? |
| `AttendanceRecord` | id (compound), batchId, date, records (map) |
| `AccountEntry` | id, date, category, description, amount, paymentMethod, notes? |
| `InventoryItem` | id, sku, name, category, description, unit, quantity, price, sellingPrice, icon? |
| `CourtPlan` | id, name, planType, price, durationMonths?, totalSessions?, validityDays? |
| `CourtPaymentEntry` | id, date, amount, paymentMethod, entryType, status, note? |
| `CourtMember` | id, name, phone, planId?, planType, joiningDate, membershipStartDate?, nextDueDate?, totalSessions?, remainingSessions?, status, amountPaid, pendingAmount?, paymentHistory, checkInHistory |
| `Settings` | courtMembershipEnabled, courtPlans, courtName, tenantPhone?, tenantAddress?, multiBranchEnabled, branches, staffMembers, membershipTypes, batches, feeReminderEnabled, feeAckEnabled, birthdayWishEnabled |
| `Branch` | id, name, address?, isActive, isPrimary? |
| `StaffMember` | id, name, email, role (StaffRole), branchId?, status ('active' \| 'invited' \| 'suspended') |
| `StaffRole` | `'owner' \| 'manager' \| 'coach' \| 'accountant' \| 'receptionist'` |
| `PaymentMethod` | `'cash' \| 'upi' \| 'card' \| 'other'` |
| `ModulePermission` | module, owner, manager, coach, accountant, receptionist |
| `MessageLog` | id, templateId, sentAt, recipientCount, status, triggerType |
| `Event` | id, name, type, date, description |

### `src/lib/supabase/client.ts`

| Export | Signature | Notes |
|---|---|---|
| `createClient` | `() → SupabaseClient` | Browser client — use only in login page |

### `src/lib/supabase/server.ts`

| Export | Signature | Notes |
|---|---|---|
| `createClient` | `() → SupabaseClient` | Server client — uses Next.js cookies(); use in middleware and server components |

### `src/lib/supabase/database.types.ts`

Auto-generated Supabase types. Not yet consumed by application code — all app code uses hand-written types from `mock-data.ts`. These types will become the source of truth once Supabase is wired.

---

## 15. Data Source Per Feature (Migration Tracker)

`mock-data.ts` imports are the migration signal. When a feature moves to Supabase, its `mock-data.ts` imports are replaced with query functions and server actions.

| Feature | Route | Data Source | `mock-data.ts` imports |
|---|---|---|---|
| **Authentication** | `/login` | ✅ **Supabase Auth** | None |
| Dashboard | `/dashboard` | ⚠ Mock | `mockStudents`, `mockSettings`, `mockAttendance`, `mockBatches` |
| Students (coaching) | `/students` | ⚠ Mock | `mockStudents`, `mockSettings`, `mockBatches` |
| Student profile | `/students/[id]` | ⚠ Mock | `mockStudents`, `mockAttendance`, `mockSettings` |
| Court members | `/students` (court tab) | ⚠ Mock | `mockCourtMembers`, `mockSettings` |
| Court member profile | `/court-members/[id]` | ⚠ Mock | `mockCourtMembers`, `mockSettings` |
| Batches | `/batches` | ⚠ Mock | `mockBatches`, `mockStudents`, `mockSettings` |
| Batch detail | `/batches/[id]` | ⚠ Mock | `mockBatches`, `mockStudents`, `mockAttendance`, `mockSettings` |
| Fee transactions | `/transactions` | ⚠ Mock | `mockStudents`, `mockCourtMembers`, `mockSettings` |
| Accounts | `/accounts` | ⚠ Mock | `mockExpenses`, `mockIncomeEntries` |
| Inventory | `/inventory` | ⚠ Mock | `mockInventory` |
| Reports | `/reports` | ⚠ Mock | `mockStudents`, `mockAttendance`, `mockBatches`, `mockSettings` |
| Communications | `/communications` | ⚠ Mock + Stub | `mockMessageLogs`, `mockSettings`, `mockStudents` + `/api/whatsapp/send` stub |
| Settings | `/settings` | ⚠ Mock | `mockSettings`, `mockBranches` |
| Enquiries | `/enquiries` | ⏳ Planned | — |

**Migration status: 1 of 15 features on Supabase (Auth only).**

---

## 16. Database Snapshot

Full schema in `database_schema.sql` and `supabase/schema.sql`. **Not yet deployed or connected.**

### Tables

| Table | Key Columns | Notes |
|---|---|---|
| `students` | `id, academy_id, name, phone, alternate_phone, guardian_name, membership_type_id, batch_id, fees, start_date, membership_start_date, next_due_date, status, date_of_birth, enrollment_source, dropout_reason, dropout_date, pending_amount, internal_notes` | `student_status` enum column |
| `student_payments` | `id, student_id, academy_id, date, amount, remaining_amount, payment_type, months_covered, payment_method, status, note` | Normalized from `Student.paymentHistory[]` |
| `court_members` | `id, academy_id, name, phone, plan_id, plan_type, joining_date, membership_start_date, next_due_date, total_sessions, remaining_sessions, status, amount_paid, pending_amount, notes` | `court_member_status` enum column |
| `court_payments` | `id, court_member_id, academy_id, date, amount, payment_method, entry_type, status, note` | Normalized from `CourtMember.paymentHistory[]` |
| `court_check_ins` | `id, court_member_id, date, sessions_after` | Normalized from `CourtMember.checkInHistory[]` |
| `attendance_records` | `id, batch_id, academy_id, date, records` | `records` is JSONB `{ studentId → 'present' \| 'absent' }` |
| `account_entries` | `id, academy_id, date, category, description, amount, payment_method, entry_type, notes` | `entry_type: 'expense' \| 'income'` — unifies two mock arrays into one table |
| `inventory_items` | `id, academy_id, sku, name, category, description, unit, quantity, price, selling_price, icon` | — |
| `settings` | `id, academy_id, court_membership_enabled, court_name, tenant_phone, tenant_address, multi_branch_enabled, fee_reminder_enabled, fee_ack_enabled, birthday_wish_enabled` | 1 row per academy |

*(9 tables, 12+ indexes, enum types, triggers defined. Full DDL in `database_schema.sql`.)*

### Type Drift Note

The hand-written types in `mock-data.ts` use embedded arrays (`Student.paymentHistory: PaymentEntry[]`). The SQL schema normalizes this into separate tables with foreign keys. When migrating, all components reading embedded arrays must be refactored to handle joined/relational data from `database.types.ts`.

### Migrations Applied

**None.** Schema is defined in a single `.sql` file. Not yet run against any Supabase project. There is no migrations directory yet.

---

## 17. Dependencies and Scripts

### Scripts (`package.json`)

```json
{
  "dev":   "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint":  "next lint"
}
```

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | `16.3.1` | Framework |
| `react` | `19.2.8` | UI runtime |
| `react-dom` | `19.2.8` | DOM rendering |
| `@supabase/supabase-js` | `^2.112.3` | Supabase JS client |
| `@supabase/ssr` | `^0.12.4` | SSR auth cookie management |
| `tailwindcss` | v4 | CSS framework |
| `@tailwindcss/postcss` | — | Tailwind v4 PostCSS plugin |
| `date-fns` | `^4.4.0` | Date arithmetic + formatting |
| `lucide-react` | `^1.34.0` | Icon library |
| `recharts` | `^3.10.1` | Charts (bar, pie, line, donut) |
| `emoji-picker-react` | `^4.22.2` | Emoji picker (Communications module) |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `^5` | Language + type checking |
| `eslint` | `^9` | Linting |
| `eslint-config-next` | `16.3.1` | Next.js ESLint rules |
| `@types/node` | — | Node type definitions |
| `@types/react` | — | React type definitions |
| `@types/react-dom` | — | ReactDOM type definitions |

---

## 18. Environment Variable Names

All variables live in `.env.local` (git-ignored). Create `.env.example` with placeholder values for onboarding.

| Variable | Used In | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase anonymous (public) key |
| `WHATSAPP_API_KEY` | `app/api/whatsapp/send/route.ts` | Meta WhatsApp Cloud API key (stub — not active) |
| `WHATSAPP_PHONE_NUMBER_ID` | `app/api/whatsapp/send/route.ts` | WhatsApp sender phone number ID (stub — not active) |

**Note:** `NEXT_PUBLIC_` prefix makes these readable on the client. The anon key is designed to be public. Never add secret server-only keys with the `NEXT_PUBLIC_` prefix.

---

## Design Token Quick Reference

Defined in `src/app/globals.css` via `@theme` (Tailwind v4):

| Token | Value | Class | Usage |
|---|---|---|---|
| `--color-so-bg` | `#F4F6FA` | `bg-so-bg` | Page background |
| `--color-so-card` | `#FFFFFF` | `bg-so-card` | Card/panel background |
| `--color-so-surface` | `#EEF1F8` | `bg-so-surface` | Input backgrounds, secondary surfaces |
| `--color-so-border` | `#DDE3EE` | `border-so-border` | Card outlines, dividers |
| `--color-so-border-subtle` | `#EEF1F8` | `border-so-border-subtle` | Subtle dividers |
| `--color-so-text` | `#0F1729` | `text-so-text` | Primary text |
| `--color-so-muted` | `#64748B` | `text-so-muted` | Labels, secondary text |
| `--color-so-grey` | `#484F58` | `text-so-grey` | Tertiary, placeholders |
| `--color-so-accent` | `#3B6BE8` | `bg-so-accent` | Primary buttons, active states |
| `--color-so-accent-hover` | `#2563EB` | `hover:bg-so-accent-hover` | Button hover |
| `--color-so-accent-subtle` | `rgba(59,107,232,0.08)` | `bg-so-accent-subtle` | Light accent fill |
| `--color-so-accent-text` | `#FFFFFF` | `text-so-accent-text` | Text on accent |
| `--color-so-emerald` | `#059669` | `text-so-emerald` | Success, active, collected |
| `--color-so-red` | `#DC2626` | `text-so-red` | Error, expired, destructive |
| `--color-so-yellow` | `#D97706` | `text-so-yellow` | Warning, due-soon, pending |
| `--color-so-nav` | `#232E44` | `bg-so-nav` | Sidebar background (always dark) |
| `--color-so-nav-text` | `#FFFFFF` | `text-so-nav-text` | Sidebar text |
| `--color-so-blue` | `#58A6FF` | `text-so-blue` | Informational badges |
| `--color-so-purple` | `#BC8CFF` | `text-so-purple` | Premium badges |
| `--color-so-orange` | `#FFA657` | `text-so-orange` | Attention badges |

**Next due date display:** always `text-[#5278EA]` (accent variant — not a named token).

### Common UI Patterns

| Pattern | Tailwind Classes |
|---|---|
| Card | `bg-so-card border border-so-border rounded-xl shadow-sm p-5` |
| Card (large) | `bg-so-card border border-so-border rounded-2xl p-6 shadow-sm` |
| Primary button | `bg-so-accent hover:bg-so-accent-hover text-white font-semibold rounded-lg` |
| Secondary button | `border border-so-border text-so-muted hover:border-so-accent rounded-lg` |
| Pill button | `px-3 py-1.5 text-xs font-semibold rounded-full` |
| Input | `bg-so-surface border border-so-border rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-so-accent` |
| Label | `text-xs font-medium text-so-muted uppercase tracking-wide` |
| Modal overlay | `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm` |

---

## Seed Data Summary

| Entity | Count | Status Distribution |
|---|---|---|
| Students | 12 | All statuses: active, due-soon, expired, inactive, dropout |
| Court Members | 3 | active (monthly), sessions-low, exhausted |
| Batches | 2 | Morning (6d/week ₹1,500), Evening (4d/week ₹1,500) |
| Branches | 2 (mockBranches) + 3 (settings.branches) | Main Center, Kondapur, Indiranagar, Whitefield, Koramangala |
| Staff | 3–4 | Owner, Coach, Accountant/Manager |
| Membership Types | 3 | Monthly ₹1,500, Quarterly ₹4,000, Annual ₹14,000 |
| Court Plans | 3 | Monthly Unlimited ₹3,000, Session Pack 10 ₹1,500, Session Pack 20 ₹2,500 |
| Expenses | 6 | Shuttlecocks, utilities, court rent, equipment, coaching staff |
| Income Entries | 4 | Shuttle sales, restringing, equipment sales |
| Inventory Items | 6 | Yonex shuttles, racquets, shoes, grip tape, T-shirts |
| Attendance Records | ~14 | 7 days × 2 batches, 85% present rate (auto-seeded via IIFE) |
| Events | 3 | Tournament, sports meet, maintenance day |
| Message Logs | 6 | Historical WhatsApp send records |
