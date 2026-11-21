# Phase 1: Batch rosters and historical transactions

Date: 2026-11-15

Phase 1 implementation and local verification are complete. Authenticated browser verification remains outstanding. Phase 2 extraction and Phase 3 cleanup have not started.

## Resulting behavior

`getStudentsByBatch()` now returns a typed `BatchStudentRosters` object with `attendanceStudents` and `historyStudents`, both derived from the same resolved batch membership.

| Student status | Attendance | Students/history | Enrolled card/header count |
|---|---|---|---|
| active | Yes | Yes | Yes |
| due-soon | Yes | Yes | Yes |
| expired | Yes | Yes | Yes |
| inactive | No | Yes | Yes |
| dropout | No | Yes | No |

An active administrative profile without coverage remains eligible for attendance and the existing batch/academy New Pending placeholder. Missing or empty batches return both lists empty.

Batch Students now includes associated dropout students in its existing Dropout tab. Batch Transactions retains all associated students' receipt history in Recent/Paid and outstanding original receipts in Partially Paid, including inactive/dropout profiles. Pending continues excluding inactive/dropout students. Deleted receipts and due-clearance receipts remain excluded from Partially Paid; each remaining original is a separate collection target.

Academy-wide transaction policies and individual-profile policies remain unchanged. Batch association still uses `currentBatchId`; transfers move the student's full history to the current batch. This does not introduce batch-at-payment attribution.

## Files changed

- `src/lib/queries/students.ts`: typed two-list result, active-only attendance eligibility, dropout-inclusive history, and empty-object result. Existing authenticated academy lookup, UUID/name resolution, payment-history loading, status derivation, and paise-to-rupee mapping are retained.
- `src/app/(management)/batches/[id]/page.tsx`: passes the two rosters from the server query.
- `src/app/(management)/batches/[id]/_components/BatchDetail.tsx`: consumes the supplied attendance roster, supplies history to both shared views, and derives the enrolled count excluding dropout. Attendance state, draft initialization, full-day saving, and hidden saved marks are unchanged.
- `src/components/students/StudentList.tsx`: batch scoping filters by batch ID without removing dropout students before tab selection.
- `src/components/transactions/transaction-data.ts`: batch scoping retains dropout students; batch and individual partial histories accept inactive/dropout balances while the academy partial queue retains its active-profile policy.

The batch-card implementation already excludes dropout and includes inactive students, so it required no change. There are no schema, migration, RPC, trigger, server-action, dependency, or testing-framework changes in this phase. Existing staged work was preserved.

## Verification

| Check | Result |
|---|---|
| Baseline TypeScript | Passed |
| Updated TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Passed |
| Production build: `npm.cmd run build` | Passed; all routes compiled, including `/batches/[id]` |
| `git diff --check` | Passed |
| Targeted ESLint on the five changed source files | Same three pre-existing `react-hooks/set-state-in-effect` errors; no additional errors |
| Isolated query and transaction-selector fixtures | Passed |
| Isolated React render and collection-callback fixtures | Passed |
| Authenticated browser flows | Outstanding; browser access stopped as described below |

The existing lint errors occur at `setAttendanceRecords(attendance)` and URL-driven `setActiveTab(...)` in BatchDetail, and `setMounted(true)` in StudentList. They were present before Phase 1. No lint rules were disabled and no effect-state refactor was included.

Ad hoc verification used the installed TypeScript compiler, React server rendering, and Node assertions without installing dependencies or adding a test runner. It executed the actual query, selectors, directory, Batch Detail, batch cards, and partial collection callbacks with isolated Supabase/navigation/action fixtures. It checked:

- All lifecycle statuses, including active profiles without coverage.
- UUID and legacy-name lookup, the academy predicate, missing/empty/foreign-academy batch results, query errors, complete receipt histories, and existing money/null-mode mapping.
- Batch isolation, including students in another batch with the same displayed name.
- Inactive/dropout receipts and multiple outstanding originals per student; deleted/clearance exclusion; exact row selection for collection.
- Pending exclusions, New placeholder scope rules, search/date filtering, unchanged academy/student policies, and input-array immutability.
- Batch Active/Inactive/Dropout directory rendering, attendance roster rendering, full-history props, matching card/header counts, and empty states.

These fixture checks do not prove hosted RLS behavior, browser interactions, or database persistence. The current server action and modal were reviewed to confirm that clearance still passes the selected student's ID and original receipt ID; no live financial mutation was performed.

The browser access host was unavailable. The native Chrome fallback was then stopped by the tool because it could not determine the current browser URL confidently enough to enforce policy. No further UI actions were attempted. Live checks still needed: attendance save/reload with hidden historical marks, dropout/re-enrollment refresh, and clearance of the selected inactive/dropout original in an authenticated session.

## Checkpoint

Local compilation and isolated behavior checks support the Phase 1 implementation. Review this phase and complete any desired authenticated checks before authorizing Phase 2. No git commit or deployment was performed.
