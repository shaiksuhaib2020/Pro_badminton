# Phase 3: Domain modules and mock-dependency cleanup

Date: 2026-11-15

Phase 3 implementation and local verification are complete. Authenticated browser verification remains outstanding. Dashboard, Reports, Settings, Court and Communications persistence migrations were not started.

## Changes

Moved 32 application types from `src/lib/mock-data.ts` into ten feature modules, preserving their declarations and representation contracts:

| Module under `src/lib/types/` | Models |
|---|---|
| `students.ts` | Student, EnrollmentDay |
| `payments.ts` | PaymentEntry, PaymentMethod |
| `batches.ts` | Batch |
| `attendance.ts` | AttendanceRecord |
| `enquiries.ts` | Enquiry, EnquiryStatus |
| `inventory.ts` | InventoryItem |
| `accounts.ts` | AccountEntry, SaleEntry, SaleType |
| `court.ts` | Court plan, membership, person, payment, check-in and status models |
| `settings.ts` | Settings, Event, Branch, StaffMember, roles/statuses and permission display types |
| `communications.ts` | MessageLog, MessageRecipient, RecipientStatus |

Application models retain rupee amounts, camelCase fields, optional legacy timestamps, receipt identities and derived statuses. Generated Supabase types remain unchanged and continue describing raw database rows.

Legitimate runtime values moved without changing their declarations:

- `src/lib/constants/accounts.ts`: EXPENSE_CATEGORIES and INCOME_CATEGORIES.
- `src/lib/constants/inventory.ts`: BUILTIN_INVENTORY_CATEGORIES.
- `src/lib/constants/permissions.ts`: PERMISSION_MATRIX, explicitly documented as a display reference rather than authorization enforcement.
- `src/lib/court-utils.ts`: getMembershipDisplayLabel and getMembershipPeopleCount.

Audited 73 existing TypeScript/TSX consumers and updated type/constant/helper imports where needed, including the Phase 2 attendance modules. In total, 64 existing source files changed, including consumer imports, the mock module, query markers and the two fallback removals. All domain type imports are explicit `import type`. `mock-data.ts` now contains sample records and mutable demo state, with no compatibility re-exports of moved types/constants/helpers. Its existing seed logic and record declarations are preserved.

## Live-feature fallback removal

- StudentList uses only its supplied batch choices. An academy with no batches gets no sample batch pills; the All Batches control remains. Real supplied choices retain their previous rendering.
- ExpenseModal now requires `customCategories` and an asynchronous persistence callback returning `{ success, error? }`. The current Accounts caller already supplies both. The modal adds/selects a category only after success, reports explicit or thrown failures, and releases its busy state on failure. It no longer reads or mutates mock custom categories.
- Built-in expense/inventory categories remain legitimate static choices; empty custom-category arrays do not suppress those built-ins.

## Import boundaries

All eight `src/lib/queries/` modules import `server-only`. The installed Next.js documentation confirms that Next handles this marker internally without an extra dependency.

`eslint.config.mjs` prohibits mock-data imports in migrated student, batch, enquiry, inventory, account and shared coaching-transaction modules, as well as query/type/constant/court-helper modules. The mixed transaction route still delegates Court rendering to its explicitly mock-backed CourtTransactionsView.

Explicit deferred features and the Sidebar/TopBar shell are outside that restriction. AccountEntryModal is an explicit legacy exception because it is outside the current live Accounts import graph. BranchesSection is also outside the current management-page import graph. Neither legacy component was removed.

## Corrected documentation

Updated the current tables and rules in `docs/BW_Structure_2.md`, `docs/BW_Architecture_2.md`, and `docs/UIPatterns.md`:

- Dashboard is a Client Component using sample business data.
- Students is the coaching directory; Court Memberships uses `/court-memberships` and `/court-memberships/[id]`.
- Accounts uses `account_entries`, `sales`, and the `custom_expense_categories` table.
- Settings renders a server wrapper around in-memory academy/staff/event/communication sections; its query file only re-exports batch queries.
- Sidebar/TopBar retain sample feature/branch settings; Login and Sidebar sign-out use real Supabase Auth.
- Current type/constant/helper imports, actual auth-context path, Phase 1 attendance/history rosters, dropout history policy, and Phase 2 module/state lifetime are documented directly.
- Corrected the transaction-refinement report reference to its existing `Fees_Transaction/` location. User report moves and unrelated edits were preserved.

## Remaining mock inventory

There are 25 remaining mock import declarations, each in an explicit deferred or legacy area:

- Dashboard: one page.
- Reports: Fees, Students and Attendance segments.
- Court: directory, profile, CourtTransactionsView, and three court modals.
- Settings: academy, staff, communications, events, and unused BranchesSection.
- Communications: page, history, and five templates.
- Shell: Sidebar and TopBar.
- Legacy: AccountEntryModal.

Removing these remaining imports requires the corresponding business persistence work; changing import organization has not migrated those features. The WhatsApp endpoint still returns simulated success.

## Verification

| Check | Result |
|---|---|
| Baseline and updated `tsc --noEmit --incremental false` | Passed |
| Production build: `npm.cmd run build` | Passed; all routes compiled |
| `git diff --check` and new module whitespace checks | Passed |
| New modules / ExpenseModal / ESLint-config targeted lint | Passed |
| Full-source ESLint comparison | Same 59 errors and 37 warnings as baseline; no new diagnostics, accounting for shifted source locations |
| Moved-declaration parity | All 32 types, four constants and two helpers match their original declarations |
| Source implementation parity | 128 other existing file bodies match after excluding imports; demo seed/record statements also match |
| Type-module runtime check | No runtime dependencies emitted for the ten type modules |
| Boundary fixtures | Rejected alias and relative mock imports at 14 protected module locations; permitted six explicit deferred/legacy locations |
| Empty-state and persistence fixtures | Passed, including rejected/thrown callback failures and unchanged rupee-valued expense payloads |
| Phase 1/2 smoke checks | Dropout batch receipt/partial history, academy partial exclusion and hidden attendance mark preservation passed |
| Authenticated browser flows | Outstanding: browser access host unavailable |

Ad hoc checks used the installed TypeScript compiler, React server rendering and Node assertions. The supplied real-batch and custom-category markup matched the baseline. Fixtures did not send database writes, messages, or external financial transactions. No test runner, testing dependencies, schema migration, accounting-rule change, commit or deployment was added.

Manual checks still needed: empty-batch academy rendering; expense category creation/failure/reopen against an authenticated Supabase session; and the previously recorded attendance draft/save/reload and inactive/dropout clearance flows. Existing lint debt is separate from this cleanup.
