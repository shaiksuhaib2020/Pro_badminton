---
---

# 1. Project Overview

**App:** **SuperOver** — internal badminton facility management system. Staff-only, no public access. Facility uses Playo for customer bookings; staff manually record all bookings in this system.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth) · Server Actions · Vercel (pending deploy)

---

# 2. Current State

All core pages built, functional, and UI-styled:

- ✅ Login page (Supabase Auth, email/password)
- ✅ Sidebar + protected layout shell
- ✅ New Booking — court selection, phone lookup, customer upsert, slot dropdown, booking creation
- ✅ Dashboard — 4 stat cards (IST-aware), today's schedule with court tabs
- ✅ Manage Bookings — filters, search, edit modal, delete with slot reset
- ✅ Courts — slot grid, generate slots, block/unblock, default price edit
- ✅ Customers — list with stats, booking history modal
- ✅ Coaching & Memberships — prototype page with mock data, pending dues highlight, payment history modal
- ✅ Tailwind v4 migration complete
- ✅ Past slot filtering (IST time-aware) on both New Booking and Courts page
- ✅ Polish pass — loading skeletons, error boundaries, input validation

---

# 3. Active Task

Coaching & Memberships prototype just instructed to coding agent. Awaiting confirmation it renders correctly before any further work.

---

# 4. Key Decisions

- All DB writes via Server Actions only — never client-side Supabase writes
- `UNIQUE(slot_id)` on bookings = double-booking prevention at DB level
- `UNIQUE(phone)` on customers = deduplication at DB level
- Slot status stored on slots table (`available/booked/blocked`) — synced by application layer on booking create/delete
- Slot generation is idempotent — `ON CONFLICT DO NOTHING`
- Courts are seeded (4 fixed) — staff cannot create/delete courts
- Default price update is not retroactive — only affects newly generated slots
- Past slots filtered in JavaScript using IST time — not in SQL
- Coaching page is prototype only — no DB table, no server actions, hardcoded mock data
- Validation errors shown only on blur or submit attempt — not on page load

---

# 5. Code & File Context

| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | `getTodayIST()`, `formatCurrency()`, `formatDate()`, `formatSlot()`, `getDateDaysAgoIST()`, `getFirstDayOfMonthIST()` |
| `src/lib/supabase/server.ts` | Server client via `@supabase/ssr` |
| `src/lib/supabase/client.ts` | Browser client via `@supabase/ssr` |
| `src/middleware.ts` | Auth guard — redirects unauthenticated users to `/login` |
| `src/actions/slots.ts` | `generateSlots`, `blockSlot`, `unblockSlot` |
| `src/actions/bookings.ts` | `createBooking`, `updateBooking`, `deleteBooking` |
| `src/actions/customers.ts` | `lookupCustomer` |
| `src/actions/courts.ts` | `updateDefaultPrice` |
| `src/app/globals.css` | Tailwind v4 `@import "tailwindcss"` + `@theme {}` with all `so-*` tokens |
| `tailwind.config.ts` | Content paths only — no theme config (v4) |
| `src/components/coaching/` | Prototype only — no Supabase, no server actions |

**DB Schema summary:**

- `courts` — id (smallint), name, default_price_per_hr, is_active
- `customers` — id (uuid), name, phone (UNIQUE)
- `slots` — id, court_id, slot_date, start_time, end_time, price, status (available/booked/blocked), UNIQUE(court_id, slot_date, start_time)
- `bookings` — id, slot_id (UNIQUE), customer_id, amount, payment_method, booking_source, internal_notes

---

# 6. Errors & Fixes

| Error | Fix |
|-------|-----|
| Entire app unstyled | Tailwind v3 syntax used with v4 installed. Migrated to `@import "tailwindcss"` + `@theme {}` in globals.css |
| `PGRST204` — price column missing | Added `price` column (numeric, not null, default 0) manually in Supabase dashboard |
| `23514` — chk_slots_status violation | `generateSlots` was inserting invalid status value. Fixed to explicitly set `status: 'available'` or omit to use DB default |
| Past slots appearing in New Booking dropdown | Added IST time filter in JavaScript — filter slots where `start_time <= currentISTTime` when date is today |
| Validation red highlight showing on page load | Introduced `touched` state per field — errors only show after `onBlur` or submit attempt |
| Past slots cluttering Courts page | Filtered out past slots entirely from SlotGrid when selected date is today |

---

# 7. Pending / Next Steps

1. Confirm Coaching prototype renders correctly
2. Show prototype to client for feedback
3. If client approves — build real Coaching DB schema and wire up server actions
4. Vercel deploy

---

# 8. Constraints & Notes

- **Turn-by-turn rule** — one chat reply = one step. Wait for confirmation before next turn.
- **No full code in prompts** — description + key snippets only. Agent writes implementation.
- **No `npm run build` verification** in agent prompts unless there's a specific reason.
- **IST always** — all date/time via `getTodayIST()` and IST locale, never raw `new Date()` or SQL `CURRENT_DATE`
- **Server client only in server actions** — browser client never used server-side
- **Coaching page** — prototype only, no DB, no server actions, mock data hardcoded
- **RLS** — all tables protected, authenticated users have full access
- **Reference docs** — `SUPEROVER_SYSTEM_DESIGN.md` and `SUPEROVER_PROJECT_OVERVIEW.md` in project root