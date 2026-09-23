

## Evaluation

**Expenses tab — strongly recommended ✅**

For a coaching academy, this is genuinely valuable:
- Shuttlecocks are a recurring daily cost (most academies burn 10-20 tubes/day)
- Court rent, electricity, coaching staff payments all need tracking
- Without expense tracking, owner has fee income but zero visibility into actual profit
- Categories keep it dead simple — no free-text chaos

**Income tab — useful but needs a clear boundary ✅**

Fee income is already tracked in Fee Transactions. So this tab should be explicitly for **non-fee income only** — shuttle sales to students, racket restringing charges, merchandise, equipment sales. A clear label prevents confusion. This is a real use case — many academies sell shuttles or grip tape at the front desk.

**What we're NOT building:**
- No stock count / inventory levels (too complex, wrong tool)
- No purchase orders
- No multi-user expense approval
- No accounting ledger with double-entry

Just a **date-tagged ledger** with categories. Add entry → see it in list. That's it.

---

**Turn AA — Agent Prompt: Account Manager Page**

Three files to create or modify. Read `src/lib/mock-data.ts` and `src/components/layout/Sidebar.tsx` before starting.

---

## Step 1 — Add types and mock data to `src/lib/mock-data.ts`

Add at the end of the file, after existing exports:

```ts
// ── Account Manager Types ─────────────────────────────

export type AccountEntry = {
  id: string
  date: string           // yyyy-MM-dd
  category: string
  description: string
  amount: number         // always positive
  notes?: string
}

// ── Expense categories ───────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Shuttlecocks',
  'Equipment & Gear',
  'Court Rent',
  'Coaching Staff',
  'Utilities',
  'Maintenance & Repairs',
  'Marketing',
  'Tournament Expenses',
  'Miscellaneous',
] as const

// ── Income categories (non-fee only) ─────────────────
export const INCOME_CATEGORIES = [
  'Equipment Sales',
  'Shuttle Sales',
  'Racket Restringing',
  'Merchandise',
  'Rental Income',
  'Other',
] as const

// ── Seed data ────────────────────────────────────────
export let mockExpenses: AccountEntry[] = [
  {
    id: 'exp-1',
    date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    category: 'Shuttlecocks',
    description: 'Yonex Mavis 350 — 10 tubes',
    amount: 2200,
    notes: 'For morning batch sessions',
  },
  {
    id: 'exp-2',
    date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
    category: 'Utilities',
    description: 'Electricity bill — August',
    amount: 4800,
  },
  {
    id: 'exp-3',
    date: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    category: 'Court Rent',
    description: 'Monthly court rental — August',
    amount: 18000,
  },
  {
    id: 'exp-4',
    date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
    category: 'Equipment & Gear',
    description: 'New net + posts replacement',
    amount: 3500,
  },
  {
    id: 'exp-5',
    date: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
    category: 'Shuttlecocks',
    description: 'Li-Ning A300 — 5 tubes',
    amount: 1100,
  },
  {
    id: 'exp-6',
    date: format(subDays(new Date(), 12), 'yyyy-MM-dd'),
    category: 'Coaching Staff',
    description: 'Assistant coach — part-time August',
    amount: 8000,
  },
]

export let mockIncomeEntries: AccountEntry[] = [
  {
    id: 'inc-1',
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    category: 'Shuttle Sales',
    description: 'Sold 3 tubes to students',
    amount: 660,
  },
  {
    id: 'inc-2',
    date: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
    category: 'Racket Restringing',
    description: 'Restringing — 4 rackets',
    amount: 800,
  },
  {
    id: 'inc-3',
    date: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    category: 'Equipment Sales',
    description: 'Grip tape + wristbands',
    amount: 350,
  },
  {
    id: 'inc-4',
    date: format(subDays(new Date(), 11), 'yyyy-MM-dd'),
    category: 'Shuttle Sales',
    description: 'Sold 5 tubes — evening batch',
    amount: 1100,
  },
]
```

Import `format` and `subDays` from `date-fns` at the top of `mock-data.ts` if not already imported.

---

## Step 2 — Add nav item to Sidebar

**File: `src/components/layout/Sidebar.tsx`**

Add between Upcoming Events and Settings:

```tsx
{ href: '/accounts', icon: <BookOpen className="w-5 h-5" />, label: 'Accounts' }
```

Import `BookOpen` from `lucide-react`.

---

## Step 3 — Create the page

**Create: `src/app/(management)/accounts/page.tsx`**

```tsx
'use client'
import { useState, useMemo } from 'react'
import {
  mockExpenses, mockIncomeEntries,
  mockSettings,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES,
  AccountEntry
} from '@/lib/mock-data'
import {
  format, parseISO, isWithinInterval,
  startOfMonth, endOfMonth, subMonths,
  startOfDay, endOfDay
} from 'date-fns'
import {
  TrendingDown, TrendingUp, Wallet,
  Plus, Trash2, SlidersHorizontal, X, AlertCircle
} from 'lucide-react'
```

### State:

```ts
type AccountTab = 'expenses' | 'income'
type FilterRange = 'currentMonth' | 'lastMonth' | 'custom'

const [activeTab, setActiveTab] = useState<AccountTab>('expenses')
const [filterRange, setFilterRange] = useState<FilterRange>('currentMonth')
const [customFrom, setCustomFrom] = useState('')
const [customTo, setCustomTo] = useState('')
const [showFilter, setShowFilter] = useState(false)

// Expense form state
const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0])
const [expDescription, setExpDescription] = useState('')
const [expAmount, setExpAmount] = useState('')
const [expDate, setExpDate] = useState(format(new Date(), 'yyyy-MM-dd'))
const [expNotes, setExpNotes] = useState('')
const [expError, setExpError] = useState('')

// Income form state
const [incCategory, setIncCategory] = useState(INCOME_CATEGORIES[0])
const [incDescription, setIncDescription] = useState('')
const [incAmount, setIncAmount] = useState('')
const [incDate, setIncDate] = useState(format(new Date(), 'yyyy-MM-dd'))
const [incNotes, setIncNotes] = useState('')
const [incError, setIncError] = useState('')

// Delete confirm
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

const [, forceUpdate] = useState(0)
const refresh = () => forceUpdate(n => n + 1)
```

### Date range computation:

```ts
const range = useMemo(() => {
  const now = new Date()
  switch (filterRange) {
    case 'currentMonth':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'lastMonth': {
      const lm = subMonths(now, 1)
      return { start: startOfMonth(lm), end: endOfMonth(lm) }
    }
    case 'custom':
      if (!customFrom || !customTo)
        return { start: startOfMonth(now), end: endOfMonth(now) }
      return {
        start: startOfDay(parseISO(customFrom)),
        end: endOfDay(parseISO(customTo))
      }
  }
}, [filterRange, customFrom, customTo])

const inRange = (entry: AccountEntry) => {
  try {
    return isWithinInterval(parseISO(entry.date), range)
  } catch { return false }
}

const filteredExpenses = mockExpenses
  .filter(inRange)
  .sort((a, b) => b.date.localeCompare(a.date))

const filteredIncome = mockIncomeEntries
  .filter(inRange)
  .sort((a, b) => b.date.localeCompare(a.date))

const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0)
const totalIncome   = filteredIncome.reduce((s, e) => s + e.amount, 0)
const netBalance    = totalIncome - totalExpenses
```

### Add handlers:

```ts
const handleAddExpense = () => {
  if (!expDescription.trim()) { setExpError('Description is required.'); return }
  if (!expAmount || Number(expAmount) <= 0) { setExpError('Enter a valid amount.'); return }
  setExpError('')
  mockExpenses.unshift({
    id: crypto.randomUUID(),
    date: expDate,
    category: expCategory,
    description: expDescription.trim(),
    amount: Number(expAmount),
    notes: expNotes.trim() || undefined,
  })
  setExpDescription('')
  setExpAmount('')
  setExpNotes('')
  refresh()
}

const handleAddIncome = () => {
  if (!incDescription.trim()) { setIncError('Description is required.'); return }
  if (!incAmount || Number(incAmount) <= 0) { setIncError('Enter a valid amount.'); return }
  setIncError('')
  mockIncomeEntries.unshift({
    id: crypto.randomUUID(),
    date: incDate,
    category: incCategory,
    description: incDescription.trim(),
    amount: Number(incAmount),
    notes: incNotes.trim() || undefined,
  })
  setIncDescription('')
  setIncAmount('')
  setIncNotes('')
  refresh()
}

const handleDelete = (id: string, type: AccountTab) => {
  if (type === 'expenses') {
    const idx = mockExpenses.findIndex(e => e.id === id)
    if (idx !== -1) mockExpenses.splice(idx, 1)
  } else {
    const idx = mockIncomeEntries.findIndex(e => e.id === id)
    if (idx !== -1) mockIncomeEntries.splice(idx, 1)
  }
  setDeleteConfirmId(null)
  refresh()
}
```

### JSX:

```tsx
return (
  <div className="p-6 max-w-5xl mx-auto">

    {/* Header row */}
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-so-text">Accounts</h1>
        <p className="text-so-muted text-sm mt-1">Track academy income and expenses</p>
      </div>
      <button
        onClick={() => setShowFilter(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
          filterRange !== 'currentMonth'
            ? 'bg-so-accent/10 border-so-accent text-so-accent'
            : 'bg-so-surface border-so-border text-so-muted hover:text-so-text hover:border-so-accent'
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {filterRange === 'currentMonth' ? 'This Month'
          : filterRange === 'lastMonth' ? 'Last Month'
          : 'Custom Range'}
      </button>
    </div>

    {/* Summary cards — 3 in a row */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Income */}
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs text-so-muted uppercase tracking-wider">Other Income</span>
        </div>
        <p className="text-xl font-bold text-emerald-600">
          ₹{totalIncome.toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-so-muted mt-1">{filteredIncome.length} entries</p>
      </div>

      {/* Expenses */}
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <span className="text-xs text-so-muted uppercase tracking-wider">Total Expenses</span>
        </div>
        <p className="text-xl font-bold text-red-600">
          ₹{totalExpenses.toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-so-muted mt-1">{filteredExpenses.length} entries</p>
      </div>

      {/* Net */}
      <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            netBalance >= 0 ? 'bg-so-accent/10' : 'bg-red-50'
          }`}>
            <Wallet className={`w-4 h-4 ${netBalance >= 0 ? 'text-so-accent' : 'text-red-600'}`} />
          </div>
          <span className="text-xs text-so-muted uppercase tracking-wider">Net Balance</span>
        </div>
        <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-so-accent' : 'text-red-600'}`}>
          {netBalance < 0 ? '−' : ''}₹{Math.abs(netBalance).toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-so-muted mt-1">
          {netBalance >= 0 ? 'Surplus this period' : 'Deficit this period'}
        </p>
      </div>
    </div>

    {/* Disclaimer — fee income is separate */}
    <div className="flex items-start gap-2 mb-5 p-3 bg-so-accent/5 border border-so-accent/20 rounded-lg">
      <AlertCircle className="w-4 h-4 text-so-accent flex-shrink-0 mt-0.5" />
      <p className="text-xs text-so-muted">
        <span className="text-so-text font-medium">Fee income is not included here.</span>
        {' '}Student fee collections are tracked separately in Fee Transactions.
        This module is for operational income and expenses only.
      </p>
    </div>

    {/* Tab bar */}
    <div className="flex gap-1 border-b border-so-border mb-5">
      {(['expenses', 'income'] as AccountTab[]).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
            activeTab === tab
              ? 'border-so-accent text-so-accent'
              : 'border-transparent text-so-muted hover:text-so-text'
          }`}
        >
          {tab === 'expenses' ? 'Expenses' : 'Other Income'}
        </button>
      ))}
    </div>

    {/* EXPENSES TAB */}
    {activeTab === 'expenses' && (
      <div className="space-y-4">

        {/* Add Expense form */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-so-text mb-4">Add Expense</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={expCategory}
                onChange={e => setExpCategory(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={expDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setExpDate(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={expDescription}
                onChange={e => setExpDescription(e.target.value)}
                placeholder="e.g. Yonex Mavis 350 — 5 tubes"
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
              Notes (optional)
            </label>
            <input
              type="text"
              value={expNotes}
              onChange={e => setExpNotes(e.target.value)}
              placeholder="Any additional context..."
              className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
            />
          </div>
          {expError && (
            <p className="text-xs text-red-500 mb-2">{expError}</p>
          )}
          <button
            onClick={handleAddExpense}
            className="flex items-center gap-2 px-4 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium hover:bg-so-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>

        {/* Expense list */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <TrendingDown className="w-8 h-8 text-so-border" />
              <p className="text-so-muted text-sm">No expenses recorded in this period</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_140px_100px_80px] px-5 py-3 bg-so-surface border-b border-so-border">
                {['Description', 'Category', 'Date', 'Amount'].map(h => (
                  <span key={h} className="text-xs font-medium text-so-muted uppercase tracking-wider">
                    {h}
                  </span>
                ))}
              </div>
              <div className="divide-y divide-so-border">
                {filteredExpenses.map(entry => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[1fr_140px_100px_80px] px-5 py-3.5 items-center hover:bg-so-surface/60 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-so-text">{entry.description}</p>
                      {entry.notes && (
                        <p className="text-xs text-so-muted mt-0.5">{entry.notes}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 bg-so-surface text-so-muted rounded-md w-fit">
                      {entry.category}
                    </span>
                    <span className="text-sm text-so-muted">
                      {format(parseISO(entry.date), 'dd MMM yyyy')}
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-red-600">
                        ₹{entry.amount.toLocaleString('en-IN')}
                      </span>
                      {deleteConfirmId === entry.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(entry.id, 'expenses')}
                            className="text-xs text-red-600 font-medium hover:underline"
                          >Yes</button>
                          <span className="text-so-muted text-xs">/</span>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-so-muted hover:underline"
                          >No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(entry.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-so-muted hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )}

    {/* INCOME TAB — identical structure, swap mockIncomeEntries / INCOME_CATEGORIES / emerald colors */}
    {activeTab === 'income' && (
      <div className="space-y-4">
        {/* Add Income form — same layout as Expense form above, with inc* state vars,
            INCOME_CATEGORIES dropdown, handleAddIncome handler,
            Amount shown in text-emerald-600 */}

        {/* Income list — same grid layout as Expense list,
            Amount column shows text-emerald-600 instead of text-red-600,
            delete calls handleDelete(id, 'income') */}
      </div>
    )}

    {/* Filter panel — slide-in from right, same pattern as Fee Transactions */}
    {showFilter && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
        <div className="relative w-72 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-so-border">
            <span className="font-semibold text-so-text">Filter Period</span>
            <button onClick={() => setShowFilter(false)}>
              <X className="w-4 h-4 text-so-muted" />
            </button>
          </div>
          <div className="p-4 flex-1">
            <p className="text-xs text-so-muted uppercase tracking-wider mb-3">Date Range</p>
            {[
              { value: 'currentMonth', label: 'Current Month' },
              { value: 'lastMonth',    label: 'Last Month'    },
              { value: 'custom',       label: 'Custom Range'  },
            ].map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
                onClick={() => setFilterRange(opt.value as FilterRange)}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  filterRange === opt.value ? 'border-so-accent' : 'border-so-border'
                }`}>
                  {filterRange === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-so-accent" />
                  )}
                </div>
                <span className={`text-sm ${
                  filterRange === opt.value ? 'text-so-text' : 'text-so-muted'
                }`}>
                  {opt.label}
                </span>
              </label>
            ))}
            {filterRange === 'custom' && (
              <div className="mt-2 space-y-2">
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>
            )}
          </div>
          <div className="p-4 border-t border-so-border flex gap-3">
            <button
              onClick={() => {
                setFilterRange('currentMonth')
                setCustomFrom('')
                setCustomTo('')
              }}
              className="flex-1 py-2 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setShowFilter(false)}
              className="flex-1 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)
```

---

**Important note to agent on the Income tab body:** The income tab form and list are structurally identical to the expense tab. Build the full income form using `incCategory`, `incDescription`, `incAmount`, `incDate`, `incNotes`, `incError` state and `handleAddIncome` handler. The income entry list uses `filteredIncome`, displays amounts in `text-emerald-600`, and calls `handleDelete(id, 'income')`. Do not abbreviate — write it out fully.

---

## Verification after edits:

1. ✅ `AccountEntry`, `mockExpenses`, `mockIncomeEntries`, `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES` all exported from `mock-data.ts`
2. ✅ Sidebar has Accounts nav item with `BookOpen` icon
3. ✅ 3 summary cards update when date filter changes
4. ✅ Net Balance shows surplus (accent blue) or deficit (red) correctly
5. ✅ Fee income disclaimer banner visible at top
6. ✅ Expense date input blocks future dates via `max`
7. ✅ Validation fires before adding — empty description or zero amount blocked
8. ✅ Delete requires inline Yes/No confirmation — no accidental deletes
9. ✅ Delete trash icon only visible on row hover — no visual clutter
10. ✅ Filter Clear resets to Current Month and clears custom inputs
11. ✅ Income tab fully built — not stubbed out
12. ✅ `loading.tsx` created at `src/app/(management)/accounts/loading.tsx`