Big but well-scoped refactor. Let me reason through the full design before writing the prompt.

---

## Design Decisions

**Inventory → Income link:** When adding income, the category dropdown matches inventory categories. Selecting a category loads that category's items in the Item Name dropdown. Selecting an item auto-fills the price (editable). If no inventory items exist in that category, Item Name becomes a free-text input. This creates a clean Inventory → Income sales trail.

**Custom categories:** Both Inventory and Expenses get an inline "Create category" mini-input at the bottom of their respective category dropdowns — not a separate settings page. Custom categories stored in mutable arrays in mock-data.

**Add buttons:** All three Add actions (Product, Expense, Income) use right-side slide panels — consistent with existing filter panel pattern in the app.

**Inventory table:** Quantity shows a stock level dot (green >10, amber 1–9, red 0).

---

**Turn AB — Agent Prompt: Inventory & Accounts Page Refactor**

Full rewrite of `src/app/(management)/accounts/page.tsx` and additions to `src/lib/mock-data.ts`. Read both files fully before editing. Also update sidebar. Do not touch any other files.

---

## Step 1 — `src/lib/mock-data.ts` additions

Add the following after all existing exports. Do not remove anything already there.

```ts
// ── Inventory types & data ────────────────────────────────

export type InventoryItem = {
  id: string
  name: string
  category: string
  description: string
  quantity: number
  price: number          // unit price in ₹
}

export const BUILTIN_INVENTORY_CATEGORIES = [
  'Racquet Sports',
  'Footwear',
  'Apparel',
  'Accessories / Miscellaneous',
] as const

// Mutable — user-created custom inventory categories
export let mockCustomInventoryCategories: string[] = []

// Mutable inventory items
export let mockInventoryItems: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Yonex Mavis 350',
    category: 'Racquet Sports',
    description: 'Feather shuttle for training — per tube',
    quantity: 15,
    price: 220,
  },
  {
    id: 'inv-2',
    name: 'Li-Ning A300 Shuttlecock',
    category: 'Racquet Sports',
    description: 'Nylon shuttle — per tube',
    quantity: 8,
    price: 180,
  },
  {
    id: 'inv-3',
    name: 'Yonex Astrox 77',
    category: 'Racquet Sports',
    description: 'Intermediate attacking racquet',
    quantity: 3,
    price: 8500,
  },
  {
    id: 'inv-4',
    name: 'Victor SH-A820 Court Shoes',
    category: 'Footwear',
    description: 'Non-marking badminton court shoes',
    quantity: 5,
    price: 3200,
  },
  {
    id: 'inv-5',
    name: 'Badminton Overgrip Tape',
    category: 'Accessories / Miscellaneous',
    description: 'Pack of 3 overgrips',
    quantity: 22,
    price: 150,
  },
  {
    id: 'inv-6',
    name: 'Dry-Fit Sports T-Shirt',
    category: 'Apparel',
    description: 'Academy jersey — moisture wicking',
    quantity: 12,
    price: 450,
  },
]

// ── Custom expense categories (user-created) ──────────────
// Mutable — appended by user in the Expenses panel
export let mockCustomExpenseCategories: string[] = []
```

Also update the existing `AccountEntry` type — add one optional field:

```ts
export type AccountEntry = {
  id: string
  date: string
  category: string
  description: string      // expenses: description text; income: optional extra context
  amount: number
  notes?: string
  itemName?: string        // income only — the inventory item name sold
}
```

---

## Step 2 — Sidebar update

**File: `src/components/layout/Sidebar.tsx`**

Find the Accounts nav label. Change:
```
label: 'Accounts'  →  label: 'Inventory & Accounts'
```

Icon stays `BookOpen`. Href stays `/accounts`. No other changes.

---

## Step 3 — Full page rewrite

**File: `src/app/(management)/accounts/page.tsx`**

Replace entire file with the following. Write all sections fully — do not stub.

### Imports:
```ts
'use client'
import { useState, useMemo } from 'react'
import {
  mockExpenses, mockIncomeEntries, mockInventoryItems,
  mockCustomInventoryCategories, mockCustomExpenseCategories,
  BUILTIN_INVENTORY_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES,
  AccountEntry, InventoryItem,
} from '@/lib/mock-data'
import {
  format, parseISO, isWithinInterval,
  startOfMonth, endOfMonth, subMonths,
  startOfDay, endOfDay,
} from 'date-fns'
import {
  TrendingDown, TrendingUp, Wallet, Plus, Trash2,
  SlidersHorizontal, X, AlertCircle, Package,
  ChevronDown,
} from 'lucide-react'
```

### State:
```ts
// Top-level segment
type MainSegment = 'inventory' | 'accounts'
const [mainSegment, setMainSegment] = useState<MainSegment>('inventory')

// Accounts sub-tab
type AccountTab = 'expenses' | 'income'
const [accountTab, setAccountTab] = useState<AccountTab>('expenses')

// Filter (accounts only)
type FilterRange = 'currentMonth' | 'lastMonth' | 'custom'
const [filterRange, setFilterRange] = useState<FilterRange>('currentMonth')
const [customFrom, setCustomFrom] = useState('')
const [customTo, setCustomTo] = useState('')
const [showFilter, setShowFilter] = useState(false)

// ── Inventory panel ──────────────────────────────────
const [showAddProduct, setShowAddProduct] = useState(false)
const [invName, setInvName] = useState('')
const [invCategory, setInvCategory] = useState<string>(BUILTIN_INVENTORY_CATEGORIES[0])
const [invDescription, setInvDescription] = useState('')
const [invQuantity, setInvQuantity] = useState('')
const [invPrice, setInvPrice] = useState('')
const [invError, setInvError] = useState('')
// Custom inventory category creation
const [newInvCat, setNewInvCat] = useState('')
const [invCatError, setInvCatError] = useState('')
// Delete confirm
const [deleteInvId, setDeleteInvId] = useState<string | null>(null)

// ── Add Expense panel ────────────────────────────────
const [showAddExpense, setShowAddExpense] = useState(false)
const [expCategory, setExpCategory] = useState<string>(EXPENSE_CATEGORIES[0])
const [expDate, setExpDate] = useState(format(new Date(), 'yyyy-MM-dd'))
const [expDescription, setExpDescription] = useState('')
const [expAmount, setExpAmount] = useState('')
const [expNotes, setExpNotes] = useState('')
const [expError, setExpError] = useState('')
// Custom expense category creation
const [newExpCat, setNewExpCat] = useState('')
const [expCatError, setExpCatError] = useState('')
// Delete confirm
const [deleteExpId, setDeleteExpId] = useState<string | null>(null)

// ── Add Income panel ─────────────────────────────────
const [showAddIncome, setShowAddIncome] = useState(false)
// Income category = inventory category or 'Other'
const allIncomeCategories = [
  ...BUILTIN_INVENTORY_CATEGORIES,
  ...mockCustomInventoryCategories,
  'Other',
]
const [incCategory, setIncCategory] = useState<string>(allIncomeCategories[0])
const [incItemName, setIncItemName] = useState('')        // from inventory dropdown
const [incItemFreeText, setIncItemFreeText] = useState('') // when category='Other'
const [incDate, setIncDate] = useState(format(new Date(), 'yyyy-MM-dd'))
const [incDescription, setIncDescription] = useState('')  // optional
const [incAmount, setIncAmount] = useState('')
const [incError, setIncError] = useState('')
// Delete confirm
const [deleteIncId, setDeleteIncId] = useState<string | null>(null)

const [, forceUpdate] = useState(0)
const refresh = () => forceUpdate(n => n + 1)
```

### Derived data:
```ts
// All inventory categories (built-in + custom)
const allInvCategories = [
  ...BUILTIN_INVENTORY_CATEGORIES,
  ...mockCustomInventoryCategories,
]

// All expense categories (built-in + custom)
const allExpenseCategories = [
  ...EXPENSE_CATEGORIES,
  ...mockCustomExpenseCategories,
]

// Items in selected income category (for dropdown)
const incomeItemOptions = useMemo(() =>
  mockInventoryItems.filter(i => i.category === incCategory),
  [incCategory]
)

// Date range
const range = useMemo(() => {
  const now = new Date()
  if (filterRange === 'lastMonth') {
    const lm = subMonths(now, 1)
    return { start: startOfMonth(lm), end: endOfMonth(lm) }
  }
  if (filterRange === 'custom' && customFrom && customTo) {
    return { start: startOfDay(parseISO(customFrom)), end: endOfDay(parseISO(customTo)) }
  }
  return { start: startOfMonth(now), end: endOfMonth(now) }
}, [filterRange, customFrom, customTo])

const inRange = (e: AccountEntry) => {
  try { return isWithinInterval(parseISO(e.date), range) } catch { return false }
}

const filteredExpenses = mockExpenses.filter(inRange)
  .sort((a, b) => b.date.localeCompare(a.date))
const filteredIncome = mockIncomeEntries.filter(inRange)
  .sort((a, b) => b.date.localeCompare(a.date))

const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0)
const totalIncome   = filteredIncome.reduce((s, e) => s + e.amount, 0)
const netBalance    = totalIncome - totalExpenses
```

### Handlers:
```ts
// ── Inventory ────────────────────────────────────────
const handleAddProduct = () => {
  if (!invName.trim()) { setInvError('Item name is required.'); return }
  if (!invQuantity || Number(invQuantity) < 0) { setInvError('Enter a valid quantity.'); return }
  if (!invPrice || Number(invPrice) <= 0) { setInvError('Enter a valid price.'); return }
  setInvError('')
  mockInventoryItems.unshift({
    id: crypto.randomUUID(),
    name: invName.trim(),
    category: invCategory,
    description: invDescription.trim(),
    quantity: Number(invQuantity),
    price: Number(invPrice),
  })
  setInvName(''); setInvDescription(''); setInvQuantity(''); setInvPrice('')
  setShowAddProduct(false)
  refresh()
}

const handleAddInvCategory = () => {
  const c = newInvCat.trim()
  if (!c) { setInvCatError('Enter a category name.'); return }
  if ([...BUILTIN_INVENTORY_CATEGORIES, ...mockCustomInventoryCategories]
      .map(x => x.toLowerCase()).includes(c.toLowerCase())) {
    setInvCatError('Category already exists.'); return
  }
  mockCustomInventoryCategories.push(c)
  setInvCategory(c)
  setNewInvCat('')
  setInvCatError('')
  refresh()
}

const handleDeleteInventory = (id: string) => {
  const idx = mockInventoryItems.findIndex(i => i.id === id)
  if (idx !== -1) mockInventoryItems.splice(idx, 1)
  setDeleteInvId(null)
  refresh()
}

// ── Expenses ─────────────────────────────────────────
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
  setExpDescription(''); setExpAmount(''); setExpNotes('')
  setShowAddExpense(false)
  refresh()
}

const handleAddExpCategory = () => {
  const c = newExpCat.trim()
  if (!c) { setExpCatError('Enter a category name.'); return }
  if ([...EXPENSE_CATEGORIES, ...mockCustomExpenseCategories]
      .map(x => x.toLowerCase()).includes(c.toLowerCase())) {
    setExpCatError('Category already exists.'); return
  }
  mockCustomExpenseCategories.push(c)
  setExpCategory(c)
  setNewExpCat('')
  setExpCatError('')
  refresh()
}

const handleDeleteExpense = (id: string) => {
  const idx = mockExpenses.findIndex(e => e.id === id)
  if (idx !== -1) mockExpenses.splice(idx, 1)
  setDeleteExpId(null); refresh()
}

// ── Income ────────────────────────────────────────────
const handleAddIncome = () => {
  const itemLabel = incCategory === 'Other' ? incItemFreeText.trim() : incItemName
  if (!itemLabel) { setIncError('Item name is required.'); return }
  if (!incAmount || Number(incAmount) <= 0) { setIncError('Enter a valid amount.'); return }
  setIncError('')
  mockIncomeEntries.unshift({
    id: crypto.randomUUID(),
    date: incDate,
    category: incCategory,
    description: incDescription.trim(),
    amount: Number(incAmount),
    itemName: itemLabel,
  })
  setIncItemName(''); setIncItemFreeText(''); setIncDescription(''); setIncAmount('')
  setShowAddIncome(false)
  refresh()
}

// When income category changes — reset item selection
const handleIncCategoryChange = (cat: string) => {
  setIncCategory(cat)
  setIncItemName('')
  setIncAmount('')
}

// When income item selected from dropdown — auto-fill price
const handleIncItemSelect = (itemName: string) => {
  setIncItemName(itemName)
  const item = mockInventoryItems.find(i => i.name === itemName && i.category === incCategory)
  if (item) setIncAmount(String(item.price))
}

const handleDeleteIncome = (id: string) => {
  const idx = mockIncomeEntries.findIndex(e => e.id === id)
  if (idx !== -1) mockIncomeEntries.splice(idx, 1)
  setDeleteIncId(null); refresh()
}
```

### JSX — full render:

```tsx
return (
  <div className="p-6 max-w-5xl mx-auto">

    {/* Page header */}
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-so-text">Inventory & Accounts</h1>
      <p className="text-so-muted text-sm mt-1">
        Manage your stock and track academy finances
      </p>
    </div>

    {/* ── Segmented control ── */}
    <div className="flex p-1 bg-so-surface border border-so-border rounded-xl mb-6 w-fit">
      {(['inventory', 'accounts'] as MainSegment[]).map(seg => (
        <button
          key={seg}
          onClick={() => setMainSegment(seg)}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
            mainSegment === seg
              ? 'bg-so-card shadow-sm text-so-text border border-so-border'
              : 'text-so-muted hover:text-so-text'
          }`}
        >
          {seg === 'inventory' ? '📦 Inventory' : '📊 Accounts'}
        </button>
      ))}
    </div>


    {/* ════════════════════════════════════════
        INVENTORY SEGMENT
    ════════════════════════════════════════ */}
    {mainSegment === 'inventory' && (
      <div>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-so-muted">
            {mockInventoryItems.length} item{mockInventoryItems.length !== 1 ? 's' : ''} in stock
          </p>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 px-4 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium hover:bg-so-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {/* Inventory table */}
        <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden">
          {mockInventoryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Package className="w-10 h-10 text-so-border" />
              <p className="text-so-muted text-sm">No products added yet</p>
              <button
                onClick={() => setShowAddProduct(true)}
                className="text-xs text-so-accent hover:underline"
              >
                Add your first product
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-[2fr_1fr_2fr_80px_90px_60px] px-5 py-3 bg-so-surface border-b border-so-border">
                {['Item Name', 'Category', 'Description', 'Qty', 'Price', ''].map(h => (
                  <span key={h} className="text-xs font-medium text-so-muted uppercase tracking-wider">
                    {h}
                  </span>
                ))}
              </div>
              {/* Rows */}
              <div className="divide-y divide-so-border">
                {mockInventoryItems.map(item => {
                  const qtyColor = item.quantity === 0
                    ? 'text-red-600 bg-red-50'
                    : item.quantity < 10
                      ? 'text-amber-600 bg-amber-50'
                      : 'text-emerald-600 bg-emerald-50'

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[2fr_1fr_2fr_80px_90px_60px] px-5 py-3.5 items-center hover:bg-so-surface/60 transition-colors group"
                    >
                      <span className="text-sm font-medium text-so-text">{item.name}</span>
                      <span className="text-xs px-2 py-1 bg-so-surface text-so-muted rounded-md w-fit">
                        {item.category}
                      </span>
                      <span className="text-sm text-so-muted truncate pr-4">
                        {item.description || '—'}
                      </span>
                      {/* Quantity with stock level dot */}
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${qtyColor}`}>
                          {item.quantity}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-so-text">
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                      {/* Delete */}
                      <div className="flex justify-end">
                        {deleteInvId === item.id ? (
                          <div className="flex gap-1 items-center">
                            <button
                              onClick={() => handleDeleteInventory(item.id)}
                              className="text-xs text-red-600 font-medium hover:underline"
                            >Yes</button>
                            <span className="text-so-muted text-xs">/</span>
                            <button
                              onClick={() => setDeleteInvId(null)}
                              className="text-xs text-so-muted hover:underline"
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteInvId(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-so-muted hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Stock legend */}
        <div className="flex items-center gap-4 mt-3">
          {[
            { color: 'bg-emerald-500', label: '10+ units — Good stock' },
            { color: 'bg-amber-400',   label: '1–9 units — Low stock'  },
            { color: 'bg-red-500',     label: '0 units — Out of stock' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-so-muted">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    )}


    {/* ════════════════════════════════════════
        ACCOUNTS SEGMENT
    ════════════════════════════════════════ */}
    {mainSegment === 'accounts' && (
      <div>
        {/* Summary cards + filter */}
        <div className="flex items-start gap-4 mb-5 flex-wrap">
          <div className="grid grid-cols-3 gap-4 flex-1">
            {/* Other Income */}
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
          {/* Filter button */}
          <button
            onClick={() => setShowFilter(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors flex-shrink-0 ${
              filterRange !== 'currentMonth'
                ? 'bg-so-accent/10 border-so-accent text-so-accent'
                : 'bg-so-surface border-so-border text-so-muted hover:text-so-text hover:border-so-accent'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {filterRange === 'currentMonth' ? 'This Month'
              : filterRange === 'lastMonth' ? 'Last Month' : 'Custom'}
          </button>
        </div>

        {/* Fee income disclaimer */}
        <div className="flex items-start gap-2 mb-5 p-3 bg-so-accent/5 border border-so-accent/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-so-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs text-so-muted">
            <span className="text-so-text font-medium">Fee income is not included here.</span>
            {' '}Student fee collections are tracked in Fee Transactions.
            This module tracks operational income and expenses only.
          </p>
        </div>

        {/* Sub-tabs with Add buttons */}
        <div className="flex items-center justify-between border-b border-so-border mb-5">
          <div className="flex gap-1">
            {(['expenses', 'income'] as AccountTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setAccountTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  accountTab === tab
                    ? 'border-so-accent text-so-accent'
                    : 'border-transparent text-so-muted hover:text-so-text'
                }`}
              >
                {tab === 'expenses' ? 'Expenses' : 'Other Income'}
              </button>
            ))}
          </div>
          {/* Add button for active tab */}
          {accountTab === 'expenses' ? (
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium mb-1 hover:bg-so-accent-hover transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          ) : (
            <button
              onClick={() => setShowAddIncome(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium mb-1 hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Income
            </button>
          )}
        </div>

        {/* ── EXPENSES TAB ── */}
        {accountTab === 'expenses' && (
          <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2">
                <TrendingDown className="w-8 h-8 text-so-border" />
                <p className="text-so-muted text-sm">No expenses in this period</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[2fr_130px_100px_100px_48px] px-5 py-3 bg-so-surface border-b border-so-border">
                  {['Description', 'Category', 'Date', 'Amount', ''].map(h => (
                    <span key={h} className="text-xs font-medium text-so-muted uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-so-border">
                  {filteredExpenses.map(entry => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[2fr_130px_100px_100px_48px] px-5 py-3.5 items-center hover:bg-so-surface/60 group"
                    >
                      <div>
                        <p className="text-sm font-medium text-so-text">{entry.description}</p>
                        {entry.notes && <p className="text-xs text-so-muted mt-0.5">{entry.notes}</p>}
                      </div>
                      <span className="text-xs px-2 py-1 bg-so-surface text-so-muted rounded-md w-fit">
                        {entry.category}
                      </span>
                      <span className="text-sm text-so-muted">
                        {format(parseISO(entry.date), 'dd MMM yyyy')}
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        ₹{entry.amount.toLocaleString('en-IN')}
                      </span>
                      <div className="flex justify-end">
                        {deleteExpId === entry.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDeleteExpense(entry.id)} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                            <span className="text-xs text-so-muted">/</span>
                            <button onClick={() => setDeleteExpId(null)} className="text-xs text-so-muted hover:underline">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteExpId(entry.id)}
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
        )}

        {/* ── INCOME TAB ── */}
        {accountTab === 'income' && (
          <div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden">
            {filteredIncome.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2">
                <TrendingUp className="w-8 h-8 text-so-border" />
                <p className="text-so-muted text-sm">No income entries in this period</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[2fr_130px_100px_100px_48px] px-5 py-3 bg-so-surface border-b border-so-border">
                  {['Item / Name', 'Category', 'Date', 'Amount', ''].map(h => (
                    <span key={h} className="text-xs font-medium text-so-muted uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-so-border">
                  {filteredIncome.map(entry => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[2fr_130px_100px_100px_48px] px-5 py-3.5 items-center hover:bg-so-surface/60 group"
                    >
                      <div>
                        <p className="text-sm font-medium text-so-text">
                          {entry.itemName ?? entry.description}
                        </p>
                        {entry.description && entry.itemName && (
                          <p className="text-xs text-so-muted mt-0.5">{entry.description}</p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 bg-so-surface text-so-muted rounded-md w-fit">
                        {entry.category}
                      </span>
                      <span className="text-sm text-so-muted">
                        {format(parseISO(entry.date), 'dd MMM yyyy')}
                      </span>
                      <span className="text-sm font-semibold text-emerald-600">
                        ₹{entry.amount.toLocaleString('en-IN')}
                      </span>
                      <div className="flex justify-end">
                        {deleteIncId === entry.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDeleteIncome(entry.id)} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                            <span className="text-xs text-so-muted">/</span>
                            <button onClick={() => setDeleteIncId(null)} className="text-xs text-so-muted hover:underline">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteIncId(entry.id)}
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
        )}
      </div>
    )}


    {/* ════════════════════════════════════════
        SLIDE PANELS
    ════════════════════════════════════════ */}

    {/* ── Add Product panel ── */}
    {showAddProduct && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddProduct(false)} />
        <div className="relative w-96 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-so-border sticky top-0 bg-so-card z-10">
            <h2 className="font-semibold text-so-text">Add Product</h2>
            <button onClick={() => setShowAddProduct(false)}>
              <X className="w-5 h-5 text-so-muted" />
            </button>
          </div>
          <div className="p-5 flex-1 space-y-4">

            {/* Item Name */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invName}
                onChange={e => setInvName(e.target.value)}
                placeholder="e.g. Yonex Mavis 350"
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={invCategory}
                onChange={e => setInvCategory(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              >
                {allInvCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* Create new category */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newInvCat}
                  onChange={e => setNewInvCat(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                />
                <button
                  onClick={handleAddInvCategory}
                  className="px-3 py-1.5 bg-so-surface border border-so-border rounded-lg text-xs text-so-text hover:border-so-accent transition-colors"
                >
                  + Add
                </button>
              </div>
              {invCatError && <p className="text-xs text-red-500 mt-1">{invCatError}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={invDescription}
                onChange={e => setInvDescription(e.target.value)}
                placeholder="Brief product description..."
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>

            {/* Quantity + Price side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={invQuantity}
                  onChange={e => setInvQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={invPrice}
                  onChange={e => setInvPrice(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                />
              </div>
            </div>

            {invError && (
              <p className="text-xs text-red-500">{invError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-so-border flex gap-3 sticky bottom-0 bg-so-card">
            <button
              onClick={() => setShowAddProduct(false)}
              className="flex-1 py-2.5 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProduct}
              className="flex-1 py-2.5 bg-so-accent text-so-accent-text rounded-lg text-sm font-semibold hover:bg-so-accent-hover transition-colors"
            >
              Add Product
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Add Expense panel ── */}
    {showAddExpense && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddExpense(false)} />
        <div className="relative w-96 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-so-border sticky top-0 bg-so-card z-10">
            <h2 className="font-semibold text-so-text">Add Expense</h2>
            <button onClick={() => setShowAddExpense(false)}>
              <X className="w-5 h-5 text-so-muted" />
            </button>
          </div>
          <div className="p-5 flex-1 space-y-4">

            {/* Category + custom */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={expCategory}
                onChange={e => setExpCategory(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              >
                {allExpenseCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* Create custom expense category */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newExpCat}
                  onChange={e => setNewExpCat(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 bg-white border border-so-border rounded-lg px-3 py-1.5 text-xs text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                />
                <button
                  onClick={handleAddExpCategory}
                  className="px-3 py-1.5 bg-so-surface border border-so-border rounded-lg text-xs text-so-text hover:border-so-accent transition-colors"
                >
                  + Add
                </button>
              </div>
              {expCatError && <p className="text-xs text-red-500 mt-1">{expCatError}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={expDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setExpDate(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={expDescription}
                onChange={e => setExpDescription(e.target.value)}
                placeholder="e.g. Electricity bill — August"
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>

            {/* Amount */}
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
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={expNotes}
                onChange={e => setExpNotes(e.target.value)}
                placeholder="Additional context..."
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>

            {expError && <p className="text-xs text-red-500">{expError}</p>}
          </div>
          <div className="p-5 border-t border-so-border flex gap-3 sticky bottom-0 bg-so-card">
            <button onClick={() => setShowAddExpense(false)} className="flex-1 py-2.5 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text transition-colors">Cancel</button>
            <button onClick={handleAddExpense} className="flex-1 py-2.5 bg-so-accent text-so-accent-text rounded-lg text-sm font-semibold">Add Expense</button>
          </div>
        </div>
      </div>
    )}

    {/* ── Add Income panel ── */}
    {showAddIncome && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddIncome(false)} />
        <div className="relative w-96 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-so-border sticky top-0 bg-so-card z-10">
            <h2 className="font-semibold text-so-text">Add Income</h2>
            <button onClick={() => setShowAddIncome(false)}>
              <X className="w-5 h-5 text-so-muted" />
            </button>
          </div>
          <div className="p-5 flex-1 space-y-4">

            {/* Category */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={incCategory}
                onChange={e => handleIncCategoryChange(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              >
                {allIncomeCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Item Name <span className="text-red-500">*</span>
              </label>
              {incCategory === 'Other' ? (
                // Free text for Other category
                <input
                  type="text"
                  value={incItemFreeText}
                  onChange={e => setIncItemFreeText(e.target.value)}
                  placeholder="e.g. Rental fee, Sponsorship..."
                  className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                />
              ) : incomeItemOptions.length > 0 ? (
                // Dropdown from inventory
                <>
                  <select
                    value={incItemName}
                    onChange={e => handleIncItemSelect(e.target.value)}
                    className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
                  >
                    <option value="">Select item...</option>
                    {incomeItemOptions.map(item => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                  {incItemName && (
                    <p className="text-xs text-so-muted mt-1">
                      Unit price: ₹{incomeItemOptions.find(i => i.name === incItemName)?.price.toLocaleString('en-IN') ?? '—'} (editable below)
                    </p>
                  )}
                </>
              ) : (
                // No inventory items in this category — free text fallback
                <>
                  <input
                    type="text"
                    value={incItemFreeText}
                    onChange={e => setIncItemFreeText(e.target.value)}
                    placeholder="No inventory items in this category — enter manually"
                    className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
                  />
                  <p className="text-xs text-amber-600 mt-1">
                    No inventory items found for "{incCategory}". Add products in Inventory first.
                  </p>
                </>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={incDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setIncDate(e.target.value)}
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={incAmount}
                onChange={e => setIncAmount(e.target.value)}
                placeholder="Auto-filled from inventory price"
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>

            {/* Description (optional) */}
            <div>
              <label className="block text-xs text-so-muted uppercase tracking-wider mb-1.5">
                Description (optional)
              </label>
              <input
                type="text"
                value={incDescription}
                onChange={e => setIncDescription(e.target.value)}
                placeholder="Any additional context..."
                className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
              />
            </div>

            {incError && <p className="text-xs text-red-500">{incError}</p>}
          </div>
          <div className="p-5 border-t border-so-border flex gap-3 sticky bottom-0 bg-so-card">
            <button onClick={() => setShowAddIncome(false)} className="flex-1 py-2.5 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text transition-colors">Cancel</button>
            <button onClick={handleAddIncome} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">Add Income</button>
          </div>
        </div>
      </div>
    )}

    {/* ── Filter panel ── */}
    {showFilter && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
        <div className="relative w-72 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-so-border">
            <span className="font-semibold text-so-text">Filter Period</span>
            <button onClick={() => setShowFilter(false)}><X className="w-4 h-4 text-so-muted" /></button>
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
                  {filterRange === opt.value && <div className="w-2 h-2 rounded-full bg-so-accent" />}
                </div>
                <span className={`text-sm ${filterRange === opt.value ? 'text-so-text' : 'text-so-muted'}`}>
                  {opt.label}
                </span>
              </label>
            ))}
            {filterRange === 'custom' && (
              <div className="mt-2 space-y-2">
                <input type="date" value={customFrom} max={customTo || format(new Date(), 'yyyy-MM-dd')} onChange={e => setCustomFrom(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent" />
                <input type="date" value={customTo} min={customFrom} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setCustomTo(e.target.value)} className="w-full bg-white border border-so-border rounded-lg px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-accent" />
              </div>
            )}
          </div>
          <div className="p-4 border-t border-so-border flex gap-3">
            <button
              onClick={() => { setFilterRange('currentMonth'); setCustomFrom(''); setCustomTo('') }}
              className="flex-1 py-2 border border-so-border rounded-lg text-sm text-so-muted hover:text-so-text transition-colors"
            >Clear</button>
            <button onClick={() => setShowFilter(false)} className="flex-1 py-2 bg-so-accent text-so-accent-text rounded-lg text-sm font-medium">Apply</button>
          </div>
        </div>
      </div>
    )}

  </div>
)
```

---

## Verification after edits:

1. ✅ `InventoryItem`, `mockInventoryItems`, `mockCustomInventoryCategories`, `mockCustomExpenseCategories`, `BUILTIN_INVENTORY_CATEGORIES` exported from `mock-data.ts`
2. ✅ `AccountEntry` has optional `itemName` field
3. ✅ Sidebar label reads "Inventory & Accounts"
4. ✅ Segmented control switches between Inventory and Accounts views cleanly
5. ✅ Inventory table shows stock level badge (green/amber/red) based on quantity
6. ✅ Add Product panel: custom category creation works, new category auto-selects after creation
7. ✅ Add Expense panel: custom category creation works, built-in + custom categories combined in dropdown
8. ✅ Add Income panel: category dropdown → Item Name auto-populates from inventory → price auto-fills Amount
9. ✅ When income category has no inventory items → free-text fallback with amber hint message
10. ✅ When income category is "Other" → free-text input (no inventory lookup)
11. ✅ All three panels scroll independently with sticky header and footer
12. ✅ Delete requires inline Yes/No on every list — inventory, expenses, income
13. ✅ Filter Clear resets to currentMonth and clears custom date inputs
14. ✅ `ChevronDown`, `Package` imported from `lucide-react`