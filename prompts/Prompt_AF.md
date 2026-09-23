Good. Let me reason through the full design before writing instructions.

---

## Design Analysis

### Two modes, one tab

**Insights mode (default):** A date-column grid. Students = rows, dates = columns. Each cell = Present (green) / Absent (red) / — (no record, gray). Rightmost column = attendance % per student. Top bar = period label + batch-level average %. This is the "read the history" view.

**Marking mode:** Triggered by "Take Attendance" button. Single-date focus. Simple list with Present/Absent toggles. Save → back to insights. Cancel → back to insights. No grid — just the marking sheet for that one date.

### Filter logic for insights grid
Columns = all calendar dates in selected range, ordered left (oldest) → right (most recent). If no attendance record exists for a date, every cell in that column shows "—". This is standard — shows gaps honestly.

Filter options: **Last 5 Days / Last 10 Days / Last 30 Days / This Month.** No custom range — keeps the grid manageable.

### Take Attendance date scope
Defaults to today. Staff can change the date in marking mode (past only, no future). If a record already exists for the chosen date, it pre-populates — effectively becoming "edit" mode. Button label switches: no record today → "Take Attendance", record exists today → "Edit Today's Attendance".

---

## Turn AF — Agent Prompt: Attendance Tab Redesign in Batch Detail

**File:** `src/app/(management)/batches/[id]/page.tsx`

---

### Step 1 — State changes for attendance tab

Remove old insights/marking state. Replace with:

```ts
type AttInsightFilter = 'last5' | 'last10' | 'last30' | 'thisMonth'
type AttViewMode = 'insights' | 'marking'

const [attView, setAttView] = useState<AttViewMode>('insights')
const [insightFilter, setInsightFilter] = useState<AttInsightFilter>('last5')
const [markingDate, setMarkingDate] = useState(todayStr)
const [draftRecords, setDraftRecords] = useState<Record<string, 'present' | 'absent'>>({})
const [isDirty, setIsDirty] = useState(false)
```

---

### Step 2 — Derived data for insights grid

Compute the date columns from `insightFilter`:

```ts
const getInsightDates = (): string[] => {
  const now = new Date()
  if (insightFilter === 'last5')  return Array.from({length: 5},  (_, i) => format(subDays(now, 5 - i),  'yyyy-MM-dd'))
  if (insightFilter === 'last10') return Array.from({length: 10}, (_, i) => format(subDays(now, 10 - i), 'yyyy-MM-dd'))
  if (insightFilter === 'last30') return Array.from({length: 30}, (_, i) => format(subDays(now, 30 - i), 'yyyy-MM-dd'))
  // thisMonth
  const start = startOfMonth(now)
  const days = differenceInCalendarDays(now, start) + 1
  return Array.from({length: days}, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}
const insightDates = getInsightDates()
```

Import `startOfMonth`, `differenceInCalendarDays`, `addDays` from `date-fns`.

Batch attendance lookup helper:
```ts
const getStatus = (studentId: string, date: string): 'present' | 'absent' | null => {
  const record = mockAttendance.find(r => r.batchId === batch.id && r.date === date)
  return record?.records[studentId] ?? null
}
```

Batch-level stats:
```ts
const allBatchRecords = mockAttendance.filter(r => r.batchId === batch.id)
const datesWithRecords = insightDates.filter(d => allBatchRecords.some(r => r.date === d))
const batchAvgPct = (() => {
  if (datesWithRecords.length === 0 || batchStudents.length === 0) return null
  const totalPresent = batchStudents.reduce((sum, s) =>
    sum + datesWithRecords.filter(d => getStatus(s.id, d) === 'present').length, 0)
  return Math.round((totalPresent / (batchStudents.length * datesWithRecords.length)) * 100)
})()
```

Per-student attendance %:
```ts
// Inside the student row render:
const studentPresent = datesWithRecords.filter(d => getStatus(s.id, d) === 'present').length
const studentPct = datesWithRecords.length > 0
  ? Math.round((studentPresent / datesWithRecords.length) * 100)
  : null
```

---

### Step 3 — Insights mode layout

#### Top bar (row):
- Left: Filter tabs — 4 pill buttons (Last 5 Days / Last 10 Days / Last 30 Days / This Month). Active = `bg-so-accent text-so-accent-text`. Inactive = surface/border style.
- Right: Batch average badge if `batchAvgPct !== null` — show `"Avg Attendance: X%"` in a muted chip colored by ≥75% emerald / ≥50% amber / <50% red. Then "Take Attendance" / "Edit Today's Attendance" button.

Button label logic:
```ts
const todayRecord = mockAttendance.find(r => r.batchId === batch.id && r.date === todayStr)
const btnLabel = todayRecord ? 'Edit Today' : 'Take Attendance'
```

On click → `enterMarkingMode(todayStr)`.

#### Empty state
If `allBatchRecords.length === 0`: centered state with CalendarCheck icon, "No attendance recorded yet", and a prominent "Take Attendance" button.

#### The grid table

Structure: horizontally scrollable container (`overflow-x-auto`) wrapping a table. This is critical for 30-day range.

**Header row:**
- First cell: "Student" label (fixed left column, `min-w-[160px]`)
- One cell per date in `insightDates`: show day abbreviation (Mon/Tue etc.) on top, date number below. Today's column header gets `bg-so-accent/10 text-so-accent` highlight. Cell width `min-w-[70px]` centered.
- Last cell: "Att. %" header

**Student rows:**
- First cell: avatar initials circle + student name (truncated)
- One cell per date: render status cell
  - `present` → `bg-emerald-50 text-emerald-700` pill saying "P" or "✓" (keep compact)
  - `absent` → `bg-red-50 text-red-600` pill saying "A" or "✗"
  - `null` → `text-so-muted` dash "—"
- Last cell: attendance % number, colored same thresholds as batch average. Show "—" if no records.

Row hover: `hover:bg-so-surface/50`. First column sticky: `sticky left-0 bg-so-card z-10` so student names don't scroll away.

---

### Step 4 — Enter marking mode

```ts
const enterMarkingMode = (date: string) => {
  const saved = mockAttendance.find(r => r.batchId === batch.id && r.date === date)
  setMarkingDate(date)
  setDraftRecords(saved?.records ? { ...saved.records } : {})
  setIsDirty(false)
  setAttView('marking')
}
```

---

### Step 5 — Marking mode layout

#### Header
- Back chevron button → `setAttView('insights')` (same as cancel)
- Bold date: `format(parseISO(markingDate), 'EEEE, dd MMMM yyyy')`
- Right: date picker input (`type="date"`, `max={todayStr}`) — changing it calls `enterMarkingMode(newDate)` to reload any saved record for that date
- Label above date picker: "Taking attendance for:"

#### Summary strip
Present count · Absent count · Unmarked count + "Mark All Present" button. Same as before.

#### Student list
Same Present/Absent pill toggle pattern. Toggling: update `draftRecords`, set `isDirty = true`. Row bg tints based on draft status.

Mark handler:
```ts
const mark = (studentId: string, status: 'present' | 'absent') => {
  setDraftRecords(prev => ({ ...prev, [studentId]: status }))
  setIsDirty(true)
}
```

Mark all present:
```ts
const markAllPresent = () => {
  const all: Record<string, 'present'> = {}
  batchStudents.forEach(s => { all[s.id] = 'present' })
  setDraftRecords(all)
  setIsDirty(true)
}
```

#### Sticky bottom action bar
Always rendered when `attView === 'marking'`. Content:

- Left: status text
  - `isDirty` → amber dot + "Unsaved changes"
  - `!isDirty && batchStudents.every(s => draftRecords[s.id])` → emerald check + "All students marked"
  - `!isDirty && !batchStudents.every(s => draftRecords[s.id])` → muted "Mark attendance then save"
- Right: Cancel button (border style) + Save Attendance button (accent bg)

Both Cancel and Save enabled regardless of `isDirty` — staff may want to cancel even without changes.

#### Save handler
```ts
const handleSaveAttendance = () => {
  const existing = mockAttendance.find(r => r.batchId === batch.id && r.date === markingDate)
  if (existing) {
    existing.records = { ...draftRecords }
  } else {
    mockAttendance.push({
      id: `${batch.id}-${markingDate}-${Date.now()}`,
      batchId: batch.id,
      date: markingDate,
      records: { ...draftRecords },
    })
  }
  setAttView('insights')
  setIsDirty(false)
  refresh()
}
```

Cancel: `setAttView('insights')`, `setIsDirty(false)`.

---

### Verification checklist

1. Grid columns computed correctly for all 4 filter options — no off-by-one on "This Month"
2. Today's column visually highlighted in header
3. Student name column stays sticky on horizontal scroll (`sticky left-0`)
4. `getStatus` returns `null` (not false/undefined) for missing records — cells render "—" not blank
5. Batch average % and per-student % only computed over dates that have actual records — not over all dates in range
6. Entering marking mode for a date with existing record pre-fills draft correctly
7. Entering marking mode for a date with no record starts with empty draft (all unmarked)
8. Changing date in marking mode via date picker reloads record for new date
9. Save writes to `mockAttendance` and switches to insights — grid re-renders with new data
10. Cancel returns to insights without modifying `mockAttendance`
11. "Take Attendance" vs "Edit Today" label reflects whether today has a saved record
12. `overflow-x-auto` on grid container — no layout breaking on 30-day filter
13. Empty state shows correctly when `allBatchRecords.length === 0`