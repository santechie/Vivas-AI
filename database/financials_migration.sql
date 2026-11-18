-- ==============================================================================
-- FINANCIALS MODULE MIGRATION & SEED FOR VIVAS AI
-- Covers Accounting Categories (Chart of Accounts), Financial Transactions, and Budgets
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ACCOUNTING CATEGORIES / CHART OF ACCOUNTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_accounting_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Revenue', 'Cost of Goods Sold', 'Expenses', 'Capital Asset', 'Tax & Liability'
    accounting_code VARCHAR(50) NOT NULL UNIQUE,
    detail_category VARCHAR(150),
    description TEXT,
    tax_line VARCHAR(150), -- e.g. 'Schedule F - Line 2 (Produce Sales)', 'Schedule F - Line 14 (Seeds & Plants)'
    is_tax_deductible BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES vivas_accounting_categories(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'active', -- 'active', 'archived'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. FINANCIAL TRANSACTIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(30) NOT NULL, -- 'Income', 'Expense', 'Transfer', 'Refund'
    category_id UUID REFERENCES vivas_accounting_categories(id) ON DELETE RESTRICT,
    category_name VARCHAR(150) NOT NULL,
    category_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer', -- 'Cash', 'Bank Transfer', 'UPI', 'Credit Card', 'Cheque', 'Online Payment'
    party_name VARCHAR(150), -- Customer name or Vendor/Supplier name or Worker name
    party_type VARCHAR(50) DEFAULT 'Other', -- 'Customer', 'Vendor', 'Employee', 'Financial Institution', 'Other'
    invoice_receipt_ref VARCHAR(100),
    payment_status VARCHAR(30) DEFAULT 'Completed', -- 'Completed', 'Pending', 'Scheduled', 'Void'
    
    -- Cross-Module Relationships
    crop_id UUID,
    crop_name VARCHAR(100),
    sales_channel_id UUID,
    sales_channel_name VARCHAR(100),
    order_id UUID,
    order_code VARCHAR(50),
    input_item_id UUID,
    equipment_id UUID,
    labor_timesheet_id UUID,
    
    tax_rate_pct NUMERIC(5,2) DEFAULT 0.00,
    tax_amount NUMERIC(10,2) DEFAULT 0.00,
    is_reconciled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. FINANCIAL BUDGETS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_financial_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES vivas_accounting_categories(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL DEFAULT 2026,
    period_type VARCHAR(20) DEFAULT 'Annual', -- 'Annual', 'Monthly', 'Quarterly'
    period_value VARCHAR(20) DEFAULT '2026', -- '2026', 'Q1', 'Q2', 'Jan', etc.
    budgeted_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SEED DATA: ACCOUNTING CATEGORIES
-- ==============================================================================
INSERT INTO vivas_accounting_categories (id, category_name, type, accounting_code, detail_category, description, tax_line, is_tax_deductible, is_default, status)
VALUES
    -- Revenue (4000s)
    ('c1111111-1111-1111-1111-111111111111', 'Direct-to-Consumer Produce Sales', 'Revenue', '4001', 'Direct Sales', 'Sales of freshly harvested produce at farmstand, CSA boxes, and home delivery.', 'Schedule F - Line 2 (Produce Sales)', FALSE, TRUE, 'active'),
    ('c2222222-2222-2222-2222-222222222222', 'Wholesale & Grocery Accounts', 'Revenue', '4002', 'Wholesale Sales', 'Bulk produce supply to organic retail supermarkets and regional distributors.', 'Schedule F - Line 2 (Produce Sales)', FALSE, TRUE, 'active'),
    ('c3333333-3333-3333-3333-333333333333', 'Restaurant & Chef Direct Accounts', 'Revenue', '4003', 'Commercial Accounts', 'Premium specialty herbs, edible flowers, and microgreens supply to fine dining kitchens.', 'Schedule F - Line 2 (Produce Sales)', FALSE, TRUE, 'active'),
    ('c4444444-4444-4444-4444-444444444444', 'Farmers Market Booth Sales', 'Revenue', '4004', 'Direct Sales', 'Weekend community farmers market sales and cash box revenue.', 'Schedule F - Line 2 (Produce Sales)', FALSE, TRUE, 'active'),
    ('c5555555-5555-5555-5555-555555555555', 'Farm Tours & Educational Workshops', 'Revenue', '4050', 'Agritourism', 'On-farm guided visits, soil health workshops, and consulting fees.', 'Schedule F - Line 8 (Other Income)', FALSE, TRUE, 'active'),

    -- Cost of Goods Sold (5000s)
    ('c6666666-6666-6666-6666-666666666666', 'Seeds, Seedlings & Plant Starts', 'Cost of Goods Sold', '5001', 'Field Inputs', 'Certified organic seeds, heirloom plugs, seed potato stock, and rootstock.', 'Schedule F - Line 14 (Seeds & Plants)', TRUE, TRUE, 'active'),
    ('c7777777-7777-7777-7777-777777777777', 'Organic Fertilizers, Compost & Soil Amendments', 'Cost of Goods Sold', '5002', 'Soil Nutrition', 'Vermicompost, organic NPK blends, rock phosphate, and biofertilizers.', 'Schedule F - Line 17 (Fertilizers & Lime)', TRUE, TRUE, 'active'),
    ('c8888888-8888-8888-8888-888888888888', 'Crop Protection & Organic Biopesticides', 'Cost of Goods Sold', '5003', 'Plant Protection', 'Neem oil formulations, Trichoderma, pheromone traps, and beneficial nematodes.', 'Schedule F - Line 11 (Chemicals / Protection)', TRUE, TRUE, 'active'),
    ('c9999999-9999-9999-9999-999999999999', 'Harvest & Field Production Labor', 'Cost of Goods Sold', '5010', 'Labor Wages', 'Hourly field labor wages for bed prep, direct seeding, weeding, and harvesting.', 'Schedule F - Line 22 (Labor Hired)', TRUE, TRUE, 'active'),
    ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Packaging, Clamshells & Crates', 'Cost of Goods Sold', '5020', 'Post-Harvest', 'Eco-friendly kraft boxes, vented clamshells, rubber bands, and wooden crates.', 'Schedule F - Line 20 (Packaging Supplies)', TRUE, TRUE, 'active'),

    -- Operating Expenses (6000s)
    ('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Equipment Maintenance & Tractor Repairs', 'Expenses', '6001', 'Machinery & Tools', 'Service overhauls, oil filters, tillers, irrigation pumps, and rototiller blades.', 'Schedule F - Line 25 (Repairs & Maintenance)', TRUE, TRUE, 'active'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Fuel, Diesel & Machinery Lubricants', 'Expenses', '6002', 'Machinery & Tools', 'Tractor diesel, delivery van petrol, and 2-stroke generator fuel.', 'Schedule F - Line 20 (Gasoline, Fuel & Oil)', TRUE, TRUE, 'active'),
    ('cddddddd-dddd-dddd-dddd-dddddddddddd', 'Irrigation Water & Grid Electricity Utilities', 'Expenses', '6010', 'Farm Utilities', 'Borewell pump electricity, fertigation power, and drip line power supplies.', 'Schedule F - Line 30 (Utilities)', TRUE, TRUE, 'active'),
    ('ceeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Land Lease, Rent & Greenhouse Facility', 'Expenses', '6020', 'Facility & Property', 'Monthly farm ground lease payments, greenhouse land lease, and cold store rent.', 'Schedule F - Line 24 (Rent or Lease)', TRUE, TRUE, 'active'),
    ('cfffffff-ffff-ffff-ffff-ffffffffffff', 'Soil Lab Testing & Organic Certifications', 'Expenses', '6030', 'Compliance & Quality', 'Soil nutrient panel lab fees, water testing, and annual organic certification audits.', 'Schedule F - Line 32 (Other Expenses)', TRUE, TRUE, 'active'),
    ('c1010101-1010-1010-1010-101010101010', 'Delivery, Logistics & Freight Logistics', 'Expenses', '6040', 'Fulfillment', 'Van maintenance, delivery toll passes, driver allowances, and refrigerated shipping.', 'Schedule F - Line 12 (Freight & Trucking)', TRUE, TRUE, 'active'),
    ('c2020202-2020-2020-2020-202020202020', 'Marketing, Website, SaaS & Software Fees', 'Expenses', '6050', 'Sales & Admin', 'Ecommerce fees, Vivas AI subscriptions, print brochures, and market stall signage.', 'Schedule F - Line 32 (Other Expenses)', TRUE, TRUE, 'active'),
    ('c3030303-3030-3030-3030-303030303030', 'Farm Insurance & Worker Safety Equipment', 'Expenses', '6060', 'Insurance & Safety', 'Crop liability insurance, first-aid gear, gumboots, and harvest gloves.', 'Schedule F - Line 15 (Insurance)', TRUE, TRUE, 'active'),

    -- Capital Assets (1500s)
    ('c4040404-4040-4040-4040-404040404040', 'Capital Asset - Solar & Irrigation Infrastructure', 'Capital Asset', '1501', 'Capital Infrastructure', 'Solar pump installations, primary borewells, and polyhouse structural framing.', 'Depreciation Schedule (Asset Capitalization)', TRUE, TRUE, 'active'),
    ('c5050505-5050-5050-5050-505050505050', 'Capital Asset - Heavy Machinery & Vehicles', 'Capital Asset', '1502', 'Capital Machinery', 'Farm tractors, cold storage insulated transport van, and commercial seeders.', 'Depreciation Schedule (Asset Capitalization)', TRUE, TRUE, 'active'),

    -- Tax & Liabilities (2000s)
    ('c6060606-6060-6060-6060-606060606060', 'GST & Local Agricultural Taxes', 'Tax & Liability', '2001', 'Tax Liability', 'Goods and Services Tax on taxable processed goods and municipal cess.', 'Tax Liabilities', FALSE, TRUE, 'active')
ON CONFLICT (accounting_code) DO NOTHING;

-- ==============================================================================
-- SEED DATA: FINANCIAL TRANSACTIONS
-- ==============================================================================
INSERT INTO vivas_financial_transactions (
    id, transaction_code, transaction_date, type, category_id, category_name, category_type,
    description, amount, currency, payment_method, party_name, party_type, invoice_receipt_ref, payment_status,
    crop_name, sales_channel_name, tax_rate_pct, tax_amount, is_reconciled, notes
)
VALUES
    -- 1. Wholesale Sales Income
    ('f1111111-1111-1111-1111-111111111111', 'TXN-2026-0001', '2026-09-10', 'Income', 'c2222222-2222-2222-2222-222222222222', 'Wholesale & Grocery Accounts', 'Revenue',
     'Bi-weekly bulk organic Roma Tomatoes and Cucumbers shipment to Green Grocers Hub', 38500.00, 'INR', 'Bank Transfer', 'Green Grocers Supermarket', 'Customer', 'INV-2026-089', 'Completed',
     'Tomatoes', 'Wholesale Distributors', 0.00, 0.00, TRUE, 'Payment received via NEFT. 350 kg produce delivered in crates.'),

    -- 2. Restaurant Delivery Income
    ('f2222222-2222-2222-2222-222222222222', 'TXN-2026-0002', '2026-09-11', 'Income', 'c3333333-3333-3333-3333-333333333333', 'Restaurant & Chef Direct Accounts', 'Revenue',
     'Weekly fresh Microgreens Mix and Genovese Basil crates delivery to Le Gourmet Bistro', 14200.00, 'INR', 'UPI', 'Le Gourmet Bistro & Kitchen', 'Customer', 'INV-2026-092', 'Completed',
     'Microgreens', 'Restaurant Direct', 0.00, 0.00, TRUE, 'Instant UPI payment confirmation on delivery.'),

    -- 3. Farmers Market Weekend Sales
    ('f3333333-3333-3333-3333-333333333333', 'TXN-2026-0003', '2026-09-12', 'Income', 'c4444444-4444-4444-4444-444444444444', 'Farmers Market Booth Sales', 'Revenue',
     'Saturday Organic Farmers Market booth total cash and QR collections', 22800.00, 'INR', 'Cash', 'Weekend Community Market', 'Customer', 'REC-MKT-0912', 'Completed',
     'General', 'Farmers Market', 0.00, 0.00, TRUE, 'Cash deposited to main farm bank account.'),

    -- 4. Direct Consumer Produce Boxes
    ('f4444444-4444-4444-4444-444444444444', 'TXN-2026-0004', '2026-09-13', 'Income', 'c1111111-1111-1111-1111-111111111111', 'Direct-to-Consumer Produce Sales', 'Revenue',
     'Monthly Farm Harvest Subscription Box orders for 25 household subscribers', 31250.00, 'INR', 'Online Payment', 'CSA Subscriber Club', 'Customer', 'INV-CSA-SEP26', 'Completed',
     'General', 'Farm Stand & CSA', 0.00, 0.00, TRUE, 'Automated recurring card processing via Stripe.'),

    -- 5. Seed Inventory Purchase (Expense)
    ('f5555555-5555-5555-5555-555555555555', 'TXN-2026-0005', '2026-09-02', 'Expense', 'c6666666-6666-6666-6666-666666666666', 'Seeds, Seedlings & Plant Starts', 'Cost of Goods Sold',
     'Purchased certified organic Roma Tomato and Genovese Basil heirloom seeds lot', 8400.00, 'INR', 'Bank Transfer', 'GreenAgro Seed Suppliers Ltd', 'Vendor', 'BILL-GA-4402', 'Completed',
     'Tomatoes', NULL, 0.00, 0.00, TRUE, 'Stored in seed climate cabinet #2 for Autumn planting.'),

    -- 6. Organic Vermicompost & Fertilizers
    ('f6666666-6666-6666-6666-666666666666', 'TXN-2026-0006', '2026-09-04', 'Expense', 'c7777777-7777-7777-7777-777777777777', 'Organic Fertilizers, Compost & Soil Amendments', 'Cost of Goods Sold',
     '50 bags (25kg each) matured enriched vermicompost for Field Blocks A & B bed replenishment', 12500.00, 'INR', 'UPI', 'BioEarth Organics Coimbatore', 'Vendor', 'BILL-BE-1092', 'Completed',
     'General', NULL, 0.00, 0.00, TRUE, 'Unloaded into Main Inputs Storage Shed.'),

    -- 7. Biopesticides & Neem Formulation
    ('f7777777-7777-7777-7777-777777777777', 'TXN-2026-0007', '2026-09-05', 'Expense', 'c8888888-8888-8888-8888-888888888888', 'Crop Protection & Organic Biopesticides', 'Cost of Goods Sold',
     'Pure cold-pressed Azadirachtin Neem oil 10,000 PPM and Trichoderma viride culture', 4800.00, 'INR', 'Credit Card', 'EcoFlora Natural Protections', 'Vendor', 'BILL-ECO-882', 'Completed',
     'Tomatoes', NULL, 0.00, 0.00, TRUE, 'Integrated pest management preventive spray applied.'),

    -- 8. Farm Crew Weekly Wage Payout
    ('f8888888-8888-8888-8888-888888888888', 'TXN-2026-0008', '2026-09-08', 'Expense', 'c9999999-9999-9999-9999-999999999999', 'Harvest & Field Production Labor', 'Cost of Goods Sold',
     'Disbursed approved payroll wages for 6 farm workers based on logged timesheet hours', 15800.00, 'INR', 'Bank Transfer', 'Vivas AI Farm Field Crew', 'Employee', 'PAY-2026-W36', 'Completed',
     'General', NULL, 0.00, 0.00, TRUE, 'Direct bank NEFT transfers to worker salary accounts.'),

    -- 9. Eco-friendly Packaging Clamshells
    ('f9999999-9999-9999-9999-999999999999', 'TXN-2026-0009', '2026-09-06', 'Expense', 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Packaging, Clamshells & Crates', 'Cost of Goods Sold',
     '1000 units compostable PLA clamshell containers and vegetable packing cartons', 6200.00, 'INR', 'Bank Transfer', 'PackGreen Solutions', 'Vendor', 'BILL-PG-309', 'Completed',
     'Microgreens', NULL, 0.00, 0.00, TRUE, 'Used for microgreens and specialty herb packing.'),

    -- 10. Tractor Diesel Fuel
    ('faaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TXN-2026-0010', '2026-09-07', 'Expense', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Fuel, Diesel & Machinery Lubricants', 'Expenses',
     '100 Litres Ultra-Low Sulfur Diesel for John Deere 5050D Tractor and backup generator', 9200.00, 'INR', 'Credit Card', 'Indian Oil Fuel Station Highway #44', 'Vendor', 'PET-090726', 'Completed',
     'General', NULL, 0.00, 0.00, TRUE, 'Filled directly at on-farm diesel reserve barrel.'),

    -- 11. Drip Line & Pump Repairs
    ('fbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TXN-2026-0011', '2026-09-09', 'Expense', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Equipment Maintenance & Tractor Repairs', 'Expenses',
     'Replaced 3 faulty pressure relief valves and 50m mainline sub-drip tube in Greenhouse 2', 3650.00, 'INR', 'Cash', 'Netafim Local Service Tech', 'Vendor', 'SERV-NET-402', 'Completed',
     'Cucumbers', NULL, 0.00, 0.00, TRUE, 'Main pump pressure restored to 2.2 Bar standard.'),

    -- 12. Farm Electricity & Water Utilities
    ('fccccccc-cccc-cccc-cccc-cccccccccccc', 'TXN-2026-0012', '2026-09-03', 'Expense', 'cddddddd-dddd-dddd-dddd-dddddddddddd', 'Irrigation Water & Grid Electricity Utilities', 'Expenses',
     'Monthly agricultural power connection tariff for borewell pumps and cold storage unit', 7450.00, 'INR', 'Bank Transfer', 'State Electricity Distribution Co', 'Vendor', 'EB-BILL-AUG26', 'Completed',
     'General', NULL, 0.00, 0.00, TRUE, 'Paid via online billdesk utility gateway.'),

    -- 13. Soil Nutrient Comprehensive Panel Lab Test
    ('fddddddd-dddd-dddd-dddd-dddddddddddd', 'TXN-2026-0013', '2026-09-01', 'Expense', 'cfffffff-ffff-ffff-ffff-ffffffffffff', 'Soil Lab Testing & Organic Certifications', 'Expenses',
     'Complete N-P-K, micronutrient, and organic matter percentage laboratory testing for Field C', 2400.00, 'INR', 'UPI', 'AgriSoil Analytics Laboratory', 'Vendor', 'LAB-REP-901', 'Completed',
     'General', NULL, 0.00, 0.00, TRUE, 'Test results imported into Notes & Soil Tests screen.'),

    -- 14. Pending Wholesale Invoice (Receivable)
    ('feeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'TXN-2026-0014', '2026-09-12', 'Income', 'c2222222-2222-2222-2222-222222222222', 'Wholesale & Grocery Accounts', 'Revenue',
     'Scheduled delivery of 200 kg English Cucumbers & Bell Peppers to FreshBasket Mart', 24500.00, 'INR', 'Bank Transfer', 'FreshBasket Supermarket Group', 'Customer', 'INV-2026-095', 'Pending',
     'Cucumbers', 'Wholesale Distributors', 0.00, 0.00, FALSE, 'Payment due within net-15 days terms.'),

    -- 15. Pending Irrigation Upgrade Bill (Payable)
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'TXN-2026-0015', '2026-09-13', 'Expense', 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Equipment Maintenance & Tractor Repairs', 'Expenses',
     'Automated solenoid fertigation valve controller unit for Polyhouse 1', 8900.00, 'INR', 'Bank Transfer', 'Precision AgTech Systems', 'Vendor', 'BILL-PATS-982', 'Pending',
     'Bell Peppers', NULL, 0.00, 0.00, FALSE, 'Awaiting delivery and installation inspection.')
ON CONFLICT (transaction_code) DO NOTHING;
