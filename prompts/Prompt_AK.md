Looking at both screenshots carefully alongside the requests. Here are 5 precise sequential agent steps.

---

## Step A — Members Page (Coaching): Remove "Total Due" Column

**Target:** `src/app/(management)/students/page.tsx` — coaching segment only

Find the coaching segment's student table (appears in Active tab; check Inactive and Dropout tabs too). In every coaching tab table:

- Remove the `TOTAL DUE` (or similar label) `<th>` from the `<thead>` row
- Remove the corresponding `<td>` cell that renders the due amount from every student `<tr>`

No logic changes — purely a column deletion. Leave all other columns (Name, Mobile, Batch, Guardian, Actions) intact.

---

## Step B — Court Transactions: Void as Dustbin Icon + Inline Confirm

**Target:** `src/app/(management)/transactions/page.tsx` — court segment, Recent and Paid tabs

**Current:** A text label/button that reads "Void" in the action column.

**New behaviour:**

1. Replace the "Void" text button with a `Trash2` icon (lucide-react, size 16). Style: `text-so-muted hover:text-so-red transition-colors cursor-pointer`.

2. Add state near other confirm states:
```typescript
const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
```

3. When the dustbin is clicked → set `voidConfirmId` to that payment entry's `id`.

4. When `voidConfirmId === entry.id`, replace the dustbin with an inline confirm strip (same pattern used for delete confirms elsewhere in the codebase):
```
"Void transaction?"   [Yes]  [No]
```
- **Yes** (red/danger style): set `entry.status = 'deleted'`, clear `voidConfirmId`, call `refresh()`
- **No**: clear `voidConfirmId` only

Apply this to both Recent and Paid tab action columns — they share the same void pattern.

---

## Step C — Court Transactions Pending Tab: Replace with `RenewCourtMemberModal`

This supersedes the Step 4 instructions from the previous session with more specific detail.

### C1. Create `src/components/court/RenewCourtMemberModal.tsx`

**Props:**
```typescript
{ member: CourtMember; onClose: () => void; onSuccess: () => void; }
```

**Layout:** Structurally identical to `AddMemberModal`. Reuse the same field layout, spacing, segmented control style, and button row. The key differences:

| Field | AddMemberModal | RenewCourtMemberModal |
|---|---|---|
| Title | "Add Court Member" | "Renew Membership" |
| Name input | Editable | Pre-filled with `member.name`, `readOnly`, visually locked (`bg-so-surface cursor-not-allowed opacity-75`) |
| Phone input | Editable | Pre-filled with `member.phone`, `readOnly`, same locked style |
| Sessions/Monthly toggle | Default: Sessions | Default: `member.planType` |
| All other fields | Same | Same |

**All other fields carry over exactly:**
- Sessions tab: sessions stepper (`+`/`-`), price input, validity days input
- Monthly tab: duration-in-months stepper, joining/start date input (default today), price input
- Partial Pay toggle + "Amount Paying" input + "Remaining: ₹X" display
- Payment method pills: Cash / UPI / Card / Other
- Optional note field
- Confirm button: "Renew Membership" | Cancel button

**On confirm logic:**
- Sessions tab: `member.remainingSessions += sessions`; push `CourtPaymentEntry` with `entryType: 'session-topup'`; recalculate status (if > 2 remaining → `'active'`, ≤ 2 → `'sessions-low'`)
- Monthly tab: compute new `nextDueDate` by adding duration months to joining date; set `member.membershipStartDate`, `member.nextDueDate`; push entry with `entryType: 'renewal'`; set `member.status = 'active'`
- Both: `member.amountPaid += amountPaying (or full price)`; if partial, set `member.pendingAmount = price - amountPaying` (add `pendingAmount?: number` to `CourtMember` type in `mock-data.ts` if not already present)

### C2. Wire into `transactions/page.tsx`

Add state:
```typescript
const [renewingCourtMember, setRenewingCourtMember] = useState<CourtMember | null>(null);
```

In the Court Pending tab, replace all three current action buttons (Renew, Collect, Buy Sessions) with a single **"Renew"** button for every row:
```tsx
<button onClick={() => setRenewingCourtMember(member)}>Renew</button>
```

Render modal at the bottom of the JSX:
```tsx
{renewingCourtMember && (
  <RenewCourtMemberModal
    member={renewingCourtMember}
    onClose={() => setRenewingCourtMember(null)}
    onSuccess={() => { setRenewingCourtMember(null); refresh(); }}
  />
)}
```

Remove `CollectCourtPaymentModal` and `BuySessionsModal` imports from `transactions/page.tsx` — they're no longer consumed there.

---

## Step D — Court Transactions Recent Tab: Hide TYPE and STATUS Columns

**Target:** `src/app/(management)/transactions/page.tsx` — court segment, **Recent tab only**

In the Recent tab table:
- Remove the `TYPE` `<th>` from the header row
- Remove the type badge `<td>` (the one rendering "RENEWAL", "NEW", etc.) from each payment row
- Remove the `STATUS` `<th>` from the header row
- Remove the status badge `<td>` from each payment row

Result: Recent tab columns become — MEMBER, PHONE, DATE, AMOUNT, METHOD, ACTION. The Paid tab retains its current column set unchanged.

---

## Step E — Court Members Page: Separate Phone Column, Remove Status Column

**Target:** `src/app/(management)/students/page.tsx` — court segment, all three tabs (Active, Inactive, Dropout)

**Current column order:** MEMBER (avatar + name + phone stacked) | PLAN | VALIDITY | STATUS | ACTION

**New column order:** MEMBER (avatar + name only) | PHONE | PLAN | VALIDITY | ACTION

Changes in every court tab table:

**Header row:**
- After the MEMBER `<th>`, insert: `<th>PHONE</th>`
- Remove the STATUS `<th>` entirely

**Each member row:**
- MEMBER `<td>`: remove the phone number from beneath the name — keep only avatar initials + name
- Insert new `<td>` immediately after MEMBER cell: `<td className="text-sm text-so-muted">{member.phone}</td>`
- Remove the STATUS badge `<td>` entirely

Apply identically to Active, Inactive, and Dropout tab tables so all three are consistent. The status is already communicated by which tab the member appears in, so the column is redundant.