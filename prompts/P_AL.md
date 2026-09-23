Good. Three clean steps here. The attendance tab for student profiles and the court member profile are the two biggest deliverables, with a plan display fix wired into both.

---

## Step 1 — Fix Plan Display + Wire Court Member Row Navigation

**Target:** `src/app/(management)/students/page.tsx` — court segment table (all three tabs)

### 1a. Fix Plan Column Display

The PLAN column currently resolves the display name by looking up `member.planId` in `mockCourtPlans` (e.g., producing "Monthly Unlimited", "Session Pack — 10"). This lookup chain must be removed entirely and replaced with a derivation directly from the member object's own fields.

**New display logic — use a small helper inline or as a local function:**

```typescript
const getPlanDisplay = (member: CourtMember) => {
  if (member.planType === 'monthly') {
    const months = member.durationMonths ?? 1;
    return months === 1 ? 'Monthly' : `Monthly · ${months} Months`;
  }
  if (member.planType === 'sessions') {
    return `Sessions · ${member.totalSessions ?? 0} Pack`;
  }
  return 'Unknown';
};
```

In the table cell, replace whatever renders the plan name with `getPlanDisplay(member)`. The `planType` badge below it (`MONTHLY` / `SESSIONS`) stays as-is since it already reads `member.planType` directly.

Apply this fix to all three tab tables (Active, Inactive, Dropout) — they all render the same court member row structure.

### 1b. Make Court Member Rows Clickable — Navigate to Profile

Each court member table row (or the member name specifically) should navigate to `/court-members/${member.id}` on click, using `router.push`. Match the same pattern as coaching student rows (clicking the name navigates to the detail page).

- Make the name in the MEMBER column a clickable element: `cursor-pointer text-so-accent hover:underline`, calls `router.push(`/court-members/${member.id}`)`
- The rest of the row stays non-clickable (3-dot menu, Log In button, etc. are separate actions)

---

## Step 2 — Create Court Member Profile Route

**New files to create:**
```
src/app/(management)/court-members/
  [id]/
    page.tsx     ← main profile page (client component)
    loading.tsx  ← skeleton (can mirror students/[id]/loading.tsx)
```

### 2a. `loading.tsx`
Simple skeleton — a hero card placeholder + two tab placeholders. Mirror the style of `students/[id]` loading skeleton.

### 2b. `page.tsx` — full spec

**`'use client'`** directive. Reads `params.id`, finds `mockCourtMembers.find(m => m.id === params.id)`. If not found, renders a "Member not found" state with a back button.

---

#### Header / Back Navigation
- `ArrowLeft` button → `router.push('/students')` (takes back to members page — court segment will re-render based on stored segment state or default)
- Label next to back arrow: "Members" in muted text

---

#### Hero Card (top of page, always visible)

A card with:
- Left: Avatar circle (2-letter initials, same `so-nav` bg + white text style as court member table)
- Next to avatar: Member name (large, `text-so-text font-semibold`), phone number below in muted
- Right side cluster: Status badge + Plan type badge (`MONTHLY` / `SESSIONS`) + primary action button

**Primary action button logic (top-right of hero):**
- Monthly active/due-soon → "Renew" (opens `RenewCourtMemberModal`)
- Monthly expired → "Collect Payment" (opens `RenewCourtMemberModal`)
- Sessions active/sessions-low → "Log In" (inline deduct with undo — same logic as members page Step 3 from prior session)
- Sessions exhausted → "Buy Sessions" (opens `RenewCourtMemberModal`)
- Inactive/Dropout → no primary action button; show a muted "Member is {status}" label instead

---

#### Two Tabs: Details | Transactions

---

**DETAILS TAB**

Two info cards stacked:

**Card 1 — Membership Info:**

For `planType === 'monthly'`:
| Label | Value |
|---|---|
| Plan Type | Monthly |
| Duration | `{durationMonths} Month(s)` |
| Joining Date | `formatDate(member.joiningDate)` |
| Membership Start | `formatDate(member.membershipStartDate)` |
| Next Due Date | `formatDate(member.nextDueDate)` — color: red if `expired`, yellow if `due-soon`, else normal |
| Amount Paid | `formatCurrency(member.amountPaid)` |
| Pending Amount | `formatCurrency(member.pendingAmount)` — only render this row if `pendingAmount > 0`, colored red |

For `planType === 'sessions'`:
| Label | Value |
|---|---|
| Plan Type | Sessions |
| Total Sessions | `member.totalSessions` |
| Remaining Sessions | `member.remainingSessions` with a small progress bar below (remaining/total, green fill, red when ≤ 2) |
| Joining Date | `formatDate(member.joiningDate)` |
| Amount Paid | `formatCurrency(member.amountPaid)` |
| Pending Amount | `formatCurrency(member.pendingAmount)` — only if > 0, colored red |

**Card 2 — Notes:** Text area (read-only display) showing `member.notes`. If empty, show "No internal notes." in muted text.

**Card 3 (sessions only) — Recent Check-ins:** Last 5 entries from `member.checkInHistory`, newest first. Each row: date + "Sessions after: N". If empty: "No check-ins recorded."

---

**TRANSACTIONS TAB**

Date range filter pills: Current Month | Last Month | Current FY | Last FY | Custom — same pattern as coaching student transaction tab.

Table columns: DATE | AMOUNT | METHOD | TYPE | STATUS | ACTION

- Filter `member.paymentHistory` where `status !== 'deleted'` and date within selected range
- TYPE badge: `new` → "NEW", `renewal` → "RENEWAL", `session-topup` → "TOP-UP"
- STATUS badge: `active` → green "ACTIVE", `deleted` → red "VOIDED"
- ACTION: `Trash2` icon (size 15, `text-so-muted hover:text-so-red`) → inline confirm "Void transaction? [Yes] [No]" — Yes sets `entry.status = 'deleted'`, triggers refresh

Empty state if no transactions in range: muted centered text "No transactions found."

---

## Step 3 — Add Attendance Tab to Student Profile

**Target:** `src/app/(management)/students/[id]/page.tsx`

### 3a. Tab Addition

Current tabs: `'details' | 'transactions'`
New tabs: `'details' | 'transactions' | 'attendance'`

Add the "Attendance" tab button to the existing tab row. Default tab stays `'details'`.

---

### 3b. Attendance Tab Content

The tab renders a self-contained calendar attendance view. All logic runs client-side against `mockAttendance`.

---

**Data derivation — build a lookup map:**

```typescript
// Build a map: date (yyyy-MM-dd) → 'present' | 'absent' | undefined
const attendanceMap: Record<string, 'present' | 'absent'> = {};
mockAttendance.forEach(record => {
  if (record.records[student.id] !== undefined) {
    attendanceMap[record.date] = record.records[student.id];
  }
});
```

Also derive the student's batch active days:
```typescript
// Find the student's batch by name match
const studentBatch = mockSettings.batches /* or mockBatches */ find by student.currentBatch;
// studentBatch.days → e.g. ['Mon', 'Tue', 'Wed', 'Fri', 'Sat']
```

Use `studentBatch.days` to determine which days of the week are "session days" vs non-session days within the calendar grid.

---

**Month Navigation State:**

```typescript
const [viewYear, setViewYear] = useState(new Date().getFullYear());
const [viewMonth, setViewMonth] = useState(new Date().getMonth()); // 0-indexed
```

Prev/Next buttons change month (clamp at current month — don't allow navigating into the future).

---

**Calendar Grid Layout:**

Header row with day labels: Sun | Mon | Tue | Wed | Thu | Fri | Sat (7 columns)

For each week row, render 7 day cells. For each cell:

1. Compute the date string for that cell
2. Determine the day-of-week name (Mon, Tue, etc.)
3. Check if it's a session day: `studentBatch?.days.includes(dayName)`
4. Look up `attendanceMap[dateStr]`
5. Apply one of four visual states:

| Condition | Cell Style | Label |
|---|---|---|
| Not a session day | `bg-transparent text-so-muted opacity-30` | Date number only |
| Session day, `'present'` | `bg-so-emerald-subtle text-so-emerald font-medium rounded-lg` | Date number + ✓ check icon (size 10, bottom-right) |
| Session day, `'absent'` | `bg-so-red-subtle text-so-red font-medium rounded-lg` | Date number + × icon |
| Session day, no record (unmarked) | `bg-so-surface text-so-muted rounded-lg border border-so-border-subtle` | Date number only |
| Today | Add `ring-2 ring-so-accent` to whatever style applies | — |
| Days outside current month (padding) | Empty cell, `bg-transparent` | — |

Cell size: `h-10 w-full` (full column width), `text-sm`, centered. Keep cells compact but readable.

---

**Summary Strip (below calendar):**

```
🟢 Present: X    🔴 Absent: Y    ⬜ Unmarked: Z    📊 Attendance: X/(X+Y)%
```

Compute counts over the full displayed month. Only count session days (days where `studentBatch.days` includes that day-of-week) — non-session days are excluded from all counts. Render as a horizontal flex row of 4 stat pills using the project's card/surface tokens.

**Attendance percentage formula:** `present / (present + absent) × 100` — exclude unmarked days from denominator. If `(present + absent) === 0`, show "No data" instead of a percentage.

---

**Empty / No Data State:**

If `attendanceMap` has no entries at all for the selected month (zero session days marked in either direction), show:

```
[calendar grid still visible with all session-day cells in "unmarked" style]
[below]: "No attendance recorded for this month."
```

Still render the calendar skeleton so the grid structure is visible even with no data.

---

**Legend (small, below summary strip):**

Three small colored squares with labels: `● Present` (emerald) `● Absent` (red) `● Unmarked` (muted gray). Single row, right-aligned or centered.