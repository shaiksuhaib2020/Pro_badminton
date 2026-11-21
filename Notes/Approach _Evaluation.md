## Void Transaction Behaviour 
 And when void a transaction, when I delete a transaction in the recent tab or in the paid tab, So instead the behavior should be whatever the transaction, whatever the receipt is voided, there should be a red line mark and a red transparent line in the row to showcase it is deleted and it should not be reflected in the dashboard.


## Membeship perdiod Without Issuing Fee Reciept 
**My recommendation is to add an optional “Assigned membership period” to the student profile, and display it only in Pending’s existing no-receipt branch.** Keep receipt-backed membership exactly as it is.

Your concern about where the sources merge is correct. A separate table column would not protect the business logic; keeping the underlying fields separate will.

I inspected enrollment, student queries, Pending selection/sorting, reminders, and receipt defaults. The existing code already has the branch you need:

- With a membership receipt: use receipt coverage and existing due-soon/overdue eligibility.
- Without a membership receipt: show the active student in academy/batch Pending as “New.”

So this can be a contained extension, without redesigning membership.

**1. Enrollment experience**

In the Coaching tab, add an unchecked checkbox:

> **Fee not paid yet — assign membership period**

When selected, reveal:

- **Assigned start date**
- **Assigned next due date**

Helper text:

> Records the intended period only. Payment is recorded separately through Collect Fee.

Both dates are required when checked; the next due date must follow the start date. Use the same date-boundary convention as receipts, avoiding a separate interpretation of an inclusive “end date.”

The student remains administratively **Active**, as unpaid enrollments already do. The assigned dates do not change global student status or attendance eligibility.

**2. Pending display**

Keep the current five columns. Within the existing Due Date cell, distinguish the source visibly:

| Student situation | Due Date cell | Pending eligibility |
|---|---|---|
| Active receipt with coverage | Existing date and Due/Overdue label | Existing rules |
| No active receipt, assigned period exists | Assigned date, **Unpaid** tag, small “Assigned period” label | Immediately, regardless of how far away the date is |
| No active receipt, no assigned period | **— New** | Existing behavior |

For the assigned case, show the start date as a small secondary line if the full range needs to be visible. No additional column is necessary.

One wording distinction matters: **being unpaid and reaching the end of an assigned period are different facts.** A student can owe their first payment today even when the assigned period ends next month.

Therefore, I recommend:

> **01 Dec, 2026 · Unpaid**  
> Assigned period: 01 Nov–01 Dec  
> Ends in 14d

After the boundary, use **“Period ended 2d ago.”**

Your proposed “Due in / Overdue” labels are technically possible within this branch, but they imply that the assigned date is also the agreed payment deadline. I would only use them if that is explicitly the academy’s intended meaning. Adding a separate payment-deadline field is unnecessary for this requirement.

Keep Amount as **—**, consistent with current unpaid enrollment behavior. Assigning dates does not establish a charge or outstanding balance.

**3. Keep the separation in storage, not just presentation**

The smallest durable model is **two nullable date fields on the student record** for the assigned period.

They must remain separate from:

- `membershipStartDate`
- `nextDueDate`
- `membershipReceiptId`
- Receipt balances and `pendingAmount`

The query should return the new fields separately. It must never fill the existing membership fields with assigned dates.

In particular, avoid a global rule such as “receipt due date, otherwise assigned due date.” That would spread the new meaning into status derivation, dashboards, and other consumers.

Only the no-receipt Pending presentation and initial receipt defaults need to read these dates. No new membership table, payment type, status enum, or saved “Unpaid” boolean is needed.

**4. What happens when payment arrives**

Clicking **Collect Fee** opens the existing receipt modal:

- With active receipt coverage: retain current defaults.
- Without active receipt coverage, with an assigned period: prefill both coverage dates from that period.
- Without either: retain current enrollment-date fallback.

The user can review and change the dates. Payment date remains independent—paying several days later must not automatically shift the requested coverage.

After successful receipt creation, receipt coverage becomes authoritative. Partial payment follows the existing rules: it establishes coverage and its remaining balance appears in Partially Paid.

**Retire the assigned period when that receipt is successfully created.** Receipt creation and clearing the assignment should succeed together in the database. Otherwise, a later void could unexpectedly resurrect an old assignment. Failed collection must preserve the assignment.

**5. Small lifecycle rules prevent future ambiguity**

- Allow correction/removal through the existing student edit flow while the assignment is applicable; no separate management screen.
- Re-enrollment should explicitly set a fresh assignment or leave it empty, rather than inherit an earlier enrollment’s dates.
- Inactive/dropout students remain excluded from Pending under current rules.
- A voided receipt should not automatically recreate the retired assignment.
- Keep the individual profile’s financial-history exclusion for no-receipt placeholders; academy and batch Pending display the assignment.
- Reminders for assigned students can mention the requested period and unpaid fee, without claiming a recorded amount or payment deadline.

For sorting, use the assigned boundary only for assigned no-receipt rows. Receipt-backed rows retain their existing date and tie-break rules; unassigned New rows retain enrollment-time ordering. Rows may move relative to newly dated students, but recurring students’ ordering rules remain unchanged.

**The implementation plan would be:** add the two fields and validation; extend enrollment/edit persistence; map them separately; extend Pending display/sorting and unpaid reminder wording; prefill receipt dates and retire the assignment safely.

Verification should cover existing recurring students, unchecked enrollment, assigned unpaid enrollment, late payment, partial payment, failed payment, voiding, and re-enrollment. Dashboard accounting, receipt-derived status, and attendance must continue ignoring assigned dates.

This gives you a visible unpaid membership period with a small, explicit boundary around it. No code or files were changed.
**Yes, this is achievable. Renaming “Due Date” to “Validity” and showing a date range for both cases is a sensible approach.** The same column can display two separate sources without combining their business logic.

The separation you highlighted is the essential safeguard: assigned dates remain independent student fields; receipt-backed membership fields continue to come exclusively from receipts. Annotation 1

The **Validity** cell would follow this order:

| Condition | Validity display | Source |
|---|---|---|
| Student has an active coverage receipt | Receipt start → next due date, with existing Due/Overdue indicator | Existing receipt-backed membership fields |
| No active coverage receipt, assigned dates exist | Assigned start → assigned end, with **Unpaid · Assigned** label | Separate assignment fields |
| No active coverage receipt or assigned dates | **— New** | Existing fallback |

**The receipt branch always takes priority.** Even if assignment fields happen to exist on a regular student, that branch never reads them.

For recurring students, the only intended change is visual: the column now shows their existing membership start date alongside their existing next due date. Their:

- Due date and status calculation stay unchanged.
- Eligibility for Pending stays unchanged.
- Sorting and reminder rules stay unchanged.
- Collect Fee defaults, receipt amounts, and balance calculations stay unchanged.

For unpaid students, the assigned period is descriptive information. They appear in Pending immediately and remain administratively active. Their assigned end date does **not** become `nextDueDate`, create debt, or change their global status.

**For the smallest first implementation, I recommend leaving Pending sorting unchanged for everyone.** Assigned students would keep their existing enrollment-time position; their validity range adds information without introducing another behavioral change. Sorting by assigned end date can be considered separately if you later need it.

One wording detail: **“Validity” alone could make an assigned period look like confirmed receipt coverage.** Keeping the visible **Unpaid · Assigned** label solves that. Receipt-backed rows should retain their existing indicators; they should not automatically receive a “Paid” tag, since a receipt may represent partial payment.

So the proposed boundary is straightforward: **one shared column, separate source-specific rendering, and no assignment fallback inside the shared membership model.** We can preserve recurring students’ behavior by design, then verify it with regression checks before calling the implementation complete.

No code or files changed.