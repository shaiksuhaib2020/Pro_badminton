import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

function makeLoader(overrides = {}) {
  const cache = new Map()
  return function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename)
    const native = createRequire(filename)
    const compiled = { exports: {} }
    const require = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id]
      if (id === 'server-only') return {}
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id)
        const target = [base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate))
        if (target) return load(target)
      }
      return native(id)
    }
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    })
    vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename })(require, compiled, compiled.exports)
    cache.set(filename, compiled.exports)
    return compiled.exports
  }
}

const load = makeLoader()
const base = 'src/app/(management)/reports/_components/accounts/'
const { getReportPeriod, getReportWindowRange, coversReportPeriod } = load('src/lib/reports/period.ts')
const { rollUpAccountsPeriod } = load('src/lib/reports/accounts.ts')
const { buildAccountsExport } = load(base + 'accounts-export.ts')
const { getAccountsSummary } = load('src/app/(management)/accounts/_lib/accounts-summary.ts')
const utils = load('src/lib/utils.ts')
const today = '2026-11-20'
const november = getReportPeriod('month', today, today)
const october = getReportPeriod('month', '2026-10-01', today)
const octoberWeek = getReportPeriod('week', '2026-10-02', today)
const expense = (id, date, amount, category, extra = {}) => ({ id, date, amount, category, academy_id: 'one', entry_type: 'expense', payment_method: 'card', ...extra })
const sale = (id, date, amount, sale_type, payment_method, extra = {}) => ({ id, date, amount, sale_type, payment_method, academy_id: 'one', ...extra })
const expenses = [
  expense('repair', '2026-11-02', 18000, 'Maintenance & Repairs'),
  expense('another-repair', '2026-11-04', 15050, 'Maintenance & Repairs'),
  expense('custom', '2026-11-08', 20000, 'Stringing tools'),
  expense('old', '2026-10-04', 30000, 'Court Rent'),
  expense('future', '2026-11-29', 100000, 'Future expense'),
  expense('foreign', '2026-11-08', 100000, 'Foreign', { academy_id: 'two' }),
  expense('legacy-income', '2026-11-01', 100000, 'Legacy', { entry_type: 'income' }),
  ...Array.from({ length: 1001 }, (_, i) => expense(`bulk-${String(i).padStart(4, '0')}`, '2026-10-05', 1, 'Court Rent')),
]
const sales = [
  sale('stock', '2026-11-02', 80030, 'inventory', 'upi', { quantity: 2, unit_price: 40015 }),
  sale('cash', '2026-11-04', 5555, 'quick', 'cash'),
  sale('other', '2026-11-08', 1415, 'quick', 'other'),
  sale('future-sale', '2026-11-29', 100000, 'inventory', 'upi'),
  sale('foreign-sale', '2026-11-08', 100000, 'quick', 'cash', { academy_id: 'two' }),
]
const pages = []
const fixture = table => {
  const rows = table === 'account_entries' ? expenses : sales
  const filters = []
  let first = 0
  let last = 999
  let signal
  return {
    select() { return this }, order() { return this },
    eq(key, value) { filters.push(row => row[key] === value); return this },
    in(key, values) { filters.push(row => values.includes(row[key])); return this },
    gte(key, value) { filters.push(row => row[key] >= value); return this },
    lte(key, value) { filters.push(row => row[key] <= value); return this },
    range(from, to) { first = from; last = to; pages.push({ table, from }); return this },
    abortSignal(input) { signal = input; return this },
    then(resolve, reject) {
      assert(!signal.aborted)
      return Promise.resolve({ data: rows.filter(row => filters.every(filter => filter(row))).slice(first, last + 1), error: null }).then(resolve, reject)
    },
  }
}
const accountSession = { academyId: 'one', role: 'accountant', supabase: { from: fixture } }
let session = accountSession
const { GET } = makeLoader({
  '@/lib/supabase/auth-context': { readServerSession: async () => session },
  '@/lib/utils': { ...utils, getTodayIST: () => today },
})('src/app/api/reports/accounts/route.ts')
const read = search => GET(new Request(`http://localhost/api/reports/accounts?${search}`))
session = null
assert.equal((await read('view=window&mode=month')).status, 401)
session = { ...accountSession, role: 'receptionist' }
assert.equal((await read('view=window&mode=month')).status, 403)
assert.equal((await read('view=period&mode=month&date=2026-11-01')).status, 403)
session = accountSession
assert.equal((await read('view=window&mode=day')).status, 400)
assert.equal((await read('view=period&mode=month&date=2026-12-01')).status, 400)
assert.equal((await read('view=period&mode=month')).status, 400)

const initialResponse = await read('view=window&mode=month')
assert.equal(initialResponse.headers.get('cache-control'), 'private, no-store')
const { window: snapshot } = await initialResponse.json()
assert(pages.some(page => page.table === 'account_entries' && page.from === 1000))
assert(coversReportPeriod(snapshot.range, octoberWeek))
assert(!coversReportPeriod(snapshot.range, getReportPeriod('month', '2026-08-01', today)))
assert(!coversReportPeriod({ ...snapshot.range, start: '2026-10-01' }, octoberWeek))
assert(!JSON.stringify(snapshot).includes('foreign-sale'))

const report = rollUpAccountsPeriod(snapshot.days, november)
const asRupees = rows => rows.filter(row => row.academy_id === 'one' && row.entry_type !== 'income' && row.date >= november.start && row.date <= november.through)
  .map(row => ({ ...row, amount: row.amount / 100, saleType: row.sale_type }))
const ledger = getAccountsSummary(asRupees(expenses), asRupees(sales))
assert.deepEqual([report.income, report.expenses, report.net], [87000, 53050, 33950])
assert.deepEqual([report.income, report.expenses, report.net], [ledger.totalIncome, ledger.totalExpenses, ledger.netBalance].map(value => Math.round(value * 100)))
assert.deepEqual(report.categories.map(slice => slice.label), ['Maintenance & Repairs', 'Stringing tools'])
assert.equal(report.categories[0].label, ledger.topCategory.name)
const sum = slices => slices.reduce((total, slice) => total + slice.amount, 0)
assert.equal(sum(report.categories), report.expenses)
assert.equal(sum(report.streams), report.income)
assert.equal(sum(report.modes), report.income)
assert.deepEqual(report.modes.map(slice => slice.amount), [80030, 5555, 0, 1415])
assert.deepEqual(report.buckets.slice(0, 2).map(({ amounts }) => [amounts.inventory, amounts.quick]), [[80030, 5555], [0, 1415]])
assert(report.buckets.every(({ amounts }) => amounts.inventory + amounts.quick === amounts.income))
assert(report.buckets.slice(3).every(bucket => bucket.future && Object.values(bucket.amounts).every(amount => amount === 0)))
const novemberWeek = getReportPeriod('week', '2026-11-06', today)
const weekly = rollUpAccountsPeriod(snapshot.days, novemberWeek)
assert.deepEqual(weekly.buckets.map(bucket => bucket.label), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
assert.deepEqual(weekly.buckets.map(({ amounts }) => [amounts.inventory, amounts.quick]),
  [[80030, 0], [0, 0], [0, 5555], [0, 0], [0, 0], [0, 0], [0, 1415]])
const negative = rollUpAccountsPeriod(snapshot.days, october)
assert.deepEqual([negative.income, negative.expenses, negative.net], [0, 31001, -31001])
assert.equal(rollUpAccountsPeriod(snapshot.days, octoberWeek).expenses, 30000)

// A backdated edit affects the live exact-period export, even with the old window still open.
expenses.find(row => row.id === 'another-repair').amount = 50050
const exact = await (await read('view=period&mode=month&date=2026-11-01')).json()
assert.equal(exact.report.expenses, 88050)
assert.equal(exact.report.net, -1050)
assert.equal(report.expenses, 53050)
const payload = buildAccountsExport(exact.period, exact.report, exact.refreshedAt)
assert.equal(payload.title, 'Accounts Report')
assert.match(payload.dataRefreshed, / IST$/)
assert.equal(payload.metrics[2][1], '-₹10.50')
assert.equal(payload.sections[0].rows.length, 3)

const AccountsSegment = load(base + 'AccountsSegment.tsx').default
const markup = (period, report) => renderToStaticMarkup(React.createElement(AccountsSegment, {
  period, report, pending: false, onNavigate() {}, refreshedAt: snapshot.refreshedAt,
}))
const html = markup(november, report)
for (const label of ['Income vs. Expenses', 'Income Streams', 'Expenses by Category', 'Sales by Payment Mode']) assert(html.includes(label))
for (const label of ['Total Income', 'Total Expenses', 'Net Cashflow']) assert(!html.includes(label))
assert.match(html, /role="region" aria-label="Expenses by Category"/)
assert(html.includes('Stringing tools'))
assert.match(html, /92%|92\.0%/)
assert(!html.includes('All Batches'))
assert(!html.includes('>Day<'))
const empty = markup(november, rollUpAccountsPeriod([], november))
assert(empty.includes('No sales recorded'))
assert(empty.includes('No expenses recorded'))

const chartProps = { bars: [], axes: [], labels: [] }
const renderChildren = ({ children }) => children
const noOutput = () => null
const { default: AccountsChartFixture } = makeLoader({
  recharts: {
    ResponsiveContainer: renderChildren, BarChart: renderChildren, PieChart: renderChildren, Pie: renderChildren,
    CartesianGrid: noOutput, Cell: noOutput, YAxis: noOutput, Tooltip: noOutput,
    Bar(props) { chartProps.bars.push(props); return null },
    XAxis(props) { chartProps.axes.push(props); return null },
    Label(props) { chartProps.labels.push(props); return null },
  },
})(base + 'AccountsSegment.tsx')
renderToStaticMarkup(React.createElement(AccountsChartFixture, { period: november, report, pending: false, onNavigate() {} }))
assert.deepEqual(chartProps.bars.filter(bar => bar.stackId).map(bar => bar.name), ['Inventory Sales', 'Quick Sales'])
assert.equal(chartProps.axes[2].dataKey, 'label')
assert.equal(chartProps.bars[4].dataKey, 'amount')
assert.deepEqual(chartProps.labels.map(label => [label.position, label.value]), [['center', '₹870']])

const ReportsView = makeLoader({ './reports.module.css': { segment: 'report-segment' } })(
  'src/app/(management)/reports/_components/ReportsView.tsx',
).default
const shell = accountsAllowed => renderToStaticMarkup(React.createElement(ReportsView, {
  period: november, data: Promise.resolve({ error: 'Fees unavailable' }), accountsAllowed,
}))
assert.match(shell(true), />Accounts<\/button>/)
assert.match(shell(true), /class="report-segment"/)
assert.doesNotMatch(shell(false), />Accounts<\/button>/)

const hookSlots = []
let hookIndex = 0
const requests = []
const { useAccountsWindow: readWindowWithTestHooks } = makeLoader({
  react: {
    useState(initial) {
      const slot = hookIndex++
      hookSlots[slot] ??= initial()
      return [hookSlots[slot], update => { hookSlots[slot] = typeof update === 'function' ? update(hookSlots[slot]) : update }]
    },
    useRef(initial) {
      const slot = hookIndex++
      return hookSlots[slot] ??= { current: initial }
    },
    useCallback: callback => callback,
    useEffect() {},
  },
  './accounts-client': {
    AccountsReadError: class extends Error {},
    fetchAccountsWindow: (mode, date, signal) => new Promise((resolve, reject) => {
      requests.push({ mode, date, signal, resolve, reject })
    }),
  },
  '@/lib/utils': { ...utils, getTodayIST: () => today },
})(base + 'useAccountsWindow.ts')
const renderWindow = () => {
  hookIndex = 0
  return readWindowWithTestHooks(true)
}
const select = (mode, date) => renderWindow().navigate(mode, date)
const answer = async (request, data) => {
  request.resolve(data)
  await Promise.resolve()
}
const windowFor = anchor => ({ ...snapshot, range: getReportWindowRange(getReportPeriod('month', anchor, today), today), days: [] })

assert.equal(renderWindow().data, null)
assert.equal(requests.length, 0)
renderWindow().open()
renderWindow().open()
assert.equal(requests.length, 1)
assert.equal(requests[0].date, null)
await answer(requests[0], snapshot)
select('week', '2026-10-02')
assert.deepEqual(renderWindow().period, octoberWeek)
assert.equal(requests.length, 1)

select('month', '2026-08-01')
assert.equal(renderWindow().loading.blocking, true)
assert.deepEqual(renderWindow().period, octoberWeek)
select('month', '2026-07-01')
assert.equal(requests[1].signal.aborted, true)
await answer(requests[2], windowFor('2026-07-01'))
await answer(requests[1], windowFor('2026-08-01'))
assert.equal(renderWindow().period.start, '2026-07-01')
assert.equal(renderWindow().loading, null)

renderWindow().open()
assert.equal(requests[3].date, '2026-07-01')
requests[3].reject(new Error('offline'))
await Promise.resolve()
assert.equal(renderWindow().period.start, '2026-07-01')
assert(renderWindow().data)
renderWindow().retry()
await answer(requests[4], windowFor('2026-07-01'))
assert.equal(renderWindow().error, null)

console.log('PASS: live-query fixtures, role and academy scopes, pagination, ledger reconciliation, date boundaries, fresh exact-period exports, chart rendering, and cache navigation races.')
