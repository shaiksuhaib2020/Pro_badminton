import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

function loader(overrides = {}) {
  const cache = new Map()
  return function load(file) {
    const filename = path.resolve(file)
    if (cache.has(filename)) return cache.get(filename)
    const loadedModule = { exports: {} }
    const native = createRequire(filename)
    const require = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id]
      if (id === 'server-only') return {}
      if (id === '@/lib/mock-data') {
        assert(filename.endsWith('DemoMonthlySummaryCard.tsx'), 'Live card imported demo data')
        return { mockExpenses: [], mockIncomeEntries: [] }
      }
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id)
        const target = [base, base + '.ts', base + '.tsx'].find(f => fs.existsSync(f) && fs.statSync(f).isFile())
        if (target) return load(target)
      }
      return native(id)
    }
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    vm.runInThisContext('(function(require,module,exports){' + output + '\n})', { filename })(require, loadedModule, loadedModule.exports)
    cache.set(filename, loadedModule.exports)
    return loadedModule.exports
  }
}
const load = loader()
const { getDashboardPeriod: period } = load('src/lib/dashboard/period.ts')
const { buildDashboard } = load('src/lib/dashboard/metrics.ts')
const today = '2026-11-16'
const month = period('month', today, today)
assert.equal(month.start, '2026-11-01'); assert.equal(month.end, '2026-11-30'); assert.equal(month.through, today); assert.equal(month.next, null)
assert.equal(period('week', today, today).start, today)
assert.equal(period('week', '2026-11-10', today).end, '2026-11-15')
assert.equal(period('month', '2026-10-31', today).next, '2026-11-01')
assert.equal(period('month', '2024-02-29', today).end, '2024-02-29')
for (const date of ['2026-02-31', 'invalid', '2026-12-01', '2026-1-1']) assert.equal(period('day', date, today).anchor, today)
assert.equal(period('year', undefined, today).mode, 'day')
const student = (id,status='active') => ({ id,name:'Student '+id,phone:'9876543210',status,currentBatchId:'a',fees:1500,startDate:'2026-11-01' })
const receipt = (id,studentId,extra={}) => ({ id,studentId,date:today,createdAt:today+'T05:00:00Z',amount:1000,remainingAmount:0,paymentType:'full',status:'active',paymentMethod:null,note:'',coveredFrom:'2026-11-01',coveredUntil:'2026-11-20',...extra })
const input = {
  students:[student('a'),student('i','inactive'),student('d','dropout'),student('new'),student('expired'),student('soon'),student('future')],
  receipts:[
    receipt('partial','a',{remainingAmount:500,paymentType:'partial'}),
    receipt('inactive','i',{date:'2026-11-10',coveredUntil:today,remainingAmount:300,status:'inactive'}),
    receipt('dropout','d',{date:'2026-11-14',coveredUntil:'2026-11-15',remainingAmount:200,status:'inactive'}),
    receipt('clear','a',{amount:100,paymentType:'due_clearance',settlesPaymentId:'partial',coveredFrom:undefined,coveredUntil:undefined,createdAt:today+'T08:00:00Z'}),
    receipt('void','a',{amount:99999,status:'deleted'}),
    receipt('old','expired',{date:'2026-10-01',coveredFrom:'2026-10-01',coveredUntil:'2026-11-01'}),
    receipt('soon','soon',{date:'2026-11-10',coveredUntil:'2026-11-18'}),
    receipt('future','future',{date:'2026-11-10',coveredUntil:'2026-11-25'}),
    receipt('legacy','d',{date:'2026-10-01',remainingAmount:50,status:'inactive',coveredFrom:undefined,coveredUntil:undefined}),
  ],
  batches:[{id:'a',name:'Alpha',days:['Monday'],branchId:''},{id:'b',name:'Alpha',days:[],branchId:''}],
  attendance:[14,15,16].map(n=>({id:'mark'+n,batchId:'a',date:'2026-11-'+n,records:{a:n===15?'present':'absent',i:'present',d:'absent'}})),
  enquiries:[{createdAt:today},{createdAt:'2026-10-31'},{createdAt:'2026-11-30'}],
  inventory:[{id:'zero',name:'Zero',quantity:0,unit:'each'},{id:'low',name:'Low',quantity:7,unit:'each'},{id:'ok',name:'Okay',quantity:8,unit:'each'}],
}
const before=JSON.stringify(input), data=buildDashboard(input,month,today)
assert.equal(JSON.stringify(input),before)
assert.equal(data.collected,5100)
assert.equal(data.paid.length,6)
assert.equal(data.paid.filter(r=>r.studentId==='a').length,2)
assert.equal(data.paid[0].id,'clear')
assert.equal(data.pendingAmount,1000);assert.equal(data.pendingStudents,3);assert.equal(data.undatedBalances,1)
assert.equal(data.activeCount,5);assert.equal(data.overdueCount,1);assert.equal(data.expiring,1)
assert.equal(data.alerts.find(a=>a.key==='renewal-future').status,'Upcoming')
assert.equal(data.alerts.filter(a=>a.studentId==='a').length,1)
assert.equal(data.alerts.filter(a=>a.kind==='Renewal reminder' && (a.studentId==='i'||a.studentId==='d')).length,0)
assert.equal(data.activity.enquiries,1)
assert.equal(data.batchAttendance[0].total,9);assert.equal(data.batchAttendance[0].present,4);assert.equal(data.batchAttendance[1].rate,null)
assert(data.flagged.some(s=>s.studentId==='d'));assert(data.flagged.some(s=>s.studentId==='a'));assert(!data.flagged.some(s=>s.studentId==='new'))
assert.equal(data.prompts[0].total,5);assert.equal(data.prompts[0].marked,1)
assert.deepEqual(data.lowStock.map(i=>i.id),['zero','low'])
const day=buildDashboard(input,period('day',today,today),today)
assert.equal(day.pendingAmount,300);assert.equal(day.absent.length,2);assert.equal(day.flagged.length,0)
const old=buildDashboard(input,period('month','2026-10-01',today),today)
assert.equal(old.pendingAmount,null);assert.equal(old.overdueCount,null);assert.equal(old.alerts.length,0)
const empty={students:[],receipts:[],batches:[],attendance:[],enquiries:[],inventory:[]}
assert.equal(buildDashboard(empty,month,today).markedSessions,0)
assert.equal(buildDashboard({...empty,receipts:[receipt('c1','x',{amount:0.1}),receipt('c2','x',{amount:0.2})]},month,today).collected,0.3)
const multi=buildDashboard({...input,receipts:[...input.receipts,receipt('second','a',{remainingAmount:1,coveredFrom:'2026-10-01'})]},month,today)
assert.equal(multi.pendingStudents,3);assert.equal(multi.pendingAmount,1001)
console.log('PASS: period boundaries, receipts/clearances/voids, decimals, all-status balances, renewal separation, marked-session attendance, hidden marks and immutable inputs.')

const renderLoad=loader({'next/link':({children,href,...props})=>React.createElement('a',{...props,href},children),'next/navigation':{useRouter:()=>({replace(){},refresh(){}})}})
const View=renderLoad('src/app/(management)/dashboard/_components/DashboardView.tsx').default
const html=renderToStaticMarkup(React.createElement(View,{metrics:data,period:month,today}))
assert(html.includes('Paid Students'));assert(html.includes('This Month - Demo'));assert(!html.includes('Batch Revenue'));assert(html.includes('Unspecified'))
const oldHtml=renderToStaticMarkup(React.createElement(View,{metrics:old,period:period('month','2026-10-01',today),today}))
assert(!oldHtml.includes('Fee Alerts'));assert(oldHtml.includes('Unavailable'))
const emptyHtml=renderToStaticMarkup(React.createElement(View,{metrics:buildDashboard(empty,month,today),period:month,today}))
assert(emptyHtml.includes('No attendance recorded'));assert(!emptyHtml.includes('All students attending regularly'))
assert(!html.includes('Take attendance'))
console.log('PASS: actual React rendering, past-period hiding, honest empty states, demo isolation and removed batch revenue.')

const log=[];let fail=false
const tables={students:Array.from({length:1001},(_,i)=>({id:String(i),academy_id:'tenant',name:'Name',phone:'',status:'active',batch_id:'b',fees:150000,joining_date:today,dropout_date:null})),student_payments:[],batches:[],attendance_records:[],enquiries:[{id:'e',academy_id:'tenant',created_at:'2026-11-15T19:00:00Z'}],inventory_items:[]}
tables.students.push({...tables.students[0],id:'foreign',academy_id:'other'})
tables.student_payments.push({id:'receipt',student_id:'0',academy_id:'tenant',date:today,created_at:today+'T00:00:00Z',amount:150050,remaining_amount:2050,payment_type:'partial',start_date:'2026-11-01',next_due_date:today,settles_payment_id:null,payment_method:null,status:'active'})
const supabase={from(table){let conditions=[],bounds=[0,999];const builder={select(){return this},eq(k,v){conditions.push(r=>r[k]===v);log.push([table,k,v]);return this},neq(k,v){conditions.push(r=>r[k]!==v);return this},gte(k,v){conditions.push(r=>k==='created_at'?Date.parse(r[k])>=Date.parse(v):r[k]>=v);return this},lte(k,v){conditions.push(r=>r[k]<=v);return this},lt(k,v){conditions.push(r=>k==='created_at'?Date.parse(r[k])<Date.parse(v):r[k]<v);log.push([table,k,v]);return this},order(){return this},range(a,b){bounds=[a,b];return this},then(resolve,reject){const rows=tables[table].filter(r=>conditions.every(fn=>fn(r))).slice(bounds[0],bounds[1]+1);return Promise.resolve({data:rows,error:fail?{message:'Fixture query error'}:null}).then(resolve,reject)}};return builder}}
const query=loader({'@/lib/supabase/auth-context':{getServerSession:async()=>({supabase,academyId:'tenant'})}})('src/lib/queries/dashboard.ts')
const queried=await query.getDashboard(period('day',today,today),today)
assert.equal(queried.collected,1500.5);assert.equal(queried.pendingAmount,20.5);assert.equal(queried.activeCount,1001);assert.equal(queried.activity.enquiries,1)
for(const table of Object.keys(tables))assert(log.some(row=>row[0]===table && row[1]==='academy_id' && row[2]==='tenant'))
assert(log.some(row=>row[0]==='enquiries'&&row[2]==='2026-11-17T00:00:00+05:30'))
fail=true;await assert.rejects(()=>query.getDashboard(month,today),/Fixture query error/)
console.log('PASS: actual query with isolated Supabase fixtures: tenant predicates, 1001-row pagination, IST boundary and failure propagation. No hosted writes.')
