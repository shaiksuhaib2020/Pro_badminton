## Dashboard Redesign — Detailed Implementation Plan

---

### 1. Filter Navigation Bar

Sits at the top right of the Dashboard, replacing the current three-button group.

**Visual structure:**
```
[ Day ]  [ Week ]  [ Month ]        <  16 Mon · November 2026  >
```

The left side is the mode selector — three pill buttons, active mode highlighted. The right side is the navigator — back arrow, formatted label, forward arrow.

**Label format per mode:**

| Mode | Format | Example |
|---|---|---|
| Day | `D DayName · Month YYYY` | `16 Mon · November 2026` |
| Week | `D DayName Mon – D DayName Mon` | `10 Mon Nov – 16 Sun Nov 2026` |
| Month | `Month YYYY` | `November 2026` |

Week starts Monday. Pressing `<` on week view jumps to `3 Mon Nov – 9 Sun Nov`. Pressing `<` on month view jumps to `October 2026`. Day view increments one day at a time.

**Constraints:** No future navigation beyond today. The `>` arrow is disabled when the current period includes today. Custom and Year modes are permanently dropped.

---

### 2. KPI Cards (Top Row)

Four cards. Three are filter-driven, one is a live snapshot.

| Card | Behavior |
|---|---|
| Collected This Month | Renamed to **Collected**. Total paid in the selected period |
| Pending Dues | Total outstanding dues whose due date falls in the selected period |
| Active Members | Live snapshot — does not change with filter navigation |
| Overdue | Students whose fee has lapsed as of the **last day of the selected period** — if navigating into the past, this reflects what overdue looked like at that point |

---

### 3. Activity Strip

Renamed from "Today at a Glance" → **"Activity"**. Internal date navigator removed entirely — the global filter drives it.

**Counters row:**

| Counter | Old name | New name |
|---|---|---|
| Enrollments | Enrollments | Enrollments |
| Dropouts | Dropouts | Dropouts |
| Enquiries | Enquiries | Enquiries |
| Payments | Payments Today | **Payments** |
| Students with Dues | Students with Dues | Students with Dues |
| — | *(new)* | **Inactive Students** |

**Batch attendance prompt strip** (Morning Batch — Not marked yet):
Visible **only** when Day mode is active **and** the selected day is today. Hidden for all other modes and all past/future days. This is an operational action prompt, not a data display — it has no meaning outside today's context.

---

### 4. Paid Students Card

Lists every student who made a payment — full or partial — within the selected period.

**Table columns:**

| Column | What it shows |
|---|---|
| Student | Name on the first line, phone number below it in muted text |
| Amount Paid | The amount collected in that transaction. If partial, a "Due ₹X" label appears directly beneath the amount in orange/amber — same as the image |
| Date | Day and short month — `16 Nov` format |

Rows are ordered newest payment first. If two payments exist for the same student in the period, they appear as two separate rows.

**Empty state:** "No payments recorded for this period."

---

### 5. Fee Alerts Card

Renamed from Pending Students. Consolidates due-soon, pending balance, and overdue students into one proactive signal.

**Past period rule — critical:** If the selected period is entirely in the past, this card is **hidden completely**. A past period cannot reliably show who was pending at that time because students may have since paid. Showing stale dues data is misleading. The card renders only for current and future periods.

**Current and future periods — table columns:**

| Column | What it shows |
|---|---|
| Student | Name + phone number, same two-line format |
| Status | Pill label — Due Soon / Pending / Overdue |
| Amount | Outstanding amount for that student |
| Due Date | Formatted date — `16 Nov` |

Rows ordered by due date ascending — most urgent at the top. Students with overdue shown above due-soon.

**Filter behaviour:** The due date must fall within the selected period. For week view this shows who is due in that specific week. For month view, the whole month's due dates are listed. For day view, only students due on that specific day — may frequently be sparse, that is correct behavior.

---

### 6. Attendance Alerts Card

**Visual layout — two layers:**

**Layer 1 — Batch bars (always visible when data exists):**
One horizontal bar per batch. The bar fills proportionally based on attendance rate for the selected period. Label format: `Morning Batch · 78%`. Color: green above threshold, amber near threshold, red below.

For **Day mode:** bars show that day's present/absent split per batch as a simple filled bar — no percentage threshold applied. If a batch was not marked that day, the bar shows "Not marked" in muted text instead.

For **Week and Month mode:** bars show attendance rate against the configured threshold. Percentage is calculated from actual marked sessions only — unmarked days are excluded from the denominator.

**Layer 2 — Flagged students list (below the bars):**
Only students below the threshold appear here. Never the full roster.

| Column | What it shows |
|---|---|
| Student | Name + batch name below in muted text |
| Rate | Their attendance percentage for the period — `42%` |
| Sessions | Attended / Total — `5/12` |

For Day mode this layer is replaced by a simple absent list — students marked absent that day, grouped by batch.

**Empty state:** "All students attending regularly" with a checkmark. The card always renders — it never disappears — but signals green when nothing needs attention.

---

### 7. Batch Revenue Card

Remove the batch revenue card 
uild Activity strip — rename, add Inactive Students, wire attendance prompt rule |