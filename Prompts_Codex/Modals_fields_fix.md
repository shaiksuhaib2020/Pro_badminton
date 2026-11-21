# Student Enrollment, Fee Receipt & Due Clearance Model Refinements

Okay, so step by step, turn by turn, we will fix the issues.

## 1. Refine the Enroll Student Model (Add Student Model)

First, we will refine the Enroll Student model, which is the Add Student model.

In that model, we will have **vertical tabs**. One will be Personal Details and another will be Coaching Details.

### 1.1 Personal Details Tab

The fields will be:

- Name
- Phone Number
- Guardian Name
- Alternative Phone Number
- Date of Birth
- Address
- Email

### 1.2 Coaching Details Tab

The fields will be:

- Fees
- Batch
- Joining Date
- Enroll Days
- Enrollment Source
- Notes

**Enroll Days** field will have the following options:

- Monday
- Tuesday
- Wednesday
- Thursday
- Friday
- Saturday
- Sunday

---

## 2. Refine the Fee Receipt Model

It's time to refine some fields of the Fee Receipt model as well.

### 2.1 Student Information

The Name and Phone Number will remain as usual, displayed in the small area card.

### 2.2 Payment For (Label, Not a Field)

Then comes the label **Payment For**, where there will be:

- Start Date (currently named Coverage Start, which is not user-friendly to understand).
- Next Due Date.

So, it's basically from this specific date to this specific date that you are paying the amount.

Remove the **+3 Months** option.

### 2.3 Amount

There will be a field of **Amount** (currently it's not there).

### 2.4 Partial Payment

Then there will be a tick box for **Partial Payment**.

When we click that tick box, two fields will appear:

- Paying Now
- Partial Due

The user can enter the Paying Now amount, and Partial Due will be automatically calculated when the user enters the Paying Now amount.

The Paying Now amount must not be greater than the main Amount.

I hope you got my point.

### 2.5 Amount Received On

The Amount Received On field will remain the same, with its default value set to today's date in IST.

### 2.6 Payment Mode

Then comes Payment Mode.

It will be a dropdown with the following options:

- Cash
- UPI
- Card
- Other

### 2.7 Transaction ID

Then comes Transaction ID (currently not there; needs to be added).

### 2.8 Notes

The Notes field will remain the same.

**Important:** Transaction ID, Payment Mode, and Notes will remain optional, but do not add an optional label beside those fields.

---

## 3. Small Modification to DueClearanceModal

### 3.1 Rename Amount Received

Amount Received will be renamed in the UI as **Partial Due Amount**.

That will be the outstanding amount from the Fee Receipt if the user has entered the Partial Due Amount by selecting the Partial Payment option.

We already have the `settles_payment_id` field in the database, which acts as a foreign key relationship to `public.student_payments.id`.

### 3.2 Lock Partial Due Amount

The Partial Due Amount will be locked with the outstanding balance so that it cannot be changed.

If changed, that will cause miscalculation in the ledger.

We will also add a **Transaction ID** field.

### 3.3 Student Information Card Modifications

One more thing: the name is already there in the card, which is logged and showing, and Outstanding on This Receipt is also there.

Another thing that should be shown is **Paid Already**.

This is the amount that was paid earlier in the Paying Now field.

Another thing that will be shown in the card is:

**Payment For:** The date range (Start Date to Next Due Date) for which the student has already paid the amount earlier.

In short, the card will show:

- Name
- Outstanding Amount
- Already Paid Amount
- Payment For (date range)

These fields will be **non-editable**, for showcase purposes only. Everything else remains the same.

---

## 4. Scope of Changes

So, these were the changes we are going to perform in:

1. Add Student Model
2. Due Clearance Model
3. Fee Receipt Model

## 5. Next Discussion

In the next turn, we will decide what columns we need to showcase in the following tabs:

- Recent
- Paid
- Pending
- Partially Paid

 ## When you're done: report back
Please finish with a brief, plain-English report I can use for documentation. Keep it factual and short:

1. **What changed, in a few lines.** The behavior before and after, and any place you chose a different approach than I recommended, with the reason.
2. **Files changed.** Group them by area (database, queries, server actions, pages and components, utilities and types, docs). For each file, say whether it was added, modified, renamed or deleted, with one line on what changed.
3. **CRUD operations.** For each feature (enroll student, re-enroll, fee receipt, settle due, void receipt, adjust due date, student and transaction lists), list which tables or views are read, created, updated or deleted. Say whether it happens through a server action, an RPC, a trigger or a query.
4. **Business rules and edge cases.** Which ones are now enforced, and where (database, server action or UI).
5. **Loose ends.** Anything left unfinished, any assumption you made, any legacy-data issue, and anything that needs my decisi6n.
6. **Doc updates.** Whether you updated the architecture and structure docs, and which secti7ns.
7. **Verification.** What you ran and tested (type check, flows walked through) and the results.