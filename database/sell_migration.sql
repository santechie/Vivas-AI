-- ============================================================
-- VIVAS AI - SELL MODULE DATABASE MIGRATION
-- Tables: vivas_sales_channels, vivas_customers, vivas_orders, vivas_order_items, vivas_pack_batches
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SALES CHANNELS TABLE
CREATE TABLE IF NOT EXISTS vivas_sales_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL, -- 'Wholesale', 'Online Store', 'CSA / Subscription', 'Restaurant / Chef', 'Farmers Market', 'Farm Stand', 'Direct to Consumer'
    description TEXT,
    pricing_tier VARCHAR(50) DEFAULT 'Wholesale Standard', -- 'Wholesale Standard', 'Retail Full Price', 'Chef Preferred', 'CSA Member'
    delivery_days JSONB DEFAULT '["Tuesday", "Friday"]'::jsonb,
    order_cutoff_hours INT DEFAULT 24,
    payment_terms VARCHAR(50) DEFAULT 'Net 30', -- 'Prepaid', 'COD', 'Due on Receipt', 'Net 15', 'Net 30'
    min_order_amount NUMERIC(10,2) DEFAULT 0.00,
    tax_rate_pct NUMERIC(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    color_hex VARCHAR(20) DEFAULT '#0284c7',
    icon_name VARCHAR(30) DEFAULT 'Store',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS vivas_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150),
    customer_type VARCHAR(50) DEFAULT 'Wholesale', -- 'Wholesale', 'Restaurant', 'Retail', 'CSA Member'
    email VARCHAR(150),
    phone VARCHAR(50),
    billing_address TEXT,
    shipping_address TEXT,
    default_channel_id UUID REFERENCES vivas_sales_channels(id) ON DELETE SET NULL,
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    tax_exempt BOOLEAN DEFAULT FALSE,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ORDERS TABLE (Ensure all fields exist)
CREATE TABLE IF NOT EXISTS vivas_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) DEFAULT 'submitted',
    amount NUMERIC(12,2) DEFAULT 0.00,
    order_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES vivas_customers(id) ON DELETE SET NULL;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS customer_company VARCHAR(150);
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(150);
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS sales_channel_id UUID REFERENCES vivas_sales_channels(id) ON DELETE SET NULL;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS sales_channel_name VARCHAR(100);
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS delivery_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(50) DEFAULT 'Delivery';
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(30) DEFAULT 'submitted';
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'unpaid';
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Invoice / Net 30';
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS packing_notes TEXT;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS invoice_notes TEXT;
ALTER TABLE vivas_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 4. ORDER ITEMS (LINE ITEMS) TABLE
CREATE TABLE IF NOT EXISTS vivas_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES vivas_orders(id) ON DELETE CASCADE,
    crop_id UUID,
    crop_name VARCHAR(100) NOT NULL,
    variety_name VARCHAR(100),
    item_description VARCHAR(200),
    packaging_unit VARCHAR(50) DEFAULT 'kg',
    unit_price NUMERIC(10,2) NOT NULL,
    quantity_ordered NUMERIC(8,2) NOT NULL,
    quantity_packed NUMERIC(8,2) DEFAULT 0.00,
    total_price NUMERIC(10,2) NOT NULL,
    is_packed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PACK BATCHES / SCHEDULE TABLE
CREATE TABLE IF NOT EXISTS vivas_pack_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_date DATE NOT NULL,
    sales_channel_id UUID REFERENCES vivas_sales_channels(id) ON DELETE SET NULL,
    sales_channel_name VARCHAR(100),
    crop_name VARCHAR(100) NOT NULL,
    total_ordered_qty NUMERIC(8,2) DEFAULT 0.00,
    total_packed_qty NUMERIC(8,2) DEFAULT 0.00,
    unit VARCHAR(30) DEFAULT 'kg',
    container_type VARCHAR(50) DEFAULT 'Orange Heavy Crate',
    container_count INT DEFAULT 1,
    assignee VARCHAR(100) DEFAULT 'Packhouse Team',
    status VARCHAR(30) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA FOR SELL MODULE
-- ============================================================

-- Seed Channels
INSERT INTO vivas_sales_channels (id, name, channel_type, description, pricing_tier, delivery_days, order_cutoff_hours, payment_terms, min_order_amount, tax_rate_pct, color_hex, icon_name)
VALUES
('a1111111-1111-1111-1111-111111111111', 'Restaurant & Chef Direct', 'Restaurant / Chef', 'Fine dining restaurant deliveries twice weekly with custom packing specs', 'Chef Preferred', '["Tuesday", "Friday"]'::jsonb, 36, 'Net 15', 1500.00, 5.00, '#0284c7', 'Utensils'),
('a2222222-2222-2222-2222-222222222222', 'Wholesale Market Route', 'Wholesale', 'Bulk distributor and supermarket crates for organic retail grocers', 'Wholesale Standard', '["Monday", "Thursday"]'::jsonb, 48, 'Net 30', 5000.00, 5.00, '#059669', 'Truck'),
('a3333333-3333-3333-3333-333333333333', 'Farm Stand & On-Farm Pickup', 'Farm Stand', 'Direct retail sales at the farm packhouse stand on weekends', 'Retail Full Price', '["Saturday", "Sunday"]'::jsonb, 12, 'Due on Receipt', 0.00, 0.00, '#d97706', 'Store'),
('a4444444-4444-4444-4444-444444444444', 'Weekly CSA Farm Share', 'CSA / Subscription', 'Curated weekly vegetable boxes delivered to neighbourhood hubs', 'CSA Member', '["Wednesday"]'::jsonb, 48, 'Prepaid', 0.00, 0.00, '#7c3aed', 'Package'),
('a5555555-5555-5555-5555-555555555555', 'Online Farm Store (D2C)', 'Online Store', 'E-commerce web store with home delivery across the metropolitan area', 'Retail Full Price', '["Wednesday", "Saturday"]'::jsonb, 24, 'Prepaid', 500.00, 5.00, '#e11d48', 'ShoppingCart')
ON CONFLICT (id) DO NOTHING;

-- Seed Customers
INSERT INTO vivas_customers (id, name, company_name, customer_type, email, phone, billing_address, shipping_address, default_channel_id, payment_terms)
VALUES
('b1111111-1111-1111-1111-111111111111', 'Chef Anand S.', 'The Greenhouse Bistro', 'Restaurant', 'orders@greenhousebistro.com', '+91 98450 12345', '124 Indiranagar 100ft Rd, Bangalore', '124 Indiranagar 100ft Rd, Bangalore', 'a1111111-1111-1111-1111-111111111111', 'Net 15'),
('b2222222-2222-2222-2222-222222222222', 'Priya Raman', 'Organic Harvest Co-op', 'Wholesale', 'purchasing@organicharvest.in', '+91 98801 67890', 'Plot 45, APMC Yard, Yeshwantpur, Bangalore', 'Plot 45, APMC Yard, Yeshwantpur, Bangalore', 'a2222222-2222-2222-2222-222222222222', 'Net 30'),
('b3333333-3333-3333-3333-333333333333', 'Chef Marco Bellini', 'Trattoria Bella Vista', 'Restaurant', 'marco@bellavistadining.com', '+91 97400 33221', '88 Lavelle Road, Bangalore', '88 Lavelle Road, Bangalore', 'a1111111-1111-1111-1111-111111111111', 'Net 15'),
('b4444444-4444-4444-4444-444444444444', 'Vikramaditya Foods Hub', 'Vikrama Retailers Pvt Ltd', 'Wholesale', 'supply@vikramafoods.com', '+91 99000 88776', '21 MG Road Commercial Hub, Bangalore', '21 MG Road Commercial Hub, Bangalore', 'a2222222-2222-2222-2222-222222222222', 'Net 30'),
('b5555555-5555-5555-5555-555555555555', 'Sunita Rao', 'Koramangala CSA Hub', 'CSA Member', 'sunita.rao@csa-members.org', '+91 98455 44332', '34 4th Block, Koramangala, Bangalore', '34 4th Block, Koramangala, Bangalore', 'a4444444-4444-4444-4444-444444444444', 'Prepaid'),
('b6666666-6666-6666-6666-666666666666', 'Kiran Mehta', 'Individual D2C Buyer', 'Retail', 'kiran.mehta@gmail.com', '+91 99887 11223', 'Flat 402, Palm Meadows, Whitefield, Bangalore', 'Flat 402, Palm Meadows, Whitefield, Bangalore', 'a5555555-5555-5555-5555-555555555555', 'Prepaid')
ON CONFLICT (id) DO NOTHING;

-- Clean existing seeded test orders if needed
DELETE FROM vivas_order_items WHERE order_id IN ('c1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'c5555555-5555-5555-5555-555555555555');
DELETE FROM vivas_orders WHERE id IN ('c1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'c5555555-5555-5555-5555-555555555555');

-- Seed Orders
INSERT INTO vivas_orders (id, order_no, order_number, customer_id, customer_name, customer_company, customer_email, customer_phone, sales_channel_id, sales_channel_name, order_date, delivery_date, fulfillment_type, fulfillment_status, payment_status, payment_method, subtotal, delivery_fee, tax_amount, discount_amount, total_amount, amount, packing_notes)
VALUES
('c1111111-1111-1111-1111-111111111111', 'ORD-2026-081', 'ORD-2026-081', 'b1111111-1111-1111-1111-111111111111', 'Chef Anand S.', 'The Greenhouse Bistro', 'orders@greenhousebistro.com', '+91 98450 12345', 'a1111111-1111-1111-1111-111111111111', 'Restaurant & Chef Direct', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, 'Delivery', 'in_packing', 'unpaid', 'Invoice / Net 15', 3850.00, 150.00, 192.50, 0.00, 4192.50, 4192.50, 'Pack in Green vented totes. Handle Heirloom tomatoes with extra care.'),
('c2222222-2222-2222-2222-222222222222', 'ORD-2026-082', 'ORD-2026-082', 'b2222222-2222-2222-2222-222222222222', 'Priya Raman', 'Organic Harvest Co-op', 'purchasing@organicharvest.in', '+91 98801 67890', 'a2222222-2222-2222-2222-222222222222', 'Wholesale Market Route', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE, 'Delivery', 'submitted', 'net_terms', 'Net 30 Terms', 12400.00, 350.00, 620.00, 200.00, 13170.00, 13170.00, 'Palletize in standard orange crates. Include QC batch tags.'),
('c3333333-3333-3333-3333-333333333333', 'ORD-2026-083', 'ORD-2026-083', 'b3333333-3333-3333-3333-333333333333', 'Chef Marco Bellini', 'Trattoria Bella Vista', 'marco@bellavistadining.com', '+91 97400 33221', 'a1111111-1111-1111-1111-111111111111', 'Restaurant & Chef Direct', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 'Delivery', 'submitted', 'unpaid', 'Invoice / Net 15', 4900.00, 150.00, 245.00, 0.00, 5295.00, 5295.00, 'Basil bunches must be dry and kept at 12°C. No chilled storage.'),
('c4444444-4444-4444-4444-444444444444', 'ORD-2026-084', 'ORD-2026-084', 'b4444444-4444-4444-4444-444444444444', 'Vikramaditya Foods Hub', 'Vikrama Retailers Pvt Ltd', 'supply@vikramafoods.com', '+91 99000 88776', 'a2222222-2222-2222-2222-222222222222', 'Wholesale Market Route', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '1 day', 'Delivery', 'fulfilled', 'paid', 'Bank Transfer (NEFT)', 18500.00, 400.00, 925.00, 500.00, 19325.00, 19325.00, 'Delivered to Loading Dock 3 with signed receipt.'),
('c5555555-5555-5555-5555-555555555555', 'ORD-2026-085', 'ORD-2026-085', 'b5555555-5555-5555-5555-555555555555', 'Sunita Rao', 'Koramangala CSA Hub', 'sunita.rao@csa-members.org', '+91 98455 44332', 'a4444444-4444-4444-4444-444444444444', 'Weekly CSA Farm Share', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 'Delivery', 'packed', 'paid', 'Prepaid Subscription', 6200.00, 0.00, 0.00, 0.00, 6200.00, 6200.00, '12 Standard CSA Family Boxes packed with weekly recipe sheet.');

-- Seed Order Items
INSERT INTO vivas_order_items (id, order_id, crop_name, variety_name, item_description, packaging_unit, unit_price, quantity_ordered, quantity_packed, total_price, is_packed)
VALUES
-- Order 1 Items (Greenhouse Bistro)
('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Tomatoes', 'San Marzano', 'San Marzano Heirloom Sauce Tomatoes', 'kg', 75.00, 20.0, 20.0, 1500.00, TRUE),
('d1111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'Basil', 'Genovese', 'Fresh Sweet Italian Genovese Basil', 'Bunch', 35.00, 30.0, 30.0, 1050.00, TRUE),
('d1111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'Spinach', 'Bloomsdale', 'Baby Leaf Washed & Spun Spinach', 'kg', 65.00, 20.0, 0.0, 1300.00, FALSE),

-- Order 2 Items (Organic Harvest Wholesale)
('d2222222-2222-2222-2222-222222222221', 'c2222222-2222-2222-2222-222222222222', 'Cucumbers', 'Marketmore 76', 'Crisp Slicing Field Cucumbers', 'kg', 40.00, 100.0, 0.0, 4000.00, FALSE),
('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Carrots', 'Nantes Half Long', 'Sweet Orange Bunched Nantes Carrots', 'kg', 50.00, 100.0, 0.0, 5000.00, FALSE),
('d2222222-2222-2222-2222-222222222223', 'c2222222-2222-2222-2222-222222222222', 'Lettuce', 'Buttercrunch', 'Butterhead Crisp Lettuce Heads', 'Head', 34.00, 100.0, 0.0, 3400.00, FALSE),

-- Order 3 Items (Bella Vista)
('d3333333-3333-3333-3333-333333333331', 'c3333333-3333-3333-3333-333333333333', 'Tomatoes', 'Cherokee Purple', 'Specialty Heirloom Purple Tomatoes', 'kg', 90.00, 30.0, 0.0, 2700.00, FALSE),
('d3333333-3333-3333-3333-333333333332', 'c3333333-3333-3333-3333-333333333333', 'Basil', 'Genovese', 'Hydro-Cooled Genovese Basil', 'Bunch', 35.00, 40.0, 0.0, 1400.00, FALSE),
('d3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Peppers', 'California Wonder', 'Bell Peppers Green & Ripening', 'kg', 80.00, 10.0, 0.0, 800.00, FALSE),

-- Order 5 Items (CSA Share)
('d5555555-5555-5555-5555-555555555551', 'c5555555-5555-5555-5555-555555555555', 'Assorted Vegetable Box', 'Standard CSA', 'Weekly 6-item Seasonal Harvest Box', 'Box', 516.66, 12.0, 12.0, 6200.00, TRUE);

-- Seed Pack Batches
INSERT INTO vivas_pack_batches (id, pack_date, sales_channel_id, sales_channel_name, crop_name, total_ordered_qty, total_packed_qty, unit, container_type, container_count, assignee, status)
VALUES
('e1111111-1111-1111-1111-111111111111', CURRENT_DATE, 'a1111111-1111-1111-1111-111111111111', 'Restaurant & Chef Direct', 'Tomatoes (San Marzano)', 20.0, 20.0, 'kg', 'Green Harvest Tote', 2, 'Ramesh Kumar', 'packed'),
('e2222222-2222-2222-2222-222222222222', CURRENT_DATE, 'a1111111-1111-1111-1111-111111111111', 'Restaurant & Chef Direct', 'Basil (Genovese)', 30.0, 30.0, 'Bunch', 'Waxed Produce Box', 2, 'Ramesh Kumar', 'packed'),
('e3333333-3333-3333-3333-333333333333', CURRENT_DATE, 'a1111111-1111-1111-1111-111111111111', 'Restaurant & Chef Direct', 'Spinach (Bloomsdale)', 20.0, 0.0, 'kg', 'Orange Heavy Crate', 2, 'Suresh Patel', 'in_progress'),
('e4444444-4444-4444-4444-444444444444', CURRENT_DATE, 'a2222222-2222-2222-2222-222222222222', 'Wholesale Market Route', 'Cucumbers (Marketmore)', 100.0, 0.0, 'kg', 'Orange Heavy Crate', 5, 'Packhouse Team', 'pending')
ON CONFLICT (id) DO NOTHING;
