// Executes the actual SQL files in isolated PostgreSQL (PGlite), never Supabase.
// PGLITE_MODULE_PATH can point at an isolated installation; see ../README.md.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite')
const migrationDir = path.resolve(__dirname, '..')
const normalize = fs.readFileSync(path.join(migrationDir, '20261112000003_normalize_legacy_fee_units.sql'), 'utf8')
const accounting = fs.readFileSync(path.join(migrationDir, '20261112000004_due_clearance_and_adjustment.sql'), 'utf8')
const schema = fs.readFileSync(path.join(migrationDir, '..', 'database_schema.sql'), 'utf8')
const freshFooter = schema.slice(schema.indexOf('-- Fresh-database modal fields and complete coaching receipt accounting.'))
const academy = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherAcademy = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const legacyOriginal = '8b6e9fb0-9777-4bf4-be7f-268175e56642'
const newOriginal = '988f160e-9195-48e1-8805-e0c411da66e3'
const firstClearance = '82c15046-beb0-42a2-9509-390196fdb134'
const duplicateClearance = 'b885a912-89a7-4909-8f82-7324833d1563'
const legacyClearance = '7a26a9d1-82a0-4ef0-9b5b-b5c1d9a41b92'
const newStudent = 'c1258023-d02c-4ffb-a51c-d35b2e483954'
const legacyStudent = '2e84eb77-eb30-4083-81c6-7f21ec6c2b06'

const students = [
  ['3f22821d-92a5-45c0-bbe6-46f001301a8d', 3023],
  ['e16c6ecb-b3bf-4454-9cc6-9a20ad7a3b0b', 2000],
  ['4b0e069f-f87f-43db-bc6e-601907ea3106', 1500],
  ['235b46b5-cbdd-4499-9632-bda82a735d09', 2000],
  [legacyStudent, 2500],
  ['b08b40c0-fbb5-4e9b-80d4-fad4eb692594', 2500],
  ['d90880ef-feee-444a-b847-24371f7a73e0', 2600],
  ['35a7b9bb-59f6-4b9c-91c7-38c510f1b8f3', 3000],
  ['989e7807-1c95-4d1e-88b9-8e846caa1295', 3000],
  ['86c89119-8723-45ea-bc29-008bcde27b96', 300000],
  ['6b396fa9-9dc5-4d3b-91c2-0249cd0f10ca', 0],
  [newStudent, 200000],
  ['76598229-0f53-4878-a76b-530a4cf96db8', 0],
]
const originals = [
  ['aa250c15-c9ed-45a2-b504-e466dff8a76a', students[1][0], 2000, 0],
  ['10ac1d15-3668-4573-8262-539f54d247fb', students[2][0], 1500, 0],
  ['339e6dda-6a07-4eea-b407-33f2e99c38c2', students[3][0], 2000, 0],
  [legacyOriginal, legacyStudent, 2000, 500],
  ['3a75d3ca-ad34-46b4-8262-92669fc907bf', students[5][0], 2500, 0],
  ['3c697d74-9c13-4525-a58a-bfeb6fb9deb5', students[6][0], 2600, 0],
  ['090d1f74-3bd8-4c03-a3bc-f76445d57bdc', students[7][0], 3000, 0],
  ['3d38b083-8fbd-4b18-9f37-66388fa053ba', students[8][0], 3000, 0],
  ['be68fef3-49d8-49e2-b09f-9f15efca639d', students[0][0], 50000, 0, true],
  [newOriginal, newStudent, 150000, 50000, true],
  ['9c48c2f2-73ff-422d-aa0b-fff1fb0dfd0a', students[9][0], 150000, 0, true],
  ['102645ae-7bb9-44f9-8079-59523492fc21', students[12][0], 20000, 0, true],
]

async function createDb(seed = true) {
  const db = await PGlite.create()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TYPE payment_type AS ENUM ('full','partial','advance','due_clearance');
    CREATE TYPE payment_method AS ENUM ('cash','upi','card','other');
    CREATE TYPE payment_status AS ENUM ('active','inactive','deleted');
    CREATE TYPE day_of_week AS ENUM ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday');
    CREATE TABLE students (
      id uuid PRIMARY KEY, academy_id uuid NOT NULL,
      fees integer NOT NULL DEFAULT 0 CHECK (fees >= 0),
      pending_amount integer NOT NULL DEFAULT 0 CHECK (pending_amount >= 0)
    );
    CREATE TABLE batches (id uuid PRIMARY KEY, fees integer);
    CREATE TABLE student_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES students(id),
      academy_id uuid NOT NULL, date date NOT NULL, amount integer NOT NULL CHECK(amount >= 0),
      remaining_amount integer NOT NULL DEFAULT 0 CHECK(remaining_amount >= 0),
      payment_type payment_type NOT NULL, payment_method payment_method, status payment_status NOT NULL DEFAULT 'active',
      start_date date, next_due_date date, settles_payment_id uuid REFERENCES student_payments(id),
      note text NOT NULL DEFAULT '', transaction_id text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE FUNCTION get_my_academy_id() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('test.academy_id',true),'')::uuid
    $$;
    CREATE FUNCTION get_my_role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('test.role',true),'')
    $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT '11111111-1111-4111-8111-111111111111'::uuid
    $$;
    CREATE FUNCTION sync_student_pending_amount() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
    BEGIN
      UPDATE students SET pending_amount=COALESCE((SELECT SUM(remaining_amount)
        FROM student_payments WHERE student_id=NEW.student_id AND status<>'deleted'),0)
      WHERE id=NEW.student_id;
      RETURN NEW;
    END; $$;
    CREATE TRIGGER tr_sync_pending_amount_after_payment
      AFTER INSERT OR UPDATE OF remaining_amount,status,student_id ON student_payments
      FOR EACH ROW EXECUTE FUNCTION sync_student_pending_amount();
    ALTER TABLE students ENABLE ROW LEVEL SECURITY;
    ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY students_read ON students FOR SELECT TO authenticated USING(academy_id=get_my_academy_id());
    CREATE POLICY students_write ON students FOR UPDATE TO authenticated
      USING(academy_id=get_my_academy_id() AND get_my_role() IN ('owner','manager','receptionist'));
    CREATE POLICY payments_read ON student_payments FOR SELECT TO authenticated USING(academy_id=get_my_academy_id());
    CREATE POLICY payments_insert ON student_payments FOR INSERT TO authenticated
      WITH CHECK(academy_id=get_my_academy_id() AND get_my_role() IN ('owner','manager','accountant','receptionist'));
    CREATE POLICY payments_update ON student_payments FOR UPDATE TO authenticated
      USING(academy_id=get_my_academy_id() AND get_my_role() IN ('owner','manager','accountant'));
    GRANT USAGE ON SCHEMA public,auth TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON students,student_payments TO authenticated;
    SELECT set_config('test.academy_id','${academy}',false),set_config('test.role','owner',false);
  `)
  if (seed) {
    for (const [id, fees] of students) {
      await db.query('INSERT INTO students(id,academy_id,fees) VALUES($1,$2,$3)', [id, academy, fees])
    }
    await db.exec(`INSERT INTO batches VALUES ('be33afd9-154a-4c5d-8c9e-09fc545adb2d',NULL),('df3f1011-03c7-4cbb-affc-1e3001b62512',NULL)`)
    for (const [id, student, amount, remaining, coverage] of originals) {
      await db.query(`INSERT INTO student_payments
        (id,student_id,academy_id,date,amount,remaining_amount,payment_type,start_date,next_due_date)
        VALUES($1,$2,$3,'2026-11-14',$4,$5,$6,$7,$8)`,
      [id, student, academy, amount, remaining, remaining ? 'partial' : 'full', coverage ? '2026-11-14' : null, coverage ? '2026-12-14' : null])
    }
    for (const [id, original, student, amount, time] of [
      [firstClearance,newOriginal,newStudent,50000,'2026-11-14T06:38:04Z'],
      [legacyClearance,legacyOriginal,legacyStudent,500,'2026-11-14T06:42:13Z'],
      [duplicateClearance,newOriginal,newStudent,50000,'2026-11-14T09:21:44Z'],
    ]) {
      await db.query(`INSERT INTO student_payments
        (id,student_id,academy_id,date,amount,payment_type,settles_payment_id,payment_method,created_at)
        VALUES($1,$2,$3,'2026-11-14',$4,'due_clearance',$5,'upi',$6)`, [id,student,academy,amount,original,time])
    }
  }
  // The live constraint was added NOT VALID after historical rows existed.
  await db.exec(`ALTER TABLE student_payments ADD CONSTRAINT student_payments_receipt_shape CHECK (
    (payment_type='due_clearance' AND settles_payment_id IS NOT NULL AND start_date IS NULL AND next_due_date IS NULL AND remaining_amount=0)
    OR (payment_type<>'due_clearance' AND settles_payment_id IS NULL AND start_date IS NOT NULL AND next_due_date>start_date)
  ) NOT VALID`)
  return db
}

async function one(db, sql, params) { return (await db.query(sql, params)).rows[0] }
async function payment(db, id) { return one(db,'SELECT * FROM student_payments WHERE id=$1',[id]) }
async function snapshot(db) {
  return JSON.stringify((await db.query(`SELECT id,amount,remaining_amount,status,note,next_due_date FROM student_payments ORDER BY id`)).rows)
}
async function rejects(db, sql, params, pattern) {
  await assert.rejects(db.query(sql,params), pattern)
}
async function settle(db, student, original, amount, transactionId = ' TEST-ID ') {
  return (await one(db, `SELECT record_student_due_clearance($1,$2,$3,'2026-11-14','upi','test',$4) AS id`,
    [student,original,amount,transactionId])).id
}

async function main() {
  let checks = 0
  const pass = label => { checks++; console.log(`PASS ${label}`) }
  const db = await createDb()
  await db.exec(normalize)
  assert.equal((await one(db,'SELECT fees FROM students WHERE id=$1',[legacyStudent])).fees,250000)
  assert.equal((await payment(db,legacyOriginal)).amount,200000)
  assert.equal((await payment(db,legacyOriginal)).remaining_amount,50000)
  assert.equal((await payment(db,legacyClearance)).amount,50000)
  assert.equal((await payment(db,newOriginal)).amount,150000)
  assert.equal((await one(db,'SELECT fees FROM students WHERE id=$1',[newStudent])).fees,200000)
  pass('only audited legacy fields convert; existing paise fields stay unchanged')
  await db.exec(accounting)
  assert.equal((await payment(db,newOriginal)).remaining_amount,0)
  assert.equal((await payment(db,legacyOriginal)).remaining_amount,0)
  assert.equal((await payment(db,duplicateClearance)).status,'deleted')
  assert.equal((await payment(db,firstClearance)).status,'active')
  assert.equal((await one(db,'SELECT sum(pending_amount)::integer AS pending FROM students')).pending,0)
  assert.equal((await one(db,'SELECT count(*)::integer AS n FROM student_payments')).n,15)
  pass('existing clearances applied once; duplicate voided; no physical deletions')
  const repaired = await snapshot(db)
  await db.exec(normalize)
  await db.exec(accounting)
  assert.equal(await snapshot(db),repaired)
  pass('both scripts can rerun without scaling or deducting again')
  await rejects(db,`SELECT record_student_due_clearance($1,$2,50000,'2026-11-14','upi')`,[newStudent,newOriginal],/Outstanding balance changed/)
  pass('repeat collection of the settled original is rejected')
  await db.query(`UPDATE student_payments SET status='deleted' WHERE id=$1`,[firstClearance])
  assert.equal((await payment(db,newOriginal)).remaining_amount,50000)
  assert.equal((await one(db,'SELECT pending_amount FROM students WHERE id=$1',[newStudent])).pending_amount,50000)
  await db.query(`UPDATE student_payments SET status='deleted' WHERE id=$1`,[firstClearance])
  assert.equal((await payment(db,newOriginal)).remaining_amount,50000)
  pass('void restores balance once; repeat void does not add it twice')
  await db.exec(`SET ROLE authenticated; SELECT set_config('test.role','receptionist',false)`)
  const recollected = await settle(db,newStudent,newOriginal,50000)
  assert.equal((await payment(db,newOriginal)).remaining_amount,0)
  assert.equal((await payment(db,recollected)).transaction_id,'TEST-ID')
  assert.equal((await one(db,'SELECT pending_amount FROM students WHERE id=$1',[newStudent])).pending_amount,0)
  await db.exec('RESET ROLE')
  pass('receptionist can clear via SECURITY DEFINER trigger despite no payment UPDATE policy')
  await db.query(`UPDATE student_payments SET status='deleted' WHERE id=$1`,[legacyClearance])
  await db.exec(`SET ROLE authenticated; SELECT set_config('test.role','accountant',false)`)
  await settle(db,legacyStudent,legacyOriginal,50000)
  assert.equal((await payment(db,legacyOriginal)).remaining_amount,0)
  assert.equal((await one(db,'SELECT pending_amount FROM students WHERE id=$1',[legacyStudent])).pending_amount,0)
  await db.exec('RESET ROLE')
  pass('accountant clears a legacy receipt without coverage or student UPDATE permission')
  await rejects(db,`UPDATE student_payments SET status='deleted' WHERE id=$1`,[newOriginal],/Void active due clearances/)
  await rejects(db,`UPDATE student_payments SET remaining_amount=100 WHERE id=$1`,[newOriginal],/Outstanding balance changes/)
  await rejects(db,`UPDATE student_payments SET amount=1 WHERE id=$1`,[newOriginal],/Receipt identity/)
  await rejects(db,`DELETE FROM student_payments WHERE id=$1`,[newOriginal],/Void receipts/)
  await rejects(db,`UPDATE student_payments SET status='active' WHERE id=$1`,[duplicateClearance],/Voided receipts/)
  pass('original void, balance/amount edits, hard deletion, and deleted restoration are guarded')
  await rejects(db,`INSERT INTO student_payments(student_id,academy_id,date,amount,payment_type)
    VALUES($1,$2,'2026-11-14',100,'full')`,[newStudent,academy],/require a coverage start/)
  pass('new receipts cannot use the legacy empty-coverage exception')
  await rejects(db,`UPDATE student_payments SET next_due_date='2026-12-15' WHERE id=$1`,[newOriginal],/audited due-date/)
  await db.exec(`SELECT set_config('test.role','owner',false)`)
  await db.query(`SELECT adjust_student_receipt_due_date($1,'2026-12-15','approved test change')`,[newStudent])
  const adjusted = await payment(db,newOriginal)
  assert.equal(new Date(adjusted.next_due_date).toISOString().slice(0,10),'2026-12-15')
  assert.match(adjusted.note,/approved test change/)
  pass('due date changes require the audited RPC and record the reason')
  // A new second receipt tests exact amount validation and tenant isolation.
  const second = (await one(db,`INSERT INTO student_payments(student_id,academy_id,date,amount,remaining_amount,payment_type,start_date,next_due_date)
    VALUES($1,$2,'2026-11-14',10000,2500,'partial','2027-01-01','2027-02-01') RETURNING id`,[newStudent,academy])).id
  await rejects(db,`SELECT record_student_due_clearance($1,$2,2499,'2026-11-14','upi')`,[newStudent,second],/Outstanding balance changed/)
  await rejects(db,`SELECT record_student_due_clearance($1,$2,2501,'2026-11-14','upi')`,[newStudent,second],/Outstanding balance changed/)
  await rejects(db,`SELECT record_student_due_clearance($1,$2,0,'2026-11-14','upi')`,[newStudent,second],/Outstanding balance changed/)
  await db.exec(`SET ROLE authenticated; SELECT set_config('test.academy_id','${otherAcademy}',false)`)
  await rejects(db,`SELECT record_student_due_clearance($1,$2,2500,'2026-11-14','upi')`,[newStudent,second],/Original receipt is missing/)
  await db.exec(`RESET ROLE; SELECT set_config('test.academy_id','${academy}',false),set_config('test.role','coach',false)`)
  await rejects(db,`SELECT record_student_due_clearance($1,$2,2500,'2026-11-14','upi')`,[newStudent,second],/Not authorized/)
  await db.exec(`SELECT set_config('test.role','owner',false)`)
  pass('stale/partial/overpaid/zero clearances and unauthorized or cross-tenant RPCs rejected')
  await rejects(db,`INSERT INTO student_payments(student_id,academy_id,date,amount,payment_type,payment_method,settles_payment_id,start_date)
    VALUES($1,$2,'2026-11-14',2500,'due_clearance','upi',$3,'2026-11-14')`,[newStudent,academy,second],/student_payments_receipt_shape/)
  assert.equal((await payment(db,second)).remaining_amount,2500)
  assert.equal((await one(db,'SELECT pending_amount FROM students WHERE id=$1',[newStudent])).pending_amount,2500)
  pass('failed clearance insert atomically rolls back original and pending balance deductions')
  await db.exec('ALTER TABLE student_payments DISABLE TRIGGER tr_student_due_clearance')
  await rejects(db,`SELECT record_student_due_clearance($1,$2,2500,'2026-11-14','upi')`,[newStudent,second],/accounting is unavailable/)
  await db.exec('ALTER TABLE student_payments ENABLE TRIGGER tr_student_due_clearance')
  pass('RPC refuses collection when deduction trigger is disabled')
  await db.exec('DROP TRIGGER tr_student_due_clearance ON student_payments')
  await rejects(db,`SELECT record_student_due_clearance($1,$2,2500,'2026-11-14','upi')`,[newStudent,second],/accounting is unavailable/)
  await db.exec(accounting)
  pass('missing trigger refuses collection and accounting rerun restores infrastructure')
  await db.query(`UPDATE student_payments SET status='inactive' WHERE id=$1`,[second])
  await settle(db,newStudent,second,2500)
  assert.equal((await payment(db,second)).remaining_amount,0)
  pass('inactive historical original remains collectible')
  const current = await snapshot(db)
  await db.exec(normalize)
  await db.exec(accounting)
  assert.equal(await snapshot(db),current)
  pass('reruns also preserve legitimate post-migration collections and adjustments')
  assert.equal((await one(db,`SELECT count(*)::integer AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='record_student_due_clearance' AND p.pronargs=6`)).n,0)
  assert.equal((await one(db,`SELECT count(*)::integer AS n FROM student_membership WHERE start_date IS NULL OR next_due_date IS NULL`)).n,0)
  pass('obsolete RPC overload absent and legacy undated rows excluded from coverage')
  await db.close()

  const empty = await createDb(false)
  await assert.rejects(empty.exec(accounting),/First run the revised/)
  await empty.exec('ROLLBACK')
  await empty.exec(normalize)
  await empty.exec(accounting)
  pass('wrong order aborts; both scripts work on empty pre-existing schema')
  await empty.close()
  const drift = await createDb()
  await drift.query('UPDATE students SET fees=2501 WHERE id=$1',[legacyStudent])
  await assert.rejects(drift.exec(normalize),/Conversion rolled back/)
  await drift.exec('ROLLBACK')
  assert.equal((await payment(drift,legacyOriginal)).amount,2000)
  assert.equal((await one(drift,'SELECT fees FROM students WHERE id=$1',[students[0][0]])).fees,3023)
  pass('edited audited field aborts and rolls back all normalization')
  await drift.close()
  const fresh = await createDb(false)
  await fresh.exec(freshFooter)
  await fresh.exec(normalize)
  await fresh.exec(accounting)
  for (const name of ['apply_student_due_clearance','guard_student_receipt_amounts','guard_student_receipt_due_date',
    'sync_student_pending_amount','record_student_due_clearance','adjust_student_receipt_due_date']) {
    const pattern = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$\\$;`)
    const clean = text => text.match(pattern)[0].replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim()
    assert.equal(clean(freshFooter),clean(accounting),`${name} drifted between schema and migration`)
  }
  pass('fresh schema installs matching accounting definitions and is compatible with migration reruns')
  await fresh.close()
  console.log(`Completed ${checks} PostgreSQL integration checks.`)
}
main().catch(error => { console.error(error.message); process.exitCode=1 })
