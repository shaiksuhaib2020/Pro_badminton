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
    const require = specifier => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier]
      if (specifier === 'server-only') return {}
      if (specifier.startsWith('@/') || specifier.startsWith('.')) {
        const base = specifier.startsWith('@/') ? path.resolve('src', specifier.slice(2)) : path.resolve(path.dirname(filename), specifier)
        const target = [base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate))
        if (target) return load(target)
      }
      return native(specifier)
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
const { buildFeesDaily, coversFeesPeriod, formatFeePaise, getFeesPeriod, getFeesWindowRange, rollUpFeesPeriod, selectFeesReport } = load('src/lib/reports/fees.ts')
const buildFeesReport = (period, ...input) => rollUpFeesPeriod(buildFeesDaily(period, ...input), period)
const feesPath = 'src/app/(management)/reports/_components/fees/'
const { buildFeesExport } = load(feesPath + 'fees-export.ts')
const today = '2026-11-19'
const currentMonth = getFeesPeriod('month', today, today)
assert.equal(currentMonth.next, null)
assert.equal(currentMonth.through, today)
assert.equal(getFeesPeriod('day', '2026-02-29', today).anchor, today)
assert.equal(getFeesPeriod('year', '2026-12-01', today).mode, 'month')
assert.equal(getFeesPeriod('week', '2026-12-02', today).anchor, today)
for (const [anchor, last, tail] of [['2026-02-10', '28', undefined], ['2024-02-10', '29', '29'], ['2026-04-10', '30', '29–30'], ['2026-01-10', '31', '29–31']]) {
  const period = getFeesPeriod('month', anchor, today)
  const { buckets } = buildFeesReport(period, [], [], [], [])
  assert.equal(buckets.length, tail ? 5 : 4)
  assert.equal(buckets.at(-1).end.slice(-2), last)
  assert.deepEqual(buckets.slice(0, 4).map(bucket => bucket.rangeLabel), ['1–7', '8–14', '15–21', '22–28'])
  if (tail) assert.equal(buckets.at(-1).rangeLabel, tail)
}
const week = getFeesPeriod('week', today, today)
assert.deepEqual([week.start, week.end, week.previous, week.next], ['2026-11-16', '2026-11-22', '2026-11-09', null])
const previousWeek = getFeesPeriod('week', week.previous, today)
assert.equal(previousWeek.next, week.start)
const weekly = buildFeesReport(week, [], [], [], [])
assert.deepEqual(weekly.buckets.map(bucket => bucket.label), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
assert.deepEqual(weekly.buckets.map(bucket => bucket.future), [false, false, false, false, true, true, true])

const month = getFeesPeriod('month', '2026-10-12', today)
const receipt = (id, student_id, date, amount, extra = {}) => ({
  id, student_id, date, amount, remaining_amount: 0, payment_method: 'cash', payment_type: 'full', status: 'active', academy_id: 'academy', ...extra,
})
const receipts = [
  receipt('original-a', 'former-student', '2026-10-02', 60000, { payment_type: 'partial', status: 'inactive', payment_method: null }),
  receipt('original-b', 'transferred', '2026-10-08', 25075, { payment_type: 'partial', remaining_amount: 6000 }),
  receipt('zero', 'unassigned-student', '2026-10-15', 0, { remaining_amount: 555, payment_type: 'partial' }),
  receipt('clear-a', 'former-student', '2026-11-11', 40000, { payment_type: 'due_clearance', settles_payment_id: 'original-a', payment_method: 'upi' }),
  receipt('clear-b', 'transferred', '2026-10-17', 1000, { payment_type: 'due_clearance', settles_payment_id: 'original-b', payment_method: 'card' }),
  receipt('void-clear-b', 'transferred', '2026-11-12', 6000, { payment_type: 'due_clearance', settles_payment_id: 'original-b', status: 'deleted' }),
  receipt('voided', 'transferred', '2026-10-18', 99999, { status: 'deleted' }),
  receipt('future', 'transferred', '2026-11-30', 9876),
  receipt('other-academy', 'transferred', '2026-10-11', 99999, { academy_id: 'other' }),
]
const students = [
  { id: 'former-student', batch_id: 'red', status: 'dropout', academy_id: 'academy' },
  { id: 'transferred', batch_id: 'blue', status: 'active', academy_id: 'academy' },
  { id: 'unassigned-student', batch_id: null, status: 'inactive', academy_id: 'academy' },
]
const batches = [
  { id: 'red', name: 'Red', is_active: false, academy_id: 'academy' },
  { id: 'blue', name: 'Blue', is_active: true, academy_id: 'academy' },
]

// Verify the real query over an isolated Supabase fixture without changing hosted data.
const reads = []
function queryFixture(table) {
  const tableRows = { student_payments: receipts, students, batches }[table]
  const predicates = []
  let start = 0, end = 999
  return {
    select() { return this }, order() { return this }, abortSignal() { return this },
    eq(key, value) { predicates.push(row => row[key] === value); reads.push({ table, key, value }); return this },
    neq(key, value) { predicates.push(row => row[key] !== value); return this },
    gte(key, value) { predicates.push(row => row[key] >= value); return this },
    lte(key, value) { predicates.push(row => row[key] <= value); return this },
    in(key, ids) { assert(ids.length <= 100); predicates.push(row => ids.includes(row[key])); return this },
    range(from, to) { start = from; end = to; reads.push({ table, from }); return this },
    then(resolve, reject) {
      return Promise.resolve({ data: tableRows.filter(row => predicates.every(fn => fn(row))).slice(start, end + 1), error: null }).then(resolve, reject)
    },
  }
}
const query = load('src/lib/queries/fees-report.ts')
const session = { academyId: 'academy', role: 'manager', supabase: { from: queryFixture } }
const windowData = await query.readFeesWindow(session, currentMonth, today)
const report = rollUpFeesPeriod(windowData, month)
assert.deepEqual(report, rollUpFeesPeriod(await query.readFeesRange(session, month, today), month))
assert(coversFeesPeriod(windowData.range, month))
assert(!coversFeesPeriod(windowData.range, getFeesPeriod('month', '2026-08-31', today)))
assert(!coversFeesPeriod(windowData.range, getFeesPeriod('month', today, '2026-11-20')))
const boundary = getFeesPeriod('week', '2026-09-01', today)
assert.equal(boundary.start, '2026-08-31')
assert(coversFeesPeriod(getFeesWindowRange(month, today), boundary))
assert(!coversFeesPeriod({ ...windowData.range, start: '2026-09-01' }, boundary))
assert(!JSON.stringify(windowData).includes('former-student'))
const all = selectFeesReport(report, 'all')
assert.equal(all.collection.total, 86075)
assert.equal(all.outstanding.total, 6555)
assert.deepEqual(all.status.map(slice => slice.amount), [100000, 26075, 6555])
assert.deepEqual(all.modes.map(slice => slice.amount), [25075, 0, 1000, 0, 60000])
assert.equal(all.outstanding.buckets[1].amounts.blue, 6000)
assert.equal(all.outstanding.buckets[2].amounts.unassigned, 555)
assert.equal(all.collection.buckets[2].amounts.blue, 1000)
const blue = selectFeesReport(report, 'blue')
assert.deepEqual([blue.collection.total, blue.outstanding.total], [26075, 6000])
assert.equal(blue.collection.series[0].color, blue.outstanding.series[0].color)
assert.equal(selectFeesReport(report, 'unassigned').outstanding.total, 555)
assert.equal(selectFeesReport(report, 'red').batchLabel, 'Red (Archived)')
for (const table of ['student_payments', 'students', 'batches']) {
  assert(reads.some(read => read.table === table && read.key === 'academy_id' && read.value === 'academy'))
}

const november = rollUpFeesPeriod(windowData, currentMonth)
const thisMonth = selectFeesReport(november, 'all')
assert.equal(thisMonth.collection.total, 40000)
assert.equal(thisMonth.modes.find(slice => slice.key === 'upi').amount, 40000)
assert.equal(thisMonth.status.find(slice => slice.key === 'paid').amount, 0)
assert(november.buckets.slice(3).every(bucket => bucket.future))
assert(thisMonth.collection.buckets.slice(3).every(bucket => Object.keys(bucket.amounts).length === 0))
const exportPayload = buildFeesExport(month, blue, windowData.refreshedAt)
assert.equal(exportPayload.batch, 'Blue')
assert.match(exportPayload.dataRefreshed, / IST$/)
assert.deepEqual(exportPayload.sections.map(section => section.title), ['Fee Collection', 'Outstanding Balance', 'Payment Status', 'Payment Mode'])
assert.equal(exportPayload.sections[1].rows.reduce((sum, row) => sum + row[4], 0), 60)
assert.equal(exportPayload.sections[2].rows.find(row => row[0] === 'Partial Due')[1], 60)
assert.equal(exportPayload.sections[3].rows.reduce((sum, row) => sum + Math.round(row[1] * 100), 0), blue.collection.total)
assert.equal(formatFeePaise(26075), '₹260.75')
assert.equal(selectFeesReport(buildFeesReport(month, [], [], students, batches), 'blue').collection.total, 0)

const FeesFilterBar = load(feesPath + 'FeesFilterBar.tsx').default
const controls = renderToStaticMarkup(React.createElement(FeesFilterBar, {
  period: currentMonth, batchId: 'blue', batches: report.batches, pending: false, onBatchChange() {}, onNavigate() {},
}))
assert.match(controls, /disabled="" aria-label="Next period"/)
assert.match(controls, /value="blue" selected=""/)
assert(!controls.includes('>Day<'))
const PaymentModeCard = load(feesPath + 'PaymentModeCard.tsx').default
const empty = selectFeesReport(buildFeesReport(month, [], [], [], []), 'all')
const emptyCard = renderToStaticMarkup(React.createElement(PaymentModeCard, { slices: empty.modes }))
assert.match(emptyCard, /No payments received/)
assert.match(emptyCard, /Unspecified/)

const FeesSegment = load(feesPath + 'FeesSegment.tsx').default
const html = renderToStaticMarkup(React.createElement(FeesSegment, {
  period: currentMonth, report: november, selection: thisMonth, batchId: 'all',
  pending: true, loadingLabel: 'Loading October 2026…', refreshedAt: windowData.refreshedAt,
  onNavigate() {}, onBatchChange() {},
}))
for (const title of ['Fee Collection', 'Outstanding Balance', 'Payment Status', 'Payment Mode']) {
  assert(html.includes(`>${title}</h2>`))
}
assert.match(html, /November 2026/)
assert.match(html, /Loading October 2026/)
assert.match(html, /aria-label="Fees filters" aria-busy="true"/)
const ReportsView = makeLoader({ './reports.module.css': { segment: 'report-segment' } })(
  'src/app/(management)/reports/_components/ReportsView.tsx',
).default
const loadingPage = React.createElement(ReportsView, { period: currentMonth, data: new Promise(() => {}) })
const fallback = renderToStaticMarkup(loadingPage)
assert.match(fallback, /aria-label="Loading fee charts"/)
assert.match(fallback, /disabled="" aria-busy="false" aria-expanded="false"/)

// Exercise the real API with current and unauthorized sessions and fresh accounting values.
let routeSession = session
const utils = load('src/lib/utils.ts')
const { GET } = makeLoader({
  '@/lib/supabase/auth-context': { readServerSession: async () => routeSession },
  '@/lib/utils': { ...utils, getTodayIST: () => today },
})('src/app/api/reports/fees/route.ts')
const read = (search) => GET(new Request(`http://localhost/api/reports/fees?${search}`))
routeSession = null
assert.equal((await read('view=window&mode=month')).status, 401)
routeSession = { ...session, role: 'accountant' }
assert.equal((await read('view=window&mode=month')).status, 403)
routeSession = session
assert.equal((await read('view=period&mode=month&date=2026-12-02')).status, 400)
assert.equal((await read('view=period&mode=month&date=2026-10-01&batch=absent')).status, 404)
receipts.find(row => row.id === 'original-b').remaining_amount = 0
receipts.push(receipt('new-clearance', 'transferred', '2026-11-19', 6000, {
  payment_type: 'due_clearance', settles_payment_id: 'original-b', payment_method: 'upi',
}))
const exact = await read('view=period&mode=month&date=2026-10-01&batch=blue')
assert.equal(exact.headers.get('cache-control'), 'private, no-store')
const freshExport = await exact.json()
assert.equal(freshExport.selection.batchId, 'blue')
assert.equal(freshExport.selection.outstanding.total, 0)
assert.equal(freshExport.selection.collection.total, blue.collection.total)
assert.equal(blue.outstanding.total, 6000)
const refreshedWindow = (await (await read('view=window&mode=month')).json()).window
assert.equal(selectFeesReport(rollUpFeesPeriod(refreshedWindow, month), 'blue').outstanding.total, 0)
assert.equal(selectFeesReport(rollUpFeesPeriod(refreshedWindow, currentMonth), 'blue').collection.total, 6000)

const oldPeriod = getFeesPeriod('month', '2026-03-01', today)
for (let i = 0; i < 1001; i++) receipts.push(receipt(`page-${i}`, 'transferred', '2026-03-01', 1))
const paginated = await query.readFeesRange(session, oldPeriod, today)
assert.equal(selectFeesReport(rollUpFeesPeriod(paginated, oldPeriod), 'all').collection.total, 1001)
assert(reads.some(entry => entry.table === 'student_payments' && entry.from === 1000))

// Exercise the hook's actual event handlers with controlled requests and an IST clock.
const hooks = []
let hookIndex = 0
let effects = []
const sameDeps = (a, b) => a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
const reactHooks = {
  useState(initial) {
    const slot = hookIndex++
    if (!(slot in hooks)) hooks[slot] = initial
    return [hooks[slot], update => { hooks[slot] = typeof update === 'function' ? update(hooks[slot]) : update }]
  },
  useRef(initial) { return hooks[hookIndex++] ??= { current: initial } },
  useCallback(callback, deps) {
    const slot = hookIndex++
    if (!hooks[slot] || !sameDeps(hooks[slot].deps, deps)) hooks[slot] = { callback, deps }
    return hooks[slot].callback
  },
  useEffect(callback, deps) {
    const slot = hookIndex++
    const prior = hooks[slot]
    if (!prior || !sameDeps(prior.deps, deps)) effects.push(() => {
      prior?.cleanup?.()
      hooks[slot] = { deps, cleanup: callback() }
    })
  },
}
const requests = []
let clock = today
const { useFeesWindow: renderFeesWindow } = makeLoader({
  react: reactHooks,
  '@/lib/utils': { ...utils, getTodayIST: () => clock },
  './fees-client': { FeesReadError: class extends Error {}, fetchFeesWindow: (mode, date, signal) =>
    new Promise((resolve, reject) => requests.push({ mode, date, signal, resolve, reject })) },
})(feesPath + 'useFeesWindow.ts')
const seed = Promise.resolve({ window: windowData })
const render = () => {
  hookIndex = 0
  effects = []
  const state = renderFeesWindow(currentMonth, seed, true)
  effects.forEach(effect => effect())
  return state
}
const fakeWindow = Object.assign(new EventTarget(), {
  location: { href: 'http://localhost/reports' },
  history: { replaceState(_state, _unused, url) { fakeWindow.location.href = String(url) } },
})
const fakeDocument = Object.assign(new EventTarget(), { visibilityState: 'visible' })
const turn = () => new Promise(resolve => setImmediate(resolve))
globalThis.window = fakeWindow
globalThis.document = fakeDocument
try {
  render()
  await turn()
  let state = render()
  state.navigate('month', '2026-10-01')
  state = render()
  assert.equal(state.period.start, '2026-10-01')
  state.navigate('week', '2026-09-01')
  state = render()
  assert.equal(state.period.start, '2026-08-31')
  assert.equal(requests.length, 0)

  state.navigate('month', '2026-05-01')
  state = render()
  assert.equal(state.period.start, '2026-08-31')
  assert.equal(state.loading.period.start, '2026-05-01')
  state.navigate('month', '2026-04-01')
  assert(requests[0].signal.aborted)
  requests[1].resolve(await query.readFeesWindow(session, getFeesPeriod('month', '2026-04-01', clock), clock))
  await turn()
  requests[0].resolve(await query.readFeesWindow(session, getFeesPeriod('month', '2026-05-01', clock), clock))
  await turn()
  state = render()
  assert.equal(state.period.start, '2026-04-01')
  assert.equal(new URL(fakeWindow.location.href).searchParams.get('date'), '2026-04-01')

  state.navigate('month', '2026-11-01')
  requests[2].reject(new Error('Temporary error'))
  await turn()
  state = render()
  assert.equal(state.period.start, '2026-04-01')
  assert.equal(state.error.message, 'Temporary error')
  state.retry()
  requests[3].resolve(refreshedWindow)
  await turn()
  state = render()
  assert.equal(state.period.start, '2026-11-01')

  clock = '2026-12-01'
  fakeWindow.dispatchEvent(new Event('focus'))
  state = render()
  assert.equal(requests[4].date, null)
  assert.equal(state.loading.period.start, '2026-12-01')
  assert.equal(state.period.start, '2026-11-01')
  const december = getFeesPeriod('month', clock, clock)
  requests[4].resolve(await query.readFeesWindow(session, december, clock))
  await turn()
  state = render()
  assert.equal(state.period.start, '2026-12-01')
  assert.equal(state.period.through, clock)

  state.navigate('month', '2026-10-01')
  render()
  clock = '2026-12-02'
  fakeWindow.dispatchEvent(new Event('focus'))
  assert.equal(requests[5].date, '2026-10-01')
  requests[5].resolve(await query.readFeesWindow(session, getFeesPeriod('month', requests[5].date, clock), clock))
  await turn()
  assert.equal(render().period.start, '2026-10-01')
} finally {
  hooks.forEach(hook => hook?.cleanup?.())
  delete globalThis.window
  delete globalThis.document
}

console.log('PASS: accounting, paginated academy reads, fresh authorized exports, month lengths, boundary coverage, local navigation, stale response handling, retry, and IST rollover.')
