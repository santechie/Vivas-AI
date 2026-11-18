# Implementation Plan - Reports & Analytics Module for Vivas AI

Build the complete **Reports & Analytics** module in Vivas AI based on Tend.com's reporting system, providing comprehensive data visualizers, yield analytics, sales performance, labor allocation, financial P&L statements, input consumption tracking, custom saved reports, and CSV exports.

## User Review Required

> [!IMPORTANT]
> - **Theme Consistency**: The new Reports & Analytics module will strictly use Vivas AI's clean **white / light theme** (`#ffffff` cards, `#f8fafc` canvas, `#0f172a` typography, `#e2e8f0` borders, `#16a34a` / `#0284c7` brand accents).
> - **Database Auto-Migration**: New tables (`vivas_saved_reports`, `vivas_report_snapshots`) will be automatically created in PostgreSQL on server startup and seeded with initial standard report definitions.

---

## Proposed Changes

### Database & Backend

#### [NEW] [reports_migration.sql](file:///Volumes/Files/Antigravity%20demo/VivasAI/database/reports_migration.sql)
- SQL migration creating `vivas_saved_reports` and `vivas_report_snapshots` tables with proper foreign key relationships, indexes, and initial seed data.

#### [MODIFY] [server.js](file:///Volumes/Files/Antigravity%20demo/VivasAI/backend/server.js)
- Execute `reports_migration.sql` during database initialization.
- Implement `/api/reports/summary` (Executive KPI metrics across all farm operations).
- Implement `/api/reports/yield` (Yield analytics, planned vs actual harvest, grade distribution).
- Implement `/api/reports/sales` (Sales revenue by crop, sales channel performance, buyer frequency).
- Implement `/api/reports/labor` (Labor hours by task, labor cost allocation per crop/field, worker efficiency).
- Implement `/api/reports/financials` (Executive P&L statement, COGS allocation, enterprise margin matrix).
- Implement `/api/reports/inputs` (Seed, fertilizer, protection consumption & container usage).
- Implement CRUD routes for `/api/reports/saved` (Save, list, update, delete custom report templates).

---

### Frontend

#### [NEW] [ReportsDashboard.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/reports/ReportsDashboard.jsx)
- **Header**: Title, subtitle, category badge (`REPORTS & ANALYTICS`), Date Range Selector (This Week, Next Week, This Month, Year-to-Date, Custom), Refresh button, Export CSV, Save Report button.
- **Module Category Tabs**:
  1. `Overview & Executive Summary`: Key farm KPIs, revenue vs expense trend bars, crop profitability matrix.
  2. `Yield & Harvest Analytics`: Total harvest volume by crop/variety, yield per bed foot, planned vs actual harvest variance, grade distribution (Grade A, Grade B, Processing).
  3. `Sales & Channel Performance`: Gross revenue by crop, channel revenue split (Wholesale, Restaurant, Farmers Market, CSA), top customer buyers, average order value (AOV).
  4. `Labor & Workforce Allocation`: Total labor hours & spend by task type, labor cost per crop/field, worker productivity & attendance.
  5. `Financial P&L & Margins`: Executive P&L statement, COGS vs operating overhead, crop enterprise profit margin matrix (%).
  6. `Inputs & Material Usage`: Seeds, fertilizers, protection chemical consumption, container & tray capacity utilization.
  7. `Saved Custom Reports`: List of user-created report presets with quick load and delete options.
- **Save Report Drawer**: Slide-over drawer to configure custom report name, category, date filters, selected metrics, and notes.

#### [MODIFY] [App.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/App.jsx)
- Import `ReportsDashboard` from `./reports/ReportsDashboard`.
- Add `#reports` route handling in `currentView`.
- Add `Reports & Analytics` menu item to the top navigation bar with `BarChart2` icon.

---

## Verification Plan

### Automated Tests
- Run `npm run build` in `frontend/` to confirm syntax and clean React bundling.

### Manual Verification
- Deploy backend APIs and database tables to Hetzner server (`vivasdemo.vikramafoods.com`).
- Verify API endpoints (`/api/reports/summary`, `/api/reports/yield`, `/api/reports/sales`, `/api/reports/labor`, `/api/reports/financials`, `/api/reports/saved`).
- Use `browser_subagent` to test navigation to `#reports` on `https://vivasdemo.vikramafoods.com`, test category tabs, date filters, save report drawer, and CSV exports.
