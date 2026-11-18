-- ==============================================================================
-- ASSETS MODULE MIGRATION & SEED FOR VIVAS AI
-- Covers Containers, Equipment & Tools, Materials & Inputs (Catalog, Inventory, Lots)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CONTAINERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    abbreviation VARCHAR(50),
    types JSONB DEFAULT '["Grow"]'::jsonb, -- e.g. ["Grow", "Harvest & Handling", "Storage", "Retail Packaging"]
    material VARCHAR(100) DEFAULT 'Heavy-Duty Polypropylene',
    brand VARCHAR(100) DEFAULT 'Bootstrap Farmer',
    color VARCHAR(50) DEFAULT 'Black',
    total_count INT DEFAULT 100,
    is_serialized BOOLEAN DEFAULT FALSE,
    barcode VARCHAR(100) UNIQUE,
    storage_location VARCHAR(150) DEFAULT 'Greenhouse Storage Bay A',
    shape VARCHAR(50) DEFAULT 'Flat Tray', -- Flat Tray, Round, Square, Rectangle
    top_diameter_cm NUMERIC(6,2) DEFAULT 0.00,
    bottom_diameter_cm NUMERIC(6,2) DEFAULT 0.00,
    height_cm NUMERIC(6,2) DEFAULT 6.50,
    volume_liters NUMERIC(8,2) DEFAULT 3.20,
    total_cells INT DEFAULT 72, -- 1, 32, 50, 72, 128, 200, 288
    cell_configuration VARCHAR(50) DEFAULT '12x6 Grid',
    cell_shape VARCHAR(50) DEFAULT 'Square',
    status VARCHAR(30) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. EQUIPMENT & TOOLS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    model_number VARCHAR(100),
    brand VARCHAR(100),
    category VARCHAR(100) NOT NULL, -- Tractors & Vehicles, Seeders & Transplanters, Tillage & Bed Preparation, Sprayers & Applicators, Irrigation & Fertigation, Harvesting Equipment, Post-Harvest & Cold Storage, Hand Tools
    serial_number VARCHAR(100) UNIQUE,
    asset_tag VARCHAR(50) UNIQUE,
    purchase_date DATE,
    purchase_price NUMERIC(12,2) DEFAULT 0.00,
    current_status VARCHAR(50) DEFAULT 'active', -- active, in_use, maintenance, in_storage, decommissioned
    location VARCHAR(150) DEFAULT 'Main Tool Barn',
    assigned_crew VARCHAR(150) DEFAULT 'Field Operations Crew',
    operating_hours NUMERIC(8,2) DEFAULT 0.00,
    service_interval_hours INT DEFAULT 100,
    last_service_date DATE,
    next_service_date DATE,
    warranty_expiry DATE,
    specifications JSONB DEFAULT '{}'::jsonb,
    manual_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. EQUIPMENT MAINTENANCE LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES vivas_equipment(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    service_type VARCHAR(100) NOT NULL, -- Routine Inspection, Oil & Filter Change, Hydraulic Service, Blade Sharpening, Calibration, Battery Replacement, Major Overhaul
    performed_by VARCHAR(150) NOT NULL,
    cost NUMERIC(10,2) DEFAULT 0.00,
    hours_at_service NUMERIC(8,2) DEFAULT 0.00,
    parts_replaced TEXT,
    notes TEXT,
    next_due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. MATERIALS & INPUTS: MASTER CATALOG TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_inputs_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    input_type VARCHAR(100) NOT NULL, -- Fertilizers & Nutrients, Soil Amendments & Media, Biopesticides & Fungicides, Beneficial Microbials, Seeds & Propagules, Packaging & Labels
    active_ingredients VARCHAR(255),
    npk_ratio VARCHAR(50),
    is_organic BOOLEAN DEFAULT TRUE,
    omri_listed BOOLEAN DEFAULT TRUE,
    certification_number VARCHAR(100),
    default_unit VARCHAR(50) DEFAULT 'kg', -- kg, g, L, mL, Bag (50kg), Packet (500g), Bale
    brand VARCHAR(100),
    recommended_application_rate VARCHAR(255),
    target_crops VARCHAR(255),
    safety_precautions TEXT,
    reentry_interval_hours INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. MATERIALS & INPUTS: INVENTORY ON-HAND TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_inputs_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID REFERENCES vivas_inputs_catalog(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    input_type VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'kg',
    brand VARCHAR(100),
    vendor VARCHAR(150) DEFAULT 'Agro Green Inputs Hub',
    quantity_on_hand NUMERIC(10,2) DEFAULT 0.00,
    quantity_committed NUMERIC(10,2) DEFAULT 0.00,
    quantity_available NUMERIC(10,2) DEFAULT 0.00,
    quantity_incoming NUMERIC(10,2) DEFAULT 0.00,
    quantity_expired NUMERIC(10,2) DEFAULT 0.00,
    reorder_threshold NUMERIC(10,2) DEFAULT 10.00,
    unit_cost NUMERIC(10,2) DEFAULT 0.00,
    storage_location VARCHAR(150) DEFAULT 'Inputs Storage Shed',
    status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, low_stock, out_of_stock, reorder_needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. MATERIALS & INPUTS: LOT MANAGEMENT & TRACEABILITY TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_inputs_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_number VARCHAR(100) NOT NULL UNIQUE,
    vendor_lot_number VARCHAR(100),
    inventory_id UUID REFERENCES vivas_inputs_inventory(id) ON DELETE SET NULL,
    catalog_id UUID REFERENCES vivas_inputs_catalog(id) ON DELETE SET NULL,
    input_name VARCHAR(150) NOT NULL,
    input_type VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'kg',
    initial_quantity NUMERIC(10,2) NOT NULL,
    current_quantity NUMERIC(10,2) NOT NULL,
    unit_cost NUMERIC(10,2) DEFAULT 0.00,
    total_cost NUMERIC(12,2) DEFAULT 0.00,
    received_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    storage_location VARCHAR(150),
    container_code VARCHAR(100),
    supplier_name VARCHAR(150),
    status VARCHAR(50) DEFAULT 'active', -- active, expiring_soon, expired, depleted, quarantined
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SEED DATA
-- ==============================================================================

-- Seed Containers
INSERT INTO vivas_containers (id, name, abbreviation, types, material, brand, color, total_count, is_serialized, barcode, storage_location, shape, top_diameter_cm, bottom_diameter_cm, height_cm, volume_liters, total_cells, cell_configuration, cell_shape, status, notes)
VALUES
('b1111111-1111-1111-1111-111111111111', '72-Cell Deep Seedling Flat', '72-FLAT', '["Grow"]'::jsonb, 'Heavy-Duty Polypropylene', 'Bootstrap Farmer', 'Black', 250, TRUE, 'CONT-72-FLAT-001', 'Greenhouse 1 - Nursery Bench A', 'Flat Tray', 54.0, 28.0, 6.0, 3.5, 72, '12x6 Grid', 'Square', 'active', 'Used for brassicas, solanaceous transplants, and high-value leafy greens.'),
('b2222222-2222-2222-2222-222222222222', '128-Cell Precision Plug Tray', '128-PLUG', '["Grow"]'::jsonb, 'Recycled Polypropylene', 'Agriplast', 'Black', 300, TRUE, 'CONT-128-PLUG-002', 'Greenhouse 1 - Nursery Bench B', 'Flat Tray', 54.0, 28.0, 5.0, 2.8, 128, '16x8 Grid', 'Round', 'active', 'Ideal for onions, leeks, lettuce plugs and herbs.'),
('b3333333-3333-3333-3333-333333333333', '1020 Microgreens Shallow Tray', '1020-MG', '["Grow", "Harvest & Handling"]'::jsonb, 'BPA-Free Food-Grade Plastic', 'Bootstrap Farmer', 'Green', 400, FALSE, 'CONT-1020-MG-003', 'Microgreens Grow Room - Rack 1', 'Flat Tray', 53.5, 27.5, 3.2, 2.1, 1, 'Single', 'Square', 'active', 'No drain holes. Shallow design for rapid microgreen cutting and root aeration.'),
('b4444444-4444-4444-4444-444444444444', 'Orange Vented Harvest Crate (35L)', 'OHC-35L', '["Harvest & Handling", "Storage"]'::jsonb, 'High-Density Polyethylene', 'Supreme Agro', 'Orange', 180, TRUE, 'CRATE-HARV-35L-088', 'Wash Shed & Packhouse Bay 1', 'Rectangle', 60.0, 40.0, 24.0, 35.0, 1, 'Single', 'None', 'active', 'Interlocking stacking design with side ventilation slots for tomato and fruit field harvesting.'),
('b5555555-5555-5555-5555-555555555555', '5-Gallon Nursery Grow Pot', '5GAL-POT', '["Grow"]'::jsonb, 'Injection Molded Plastic', 'Plano Plastics', 'Terracotta', 120, FALSE, 'CONT-5GAL-POT-005', 'Tunnel House 2 - Outdoor Nursery', 'Round', 30.0, 24.0, 28.0, 19.0, 1, 'Single', 'Round', 'active', 'Used for ginger, turmeric container growing and nursery mother plants.'),
('b6666666-6666-6666-6666-666666666666', 'Heavy-Duty Bulk Field Lug (50L)', 'FLUG-50L', '["Harvest & Handling", "Storage"]'::jsonb, 'UV-Stabilized HDPE', 'Agriplast', 'Blue', 60, TRUE, 'CRATE-FLUG-50L-102', 'Cold Storage Chiller Room', 'Rectangle', 65.0, 45.0, 32.0, 50.0, 1, 'Single', 'None', 'active', 'Heavy-duty bulk lug for root crops, potatoes, and storage squash.')
ON CONFLICT (id) DO NOTHING;

-- Seed Equipment & Tools
INSERT INTO vivas_equipment (id, name, model_number, brand, category, serial_number, asset_tag, purchase_date, purchase_price, current_status, location, assigned_crew, operating_hours, service_interval_hours, last_service_date, next_service_date, warranty_expiry, specifications, notes)
VALUES
('e1111111-1111-1111-1111-111111111111', 'Mahindra 475 DI 42HP Farm Tractor', '475 DI SP PLUS', 'Mahindra', 'Tractors & Vehicles', 'MHD-475-2023-8891', 'EQ-TRAC-001', '2023-04-15', 685000.00, 'active', 'Tractor Shed Bay 1', 'Suresh (Lead Operator)', 480.5, 100, '2026-07-10', '2026-10-10', '2028-04-15', '{"horsepower": 42, "cylinders": 4, "fuel_type": "Diesel", "pto_rpm": 540}'::jsonb, 'Primary field tractor equipped with 3-point hitch, power steering, and dual clutch.'),
('e2222222-2222-2222-2222-222222222222', 'Jang JP-1 Precision Clean Seeder', 'JP-1 Single Row', 'Jang Automation', 'Seeders & Transplanters', 'JANG-JP1-4412', 'EQ-SEED-002', '2023-11-20', 48500.00, 'active', 'Main Tool Barn - Shelf A', 'Field Seeding Crew', 95.0, 50, '2026-08-05', '2026-11-05', '2025-11-20', '{"row_spacing": "Adjustable", "hopper_capacity_l": 1.0, "drive": "Sprocket / Roller"}'::jsonb, 'Precision seeder with rollers for brassicas, carrots, radishes, and spinach.'),
('e3333333-3333-3333-3333-333333333333', 'Honda F501 Multi-Tiller & Bed Shaper', 'F501 5.5HP', 'Honda', 'Tillage & Bed Preparation', 'HND-F501-9921', 'EQ-TILL-003', '2024-02-10', 92000.00, 'maintenance', 'Equipment Service Bay', 'Ramesh K.', 215.0, 50, '2026-06-15', '2026-09-05', '2026-02-10', '{"engine": "GX160 163cc", "tilling_width_cm": 91, "weight_kg": 52}'::jsonb, 'Undergoing belt adjustment and tine replacement in service bay.'),
('e4444444-4444-4444-4444-444444444444', 'Solo 417 Li-Ion Battery Backpack Sprayer 18L', '417-PRO 18L', 'Solo', 'Sprayers & Applicators', 'SOLO-417-7718', 'EQ-SPRY-004', '2024-05-18', 24500.00, 'active', 'Chemical & Bio-Inputs Store', 'Organic Spray Techs', 64.0, 40, '2026-08-12', '2026-11-12', '2026-05-18', '{"tank_capacity_l": 18, "pressure_bar": 4.3, "battery_v": 12}'::jsonb, 'Dedicated exclusively to certified organic biological spray applications and neem oil.'),
('e5555555-5555-5555-5555-555555555555', 'Walk-in Cold Chiller Unit with CoolBot Controller', 'CB-AC-24K', 'CoolBot / LG', 'Post-Harvest & Cold Storage', 'CB-LG-24K-109', 'EQ-COLD-005', '2023-08-01', 175000.00, 'active', 'Packhouse Cold Storage Room', 'Packhouse Manager', 1450.0, 250, '2026-07-25', '2026-10-25', '2028-08-01', '{"temp_range_c": "2 - 10", "refrigerant": "R410A", "volume_cu_ft": 900}'::jsonb, 'Main farm post-harvest pre-cooler maintaining 4°C for greens, berries, and bagged produce.')
ON CONFLICT (id) DO NOTHING;

-- Seed Maintenance Logs (using valid hex UUIDs)
INSERT INTO vivas_equipment_maintenance (id, equipment_id, service_date, service_type, performed_by, cost, hours_at_service, parts_replaced, notes, next_due_date)
VALUES
('d1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', '2026-07-10', 'Routine Oil & Filter Change', 'Mahindra Authorized Service Center', 6500.00, 400.0, 'Engine Oil (8.5L), Oil Filter, Primary Fuel Filter', 'Completed 400-hr service milestone. Hydraulics and steering tested OK.', '2026-10-10'),
('d2222222-2222-2222-2222-222222222222', 'e3333333-3333-3333-3333-333333333333', '2026-06-15', 'Tiller Tine Sharpening & Spark Plug', 'Farm Mechanic Ramesh', 1850.00, 180.0, 'NGK Spark Plug, Drive Belt, Tine Bolts', 'Replaced worn drive belt and sharpened tilling blades.', '2026-09-05'),
('d3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555', '2026-07-25', 'Condenser Coil Cleaning & Refrigerant Check', 'Arctic Chill Techs', 3200.00, 1400.0, 'Air Filters, Thermostat Sensor Seal', 'Cleaned outside condenser unit coils and calibrated temperature sensors to 3.8°C.', '2026-10-25')
ON CONFLICT (id) DO NOTHING;

-- Seed Materials & Inputs Catalog
INSERT INTO vivas_inputs_catalog (id, name, input_type, active_ingredients, npk_ratio, is_organic, omri_listed, certification_number, default_unit, brand, recommended_application_rate, target_crops, safety_precautions, reentry_interval_hours, status)
VALUES
('c1111111-1111-1111-1111-111111111111', 'Neem Seed Cake Organic Fertilizer', 'Fertilizers & Nutrients', 'Azadirachtin 0.03%, Organic Nitrogen 4%', '4-1-2', TRUE, TRUE, 'NPOP/NAB/0010-ORG', 'kg', 'Multiplex Bio', '250 kg per acre incorporated during bed prep', 'Tomatoes, Bell Peppers, Brassicas, Roots', 'Wear dust mask and gloves. Store away from moisture.', 0, 'active'),
('c2222222-2222-2222-2222-222222222222', 'Bio-NPK Liquid Microbial Consortium', 'Beneficial Microbials', 'Azotobacter, PSB (Bacillus), KMB (Frateuria)', 'Liquid Consortium', TRUE, TRUE, 'OMRI-AG-4981', 'L', 'IFFCO Urban Gardens', '5 mL per liter of water via drip fertigation weekly', 'All Crops, Vegetables & Fruits', 'Avoid mixing with chemical bactericides. Use within 6 months.', 0, 'active'),
('c3333333-3333-3333-3333-333333333333', 'Premium Enriched Vermicompost', 'Soil Amendments & Media', 'Earthworm castings, beneficial humic acids', '1.5-0.8-1.2', TRUE, TRUE, 'NPOP/VERMI-772', 'Bag (50kg)', 'TrustBasket Organic', '1 tonne per acre or 200g per nursery transplant hole', 'All Vegetable Beds & Seedling Flats', 'Keep shaded and moist. Do not allow to bake in hot sun.', 0, 'active'),
('c4444444-4444-4444-4444-444444444444', 'Trichoderma Harzianum Bio-Fungicide', 'Biopesticides & Fungicides', 'Trichoderma harzianum 2x10^8 CFU/g', 'Bio-Fungicide', TRUE, TRUE, 'OMRI-BIO-1102', 'kg', 'Utkarsh Agro', '10g per liter water as soil drench or root dip', 'Tomatoes, Cucumbers, Peppers, Seedlings', 'Store under 25°C. Apply during early morning or evening.', 0, 'active'),
('c5555555-5555-5555-5555-555555555555', 'Bacillus Thuringiensis (Bt) Bio-Insecticide', 'Biopesticides & Fungicides', 'Bt kurstaki strain HD-1 32000 IU/mg', 'Bio-Insecticide', TRUE, TRUE, 'OMRI-BT-309', 'g', 'Delfin Bio', '1.5g per liter water as foliar spray upon larvae sighting', 'Cabbage, Cauliflower, Broccoli, Kale', 'Foliar spray with full leaf coverage including undersides.', 4, 'active'),
('c6666666-6666-6666-6666-666666666666', 'Coco Peat Low-EC Growing Medium Bale', 'Soil Amendments & Media', 'Washed low EC (< 0.5 mS/cm) coconut coir', 'N/A', TRUE, TRUE, 'OMRI-CP-901', 'Bale (5kg)', 'CocoGreen Agro', 'Expand with 25L water per 5kg bale for nursery potting mix', 'Microgreens, Plug Flats, Nursery Pots', 'Expand with clean water and mix with 20% vermicompost.', 0, 'active'),
('c7777777-7777-7777-7777-777777777777', 'Seaweed Extract Liquid Kelp 100%', 'Fertilizers & Nutrients', 'Ascophyllum nodosum cold-water kelp extract', '0.5-0-2.5', TRUE, TRUE, 'OMRI-SW-881', 'L', 'Agro Kelp Organics', '2 mL per liter water as bi-weekly foliar tonic', 'Leafy Greens, Fruiting Crops, Herbs', 'Compatible with all organic microbials. Shake well before use.', 0, 'active')
ON CONFLICT (id) DO NOTHING;

-- Seed Materials & Inputs Inventory On-Hand (using valid hex UUIDs)
INSERT INTO vivas_inputs_inventory (id, catalog_id, name, input_type, unit, brand, vendor, quantity_on_hand, quantity_committed, quantity_available, quantity_incoming, quantity_expired, reorder_threshold, unit_cost, storage_location, status)
VALUES
('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Neem Seed Cake Organic Fertilizer', 'Fertilizers & Nutrients', 'kg', 'Multiplex Bio', 'Agro Green Inputs Hub', 350.0, 50.0, 300.0, 200.0, 0.0, 100.0, 38.00, 'Inputs Shed - Pallet 1', 'in_stock'),
('a2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Bio-NPK Liquid Microbial Consortium', 'Beneficial Microbials', 'L', 'IFFCO Urban Gardens', 'IFFCO Direct', 45.0, 10.0, 35.0, 20.0, 0.0, 15.0, 240.00, 'Inputs Shed - Shelf 2A', 'in_stock'),
('a3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Premium Enriched Vermicompost', 'Soil Amendments & Media', 'Bag (50kg)', 'TrustBasket Organic', 'TrustBasket Wholesale', 80.0, 20.0, 60.0, 50.0, 0.0, 25.0, 420.00, 'Compost Storage Bay', 'in_stock'),
('a4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 'Trichoderma Harzianum Bio-Fungicide', 'Biopesticides & Fungicides', 'kg', 'Utkarsh Agro', 'Agro Green Inputs Hub', 18.0, 5.0, 13.0, 0.0, 0.0, 8.0, 320.00, 'Inputs Cold Cabinet (18°C)', 'in_stock'),
('a5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', 'Bacillus Thuringiensis (Bt) Bio-Insecticide', 'Biopesticides & Fungicides', 'g', 'Delfin Bio', 'Bio-Control Solutions', 1200.0, 400.0, 800.0, 500.0, 0.0, 500.0, 2.20, 'Inputs Cold Cabinet (18°C)', 'in_stock'),
('a6666666-6666-6666-6666-666666666666', 'c6666666-6666-6666-6666-666666666666', 'Coco Peat Low-EC Growing Medium Bale', 'Soil Amendments & Media', 'Bale (5kg)', 'CocoGreen Agro', 'South Coir Exports', 95.0, 15.0, 80.0, 40.0, 0.0, 30.0, 180.00, 'Nursery Potting Shed Pallet', 'in_stock'),
('a7777777-7777-7777-7777-777777777777', 'c7777777-7777-7777-7777-777777777777', 'Seaweed Extract Liquid Kelp 100%', 'Fertilizers & Nutrients', 'L', 'Agro Kelp Organics', 'Organic Farming Supplies Co.', 12.0, 4.0, 8.0, 10.0, 0.0, 10.0, 480.00, 'Inputs Shed - Shelf 2B', 'low_stock')
ON CONFLICT (id) DO NOTHING;

-- Seed Lots Management & Traceability (using valid hex UUIDs)
INSERT INTO vivas_inputs_lots (id, lot_number, vendor_lot_number, inventory_id, catalog_id, input_name, input_type, unit, initial_quantity, current_quantity, unit_cost, total_cost, received_date, expiration_date, storage_location, container_code, supplier_name, status, notes)
VALUES
('f1111111-1111-1111-1111-111111111111', 'LOT-2026-NEM-001', 'VND-MF-9941A', 'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Neem Seed Cake Organic Fertilizer', 'Fertilizers & Nutrients', 'kg', 500.0, 350.0, 38.00, 19000.00, '2026-06-01', '2027-06-01', 'Inputs Shed - Pallet 1', 'CRATE-FLUG-50L-102', 'Agro Green Inputs Hub', 'active', 'High azadirachtin test batch 0.038%. Good granular consistency.'),
('f2222222-2222-2222-2222-222222222222', 'LOT-2026-BNPK-042', 'IFF-BNPK-2026B', 'a2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Bio-NPK Liquid Microbial Consortium', 'Beneficial Microbials', 'L', 50.0, 45.0, 240.00, 12000.00, '2026-07-15', '2027-01-15', 'Inputs Shed - Shelf 2A', 'CRATE-HARV-35L-088', 'IFFCO Direct', 'active', 'Fresh batch with 5x10^8 CFU viable cell count.'),
('f3333333-3333-3333-3333-333333333333', 'LOT-2026-VERM-108', 'TB-VC-JUL26', 'a3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Premium Enriched Vermicompost', 'Soil Amendments & Media', 'Bag (50kg)', 100.0, 80.0, 420.00, 42000.00, '2026-07-01', '2027-07-01', 'Compost Storage Bay', 'CRATE-FLUG-50L-102', 'TrustBasket Wholesale', 'active', 'Double-screened 4mm mesh with active earthworm cocoons.'),
('f4444444-4444-4444-4444-444444444444', 'LOT-2026-TRICH-009', 'UTK-TH-8831', 'a4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 'Trichoderma Harzianum Bio-Fungicide', 'Biopesticides & Fungicides', 'kg', 25.0, 18.0, 320.00, 8000.00, '2026-05-10', '2026-11-10', 'Inputs Cold Cabinet (18°C)', 'CONT-72-FLAT-001', 'Agro Green Inputs Hub', 'expiring_soon', 'Expiring in 60 days. Prioritize for upcoming tomato bed root drenching.'),
('f5555555-5555-5555-5555-555555555555', 'LOT-2026-SW-003', 'AK-KELP-440', 'a7777777-7777-7777-7777-777777777777', 'c7777777-7777-7777-7777-777777777777', 'Seaweed Extract Liquid Kelp 100%', 'Fertilizers & Nutrients', 'L', 20.0, 12.0, 480.00, 9600.00, '2026-04-12', '2027-04-12', 'Inputs Shed - Shelf 2B', 'CONT-1020-MG-003', 'Organic Farming Supplies Co.', 'active', 'Cold-processed liquid kelp for foliar microgreen and brassica sprays.')
ON CONFLICT (id) DO NOTHING;
