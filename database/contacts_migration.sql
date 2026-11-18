-- VivasAI Contacts Module Database Migration
-- Tables: vivas_customers (extended), vivas_vendors, vivas_contact_communications

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. EXTEND VIVAS_CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS vivas_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    company_name VARCHAR(150),
    customer_type VARCHAR(50) DEFAULT 'Wholesale',
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

ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS restaurant_venue VARCHAR(150);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(50);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS contact_role VARCHAR(100) DEFAULT 'Buyer / Owner';
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS unit_suite VARCHAR(100);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(30);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS gps_lat NUMERIC(10, 7);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS gps_lng NUMERIC(10, 7);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS default_channel_name VARCHAR(100);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS offer_sheets TEXT[] DEFAULT ARRAY['Weekly Harvest Wholesale Sheet'];
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY['Active Buyer'];
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) DEFAULT 50000.00;
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0.00;
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS total_orders_count INT DEFAULT 0;
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS lifetime_sales NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE vivas_customers ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12, 2) DEFAULT 0.00;

-- 2. CREATE VENDORS / SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS vivas_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(150),
    contact_role VARCHAR(100) DEFAULT 'Sales Representative',
    category VARCHAR(100) NOT NULL, -- 'Seeds & Plants', 'Fertilizers & Amendments', 'Equipment & Tools', 'Packaging Materials', 'Irrigation & Hardware', 'Professional Services', 'Fuel & Utilities', 'Logistics'
    supply_items TEXT[] DEFAULT ARRAY[]::TEXT[],
    email VARCHAR(150),
    phone VARCHAR(50),
    alternate_phone VARCHAR(50),
    website VARCHAR(255),
    street_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(30),
    gps_lat NUMERIC(10, 7),
    gps_lng NUMERIC(10, 7),
    tax_id VARCHAR(50), -- GSTIN / Tax ID
    bank_name VARCHAR(100),
    bank_account_no VARCHAR(100),
    bank_ifsc_swift VARCHAR(50),
    default_accounting_category_id UUID REFERENCES vivas_accounting_categories(id) ON DELETE SET NULL,
    payment_terms VARCHAR(50) DEFAULT 'Net 30', -- 'Advance', 'COD', 'Net 15', 'Net 30', 'Net 60'
    lead_time_days INT DEFAULT 5,
    rating NUMERIC(3, 2) DEFAULT 4.8,
    total_purchases_amount NUMERIC(12, 2) DEFAULT 0.00,
    outstanding_payable NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'preferred', 'under_review', 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CREATE CONTACT COMMUNICATIONS / ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS vivas_contact_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_type VARCHAR(20) NOT NULL, -- 'Customer' or 'Vendor'
    contact_id UUID NOT NULL,
    contact_name VARCHAR(150) NOT NULL,
    communication_type VARCHAR(50) DEFAULT 'Email', -- 'Email', 'Phone Call', 'Meeting', 'WhatsApp / SMS', 'Offer Sheet Sent', 'Order Confirmation'
    subject VARCHAR(255) NOT NULL,
    notes TEXT,
    logged_by VARCHAR(100) DEFAULT 'Farm Manager',
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. INTERLINK FOREIGN KEYS TO FINANCIALS & ASSETS
ALTER TABLE vivas_financial_transactions ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vivas_vendors(id) ON DELETE SET NULL;
ALTER TABLE vivas_inputs_inventory ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vivas_vendors(id) ON DELETE SET NULL;

-- 5. SEED / UPDATE COMPREHENSIVE CUSTOMERS
INSERT INTO vivas_customers (
    id, name, first_name, last_name, company_name, restaurant_venue, customer_type, contact_role,
    email, phone, alternate_phone, street_address, unit_suite, city, state, country, postal_code,
    gps_lat, gps_lng, default_channel_name, payment_terms, tax_id, tax_exempt, credit_limit, discount_percentage,
    total_orders_count, lifetime_sales, current_balance, offer_sheets, tags, notes, status
) VALUES
(
    'c1111111-1111-1111-1111-111111111101', 'Vikramaditya Sengupta', 'Vikramaditya', 'Sengupta', 'Green Grocers Hub', 'Green Grocers Supermarket',
    'Wholesale', 'Procurement Head', 'vikram@greengrocershub.in', '+91 98450 12345', '+91 80 2345 6789',
    'Plot 42, Wholesale Agri Market Complex, Sector 4', 'Bldg B, Unit 12', 'Bengaluru', 'Karnataka', 'India', '560022',
    12.9716000, 77.5946000, 'Wholesale & Retail Markets', 'Net 30', '29AABCU9603R1ZM', FALSE, 200000.00, 10.00,
    18, 285400.00, 24500.00, ARRAY['Weekly Harvest Wholesale Sheet', 'Bulk Commodity Direct'], ARRAY['VIP Buyer', 'Top Volume', 'Bi-Weekly Delivery'],
    'Key retail partner. Demands high quality grading for Roma Tomatoes and English Cucumbers. Fast settlement via RTGS.', 'active'
),
(
    'c1111111-1111-1111-1111-111111111102', 'Chef Pierre Martin', 'Pierre', 'Martin', 'Le Gourmet Hospitality Ltd', 'Le Gourmet Bistro & Kitchen',
    'Restaurant / Venue', 'Executive Chef & Partner', 'chef.pierre@legourmetbistro.com', '+91 98860 98765', '+91 98860 98766',
    '74 Lavelle Road, Richmond Town', 'Ground Floor Kitchen', 'Bengaluru', 'Karnataka', 'India', '560001',
    12.9698000, 77.6012000, 'Restaurants & Chefs Direct', 'Net 15', '29AALCL8821Q1ZN', FALSE, 75000.00, 5.00,
    14, 114800.00, 0.00, ARRAY['Chef Direct Express Sheet', 'Microgreens & Petite Greens Spec'], ARRAY['Farm-to-Table', 'High Margin', 'Microgreens Only'],
    'Michelin-trained executive chef. Orders Sunflower microgreens, Genovese basil, and heirloom cherry tomatoes weekly on Mondays and Thursdays.', 'active'
),
(
    'c1111111-1111-1111-1111-111111111103', 'Ananya Deshmukh', 'Ananya', 'Deshmukh', 'FreshBasket Supermarket Chain', 'FreshBasket Indiranagar Flagship',
    'Wholesale', 'Category Manager (Perishables)', 'ananya.d@freshbasket.in', '+91 97400 45678', '+91 97400 45679',
    '100 Feet Road, HAL 2nd Stage, Indiranagar', 'Store #104', 'Bengaluru', 'Karnataka', 'India', '560038',
    12.9784000, 77.6408000, 'Wholesale & Retail Markets', 'Net 30', '29AAACF4412K1ZT', FALSE, 150000.00, 8.00,
    9, 142300.00, 0.00, ARRAY['Weekly Harvest Wholesale Sheet'], ARRAY['Supermarket Chain', 'Barcoded Crates'],
    'Requires barcoded crates and automated invoices with delivery timestamps.', 'active'
),
(
    'c1111111-1111-1111-1111-111111111104', 'Sunil Ramanathan', 'Sunil', 'Ramanathan', 'Vivas Community CSA Club', 'Indiranagar & Koramangala Hubs',
    'CSA Member', 'Community Coordinator', 'csa.members@vivasfarm.org', '+91 99001 22334', NULL,
    'Vivas Farm Gate, Sarjapur Road', 'CSA Pickup Pavilion', 'Bengaluru', 'Karnataka', 'India', '562125',
    12.8601000, 77.7865000, 'Farm Stand & Subscriptions', 'Prepaid', 'UNREGISTERED', TRUE, 0.00, 0.00,
    32, 98500.00, 0.00, ARRAY['CSA Weekly Share Sheet', 'Farm Stand Pre-Order'], ARRAY['CSA Subscribers', 'Zero Waste', 'Weekly Box'],
    'Represents 25 local neighborhood households enrolled in weekly organic harvest share boxes.', 'active'
),
(
    'c1111111-1111-1111-1111-111111111105', 'Rajesh Kulkarni', 'Rajesh', 'Kulkarni', 'Nature Basket Organic Store', 'Nature Basket Koramangala',
    'Retail', 'Store Manager', 'rajesh@naturebasket.co.in', '+91 98452 77889', NULL,
    '5th Block, Koramangala', 'Shop 18', 'Bengaluru', 'Karnataka', 'India', '560095',
    12.9352000, 77.6245000, 'Wholesale & Retail Markets', 'Net 15', '29AABCN9901M1ZQ', FALSE, 50000.00, 5.00,
    7, 62400.00, 8900.00, ARRAY['Weekly Harvest Wholesale Sheet'], ARRAY['Organic Certified Only', 'Direct Delivery'],
    'Specializes in premium certified pesticide-free vegetables.', 'active'
),
(
    'c1111111-1111-1111-1111-111111111106', 'Kavitha Sundaram', 'Kavitha', 'Sundaram', 'Sundaram Health Foods', 'Sundaram Store Jayanagar',
    'Retail', 'Proprietor', 'kavitha@sundaramfoods.in', '+91 94480 33445', NULL,
    '9th Main, 4th Block, Jayanagar', 'Corner Shop', 'Bengaluru', 'Karnataka', 'India', '560011',
    12.9250000, 77.5938000, 'Farm Stand & Subscriptions', 'Cash on Delivery', '29AAAFS1122D1ZR', FALSE, 25000.00, 0.00,
    4, 28900.00, 0.00, ARRAY['Farm Stand Pre-Order'], ARRAY['Cash Settlement', 'Local Delivery'],
    'Prefers COD settlements upon morning delivery.', 'active'
)
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    restaurant_venue = EXCLUDED.restaurant_venue,
    contact_role = EXCLUDED.contact_role,
    street_address = EXCLUDED.street_address,
    unit_suite = EXCLUDED.unit_suite,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    gps_lat = EXCLUDED.gps_lat,
    gps_lng = EXCLUDED.gps_lng,
    default_channel_name = EXCLUDED.default_channel_name,
    offer_sheets = EXCLUDED.offer_sheets,
    tags = EXCLUDED.tags,
    credit_limit = EXCLUDED.credit_limit,
    discount_percentage = EXCLUDED.discount_percentage,
    total_orders_count = EXCLUDED.total_orders_count,
    lifetime_sales = EXCLUDED.lifetime_sales,
    current_balance = EXCLUDED.current_balance,
    notes = EXCLUDED.notes;

-- 6. SEED VENDORS / SUPPLIERS
INSERT INTO vivas_vendors (
    id, vendor_code, name, contact_person, contact_role, category, supply_items,
    email, phone, alternate_phone, website, street_address, city, state, country, postal_code,
    gps_lat, gps_lng, tax_id, bank_name, bank_account_no, bank_ifsc_swift, payment_terms,
    lead_time_days, rating, total_purchases_amount, outstanding_payable, notes, status
) VALUES
(
    'd1111111-1111-1111-1111-111111111101', 'VND-SEED-01', 'GreenAgro Seed Suppliers Ltd', 'Ramesh Chandra', 'Senior Agronomist & Territory Lead',
    'Seeds & Plants', ARRAY['Roma Tomato F1 Seeds', 'Genovese Basil Heirloom', 'Sunflower Microgreen Black Oil Seeds', 'English Cucumber F1 Seeds'],
    'orders@greenagroseeds.com', '+91 80 2839 1122', '+91 98451 00223', 'https://greenagroseeds.com',
    '45 Peenya Industrial Area, Phase II', 'Bengaluru', 'Karnataka', 'India', '560058',
    13.0285000, 77.5197000, '29AABCG1234F1ZQ', 'HDFC Bank', '50200048291024', 'HDFC0000123', 'Net 30',
    3, 4.9, 48400.00, 0.00, 'Primary certified organic seed supplier. Provides 98%+ germination guarantee and test certificates for every batch.', 'preferred'
),
(
    'd1111111-1111-1111-1111-111111111102', 'VND-FERT-02', 'BioEarth Organics Coimbatore', 'Dr. S. Shanmugam', 'Managing Director',
    'Fertilizers & Amendments', ARRAY['Matured Enriched Vermicompost', 'Neem Seed Cake Powder', 'Phosphate Rich Organic Manure (PROM)', 'Panchagavya Culture'],
    'support@bioearthorganics.in', '+91 422 245 8899', '+91 94433 11224', 'https://bioearthorganics.in',
    '128 Pollachi Main Road, Eachanari', 'Coimbatore', 'Tamil Nadu', 'India', '641021',
    10.9328000, 76.9748000, '33AABCB5566K1ZV', 'State Bank of India', '38920194821', 'SBIN0001428', 'Net 15',
    4, 4.8, 62500.00, 0.00, 'Certified organic bio-fertilizer and vermicompost producer. Ships in 25kg HDPE moisture-barrier sacks.', 'preferred'
),
(
    'd1111111-1111-1111-1111-111111111103', 'VND-PROT-03', 'EcoFlora Natural Protections', 'Meera Swaminathan', 'Technical Support Manager',
    'Fertilizers & Amendments', ARRAY['Azadirachtin Neem Oil 10,000 PPM', 'Trichoderma viride Bio-fungicide', 'Pseudomonas fluorescens', 'Yellow Sticky Traps'],
    'meera@ecofloraprotect.com', '+91 80 4120 7766', '+91 98865 33441', 'https://ecofloraprotect.com',
    '88 Electronic City Phase 1', 'Bengaluru', 'Karnataka', 'India', '560100',
    12.8399000, 77.6770000, '29AABCE7788P1ZY', 'ICICI Bank', '004705018294', 'ICIC0000047', 'Net 30',
    2, 4.7, 24800.00, 0.00, 'OMRI and NPOP certified botanical extracts and microbial bio-agents for zero-residue pest and fungal disease management.', 'active'
),
(
    'd1111111-1111-1111-1111-111111111104', 'VND-PACK-04', 'PackGreen Sustainable Packaging Solutions', 'Kishore Gopinath', 'Sales Director',
    'Packaging Materials', ARRAY['Compostable PLA Clamshell Containers 250g', 'Kraft Paper Produce Punnet Boxes', 'Bio-degradable Polyethylene Bags', 'Perforated Vegetable Cartons'],
    'sales@packgreensolutions.in', '+91 80 2221 4455', '+91 97412 88990', 'https://packgreensolutions.in',
    '15 Bommasandra Industrial Estate', 'Bengaluru', 'Karnataka', 'India', '560099',
    12.8163000, 77.6917000, '29AABCP3322M1ZX', 'Axis Bank', '918020048192019', 'UTIB0000214', 'Net 30',
    5, 4.6, 31200.00, 0.00, 'Eco-friendly biodegradable and PLA packaging manufacturer. Complies with commercial organic retail certification standards.', 'active'
),
(
    'd1111111-1111-1111-1111-111111111105', 'VND-IRR-05', 'Precision AgTech Systems & Automation', 'Balaji Narayanan', 'Chief Solutions Architect',
    'Irrigation & Hardware', ARRAY['Automated Solenoid Fertigation Valve Controllers', 'Inline Pressure Compensating Drip Emitters 2.0 LPH', 'Digital Soil Moisture & EC Sensors', 'Disc Filter Stations 50m3/h'],
    'balaji@precisionagtech.com', '+91 80 6789 0123', '+91 99011 55667', 'https://precisionagtech.com',
    '204 Prestige Tech Park, Marathahalli-Sarjapur Ring Road', 'Bengaluru', 'Karnataka', 'India', '560103',
    12.9366000, 77.6922000, '29AABCP9911N1ZU', 'Kotak Mahindra Bank', '4820193821', 'KKBK0000421', 'Net 30',
    7, 4.9, 78900.00, 8900.00, 'Supplies IoT fertigation dosing skids, solenoid controllers, and greenhouse micro-climate automation kits.', 'preferred'
),
(
    'd1111111-1111-1111-1111-111111111106', 'VND-FUEL-06', 'Indian Oil Fuel Station & Lubes Hub', 'Station Manager', 'Commercial Accounts Manager',
    'Fuel & Utilities', ARRAY['Ultra-Low Sulfur High Speed Diesel (HSD)', 'SAE 15W-40 Tractor Engine Oil', 'Hydraulic Fluid ISO VG 68'],
    'support@iocl-highway44.in', '+91 80 2783 2200', NULL, 'https://iocl.com',
    'NH 44 Highway Junction, Sarjapur Bypass', 'Bengaluru', 'Karnataka', 'India', '562125',
    12.8710000, 77.7600000, '29AABCI5544R1ZR', 'State Bank of India', '10928392811', 'SBIN0000842', 'Credit Card / COD',
    1, 4.5, 42000.00, 0.00, 'Supplies diesel fuel and machinery lubricants for John Deere tractors, tillers, and emergency generator backup.', 'active'
),
(
    'd1111111-1111-1111-1111-111111111107', 'VND-LAB-07', 'AgriSoil Analytics & Testing Laboratories', 'Dr. Nalini Iyer', 'Chief Soil Chemist',
    'Professional Services', ARRAY['Complete Soil Chemistry & N-P-K Analysis', 'Heavy Metals & Trace Mineral Assay', 'Irrigation Water Quality Testing', 'Plant Tissue Diagnostic Testing'],
    'reports@agrisoilanalytics.org', '+91 80 2341 5566', '+91 98450 77112', 'https://agrisoilanalytics.org',
    '14 University of Agricultural Sciences Campus Rd, Hebbal', 'Bengaluru', 'Karnataka', 'India', '560024',
    13.0358000, 77.5898000, '29AAACA9922L1ZK', 'Canara Bank', '042810192834', 'CNRB0000428', 'Net 15',
    3, 5.0, 18400.00, 0.00, 'NABL accredited agricultural diagnostics laboratory providing comprehensive soil and irrigation water lab reports within 72 hours.', 'preferred'
)
ON CONFLICT (id) DO UPDATE SET
    vendor_code = EXCLUDED.vendor_code,
    name = EXCLUDED.name,
    contact_person = EXCLUDED.contact_person,
    category = EXCLUDED.category,
    supply_items = EXCLUDED.supply_items,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    website = EXCLUDED.website,
    street_address = EXCLUDED.street_address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    tax_id = EXCLUDED.tax_id,
    bank_name = EXCLUDED.bank_name,
    bank_account_no = EXCLUDED.bank_account_no,
    bank_ifsc_swift = EXCLUDED.bank_ifsc_swift,
    payment_terms = EXCLUDED.payment_terms,
    lead_time_days = EXCLUDED.lead_time_days,
    rating = EXCLUDED.rating,
    total_purchases_amount = EXCLUDED.total_purchases_amount,
    outstanding_payable = EXCLUDED.outstanding_payable,
    notes = EXCLUDED.notes,
    status = EXCLUDED.status;

-- 7. SEED CONTACT COMMUNICATIONS
INSERT INTO vivas_contact_communications (
    contact_type, contact_id, contact_name, communication_type, subject, notes, logged_by, logged_at
) VALUES
(
    'Customer', 'c1111111-1111-1111-1111-111111111101', 'Green Grocers Hub (Vikramaditya)', 'Phone Call',
    'Agreed on Bi-Weekly 250kg Roma Tomatoes Shipment',
    'Confirmed recurring delivery every Tuesday and Friday morning by 7:30 AM. Pricing locked at ₹45/kg with 10% volume rebate.',
    'Farm Manager', CURRENT_TIMESTAMP - INTERVAL '3 days'
),
(
    'Customer', 'c1111111-1111-1111-1111-111111111102', 'Le Gourmet Bistro (Chef Pierre)', 'WhatsApp / SMS',
    'Sent Chef Direct Specialty Harvest Catalog',
    'Chef Pierre requested extra 15 trays of Genovese Basil and 20 punnets of Pea Shoots for the upcoming weekend degustation menu.',
    'Sales Lead', CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    'Vendor', 'd1111111-1111-1111-1111-111111111101', 'GreenAgro Seed Suppliers (Ramesh Chandra)', 'Email',
    'Confirmed Winter Season Seed Stock Order',
    'PO #PO-2026-089 sent for 5kg Roma Tomato F1 and 2kg Genovese Basil. Delivery dispatch expected via courier tomorrow.',
    'Farm Manager', CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    'Vendor', 'd1111111-1111-1111-1111-111111111105', 'Precision AgTech Systems (Balaji Narayanan)', 'Meeting',
    'On-site Polyhouse Fertigation Calibration & Training',
    'Balaji visited farm and completed calibration of the solenoid manifold and dual EC/pH sensors in Polyhouse 1. Provided maintenance checklist.',
    'Irrigation Lead', CURRENT_TIMESTAMP - INTERVAL '4 days'
);
