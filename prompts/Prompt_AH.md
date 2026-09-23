Clear. Here's the full corrective prompt:

---

**Turn AH — Fix Members Page Logic + Court Transactions + Coaching On Hold**

Read these files fully before editing: `src/lib/mock-data.ts`, `src/app/(management)/students/page.tsx`, `src/app/(management)/transactions/page.tsx`

---

## Step 1 — Data model fixes

**`src/lib/mock-data.ts`**

Add `'on-hold'` to the `Student` status union:
```ts
status: 'active' | 'due-soon' | 'expired' | 'on-hold' | 'off-court'
```

Add a `checkInHistory` field to `CourtMember`:
```ts
checkInHistory: Array<{ id: string; date: string; sessionsAfter: number }>
```
Initialize as `[]` on all existing mock court members.

---

## Step 2 — Members page full correction

**File: `src/app/(management)/students/page.tsx`**

### Core principle
This page is a **directory and status manager only**. Zero fee actions. Zero Collect/Renew/Buy Sessions buttons anywhere on this page for either segment.

---

### Coaching segment — add On Hold tab

Change tab type from `'active' | 'off-court'` to `'active' | 'on-hold' | 'off-court'`.

Tab bar: **Active | On Hold | Off Court**

**Active tab** — add a second action alongside existing "Move to Off Court":
- Action dropdown per row (or two separate text buttons): "Move to On Hold" and "Move to Off Court"
- "Move to On Hold" sets `student.status = 'on-hold'`, removes from Active, refresh

**On Hold tab:**
- Shows students where `status === 'on-hold'`
- Columns: Name | Mobile | Batch | Guardian | Actions
- Actions: "Reactivate" (sets status back to `'active'`) and "Move to Off Court"
- No dues shown here — this is purely status management

**Off Court tab:** unchanged.

Ensure status badge for `'on-hold'` renders as: `bg-blue-50 text-blue-600 border border-blue-200` with label "On Hold".

---

### Court segment — complete rewrite of action column

Remove entirely: Collect button, Renew button, Buy Sessions button, any payment-related button.

**Tab bar: Active | On Hold | Off Court**

State additions:
```ts
const [checkInConfirmId, setCheckInConfirmId] = useState<string | null>(null)
const [courtTab, setCourtTab] = useState<'active' | 'on-hold' | 'off-court'>('active')
```

**Active tab** shows court members where status is NOT `'on-hold'` or `'off-court'`. This includes `active`, `due-soon`, `sessions-low`, `exhausted`, `expired` — all current members regardless of payment state.

**Table columns:** Member (avatar + name + phone + plan type pill) | Plan Name | Validity/Sessions | Status | Action

**Validity/Sessions cell (informational only, no buttons):**
- Monthly: next due date, colored by status
- Sessions: `remainingSessions / totalSessions` text + small progress bar

**Action column logic:**

For session-based members (`planType === 'sessions'`):

```
remainingSessions > 0 AND status not 'on-hold':
  → [Check In] button (accent/green style)
  
remainingSessions === 0 (exhausted):
  → Grey disabled text "No sessions — see Fee Transactions"
  → No clickable action
```

Check In inline confirm pattern (same as Move to Off Court pattern in existing code):
```tsx
// When checkInConfirmId === member.id, replace action cell with:
<div className="flex items-center gap-2 text-xs">
  <span className="text-so-muted">
    Log 1 session? ({member.remainingSessions - 1} left after)
  </span>
  <button onClick={() => handleCheckIn(member.id)} className="text-emerald-600 font-medium hover:underline">
    Confirm
  </button>
  <span className="text-so-muted">/</span>
  <button onClick={() => setCheckInConfirmId(null)} className="text-so-muted hover:underline">
    Cancel
  </button>
</div>
```

Check In handler:
```ts
const handleCheckIn = (id: string) => {
  const member = mockCourtMembers.find(m => m.id === id)
  if (!member || member.remainingSessions === undefined) return
  
  const sessionsAfter = member.remainingSessions - 1
  member.remainingSessions = sessionsAfter
  
  // Update status
  if (sessionsAfter === 0) member.status = 'exhausted'
  else if (sessionsAfter <= 2) member.status = 'sessions-low'
  
  // Log check-in
  member.checkInHistory.push({
    id: crypto.randomUUID(),
    date: format(new Date(), 'yyyy-MM-dd'),
    sessionsAfter,
  })
  
  setCheckInConfirmId(null)
  
  // Toast
  if (sessionsAfter === 0) {
    setToast({ type: 'error', message: `${member.name} has no sessions left. Collect payment in Fee Transactions.` })
  } else {
    setToast({ type: 'success', message: `Check-in logged. ${sessionsAfter} session${sessionsAfter !== 1 ? 's' : ''} remaining.` })
  }
  refresh()
}
```

For monthly members (`planType === 'monthly'`):
- No Check In button
- No action button at all — monthly = open access, no per-visit action needed
- Action cell: just the status management dropdown (see below)

**Status management (both plan types):**

Every Active tab row gets a small dropdown beside the main action (three-dot icon or "···" button):

```
Options shown:
  - "Move to On Hold" (if status is not on-hold)
  - "Move to Off Court"
```

On Hold tab rows:
- "Reactivate" → status back to 'active' (or 'sessions-low'/'exhausted' if sessions depleted)
- "Move to Off Court"

Off Court tab rows:
- "Reactivate" → back to 'active'
- "Delete" (permanent, with inline Yes/No confirm)

---

## Step 3 — Fee Transactions court segment

**File: `src/app/(management)/transactions/page.tsx`**

The court segment already has the segmented control wired from the previous turn. Fix the content of each tab.

**Separate filter state for court segment** (prevent contamination with coaching state):
```ts
const [courtTxTab, setCourtTxTab] = useState<TxTab>('recent')
const [courtFilterRange, setCourtFilterRange] = useState<FilterRange>('currentMonth')
const [courtCustomFrom, setCourtCustomFrom] = useState('')
const [courtCustomTo, setCourtCustomTo] = useState('')
const [courtSearchQuery, setCourtSearchQuery] = useState('')
```

Search resets on court tab switch — same behavior as coaching.

---

### Court Recent tab
All `CourtPaymentEntry` records (status !== 'deleted') across `mockCourtMembers` filtered by `courtFilterRange` date range. Sort newest first.

Columns: Member Name | Phone | Date | Amount | Method | Entry Type pill (New/Renewal/Top-up) | Status badge

---

### Court Paid tab
`CourtPaymentEntry` records with `status === 'active'` in date range.

Columns: Member Name | Phone | Date | Amount | Method | Void action

Void → sets `entry.status = 'deleted'`, refresh.

---

### Court Pending tab

Two groups derived from `mockCourtMembers`:

**Monthly pending:** `planType === 'monthly'` AND `status === 'expired' || 'due-soon'`

Columns: Member | Phone | Due Date | Amount Due (plan price) | Action

Actions:
- `expired` → "Renew" button
- `due-soon` → "Collect" button

Both open a simple collect/renew modal (create `CollectCourtPaymentModal` — centered, `max-w-sm`):
- Shows member name + plan name
- Amount pre-filled from `mockCourtPlans.find(p => p.id === member.planId)?.price`
- Payment method pills (Cash/UPI/Card/Other)
- Optional note field
- On confirm: push `CourtPaymentEntry` to `member.paymentHistory`, extend `member.nextDueDate` by `plan.durationMonths`, set `member.status = 'active'`

**Session pending:** `planType === 'sessions'` AND `status === 'exhausted'`

Columns: Member | Phone | Sessions | Plan | Action

Action: "Buy Sessions" button → opens `BuySessionsModal` (centered, `max-w-sm`):
- Shows member name
- Dropdown of all `mockCourtPlans` filtered to `planType === 'sessions'`
- Amount auto-filled from selected plan price, editable
- Payment method pills
- On confirm: push `CourtPaymentEntry`, set `member.remainingSessions = selectedPlan.totalSessions`, set `member.totalSessions = selectedPlan.totalSessions`, set `member.planId = selectedPlan.id`, set `member.status = 'active'`

Note on `sessions-low` in Pending: Do NOT include sessions-low members here. They still have sessions left — they're not pending payment. Only `exhausted` (0 sessions) appears in Pending.

---

### Court Partially Paid tab

Show empty state: "Partial payment tracking for court members coming soon." with a `Receipt` icon. No data, no error.

---

## Verification checklist

1. Members page coaching segment: Active / On Hold / Off Court — zero fee buttons
2. "Move to On Hold" sets `student.status = 'on-hold'`, moves to On Hold tab
3. Members page court segment: zero Collect/Renew/Buy Sessions buttons anywhere
4. Check In only available for session members with `remainingSessions > 0`
5. Exhausted session members show grey "No sessions — see Fee Transactions" — no clickable button
6. Monthly court members have no Check In button — action column shows only status dropdown
7. Check In decrements sessions, updates status, logs to `checkInHistory`
8. Sessions reaching 0 → `status = 'exhausted'` → member appears in Fee Transactions Court Pending
9. Fee Transactions court Pending: monthly expired/due-soon + session exhausted (NOT sessions-low)
10. Court filter state fully separate from coaching filter state
11. `Student` status union includes `'on-hold'`
12. Status badge for `'on-hold'`: blue style, label "On Hold"
13. All existing coaching functionality on Members page untouched