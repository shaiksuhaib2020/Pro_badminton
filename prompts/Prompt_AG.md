
## Architecture Decisions

**Gate everything behind a boolean.** `mockSettings.courtMembershipEnabled` is the single switch. When false, Students page and Transactions page look and behave exactly as today. No conditional spaghetti across the app — the gate lives only in those two pages and Settings.

**Two plan types, owner-configured.** `CourtPlan` has a `planType` field — `'monthly'` or `'sessions'`. Owner creates plans in Settings. Members are assigned a plan from that list. No hardcoded plan names anywhere.

**Status logic per plan type:**
- Monthly → `active` (due > 7 days) / `due-soon` (≤7 days) / `expired` (past due)
- Sessions → `active` (remaining > 20% of total) / `sessions-low` (≤2 remaining) / `exhausted` (0 remaining)
- Manual overrides → `on-hold` / `off-court` (set via action menu)

**Court transactions** derive from `CourtMember.paymentHistory` exactly like coaching derives from `Student.paymentHistory`. Same tab structure (Recent/Paid/Pending/Partial), different data source. No new page.

---

## Turn AG — Agent Prompt: Court Membership Module

**Files to read first:** `src/lib/mock-data.ts`, `src/app/(management)/students/page.tsx`, `src/app/(management)/transactions/page.tsx`, `src/app/(management)/settings/page.tsx`, `src/components/layout/Sidebar.tsx`

---

## Step 1 — `src/lib/mock-data.ts`

### New types to add

```ts
export type CourtPlan = {
  id: string
  name: string
  planType: 'monthly' | 'sessions'
  price: number
  // Monthly-specific
  durationMonths?: number         // how many months the plan covers
  // Sessions-specific
  totalSessions?: number          // sessions in this pack
  validityDays?: number           // days before unused sessions expire
}

export type CourtPaymentEntry = {
  id: string
  date: string
  amount: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'other'
  entryType: 'new' | 'renewal' | 'session-topup'
  status: 'active' | 'deleted'
  note?: string
}

export type CourtMember = {
  id: string
  name: string
  phone: string
  planId: string
  planType: 'monthly' | 'sessions'
  joiningDate: string
  // Monthly
  membershipStartDate?: string
  nextDueDate?: string
  // Sessions
  totalSessions?: number
  remainingSessions?: number
  // Shared
  status: 'active' | 'due-soon' | 'expired' | 'sessions-low' | 'exhausted' | 'on-hold' | 'off-court'
  amountPaid: number
  notes?: string
  paymentHistory: CourtPaymentEntry[]
}
```

### Extend `mockSettings`

Add two fields to the `mockSettings` object:
```ts
courtMembershipEnabled: false,
courtPlans: [] as CourtPlan[],
```

### Add mock data export

```ts
export let mockCourtPlans: CourtPlan[] = [
  {
    id: 'cp-1',
    name: 'Monthly Unlimited',
    planType: 'monthly',
    price: 3000,
    durationMonths: 1,
  },
  {
    id: 'cp-2',
    name: 'Session Pack — 10',
    planType: 'sessions',
    price: 1500,
    totalSessions: 10,
    validityDays: 60,
  },
  {
    id: 'cp-3',
    name: 'Session Pack — 20',
    planType: 'sessions',
    price: 2500,
    totalSessions: 20,
    validityDays: 90,
  },
]

export let mockCourtMembers: CourtMember[] = [
  {
    id: 'cm-1',
    name: 'Rohit Kumar',
    phone: '9876500001',
    planId: 'cp-1',
    planType: 'monthly',
    joiningDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    membershipStartDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    nextDueDate: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    status: 'active',
    amountPaid: 3000,
    paymentHistory: [
      {
        id: 'cpe-1', date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        amount: 3000, paymentMethod: 'upi', entryType: 'new', status: 'active',
      },
    ],
  },
  {
    id: 'cm-2',
    name: 'Deepa Reddy',
    phone: '9876500002',
    planId: 'cp-2',
    planType: 'sessions',
    joiningDate: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
    totalSessions: 10,
    remainingSessions: 2,
    status: 'sessions-low',
    amountPaid: 1500,
    paymentHistory: [
      {
        id: 'cpe-2', date: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
        amount: 1500, paymentMethod: 'cash', entryType: 'new', status: 'active',
      },
    ],
  },
  {
    id: 'cm-3',
    name: 'Kavya Singh',
    phone: '9876500003',
    planId: 'cp-3',
    planType: 'sessions',
    joiningDate: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
    totalSessions: 20,
    remainingSessions: 0,
    status: 'exhausted',
    amountPaid: 2500,
    paymentHistory: [
      {
        id: 'cpe-3', date: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
        amount: 2500, paymentMethod: 'cash', entryType: 'new', status: 'active',
      },
    ],
  },
]
```

---

## Step 2 — Sidebar

**File: `src/components/layout/Sidebar.tsx`**

Change the label for the Students nav item from `'Students'` to `'Members'`. The href `/students` stays unchanged. No other changes.

---

## Step 3 — Settings page

**File: `src/app/(management)/settings/page.tsx`**

### Add Court Membership section (new section 0 — place above all others)

#### 3a — Enable/disable toggle

Render a card with heading "Court Membership". Inside: a single toggle row.

Label: "Enable Court Membership"
Description below: "Adds a Court section to Members page and Fee Transactions for managing court access plans."

Toggle is a styled checkbox or switch button. Clicking calls:
```ts
mockSettings.courtMembershipEnabled = !mockSettings.courtMembershipEnabled
refresh()
```

When disabled, hide the Court Plans section below. When enabled, show it.

#### 3b — Court Plans management (only visible when enabled)

Heading: "Court Plans". Sub-label: "Define the plans owners can assign to court members."

**Plan list:** Show each plan in `mockCourtPlans` as a row with:
- Plan name + type pill (Monthly / Sessions)
- Price
- Duration or session count
- Delete button (inline Yes/No confirm). No deletion guard needed (court members not yet DB-wired).

**Add Plan form** (inline, below the list — same pattern as Add Batch in old Settings):

Fields:
- Plan Name (text, required)
- Plan Type (two pill buttons: Monthly / Sessions). Selecting one shows/hides relevant fields below.
- Price ₹ (number, required)
- If Monthly: Duration in Months (number, default 1)
- If Sessions: Total Sessions (number), Validity in Days (optional, number — "how many days before unused sessions expire")

On Add: validate name not empty, price > 0, push to `mockCourtPlans`, refresh.

---

## Step 4 — Members (Students) page

**File: `src/app/(management)/students/page.tsx`**

### 4a — Top-level segment control (only when court enabled)

At the very top of the page content (above search/tabs), check `mockSettings.courtMembershipEnabled`. If false: render nothing new — page looks and behaves exactly as today.

If true: render a segmented control (`Coaching | Court`) — same visual style as the Inventory/Accounts segmented control.

State: `const [memberSegment, setMemberSegment] = useState<'coaching' | 'court'>('coaching')`

When `memberSegment === 'coaching'`: render the entire existing coaching UI (Active/Off-Court tabs, search, batch filter, all existing modals). Zero changes to this path.

When `memberSegment === 'court'`: render the Court Members UI described below.

### 4b — Court Members UI

**Header row:** "Add Member" button (top right, accent color).

**4 summary stat cards** (full-width row, 4 equal columns):
- Total members (`mockCourtMembers.length`)
- Active (`status === 'active'` count) — emerald
- Due / Low (`status === 'due-soon' || 'sessions-low'` count) — amber
- Expired / Done (`status === 'expired' || 'exhausted'` count) — red

**Filter pills** below stats: All · Monthly Plans · Session Packs

State: `const [courtFilter, setCourtFilter] = useState<'all' | 'monthly' | 'sessions'>('all')`

Derived display list:
```ts
const displayedCourtMembers = mockCourtMembers.filter(m => {
  if (courtFilter === 'monthly') return m.planType === 'monthly'
  if (courtFilter === 'sessions') return m.planType === 'sessions'
  return true
})
```

**Table columns:** Member (avatar initials + name + phone + plan type pill) | Plan | Validity | Status | Action

**Validity cell logic:**
- Monthly → show `nextDueDate` formatted. Color red if expired, amber if due-soon, muted if active.
- Sessions → show `remainingSessions / totalSessions` text + a small progress bar (3px height, colored by session count — blue if healthy, amber if low, red if 0).

**Status badge:** Map status to colored badge (same light-bg pattern used across the app):
- `active` → emerald
- `due-soon` → amber
- `sessions-low` → amber
- `expired` → red
- `exhausted` → red
- `on-hold` → blue/muted
- `off-court` → gray

**Action column:**
- Monthly `active` or `due-soon`: "Collect" button → opens payment collection modal (simple: amount pre-filled from plan price, method selector, on confirm push entry, extend nextDueDate by plan.durationMonths)
- Monthly `expired`: "Renew" button → same modal but re-activates status
- Sessions `active` or `sessions-low` (remainingSessions > 0): "Check In" button → inline confirm "Log 1 session?" Yes/No. On Yes: decrement `remainingSessions`, update status, refresh.
- Sessions `exhausted`: "Buy Sessions" button → opens buy-sessions modal (select plan from `mockCourtPlans` filtered to sessions type, pay, reset sessions count)
- `on-hold` or `off-court`: "Reactivate" button → sets status back to `active`

**Status management dropdown** (separate from action button): Three-dot or "Move to ▾" dropdown on each active/on-hold member:
- Move to On Hold (only if active)
- Move to Off Court
- Reactivate (only if on-hold or off-court)

Use an inline state `openActionMenuId: string | null` — clicking opens a small absolute-positioned menu. Clicking outside or selecting closes it.

**Three tabs for court members:** Active | On Hold | Off Court

These filter by status group:
- Active tab: `active`, `due-soon`, `sessions-low`, `expired`, `exhausted`
- On Hold tab: `on-hold`
- Off Court tab: `off-court`

Combine the filter pills + tab — tab first (Active/On Hold/Off Court), then filter pills (All/Monthly/Sessions) within the active tab only.

---

## Step 5 — Add Member Modal

**Create: `src/components/court/AddMemberModal.tsx`**

Centered modal, `max-w-md`.

Fields:
- Member Name (text, required)
- Phone (text, required)
- Plan (dropdown from `mockCourtPlans` — show name + type + price)
- Joining Date (date, defaults to today, `max={today}`)
- Amount Paid (number, auto-filled from plan.price, editable)
- Payment Method (Cash / UPI / Card / Other pills)
- Notes (optional textarea, small)

On selecting a plan:
- Auto-fill Amount Paid from `plan.price`
- Show plan details below dropdown (type, sessions or duration, price)

On confirm:
```ts
// Build CourtMember object
const newMember: CourtMember = {
  id: crypto.randomUUID(),
  name, phone, planId: selectedPlan.id, planType: selectedPlan.planType,
  joiningDate,
  // Monthly
  ...(selectedPlan.planType === 'monthly' && {
    membershipStartDate: joiningDate,
    nextDueDate: format(addMonths(parseISO(joiningDate), selectedPlan.durationMonths ?? 1), 'yyyy-MM-dd'),
    status: 'active',
  }),
  // Sessions
  ...(selectedPlan.planType === 'sessions' && {
    totalSessions: selectedPlan.totalSessions,
    remainingSessions: selectedPlan.totalSessions,
    status: 'active',
  }),
  amountPaid: Number(amountPaid),
  notes: notes.trim() || undefined,
  paymentHistory: [{
    id: crypto.randomUUID(),
    date: joiningDate,
    amount: Number(amountPaid),
    paymentMethod,
    entryType: 'new',
    status: 'active',
  }],
}
mockCourtMembers.push(newMember)
onClose()
```

---

## Step 6 — Fee Transactions page

**File: `src/app/(management)/transactions/page.tsx`**

### 6a — Segment control (only when court enabled)

Same gate: check `mockSettings.courtMembershipEnabled`. If false — page unchanged.

If true: add segmented control `Coaching | Court` at the top. State: `const [txSegment, setTxSegment] = useState<'coaching' | 'court'>('coaching')`

When `txSegment === 'coaching'`: render entire existing transaction UI unchanged.

When `txSegment === 'court'`: render Court Transactions UI.

### 6b — Court Transactions UI

Reuse the same 4 tab structure: Recent | Paid | Pending | Partially Paid.

Same filter panel (Current Month / Last Month / Custom) — same `filterRange` state but scoped to court segment. Use separate state variables (`courtFilterRange`, `courtCustomFrom`, `courtCustomTo`) to avoid contaminating coaching filter state.

**Data derivation — all from `mockCourtMembers`:**

Recent: All `CourtPaymentEntry` records across all court members (status !== 'deleted'), filtered by date range, sorted newest first. Show: Member name | Phone | Date | Amount | Method | Status

Paid: All active payment entries in range. Show same columns + Delete (soft-delete sets status='deleted').

Pending: Court members where status is `expired` or `due-soon` (monthly) or `exhausted` or `sessions-low` (sessions). Show: Member | Phone | Plan | Amount Due | Action (Collect/Renew/Buy Sessions).

Partially Paid: Court members where `amountPaid < plan.price` on their current period. For simplicity in mock-data phase, skip this tab's data derivation — show an empty state with note "Partial payment tracking coming soon."

---

## Verification checklist

1. `mockSettings.courtMembershipEnabled = false` by default — both pages look identical to today on first load
2. Toggling in Settings immediately shows/hides court segment on Members and Transactions pages
3. Sidebar shows "Members" not "Students"
4. `memberSegment === 'coaching'` path renders existing coaching UI with zero changes
5. `txSegment === 'coaching'` path renders existing transaction UI with zero changes
6. Court filter state (`courtFilterRange` etc.) is separate from coaching filter state — switching segment doesn't reset the other segment's filter
7. Check In on sessions member: decrements `remainingSessions`, updates status (`exhausted` if 0, `sessions-low` if ≤2), refreshes
8. Add Member: monthly member gets computed `nextDueDate` from `joiningDate + durationMonths`
9. Add Member: session member gets `remainingSessions = totalSessions` on creation
10. Court Plans in Settings: plan type pill toggle shows/hides Monthly vs Sessions fields correctly
11. `mockCourtPlans` and `mockCourtMembers` exported and importable in all consuming files
12. No existing coaching type, function, or component is modified or deleted