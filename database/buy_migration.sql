-- Migration script for Vivas AI Buy & Procurement Module (Smart Shopping List & Purchase Orders)

-- Drop old tables if partially created
DROP TABLE IF EXISTS vivas_purchase_order_items CASCADE;
DROP TABLE IF EXISTS vivas_purchase_orders CASCADE;
DROP TABLE IF EXISTS vivas_shopping_list CASCADE;

-- 1. Smart Shopping List Table
CREATE TABLE IF NOT EXISTS vivas_shopping_list (
  id SERIAL PRIMARY KEY,
  item_code VARCHAR(50) UNIQUE NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Seeds & Starts', -- 'Seeds & Starts', 'Fertilizers & Amendments', 'Plant Protection', 'Packaging & Crates', 'Tools & Hardware', 'Fuel & Utilities', 'General'
  quantity_needed NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
  unit_of_measure VARCHAR(50) DEFAULT 'kg', -- 'kg', 'grams', 'liters', 'packets', 'units', 'bags', 'rolls', 'boxes'
  estimated_unit_cost NUMERIC(12, 2) DEFAULT 0.00,
  total_estimated_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_needed * estimated_unit_cost) STORED,
  priority VARCHAR(50) DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
  vendor_id UUID REFERENCES vivas_vendors(id) ON DELETE SET NULL,
  vendor_name VARCHAR(255),
  source_type VARCHAR(100) DEFAULT 'Manual Requirement', -- 'Crop Plan Target', 'Min Stock Alert', 'Equipment Maintenance', 'Manual Requirement'
  source_reference VARCHAR(255),
  storage_location VARCHAR(255) DEFAULT 'Main Barn Storage',
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'In Cart', 'Converted to PO', 'Purchased', 'Dismissed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Purchase Orders Table
CREATE TABLE IF NOT EXISTS vivas_purchase_orders (
  id SERIAL PRIMARY KEY,
  po_code VARCHAR(50) UNIQUE NOT NULL,
  vendor_id UUID REFERENCES vivas_vendors(id) ON DELETE SET NULL,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_email VARCHAR(255),
  vendor_phone VARCHAR(50),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  received_date DATE,
  status VARCHAR(50) DEFAULT 'Ordered', -- 'Draft', 'Ordered', 'Partial Received', 'Received', 'Cancelled'
  payment_terms VARCHAR(100) DEFAULT 'Net 30',
  payment_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Paid', 'Partially Paid', 'Overdue'
  subtotal NUMERIC(12, 2) DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) DEFAULT 0.00,
  shipping_cost NUMERIC(12, 2) DEFAULT 0.00,
  total_amount NUMERIC(12, 2) DEFAULT 0.00,
  shipping_address TEXT DEFAULT 'Vivas Organic Farm, Field #4 Gate, Off Airport Road, Bengaluru, KA',
  notes TEXT,
  created_by VARCHAR(150) DEFAULT 'Procurement Manager',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Purchase Order Line Items Table
CREATE TABLE IF NOT EXISTS vivas_purchase_order_items (
  id SERIAL PRIMARY KEY,
  po_id INTEGER NOT NULL REFERENCES vivas_purchase_orders(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  quantity_ordered NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
  quantity_received NUMERIC(12, 2) DEFAULT 0.00,
  unit_of_measure VARCHAR(50) DEFAULT 'units',
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  linked_material_id UUID REFERENCES vivas_inputs_inventory(id) ON DELETE SET NULL,
  linked_shopping_item_id INTEGER REFERENCES vivas_shopping_list(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_shopping_list_status ON vivas_shopping_list(status);
CREATE INDEX IF NOT EXISTS idx_shopping_list_category ON vivas_shopping_list(category);
CREATE INDEX IF NOT EXISTS idx_shopping_list_priority ON vivas_shopping_list(priority);
CREATE INDEX IF NOT EXISTS idx_po_status ON vivas_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_vendor_id ON vivas_purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON vivas_purchase_order_items(po_id);

-- Initial Seed Data for Smart Shopping List
INSERT INTO vivas_shopping_list (item_code, item_name, category, quantity_needed, unit_of_measure, estimated_unit_cost, priority, vendor_id, vendor_name, source_type, source_reference, status, notes)
SELECT 'SHOP-001', 'Heirloom Brandywine Tomato Seeds', 'Seeds & Starts', 15.00, 'packets', 450.00, 'High', v.id, v.name, 'Crop Plan Target', '2026 Summer Crop Plan', 'Pending', 'Certified organic non-GMO seeds required for June sowing'
FROM vivas_vendors v LIMIT 1
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO vivas_shopping_list (item_code, item_name, category, quantity_needed, unit_of_measure, estimated_unit_cost, priority, vendor_id, vendor_name, source_type, source_reference, status, notes)
SELECT 'SHOP-002', 'Organic Compost & Humus Bio-Mix', 'Fertilizers & Amendments', 50.00, 'bags', 380.00, 'High', v.id, v.name, 'Min Stock Alert', 'Field Bed Prep Threshold', 'Pending', '50 kg bags for nursery bed conditioning'
FROM vivas_vendors v OFFSET 1 LIMIT 1
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO vivas_shopping_list (item_code, item_name, category, quantity_needed, unit_of_measure, estimated_unit_cost, priority, vendor_id, vendor_name, source_type, source_reference, status, notes)
SELECT 'SHOP-003', 'Neem Bio-Pesticide Concentrate (10,000 ppm)', 'Plant Protection', 20.00, 'liters', 650.00, 'Medium', v.id, v.name, 'Min Stock Alert', 'Insect Control Inventory', 'Pending', 'Cold-pressed neem oil formulation for pest control'
FROM vivas_vendors v LIMIT 1
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO vivas_shopping_list (item_code, item_name, category, quantity_needed, unit_of_measure, estimated_unit_cost, priority, vendor_id, vendor_name, source_type, source_reference, status, notes)
SELECT 'SHOP-004', 'Vented Clamshell Packaging Boxes (250g)', 'Packaging & Crates', 500.00, 'units', 12.50, 'Medium', v.id, v.name, 'Manual Requirement', 'Wholesale Supermarket Contract', 'Pending', 'Food-grade recycled PET boxes for microgreens'
FROM vivas_vendors v LIMIT 1
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO vivas_shopping_list (item_code, item_name, category, quantity_needed, unit_of_measure, estimated_unit_cost, priority, vendor_id, vendor_name, source_type, source_reference, status, notes)
SELECT 'SHOP-005', 'Drip Tape 16mm (1000m Reel)', 'Tools & Hardware', 2.00, 'reels', 4200.00, 'Low', v.id, v.name, 'Equipment Maintenance', 'Greenhouse 2 Irrigation Repair', 'Pending', 'UV-stabilized 1.0 LPH emitters'
FROM vivas_vendors v LIMIT 1
ON CONFLICT (item_code) DO NOTHING;

-- Initial Seed Data for Purchase Orders
INSERT INTO vivas_purchase_orders (po_code, vendor_id, vendor_name, vendor_email, vendor_phone, order_date, expected_delivery_date, status, payment_terms, payment_status, subtotal, tax_amount, shipping_cost, total_amount, notes)
SELECT 'PO-2026-001', v.id, v.name, v.email, v.phone, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '2 days', 'Ordered', 'Net 30', 'Pending', 25750.00, 1287.50, 500.00, 27537.50, 'Bulk seed order for Q3 planting cycle'
FROM vivas_vendors v LIMIT 1
ON CONFLICT (po_code) DO NOTHING;

INSERT INTO vivas_purchase_orders (po_code, vendor_id, vendor_name, vendor_email, vendor_phone, order_date, expected_delivery_date, received_date, status, payment_terms, payment_status, subtotal, tax_amount, shipping_cost, total_amount, notes)
SELECT 'PO-2026-002', v.id, v.name, v.email, v.phone, CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', 'Received', 'Net 15', 'Paid', 19000.00, 950.00, 350.00, 20300.00, 'Organic compost & vermicompost delivery'
FROM vivas_vendors v OFFSET 1 LIMIT 1
ON CONFLICT (po_code) DO NOTHING;

-- Seed PO Line Items
INSERT INTO vivas_purchase_order_items (po_id, item_name, category, quantity_ordered, quantity_received, unit_of_measure, unit_cost, notes)
SELECT po.id, 'Heirloom Tomato Seeds', 'Seeds & Starts', 15.00, 0.00, 'packets', 450.00, 'Organic certified'
FROM vivas_purchase_orders po WHERE po.po_code = 'PO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO vivas_purchase_order_items (po_id, item_name, category, quantity_ordered, quantity_received, unit_of_measure, unit_cost, notes)
SELECT po.id, 'Microgreen Pea Shoot Seeds (25kg Bag)', 'Seeds & Starts', 5.00, 0.00, 'bags', 3800.00, 'High germination batch'
FROM vivas_purchase_orders po WHERE po.po_code = 'PO-2026-001'
ON CONFLICT DO NOTHING;

INSERT INTO vivas_purchase_order_items (po_id, item_name, category, quantity_ordered, quantity_received, unit_of_measure, unit_cost, notes)
SELECT po.id, 'Organic Compost & Bio-Humus', 'Fertilizers & Amendments', 50.00, 50.00, 'bags', 380.00, 'Fully delivered and verified in barn storage'
FROM vivas_purchase_orders po WHERE po.po_code = 'PO-2026-002'
ON CONFLICT DO NOTHING;
