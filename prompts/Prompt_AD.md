---

## Full Design Analysis

### What's changing
The standalone Attendance page is retired. Attendance becomes a tab *inside* a Batch. Batches get promoted from a simple string array in Settings into a proper first-class entity with their own page and detail view.

### Data model impact
`mockSettings.batches` is currently `string[]` used in 8+ places across the app. We can't break those. Strategy: introduce `mockBatches: Batch[]` as the new source of truth, and keep `mockSettings.batches` as a string array that gets manually synced whenever batches are created or deleted. All existing dropdowns continue working untouched.

### New routes
- `/batches` — batch list (replaces Attendance in sidebar)
- `/batches/[id]` — batch detail with 3 tabs

### Save/Cancel attendance behavior
Attendance marks are **draft state** (local React state). Nothing persists until Save is clicked. Cancel reverts to the last saved state for that date — or clears all marks if nothing was saved yet for that date. This distinction is critical — the agent must not auto-sync on toggle.

### Settings page impact
The Batches section currently in Settings becomes redundant — remove it from Settings. Batches are now fully managed from the Batches page.

---

## Turn AD — Agent Prompt: Batches Module

### Files to read first
`src/lib/mock-data.ts`, `src/components/layout/Sidebar.tsx`, `src/app/(management)/settings/page.tsx`, `src/app/(management)/attendance/page.tsx`

---

## Step 1 — `src/lib/mock-data.ts` additions

**Add new types:**

```ts
export type Batch = {
  id: string
  name: string
  days: string[]         // e.g. ['Monday', 'Wednesday', 'Friday']
  fees?: number          // optional batch-level fee override
  description?: string   // e.g. "6:00 AM – 8:00 AM"
}

export type AttendanceRecord = {
  id: string
  batchId: string
  date: string           // yyyy-MM-dd
  records: Record<string, 'present' | 'absent'>  // studentId → status
}
```

**Add `mockBatches` export** — seed with the two existing batches as rich objects:

```ts
export let mockBatches: Batch[] = [
  {
    id: 'batch-morning',
    name: 'Morning',
    days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    fees: 1500,
    description: '6:00 AM – 8:00 AM',
  },
  {
    id: 'batch-evening',
    name: 'Evening',
    days: ['Monday','Wednesday','Friday','Saturday'],
    fees: 1500,
    description: '5:00 PM – 7:00 PM',
  },
]
```

**Add `mockAttendance` export** — pre-seed last 7 days for both batches so the UI isn't empty:

```ts
export let mockAttendance: AttendanceRecord[] = []

// Self-executing seed function at module level
;(() => {
  const eligible = (batchName: string) =>
    mockStudents.filter(s => s.status !== 'off-court' && s.currentBatch === batchName)
  
  for (let i = 1; i <= 7; i++) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    mockBatches.forEach(batch => {
      const records: Record<string, 'present' | 'absent'> = {}
      eligible(batch.name).forEach(s => {
        records[s.id] = Math.random() > 0.15 ? 'present' : 'absent'
      })
      mockAttendance.push({
        id: `${batch.id}-${date}`,
        batchId: batch.id,
        date,
        records,
      })
    })
  }
})()
```

Import `format` and `subDays` at the top of `mock-data.ts` if not already imported.

**Update `mockSettings.batches`** to derive from `mockBatches` at initialization:
```ts
// Inside mockSettings object:
batches: mockBatches.map(b => b.name)
```

---

## Step 2 — Sidebar

**File: `src/components/layout/Sidebar.tsx`**

- Remove the `Attendance` nav item
- Add `Batches` nav item in the same position (between Students and Fee Transactions)
- Icon: `LayoutGrid` from lucide-react
- href: `/batches`

---

## Step 3 — Settings page cleanup

**File: `src/app/(management)/settings/page.tsx`**

Remove the entire Batches section — the heading, the batch pill display, the add-batch input, and all related state (`newBatch`, batch add/delete handlers). Batches are now managed exclusively from the Batches page.

Retain: Facility Profile, Membership Types, Events Management.

---

## Step 4 — Delete attendance page

Delete `src/app/(management)/attendance/page.tsx` and `src/app/(management)/attendance/loading.tsx`. The folder can be deleted entirely.

---

## Step 5 — Batches list page

**Create: `src/app/(management)/batches/page.tsx`** — `'use client'`

### Layout
- Page header: "Batches" title + subtitle + "Create Batch" button (top right, accent color)
- Below: responsive card grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`)
- Empty state if no batches exist

### Batch card contents
Each card is clickable (entire card → navigate to `/batches/${batch.id}`). Show:
- Batch name (large, semibold)
- Day chips — small pills for each day (Mon, Tue shortnames). Active schedule days in accent/blue tint, giving visual rhythm
- Description if set (time slot etc.) — small muted text
- Fee if set — shown as "₹X / month" in emerald
- Student count — derived from `mockStudents.filter(s => s.currentBatch === batch.name && s.status !== 'off-court').length`
- Footer row: student count badge + "View Details →" text link

### Create Batch modal (centered, `max-w-md`)
Fields:
- **Batch Name** — text input, required
- **Schedule Days** — 7 pill-toggle buttons (Mon Tue Wed Thu Fri Sat Sun). Each toggles in/out of selected days array. Active: accent bg. Inactive: surface/border. At least 1 day required
- **Fees** — number input, optional. Placeholder: "Leave blank if using membership fee"
- **Description / Time Slot** — text input, optional. Placeholder: "e.g. 6:00 AM – 8:00 AM"

### Create handler logic
On confirm:
- Validate name not empty, at least 1 day selected, name not duplicate (case-insensitive check against `mockBatches`)
- Push new `Batch` object into `mockBatches`
- Also push `batch.name` into `mockSettings.batches` to keep dropdowns in sync
- Show inline toast on success, close modal

### Delete batch
Each card has a delete icon (visible on hover). Show inline Yes/No confirm. Guard: if `mockStudents.some(s => s.currentBatch === batch.name)` → show error toast "Cannot delete — X students are assigned to this batch." Prevent deletion. On successful delete: splice from `mockBatches` and splice name from `mockSettings.batches`.

---

## Step 6 — Batch detail page

**Create: `src/app/(management)/batches/[id]/page.tsx`** — `'use client'`

### Route resolution
```ts
const { id } = useParams()
const batch = mockBatches.find(b => b.id === id)
if (!batch) → show not found with back button to /batches
```

### Page header
Back arrow → `/batches`, batch name (h1), day chips row, description + fee muted text, student count badge. No edit UI here — keep it read-only for now.

### Three tabs
`type BatchTab = 'attendance' | 'students' | 'transactions'`

Tab bar: Attendance | Students | Transactions

Batch students (shared derived value used across all tabs):
```ts
const batchStudents = mockStudents
  .filter(s => s.currentBatch === batch.name && s.status !== 'off-court')
  .sort((a, b) => a.name.localeCompare(b.name))
```

---

### Tab 1 — Attendance

**State:**
```ts
const todayStr = format(new Date(), 'yyyy-MM-dd')
const [selectedDate, setSelectedDate] = useState(todayStr)
const [draftRecords, setDraftRecords] = useState<Record<string, 'present' | 'absent'>>({})
const [isDirty, setIsDirty] = useState(false)  // unsaved changes exist
```

**On date change** — load saved record into draft:
```ts
useEffect(() => {
  const saved = mockAttendance.find(
    r => r.batchId === batch.id && r.date === selectedDate
  )
  setDraftRecords(saved?.records ?? {})
  setIsDirty(false)
}, [selectedDate])
```

**Mark handler** — updates `draftRecords` only, sets `isDirty = true`. Does NOT touch `mockAttendance`.

**Save handler:**
```ts
const handleSave = () => {
  const existing = mockAttendance.find(r => r.batchId === batch.id && r.date === selectedDate)
  if (existing) {
    existing.records = { ...draftRecords }
  } else {
    mockAttendance.push({
      id: `${batch.id}-${selectedDate}`,
      batchId: batch.id,
      date: selectedDate,
      records: { ...draftRecords },
    })
  }
  setIsDirty(false)
  // show brief success toast "Attendance saved"
}
```

**Cancel handler** — reload from saved record, discard drafts:
```ts
const handleCancel = () => {
  const saved = mockAttendance.find(r => r.batchId === batch.id && r.date === selectedDate)
  setDraftRecords(saved?.records ?? {})
  setIsDirty(false)
}
```

**Layout:**

Date navigator (same pattern as original attendance page — prev/next arrows, date input with `max={todayStr}`, Go to Today button).

Summary strip: Present count / Absent count / Unmarked count + Mark All Present button.

Student rows: same Present/Absent pill toggle pattern as original. Row bg tints green/red based on draft state.

**Sticky bottom action bar** — always visible when `batchStudents.length > 0`:
```
[isDirty indicator: "● Unsaved changes"]   [Cancel]  [Save Attendance]
```
- Save button: `bg-so-accent text-so-accent-text`, disabled + dimmed when `!isDirty`
- Cancel button: border style, disabled when `!isDirty`
- When `!isDirty` and all students marked: show "✓ Attendance saved" in muted green text instead of "Unsaved changes"

---

### Tab 2 — Students

Simple table. Columns: Name | Phone | Status | Next Due.

Status badge uses existing color pattern (active/due-soon/expired). No actions — this is read-only. Clicking a student name navigates to `/students/${student.id}`.

Empty state: "No active students in this batch."

---

### Tab 3 — Transactions

This is the Fee Transactions page logic scoped to `batchStudents`.

**State needed:** same as `/transactions` page — `txTab`, `searchQuery`, `filterRange`, `customFrom`, `customTo`, `showFilter`, `renewTarget`, `collectRemainingTarget`, `forceUpdate`.

**Four tabs: Recent | Paid | Pending | Partially Paid**

Each tab's data derivation is identical to the global transactions page but with one extra filter step at the start — every student or payment lookup is restricted to `batchStudents.map(s => s.id)`.

- Recent: `mockStudents.flatMap(s => s.paymentHistory)` filtered to `batchStudents` IDs + date range
- Paid: full/advance entries from batch students in range
- Pending: batch students with status expired/due-soon
- Partially Paid: batch students with `pendingAmount > 0`

Search scoped to active tab (same behavior as global transactions page).

Filter panel: Current Month | Last Month | Custom (same slide-in pattern).

RenewModal integration: same `onConfirm` signature — updates student in `mockStudents` directly, then `refresh()`.

Quick Collect (bulk) is **not** included here — keep this tab simple.

---

## Step 7 — Create loading files

Create `src/app/(management)/batches/loading.tsx` and `src/app/(management)/batches/[id]/loading.tsx` — simple pulse skeleton matching page layout proportions.

---

## Verification checklist

1. `mockBatches`, `mockAttendance`, `Batch`, `AttendanceRecord` exported from `mock-data.ts`
2. `mockSettings.batches` stays as string[] and is kept in sync on batch create/delete
3. Sidebar: Attendance removed, Batches added with `LayoutGrid` icon at `/batches`
4. Settings page: Batches section fully removed, other sections untouched
5. Old attendance folder deleted
6. Batches list: create/delete with guards, card grid, day chips render correctly
7. Batch detail: `useEffect` on `selectedDate` reloads draft from saved record — no stale state
8. Attendance: draft marks never touch `mockAttendance` until Save is clicked
9. Cancel correctly reverts to last saved state (empty if never saved for that date)
10. Save button disabled when `!isDirty`
11. Transactions tab filters strictly to batch students — no cross-batch data leaks
12. Student name in Students tab links to `/students/${student.id}`
13. All existing dropdowns (AddStudentModal, EditStudentModal, RenewModal, ReEnrollModal, Dashboard) still work — `mockSettings.batches` string[] unchanged