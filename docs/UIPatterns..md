# UI Patterns — EzyFee Design System Reference

> **Purpose:** This document is the **single source of truth** for all UI primitives used in the Pro Badminton (EzyFee) application. Every agent session must read this file before building or modifying any UI. Deviating from these patterns breaks visual consistency.
>
> **Rule:** When building new pages or components, **copy the exact class strings** from this document. Do not improvise new styling. If a new pattern is genuinely needed, add it to this file first.

---

## Table of Contents

1. [Page Layout](#1-page-layout)
2. [Cards](#2-cards)
3. [Segment Toggle](#3-segment-toggle)
4. [Tabs](#4-tabs)
5. [Buttons](#5-buttons)
6. [Search Input](#6-search-input)
7. [Filter Pills (Date Range)](#7-filter-pills-date-range)
8. [Filter — Slide-Over Panel](#8-filter--slide-over-panel)
9. [Dropdown Select (with Icon)](#9-dropdown-select-with-icon)
10. [Text Inputs & Date Pickers](#10-text-inputs--date-pickers)
11. [Form Labels](#11-form-labels)
12. [Tables](#12-tables)
13. [Badges](#13-badges)
14. [Avatars & Initials](#14-avatars--initials)
15. [Modals](#15-modals)
16. [Toast Notifications](#16-toast-notifications)
17. [Action Menus (Three-Dot)](#17-action-menus-three-dot)
18. [Inline Delete Confirmation](#18-inline-delete-confirmation)
19. [Empty States](#19-empty-states)
20. [Page Header](#20-page-header)
21. [Section Headings](#21-section-headings)
22. [Currency & Date Formatting](#22-currency--date-formatting)
23. [Animations](#23-animations)
24. [Import Rules](#24-import-rules)

---

## 1. Page Layout

### Outer Wrapper — Standard Page
```
className="max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300"
```

### Outer Wrapper — Narrow Page (Profile/Detail)
```
className="max-w-4xl mx-auto pb-12"
```

### Grid — 4-Column KPI Cards
```
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
```

### Grid — 3-Column Summary Cards
```
className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
```

### Grid — 3-Column Feature Cards
```
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
```

---

## 2. Cards

### Standard Content Card
Used for: tables, chart panels, form sections within a page.
```
className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]"
```

### KPI / Stat Card (Dashboard)
Used for: numeric metrics with icon + label + value.
```html
<div className="bg-so-card border border-so-border rounded-xl shadow-sm p-5">
  <div className="flex items-center gap-2 mb-2">
    <div className="w-6 h-6 rounded-full bg-so-emerald-subtle flex items-center justify-center shrink-0">
      <Icon className="w-3.5 h-3.5 text-so-emerald" />
    </div>
    <span className="text-so-muted text-xs uppercase tracking-wider font-semibold truncate">
      Label Text
    </span>
  </div>
  <div className="text-3xl font-bold text-so-emerald">₹ 1,500</div>
</div>
```

**Icon container color variants:**
| Semantic | Container | Icon Color |
|---|---|---|
| Success / Collected | `bg-so-emerald-subtle` | `text-so-emerald` |
| Warning / Due | `bg-so-yellow-subtle` | `text-so-yellow` |
| Error / Overdue | `bg-so-red-subtle` | `text-so-red` |
| Neutral | `bg-white border border-so-border` | `text-so-text` |

### Summary Card (Inventory / Accounts)
Used for: Total Items, Low Stock, Expenses, Income, Net Balance.
```html
<div className="bg-white border border-so-border rounded-xl p-5 shadow-sm flex items-center justify-between">
  <div>
    <p className="text-xs font-semibold text-so-muted uppercase tracking-wider">Label</p>
    <h3 className="text-2xl font-bold text-so-text mt-1">42</h3>
    <p className="text-xs text-so-muted mt-1">Helper text</p>
  </div>
  <div className="w-12 h-12 rounded-xl bg-so-surface border border-so-border flex items-center justify-center text-so-accent">
    <Icon className="w-6 h-6" />
  </div>
</div>
```

**Icon container semantic variants:**
| Semantic | Container | Icon Color |
|---|---|---|
| Default | `bg-so-surface border border-so-border` | `text-so-accent` |
| Warning | `bg-amber-50 border border-amber-200` | `text-amber-600` |
| Error | `bg-red-50 border border-red-200` | `text-red-600` |

### Settings Section Card
Used for: Settings sub-sections (Academy, Staff, Branches, etc.).
```
className="bg-so-card border border-so-border rounded-2xl p-6 shadow-sm space-y-6"
```

### Clickable Feature Card (Batches, Communications)
Used for: cards that navigate to a detail page on click.
```
className="bg-so-card border border-so-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-so-accent/50 transition-all cursor-pointer flex flex-col group relative"
```

### Profile Header Card (Student/Court Member Detail)
```
className="bg-so-card border border-so-border rounded-xl shadow-sm p-6"
```

### Mini Info Card (inside profile/modal)
```
className="bg-so-card border border-so-border rounded-xl shadow-sm p-4"
```

---

## 3. Segment Toggle

Used on: Students page (Coaching ↔ Court), Transactions page (Coaching ↔ Court).
This is a **pill-shaped container** with two buttons inside.

```html
<div className="flex bg-so-surface border border-so-border rounded-xl p-1 w-fit mb-6 shadow-sm">
  <button
    onClick={() => setSegment('coaching')}
    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
      segment === 'coaching'
        ? 'bg-white text-so-text shadow-sm border border-so-border'
        : 'text-so-muted hover:text-so-text'
    }`}
  >
    Coaching
  </button>
  <button
    onClick={() => setSegment('court')}
    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
      segment === 'court'
        ? 'bg-white text-so-text shadow-sm border border-so-border'
        : 'text-so-muted hover:text-so-text'
    }`}
  >
    Court
  </button>
</div>
```

---

## 4. Tabs

### Underline Tabs (Primary)
Used on: Students (Active/Inactive/Dropout), Transactions (Recent/Paid/Pending/Partial), Accounts (Expenses/Income), Batch Detail, Student Profile.

```html
<div className="flex items-center gap-2 border-b border-so-border mb-6">
  {tabs.map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
        activeTab === tab
          ? 'border-so-accent text-so-accent'
          : 'border-transparent text-so-muted hover:text-so-text'
      }`}
    >
      {tab}
    </button>
  ))}
</div>
```

### Underline Tabs with Count Badge
Used on: Students page (shows student count per tab).

```html
<button className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
  activeTab === tab
    ? 'border-so-accent text-so-accent'
    : 'border-transparent text-so-muted hover:text-so-text'
}`}>
  {label}
  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
    activeTab === tab ? 'bg-so-accent text-white' : 'bg-so-surface text-so-muted'
  }`}>
    {count}
  </span>
</button>
```

---

## 5. Buttons

### Primary Action Button
Used for: "Add Student", "Add Item", "Add Expense", primary form submits.
```
className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
```

**With icon (standard pattern):**
```html
<button className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
  <Plus className="w-4 h-4" />
  Add Student
</button>
```

### Secondary Action Button
Used for: "Cancel", "Back", secondary choices.
```
className="px-4 py-2 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors"
```

### Destructive Confirm Button
Used for: inline delete confirmations ("Yes" button).
```
className="text-xs px-2 py-1 bg-red-600 text-white rounded-md font-medium"
```

### Destructive Cancel Button
Used for: inline delete confirmations ("No" button).
```
className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted"
```

### Icon-Only Button (Table Actions)
Used for: edit, delete icons in table rows.
```
// Edit
className="p-1.5 rounded-md text-so-muted hover:text-so-accent hover:bg-so-surface transition-colors cursor-pointer"

// Delete
className="p-1.5 rounded-md text-so-muted hover:text-red-500 hover:bg-red-50 transition-colors"
```

### Icon-Only Button (Appear on Hover — Batch Cards)
```
className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-so-muted hover:text-so-accent hover:bg-so-accent/10 rounded-lg"
```

### Ghost Button (Filter trigger)
Used for: filter icon button in Transactions/Accounts.
```html
<button className="flex items-center gap-2 px-4 py-2 bg-white border border-so-border rounded-lg text-sm text-so-muted hover:border-so-accent hover:text-so-text transition-colors">
  <SlidersHorizontal className="w-4 h-4" />
  Filter
  {isFiltered && <span className="w-1.5 h-1.5 rounded-full bg-so-accent" />}
</button>
```

### Income Add Button (Green variant)
Used for: "Add Income" button (distinguished from expense).
```
className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
```

### Modal Close Button (X)
```
className="text-so-grey hover:text-so-accent transition-colors"
// With Lucide X icon:
<X className="w-5 h-5" />
```

---

## 6. Search Input

Used on: Students, Transactions, Accounts, Inventory, Batch Detail.

```html
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-so-muted" />
  <input
    type="text"
    placeholder="Search by name or phone..."
    value={searchQuery}
    onChange={e => setSearchQuery(e.target.value)}
    className="w-full bg-white border border-so-border rounded-lg pl-9 pr-4 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-accent"
  />
</div>
```

**Width variants:**
| Context | Width Class |
|---|---|
| Full-width (above table) | `w-full` on the `<div>` wrapper, wrapped with `className="relative mb-4"` |
| Fixed-width alongside button | `w-full sm:w-72` on the `<div>` wrapper |
| Flex-fill alongside filter button | `flex-1` on the `<div>` wrapper |

---

## 7. Filter Pills (Date Range)

### Style A — Filled Active (Dashboard)
Used on: Dashboard date filter. Active state has solid accent fill.

```html
<button
  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
    isActive
      ? 'bg-so-accent text-white'
      : 'border border-so-border text-so-muted hover:border-so-accent'
  }`}
>
  This Month
</button>
```

### Style B — Surface Active (Accounts, Attendance)
Used on: Accounts date filter, Court filter. Active state has surface background.

```html
<button
  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
    isActive
      ? 'bg-so-surface border border-so-border text-so-text shadow-sm'
      : 'text-so-muted border border-transparent hover:bg-so-surface/50'
  }`}
>
  Current Month
</button>
```

### Style C — Batch Filter Pills (Students)
Used on: Students → Active tab → Batch filter.

```html
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-xs text-so-muted">Batch:</span>
  <button
    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
      isActive
        ? 'bg-so-accent text-white'
        : 'bg-white border border-so-border text-so-muted hover:border-so-accent hover:text-so-text'
    }`}
  >
    All Batches
  </button>
</div>
```

> **⚠ Inconsistency Note:** These three styles currently coexist. For **new pages**, use **Style A** (filled active) for date range filters and **Style C** for category/entity filters. Style B should be gradually migrated to Style A.

### Custom Date Inputs (when "Custom" pill is selected)
```html
<div className="flex items-center gap-2 mt-2">
  <input
    type="date"
    value={customFrom}
    onChange={e => setCustomFrom(e.target.value)}
    max={customTo || undefined}
    className="bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text"
  />
  <span className="text-so-muted text-sm">to</span>
  <input
    type="date"
    value={customTo}
    onChange={e => setCustomTo(e.target.value)}
    min={customFrom}
    max={format(new Date(), 'yyyy-MM-dd')}
    className="bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text"
  />
</div>
```

---

## 8. Filter — Slide-Over Panel

Used on: Transactions, Student Profile, Court Member Profile, Batch Detail, Accounts.

```html
{showFilter && (
  <div className="fixed inset-0 z-50 flex justify-end">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilter(false)} />
    {/* Panel */}
    <div className="relative w-80 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-so-border">
        <span className="font-semibold text-so-text">Filters</span>
        <button onClick={() => setShowFilter(false)} className="p-1 hover:bg-so-surface rounded">
          <X className="w-4 h-4 text-so-muted" />
        </button>
      </div>
      {/* Body */}
      <div className="p-4 flex-1">
        <p className="text-xs text-so-muted uppercase tracking-wider mb-3">Date Range</p>
        {/* Radio options */}
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-3 py-2 cursor-pointer group">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected === opt.value ? 'border-so-accent' : 'border-so-border'
            }`}>
              {selected === opt.value && <div className="w-2 h-2 rounded-full bg-so-accent" />}
            </div>
            <span className={`text-sm transition-colors ${
              selected === opt.value ? 'text-so-text' : 'text-so-muted group-hover:text-so-text'
            }`}>
              {opt.label}
            </span>
            <input type="radio" className="sr-only" checked={selected === opt.value} onChange={...} />
          </label>
        ))}
      </div>
      {/* Footer */}
      <div className="p-4 border-t border-so-border flex gap-3">
        <button className="flex-1 px-4 py-2 bg-so-accent text-white rounded-lg text-sm font-semibold">
          Apply
        </button>
        <button className="px-4 py-2 border border-so-border text-so-muted rounded-lg text-sm">
          Reset
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 9. Dropdown Select (with Icon)

Used on: Inventory (category filter, sort), Reports (batch filter).

```html
<div className="relative">
  <FilterIcon className="w-4 h-4 text-so-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
  <select
    value={value}
    onChange={e => setValue(e.target.value)}
    className="pl-9 pr-8 py-2 bg-white border border-so-border rounded-lg text-sm text-so-text focus:outline-none focus:border-so-accent shadow-sm cursor-pointer appearance-none"
  >
    <option value="all">All Categories</option>
    {categories.map(c => <option key={c} value={c}>{c}</option>)}
  </select>
  <ChevronDown className="w-4 h-4 text-so-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
</div>
```

---

## 10. Text Inputs & Date Pickers

### Standard Text Input (inside forms/modals)
```
className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors"
```

### Inline Date Input (for custom date ranges)
```
className="bg-white border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text"
```

### Select Dropdown (inside modals)
```
className="w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent cursor-pointer"
```

### Textarea
```
className="w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-so-accent"
```

---

## 11. Form Labels

### Standard Label (used in modals and forms)
```
className="text-xs font-medium text-so-muted mb-1.5 block"
```

### Uppercase Tracking Label (stat cards, filter headers)
```
className="text-xs text-so-muted uppercase tracking-wider font-semibold"
```

### Section Title in Filter Panel
```
className="text-xs text-so-muted uppercase tracking-wider mb-3"
```

---

## 12. Tables

### Table Container
```html
<div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-so-surface border-b border-so-border">
          <th className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Column</th>
          <!-- last column right-aligned: -->
          <th className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-so-border">
        <tr className="hover:bg-so-surface/50 transition-colors">
          <td className="px-5 py-3 text-so-text">Cell value</td>
          <td className="px-5 py-3 text-right">Actions</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

> **Note:** Some pages use `px-6 py-4` padding on cells (Students, Transactions) while others use `px-5 py-3` (Inventory, Accounts). **Canonical padding: `px-5 py-3`**. Use `px-6 py-4` only for pages with fewer columns where rows need more breathing room.

### Table Header Cell
```
className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider"
```

### Table Row — Standard
```
className="hover:bg-so-surface/50 transition-colors"
```

### Table Row — Alternate (with explicit bg)
```
className="bg-so-card hover:bg-so-surface/60 border-b border-so-border transition-colors"
```

### Table Cell — Text
```
className="px-5 py-3 text-so-text"          // primary text
className="px-5 py-3 text-so-muted"         // secondary text (phone, date)
className="px-5 py-3 font-medium text-so-text"  // name/title
className="px-5 py-3 font-bold text-so-emerald"  // positive money
className="px-5 py-3 font-bold text-red-600"     // negative money
```

### Table Cell — Clickable Name
```html
<button
  onClick={() => router.push(`/students/${id}`)}
  className="text-so-text font-medium hover:text-so-accent transition-colors text-left"
>
  {name}
</button>
```

---

## 13. Badges

### Student Status Badge (inline after name)
```html
{status === 'due-soon' && <span className="ml-2 text-xs text-so-yellow">(Due Soon)</span>}
{status === 'expired' && <span className="ml-2 text-xs text-so-red">(Overdue)</span>}
```

### Category Badge (table cell)
Used for: expense category, inventory category, batch name.
```
className="px-2.5 py-1 bg-so-surface border border-so-border text-so-muted rounded-md text-[11px] font-medium uppercase tracking-wider"
```

### Pill Badge (batch name in student table)
```
className="px-2 py-0.5 rounded-full bg-white border border-so-border text-xs text-so-muted capitalize"
```

### Plan Type Badge (Court members)
```
className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold uppercase text-gray-600"
```

### Payment Method Badge
Render as plain text or with `formatMethod()`:
```
className="capitalize text-so-muted"
```

### Stock Level Badge (Inventory)
```html
<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge}`}>
  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
  {quantity}
</span>
```

**Badge + dot color combos:**
| Level | `badge` | `dot` |
|---|---|---|
| Sufficient (8+) | `bg-emerald-50 text-emerald-700 border-emerald-200` | `bg-emerald-500` |
| Low (4–7) | `bg-amber-50 text-amber-700 border-amber-200` | `bg-amber-500` |
| Critical (1–3) | `bg-red-50 text-red-700 border-red-200` | `bg-red-500` |
| Out of stock (0) | `bg-red-50 text-red-700 border-red-200` | `bg-red-500` |

### Schedule Day Badge (Batches)
```
className="px-2 py-0.5 rounded-full bg-so-surface border border-so-border text-[11px] font-medium text-so-muted"
```

---

## 14. Avatars & Initials

### Table Row Avatar (small)
```html
<div className="w-8 h-8 rounded-full bg-so-surface border border-so-border flex items-center justify-center text-xs font-bold text-so-muted uppercase">
  {name.substring(0, 2)}
</div>
```

### Item Icon Placeholder (Inventory)
```html
<div className="w-8 h-8 rounded-lg bg-so-surface border border-so-border flex items-center justify-center overflow-hidden">
  {icon ? <span className="text-lg">{icon}</span> : <span className="text-xs font-bold text-so-muted">{name.charAt(0)}</span>}
</div>
```

---

## 15. Modals

### Modal Overlay
```
className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
```

**Alternate overlay (darker):**
```
className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
```

### Modal Card
```
className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
```

**Width variants:**
| Modal Type | Width |
|---|---|
| Small (confirm, simple form) | `max-w-md` |
| Medium (edit form) | `max-w-lg` |
| Large (multi-field enrollment) | `max-w-2xl` |

### Modal Header
```html
<div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
  <h2 className="text-lg font-bold text-so-text">Modal Title</h2>
  <button onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors">
    <X className="w-5 h-5" />
  </button>
</div>
```

### Modal Body
```
className="px-6 py-5 space-y-5"
// or for scrollable:
className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]"
```

### Modal Footer
```html
<div className="px-6 py-4 border-t border-so-border flex justify-end gap-3">
  <button onClick={onClose} className="px-4 py-2.5 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors">
    Cancel
  </button>
  <button onClick={handleSubmit} className="px-5 py-2.5 bg-so-accent text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
    Confirm
  </button>
</div>
```

---

## 16. Toast Notifications

### Success Toast (fixed, bottom-right)
```html
{notification && (
  <div className="fixed bottom-6 right-6 z-50 bg-so-text text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-2">
    <CheckCircle2 className="w-4 h-4 text-so-emerald" />
    <span>{notification}</span>
  </div>
)}
```

### Toast Logic Pattern (reuse everywhere)
```typescript
const [notification, setNotification] = useState<string | null>(null)

const showToast = (msg: string) => {
  setNotification(msg)
  setTimeout(() => setNotification(null), 3000)
}
```

### Success/Error Toast (modals)
```typescript
const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

useEffect(() => {
  if (!toast) return
  const t = setTimeout(() => setToast(null), 3000)
  return () => clearTimeout(t)
}, [toast])
```

```html
{toast && (
  <div className={`mx-6 mb-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
    toast.type === 'success'
      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      : 'bg-red-50 text-red-700 border border-red-200'
  }`}>
    {toast.type === 'success'
      ? <CheckCircle className="w-4 h-4" />
      : <AlertCircle className="w-4 h-4" />
    }
    {toast.message}
  </div>
)}
```

---

## 17. Action Menus (Three-Dot)

### Trigger Button
```html
<button
  onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
  className="p-1.5 text-so-muted hover:text-so-text hover:bg-so-surface rounded-md"
>
  <MoreVertical className="w-4 h-4" />
</button>
```

### Dropdown Menu
```html
{openMenuId === id && (
  <>
    {/* Click-away overlay */}
    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
    {/* Menu */}
    <div className="absolute right-0 mt-1 w-40 bg-white border border-so-border rounded-lg shadow-lg z-20 py-1">
      <button className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface">
        Edit
      </button>
      <div className="border-t border-so-border my-1" />
      <button className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
        Delete
      </button>
    </div>
  </>
)}
```

### Menu Item Classes
```
// Standard action:
className="w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface"

// Destructive action:
className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"

// Divider between groups:
className="border-t border-so-border my-1"
```

---

## 18. Inline Delete Confirmation

Used on: Students, Inventory, Accounts, Batch cards — replaces action buttons with Yes/No confirmation.

```html
{deleteConfirmId === item.id ? (
  <div className="flex items-center justify-end gap-2">
    <span className="text-xs text-so-muted">Delete?</span>
    <button
      onClick={() => handleDelete(item.id)}
      className="text-xs px-2 py-1 bg-red-600 text-white rounded-md font-medium"
    >
      Yes
    </button>
    <button
      onClick={() => setDeleteConfirmId(null)}
      className="text-xs px-2 py-1 border border-so-border rounded-md text-so-muted"
    >
      No
    </button>
  </div>
) : (
  /* Normal action buttons */
)}
```

---

## 19. Empty States

### Table Empty State
Used when a table has no results (filtered or initial).
```html
<div className="py-20 flex flex-col items-center justify-center">
  <IconComponent className="w-10 h-10 text-so-muted/40 mb-3" strokeWidth={1.5} />
  <p className="text-so-text font-medium">No items found</p>
  <p className="text-so-muted text-sm mt-1">Adjust filters or add a new record</p>
</div>
```

**Icon sizes:**
- Large empty state (primary content area): `w-12 h-12 text-so-muted mb-4`
- Medium empty state (inside card): `w-10 h-10 text-so-muted/40 mb-3`

---

## 20. Page Header

### Standard Page Header (with subtitle)
```html
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="text-2xl font-bold text-so-text flex items-center gap-2">
      <Icon className="w-6 h-6 text-so-accent" />
      Page Title
    </h1>
    <p className="text-so-muted text-sm mt-1">Description text</p>
  </div>
  <button className="flex items-center gap-2 bg-so-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
    <Plus className="w-4 h-4" />
    Add Item
  </button>
</div>
```

### Minimal Page Header (Dashboard-style)
```html
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div>
    <h1 className="text-2xl font-bold text-so-text">Dashboard</h1>
    <p className="text-so-muted text-sm mt-0.5">42 students actively training</p>
  </div>
  <!-- Filter pills go here -->
</div>
```

---

## 21. Section Headings

### Section Title (within page body)
```
className="text-lg font-semibold text-so-text"
```

### Section Subtitle / Context
```
className="text-so-muted text-xs"
```

### Section with Flex Title + Subtitle
```html
<div className="flex items-center justify-between mb-4 mt-6">
  <h2 className="text-lg font-semibold text-so-text">Section Title</h2>
  <span className="text-so-muted text-xs">Context info</span>
</div>
```

---

## 22. Currency & Date Formatting

### Currency Display
```typescript
// Use this everywhere for Indian Rupee formatting:
`₹ ${amount.toLocaleString('en-IN')}`

// Or import from utils:
import { formatCurrency } from '@/lib/utils'
// formatCurrency(1500) → "₹1,500"
```

### Date Display
```typescript
import { format, parseISO } from 'date-fns'

// Standard: 01 Oct 2026
format(parseISO(dateStr), 'dd MMM yyyy')

// For IST today:
import { getTodayIST } from '@/lib/utils'
```

---

## 23. Animations

### Page Enter Animation
```
className="animate-in fade-in slide-in-from-bottom-4 duration-300"
```

### Modal Enter Animation
```
className="animate-in fade-in zoom-in-95 duration-200"
```

### Toast Enter Animation
```
className="animate-in fade-in slide-in-from-bottom-2"
```

---

## 24. Import Rules

### Always Import From (reuse these)
| Import | From |
|---|---|
| All icons | `lucide-react` (never use SVG inline except X close button in older modals) |
| Date utilities | `date-fns` (`format`, `parseISO`, `addMonths`, `addDays`, `subMonths`, `startOfMonth`, `endOfMonth`, `isWithinInterval`, `differenceInDays`) |
| App utilities | `@/lib/utils` (`formatCurrency`, `formatDate`, `formatTime`, `getTodayIST`, `calcAge`) |
| Mock data & types | `@/lib/mock-data` (all types, all arrays, all constants) |
| Navigation | `next/navigation` (`useRouter`, `usePathname`) |
| Dynamic params | `use()` from `'react'` — unwrap `params: Promise<{ id: string }>` with `const params = use(props.params)` |

### Existing Components to Import (NEVER rebuild inline)
| Component | Import Path | When to Use |
|---|---|---|
| `AddStudentModal` | `@/components/students/AddStudentModal` | Any "Add Student" action |
| `EditStudentModal` | `@/components/students/EditStudentModal` | Any student edit action |
| `RenewModal` | `@/components/coaching/RenewModal` | Any coaching renewal/collect remaining |
| `ReEnrollModal` | `@/components/students/ReEnrollModal` | Any dropout re-enrollment |
| `DropoutConfirmModal` | `@/components/students/DropoutConfirmModal` | Any move-to-dropout |
| `CollectRemainingModal` | `@/components/students/CollectRemainingModal` | Any partial payment collection |
| `AddMemberModal` | `@/components/court/AddMemberModal` | Any court member enrollment |
| `EditCourtMemberModal` | `@/components/court/EditCourtMemberModal` | Any court member edit |
| `RenewCourtMemberModal` | `@/components/court/RenewCourtMemberModal` | Any court renewal |
| `BuySessionsModal` | `@/components/court/BuySessionsModal` | Any session top-up |
| `CollectCourtPaymentModal` | `@/components/court/CollectCourtPaymentModal` | Any court payment collection |
| `AccountEntryModal` | `@/components/accounts/AccountEntryModal` | Any expense/income add/edit |
| `AddInventoryModal` | `@/components/accounts/AddInventoryModal` | Any inventory add |
| `EditInventoryModal` | `@/components/accounts/EditInventoryModal` | Any inventory edit |
| `InventoryDetailsModal` | `@/components/accounts/InventoryDetailsModal` | Any inventory detail view |
| `TemplateCard` | `@/components/communications/TemplateCard` | Communication template cards |
| `TemplateDetailShell` | `@/components/communications/TemplateDetailShell` | Communication detail wrapper |
| `Sidebar` | `@/components/layout/Sidebar` | Management layout only |
| `TopBar` | `@/components/layout/TopBar` | Management layout only |

### Build Inline (these have no shared component yet)
- Tabs (use pattern from Section 4)
- Search inputs (use pattern from Section 6)
- Filter pills (use pattern from Section 7)
- Tables (use pattern from Section 12)
- Action menus (use pattern from Section 17)
- Empty states (use pattern from Section 19)
- Toast notifications (use pattern from Section 16)
- Stat/KPI cards (use pattern from Section 2)

---

*End of UI Patterns Reference*
