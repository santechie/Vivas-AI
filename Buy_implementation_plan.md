# Implementation Plan - Buy & Procurement Module (Smart Shopping List & Purchase Orders)

Build the complete **Buy & Procurement** module in Vivas AI based on Tend.com's purchasing system, providing **Smart Shopping List** auto-aggregation and **Purchase Orders (POs)** management with full CRUD operations, 360 detail popups with edit mode, vendor interlinking, and financial expense auto-integration.

## User Review Required

> [!IMPORTANT]
> - **Theme Consistency**: The new Buy module will strictly adhere to Vivas AI's clean **white / light theme** (`#ffffff` cards, `#f8fafc` canvas, `#0f172a` typography, `#e2e8f0` borders, `#16a34a` green / `#0284c7` blue brand accents).
> - **360 Detail Popup Modals**: Clicking any row or item in the Shopping List or POs table will open a full-featured 360 Detail Modal with complete item/order info, line items, vendor details, edit toggle, and a **Save Changes** button.
> - **Financial Data Flow Integration**: Receiving or marking a Purchase Order as `Fulfilled / Received` will automatically log an operating expense transaction in `vivas_financial_transactions` and update inventory stock in `vivas_materials_inputs`.

---

## Proposed Changes

### Database & Backend

#### [NEW] [buy_migration.sql](file:///Volumes/Files/Antigravity%20demo/VivasAI/database/buy_migration.sql)
- SQL migration creating tables:
  1. `vivas_shopping_list`: Item name, category, quantity needed, unit of measure, estimated unit cost, priority, vendor_id, source_type (Crop Plan, Min Inventory Threshold, Manual), status (`Pending`, `In Cart`, `Converted to PO`, `Purchased`).
  2. `vivas_purchase_orders`: PO code (e.g. `PO-2026-001`), vendor_id, vendor_name, order_date, expected_delivery_date, status (`Draft`, `Ordered`, `Partial Received`, `Received`, `Cancelled`), payment_terms, shipping_cost, tax_amount, total_amount, notes.
  3. `vivas_purchase_order_items`: PO line items linked to `vivas_purchase_orders(id)` with item_name, quantity_ordered, quantity_received, unit_cost, total_price, linked_material_id.
- Initial seed data for shopping list items and sample purchase orders.

#### [MODIFY] [server.js](file:///Volumes/Files/Antigravity%20demo/VivasAI/backend/server.js)
- Execute `buy_migration.sql` during database initialization.
- Implement CRUD endpoints for Shopping List (`GET`, `POST`, `PUT`, `DELETE /api/buy/shopping-list`).
- Implement endpoint `POST /api/buy/shopping-list/convert-to-po` to convert selected shopping list items into a structured Purchase Order.
- Implement CRUD endpoints for Purchase Orders (`GET`, `POST`, `PUT`, `DELETE /api/buy/purchase-orders` & `:id`).
- Implement `PUT /api/buy/purchase-orders/:id/receive` to mark PO as received and auto-create an expense entry in `vivas_financial_transactions`.

---

### Frontend

#### [NEW] [SmartShoppingList.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/buy/SmartShoppingList.jsx)
- **KPI Metrics**: Total Needed Items, Total Estimated Cost (₹), High Priority Alert items, Seed & Fertilizer Items.
- **Filter Toolbar**: Search, Category Filter (Seeds, Amendments, Packaging, Tools, Hardware, Fuel), Priority Filter (Low, Medium, High), Status Filter (Pending, In Cart, Purchased).
- **Data Table**: Item Name & Code, Category, Needed Qty & Unit, Estimated Unit Cost, Total Cost (₹), Vendor Link, Priority Badge, Status, Action Icons (Eye 360 View, Pencil Edit, Trash Delete).
- **360 Item Popup Modal**: Complete item attributes, category selector, vendor dropdown, quantity adjustments, edit toggle, and **Save Changes** button.
- **Add / Edit Item Drawer**: Slide-over panel to manually add or edit a shopping list item.

#### [NEW] [PurchaseOrders.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/buy/PurchaseOrders.jsx)
- **KPI Metrics**: Total POs, Pending Delivery, Total PO Spend (₹), Fulfilled POs.
- **Filter Toolbar**: Search PO #, Vendor Filter, Status Filter (Draft, Ordered, Received, Cancelled).
- **Data Table**: PO Code, Vendor Name, Order Date, Expected Delivery Date, Line Items Count, Total Amount (₹), Status Badge, Action Icons (Eye 360 View, Edit, Receive Items, Delete).
- **PO 360 Popup Modal**: Itemized invoice view, vendor contact details, receiving log status, edit mode toggle, line items table, and **Save Changes** / **Print PO** buttons.
- **Create / Edit PO Drawer**: Multi-item order builder linked with vendor selection and material inventory items.

#### [NEW] [BuyDashboard.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/buy/BuyDashboard.jsx)
- Unified Buy & Procurement Portal wrapping **Smart Shopping List** and **Purchase Orders** tabs in standard white theme styling.

#### [MODIFY] [App.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/App.jsx)
- Import `BuyDashboard` from `./buy/BuyDashboard`.
- Handle `#buy`, `#smart-shopping-list`, `#purchase-orders` routes in `currentScreen`.
- Add `Buy & Procurement` menu button to top navigation bar with `ShoppingBag` icon.

---

## Verification Plan

### Automated Tests
- Run `npm run build` in `frontend/` to confirm zero compilation errors.

### Manual Verification
- Execute `buy_migration.sql` against local and remote PostgreSQL databases.
- Deploy updated backend APIs and frontend assets to Hetzner live server (`vivasdemo.vikramafoods.com`).
- Use `browser_subagent` to test navigation to `#buy` on `https://vivasdemo.vikramafoods.com`, verify Smart Shopping List CRUD, PO 360 detail popups with edit/save mode, and receiving auto-expense logs.
