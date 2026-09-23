**CONTEXT & OBJECTIVE**
We need to build a dedicated **Reports & Analysis** page for the Pro Badminton academy management system. The goal is to aggregate business health metrics (Financials, Enrollments, and Attendance) into a single, visually premium dashboard, transforming this from a simple management tool into a sticky business system for the academy owner.

**Current Tech Stack & State:**
- Next.js 14+ (App Router)
- Tailwind CSS (using custom domain variables like `bg-so-surface`, `bg-so-accent`, `border-so-border`, `text-so-text`, `text-so-muted`)
- Lucide React (for icons)
- Mock Data: Data is currently sourced from `@/lib/mock-data.ts`.

**Development Constraints:**
1. **Frontend Only:** Wire this up entirely using mock data for now. We will integrate Supabase later. You can create local mock arrays inside the Reports component or extend `@/lib/mock-data.ts` to feed these charts.
2. **Library Installation:** Use `recharts` for all charts. Before writing code, run `npm install recharts`.
3. **Styling Consistency:** Use the segmented bar style for the tab buttons (similar to how we built the `transactions` tab in the member profile). Use clean, card-based layouts with `bg-white border border-so-border rounded-xl p-5 shadow-sm`.

---

**TASK 1: SETUP & NAVIGATION**
1. Create a new route: `src/app/(management)/reports/page.tsx`.
2. Update `src/components/layout/Sidebar.tsx`:
   - Add a "Reports" navigation link using a relevant Lucide icon (e.g., `PieChart` or `BarChart2`).
   - Add `/reports` to the `PAGE_NAMES` mapping.

---

**TASK 2: PAGE STRUCTURE & TABBED NAVIGATION**
Build the main `ReportsPage` component with a 3-segment tabbed navigation bar at the top:
- **Financial** | **Students** | **Attendance**
Use a segmented control UI (e.g., a `bg-so-surface p-1 rounded-lg` wrapper with an active state of `bg-so-accent text-white rounded-md`).

---

**TASK 3: IMPLEMENT TABS & CHARTS (Mock Data)**

**Tab 1: Financial**
- **Monthly Revenue:** A BarChart (12 months side-by-side). Highlight the current month in the accent color (`#YOUR_ACCENT_HEX`) and others in a muted gray/blue. *Purpose: Show seasonality (tournament spikes vs school holiday dips).*
- **Fee Collection Rate:** A circular gauge or radial bar chart (or prominent stat card with a progress bar) showing % of expected fees collected. (e.g., 85%). *Purpose: A rate like 78% flags an immediate cash-flow problem.*
- **Payment Method Breakdown:** A PieChart/DonutChart showing Cash vs UPI vs Card split.
- **Pending Dues Aging:** A table component bucketed by aging: `0-30 days`, `31-60 days`, and `60+ days`. Render the 60+ days row/text in Red (`text-red-600`) as bad debt risk.

**Tab 2: Students**
- **Enrollment Trend:** A LineChart showing total active student counts over the last 12 months. *Purpose: Indicate if the academy is growing, flat, or shrinking.*
- **Net Growth (New vs Exits):** A grouped BarChart (or composed chart) per month. Use Green for new enrollments and Red for exits/dropouts.
- **Membership Type Distribution:** A PieChart showing the split between Monthly, Annual, and Session-based plans. *Purpose: Flag recurring revenue predictability issues.*
- **Batch Capacity Utilization:** A horizontal BarChart per batch showing enrolled students vs max capacity (e.g., Morning 95%, Evening 40%).

**Tab 3: Attendance**
- **Batch-wise Attendance Rate (This Month):** A simple horizontal BarChart (one bar per batch) showing average attendance percentages.
- **At-Risk Students Table (Below 75%):** A table (not a chart) highlighting students below 75% attendance. Columns: `Name`, `Batch`, `Attendance %`, `Last Seen Date`. *Purpose: This is the coach's call list for the week.*
- **Best/Worst Days:** A BarChart showing average attendance across all batches grouped by Day of the Week (Mon-Sun). *Purpose: Identify scheduling inefficiencies (e.g., Thursdays are dead).*
- **MoM Comparison:** A visual indicator (up/down arrow with percentage) next to each batch's attendance rate showing if it improved over last month.

---

**EXECUTION INSTRUCTIONS:**
1. Do not use the `planning_mode` for this task. You can proceed directly to execution.
2. Install `recharts`.
3. Create the necessary mock data constants directly inside `src/app/(management)/reports/page.tsx` for now to power these specific charts.
4. Construct the UI using responsive CSS grid layouts (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for top-level stat cards, wider spans for complex charts).
5. Ensure Tooltips in the Recharts components are styled cleanly to match the Tailwind theme.
6. Do not break anything or modify other pages except Reports and Analysis page please 