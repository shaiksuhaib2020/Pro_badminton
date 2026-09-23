
---

## Step 1 — Settings: Remove Court Plans Section

**Target file:** `src/app/(management)/settings/page.tsx`

**What to do:**

The Court Membership section in Settings currently has two parts: (a) the ON/OFF toggle, and (b) a Court Plans CRUD block (a form to add new plans + a list of existing plans with delete actions). Remove part (b) entirely. Only the toggle should remain.

Specifically, delete:
- All `newPlan` form state (`useState` for plan name, type, price, duration, sessions, validity)
- The "Add Court Plan" form JSX block
- The `mockCourtPlans` list render (the map over plans showing name/type/price with a Delete button)
- The `handleAddPlan` and `handleDeletePlan` handler functions
- Any heading/divider that was introduced solely to separate the Plans section from the toggle

**What stays:** The single card/row that contains the toggle label ("Court Membership") and the ON/OFF switch tied to `mockSettings.courtMembershipEnabled`. Tighten any padding/margin left behind by the removed block.

**No changes to `mock-data.ts`** — `mockCourtPlans` and the `CourtPlan` type can remain (they're referenced in modal components). This is a UI-only removal.

---

## Step 2 — Members Page (Coaching): Tab Labels + Three-Dot Menu Completeness

**Target file:** `src/app/(management)/students/page.tsx`

**2a. Tab display labels (coaching segment only):**

Find the tab button rendering for the coaching segment. Two label strings need updating:
- `"On Hold"` → `"Inactive"`
- `"Off-Court"` (display text, not the internal state value) → `"Dropout"`

Internal state values `'inactive'` and `'dropout'` stay unchanged.

**2b. Three-dot menus — make them context-aware per tab:**

The 3-dot (`MoreVertical`) menus currently show incomplete options. Replace with the following per-tab sets:

**Active tab 3-dot menu:**
```
Move to Inactive    → sets student.status = 'inactive'
Move to Dropout     → sets student.status = 'dropout'
─── (divider) ───
Delete Permanently  → existing inline confirm pattern
```

**Inactive tab 3-dot menu:**
```
Move to Active      → sets student.status = 'active'
Move to Dropout     → sets student.status = 'dropout'
─── (divider) ───
Delete Permanently  → existing inline confirm pattern
```

**Dropout tab 3-dot menu:**
```
Move to Active      → sets student.status = 'active'
Move to Inactive    → sets student.status = 'inactive'
─── (divider) ───
Delete Permanently  → existing inline confirm pattern
```

Each status-move handler should mutate the student object in `mockStudents`, then call `forceUpdate()`. No confirmation dialog needed for status moves (they're reversible). Delete Permanently keeps its existing inline Yes/No confirm.

**2c. Remove the standalone "Reactivate" button** from the Inactive tab row — it's now redundant since "Move to Active" in the 3-dot menu covers it. This cleans up the action column.

---

## Step 3 — Members Page (Court Segment): Log In + Undo Notification

**Target file:** `src/app/(management)/students/page.tsx` (court segment section)

**3a. Rename button:** Change the label `"Check In"` → `"Log In"` on session-based court member rows.

**3b. State additions** (at the top of the component, near other `useState` declarations):

```typescript
const [loggedInMemberId, setLoggedInMemberId] = useState<string | null>(null);
const logInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Add `useRef` to the React import if not already present.

**3c. Log In handler** (replaces or wraps any existing check-in handler):

```typescript
const handleLogIn = (member: CourtMember) => {
  // Deduct session
  member.remainingSessions = (member.remainingSessions ?? 0) - 1;
  // Append to checkInHistory
  member.checkInHistory.push({
    id: Date.now().toString(),
    date: getTodayIST(),
    sessionsAfter: member.remainingSessions,
  });
  // Recalculate status
  if (member.remainingSessions <= 0) member.status = 'exhausted';
  else if (member.remainingSessions <= 2) member.status = 'sessions-low';
  else member.status = 'active';
  // Show undo strip — auto-dismiss after 5s
  setLoggedInMemberId(member.id);
  if (logInTimerRef.current) clearTimeout(logInTimerRef.current);
  logInTimerRef.current = setTimeout(() => setLoggedInMemberId(null), 5000);
  refresh(); // forceUpdate
};
```

**3d. Undo handler:**

```typescript
const handleUndoLogIn = (member: CourtMember) => {
  const last = member.checkInHistory.at(-1);
  if (!last) return;
  member.checkInHistory.pop();
  member.remainingSessions = (member.remainingSessions ?? 0) + 1;
  // Recalculate status after restore
  if (member.remainingSessions <= 2) member.status = 'sessions-low';
  else member.status = 'active';
  setLoggedInMemberId(null);
  if (logInTimerRef.current) clearTimeout(logInTimerRef.current);
  refresh();
};
```

**3e. Cleanup on unmount:**

```typescript
useEffect(() => {
  return () => { if (logInTimerRef.current) clearTimeout(logInTimerRef.current); };
}, []);
```

**3f. Row UI change:**

When `loggedInMemberId === member.id`, replace the "Log In" button in that row's action column with a contextual success strip:

```tsx
<div className="flex items-center gap-2 rounded-md bg-so-emerald-subtle px-3 py-1.5 text-sm text-so-emerald">
  <CheckCircle size={14} />
  <span>Session logged · {member.remainingSessions} left</span>
  <button
    onClick={() => handleUndoLogIn(member)}
    className="ml-2 text-xs font-medium underline text-so-muted hover:text-so-text"
  >
    Undo
  </button>
</div>
```

When `loggedInMemberId !== member.id`, show the normal `"Log In"` button as before.

---

## Step 4 — Create `RenewCourtMemberModal` + Wire into Court Pending Tab

**4a. Create new file:** `src/components/court/RenewCourtMemberModal.tsx`

**Props:**
```typescript
{
  member: CourtMember;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Structure:** Mirror the AddMemberModal's plan selection UI closely.

- **Header:** "Renew Membership" with the member's name as subtitle
- **Plan Type segmented control** (Sessions | Monthly) — identical pill-style toggle to AddMemberModal
  - Default: whichever `member.planType` currently is
- **Sessions tab fields:**
  - Sessions stepper (`+` / `-` with a numeric display, min 1) — label "Sessions"
  - Price field (manual number input, pre-fill from the last known amount or `0`)
  - Validity days field (manual number input)
- **Monthly tab fields:**
  - Duration stepper (months, min 1)
  - Price field (manual number input)
- **Partial Payment toggle** (checkbox or toggle): "Pay Partial"
  - When ON: show "Amount Paying (₹)" input beneath price; show "Remaining: ₹X" in muted text
  - Remaining = price − amountPaying
- **Payment method:** Cash / UPI / Card / Other (same segmented or pill row used elsewhere)
- **Note field:** optional single-line text input

**On confirm logic:**
- Sessions tab: add `sessions` to `member.remainingSessions`; push a `CourtPaymentEntry` with `entryType: 'session-topup'`; update status appropriately
- Monthly tab: compute new `nextDueDate` by adding duration months to today; push entry with `entryType: 'renewal'`; set `member.status = 'active'`
- Both: set `member.amountPaid += amountPaying (or full price if not partial)`; if partial, set `member.pendingAmount = remaining`

Note: If `CourtMember` doesn't already have a `pendingAmount` field, add `pendingAmount?: number` to its type in `mock-data.ts`.

**4b. Wire into `transactions/page.tsx` (Court Pending tab):**

Add `RenewCourtMemberModal` import. Add state:
```typescript
const [renewingCourtMember, setRenewingCourtMember] = useState<CourtMember | null>(null);
```

Replace all three existing action buttons in the Court Pending tab with a single action:

| Current | New |
|---|---|
| Monthly expired → "Renew" → `CollectCourtPaymentModal` | → opens `RenewCourtMemberModal` |
| Monthly due-soon → "Collect" → `CollectCourtPaymentModal` | → opens `RenewCourtMemberModal` |
| Sessions exhausted → "Buy Sessions" → `BuySessionsModal` | → opens `RenewCourtMemberModal` |

Button label can remain contextual ("Renew" for monthly, "Buy Sessions" for session members) — but they all open the same modal now.

Render the modal at the bottom of the JSX:
```tsx
{renewingCourtMember && (
  <RenewCourtMemberModal
    member={renewingCourtMember}
    onClose={() => setRenewingCourtMember(null)}
    onSuccess={() => { setRenewingCourtMember(null); refresh(); }}
  />
)}
```

Remove imports of `CollectCourtPaymentModal` and `BuySessionsModal` from `transactions/page.tsx` — they're no longer used there.

---

## Step 5 — Add Partial Payment to `AddMemberModal`

**Target file:** `src/components/court/AddMemberModal.tsx`

Add partial payment support to match the `RenewCourtMemberModal` built in Step 4.

**State additions:**
```typescript
const [isPartial, setIsPartial] = useState(false);
const [amountPaying, setAmountPaying] = useState<number>(0);
```

Reset both to defaults when the plan type segmented control is switched.

**UI — insert immediately after the Price input field (in both Sessions and Monthly tab views):**

```tsx
{/* Partial Payment */}
<div className="flex items-center gap-2 pt-1">
  <input
    type="checkbox"
    id="courtPartial"
    checked={isPartial}
    onChange={e => { setIsPartial(e.target.checked); setAmountPaying(0); }}
    className="accent-so-accent"
  />
  <label htmlFor="courtPartial" className="text-sm text-so-muted cursor-pointer">
    Pay Partial
  </label>
</div>
{isPartial && (
  <div className="space-y-1">
    <label className="text-xs font-medium text-so-text">Amount Paying (₹)</label>
    <input
      type="number"
      min={0}
      max={price}
      value={amountPaying}
      onChange={e => setAmountPaying(Number(e.target.value))}
      className="w-full rounded-lg border border-so-border px-3 py-2 text-sm"
    />
    <p className="text-xs text-so-muted">
      Remaining: {formatCurrency(Math.max(0, price - amountPaying))}
    </p>
  </div>
)}
```

**On submit logic update:**

```typescript
const finalPaid = isPartial ? amountPaying : price;
const pendingAmount = isPartial ? price - amountPaying : 0;

// When constructing the new CourtMember object:
const newMember: CourtMember = {
  ...
  amountPaid: finalPaid,
  pendingAmount,           // add this field if not present
  paymentHistory: [{
    ...
    amount: finalPaid,
  }],
};
```

**`mock-data.ts` change (if needed):** Add `pendingAmount?: number` to the `CourtMember` type definition. No seed data change required.

---
