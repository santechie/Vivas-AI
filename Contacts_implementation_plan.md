# Contacts Module Implementation Plan — Vivas AI

## Overview
This plan establishes the complete **Contacts** module in Vivas AI inspired by `tend.com`, designed in harmony with Vivas AI's rich green glassmorphism aesthetics, responsive layouts, relational database architecture, comprehensive REST APIs, client/server validations, and live deployment to Hetzner (`https://vivasdemo.vikramafoods.com`).

---

## Sub-modules & Functional Scope

### 1. Customers (`/customers` / `frontend/src/contacts/Customers.jsx`)
- **Top KPI Cards**: Total Customers, Active Buyers, Total Customer Lifetime Value (₹), Outstanding Receivables Balance (₹).
- **Search & Advanced Filters**:
  - Full-text search (Customer Name, Company, Restaurant/Venue, Email, Phone, City).
  - Filter chips / dropdowns: **Sales Channel** (*Direct/Farm Stand*, *Wholesale*, *Online Store*, *Restaurants & Chefs*, *CSA*), **Customer Type** (*Retail*, *Wholesale*, *Restaurant/Venue*, *Distributor*, *CSA Member*, *Institutional*), **Tag Filter** (*VIP*, *Weekly Delivery*, *Net 30*, *Organic Only*, *Tax Exempt*), **Balance Status** (*All*, *Zero Balance*, *Has Outstanding Balance*), and **Status** (*Active*, *Inactive*).
- **Interactive Data Table**:
  - Checkbox selection for batch actions.
  - Customer Name with initial badge & Contact Role.
  - Company & Restaurant/Venue.
  - Email & Phone with quick communication actions (Call, Email, WhatsApp).
  - Assigned Sales Channel & Preferred Offer Sheets.
  - Total Orders Count & Lifetime Sales (₹).
  - Outstanding Balance (₹) with alert badges.
  - Status Toggle (`Active` / `Inactive`).
  - Row Actions: View Profile Modal, Edit Drawer, Create Order Shortcut, Record Payment Shortcut, Delete.
- **Add / Edit Customer Side Drawer** (Matching Tend.com's structure):
  - **Personal Information**: First Name (required), Last Name, Email, Phone with country code selector, Alternate Phone, Job Title / Role.
  - **Contact & Venue Information**: Company Name, Restaurant / Venue / Brand, Street Address, Apt/Unit/Suite, City, State/Province, Country, Postal Code, Lat/Long Coordinates with map location picker pin.
  - **Preferences & Commercial Terms**: Sales Channel, Price Tier / Discount %, Payment Terms (`Prepaid`, `Net 15`, `Net 30`, `Net 60`, `COD`), Tax ID / GSTIN, Tax Exempt flag, Credit Limit, Offer Sheets multi-select, Tags manager.
  - **Notes & Handling Instructions**.
- **Customer Profile / Detail Modal**:
  - Customer 360 overview card.
  - **Order History Tab**: Linked orders from `vivas_orders`.
  - **Financials / Ledger Tab**: Invoices & payments from `vivas_financial_transactions`.
  - **Activity & Communications Log**: Record calls, notes, and offer sheet dispatch records.
- **CSV Export & Import**: Export filtered customer list, download sample CSV template, import customer batches.

---

### 2. Vendors & Suppliers (`/vendors` / `frontend/src/contacts/Vendors.jsx`)
- **Enterprise Vendor Suite** (Beyond Tend's paywall limitation):
  - **Top KPI Cards**: Total Vendors, Active Suppliers, Total Annual Spend (₹), Accounts Payable (₹), Preferred Suppliers Count.
  - **Search & Filters**: Search vendor name, contact person, category, items supplied, tax ID; Filter by **Category** (*Seeds & Plants*, *Fertilizers & Soil Amendments*, *Equipment & Machinery*, *Packaging Materials*, *Irrigation & Hardware*, *Professional Services*, *Fuel & Utilities*, *Logistics*), **Payment Terms**, and **Status** (*Active*, *Preferred*, *Under Review*, *Inactive*).
  - **Data Table**: Vendor Code (`VND-001`), Company Name, Category badge, Contact Person, Phone & Email, Rating (1-5 stars), Total Purchased (₹), Outstanding Payables (₹), Status.
  - **Add / Edit Vendor Side Drawer**:
    - **Company & Category**: Vendor Name (required), Vendor Code, Category/Supply Type (required), Website, Quality Rating.
    - **Contact Person**: Name, Email, Phone, Alternate Phone.
    - **Address & Coordinates**: Street Address, City, State, Country, Postal Code, Lat/Long.
    - **Financial & Commercial Details**: Tax ID / GSTIN, Bank Name, Account Number, IFSC/SWIFT, Default Accounting Category (links to `vivas_accounting_categories`), Default Payment Terms, Lead Time (Days), Credit Limit.
    - **Supplied Items / Product Tags**.
    - **Notes & Contract Renewal Date**.
  - **Vendor Profile Modal**: Spend summary, linked expenses from `vivas_financial_transactions`, and inventory items supplied from `vivas_materials_inputs` & `vivas_equipment_tools`.
  - **CSV Export**.

---

### 3. Contact Directory & Communications (`/contact-directory` / `frontend/src/contacts/ContactDirectory.jsx`)
- Unified interactive address book combining Customers, Vendors, and Farm Crew.
- Quick filtering by role/type, fast dialing, email launching, and shared activity logging.

---

## Proposed Database Schema Changes

### [NEW] [database/contacts_migration.sql](file:///Volumes/Files/Antigravity demo/VivasAI/database/contacts_migration.sql)
1. **Extend `vivas_customers` table** (add `first_name`, `last_name`, `restaurant_venue`, `unit_suite`, `city`, `state`, `country`, `postal_code`, `gps_lat`, `gps_lng`, `offer_sheets`, `tags`, `credit_limit`, `discount_percentage`, `tax_id`, `lifetime_sales`, `current_balance`, `total_orders_count`).
2. **Create `vivas_vendors` table**:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `vendor_code` VARCHAR(50) UNIQUE NOT NULL
   - `name` VARCHAR(150) NOT NULL
   - `contact_person` VARCHAR(150)
   - `category` VARCHAR(100) NOT NULL
   - `supply_items` TEXT[]
   - `email` VARCHAR(150)
   - `phone` VARCHAR(50)
   - `alternate_phone` VARCHAR(50)
   - `website` VARCHAR(255)
   - `street_address` TEXT
   - `city` VARCHAR(100)
   - `state` VARCHAR(100)
   - `country` VARCHAR(100) DEFAULT 'India'
   - `postal_code` VARCHAR(30)
   - `gps_lat` NUMERIC(10, 7)
   - `gps_lng` NUMERIC(10, 7)
   - `tax_id` VARCHAR(50)
   - `bank_name` VARCHAR(100)
   - `bank_account_no` VARCHAR(100)
   - `bank_ifsc_swift` VARCHAR(50)
   - `default_accounting_category_id` UUID REFERENCES vivas_accounting_categories(id) ON DELETE SET NULL
   - `payment_terms` VARCHAR(50) DEFAULT 'Net 30'
   - `lead_time_days` INT DEFAULT 7
   - `rating` NUMERIC(3, 2) DEFAULT 5.0
   - `total_purchases_amount` NUMERIC(12, 2) DEFAULT 0.00
   - `outstanding_payable` NUMERIC(12, 2) DEFAULT 0.00
   - `notes` TEXT
   - `status` VARCHAR(20) DEFAULT 'active'
   - `created_at` TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
   - `updated_at` TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
3. **Create `vivas_contact_communications` table**:
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `contact_type` VARCHAR(20) NOT NULL -- 'Customer' or 'Vendor'
   - `contact_id` UUID NOT NULL
   - `contact_name` VARCHAR(150)
   - `communication_type` VARCHAR(50) DEFAULT 'Email'
   - `subject` VARCHAR(255)
   - `notes` TEXT
   - `logged_by` VARCHAR(100) DEFAULT 'Farm Manager'
   - `logged_at` TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
4. **Foreign Key Interlinking**:
   - Add `vendor_id` to `vivas_financial_transactions` and `vivas_inputs_inventory`.
   - Seed realistic customers, vendors, and communication records.

---

## Backend API Endpoints (`backend/server.js`)

### [MODIFY] [backend/server.js](file:///Volumes/Files/Antigravity demo/VivasAI/backend/server.js)
- **Customers**:
  - `GET /api/contacts/customers` (Search, channel, type, tag, balance status, pagination)
  - `GET /api/contacts/customers/stats` (Topline KPIs: total, active, lifetime sales, receivables)
  - `GET /api/contacts/customers/:id` (Customer details + linked orders & transactions)
  - `POST /api/contacts/customers` (Create customer with validation)
  - `PUT /api/contacts/customers/:id` (Update customer)
  - `DELETE /api/contacts/customers/:id` (Delete customer)
  - `GET /api/contacts/customers/export/csv` (Export CSV)
- **Vendors**:
  - `GET /api/contacts/vendors` (Search, category, terms, status, pagination)
  - `GET /api/contacts/vendors/stats` (Topline KPIs: total vendors, active count, spend, accounts payable, preferred)
  - `GET /api/contacts/vendors/:id` (Vendor details + linked expense transactions & inventory items)
  - `POST /api/contacts/vendors` (Create vendor with validation)
  - `PUT /api/contacts/vendors/:id` (Update vendor)
  - `DELETE /api/contacts/vendors/:id` (Delete vendor)
  - `GET /api/contacts/vendors/export/csv` (Export CSV)
- **Directory & Communications**:
  - `GET /api/contacts/directory` (Unified directory search across customers and vendors)
  - `GET /api/contacts/communications/:contactType/:contactId` (Get activity logs)
  - `POST /api/contacts/communications` (Log new communication)

---

## Frontend Components & Navigation

### [NEW] [frontend/src/contacts/Customers.jsx](file:///Volumes/Files/Antigravity demo/VivasAI/frontend/src/contacts/Customers.jsx)
- Top KPI counters, search & filter bar, Customers data table with badges, Add/Edit customer slide drawer, Customer profile 360 modal, CSV export/import.

### [NEW] [frontend/src/contacts/Vendors.jsx](file:///Volumes/Files/Antigravity demo/VivasAI/frontend/src/contacts/Vendors.jsx)
- Top KPI counters, search & category filters, Vendors data table, Add/Edit vendor slide drawer, Vendor profile modal with linked expense transactions & inventory items, CSV export.

### [NEW] [frontend/src/contacts/ContactDirectory.jsx](file:///Volumes/Files/Antigravity demo/VivasAI/frontend/src/contacts/ContactDirectory.jsx)
- Interactive unified address book and directory cards with communication logging.

### [MODIFY] [frontend/src/App.jsx](file:///Volumes/Files/Antigravity demo/VivasAI/frontend/src/App.jsx)
- Import `CustomersScreen`, `VendorsScreen`, and `ContactDirectoryScreen`.
- Add `contactsMenuOpen` state and sidebar dropdown with sub-items: `Customers`, `Vendors`, `Contact Directory`.
- Add screen router switches for `currentScreen === 'customers'`, `'vendors'`, `'contact-directory'`.

---

## Verification & Deployment Plan

### Automated & Local Verification
1. Execute `database/contacts_migration.sql` on local PostgreSQL `vivas_ai` and check counts.
2. Test backend endpoints with `curl` for both Customers and Vendors.
3. Run `npm run build` in `frontend/` to confirm 0 compilation errors.
4. Test interactive UI workflows locally using `browser_subagent` on `http://localhost:5173`.

### Remote Production Deployment
1. Copy migration to Hetzner (`178.104.164.176`) and run against production PostgreSQL `vivas_ai`.
2. Sync updated source code via `rsync`.
3. Run `npm run build` in `/var/www/vivasai/frontend` and restart PM2 (`pm2 restart all`).
4. Validate live production site on `https://vivasdemo.vikramafoods.com` using `browser_subagent`.
5. Update `walkthrough.md`.
