# EzyFee — Structure Reference

> **Source:** CODEBASE_AUDIT.md v1.0 (01 Oct 2026) + V1_changes_oct1.md (01 Oct 2026) + project memory reconciliation
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
├── pro_logo.png                          # ⚠ Should be in /public/, fails in prod
├── scratch.ts                            # ⚠ Delete before production
├── scratch.txt                           # ⚠ Delete before production (115 KB)
├── scratch_accounts.tsx                  # ⚠ Delete before production (64 KB)
│
├── public/                               # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── supabase/
│   ├── schema.sql                        # Mirror of database_schema.sql
│   └── SCHEMA_NOTES.md
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
    │   ├── (auth)/
    │   │   └── login/
    │   │       ├── layout.tsx            # Passthrough layout [SERVER]
    │   │       └── page.tsx              # Email/password login form [CLIENT]
    │   │
    │   ├── (management)/
    │   │   ├── layout.tsx                # SSR auth guard + Sidebar + TopBar shell [SERVER]
    │   │   │
    │   │   ├── dashboard/
    │   │   │   ├── page.tsx              # KPI cards, batch revenue, payment modes [CLIENT — still mock]
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   │
    │   │   ├── enquiries/                # ✅ Supabase-wired
    │   │   │   ├── page.tsx              # Async Server Component — fetches getEnquiries() [SERVER]
    │   │   │   ├── loading.tsx
    │   │   │   ├── actions.ts            # createEnquiry, updateEnquiry, advanceEnquiryStatus, deleteEnquiry
    │   │   │   └── _components/
    │   │   │       └── EnquiryList.tsx   # Search, filter, popover actions, delete confirm strip [CLIENT]
    │   │   │
    │   │   ├── students/                 # ✅ Supabase-wired
    │   │   │   ├── page.tsx              # Async Server Component — fetches getStudents() [SERVER]
    │   │   │   ├── loading.tsx
    │   │   │   ├── error.tsx
    │   │   │   ├── actions.ts            # createStudent, renewStudent, dropoutStudent, reEnrollStudent,
    │   │   │   │                         #   deactivateStudent, activateStudent, collectRemaining,
    │   │   │   │                         #   voidPayment, updateStudent, deleteStudentPermanently
    │   │   │   ├── _components/
    │   │   │   │   └── StudentList.tsx   # Search, filters, tabs, action menus, modals [CLIENT]
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx          # Async Server Component — fetches getStudentById(id)
    │   │   │       │                     #   + getAttendanceByStudent() [SERVER]
    │   │   │       └── _components/
    │   │   │           └── StudentProfileView.tsx  # Details, Transactions (void), Attendance tabs [CLIENT]
    │   │   │
    │   │   ├── batches/                  # ✅ Supabase-wired
    │   │   │   ├── page.tsx              # Async Server Component — fetches getBatches() + getStudents() [SERVER]
    │   │   │   ├── loading.tsx
    │   │   │   ├── actions.ts            # createBatch, updateBatch, deleteBatch, getBatchesAction
    │   │   │   ├── _components/
    │   │   │   │   └── BatchesView.tsx   # Batch cards, add/edit/delete UI [CLIENT]
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx          # Async Server Component — fetches batch + students + attendance
    │   │   │       │                     #   concurrently via Promise.all [SERVER]
    │   │   │       ├── loading.tsx
    │   │   │       ├── actions.ts        # saveAttendance (upsert with onConflict: batch_id,date)
    │   │   │       └── _components/
    │   │   │           └── BatchDetail.tsx  # Attendance marking, date nav, tabs, search [CLIENT]
    │   │   │
    │   │   ├── court-members/
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx          # Court member profile — details, transactions, check-ins [CLIENT — mock]
    │   │   │       └── loading.tsx
    │   │   │
    │   │   ├── transactions/
    │   │   │   ├── page.tsx              # Fee ledger — coaching + court segments [CLIENT — mock]
    │   │   │   ├── loading.tsx
    │   │   │   └── error.tsx
    │   │   │
    │   │   ├── accounts/
    │   │   │   ├── page.tsx              # Income + expense tracker [CLIENT — mock]
    │   │   │   └── loading.tsx
    │   │   │
    │   │   ├── inventory/
    │   │   │   ├── page.tsx              # Product catalog with stock tracking [CLIENT — mock]
    │   │   │   └── loading.tsx
    │   │   │
    │   │   ├── reports/
    │   │   │   ├── page.tsx              # Analytics hub — fees, students, attendance [CLIENT — mock]
    │   │   │   └── _components/
    │   │   │       ├── FeesSegment.tsx       # Revenue chart (month-scoped), paid/pending donut,
    │   │   │       │                         #   Batch Revenue + Payment Mode combined card with navigator
    │   │   │       ├── StudentsSegment.tsx   # Growth chart, age distribution, dropouts
    │   │   │       └── AttendanceSegment.tsx # Batch rates, present/absent donut, overview table
    │   │   │
    │   │   ├── communications/
    │   │   │   ├── page.tsx              # WhatsApp template gallery + detail shell [CLIENT — mock]
    │   │   │   └── loading.tsx
    │   │   │
    │   │   └── settings/                 # ✅ Membership Types Supabase-wired; rest still mock
    │   │       ├── page.tsx              # Async Server Component — fetches getMembershipTypes() [SERVER]
    │   │       ├── loading.tsx
    │   │       ├── error.tsx
    │   │       ├── actions.ts            # createMembershipType, updateMembershipType, deleteMembershipType
    │   │       └── _components/
    │   │           ├── AcademySection.tsx      # Name, phone, address, feature toggles
    │   │           ├── BranchesSection.tsx     # Multi-branch CRUD
    │   │           ├── StaffSection.tsx        # Staff CRUD + role assignment
    │   │           ├── PermissionsMatrix.tsx   # Read-only role permissions table
    │   │           ├── MembershipSection.tsx   # ✅ Wired to server actions; accepts initialMembershipTypes prop
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
    │   ├── enquiries/                    # ✅ Created
    │   │   ├── AddEnquiryModal.tsx       # Create new enquiry; calls createEnquiry action
    │   │   └── EditEnquiryModal.tsx      # Edit + status advance; calls updateEnquiry / advanceEnquiryStatus
    │   │
    │   ├── students/
    │   │   ├── AddStudentModal.tsx       # Two-tab sidebar (Personal Details + Coaching Details)
    │   │   │                             #   New fields: address, email, joiningDate
    │   │   │                             #   Dynamic batch dropdown from getBatchesAction()
    │   │   ├── EditStudentModal.tsx      # Edits address, email, DOB, startDate (Admission Date), source
    │   │   ├── ReEnrollModal.tsx         # Dynamic batches; wired to reEnrollStudent action
    │   │   ├── DropoutConfirmModal.tsx   # Wired to dropoutStudent action
    │   │   └── CollectRemainingModal.tsx # Wired to collectRemaining action
    │   │
    │   ├── coaching/
    │   │   └── RenewModal.tsx            # Dynamic batches; wired to renewStudent action
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
        ├── auth-context.ts              # ✅ getServerSession(): { user, academyId, role } — server-only
        ├── mock-data.ts                 # Types + seed data; preserved for un-migrated consumers
        ├── utils.ts                     # Pure utilities + toAppEnum / toDbEnum enum mappers
        └── supabase/
            ├── client.ts               # Supabase browser client
            ├── server.ts               # Supabase server client — strongly typed createServerClient<Database>
            └── database.types.ts       # Auto-generated Supabase DB types
        └── queries/                    # ✅ Server-only read functions
            ├── settings.ts             # getMembershipTypes()
            ├── students.ts             # getStudents(), getStudentById(), getStudentsByBatch()
            ├── batches.ts              # getBatches(), getBatchById()
            ├── attendance.ts           # getAttendanceByBatch(), getAttendanceByStudent()
            └── enquiries.ts            # getEnquiries()
```

---

## 11. Route Map

| Route | Route Group | Layout | Render | Auth Required | `loading.tsx` | `error.tsx` |
|---|---|---|---|---|---|---|
| `/` | — | root | — | — | — | — |
| `/login` | `(auth)` | `login/layout.tsx` (passthrough) | CLIENT | ❌ | — | — |
| `/dashboard` | `(management)` | `(management)/layout.tsx` (SSR, auth guard) | CLIENT | ✅ | ✅ | ✅ |
| `/enquiries` | `(management)` | same | SERVER → CLIENT | ✅ | ✅ | — |
| `/reports` | `(management)` | same | CLIENT | ✅ | — | — |
| `/students` | `(management)` | same | SERVER → CLIENT | ✅ | ✅ | ✅ |
| `/students/[id]` | `(management)` | same | SERVER → CLIENT | ✅ | — | — |
| `/batches` | `(management)` | same | SERVER → CLIENT | ✅ | ✅ | — |
| `/batches/[id]` | `(management)` | same | SERVER → CLIENT | ✅ | ✅ | — |
| `/court-members/[id]` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/transactions` | `(management)` | same | CLIENT | ✅ | ✅ | ✅ |
| `/inventory` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/accounts` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/communications` | `(management)` | same | CLIENT | ✅ | ✅ | — |
| `/settings` | `(management)` | same | SERVER → CLIENT | ✅ | ✅ | ✅ |

> **SERVER → CLIENT** means the page.tsx is an async Server Component that fetches data and passes it to a `'use client'` view component as props.

### Sidebar Navigation Items (in order)

| # | Label | Route | Icon | Condition |
|---|---|---|---|---|
| 1 | Dashboard | `/dashboard` | `LayoutDashboard` | Always |
| 2 | Enquiries | `/enquiries` | `UserSearch` | Always |
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

### Enquiry-Domain Modals

| Component | File | Key Props | Behavior Summary |
|---|---|---|---|
| `AddEnquiryModal` | `components/enquiries/AddEnquiryModal.tsx` | `onClose, onSuccess` | Create new enquiry; calls `createEnquiry` server action; shows loading + error state. |
| `EditEnquiryModal` | `components/enquiries/EditEnquiryModal.tsx` | `enquiry, onClose, onSuccess` | Edit name/phone/guardian/notes; status transition with trial date via `advanceEnquiryStatus`. |

### Student-Domain Modals

| Component | File | Key Props | Behavior Summary |
|---|---|---|---|
| `AddStudentModal` | `components/students/AddStudentModal.tsx` | `onClose, onSuccess, defaultBatch?` | Two-tab sidebar modal (Personal + Coaching). New fields: address, email, joiningDate. Dynamic batch dropdown. Calls `createStudent` action; surfaces `DUPLICATE_PHONE` error. |
| `EditStudentModal` | `components/students/EditStudentModal.tsx` | `student, onClose, onSave` | Edits phone, batch, notes, guardian, address, email, DOB, startDate, source. Dynamic batch list. Calls `updateStudent` action. |
| `ReEnrollModal` | `components/students/ReEnrollModal.tsx` | `student, onClose, onConfirm` | Fresh membership — new type, batch, start date. Dynamic batch dropdown. Calls `reEnrollStudent` action. |
| `DropoutConfirmModal` | `components/students/DropoutConfirmModal.tsx` | `student, onClose, onConfirm` | Captures reason. Calls `dropoutStudent` action; sets all active payments to `inactive`. |
| `CollectRemainingModal` | `components/students/CollectRemainingModal.tsx` | `student, onClose, onConfirm` | Collects `pendingAmount`. Calls `collectRemaining` action. |

### Coaching-Domain Modals

| Component | File | Key Props | Behavior Summary |
|---|---|---|---|
| `RenewModal` | `components/coaching/RenewModal.tsx` | `student, isCollectingRemaining?, onClose, onConfirm` | Select periods. Chains `nextDueDate`. Partial payment + batch switch. Dynamic batch list. Calls `renewStudent` action. |

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

### Per-Feature Client View Components (`_components/`)

| Component | Route | Feature Summary |
|---|---|---|
| `EnquiryList` | `/enquiries` | Search, status filter, sort, inline popovers, delete confirmation strip, action menus. Receives `enquiries` prop from Server page. |
| `StudentList` | `/students` | Search, status filters, tabs, action menus, modal dialogs. Receives `students` prop from Server page. |
| `StudentProfileView` | `/students/[id]` | Details tab (email, address, DOB, source), Transaction Details tab (void payment support), Attendance tab. Receives `student` + `attendance` props. |
| `BatchesView` | `/batches` | Batch cards, create/edit/delete with duplicate name validation and deletion safety check. Receives `batches` + `students` props. |
| `BatchDetail` | `/batches/[id]` | Attendance marking, date navigation, student toggles, search, tab controls. Calls `saveAttendance` action. Receives `batch` + `students` + `attendance` props. |
| `FeesSegment` | `/reports` | Monthly revenue bar chart (dropdown: Last 3 / 6 months / Custom), paid/pending donut (batch filter dropdown), Batch Revenue + Payment Mode combined card with shared `← Month →` navigator. Percentage capped at 100%. |
| `StudentsSegment` | `/reports` | Growth bar chart, enrollment trend line chart (⚠ hardcoded), age distribution bars, status donut, recent dropouts table |
| `AttendanceSegment` | `/reports` | Batch attendance rate bars, present/absent donut, student overview table with threshold classification |
| `AcademySection` | `/settings` | Academy name, phone, address; `courtMembershipEnabled` toggle; `multiBranchEnabled` toggle |
| `BranchesSection` | `/settings` | Add/edit/deactivate branches — only visible when `multiBranchEnabled` |
| `StaffSection` | `/settings` | Staff CRUD — name, role, branch assignment, status (active/invited/suspended) |
| `PermissionsMatrix` | `/settings` | Read-only 12×5 role permissions table (includes Enquiries row) |
| `MembershipSection` | `/settings` | ✅ Wired to server actions. Accepts `initialMembershipTypes` prop. Create/update/soft-delete coaching plans. |
| `EventsSection` | `/settings` | Upcoming events CRUD — name, type, date, description |

---

## 13. Client / Server Boundary Map

### Server Components (no `'use client'`)

| File | Reason |
|---|---|
| `src/app/layout.tsx` | Root layout — metadata, font import only |
| `src/app/(auth)/login/layout.tsx` | Passthrough layout |
| `src/app/(management)/layout.tsx` | Auth guard — `supabase.auth.getUser()` server-side |
| `src/app/(management)/enquiries/page.tsx` | Fetches `getEnquiries()`; passes data to `EnquiryList` |
| `src/app/(management)/students/page.tsx` | Fetches `getStudents()`; passes data to `StudentList` |
| `src/app/(management)/students/[id]/page.tsx` | Fetches `getStudentById(id)` + `getAttendanceByStudent()`; passes to `StudentProfileView` |
| `src/app/(management)/batches/page.tsx` | Fetches `getBatches()` + `getStudents()`; passes to `BatchesView` |
| `src/app/(management)/batches/[id]/page.tsx` | Concurrent `Promise.all` — batch + students + attendance; passes to `BatchDetail` |
| `src/app/(management)/settings/page.tsx` | Fetches `getMembershipTypes()`; passes `initialMembershipTypes` to `MembershipSection` |
| `src/proxy.ts` | Middleware — not a React component |

### Client Components (`'use client'`)

| File | Primary Reason |
|---|---|
| `app/(auth)/login/page.tsx` | `useState`, `signInWithPassword()` |
| `app/(management)/dashboard/page.tsx` | `useState`, date filter, Recharts |
| `app/(management)/enquiries/_components/EnquiryList.tsx` | `useState`, router, modal management, delete confirm strip |
| `app/(management)/students/_components/StudentList.tsx` | `useState`, router, modal management, action menus |
| `app/(management)/students/[id]/_components/StudentProfileView.tsx` | `useState`, tab switching, void payment |
| `app/(management)/batches/_components/BatchesView.tsx` | `useState`, router, CRUD modals |
| `app/(management)/batches/[id]/_components/BatchDetail.tsx` | `useState`, attendance marking, date navigation, saveAttendance call |
| `app/(management)/court-members/[id]/page.tsx` | `useState`, tabs, check-in history |
| `app/(management)/transactions/page.tsx` | `useState`, bulk collect, date filter |
| `app/(management)/accounts/page.tsx` | `useState`, date filter, CRUD |
| `app/(management)/inventory/page.tsx` | `useState`, sort/filter, modals |
| `app/(management)/reports/page.tsx` | `useState`, segment switching |
| `app/(management)/reports/_components/FeesSegment.tsx` | `useState`, monthOffset navigator, Recharts |
| `app/(management)/reports/_components/StudentsSegment.tsx` | `useState`, Recharts |
| `app/(management)/reports/_components/AttendanceSegment.tsx` | `useState`, Recharts |
| `app/(management)/communications/page.tsx` | `useState`, template selection |
| `app/(management)/settings/_components/AcademySection.tsx` | `useState`, form handling |
| `app/(management)/settings/_components/BranchesSection.tsx` | `useState`, form handling |
| `app/(management)/settings/_components/StaffSection.tsx` | `useState`, form handling |
| `app/(management)/settings/_components/PermissionsMatrix.tsx` | Read display — co-located with client siblings |
| `app/(management)/settings/_components/MembershipSection.tsx` | `useState`, optimistic state, server actions |
| `app/(management)/settings/_components/EventsSection.tsx` | `useState`, form handling |
| `components/layout/Sidebar.tsx` | `usePathname()`, sign-out handler |
| `components/layout/TopBar.tsx` | `useState` for branch switcher |
| `components/layout/LiveClock.tsx` | `useEffect` + `setInterval` |
| `components/enquiries/AddEnquiryModal.tsx` | `useState`, loading + error state, server action |
| `components/enquiries/EditEnquiryModal.tsx` | `useState`, status transition, server action |
| `components/students/AddStudentModal.tsx` | `useState`, two-tab form, server action |
| `components/students/EditStudentModal.tsx` | `useState`, form handling, server action |
| `components/students/ReEnrollModal.tsx` | `useState`, form handling, server action |
| `components/students/DropoutConfirmModal.tsx` | `useState`, form handling, server action |
| `components/students/CollectRemainingModal.tsx` | `useState`, form handling, server action |
| `components/coaching/RenewModal.tsx` | `useState`, form handling, server action |
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
| `toAppEnum` | `(v: string) → string` | Converts `due_soon → due-soon`, `not_scheduled → not-scheduled`, `session_topup → session-topup` |
| `toDbEnum` | `(v: string) → string` | Converts `due-soon → due_soon`, `not-scheduled → not_scheduled`, `session-topup → session_topup` |

### `src/lib/auth-context.ts`

| Export | Signature | Returns |
|---|---|---|
| `getServerSession` | `() → Promise<{ user, academyId, role }>` | Authenticated session + tenancy context. Redirects to `/login` if unauthenticated. Server-only. |

### `src/lib/queries/settings.ts`

| Export | Signature | Returns |
|---|---|---|
| `getMembershipTypes` | `() → Promise<MembershipType[]>` | Active membership types for authenticated academy, ordered by name |

### `src/lib/queries/students.ts`

| Export | Signature | Returns |
|---|---|---|
| `getStudents` | `() → Promise<Student[]>` | All students for authenticated academy (lightweight — no embedded payment history) |
| `getStudentById` | `(id: string) → Promise<Student>` | One student with full `paymentHistory[]` joined from `student_payments` |
| `getStudentsByBatch` | `(batchId: string) → Promise<Student[]>` | Active + due-soon students for a specific batch |

### `src/lib/queries/batches.ts`

| Export | Signature | Returns |
|---|---|---|
| `getBatches` | `() → Promise<Batch[]>` | All active batches for authenticated academy |
| `getBatchById` | `(id: string) → Promise<Batch>` | One batch by UUID |

### `src/lib/queries/attendance.ts`

| Export | Signature | Returns |
|---|---|---|
| `getAttendanceByBatch` | `(batchId: string) → Promise<AttendanceRecord[]>` | All attendance records for a batch, ordered by date DESC |
| `getAttendanceByStudent` | `(studentId: string, batchId: string) → Promise<AttendanceRecord[]>` | Attendance records for a student in a specific batch |

### `src/lib/queries/enquiries.ts`

| Export | Signature | Returns |
|---|---|---|
| `getEnquiries` | `() → Promise<Enquiry[]>` | All enquiries for authenticated academy, ordered by `created_at DESC` |

### `src/lib/mock-data.ts` — Mutable Data (Preserved for un-migrated consumers)

| Export | Type | Seed Count | Still used by |
|---|---|---|---|
| `mockStudents` | `let Student[]` | 12 | Dashboard, Reports, Transactions |
| `mockCourtMembers` | `let CourtMember[]` | 3 | Court Members, Transactions |
| `mockAttendance` | `let AttendanceRecord[]` | ~14 | Reports |
| `mockExpenses` | `let AccountEntry[]` | 6 | Accounts |
| `mockIncomeEntries` | `let AccountEntry[]` | 4 | Accounts |
| `mockInventory` | `let InventoryItem[]` | 6 | Inventory |
| `mockSettings` | `let Settings` | 1 | Dashboard, various |
| `mockBatches` | `let Batch[]` | 2 | Dashboard, Reports |
| `mockMessageLogs` | `let MessageLog[]` | 6 | Communications |

### `src/lib/mock-data.ts` — Constants (Stable)

| Export | Type | Count |
|---|---|---|
| `EXPENSE_CATEGORIES` | `string[]` | 9 |
| `INCOME_CATEGORIES` | `string[]` | 9 |
| `BUILTIN_INVENTORY_CATEGORIES` | `string[]` | 4 |
| `UNIT_PRESETS` | `string[]` | 6 |
| `PERMISSION_MATRIX` | `ModulePermission[]` | 12 rows (Enquiries added) |

### `src/lib/mock-data.ts` — Types

| Type | Key Fields |
|---|---|
| `Student` | id, name, phone, alternatePhone, guardianName, membershipTypeId, currentBatch, fees, startDate, membershipStartDate, nextDueDate, status, dateOfBirth, **address?, email?**, enrollmentSource?, dropoutReason?, dropoutDate?, pendingAmount, internalNotes, paymentHistory |
| `PaymentEntry` | id, date, amount, remainingAmount, paymentType, monthsCovered, paymentMethod, status, note |
| `MembershipType` | id, name, durationType, duration, price |
| `Batch` | id, name, branchId, days, fees?, description? |
| `AttendanceRecord` | id, batchId, date, records (map) |
| `Enquiry` | id, name, phone, guardianName, notes?, status, trialDate?, createdAt, **updatedAt?** |
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
| `createClient` | `() → SupabaseClient<Database>` | Strongly typed server client — uses Next.js `cookies()`; use in middleware, server components, and all queries/actions |

### `src/lib/supabase/database.types.ts`

Auto-generated Supabase types. Now consumed by `server.ts` (`createServerClient<Database>`). App code still uses hand-written types from `mock-data.ts` for non-migrated features.

---

## 15. Data Source Per Feature (Migration Tracker)

`lib/queries/` imports and `actions.ts` files are the migration signal. When all mock imports are removed from a feature, it is fully migrated.

| Feature | Route | Data Source | Mock imports remaining |
|---|---|---|---|
| **Authentication** | `/login` | ✅ **Supabase Auth** | None |
| **Membership Types** | `/settings` (MembershipSection) | ✅ **Supabase** | `mockSettings.membershipTypes` preserved — used by other mock consumers |
| **Students (coaching)** | `/students` | ✅ **Supabase** | `mockStudents` preserved — used by Dashboard, Reports, Transactions |
| **Student profile** | `/students/[id]` | ✅ **Supabase** | `mockAttendance` replaced by Supabase fetch |
| **Batches** | `/batches` | ✅ **Supabase** | `mockBatches` preserved — used by Dashboard, Reports |
| **Batch detail + Attendance** | `/batches/[id]` | ✅ **Supabase** | None |
| **Enquiries** | `/enquiries` | ✅ **Supabase** | `mockEnquiries` preserved in mock-data.ts but not imported by page |
| Dashboard | `/dashboard` | ⚠ Mock | `mockStudents`, `mockSettings`, `mockAttendance`, `mockBatches` |
| Court members | `/students` (court tab) | ⚠ Mock | `mockCourtMembers`, `mockSettings` |
| Court member profile | `/court-members/[id]` | ⚠ Mock | `mockCourtMembers`, `mockSettings` |
| Fee transactions | `/transactions` | ⚠ Mock | `mockStudents`, `mockCourtMembers`, `mockSettings` |
| Accounts | `/accounts` | ⚠ Mock | `mockExpenses`, `mockIncomeEntries` |
| Inventory | `/inventory` | ⚠ Mock | `mockInventory` |
| Reports | `/reports` | ⚠ Mock | `mockStudents`, `mockAttendance`, `mockBatches`, `mockSettings` |
| Communications | `/communications` | ⚠ Mock + Stub | `mockMessageLogs`, `mockSettings`, `mockStudents` + `/api/whatsapp/send` stub |
| Settings (other sections) | `/settings` | ⚠ Mock | `mockSettings`, `mockBranches` |

**Migration status: 7 of 15 features on Supabase (Auth + 6 data features).**

---

## 16. Database Snapshot

Full schema in `badmintonw_schema.sql`. Connected to Supabase for migrated features.

### Tables

| Table | Key Columns | Notes |
|---|---|---|
| `academies` | `id, name, phone, address, timezone, court_membership_enabled, multi_branch_enabled, …` | Feature toggles live here |
| `branches` | `id, academy_id, name, address, is_active, is_primary` | Unique per academy |
| `staff_members` | `id, academy_id, user_id, name, email, role, branch_id, status` | Unique `(user_id)` on active rows; linked to `auth.users` |
| `membership_types` | `id, academy_id, name, duration_type, duration, price, is_active` | Soft-delete via `is_active = false` |
| `batches` | `id, academy_id, branch_id, name, description, days[], fees, is_active` | Unique per branch (or per academy when no branch) |
| `students` | `id, academy_id, name, phone, membership_type_id, batch_id, fees, start_date, membership_start_date, next_due_date, status, date_of_birth, dropout_reason, dropout_date, pending_amount, internal_notes` | `start_date` immutable (trigger). Status auto-derived (trigger). Soft-delete only. |
| `student_payments` | `id, student_id, academy_id, date, amount, remaining_amount, payment_type, months_covered, payment_method, status, note` | `pending_amount` on students kept in sync by trigger |
| `attendance_records` | `id, batch_id, academy_id, date, records` | JSONB `{ studentId → 'present' \| 'absent' }`. Upsert on `(batch_id, date)`. |
| `account_entries` | `id, academy_id, date, entry_type, category, description, amount, payment_method, notes` | `entry_type: 'expense' \| 'income'` |
| `inventory_items` | `id, academy_id, sku, name, category, description, unit, quantity, price, selling_price, icon` | — |
| `court_plans` | `id, academy_id, name, plan_type, price, duration_months?, total_sessions?, validity_days?, is_active` | — |
| `court_memberships` | `id, academy_id, contact_name, contact_phone, people_count, plan_id, plan_type, start_date, end_date, total_sessions?, remaining_sessions?, status, amount_paid, pending_amount, address?, email?` | `joining_date` renamed to `start_date` in schema; `end_date` added |
| `court_membership_people` | `id, membership_id, academy_id, name` | Row count enforced by trigger vs `people_count` |
| `court_payment_entries` | `id, membership_id, academy_id, date, amount, payment_method, entry_type, status, sessions_added?, paying_now?, partial_due?` | `paying_now` and `partial_due` columns added for partial payment support |
| `court_check_ins` | `id, membership_id, academy_id, checked_in_at, sessions_after?, people_checked_in` | Immutable. 5-second undo = DELETE last row. |
| `enquiries` | `id, academy_id, name, phone, guardian_name, notes, status, trial_date` | `trial_date` NULL/NOT NULL enforced by DB constraint per status |
| `events` | `id, academy_id, name, event_type, date, description` | — |
| `message_logs` | `id, academy_id, template_id, sent_at, recipient_count, status, trigger_type` | Append-only |

### Key DB Invariants

| Trigger | Table | What it does |
|---|---|---|
| `tr_students_compute_status` | `students` | BEFORE INSERT/UPDATE on `next_due_date` — auto-derives `active/due-soon/expired` in IST |
| `tr_students_immutable_start_date` | `students` | BEFORE UPDATE on `start_date` — raises exception if changed |
| `tr_sync_pending_amount_after_payment` | `student_payments` | AFTER INSERT/UPDATE/DELETE — recomputes `students.pending_amount` from `remaining_amount` sum. SECURITY DEFINER. |
| `tr_payments_immutable_student_id` | `student_payments` | BEFORE UPDATE on `student_id` — raises exception if changed |
| `tr_attendance_validate_records` | `attendance_records` | BEFORE INSERT/UPDATE on `records` — validates UUID keys and present/absent values |
| `tr_court_people_enforce_count` | `court_membership_people` | BEFORE INSERT — enforces `people_count` cap |
| Cross-academy FK triggers | Various | BEFORE INSERT/UPDATE — validates that FK references belong to the same `academy_id` |

### Enum Mapping Reference

| App value | DB value | Table / column |
|---|---|---|
| `due-soon` (student) | `due-soon` ← same | `students.status` — hyphen IS the DB label |
| `due-soon` (court) | `due_soon` | `court_memberships.status` — use `toDbEnum()` |
| `sessions-low` | `sessions_low` | `court_memberships.status` — use `toDbEnum()` |
| `session-topup` | `session_topup` | `court_payment_entries.entry_type` — use `toDbEnum()` |
| `not-scheduled` | `not_scheduled` | `enquiries.status` — use `toDbEnum()` |

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

| Variable | Used In | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase anonymous (public) key |
| `WHATSAPP_API_KEY` | `app/api/whatsapp/send/route.ts` | Meta WhatsApp Cloud API key (stub — not active) |
| `WHATSAPP_PHONE_NUMBER_ID` | `app/api/whatsapp/send/route.ts` | WhatsApp sender phone number ID (stub — not active) |

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
| Students | 12 (mock) | All statuses: active, due-soon, expired, inactive, dropout |
| Court Members | 3 (mock) | active (monthly), sessions-low, exhausted |
| Batches | 2 (mock) + live DB rows | Morning (6d/week ₹1,500), Evening (4d/week ₹1,500) |
| Branches | 2 (mockBranches) + 3 (settings.branches) | Main Center, Kondapur, Indiranagar, Whitefield, Koramangala |
| Staff | 3–4 (mock) | Owner, Coach, Accountant/Manager |
| Membership Types | 3 (mock + DB) | Monthly ₹1,500, Quarterly ₹4,000, Annual ₹14,000 |
| Court Plans | 3 (mock) | Monthly Unlimited ₹3,000, Session Pack 10 ₹1,500, Session Pack 20 ₹2,500 |
| Expenses | 6 (mock) | Shuttlecocks, utilities, court rent, equipment, coaching staff |
| Income Entries | 4 (mock) | Shuttle sales, restringing, equipment sales |
| Inventory Items | 6 (mock) | Yonex shuttles, racquets, shoes, grip tape, T-shirts |
| Attendance Records | live DB rows | Fetched from Supabase for migrated routes |
| Enquiries | live DB rows | Fetched from Supabase |
| Events | 3 (mock) | Tournament, sports meet, maintenance day |
| Message Logs | 6 (mock) | Historical WhatsApp send records |
