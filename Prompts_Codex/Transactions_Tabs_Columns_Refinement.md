
# Coaching Fee Transactions Page — UI Refinement

It's time to refine the columns of the Coaching Fee Transactions page. We will refine the following four tabs:

- Recent
- Paid
- Pending
- Partially Paid

---

## 1. Recent Tab

### Column Structure and Order

| Sr. No. | Column Name |
|---|---|
| 1 | Name |
| 2 | Phone Number |
| 3 | Amount Paid |
| 4 | Date |
| 5 | Payment For |
| 6 | Mode |
| 7 | Action |

### Required Changes

#### Name
- Rename the existing `Student` column to `Name`.
- Separate the phone number from the student name.

#### Phone Number
- Create an isolated Phone Number column beside the Name column.

#### Amount Paid
- Rename the existing `Received` column to `Amount Paid`.
- Add a small inline tag underneath the paid amount for students who have made partial payments.
- The tag should only appear when there is a remaining amount.

Conditional rendering:

```jsx
remaining_amount > 0 ? (
  <span className="text-amber-600 text-xs">
    Due ₹{remaining_amount}
  </span>
) : null
```

- No new column.
- No schema change.
- The common case stays a single clean number.

#### Date
- Represents the date on which the payment was received.
- Move the Date column after the Amount Paid column, as it is currently the first column in the table.

#### Payment For
- Rename the existing `Coverage` column to `Payment For`.
- Display dates in a readable format instead of the slash-separated calendar format.

Example:

- Required: `12 Nov, 2026`
- Avoid: `12/11/2026`

#### Mode
- Keep the existing functionality unchanged.

#### Action
- Keep the existing action functionality unchanged.
- Replace the current `Void` text with a delete icon (bin icon).

### Columns to Hide from the UI

- Type
- Status

These columns should only be hidden from the UI and should not be removed from the database.

---

## 2. Paid Tab

Apply the same changes made to the Recent tab to the Paid tab.

### Column Structure and Order

| Sr. No. | Column Name |
|---|---|
| 1 | Name |
| 2 | Phone Number |
| 3 | Amount Paid |
| 4 | Date |
| 5 | Payment For |
| 6 | Mode |
| 7 | Action |

All renaming, conditional rendering, date formatting, action icon changes, and UI column visibility changes should remain consistent with the Recent tab.

---

## 3. Pending Tab

### Column Structure and Order

| Sr. No. | Column Name |
|---|---|
| 1 | Name |
| 2 | Phone Number |
| 3 | Amount |
| 4 | Due Date |
| 5 | Action |

### Required Changes

#### Name
- Display the student name in an isolated column.

#### Phone Number
- Separate the phone number from the Name column.

#### Amount
- Display the pending fee amount when a student passes the membership validity date associated with the previously generated fee receipt.

#### Due Date
- Add a Due Date column representing the membership validity date.
- Use a readable date format rather than a slash-separated format.

Example: `12 Nov, 2026`

- For newly enrolled students who do not have a previous fee receipt, display a simple hyphen (`-`).

##### Inline Status Badges

The Due Date column should contain a small inline status badge based on the student's condition.

| Badge | Color | Condition |
|---|---|---|
| New | Grey | No fee receipt has been generated yet |
| Due in 2d | Amber | Payment due soon |
| Overdue 12d | Red | Payment overdue, with the number of days |

The day count should reflect the actual number of days remaining or overdue.

#### Action

The Action column should contain two quick actions:

**1. Collect Fee**
- Retain the existing functionality.

**2. Remind Now**
- Add a new quick action.
- When clicked, redirect to WhatsApp using the specific student's mobile number to send a fee reminder message.

### Columns to Hide from the UI

- Batch
- Next Due
- Expected Fee

These columns should only be hidden from the UI.

---

## 4. Partially Paid Tab

### Column Structure and Order

| Sr. No. | Column Name |
|---|---|
| 1 | Name |
| 2 | Phone Number |
| 3 | Amount Paid |
| 4 | Due Amount |
| 5 | Payment For |
| 6 | Outstanding Since |
| 7 | Action |

### Required Changes

#### Name
- Display the student's name in an isolated column.

#### Phone Number
- Separate the phone number from the Name column.

#### Amount Paid
- Display whatever amount the student has already paid partially.

#### Due Amount
- Display the remaining partial payment amount.

#### Payment For
- Rename the existing `Coverage` column to `Payment For`.

#### Outstanding Since
- Merge the existing Receipt Date with the payment aging information.
- Follow the same aging pattern as the Overdue badge.

Example:

`28 Oct 2026 · 17d`

This is the real urgency signal — a ₹500 due for 2 days and a ₹500 due for 60 days are not the same problem, and right now nothing on the row tells you which one this is.

#### Action

The Action column should contain two quick actions:

**1. Collect Remaining**
- Retain the existing functionality.

**2. Remind Now**
- Add the same WhatsApp reminder functionality introduced in the Pending tab.
- Redirect to WhatsApp using the specific student's mobile number.

---

## 5. Implementation Requirements

- Strictly maintain the specified column order across all four tabs.
- Maintain consistent naming conventions.
- Maintain consistent date formatting.
- Keep inline tags compact and visually clean.
- Use conditional rendering wherever applicable.
- Hide the specified columns from the UI without removing them from the database.
- Preserve existing functionality unless a specific change has been requested.
- No unnecessary schema changes.
- Ensure consistency across all four tabs


  ## When you're done: report back
Please finish with a brief, plain-English report I can use for documentation. Keep it factual and short:

1. **What changed, in a few lines.** The behavior before and after, and any place you chose a different approach than I recommended, with the reason.
2. **Files changed.** Group them by area (database, queries, server actions, pages and components, utilities and types, docs). For each file, say whether it was added, modified, renamed or deleted, with one line on what changed.
3. **CRUD operations.** For each feature (enroll student, re-enroll, fee receipt, settle due, void receipt, adjust due date, student and transaction lists), list which tables or views are read, created, updated or deleted. Say whether it happens through a server action, an RPC, a trigger or a query.
4. **Business rules and edge cases.** Which ones are now enforced, and where (database, server action or UI).
5. **Loose ends.** Anything left unfinished, any assumption you made, any legacy-data issue, and anything that needs my decisi6n.
6. **Doc updates.** Whether you updated the architecture and structure docs, and which secti7ns.
7. **Verification.** What you ran and tested (type check, flows walked through) and the results.
