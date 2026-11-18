# Financials Module Implementation Plan (Vivas AI)

We will design, develop, test, and deploy the complete **Financials Module** in **Vivas AI** with full feature parity to **Tend.com**'s Financials system and customized for farm financial operations.

---

## 📌 Proposed Architecture & Scope

### 1. Sub-Modules & Interactive Screens
1. **Transactions (`Transactions.jsx`)**:
   - Complete ledger of all farm financial cash flows: **Income**, **Expenses**, **Transfers**, **Refunds**.
   - Top KPI summary: Total Income (₹), Total Operating Expenses (₹), Net Cash Flow (₹), Pending Payables / Receivables.
   - Comprehensive data table with Type pills, Category codes, Memo, Party (Customer/Vendor), Linked Entities (Crop, Sales Channel, Order ID, Materials, Labor Timesheet), Payment Methods (Cash, Bank Transfer, UPI, Credit Card, Cheque), Statuses (*Completed, Pending, Void*), and Action buttons.
   - Side Drawers for recording Income, recording Expenses, single/bulk status changes, and 1-Click CSV export.

2. **Accounting Categories (`AccountingCategories.jsx`)**:
   - Comprehensive Chart of Accounts (COA) tailored for farm enterprises (*Revenue, Cost of Goods Sold, Operating Expenses, Capital Assets, Tax & Liabilities*).
   - Pre-seeded with standard agricultural tax lines (e.g. Schedule F / GST agricultural references).
   - Grouping options (*Group by Type*, *Group by Parent/Detail*).
   - Search & filters, Add/Edit Category Drawer with Accounting Code, Detail Category, Tax Deductibility toggle, and system flags.

3. **Financial Summary & P&L Analytics (`FinancialSummary.jsx`)**:
   - Executive Profit & Loss dashboard: Gross Revenue, Operating Expenses, Net Operating Profit, Margin %.
   - Monthly & Quarterly revenue vs expense trend breakdown.
   - Expense distribution by Accounting Category (visual meters & percentages).
   - **Crop Profitability Matrix**: Revenue generated vs Material input costs vs Labor costs per crop variety (*Tomatoes, Basil, Microgreens, Cucumbers, Bell Peppers*) with Net Margin % calculation.
   - 1-Click Export of Financial P&L Report.

---

## 🗄️ Database Architecture (`database/financials_migration.sql`)

### Tables to Create & Seed:
1. **`vivas_accounting_categories`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `category_name VARCHAR(150) NOT NULL`
   - `type VARCHAR(50) NOT NULL` (*'Revenue', 'Expenses', 'Cost of Goods Sold', 'Capital Asset', 'Tax & Liability'*)
   - `accounting_code VARCHAR(50) NOT NULL UNIQUE`
   - `detail_category VARCHAR(150)`
   - `description TEXT`
   - `tax_line VARCHAR(100)`
   - `is_tax_deductible BOOLEAN DEFAULT TRUE`
   - `parent_id UUID REFERENCES vivas_accounting_categories(id) ON DELETE SET NULL`
   - `is_default BOOLEAN DEFAULT FALSE`
   - `status VARCHAR(30) DEFAULT 'active'`
   - `created_at`, `updated_at`

2. **`vivas_financial_transactions`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `transaction_code VARCHAR(50) NOT NULL UNIQUE` (e.g., `TXN-2026-0001`)
   - `transaction_date DATE NOT NULL DEFAULT CURRENT_DATE`
   - `type VARCHAR(30) NOT NULL` (*'Income', 'Expense', 'Transfer', 'Refund'*)
   - `category_id UUID REFERENCES vivas_accounting_categories(id) ON DELETE RESTRICT`
   - `category_name VARCHAR(150) NOT NULL`
   - `category_type VARCHAR(50) NOT NULL`
   - `description TEXT NOT NULL`
   - `amount NUMERIC(12,2) NOT NULL`
   - `currency VARCHAR(10) DEFAULT 'INR'`
   - `payment_method VARCHAR(50) DEFAULT 'Bank Transfer'`
   - `party_name VARCHAR(150)`
   - `party_type VARCHAR(50)` (*'Customer', 'Vendor', 'Employee', 'Other'*)
   - `invoice_receipt_ref VARCHAR(100)`
   - `payment_status VARCHAR(30) DEFAULT 'Completed'` (*'Completed', 'Pending', 'Void'*)
   - **Cross-module Links**:
     - `crop_id UUID REFERENCES vivas_crops(id) ON DELETE SET NULL`
     - `crop_name VARCHAR(100)`
     - `sales_channel_id UUID REFERENCES vivas_sales_channels(id) ON DELETE SET NULL`
     - `sales_channel_name VARCHAR(100)`
     - `order_id UUID REFERENCES vivas_orders(id) ON DELETE SET NULL`
     - `order_code VARCHAR(50)`
     - `input_item_id UUID REFERENCES vivas_inputs_catalog(id) ON DELETE SET NULL`
     - `equipment_id UUID REFERENCES vivas_equipment(id) ON DELETE SET NULL`
     - `labor_timesheet_id UUID REFERENCES vivas_labor_timesheets(id) ON DELETE SET NULL`
   - `tax_rate_pct NUMERIC(5,2) DEFAULT 0.00`
   - `tax_amount NUMERIC(10,2) DEFAULT 0.00`
   - `is_reconciled BOOLEAN DEFAULT FALSE`
   - `notes TEXT`
   - `created_at`, `updated_at`

3. **`vivas_financial_budgets`**:
   - Budget targets per category and fiscal period for variance analysis.

---

## 🔌 Backend REST APIs (`backend/server.js`)

### Endpoints to Add:
- **Transactions**:
  - `GET /api/financials/transactions`: Filtered list by type, category, crop, date range, status, payment method, and search.
  - `GET /api/financials/transactions/stats`: Top KPI aggregates (Income, Expenses, Net Flow, Pending).
  - `GET /api/financials/transactions/:id`: Retrieve single transaction.
  - `POST /api/financials/transactions`: Create transaction with auto-generated code and relational checks.
  - `PUT /api/financials/transactions/:id`: Update transaction details.
  - `DELETE /api/financials/transactions/:id`: Delete transaction.
  - `PUT /api/financials/transactions/:id/status`: Update status (*Completed, Pending, Void*).
- **Accounting Categories**:
  - `GET /api/financials/categories`: List categories with spend aggregates.
  - `GET /api/financials/categories/stats`: Category counts by type.
  - `POST /api/financials/categories`: Add custom accounting category.
  - `PUT /api/financials/categories/:id`: Edit category.
  - `DELETE /api/financials/categories/:id`: Delete category.
- **Financial Analytics & P&L**:
  - `GET /api/financials/analytics`: P&L summary, monthly trend breakdown, category allocation, and crop profitability matrix.

---

## 🎨 Proposed Changes

### [Component 1: Database Migration]
#### [NEW] [financials_migration.sql](file:///Volumes/Files/Antigravity%20demo/VivasAI/database/financials_migration.sql)
- Creates `vivas_accounting_categories`, `vivas_financial_transactions`, `vivas_financial_budgets`.
- Seeds 20+ standard agricultural accounting categories (Revenue, COGS, Operating Expenses, Capital).
- Seeds 15+ rich realistic transactions with cross-links to crops, orders, vendors, and timesheets.

---

### [Component 2: Backend REST APIs]
#### [MODIFY] [server.js](file:///Volumes/Files/Antigravity%20demo/VivasAI/backend/server.js)
- Implement `/api/financials/transactions`, `/api/financials/transactions/stats`, `/api/financials/categories`, and `/api/financials/analytics`.

---

### [Component 3: Frontend Interactive Screens]
#### [NEW] [Transactions.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/financials/Transactions.jsx)
- Top KPI summary cards, transaction data table, status tabs, search & filters, Record Income/Expense side drawers, CSV export.

#### [NEW] [AccountingCategories.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/financials/AccountingCategories.jsx)
- Chart of Accounts directory, Type filters, Group by options, Add/Edit Category drawer.

#### [NEW] [FinancialSummary.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/financials/FinancialSummary.jsx)
- P&L overview, monthly cash flow charts, category spend meters, Crop Profitability Matrix, Tax summary, and 1-Click Export.

#### [MODIFY] [App.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/App.jsx)
- Add Financials sidebar dropdown with `Transactions`, `Accounting Categories`, and `Financial Summary`.
- Wire routing and screen render switches.

#### [MODIFY] [index.css](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/index.css)
- Add any required styles and animations for financial badges, meters, and status pills.

---

## 🧪 Verification Plan

### Automated & Local Verification:
1. Run database migration on local PostgreSQL `vivas_ai`.
2. Test backend endpoints with `curl` for CRUD, filtering, and analytics responses.
3. Build frontend bundle with `npm run build` (confirm 0 errors).
4. Run `browser_subagent` on `http://localhost:5173` to test:
   - Financials sidebar navigation
   - Transactions filtering and adding new Income/Expense
   - Accounting Categories drawer and type filtering
   - Financial Summary P&L cards, category meters, and crop margins table

### Production Deployment & Live Verification:
1. Apply `financials_migration.sql` on remote PostgreSQL (`178.104.164.176`).
2. Sync code to `/var/www/vivasai/` via `rsync`.
3. Build frontend and restart PM2 on remote server.
4. Verify live at `https://vivasdemo.vikramafoods.com` with `browser_subagent`.
5. Update `walkthrough.md`.
