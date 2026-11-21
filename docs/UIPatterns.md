# UI Patterns — Badminton Wing

## Agent protocol
1. Before UI work, read the Quick Index and open only the sections you need.
2. Copy the canonical class strings verbatim; reuse the components in §10.
3. Never invent styling. Add a missing pattern here in the same change.
4. Read `BW_Architecture_2.md` for hard rules and `BW_Structure_2.md` for routes.
5. Architecture rules override examples; feature behavior belongs in feature notes.
6. Use only tokens confirmed in §1; report missing tokens for approval.
7. Keep business reads on the server and mutations in Server Actions.
8. Use `formatCurrency()`, `getTodayIST()`, and date-fns as specified in §1.
9. Treat **NEW** patterns as review proposals; they do not imply application changes.
10. Before finishing, run the Consistency Checklist in §11.

## Quick Index

| If you are building… | Read |
|---|---|
| A new page, navbar, or section header | [§1 Foundations](#1-foundations), [§2 Layout](#2-layout-and-navigation), [§10 Registry](#10-component-registry) |
| A dashboard widget, KPI, or chart | [§3 Cards](#3-cards-kpis-charts-and-progress), [§9 States](#9-feedback-empty-loading-and-error-states) |
| A form or modal | [§4 Controls](#4-buttons-and-form-controls), [§8 Overlays](#8-modals-slide-overs-and-action-menus) |
| Tabs, segments, search, or date filters | [§5 Navigation and filters](#5-tabs-segments-and-filters) |
| A table or row action | [§6 Tables](#6-tables), [§8 Menus](#8-modals-slide-overs-and-action-menus) |
| A badge, avatar, or status display | [§7 Status](#7-badges-status-and-avatars) |
| Feedback, an empty view, or a skeleton | [§9 States](#9-feedback-empty-loading-and-error-states) |

## 1. Foundations

Verified against `src/app/globals.css` (`@theme`). Prefix a color with `bg-`, `text-`, `border-`, `fill-`, `stroke-`, `ring-`, or `accent-` as appropriate.

| Token suffix | Value | Purpose |
|---|---|---|
| `so-bg` | `#F4F6FA` | Page background |
| `so-card` | `#FFFFFF` | Cards, search, menus, selected segments |
| `so-surface` | `#EEF1F8` | Form fields, secondary surfaces |
| `so-border` | `#DDE3EE` | Outlines and dividers |
| `so-border-subtle` | `#EEF1F8` | Subtle dividers |
| `so-text` | `#0F1729` | Primary text, dark toast, backdrop |
| `so-muted` | `#64748B` | Secondary text |
| `so-grey` | `#484F58` | Placeholders, tertiary text |
| `so-accent` | `#3B6BE8` | Primary actions, selections |
| `so-accent-hover` | `#2563EB` | Defined accent hover token; primary buttons follow §4 |
| `so-accent-subtle` | `rgba(59,107,232,0.08)` | Light accent surface |
| `so-accent-muted` | `rgba(59,107,232,0.15)` | Stronger accent surface |
| `so-accent-text` | `#FFFFFF` | Text on dark or accent surfaces |
| `so-emerald` | `#059669` | Success |
| `so-emerald-subtle` | `rgba(5,150,105,0.10)` | Success surface |
| `so-red` | `#DC2626` | Error, destructive action |
| `so-red-subtle` | `rgba(220,38,38,0.10)` | Error surface |
| `so-yellow` | `#D97706` | Warning |
| `so-yellow-subtle` | `rgba(217,119,6,0.10)` | Warning surface |
| `so-nav` | `#232E44` | Sidebar |
| `so-nav-text` | `#FFFFFF` | Sidebar text |
| `so-blue` | `#58A6FF` | Informational category |
| `so-purple` | `#BC8CFF` | Category |
| `so-orange` | `#FFA657` | Attention category |

- Use `so-*` colors only. No raw palette classes, literal colors in JSX, inline `style`, or Recharts `contentStyle` objects. Structural `transparent`, `none`, and `currentColor` are allowed.
- Import icons only from `lucide-react`: `className="w-5 h-5 shrink-0"` or compact `w-4 h-4 shrink-0`, always `strokeWidth={1.75}`. Give icon-only controls an accessible label.
- Import `formatCurrency` and `getTodayIST` from `@/lib/utils`. UI amounts are rupees; call `formatCurrency(amount)`. Database paise conversion belongs at the server boundary.
- Store dates as `YYYY-MM-DD` strings. Obtain today once with `const today = getTodayIST()`; use it for comparisons and any today-based `min`/`max`. Never construct today directly for business-date comparisons or input bounds. LiveClock owns IST clock display.
- Default date display: `format(parseISO(date), 'dd MMM yyyy')` from `date-fns`; preserve existing feature display helpers and use date-fns for arithmetic.
- Migrated pages are async Server Components using server-only queries. Interactive views use `'use client'`; they never call Supabase for business data. Mutations use Server Actions and route revalidation.
- Recharts belongs only on `/dashboard` and `/reports`, never in modals or table rows.
- Use PascalCase components, kebab-case routes, and `@/*` imports. The verified court route is `/court-memberships`; consult the route map before linking.

## 2. Layout and navigation

The management layout owns Sidebar and TopBar. Import them there; child pages supply only page content. Reuse their navigation, account menu, and clock.

| Element | Canonical classes |
|---|---|
| Page wrapper | `max-w-7xl mx-auto pb-12` |
| Page header | `flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8` |
| Page title (`h1`) | `text-2xl font-bold text-so-text` |
| Page subtitle | `text-so-muted text-sm mt-1` |
| Section title row | `flex items-center justify-between gap-3 mb-4` |
| Section title (`h2`) | `text-sm font-semibold text-so-text` |
| Section context | `text-xs text-so-muted` |
| KPI grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` |
| Feature-card grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| Form field grid | `grid grid-cols-1 md:grid-cols-2 gap-4` |

Put the title/subtitle block first and actions or filters second in the header. Use one `h1` per page. Sources: TransactionsView, AccountsView, BatchesView, dashboard Card.

## 3. Cards, KPIs, charts, and progress

Content card: `bg-so-card border border-so-border rounded-xl shadow-sm p-5`. Table cards use §6 instead of padded content cards.
Clickable feature card: `bg-so-card border border-so-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-so-accent/50 transition-all cursor-pointer flex flex-col group relative` (BatchesView). Provide keyboard navigation as well as click handling.

KPI structure from DashboardStats; `Card` is the existing dashboard module listed in §10:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {metrics.map(metric => (
    <Card key={metric.id} title={metric.label}>
      <div className="text-2xl font-bold text-so-text">{metric.displayValue}</div>
      <p className="text-xs text-so-muted mt-2">{metric.note}</p>
    </Card>
  ))}
</div>
```
Prepare monetary `displayValue` with `formatCurrency()`; keep labels, counts, and availability logic in the feature.

**NEW — chart styling proposal for review.** Layout and `h-72` height derive from Reports/FeesSegment; card/title classes come from dashboard Card. Token axes and the custom tooltip replace report styling that violates §1. This is a documentation proposal, not an existing shared chart component. Use a Client Component importing Recharts and `formatCurrency`; `data` has `label` and rupee `amount` fields.
```tsx
<Card title={title} note={note}>
  <div className="h-72 w-full [&_.recharts-cartesian-axis-tick_text]:fill-so-muted [&_.recharts-cartesian-axis-tick_text]:text-xs">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-so-border)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="var(--color-so-muted)" />
        <YAxis axisLine={false} tickLine={false} tickFormatter={formatCurrency} stroke="var(--color-so-muted)" />
        <Tooltip cursor={false} content={({ active, payload, label }) => (
          active && payload?.length ? (
            <div className="bg-so-card border border-so-border rounded-lg shadow-lg p-3 text-sm">
              <p className="text-xs text-so-muted mb-1">{label}</p>
              {payload.map(item => (
                <p key={String(item.dataKey)} className="font-medium text-so-text">
                  {item.name}: {formatCurrency(Number(item.value))}
                </p>
              ))}
            </div>
          ) : null
        )} />
        <Bar dataKey="amount" name={seriesLabel} fill="var(--color-so-accent)" radius={[4, 4, 0, 0]} maxBarSize={50} />
      </BarChart>
    </ResponsiveContainer>
  </div>
</Card>
```
Use semantic series tokens `so-accent`, `so-emerald`, `so-yellow`, and `so-red`; other series may use the categorical tokens in §1. Supply a visible text summary and §9 empty state when there is no data.

Progress primitive from dashboard AttendanceAlertsCard: `<progress max={100} value={rate} aria-label={label} className="w-full h-2 accent-so-accent" />`. Show the value/counts in text. Semantic progress colors are `accent-so-emerald`, `accent-so-yellow`, and `accent-so-red`; thresholds belong to the feature. Do not use inline widths.

## 4. Buttons and form controls

These named constants are the class strings used by the structural snippets below. Define them in the consuming component; the snippets assume caller-supplied state, data, and handlers.
```tsx
const primaryClass = 'flex items-center justify-center gap-2 bg-so-accent text-so-accent-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50'
const secondaryClass = 'px-4 py-2 border border-so-border text-so-muted rounded-lg text-sm font-medium hover:border-so-accent hover:text-so-text transition-colors'
const labelClass = 'block text-xs text-so-muted uppercase tracking-wider mb-1.5'
const inputClass = 'w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent focus:border-so-accent transition-colors'
const selectClass = 'w-full bg-so-surface text-sm text-so-text px-3 py-2.5 border border-so-border rounded-lg focus:outline-none focus:ring-1 focus:ring-so-accent cursor-pointer'
const textareaClass = 'w-full bg-so-surface text-sm text-so-text placeholder:text-so-grey px-3 py-2.5 border border-so-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-so-accent'
const searchClass = 'w-full pl-9 pr-4 py-2 bg-so-card border border-so-border rounded-lg text-sm focus:outline-none focus:border-so-accent shadow-sm'
const dateRangeClass = 'bg-so-card border border-so-border rounded-md px-3 py-1.5 text-sm text-so-text'
```

| Control | Canonical classes / behavior |
|---|---|
| Destructive confirm | `text-xs px-2 py-1 bg-so-red text-so-accent-text rounded-md font-medium` |
| Compact cancel | `text-xs px-2 py-1 border border-so-border rounded-md text-so-muted` |
| Edit icon button | `p-1.5 rounded-md text-so-muted hover:text-so-accent hover:bg-so-surface transition-colors cursor-pointer` |
| Delete icon button | `p-1.5 rounded-md text-so-muted hover:text-so-red hover:bg-so-red-subtle transition-colors` |
| Filter trigger | `flex items-center gap-2 px-4 py-2 bg-so-card border border-so-border rounded-lg text-sm text-so-muted hover:border-so-accent hover:text-so-text transition-colors` |
| Close button | `text-so-grey hover:text-so-accent transition-colors`; Lucide X, standard size |
| Read-only field | `inputClass` plus the native `readOnly` attribute |
| Disabled action | Native `disabled`, add `disabled:opacity-50`; prevent duplicate submissions |

Associate each field's `id` with its label's `htmlFor`; use the same label casing in every form. Inputs, numbers, and form dates use `inputClass`; selects use `selectClass`; textareas use `textareaClass`. Label text remains readable words; CSS supplies uppercase.
Search wrapper: `relative w-full sm:w-72` (or `relative flex-1` in a flexible toolbar). Place a compact Search icon at `absolute left-3 top-1/2 -translate-y-1/2 text-so-muted`; apply §1 icon size/stroke. Give search an accessible name.
Toolbar select: `pl-9 pr-8 py-2 bg-so-card border border-so-border rounded-lg text-sm text-so-text focus:outline-none focus:border-so-accent shadow-sm cursor-pointer appearance-none`. Use a `relative` wrapper, compact left icon at `left-3` and ChevronDown at `right-3`, both `absolute top-1/2 -translate-y-1/2 pointer-events-none text-so-muted`. This is the Inventory toolbar control, not a second form-select style.
Sources: InventoryView search/select; AddStudentModal/FeeReceiptModal inputs/selects; accounts forms and inventory modals for label casing.

## 5. Tabs, segments, and filters

| Primitive | Container / base | Selected | Inactive |
|---|---|---|---|
| Underline tabs | Container `flex items-center gap-2 border-b border-so-border mb-6`; button `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize` | `border-so-accent text-so-accent` | `border-transparent text-so-muted hover:text-so-text` |
| Tab count | `ml-2 px-1.5 py-0.5 rounded-full text-xs` | `bg-so-accent text-so-accent-text` | `bg-so-surface text-so-muted` |
| Segment toggle | Container `flex bg-so-surface border border-so-border rounded-xl p-1 w-fit mb-6 shadow-sm`; button `px-6 py-2 rounded-lg text-sm font-semibold transition-all` | `bg-so-card text-so-text shadow-sm border border-so-border` | `text-so-muted hover:text-so-text` |
| Vertical tabs | Container `flex flex-col gap-2 border-r border-so-border p-4 shrink-0`; button `px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors` | `bg-so-accent text-so-accent-text` | `text-so-muted hover:text-so-text` |
| Filter pill | Button `px-3 py-1.5 text-xs font-semibold rounded-full transition-colors` | `bg-so-accent text-so-accent-text` | `border border-so-border text-so-muted hover:border-so-accent` |

Tabs use `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, and matching `role="tabpanel"` / `aria-labelledby`. Vertical lists also use `aria-orientation="vertical"`. Keep field state above tab panels; hide inactive panels with `hidden`. Implement arrow-key navigation and a single tab stop. Filter/segment buttons use `type="button"` and `aria-pressed`.
Sources: StudentList, CoachingTransactions, TransactionsView, AddStudentModal. Filter pills use the compact filled pattern for date, status, and entity filters.

### Period filters

Reuse [PeriodNavigation](../src/components/ui/PeriodNavigation.tsx) for the pill selector and previous/next arrows. Pass the supported `modes`, a named filter group, the derived `period`, and an `onNavigate(mode, anchor)` callback. The component highlights the active mode, announces the period label, and disables the forward arrow when the period includes today. Supply `pending` and `loadingLabel` when navigation waits for a server response. Use the children slot for an existing filter or action that belongs in the same bar, such as the Fees report's batch selector or Dashboard refresh.

- Use **Day / Week / Month** for high-frequency operational lists. Accounts uses all three modes. Use the same set for dated Fee Transactions lists when adding their filters.
- Use **Week / Month** for period-based Reports & Analysis segments. The Fees and Accounts reports pass those two modes to the shared component.
- Use [getPeriod](../src/lib/period.ts) with `getTodayIST()` to derive the label, Monday-to-Sunday weeks, calendar month boundaries, and previous/next anchors. Date-only ledger lists use an inclusive `start` to `end` range. Accounts includes recorded future-dated entries within a selected week or month. Use `through` as the inclusive upper bound for metrics that count activity only through today.
- Place each list's filter in its own toolbar after Search and before Add. Let the toolbar wrap on narrow screens. Keep a separate mode and anchor for each list in state that survives a tab switch. Accounts retains one selection each for Expenses, Inventory Sales, and Quick Sales. The visible summary follows the active list's date range before text search. Calculate Net Balance from income and expenses in that same range.
- Filter locally when the server has already loaded the full range. Paginate server reads where required. When navigation needs a new range, keep the loading and refresh logic with the feature. Dashboard uses URL navigation, Accounts filters the loaded ledger locally, and Reports manages its own data window.

Custom date row: `flex items-center gap-2 mt-2 mb-4`; both inputs use `dateRangeClass`, explicit labels, and `type="date"`. Set From `max={to || undefined}` and To `min={from || undefined}`; when the feature forbids future dates, set From `max={to || today}` and To `max={today}`, with `today = getTodayIST()`. The separator uses `text-so-muted text-sm`.
Use §8 for a custom-range slide-over when the feature requires one.

## 6. Tables

Structure from RecentTab; use `px-5 py-3` on every header and data cell. Keep header uppercase separate from the form-label rule.
```tsx
<div className="bg-so-card border border-so-border rounded-xl shadow-sm overflow-hidden min-h-[400px]">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-so-surface border-b border-so-border">
          <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Name</th>
          <th scope="col" className="text-right px-5 py-3 text-xs font-semibold text-so-muted uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-so-border">
        {rows.map(row => (
          <tr key={row.id} className="hover:bg-so-surface/50 transition-colors">
            <td className="px-5 py-3 font-medium text-so-text">{row.name}</td>
            <td className="px-5 py-3 text-right">{renderActions(row)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```
Secondary cells add `text-so-muted`; money cells use `font-bold text-so-emerald` for positive amounts or `font-bold text-so-red` for negative amounts, always `formatCurrency()`. Add `whitespace-nowrap` for dates/amounts.
Clickable names: `text-so-text font-medium hover:text-so-accent transition-colors text-left`, using a Link or button.
Render §9 empty content outside the table or inside a `td` spanning all columns; never place a `div` directly inside `tbody`. Reuse StudentList and CoachingTransactions (§10) before building a table.

## 7. Badges, status, and avatars

| Display | Canonical classes |
|---|---|
| Category badge | `px-2.5 py-1 bg-so-surface border border-so-border text-so-muted rounded-md text-[11px] font-medium uppercase tracking-wider` |
| Batch / schedule chip | `px-2 py-0.5 rounded-full bg-so-surface border border-so-border text-xs font-medium text-so-muted` |
| Status badge base | `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium` |
| Success status | `bg-so-emerald-subtle text-so-emerald` |
| Warning status | `bg-so-yellow-subtle text-so-yellow` |
| Error status | `bg-so-red-subtle text-so-red` |
| Neutral status | `bg-so-surface text-so-grey border border-so-border` |
| Status / age text | `text-xs font-medium whitespace-nowrap` plus semantic `text-so-muted`, `text-so-yellow`, or `text-so-red` |
| Secondary balance line | `block text-xs font-medium text-so-yellow` |
| Stock badge base | `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold` |
| Stock dot | `w-1.5 h-1.5 rounded-full` plus the matching semantic `bg-so-*` |
| Table initials avatar | `w-8 h-8 rounded-full bg-so-surface border border-so-border flex items-center justify-center text-xs font-bold text-so-muted uppercase` |
| Item placeholder | `w-8 h-8 rounded-lg bg-so-surface border border-so-border flex items-center justify-center overflow-hidden` |

Stock badge colors: success `bg-so-emerald-subtle text-so-emerald border-so-emerald/20`; warning `bg-so-yellow-subtle text-so-yellow border-so-yellow/20`; error `bg-so-red-subtle text-so-red border-so-red/20`. Quantity thresholds belong to Inventory.
Use `name.substring(0, 2)` for table initials and `name.charAt(0)` with `text-xs font-bold text-so-muted` for item placeholders. Icons obey §1.
Sources: StatusBadge, batch AttendanceInsights/AttendanceMarking, InventoryView, transaction tabs. StatusBadge supports Available/Booked/Blocked only; other statuses use this vocabulary without inventing business mappings.

## 8. Modals, slide-overs, and action menus

Modal structure derives from student receipt/enrollment modals. Use a 50% token backdrop (`bg-so-text/50`), preserving the dominant opacity while following §1.
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-so-text/50 backdrop-blur-sm p-4">
  <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative bg-so-card border border-so-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
    <div className="px-6 py-4 border-b border-so-border flex items-center justify-between">
      <h2 id={titleId} className="text-lg font-bold text-so-text">{title}</h2>
      <button type="button" aria-label="Close" disabled={saving} onClick={onClose} className="text-so-grey hover:text-so-accent transition-colors">
        <X className="w-5 h-5 shrink-0" strokeWidth={1.75} />
      </button>
    </div>
    <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">{children}</div>
    <div className="px-6 py-4 border-t border-so-border flex justify-end gap-3">
      <button type="button" disabled={saving} onClick={onClose} className={secondaryClass}>Cancel</button>
      <button type="button" disabled={saving} onClick={onConfirm} className={primaryClass}>{saving ? 'Saving…' : 'Confirm'}</button>
    </div>
  </section>
</div>
```
Width follows content: `max-w-md` for confirmation/simple forms, `max-w-lg` for medium forms, `max-w-2xl` for enrollment. Change only the width class.
Move focus into the dialog, trap focus, close on Escape when safe, and return focus to the trigger. Disable duplicate submissions and dismissal while saving.

Slide-over structure with the standard backdrop opacity:
```tsx
<div className="fixed inset-0 z-50 flex justify-end">
  <div className="absolute inset-0 bg-so-text/50" onClick={onClose} />
  <section role="dialog" aria-modal="true" aria-labelledby={filterTitleId} className="relative w-72 h-full bg-so-card border-l border-so-border flex flex-col shadow-2xl">
    <div className="flex items-center justify-between p-4 border-b border-so-border">
      <h2 id={filterTitleId} className="font-semibold text-so-text">Filters</h2>
      <button type="button" onClick={onClose} aria-label="Close filters" className="p-1 hover:bg-so-surface rounded"><X className="w-4 h-4 shrink-0 text-so-muted" strokeWidth={1.75} /></button>
    </div>
    <div className="p-4 flex-1 overflow-y-auto">{children}</div>
    <div className="p-4 border-t border-so-border flex gap-3">
      <button type="button" onClick={onApply} className={primaryClass}>Apply</button>
      <button type="button" onClick={onReset} className={secondaryClass}>Reset</button>
    </div>
  </section>
</div>
```
Filter radio rows: `flex items-center gap-3 py-2 cursor-pointer`; use real radio inputs with an accessible group name and `accent-so-accent`. Keep draft selections separate until Apply.

Action menu trigger: `p-1.5 rounded-md text-so-muted hover:text-so-text hover:bg-so-surface transition-colors`, with compact MoreVertical and `aria-expanded`.
Menu wrapper: `absolute right-0 top-full mt-1 w-32 bg-so-card border border-so-border rounded-lg shadow-lg z-50 py-1 text-left`, inside a `relative inline-block` anchor (InventoryView). Keep it outside clipped scroll regions; do not copy inline portal positioning.
Menu item: `w-full text-left px-4 py-2 text-xs font-medium text-so-text hover:bg-so-surface`. Destructive item: replace text/hover colors with `text-so-red hover:bg-so-red-subtle`. Divider: `border-t border-so-border my-1`.
Close on outside click and Escape; return focus to the trigger. Use a compact Yes/No inline confirmation (`flex items-center justify-end gap-2`, prompt `text-xs text-so-muted`, §4 buttons) before deleting. Preserve domain-specific confirmation dialogs.

## 9. Feedback, empty, loading, and error states

Use one dark bottom-right toast. Both outcomes use the same surface; success/error changes the message and icon. Source: InventoryView success toast.
Toast: `fixed bottom-6 right-6 z-[60] bg-so-text text-so-accent-text px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm`. Use `role="status"` / `aria-live="polite"` for success and `role="alert"` for error.
Use compact CheckCircle2 in `text-so-emerald` or AlertCircle in `text-so-red`, both with §1 icon sizing/stroke. The layer stays above `z-50` modals.
State: `useState<{ type: 'success' | 'error'; message: string } | null>(null)`. Auto-dismiss after 3000ms in an effect and clear the timer in its cleanup. Persistent field/server errors remain inline: `text-sm text-so-red`, `role="alert"`.

Empty state: container `py-20 flex flex-col items-center justify-center`; compact Lucide icon `w-5 h-5 shrink-0 text-so-muted mb-3`, stroke 1.75; title `text-so-text font-medium`; helper `text-so-muted text-sm mt-1`; optional §4 action. Explain whether filters or absent records caused the empty result.
Loading: per-route `loading.tsx`, using the existing Accounts/Students skeleton vocabulary. Match the final page layout and mark decorative placeholders `aria-hidden="true"`; provide a status label.
- Wrapper: `max-w-7xl mx-auto pb-12 space-y-4 animate-pulse`.
- Title placeholder: `h-8 w-40 bg-so-border rounded-lg`.
- KPI placeholders: §2 KPI grid with each `h-24 w-full bg-so-border rounded-xl`.
- Toolbar placeholder: `h-10 w-full bg-so-border rounded-lg`; content placeholder: `h-64 w-full bg-so-border rounded-xl`.

Error: per-route `error.tsx` is a Client Component with an accessible error message and §4 retry button invoking `reset()`. Keep raw server details out of user-facing copy.
Use built-in `animate-pulse` for skeletons and `animate-spin` for a compact Loader2. Do not rely on `animate-in`/`fade-in`/`slide-in-*`/`zoom-in-*`: this project's CSS/dependencies do not define those utilities.

## 10. Component registry

All paths below exist and exports were checked. These are default imports. Component props remain authoritative; reuse them before copying structural snippets. Their current styling is not permission to bypass §1.

| Component | Import path | Use |
|---|---|---|
| StudentList | `@/components/students/StudentList` | Shared directory |
| AddStudentModal | `@/components/students/AddStudentModal` | Enrollment / re-enrollment |
| EditStudentModal | `@/components/students/EditStudentModal` | Student edit |
| FeeReceiptModal | `@/components/students/FeeReceiptModal` | Fee receipt |
| DueClearanceModal | `@/components/students/DueClearanceModal` | Receipt balance collection |
| DropoutConfirmModal | `@/components/students/DropoutConfirmModal` | Dropout confirmation |
| CoachingTransactions | `@/components/transactions/CoachingTransactions` | Shared financial tabs |
| RecentTab | `@/components/transactions/RecentTab` | Receipt rows via controller |
| PaidTab | `@/components/transactions/PaidTab` | Paid rows via controller |
| PendingTab | `@/components/transactions/PendingTab` | Pending rows via controller |
| PartialTab | `@/components/transactions/PartialTab` | Partial rows via controller |
| ReminderLink | `@/components/transactions/ReminderLink` | Accessible reminder action |
| AddEnquiryModal | `@/components/enquiries/AddEnquiryModal` | Add enquiry |
| EditEnquiryModal | `@/components/enquiries/EditEnquiryModal` | Edit enquiry |
| EnquiryDetailsModal | `@/components/enquiries/EnquiryDetailsModal` | Enquiry details |
| ExpenseModal | `@/components/accounts/ExpenseModal` | Add/edit expense |
| ExpenseDetailsModal | `@/components/accounts/ExpenseDetailsModal` | Expense details |
| SaleModal | `@/components/accounts/SaleModal` | Sale form shell |
| QuickSaleForm | `@/components/accounts/QuickSaleForm` | Quick sale inside SaleModal |
| InventorySaleForm | `@/components/accounts/InventorySaleForm` | Inventory sale inside SaleModal |
| SaleDetailsModal | `@/components/accounts/SaleDetailsModal` | Sale details |
| AddInventoryModal | `@/components/accounts/AddInventoryModal` | Add inventory |
| EditInventoryModal | `@/components/accounts/EditInventoryModal` | Edit inventory |
| InventoryDetailsModal | `@/components/accounts/InventoryDetailsModal` | Inventory details |
| AddCourtMembershipModal | `@/components/court/AddCourtMembershipModal` | Court enrollment |
| EditCourtMembershipModal | `@/components/court/EditCourtMembershipModal` | Court edit |
| RenewCourtMembershipModal | `@/components/court/RenewCourtMembershipModal` | Court renewal |
| BuySessionsModal | `@/components/court/BuySessionsModal` | Session top-up |
| CollectCourtPaymentModal | `@/components/court/CollectCourtPaymentModal` | Court payment |
| StatusBadge | `@/components/ui/StatusBadge` | Available / Booked / Blocked |
| TemplateCard | `@/components/communications/TemplateCard` | Template gallery |
| TemplateDetailShell | `@/components/communications/TemplateDetailShell` | Template wrapper |
| TemplateHistory | `@/components/communications/TemplateHistory` | Template history |
| Sidebar | `@/components/layout/Sidebar` | Management shell |
| TopBar | `@/components/layout/TopBar` | Management shell |
| LiveClock | `@/components/layout/LiveClock` | IST shell clock |
| Card | `@/components/ui/Card` | Shared Dashboard and Reports panel |
| DashboardStats | `@/app/(management)/dashboard/_components/DashboardStats` | Existing dashboard KPIs |
| PeriodNavigation | `@/components/ui/PeriodNavigation` | Shared controlled Day / Week / Month period toolbar |

Do not use the unused legacy AccountEntryModal or the empty ConfirmDialog stub for new work. No shared button, input, toast, generic table, or chart component currently exists; use the relevant section.
Import application types with `import type` from `@/lib/types/<feature>`, helpers from `@/lib/utils`, and navigation from `next/link` / `next/navigation`. Keep data-source and business-flow instructions in the architecture/structure documents.

## 11. Consistency Checklist

- [ ] Read the indexed sections and reuse existing components from §10.
- [ ] All authored colors use verified §1 tokens; no missing tokens or inline styles.
- [ ] Buttons, labels, inputs, selects, and textareas copy §4 classes.
- [ ] Tabs, segments, search, and filter pills follow §5.
- [ ] Table cells use `px-5 py-3`; rows, headers, and empty markup follow §6.
- [ ] Currency uses `formatCurrency()`; today uses `getTodayIST()`; date display uses date-fns.
- [ ] Modals/slide-overs follow §8, including focus, accessible names, and pending state.
- [ ] Empty, loading, error, and toast states follow §9; no sample-data fallbacks.
- [ ] Lucide icons use 4/5 sizing, stroke 1.75, and `shrink-0`; controls have accessible labels.
- [ ] Business data stays behind server queries/actions; Recharts stays on dashboard/reports; any **NEW** proposal is identified for review.
