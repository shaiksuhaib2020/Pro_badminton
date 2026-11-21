# Badminton Wing — Project Plan & Execution Tracker

> **Adaptive & Living Plan Notice:**
> - This plan is **flexible, dynamic, and non-rigid** — it is an active guide, not a fixed dogma.
> - **Phases can be changed, skipped, merged, reordered, or revised** at any point based on user decisions, practical feedback, or shifting product requirements.
> - **New phases can be introduced** whenever new requirements or features emerge.
> - When decisions are made, the plan, decision log, and the **📍 Current Pointer** are updated so that any coding agent in any context window remains immediately aligned with current realities.

---



- **Active Phase:** **Phase 1 — Supabase Integration & Fee-Related Logic**
- **Current Step:** **Step 1.1 — Review and apply fee-unit normalization and due-clearance migrations, then verify live flows**
- **Last Updated:** 12 Nov 2026

---

## 1. Purpose & Scope

### In Scope (v1 Desktop SaaS Launch)
- A single-pane administrative command center for badminton academy **Owners** and **Managers**.
- **Coaching Fees (Primary Business Engine):** Student enrollment, batch scheduling, attendance marking, fee receipts, partial payments, and overdue tracking.
- **Accounts & Sales:** Expense tracking with custom categories, quick walk-in sales, and equipment inventory with live stock tracking.
- **Operations & Metrics:** Real-time Dashboard ("Today at a Glance") and analytical Reports (Fees, Attendance, Students).
- **Multi-Tenant Security:** Strict tenant data isolation by `academy_id` using Supabase Row Level Security (RLS).

### Explicitly Out of Scope (Deferred Post-Deployment)
- **Coach Mobile Application:** Coaches will NOT use the desktop app. A dedicated mobile interface for attendance and batch overview will be developed after v1 deployment.
- **Multi-Branch Interface:** The database schema has `branch_id`, but the UI branch switcher is hidden until multi-location scaling post-launch.
- **Automated WhatsApp Notifications:** Meta WhatsApp Cloud API is currently an active stub (`/api/whatsapp/send`); live Meta API integration is planned post-launch.
- **Court Membership Advanced Features:** Secondary priority; refined after coaching operations are fully live.
- **Offline Sync:** The app requires an active internet connection.

---

## 2. Current State (What is Done & On Supabase)

| Area | Status | Data Source | Details |
|---|---|---|---|
| **Authentication** | ✅ Done | Supabase Auth | Email/password login with secure SSR cookies (`@supabase/ssr`). |
| **Database Schema** | ✅ Done | Supabase PostgreSQL | Consolidated Schema v3.1 (`database.types.ts` synced via `npm run db:types`). |
| **Batches** | ✅ Done | Supabase | Full CRUD, schedules, branch linkage, per-branch name uniqueness. |
| **Attendance** | ✅ Done | Supabase | Batch-date attendance marking with JSONB validation trigger. |
| **Enquiries** | ✅ Done | Supabase | Lead tracking (`not_scheduled` → `scheduled` → `completed`). |
| **Inventory** | ✅ Done | Supabase | SKU uniqueness, cost/selling price in paise, live stock deductions. |
| **Accounts & Sales** | ✅ Done | Supabase | Dual-ledger (Expenses + Sales/Income) with atomic stock deduction via RPC. |
| **Students & Fees** | Done | Supabase | Active in DB, but currently undergoing Phase 1 refactoring (decoupling enrollment from fee receipts). |
| **Dashboard** | ⚠ Pending | Mock Data | "Today at a Glance" UI built, pending Supabase query aggregation. |
| **Reports** | ⚠ Pending | Mock Data | Charts built (Recharts), pending Supabase data wiring. |
| **Court Memberships** | ⚠ Deferred | Mock Data | Secondary module; deferred until coaching is finalized. |
| **Fee Transactions** | Done | Supabase | Coaching and court transaction view; pending Phase 1 fee receipt wiring. |
| **Communications** | ⚠ Pending | Mock + Stub | Template cards built; WhatsApp API stub logs to console. |
| **Settings** | 🟡 Partial | Partial Supabase | Academy preferences live; staff CRUD live; cleanup needed in Phase 6. |

---

## 3. Project Phases & Milestones

Each phase has a clear operational goal and a verifiable **Done When** checkpoint.

> [!NOTE]
> **Phase Flexibility & Dynamic Adaptation:**
> The sequence below represents the suggested roadmap, but **phases are modular, not rigid**. Based on user decisions, real-world feedback, or business priorities:
> - **Phases can be changed, revised, or reordered** at any time.
> - **Phases can be skipped or deferred** (e.g., deferring court memberships or skipping non-essential stubs).
> - **New phases can be added** as new needs arise.
> 
> The active ground truth for what is being worked on is always the **📍 Current Pointer** and the immediate tasks under **4. Next Up**.

``` Phase 2 (Dashboard & Reports) ──► Phase 3 (Communications)
                                                                           │
Phase 6 (Settings Cleanup)  ◄── Phase 5 (Accounts & Rentals)  ◄── Phase 4 (Court Members)
         │
         ▼
Phase 7 (Onboarding) ──► Phase 8 (WhatsApp API) ──► Phase 9 (Invoices) ──► Phase 10 & 11 (Test & Deploy)
```

--

---

### Phase 2: Reports & Dashboard Supabase Wiring
- **Goal:** Replace in-memory mock data in Dashboard and Reports with live Supabase aggregation queries. Add date range & batch filters to the Dashboard.
- **Done When:**
  1. Dashboard "Today at a Glance" and KPI cards compute live totals from Supabase.
  2. Reports (Fees, Students, Attendance) render real charts from Supabase data.
  3. No imports of `mockStudents`, `mockBatches`, or `mockAttendance` remain in `/dashboard` or `/reports`.

---

### Phase 3: Communications Module Supabase Wiring
- **Goal:** Connect message logs and template management to Supabase.
- **Done When:**
  1. Template gallery and send history load from `message_logs` table.
  2. Sending a message writes a record to `message_logs`.

---


---

### Phase 5: Accounts Module Refinement & Rented Items
- **Goal:** Refine the Accounts module by adding a standalone "Rented Items" tracking flow (e.g. racket/court rentals).
- **Done When:**
  1. Rented items flow is integrated into Accounts with stock tracking.

---

### Phase 6: Settings Page Refinement
- **Goal:** Clean up the Settings page. Remove misplaced events and static matrix roles. Keep academy preferences, staff CRUD, and branch configurations.
- **Done When:**
  1. Settings UI is lean and focused on academy configurations and staff access.

---

### Phase 7: Academy Onboarding Interface
- **Goal:** Build an initial onboarding wizard for a new academy owner upon first login (Academy name, phone, timezone, initial batch setup).
- **Done When:**
  1. First-time login without an existing academy record guides owner through setup flow.

---

### Phase 8: WhatsApp Meta Cloud API Research & Live Integration
- **Goal:** Replace `/api/whatsapp/send` console stub with real Meta WhatsApp Cloud API credentials and automated fee receipts/reminders.
- **Done When:**
  1. Triggering a fee receipt sends an automated WhatsApp message to the student's phone.

---



---

### Phase 10: Comprehensive End-to-End Testing
- **Goal:** Rigorous functional, component, and business logic testing across all modules.
- **Done When:**
  1. All CRUD flows, partial payments, edge cases, and RLS policies are verified with zero console/build errors.

---

### Phase 11: Production Deployment
- **Goal:** Deploy the application to production hosting (Vercel or Netlify) with environment configurations.
- **Done When:**
  1. Production build succeeds, custom domain is connected, and live academy testing passes.


### After deployment : Court Membership Module Refinement
- **Goal:** Connect Court Memberships and Court Payment Entries to Supabase. Maintain strict separation: Check-In on Members page, Fee actions on Fee Transactions page.
- **Done When:**
  1. Court members and payment history load from Supabase.
  2. Session decrementing and monthly validity derive from Supabase.

---
### Phase 12: PDF / Digital Fee Invoice Generation
- **Goal:** Research and implement printable / downloadable PDF fee receipts with academy logo.
- **Done When:**
  1. Clicking "Download Receipt" generates a clean PDF invoice.


## 5. Open Decisions

1. **Invoice Format (Phase 12):** Browser `window.print()` styled receipt vs server-generated PDF (`@react-pdf/renderer`).
2. **Hosting Platform (Phase 11):** Vercel (optimal Next.js App Router support) vs Netlify (predictable bandwidth pricing).
3. **WhatsApp Meta API (Phase 8):** Direct Meta Cloud API credentials vs Aggregator (e.g. Wati / Interakt).

---

## 6. Decision Log

- **2026-11-10:** Database schema consolidated to Version 3.1. Dropped `membership_types` table. Coaching fees stored directly on student and batch records.
- **2026-11-10:** Automated TypeScript type generation script added as `npm run db:types` using Supabase project API (`flyvqsuovlamnybuvxgq`).
- **2026-11-11:** Documentation cleaned. Over 1,700 lines of noise and stale DDL removed from `BW_Architecture_2.md` and `BW_Structure_2.md`.
- **2026-11-11:** Business Logic Decoupled: Student enrollment separated from fee receipts. Single source of truth for validity moved to `student_payments` (`start_date`, `next_due_date`).
- **2026-11-11:** Renamed `students.start_date` to `joining_date` to eliminate naming conflict with payment coverage start dates.
- **2026-11-11:** Unified Renewal & Re-Enrollment: `RenewModal` and `ReEnrollModal` deleted; re-enrollment routed through `AddStudentModal` pre-fill; advance fee collection handled via `FeeReceiptModal`.
- **2026-11-11:** Due Soon threshold set to **$\le 3$ days** in IST (`Asia/Kolkata`).
- **2026-11-11:** Dynamic Roadmap Rule: Formalized that phases are modular and non-rigid. Based on user feedback or shifting priorities, phases can be skipped, deferred, revised, reordered, or new phases added. The active ground truth remains `📍 Current Pointer`.

