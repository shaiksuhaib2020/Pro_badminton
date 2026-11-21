# Live dashboard refinement

Date: 2026-11-16

Implemented the dashboard end to end in local source, using DashRefine.md as guidance and correcting unsupported historical interpretations. Hosted authenticated UI verification remains outstanding.

## Modules and data

- `dashboard/page.tsx`: async server entry point; reads validated URL mode/date and the IST date.
- `src/lib/queries/dashboard.ts`: authenticated, explicit academy predicates on all six source tables; parallel paginated reads; database paise mapped to rupees; errors propagate instead of returning sample/zero data.
- `src/lib/dashboard/period.ts`: Day/Week/Month bounds, Monday weeks, leap/month/year boundaries, invalid/future parameter fallback, previous/next periods.
- `src/lib/dashboard/metrics.ts`: pure receipt, balance, activity, inventory and attendance calculations. Inputs remain immutable.
- `src/lib/types/dashboard.ts`: dashboard input and period contracts.
- Separate card modules: DashboardStats, ActivityCard, PaidStudentsCard, FeeAlertsCard, AttendanceAlertsCard, LowStockCard, DemoMonthlySummaryCard. Card and DashboardView compose the layout; PeriodNavigation owns URL transitions and manual refresh.
- Route loading and error boundaries show actual pending/failure state.

Batch Revenue and its forecast-based progress/remaining figures are removed, following the updated note. The original monthly Income/Expenses/Net card stays visible as **This Month - Demo**, with an explicit sample-data notice. It does not contribute to live totals. ESLint prohibits dashboard/metric mock imports except in this one module.

## Reporting contracts and refinements

### Period navigation

Day is the default. Week starts Monday. Forward navigation stops at the period containing today. Direct invalid/future dates fall back to today; invalid modes fall back to Day. Current week/month activity queries stop at today, while upcoming due dates inside the current period remain eligible for alerts. All date boundaries use IST. Enquiry timestamp queries use an inclusive IST start and exclusive next-day boundary.

### Paid Students and Collected

One row per receipt, including multiple receipts for one student. All statuses of student profiles remain eligible; voided receipts are excluded. Full, partial and due-clearance amounts are counted once. Selection uses payment date; ordering uses issue timestamp descending, payment date descending, then receipt ID. Collected sums the same displayed receipt rows, with integer-paise arithmetic. Partial Due beneath an old receipt is explicitly its **current** remaining amount, not a historical balance. Nullable modes display Unspecified. No five-row truncation remains.

### Pending Dues, Fee Alerts and renewal status

Pending Dues sums current positive remaining balances on non-voided original receipts whose coverage due date falls inside the selected period. It includes inactive/dropout profiles. Counts are unique students, while separate original balances remain separate alert rows. Coverage end is the only available receipt due-date field; no fictitious installment deadline is introduced.

Renewal reminders apply to operationally active profiles and their latest active, dated coverage original. They are distinct from recorded debt, show Not yet charged, and are not added to the dues amount. An original already represented by an unpaid-balance alert does not get a duplicate renewal alert. Future dates more than three days away use Upcoming rather than a misleading Due Soon label. Alerts sort by actual due date, so overdue dates precede future dates. Legacy positive balances without coverage dates are disclosed as excluded from period allocation.

The note's historical Overdue reconstruction is unsupported by the current mutable schema. Past periods show Unavailable for Pending Dues/Overdue and hide Fee Alerts. Current-period Overdue is explicitly a live snapshot of active coverage expired before today, not a forecast for the end of the week/month. New profiles without coverage are not falsely overdue. Active Members includes active/due-soon/expired administrative profiles and excludes inactive/dropout, consistent with the operational roster.

### Activity

Enrollment activity uses original joining dates, not re-enrollment edits. New enquiries use creation timestamps converted to IST; trial dates do not inflate enquiry counts. Payments counts the same non-voided receipts as Paid Students. Recorded Dropouts uses retained dropout dates; the UI explains that re-enrollment clears those dates. Inactive Students is explicitly a current snapshot because no historical inactivity event log exists. Students with Dues counts unique current debtors with receipt due dates in the selected period, and is unavailable for past periods.

### Attendance

Denominators contain only explicit present/absent marks. Unmarked days/students are not invented as absences. Batch rates aggregate student-session marks and retain historical marks for inactive, dropout or transferred students. Batch IDs isolate same-name batches. Archived batches retain their labels when represented by attendance.

Day mode uses a neutral bar and lists recorded absences in batch order. Week/Month student flags require three marked sessions and an actual rate below 60%, evaluated per recorded batch. This retains the existing threshold/minimum; no configurable threshold field exists in the current schema. Empty datasets say No attendance recorded; an absence of flags does not assert that students with insufficient records attend regularly.

Attendance prompts appear only for Day/today and currently active batches scheduled on today's weekday. Their completion counters compare saved marks with the current active roster, excluding hidden historical marks. Links open the existing batch marking flow; dashboard reporting does not write attendance.

## Refresh and scope

Student/payment mutations, batch mutations, attendance saves, enquiries, inventory changes and inventory-sale create/update/delete now invalidate `/dashboard`. Other financial write logic, RPCs and schema are unchanged. The route also has manual refresh. This does not install cross-device realtime subscriptions.

The query currently paginates the academy's non-voided coaching receipt ledger to derive both current coverage and remaining balances; only required receipt columns are read. This avoids row-limit truncation, but very large ledgers may warrant a later aggregate/view optimization. No per-student query loop was added. RLS remains authoritative in addition to explicit academy predicates.

## Verification

- Updated TypeScript, targeted ESLint, production build and whitespace checks passed.
- `node scripts/verify-dashboard.mjs` uses installed TypeScript, Node assertions and React server rendering; no test runner or dependencies were added.
- Fixtures cover invalid/future dates, Monday weeks, leap dates, period bounds, voided receipts, clearances, multiple receipts, decimal money, unique debtor counts, inactive/dropout debt, renewal separation, absent/unmarked/hidden attendance, immutable input and honest empty/past-period rendering.
- Actual query execution with isolated Supabase fixtures checks every table's academy predicate, 1,001-row pagination, paise conversion, IST timestamps and error propagation. Fixtures perform no hosted writes.
- Live Supabase session/RLS/browser reconciliation remains a manual check; local tests do not prove the deployed database's accounting migrations or authenticated UI flows.
- Browser verification was attempted, but the computer-use runtime failed to initialize because a kernel-assets path was missing. No authenticated browser result is claimed.
- Source comparison against the pre-task index confirmed that all six existing mutation modules changed only to invalidate the dashboard; financial and attendance write operations are unchanged.

No deployment, schema migration, accounting write change, realtime setup, or git commit was performed. Existing staged work was preserved.
