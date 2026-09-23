Here's the corrected, complete, agent-ready prompt — all four fixes are applied inline. Hand this directly to the agent as the single source of truth.

---

## Agent Prompt — EzyFee Settings UI: Multi-Tenant & RBAC Implementation

---

### Project Context

**Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, Supabase (auth only for now — all data stays in mock arrays)

**Design tokens** (already defined in `globals.css`, use exclusively):
`so-accent` (#3B6BE8) · `so-text` (#0F1729) · `so-muted` (#64748B) · `so-card` (#FFFFFF) · `so-surface` (#EEF1F8) · `so-border` (#DDE3EE) · `so-nav` (#232E44) · `so-emerald` (#059669) · `so-red` (#DC2626) · `so-yellow` (#D97706)

**Icons:** `lucide-react` only — no other icon libraries

**Phase:** UI only. Zero Supabase calls. All state lives in `mock-data.ts` and local component `useState`. Supabase wiring happens in a later phase.

**Existing settings page location:** `src/app/(management)/settings/page.tsx`
**Mock data location:** `src/lib/mock-data.ts`

---

### Task 1 — Update `src/lib/mock-data.ts`

Add the following types and seed data. Do not remove or modify any existing types or arrays.

**Update the existing `Batch` type** — add `branchId`:

```typescript
// MODIFY the existing Batch interface — add branchId field
export interface Batch {
  id: string
  name: string
  branchId: string        // ← ADD THIS — links batch to its branch
  days: string[]
  fees?: number
  description?: string
}
```

Update the existing `mockBatches` seed entries to include `branchId: 'branch-1'` on both Morning and Evening batches.

**Add the following new types:**

```typescript
// ── Role & Permission Types ──────────────────────────────────────────
export type StaffRole = 'owner' | 'manager' | 'coach' | 'accountant' | 'receptionist'
export type StaffStatus = 'active' | 'invited' | 'suspended'
export type AccessLevel = 'full' | 'view' | 'collect' | 'mark' | 'partial' | 'none'

// ── Branch Type ──────────────────────────────────────────────────────
export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  isActive: boolean
  isPrimary: boolean      // primary branch cannot be deactivated
  createdAt: string
}

// ── Staff Member Type ────────────────────────────────────────────────
export interface StaffMember {
  id: string
  name: string
  email: string
  role: StaffRole
  branchIds: string[]     // ['all'] means all branches (owner only)
  status: StaffStatus
  invitedAt: string
  avatarInitials: string
}

// ── Permission Matrix Type ───────────────────────────────────────────
export interface ModulePermission {
  module: string
  owner: AccessLevel
  manager: AccessLevel
  coach: AccessLevel
  accountant: AccessLevel
  receptionist: AccessLevel
}
```

**Add seed data:**

```typescript
export let mockBranches: Branch[] = [
  {
    id: 'branch-1',
    name: 'Main Center',
    address: 'Gachibowli, Hyderabad',
    phone: '9876500001',
    isActive: true,
    isPrimary: true,
    createdAt: '2024-01-15',
  },
  {
    id: 'branch-2',
    name: 'Kondapur Center',
    address: 'Kondapur, Hyderabad',
    phone: '9876500002',
    isActive: true,
    isPrimary: false,
    createdAt: '2024-06-01',
  },
]

export let mockStaffMembers: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Ravi Kumar',
    email: 'ravi@probadminton.in',
    role: 'owner',
    branchIds: ['all'],
    status: 'active',
    invitedAt: '2024-01-15',
    avatarInitials: 'RK',
  },
  {
    id: 'staff-2',
    name: 'Anita Sharma',
    email: 'anita@probadminton.in',
    role: 'coach',
    branchIds: ['branch-1'],
    status: 'active',
    invitedAt: '2024-03-10',
    avatarInitials: 'AS',
  },
  {
    id: 'staff-3',
    name: 'Deepak Nair',
    email: 'deepak@probadminton.in',
    role: 'accountant',
    branchIds: ['branch-1', 'branch-2'],
    status: 'invited',
    invitedAt: '2026-09-15',
    avatarInitials: 'DN',
  },
]

export const PERMISSION_MATRIX: ModulePermission[] = [
  { module: 'Dashboard',        owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'view',    receptionist: 'view'    },
  { module: 'Students',         owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'view',    receptionist: 'partial' },
  { module: 'Batches',          owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Attendance',       owner: 'full',    manager: 'full',    coach: 'mark',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Fee Transactions', owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'full',    receptionist: 'collect' },
  { module: 'Accounts',         owner: 'full',    manager: 'view',    coach: 'none',    accountant: 'full',    receptionist: 'none'    },
  { module: 'Inventory',        owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'view',    receptionist: 'none'    },
  { module: 'Court Members',    owner: 'full',    manager: 'full',    coach: 'none',    accountant: 'view',    receptionist: 'collect' },
  { module: 'Events',           owner: 'full',    manager: 'full',    coach: 'view',    accountant: 'none',    receptionist: 'view'    },
  { module: 'Settings',         owner: 'full',    manager: 'partial', coach: 'none',    accountant: 'none',    receptionist: 'none'    },
  { module: 'Staff Management', owner: 'full',    manager: 'view',    coach: 'none',    accountant: 'none',    receptionist: 'none'    },
]
```

---

### Task 2 — File Structure Refactor

Create the following directory and files. Do not put all code in one file.

```
src/app/(management)/settings/
  page.tsx
  _components/
    AcademySection.tsx
    BranchesSection.tsx
    StaffSection.tsx
    PermissionsMatrix.tsx
    MembershipSection.tsx
    EventsSection.tsx
```

`settings/page.tsx` should only contain:

```tsx
'use client'
import AcademySection from './_components/AcademySection'
import BranchesSection from './_components/BranchesSection'
import StaffSection from './_components/StaffSection'
import PermissionsMatrix from './_components/PermissionsMatrix'
import MembershipSection from './_components/MembershipSection'
import EventsSection from './_components/EventsSection'

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-so-text">Settings</h1>
        <p className="text-so-muted text-sm mt-1">Manage your academy, branches, staff and configuration</p>
      </div>
      <AcademySection />
      <BranchesSection />
      <StaffSection />
      <PermissionsMatrix />
      <MembershipSection />
      <EventsSection />
    </div>
  )
}
```

---

### Task 3 — AcademySection.tsx

**What it does:** Editable academy-level profile plus the court membership feature toggle.

**Fields (editable via pencil icon top-right):**
- Academy Name (text input, pre-filled from `mockSettings.courtName`)
- Contact Phone (text input)
- Address (textarea, 2 rows)
- Timezone (read-only display: "Asia/Kolkata (IST)" — informational only, not editable)
- Logo (grey placeholder box with `Camera` icon and "Upload logo" text — no functionality, UI placeholder only)

**Features block (below the profile fields, always visible — not part of edit mode):**

A clearly separated sub-section labelled "Features" inside the same card. Contains a single toggle row:

```
Court Membership    Enable the court module for session and monthly access plans
[toggle switch bound to mockSettings.courtMembershipEnabled]
```

When toggled ON: update `mockSettings.courtMembershipEnabled = true` and call `forceUpdate`. When toggled OFF: set to `false` and call `forceUpdate`. This replaces the court membership toggle that previously lived at the top of the old settings page — it must not appear anywhere else.

**Behaviour:** Edit mode toggled by pencil icon top-right (profile fields only — Features block is always interactive). On Save, update `mockSettings.courtName` in place and show green "Saved" toast for 2 seconds. On Cancel, revert to original values.

**Section header style** (use this exact pattern for every section):

```tsx
<div className="flex items-center gap-3 mb-5">
  <div className="w-8 h-8 rounded-lg bg-so-accent/10 flex items-center justify-center">
    <Building2 className="w-4 h-4 text-so-accent" />
  </div>
  <div>
    <h2 className="text-base font-semibold text-so-text">Academy & Branding</h2>
    <p className="text-xs text-so-muted">Tenant-level profile visible across all branches</p>
  </div>
</div>
```

---

### Task 4 — BranchesSection.tsx

**What it does:** Lists all branches from `mockBranches`. Owner can add, edit inline, toggle active/inactive.

**Branch card layout:**
- Left: Branch name (bold) + address + phone
- Right: "Primary" badge (`bg-so-accent/10 text-so-accent`) if `isPrimary`, Active/Inactive toggle switch, Edit button (pencil icon)
- Primary branch toggle is disabled — show tooltip "Primary branch cannot be deactivated"
- Inactive branches render at reduced opacity (0.5) with a grey "Inactive" badge

**Add Branch:** Inline form below the list (not modal) — fields: Branch Name, Address, Phone. Save Branch (`so-accent`) + Cancel. On save, push to `mockBranches` with a generated id and `isActive: true`, call `forceUpdate`.

**Edit:** Clicking the pencil converts that card into an inline form pre-filled with existing values. Save updates `mockBranches` in place.

**Deactivation guard — derive from real data, do not hardcode:**

```typescript
// When the owner tries to toggle a branch inactive, run this check first:
const assignedStudents = mockStudents.filter(s =>
  mockBatches.find(b => b.name === s.currentBatch && b.branchId === branch.id)
)

if (assignedStudents.length > 0) {
  // Block the toggle and show inline warning inside the card:
  // "{N} students are assigned to batches in this branch.
  //  Reassign them before deactivating."
  // Do NOT complete the toggle.
}
```

If no students are assigned, toggle proceeds and updates `branch.isActive` in `mockBranches`.

---

### Task 5 — StaffSection.tsx

**What it does:** Staff roster table + invite flow.

**Invite Staff button** top-right. Clicking opens an inline panel below the section header (not a modal) with:
- Full Name (text input)
- Email (email input)
- Role selector — pill buttons, one active at a time: `[ Owner ] [ Manager ] [ Coach ] [ Accountant ] [ Receptionist ]`
- Branch Assignment — checkboxes from `mockBranches`. For Owner role, auto-check all and disable with label "All branches (automatic)"
- Send Invitation (`so-accent`) + Cancel

On submit: push to `mockStaffMembers` with `status: 'invited'` and `invitedAt` = today. Show inline green toast "Invitation sent to {email}". No Supabase calls.

**Staff roster table columns:** Staff Member | Role | Branches | Status | Actions

- **Staff Member cell:** Avatar circle (initials, `bg-so-surface`) + name bold + email muted below
- **Role badge colours:**
  - Owner → `bg-purple-100 text-purple-700`
  - Manager → `bg-blue-100 text-blue-700`
  - Coach → `bg-emerald-100 text-emerald-700`
  - Accountant → `bg-yellow-100 text-yellow-700`
  - Receptionist → `bg-gray-100 text-gray-700`
- **Branches cell:** Branch names as small grey chips. `branchIds === ['all']` → single "All branches" chip in `bg-so-accent/10 text-so-accent`
- **Status badge:**
  - Active → green dot + "Active"
  - Invited → yellow dot + "Invited · {N days ago}" (calculated from `invitedAt`)
  - Suspended → red dot + "Suspended"
- **Actions — three-dot dropdown per row:**
  - Edit Branch Access (opens inline branch reassignment below the row)
  - Suspend / Reactivate (toggles between `'active'` and `'suspended'`)
  - Revoke Access — inline confirm "Remove {name}? This cannot be undone." → Yes/No → removes from `mockStaffMembers`
  - Owner row: all three actions disabled — show `Lock` icon with tooltip "Cannot modify owner"

---

### Task 6 — PermissionsMatrix.tsx

**What it does:** Read-only reference table showing access levels per role per module.

**Table structure:** Header row — Module | Owner | Manager | Coach | Accountant | Receptionist. One row per entry in `PERMISSION_MATRIX`.

**Access level chips:**

```tsx
const ACCESS_CHIP: Record<AccessLevel, { label: string; className: string }> = {
  full:    { label: 'Full',    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  view:    { label: 'View',    className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  partial: { label: 'Partial', className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  collect: { label: 'Collect', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  mark:    { label: 'Mark',    className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  none:    { label: '—',       className: 'text-so-muted' },
}
```

**Info banner above the table:**

```
"This matrix shows the default access levels per role. 
 Custom per-member overrides can be set from the three-dot menu on each staff member."
```

Do not write "Owners can adjust specific toggles from the staff management panel" — that panel does not exist yet.

Table is fully read-only. No cell interactions. Render inside `overflow-x-auto` container.

---

### Task 7 — MembershipSection.tsx and EventsSection.tsx

Move all existing membership types CRUD code from the current `settings/page.tsx` into `MembershipSection.tsx` and all events CRUD code into `EventsSection.tsx`. No logic changes — pure extraction. Both components manage their own `forceUpdate` state internally.

The court membership toggle must NOT be duplicated here — it now lives exclusively in `AcademySection.tsx`.

---

### Task 8 — TopBar: Branch Name Display Only (No Switcher)

**Target:** `src/components/layout/TopBar.tsx`

Add the current active branch name as **plain read-only text** to the left of `LiveClock`. No dropdown, no interaction, no state.

```tsx
// Read the primary branch name from mockBranches
const primaryBranch = mockBranches.find(b => b.isPrimary)

// Render left of LiveClock:
<span className="text-sm text-so-muted border border-so-border bg-so-surface rounded-full px-3 py-1">
  {primaryBranch?.name ?? 'Main Center'}
</span>
{/* Branch switcher — functional after Supabase + context wiring */}
```

Do not add a dropdown or `ChevronDown` icon. Do not add any `onClick` handler. The switcher UI will be added in a later phase once pages filter by `branchId`.

---

### Constraints

- `'use client'` on every component file
- `lucide-react` for all icons — no emoji in UI
- Only `so-*` design tokens — no hardcoded hex values except inside the `ACCESS_CHIP` className strings above
- `forceUpdate` pattern (`const [, forceUpdate] = useState(0)`) wherever mock arrays are mutated
- No Supabase imports anywhere in this phase
- No `react-hook-form` or external form libraries — plain controlled inputs only
- Inline confirmation patterns use the existing `confirmId` state pattern — no `window.confirm()`
- Toasts: component-level `useState` + `setTimeout(2500)` — no external toast library
- Every section card: `bg-so-card border border-so-border rounded-2xl p-6`
- All section headers follow the icon + title + subtitle pattern 