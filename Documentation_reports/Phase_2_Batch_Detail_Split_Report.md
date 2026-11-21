# Phase 2: Batch Detail structural split

Date: 2026-11-15

Phase 2 implementation and local verification are complete. Authenticated browser verification remains outstanding. Phase 3 cleanup has not started.

## Structure and ownership

All paths below are relative to `src/app/(management)/batches/[id]/`.

```text
page.tsx
actions.ts
_components/
  BatchDetail.tsx
  BatchAttendanceTab.tsx
  BatchStudentsTab.tsx
  BatchTransactionsTab.tsx
  attendance/
    AttendanceInsights.tsx
    AttendanceMarking.tsx
    useBatchAttendance.ts
    attendance-utils.ts
```

| File | Responsibility |
|---|---|
| `page.tsx` | Existing server fetching and Suspense boundary; keys BatchDetail by batch UUID so changing batches resets local state. Same-batch refreshes retain component identity. |
| `actions.ts` | Existing authenticated full-day attendance upsert; unchanged. |
| `BatchDetail.tsx` | Header, enrolled count, tab navigation, toast display, and passing data/controllers to tab components. Reduced to approximately 120 lines. |
| `BatchAttendanceTab.tsx` | Composes the attendance card, insight/marking views, and sticky marking actions without adding layout wrappers. |
| `BatchStudentsTab.tsx` | Thin adapter to the existing shared StudentList with the batch scope and full history roster. |
| `BatchTransactionsTab.tsx` | Thin adapter to the existing shared CoachingTransactions with the batch UUID and full history roster. |
| `AttendanceInsights.tsx` | Existing filter, search, attendance grid, percentage display, and date-entry interactions. |
| `AttendanceMarking.tsx` | Existing marking interface and separately exported sticky actions, retaining their original DOM placement. |
| `useBatchAttendance.ts` | Attendance view/filter/search/draft state, server-prop synchronization, saving, optimistic records, error handling, refresh, and toast lifetime. |
| `attendance-utils.ts` | Typed navigation interpretation, batch matching, date ranges, draft copying, roster-only summaries/averages, Mark All Present, and immutable optimistic record updates. |

Interactive modules remain Client Components and receive real server-fetched data. Imports from `mock-data.ts` in the extracted modules are explicit type imports. No shared table, schema, migration, RPC, trigger, financial action, or dependency changed in this phase.

## Preserved behavior

- The attendance hook is called unconditionally in BatchDetail, above conditional tab content. Attendance tab unmounts cannot discard drafts, marking date/view, search, or insight filter.
- Attendance eligibility and enrolled/history counts continue using the Phase 1 policies. Students and Transactions receive the full history roster, including associated inactive/dropout students.
- Initial and subsequent URL tab/date/mode requests are supported. A changed URL request initializes marking from the matching saved day. Local tab clicks and same-request refreshes do not reinitialize drafts or reopen marking after a successful save.
- Refreshed server props replace the saved attendance data while an in-progress draft remains intact. Entering a date explicitly loads the latest saved marks.
- Draft initialization copies the entire saved map. Individual marks and Mark All Present preserve hidden inactive/dropout/transferred marks. Counters, completion, and marking controls use only the supplied attendance roster.
- Saving still calls the existing action with the full day's draft, updates the local insight data, returns to insights, displays a toast, and refreshes the route. Failures retain the draft and display the existing alert. Cancel and explicit date changes retain their prior semantics.
- Original attendance markup, class strings, and sticky action placement are retained.

The two existing effect-state synchronization paths were replaced by guarded state adjustments when incoming records or URL requests change. The extracted modules pass ESLint without suppressions. The toast timeout is now cleaned up when it changes or the component unmounts. An in-flight ref prevents duplicate save submissions.

## Verification

| Check | Result |
|---|---|
| Baseline TypeScript | Passed |
| Baseline BatchDetail ESLint | Two existing `react-hooks/set-state-in-effect` errors |
| Updated TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Passed |
| Targeted ESLint: batch-detail `_components` directory and server page | Passed; the two previous synchronization errors are resolved |
| Production build: `npm.cmd run build` | Passed, including `/batches/[id]` |
| `git diff --check` | Passed |
| Pure attendance helper assertions | Passed |
| Exact before/after React static markup comparisons | All 10 fixtures passed |
| Isolated controller/state-harness checks | Passed |
| Authenticated browser flows | Outstanding: browser access host unavailable |

Verification used the installed TypeScript compiler, React server rendering, and Node assertions with controlled navigation/shared-component/action fixtures. No test runner, testing dependency, or permanent testing infrastructure was added. The comparisons covered insights, empty attendance, empty roster, Students, Transactions, marking by date/mode, legacy batch-name records, and marking with an empty roster.

The state harness exercised the actual shell and hook with simulated React hooks and a stubbed attendance action. It checked tab-switch preservation, search/filter preservation, active-only counters, hidden saved marks, exact full-day action arguments, duplicate-save prevention, optimistic save, server refresh, toast cleanup, save failure, cancel, date changes, deep links, subsequent URL changes, and refresh under an unchanged marking URL. Separate server-page assertions verified batch-key identity and both roster props. These checks do not replace real browser lifecycle or database verification.

Browser inventory was checked again and returned `The browser access host is unavailable`. No native fallback or hosted data mutation was attempted in Phase 2. Remaining manual checks are unsaved draft preservation across tabs, URL-driven marking, save/reload with hidden historical marks, and navigation between batches in an authenticated session.

Existing staged work and Phase 1 changes were preserved. No commit or deployment was performed. Phase 3 requires a separate command.
