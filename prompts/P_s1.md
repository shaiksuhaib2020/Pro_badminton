Single clean step.

---

## Step — Multi-Branch Feature Gating: Mock Flag + Settings Toggle + Conditional TopBar Switcher

---

### Part 1 — Add `multiBranchEnabled` to mock settings

**Target:** `src/lib/mock-data.ts`

Add one field to the existing `mockSettings` object:

```typescript
multiBranchEnabled: false,   // hidden by default — premium feature
```

Also update the `Settings` type definition to include:
```typescript
multiBranchEnabled: boolean;
```

No other changes to mock data.

---

### Part 2 — Multi-Branch toggle in `AcademySection.tsx`

**Target:** `src/app/(management)/settings/_components/AcademySection.tsx`

The Features block already has the Court Membership toggle. Add a second toggle row directly below it, same pattern:

```
Features
─────────────────────────────────────────────────────────
[toggle]  Court Membership
          Enable the court module for session and monthly access plans

[toggle]  Multi-Branch
          Manage multiple branch locations from one account.
          When enabled, branch management appears in Settings and a
          branch switcher becomes available across the app.
```

Toggle behaviour:
- Reads from `mockSettings.multiBranchEnabled`
- On change: update `mockSettings.multiBranchEnabled = !mockSettings.multiBranchEnabled` and call `forceUpdate`
- No confirmation dialog — it's a simple flag for now

---

### Part 3 — Gate `BranchesSection` in `settings/page.tsx`

**Target:** `src/app/(management)/settings/page.tsx`

Wrap `<BranchesSection />` in a conditional. Import `mockSettings`:

```tsx
import { mockSettings } from '@/lib/mock-data'

// In JSX — replace the unconditional render:
{mockSettings.multiBranchEnabled && <BranchesSection />}
```

When `multiBranchEnabled` is false (the default), the entire Branches section is invisible. When toggled on in AcademySection, it appears. Since `AcademySection` and `settings/page.tsx` both run client-side and share the mock object, the conditional will re-evaluate correctly after toggle if `page.tsx` also has a `forceUpdate` or uses a shared refresh callback.

**Fix:** Pass a `onSettingsChange` callback prop from `page.tsx` down to `AcademySection` that triggers a `forceUpdate` in the parent page — this ensures the page re-renders and the `BranchesSection` conditional is re-evaluated when the toggle fires.

```tsx
// settings/page.tsx
const [, forceUpdate] = useState(0)

// Pass to AcademySection:
<AcademySection onSettingsChange={() => forceUpdate(n => n + 1)} />

// AcademySection calls props.onSettingsChange() after toggling either feature flag
```

---

### Part 4 — TopBar: Conditional Branch Switcher

**Target:** `src/components/layout/TopBar.tsx`

Replace the current static branch pill with logic-driven rendering. Add state:

```typescript
const [activeBranchId, setActiveBranchId] = useState<string>(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ezyfee_active_branch') 
      ?? mockBranches.find(b => b.isPrimary)?.id 
      ?? ''
  }
  return ''
})
const [dropdownOpen, setDropdownOpen] = useState(false)
```

Add a handler:
```typescript
const handleBranchSwitch = (branchId: string) => {
  setActiveBranchId(branchId)
  localStorage.setItem('ezyfee_active_branch', branchId)
  setDropdownOpen(false)
  // NOTE: activeBranchId feeds into Supabase query filters in the wiring phase.
  // Pages do not filter by branch yet — that wires in during migration.
}
```

**Rendering logic — three cases:**

**Case 1 — Multi-branch disabled (default):**
Render nothing. No pill, no text, no UI. Clean topbar.
```tsx
if (!mockSettings.multiBranchEnabled) return null // (from a BranchDisplay component)
```

**Case 2 — Multi-branch enabled, only one active branch:**
Render plain read-only pill (no dropdown):
```tsx
<span className="text-sm text-so-muted border border-so-border bg-so-surface rounded-full px-3 py-1">
  {activeBranch?.name}
</span>
```

**Case 3 — Multi-branch enabled, two or more active branches:**
Render clickable dropdown pill:
```tsx
<div className="relative">
  <button
    onClick={() => setDropdownOpen(o => !o)}
    className="flex items-center gap-1.5 text-sm text-so-text border border-so-border bg-so-surface rounded-full px-3 py-1 hover:bg-so-border transition-colors"
  >
    <span>{activeBranch?.name}</span>
    <ChevronDown size={13} className="text-so-muted" />
  </button>

  {dropdownOpen && (
    <div className="absolute left-0 top-full mt-1 z-50 bg-so-card border border-so-border rounded-xl shadow-md min-w-[180px] py-1">
      {activeBranches.map(branch => (
        <button
          key={branch.id}
          onClick={() => handleBranchSwitch(branch.id)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-so-surface text-so-text"
        >
          <span>{branch.name}</span>
          {branch.id === activeBranchId && <Check size={13} className="text-so-accent" />}
        </button>
      ))}
    </div>
  )}
</div>
```

The dropdown should close when clicking outside — add a `useEffect` with a `mousedown` listener that checks `ref.contains(event.target)` and sets `setDropdownOpen(false)`.

Place the branch switcher to the **left of `LiveClock`** in the topbar. Import `mockSettings` and `mockBranches` directly from `@/lib/mock-data`.