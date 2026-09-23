Three targeted fixes. Concise prompt:

---

**Fix — Batch Transaction Columns + Collect Remaining Modal**

---

## Fix 1 — Batch transaction tab columns match Fee Transactions page exactly

**File: `src/app/(management)/batches/[id]/page.tsx`** — Transactions tab

The Transactions tab currently has its own column layout. Replace it to exactly mirror `src/app/(management)/transactions/page.tsx`.

Read the transactions page first. Then in the batch detail Transactions tab, apply the identical column structure for each of the four tabs:

- **Recent:** Name · Phone · Date · Amount · Type · Method · Status
- **Paid:** Name · Phone · Date · Amount · Method · Void action
- **Pending:** Name (with Overdue/Due Soon badge + days label) · Phone · Due Date · Amount · Collect Payment action
- **Partially Paid:** Name · Phone · Date · Paid · Remaining · Method · Collect Remaining action

Same column widths, same badge colors, same empty states. The only difference is data is filtered to `batchStudents` IDs — the rendering is identical.

Apply this same audit to **`src/app/(management)/students/[id]/page.tsx`** Transaction Details tab. Ensure its four sub-tabs use the same column structure as the global transactions page.

---

## Fix 2 — Collect Remaining opens wrong modal

**Everywhere "Collect Remaining" is triggered** (Partially Paid tab in transactions page, batch transactions tab, student profile transactions tab) — it currently opens `RenewModal` with `isCollectingRemaining=true`.

Replace this with a dedicated lightweight `CollectRemainingModal` component.

**Create: `src/components/students/CollectRemainingModal.tsx`**

Props:
```ts
type Props = {
  student: Student
  onClose: () => void
  onConfirm: (entry: PaymentEntry) => void
}
```

Modal layout (centered, `max-w-sm`):

**Header:** "Collect Remaining Payment" + X close button

**Student info card** (muted surface card inside modal):
- Left: student name (semibold) + membership type name (muted)
- Right: "Current Due Date" label + `student.nextDueDate` formatted

**Amount field:**
- Label: "TOTAL AMOUNT"
- Pre-filled input showing `student.pendingAmount` in emerald, editable (in case staff adjusts)
- `type="number"`, `min={1}`

**Payment Method pills:** Cash · UPI · Card · Other (defaults to Cash)

**Note field:** optional textarea, `max 200 chars`, counter shown, placeholder: "e.g. Paid in two instalments, parent requested receipt..."

**Footer:** Cancel button + "Confirm Payment" button (accent bg)

**On confirm:**
```ts
const entry: PaymentEntry = {
  id: crypto.randomUUID(),
  date: format(new Date(), 'yyyy-MM-dd'),
  amount: amountPaid,
  remainingAmount: 0,
  paymentType: 'full',      // collecting the remaining clears the debt
  monthsCovered: 0,         // no new period — just clearing existing debt
  paymentMethod,
  status: 'active',
  note: note.trim(),
}
onConfirm(entry)
```

**Caller side** — wherever `CollectRemainingModal` is used, the `onConfirm` handler must:
```ts
student.paymentHistory.push(entry)
student.pendingAmount = 0
// Only update status if it was due-soon/expired — set to 'active'
if (student.status === 'due-soon' || student.status === 'expired') {
  student.status = 'active'
}
// Do NOT change nextDueDate or membershipStartDate — no new period
onClose()
refresh()
```

Replace all `isCollectingRemaining` usages of `RenewModal` across all three pages/components with `<CollectRemainingModal>`.

---

## Fix 3 — Remove "Paying Partially?" from CollectRemainingModal only

The new `CollectRemainingModal` must **not** include the partial payment toggle at all — no "Paying Partially?" button, no split fields. The amount input is a single straightforward field.

The `RenewModal` retains its "Paying Partially?" toggle unchanged — do not touch `RenewModal`.

---

## Verification

1. Batch Transactions tab columns identical to global Fee Transactions page for all 4 tabs
2. Student Profile Transaction Details tab columns identical to global Fee Transactions page
3. "Collect Remaining" everywhere opens `CollectRemainingModal` — not `RenewModal`
4. `CollectRemainingModal` has no partial toggle — amount field, method, note only
5. On confirm: `pendingAmount` set to 0, status updated if expired/due-soon, `nextDueDate` unchanged
6. `RenewModal` "Paying Partially?" toggle untouched
7. `isCollectingRemaining` prop on `RenewModal` no longer used anywhere — can be cleaned up if no other callers remain