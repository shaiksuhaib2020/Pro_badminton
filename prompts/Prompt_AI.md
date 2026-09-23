
**Undo approach decision:** Time-based undo (e.g. 30-min window) is over-engineered for this use case. Cleanest approach: Undo is available only if the member has a check-in logged **today**. Clicking Undo reverses the most recent today-check-in: increments sessions back by 1, removes that entry from `checkInHistory`, recalculates status. This covers the accidental-checkin case exactly with zero complexity.

**Everything else:** All logic is sound and implementable. Let's go.

---

**Turn AI — Agent Prompt: Members Redesign + Accounts Edit + Pending Filter Fix**

Read before editing: `src/lib/mock-data.ts`, `src/app/(management)/students/page.tsx`, `src/app/(management)/transactions/page.tsx`, `src/app/(management)/accounts/page.tsx`, `src/components/court/AddMemberModal.tsx`

---

## Step 1 — `src/lib/mock-data.ts` — Status type updates

Update `Student.status` union:
```ts
status: 'active' | 'due-soon' | 'expired' | 'inactive' | 'dropout'
```

Update `CourtMember.status` union:
```ts
status: 'active' | 'due-soon' | 'sessions-low' | 'exhausted' | 'expired' | 'inactive' | 'dropout'
```

Find all existing mock students with `status: 'off-court'` → change to `'dropout'`. Find any with `status: 'on-hold'` → change to `'inactive'`. Same for mock court members.

Remove `planId` as required field on `CourtMember` — make it optional (`planId?: string`). Add `durationMonths?: number` to `CourtMember` for monthly members enrolled via the new flexible modal.

---

## Step 2 — Add Member Modal redesign

**File: `src/components/court/AddMemberModal.tsx`**

### Remove plan dropdown entirely

Replace the "Plan" dropdown section with:

**Segmented control:** `Sessions | Monthly` — same pill-style as other segmented controls in the app. State: `const [enrollType, setEnrollType] = useState<'sessions' | 'monthly'>('sessions')`

**If Sessions selected — stepper:**
- Label: "Number of Sessions"
- Minus button | value display | Plus button
- State: `const [sessionCount, setSessionCount] = useState(10)`
- Min: 1. No max. Decrement disabled at 1.
- Below stepper: muted hint "Member gets this many court sessions"

**If Monthly selected — stepper:**
- Label: "Duration (Months)"
- Same minus/plus pattern
- State: `const [monthCount, setMonthCount] = useState(1)`
- Min: 1. Below: shows computed expiry date: `format(addMonths(parseISO(joiningDate), monthCount), 'dd MMM yyyy')`

**Price field stays** — manual input, staff enters amount. No auto-calculation from plans.

**On confirm — build CourtMember:**
- `planType: enrollType`
- If sessions: `totalSessions: sessionCount`, `remainingSessions: sessionCount`, `status: 'active'`
- If monthly: `durationMonths: monthCount`, `membershipStartDate: joiningDate`, `nextDueDate: format(addMonths(parseISO(joiningDate), monthCount), 'yyyy-MM-dd')`, `status: 'active'`
- `planId: undefined` (no plan reference needed)

---

## Step 3 — Create EditCourtMemberModal

**Create: `src/components/court/EditCourtMemberModal.tsx`**

Centered modal, `max-w-md`. Props: `{ member: CourtMember, onClose, onConfirm }`.

Editable fields:
- Name (text, required)
- Phone (text, required)
- Joining Date (date)
- If `planType === 'monthly'`: Fees/Amount (number field labeled "Monthly Fee")
- If `planType === 'sessions'`: two number fields — "Sessions Purchased" (`totalSessions`) and "Sessions Remaining" (`remainingSessions`). Validate: remaining ≤ purchased.

On save: `Object.assign(member, { name, phone, joiningDate, ...relevant fields })`, recalculate status if sessions changed (0 → exhausted, ≤2 → sessions-low, >2 → active), call `onConfirm()`.

---

## Step 4 — Members page full redesign

**File: `src/app/(management)/students/page.tsx`**

### 4a — Tab renames (both segments)

Everywhere `'off-court'` label appears → "Dropout". Everywhere `'on-hold'` or `'inactive'` label appears → "Inactive". Tab type values in state:

```ts
// Coaching
type CoachingTab = 'active' | 'inactive' | 'dropout'

// Court  
type CourtTab = 'active' | 'inactive' | 'dropout'
```

Status badge for `'inactive'`: `bg-blue-50 text-blue-600 border border-blue-200` label "Inactive"
Status badge for `'dropout'`: `bg-gray-100 text-gray-500 border border-gray-200` label "Dropout"

---

### 4b — Coaching Active tab action column

Remove the standalone Edit (pencil) button. Replace entire action column with a single three-dot button (`···` or `MoreVertical` icon from lucide).

Three-dot opens a small dropdown (absolute positioned, `z-50`, `bg-so-card border border-so-border shadow-lg rounded-lg`). State: `const [openMenuId, setOpenMenuId] = useState<string | null>(null)`. Click outside closes it.

Dropdown options:
- "Move to Inactive" → `student.status = 'inactive'`, close menu, refresh
- "Move to Dropout" → `student.status = 'dropout'`, close menu, refresh  
- "Delete Permanently" → inline Yes/No confirm (same pattern used elsewhere). Show warning if `student.pendingAmount > 0`. On confirm: splice from `mockStudents`.

---

### 4c — Coaching Inactive tab

Students where `status === 'inactive'`.

Columns: Name | Mobile | Batch | Guardian | Actions

Action column: **Pencil edit button** (opens existing `EditStudentModal`) + **three-dot menu**

Three-dot options:
- "Move to Dropout" → `student.status = 'dropout'`
- "Delete Permanently" → inline Yes/No confirm

No Reactivate option.

---

### 4d — Coaching Dropout tab

Students where `status === 'dropout'`.

Columns: Name | Mobile | Guardian | Last Batch | Actions

Action column: **Re-enroll button** (existing `ReEnrollModal` — unchanged behavior) + **Delete Permanently** (inline confirm with dues warning if `pendingAmount > 0`).

No Reactivate button anywhere.

---

### 4e — Court Active tab

Add `EditCourtMemberModal` — state `const [editingMember, setEditingMember] = useState<CourtMember | null>(null)`.

Action column layout: **Pencil edit button** (opens `EditCourtMemberModal`) + **Check-in/Log button** (session members only) + **three-dot menu**

**Log button (replaces Check In):**

State: `const [logMenuId, setLogMenuId] = useState<string | null>(null)`

Clicking "Log" opens a small inline action group:

```tsx
// Inline — replaces the Log button while open
<div className="flex items-center gap-2 text-xs">
  <button onClick={() => handleCheckIn(member.id)}
    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-medium">
    Check-in
  </button>
  <button
    onClick={() => handleUndo(member.id)}
    disabled={!member.checkInHistory.some(c => c.date === todayStr)}
    className="px-2.5 py-1 bg-so-surface text-so-muted border border-so-border rounded-md font-medium disabled:opacity-40 disabled:cursor-not-allowed">
    Undo
  </button>
  <button onClick={() => setLogMenuId(null)} className="text-so-muted hover:text-so-text">
    <X className="w-3.5 h-3.5" />
  </button>
</div>
```

**Undo handler:**
```ts
const handleUndo = (id: string) => {
  const member = mockCourtMembers.find(m => m.id === id)
  if (!member) return
  
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  // Find most recent today check-in
  const todayCheckins = member.checkInHistory.filter(c => c.date === todayStr)
  if (todayCheckins.length === 0) return
  
  const last = todayCheckins[todayCheckins.length - 1]
  member.remainingSessions = last.sessionsAfter + 1  // restore
  
  // Remove last entry
  const idx = member.checkInHistory.lastIndexOf(last)
  member.checkInHistory.splice(idx, 1)
  
  // Recalculate status
  const r = member.remainingSessions
  member.status = r === 0 ? 'exhausted' : r <= 2 ? 'sessions-low' : 'active'
  
  setLogMenuId(null)
  setToast({ type: 'success', message: `Check-in undone for ${member.name}. Sessions restored to ${r}.` })
  refresh()
}
```

Monthly members: no Log button. Action column shows pencil + three-dot only.

Exhausted session members: no Log button. Muted text "No sessions left" in action column + three-dot.

**Three-dot options (Court Active):**
- "Move to Inactive" → `member.status = 'inactive'`
- "Move to Dropout" → `member.status = 'dropout'`
- "Delete Permanently" → inline Yes/No confirm

---

### 4f — Court Inactive tab

Members where `status === 'inactive'`.

Action column: three-dot only → "Move to Dropout" | "Delete Permanently"

---

### 4g — Court Dropout tab

Members where `status === 'dropout'`.

Action column: "Delete Permanently" only (inline confirm).

No Reactivate anywhere.

---

## Step 5 — Pending tab filter fix (CRITICAL)

**File: `src/app/(management)/transactions/page.tsx`**

### Coaching Pending tab

Currently derives from students where `status === 'expired' || 'due-soon'`. Add exclusion:

```ts
const pendingStudents = mockStudents.filter(s =>
  (s.status === 'expired' || s.status === 'due-soon') &&
  s.status !== 'inactive' &&
  s.status !== 'dropout'
)
```

Since 'inactive' and 'dropout' are no longer 'expired'/'due-soon' (they have their own status values), this filter naturally excludes them. But be explicit to future-proof: add `&& s.status !== 'inactive' && s.status !== 'dropout'` to make the intent clear.

### Court Pending tab

Same logic — court members in Pending must exclude `status === 'inactive'` and `status === 'dropout'`:

```ts
const courtPendingMonthly = mockCourtMembers.filter(m =>
  (m.status === 'expired' || m.status === 'due-soon') &&
  m.status !== 'inactive' &&
  m.status !== 'dropout'
)

const courtPendingSessions = mockCourtMembers.filter(m =>
  m.status === 'exhausted' &&
  m.status !== 'inactive' &&
  m.status !== 'dropout'
)
```

---

## Step 6 — Accounts page edit buttons

**File: `src/app/(management)/accounts/page.tsx`**

### Inventory product rows

Add state: `const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null)`

Add pencil button beside each row's existing delete button (visible on hover, same `group-hover:opacity-100` pattern). Clicking sets `editingProduct` to that item.

**Edit product panel** (same slide-in or centered modal as Add Product, pre-filled):
- Same fields: Item Name, Category, Description, Quantity, Price
- Pre-populate all from `editingProduct`
- On save: `Object.assign(editingProduct, { name, category, description, quantity, price })`, close panel, refresh

### Expense rows

Add state: `const [editingExpense, setEditingExpense] = useState<AccountEntry | null>(null)`

Pencil beside delete on each row. Opens edit panel pre-filled with category, date, description, amount, notes. On save: `Object.assign(editingExpense, updates)`, refresh.

### Income rows

Same pattern. State: `const [editingIncome, setEditingIncome] = useState<AccountEntry | null>(null)`. Pencil beside delete. On save: update and refresh.

For both expense and income edit panels, the category dropdowns should show the same full list (built-in + custom) as the Add panels.

---

## Verification checklist

1. `Student.status` and `CourtMember.status` have `'inactive'` and `'dropout'`, not `'on-hold'`/`'off-court'`
2. All mock data with old status values updated
3. All three tabs labelled Active / Inactive / Dropout in both segments
4. Coaching Active: only three-dot, no standalone edit button
5. Coaching Inactive: pencil + three-dot (Move to Dropout, Delete only)
6. Coaching Dropout: Re-enroll + Delete. Zero Reactivate button anywhere
7. Court Active: pencil edit (EditCourtMemberModal) + Log (session members only) + three-dot
8. Court Inactive: three-dot only
9. Court Dropout: Delete only
10. Log button shows inline Check-in + Undo. Undo disabled when no today check-in exists
11. Undo removes last today check-in, restores sessions, recalculates status
12. Add Member modal has Sessions/Monthly segment + stepper, no plan dropdown
13. Coaching Pending tab excludes inactive and dropout students
14. Court Pending tab excludes inactive and dropout court members
15. Inventory, expense, income rows all have pencil edit beside delete
16. Edit panels/modals pre-fill correctly and save via Object.assign
17. Status badge "Inactive" = blue style, "Dropout" = gray style