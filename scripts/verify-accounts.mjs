import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Load the actual components with isolated server-action fixtures. No hosted writes.
function loader(overrides = {}) {
  const cache = new Map()
  return function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename)
    const loadedModule = { exports: {} }, native = createRequire(filename)
    const require = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id]
      if (id === 'server-only') return {}
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id)
        const target = [base, base + '.ts', base + '.tsx'].find(f => fs.existsSync(f) && fs.statSync(f).isFile())
        if (target) return load(target)
      }
      return native(id)
    }
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename })(require, loadedModule, loadedModule.exports)
    cache.set(filename, loadedModule.exports)
    return loadedModule.exports
  }
}

const calls = [], notices = []
const today = '2026-11-16'
const utils = loader()('src/lib/utils.ts')
let result = { success: true }, refreshes = 0
const actions = Object.fromEntries(['createExpense', 'updateExpense', 'deleteExpense', 'createCustomCategory', 'createSale', 'updateSale', 'deleteSale']
  .map(name => [name, async (...args) => { calls.push([name, ...args]); return result }]))
const overrides = {
  '../actions': actions,
  '@/app/(management)/accounts/actions': actions,
  'next/navigation': { useRouter: () => ({ refresh() { refreshes++ } }) },
  '@/lib/utils': { ...utils, getTodayIST: () => today },
}

// Exercise event handlers and refreshed props without a browser or a test dependency.
function harness(file) {
  const state = []
  let index = 0, currentProps
  const hooks = { ...React,
    useState(initial) {
      const slot = index++
      if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial
      return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value }]
    },
    useRef(initial) { const slot = index++; return state[slot] ??= { current: initial } },
    useMemo(fn) { return fn() },
    useEffect() {},
  }
  const Component = loader({ ...overrides, react: hooks })(file).default
  return { render(props = currentProps) { index = 0; currentProps = props; return Component(props) } }
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !node.props) return []
  return [node, ...elements(node.props.children)]
}
function find(tree, predicate) {
  const node = elements(tree).find(predicate)
  assert(node, 'Expected component/control was not rendered')
  return node
}
const component = (tree, name) => find(tree, node => node.type?.name === name)
const button = (tree, label) => find(tree, node => node.type === 'button' && node.props.children === label)
const sale = (id, saleType, amount, extra = {}) => ({ id, saleType, amount, itemName: id, category: saleType === 'quick' ? 'Quick Sale' : 'Equipment',
  date: '2026-11-05', unitPrice: amount, paymentMethod: 'cash', ...extra })
const sales = [sale('Racket', 'inventory', 0.1), sale('Grip', 'inventory', 0.2), sale('Restring', 'quick', 10.15)]
const expenses = [{ id: 'e1', description: 'Repair', date: '2026-11-01', category: 'Repairs', amount: 12.3 },
  { id: 'e2', description: 'Other repair', date: '2026-11-02', category: 'Repairs', amount: 0.1 },
  { id: 'e3', description: 'Cleaning', date: '2026-11-03', category: 'Maintenance', amount: 1 }]
const load = loader(overrides)
const { getPeriod, PERIOD_MODES } = load('src/lib/period.ts')
const defaultPeriod = getPeriod('month', undefined, today)
assert.equal(getPeriod('day', today, today).label, '16 Mon · November 2026')
assert.equal(getPeriod('day', '2026-11-15', today).next, today)
assert.equal(defaultPeriod.next, null)
assert.deepEqual([getPeriod('week', '2026-11-01', today).start, getPeriod('week', '2026-11-01', today).end],
  ['2026-10-26', '2026-11-01'])
const { getAccountsSummary } = load('src/app/(management)/accounts/_lib/accounts-summary.ts')
const before = JSON.stringify({ sales, expenses }), summary = getAccountsSummary(expenses, sales)
assert.equal(summary.totalExpenses, 13.4)
assert.equal(summary.totalIncome, 10.45)
assert.equal(summary.netBalance, -2.95)
assert.equal(summary.inventoryTotal, 0.3)
assert.equal(summary.quickTotal, 10.15)
assert.equal(Math.round(summary.inventoryTotal * 100) + Math.round(summary.quickTotal * 100), Math.round(summary.totalIncome * 100))
assert.deepEqual(summary.topCategory, { name: 'Repairs', amount: 12.4 })
assert.equal(summary.inventoryCount, 2); assert.equal(summary.quickCount, 1)
assert.equal(getAccountsSummary([], []).topCategory, null)
assert.equal(JSON.stringify({ sales, expenses }), before)

const Summary = load('src/app/(management)/accounts/_components/AccountsSummary.tsx').default
const expenseHtml = renderToStaticMarkup(React.createElement(Summary, { segment: 'expense', expenses, sales }))
const incomeHtml = renderToStaticMarkup(React.createElement(Summary, { segment: 'income', expenses, sales }))
assert(expenseHtml.includes('Top Category')); assert(expenseHtml.includes('Income - Expenses')); assert(expenseHtml.includes('text-so-red'))
assert(incomeHtml.includes('2 sales')); assert(!incomeHtml.includes('Net Balance'))

// Page selection, period/search separation, and prop refresh retain local state.
const view = harness('src/app/(management)/accounts/_components/AccountsView.tsx')
const pageProps = {
  initialExpenses: expenses,
  initialSales: [...sales, sale('Walk-in', 'quick', 5, { date: today }), sale('Scheduled sale', 'quick', 5, { date: '2026-11-30' })],
  initialCustomCategories: [], initialInventoryItems: [],
}
let page = view.render(pageProps)
assert.equal(component(page, 'AccountsSummary').props.segment, 'expense')
assert.equal(component(page, 'AccountsSummary').props.sales.length, 5)
const expenseFilter = tree => find(tree, n => n.type?.name === 'PeriodNavigation' && n.props.filtersLabel === 'Expenses date filter')
assert.equal(expenseFilter(page).props.period.mode, 'month')
expenseFilter(page).props.onNavigate('day', '2026-11-02')
page = view.render()
assert.deepEqual(component(page, 'AccountsSummary').props.expenses.map(row => row.id), ['e2'])
assert.equal(component(page, 'AccountsSummary').props.sales.length, 0)
button(page, 'Income').props.onClick()
page = view.render()
assert.equal(component(page, 'InventorySalesTab').props.period.mode, 'month')
component(page, 'InventorySalesTab').props.onNavigate('week', '2026-11-06')
page = view.render()
assert.deepEqual(component(page, 'AccountsSummary').props.sales, sales)
assert.equal(component(page, 'QuickSalesTab').props.period.mode, 'month')
find(page, n => n.props.id === 'income-tab-quick').props.onClick()
page = view.render()
component(page, 'QuickSalesTab').props.onNavigate('day', today)
page = view.render({ ...pageProps, initialSales: [...pageProps.initialSales] })
assert.equal(component(page, 'AccountsSummary').props.segment, 'income')
assert.deepEqual(component(page, 'AccountsSummary').props.sales.map(row => row.id), ['Walk-in'])
assert.equal(component(page, 'InventorySalesTab').props.period.mode, 'week')
assert.equal(component(page, 'QuickSalesTab').props.period.mode, 'day')
assert.equal(find(page, n => n.props.id === 'income-tab-quick').props['aria-selected'], true)
button(page, 'Expenses').props.onClick()
page = view.render()
assert.equal(expenseFilter(page).props.period.anchor, '2026-11-02')
find(page, n => n.props['aria-label'] === 'Search expenses').props.onChange({ target: { value: 'No match' } })
page = view.render()
assert.equal(component(page, 'AccountsSummary').props.expenses.length, 1)
assert(elements(page).some(n => n.props.children === 'No expenses match your search'))
assert.equal(refreshes, 0)

for (const [type, name] of [['inventory', 'InventorySalesTab'], ['quick', 'QuickSalesTab']]) {
  const tab = harness('src/app/(management)/accounts/_components/income/' + name + '.tsx')
  const props = { sales, inventoryItems: [], period: defaultPeriod, onNavigate() {}, onNotify: notice => notices.push(notice) }
  let tree = tab.render(props), list = component(tree, 'SalesList')
  assert(list.props.sales.every(row => row.saleType === type))
  const differentDay = tab.render({ ...props, period: getPeriod('day', '2026-11-06', today) })
  assert.equal(component(differentDay, 'SalesList').props.sales.length, 0)
  list.props.onSearch(type === 'inventory' ? 'racket' : 'restring')
  tree = tab.render(props); list = component(tree, 'SalesList')
  assert.equal(list.props.sales.length, 1)
  list.props.onAdd()
  tree = tab.render()
  let modal = component(tree, 'SaleModal')
  assert.equal(modal.props.saleType, type)
  await modal.props.onSave(sale('Added', type, 25))
  assert.equal(calls.at(-1)[0], 'createSale')
  tree = tab.render({ ...props, sales: [...sales, sale('Added', type, 25)] })
  assert.equal(component(tree, 'SalesList').props.search, type === 'inventory' ? 'racket' : 'restring')
  assert(!elements(tree).some(n => n.type?.name === 'SaleModal'))
  const existing = sales.find(row => row.saleType === type)
  component(tree, 'SalesList').props.onEdit(existing)
  tree = tab.render(); modal = component(tree, 'SaleModal')
  assert.equal(modal.props.existingSale.id, existing.id)
  await modal.props.onSave(existing)
  assert.deepEqual([calls.at(-1)[0], calls.at(-1)[1], calls.at(-1)[3]], ['updateSale', existing.id, type])
  tree = tab.render()
  component(tree, 'SalesList').props.onDelete(existing.id)
  tree = tab.render()
  await component(tree, 'SalesList').props.onConfirmDelete()
  assert.deepEqual(calls.at(-1), ['deleteSale', existing.id, type])
  tree = tab.render()
  component(tree, 'SalesList').props.onAdd()
  tree = tab.render()
  result = { error: 'Fixture stock error' }
  await component(tree, 'SaleModal').props.onSave(existing)
  tree = tab.render()
  assert(component(tree, 'SaleModal'))
  assert.equal(notices.at(-1).message, 'Fixture stock error')
  assert.equal(component(tree, 'SalesList').props.saving, false)
  result = { success: true }
}
assert.equal(refreshes, 6)

// Actual inventory form retains product selection, quantity limits and stock checks.
const inventoryForm = harness('src/app/(management)/accounts/_components/income/InventorySaleForm.tsx')
const product = { id: 'product', name: 'Racket', category: 'Equipment', quantity: 2, sellingPrice: 100 }
let saved = null
let form = inventoryForm.render({ inventoryItems: [product], existingSale: null, saving: false, onClose() {}, onSave(value) { saved = value } })
find(form, n => n.type === 'button' && n.props.className.includes('w-full bg-so-surface')).props.onClick()
form = inventoryForm.render()
find(form, n => n.type === 'button' && n.key === 'product').props.onClick()
form = inventoryForm.render()
const quantity = find(form, n => n.props.id === 'inventory-sale-quantity')
assert.equal(quantity.props.max, 2)
quantity.props.onChange({ target: { value: '3' } })
form = inventoryForm.render()
find(form, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
form = inventoryForm.render()
assert.equal(saved, null)
assert(elements(form).some(n => n.props.children === 'Insufficient stock — only 2 available'))
find(form, n => n.props.id === 'inventory-sale-quantity').props.onChange({ target: { value: '2' } })
form = inventoryForm.render()
find(form, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
assert.equal(saved.quantity, 2); assert.equal(saved.amount, 200); assert.equal(saved.saleType, 'inventory')
const quickForm = harness('src/app/(management)/accounts/_components/income/QuickSaleForm.tsx')
const quickSale = sale('Service', 'quick', 100)
form = quickForm.render({ existingSale: quickSale, saving: false, onClose() {}, onSave(value) { saved = value } })
find(form, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
assert.equal(saved.saleType, 'quick'); assert.equal(saved.amount, 100)

const SaleModal = load('src/app/(management)/accounts/_components/income/SaleModal.tsx').default
for (const type of ['inventory', 'quick']) {
  const html = renderToStaticMarkup(React.createElement(SaleModal, { saleType: type, inventoryItems: [], existingSale: null, saving: false, onClose() {}, onSave() {} }))
  assert(html.includes(type === 'inventory' ? 'Select Product' : 'Item Name'))
  assert(!html.includes(type === 'inventory' ? 'Add Quick Sale' : 'Select Product'))
  assert(!html.includes('role="tablist"'))
}
const SalesList = load('src/app/(management)/accounts/_components/income/SalesList.tsx').default
for (const type of ['inventory', 'quick']) {
  const props = { saleType: type, period: defaultPeriod, search: '', onSearch() {}, onAdd() {}, onNavigate() {} }
  const html = renderToStaticMarkup(React.createElement(SalesList, { ...props, sales: [] }))
  const addLabel = type === 'inventory' ? 'Add Inventory Sale' : 'Add Quick Sale'
  assert(html.indexOf('type="search"') < html.indexOf('sales date filter'))
  assert(html.indexOf('sales date filter') < html.indexOf(addLabel))
  assert.match(html, /disabled="" aria-label="Next period"/)
  assert(html.includes('sales in this period'))
  const rows = renderToStaticMarkup(React.createElement(SalesList, { ...props, sales: sales.filter(s => s.saleType === type) }))
  assert.equal(rows.includes('>Category</th>'), type === 'inventory')
}

const navigator = harness('src/components/ui/PeriodNavigation.tsx')
const navigation = []
const toolbar = navigator.render({ modes: PERIOD_MODES, period: defaultPeriod, filtersLabel: 'Sales date filter',
  onNavigate: (mode, anchor) => navigation.push([mode, anchor]) })
button(toolbar, 'Day').props.onClick()
find(toolbar, n => n.props['aria-label'] === 'Previous period').props.onClick()
assert.deepEqual(navigation, [['day', today], ['month', '2026-10-01']])

const pages = []
const ledgerReader = loader({
  '@/lib/supabase/auth-context': { getServerSession: async () => ({
    academyId: 'academy',
    supabase: { from: table => {
      const order = []
      return {
        select() { return this },
        eq(key, value) {
          assert.equal(value, key === 'academy_id' ? 'academy' : 'expense')
          return this
        },
        order(key) { order.push(key); return this },
        range(from, to) {
          assert.deepEqual(order, ['date', 'created_at', 'id'])
          pages.push([table, from, to])
          return Promise.resolve({ data: Array.from({ length: from === 0 ? 1000 : 1 }, (_, offset) => ({
            id: String(from + offset), amount: 1250, unit_price: 1250, date: from === 0 ? today : '2026-10-31',
          })), error: null })
        },
      }
    } },
  }) },
})
const oldExpenses = await ledgerReader('src/lib/queries/accounts.ts').getExpenses()
const oldSales = await ledgerReader('src/lib/queries/sales.ts').getSales()
assert.equal(oldExpenses.length, 1001)
assert.equal(oldSales.length, 1001)
assert.equal(oldExpenses.at(-1).date, '2026-10-31')
assert.equal(oldSales.at(-1).amount, 12.5)
assert.deepEqual(pages.map(([, from, to]) => [from, to]), [[0, 999], [1000, 1999], [0, 999], [1000, 1999]])

console.log('PASS: independent Day/Week/Month filters, toolbar layout, period and search state across tabs and refreshes, paginated ledger reads, summary reconciliation, and sale form and mutation behavior.')
