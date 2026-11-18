-- Migration Script: Tend.com Crop Library & Automated Workflows
-- Database: vivas_ai

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Master Harvest Stages Table
CREATE TABLE IF NOT EXISTS vivas_harvest_stages (
    id SERIAL PRIMARY KEY,
    stage_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default harvest stages if empty
INSERT INTO vivas_harvest_stages (stage_name, description) VALUES
('Microgreen', 'Harvested at cotyledon or first true leaf stage (7-14 days)'),
('Baby Leaf', 'Young tender leaves harvested before full maturity (21-35 days)'),
('Full Mature', 'Fully grown mature crop fruit or head (55-90 days)'),
('Bunching', 'Harvested and tied in fresh bunches (e.g. Radish, Carrots, Onions)'),
('Heavy Fruit', 'Multiple pickings of heavy fruiting crops (Tomatoes, Peppers, Cucumbers)')
ON CONFLICT (stage_name) DO NOTHING;

-- 2. Master Seed Suppliers Table
CREATE TABLE IF NOT EXISTS vivas_seed_suppliers (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL UNIQUE,
    contact_email VARCHAR(150),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default seed suppliers if empty
INSERT INTO vivas_seed_suppliers (supplier_name, contact_email, website) VALUES
('Johnny''s Selected Seeds', 'orders@johnnyseeds.com', 'https://www.johnnyseeds.com'),
('High Mowing Organic Seeds', 'support@highmowingseeds.com', 'https://www.highmowingseeds.com'),
('BioEarth Organics', 'info@bioearth.in', 'https://www.bioearthorganics.in'),
('GreenAgro Seed Suppliers Ltd', 'sales@greenagroseeds.com', 'https://www.greenagroseeds.com')
ON CONFLICT (supplier_name) DO NOTHING;

-- 3. Comprehensive Crop Templates Table
CREATE TABLE IF NOT EXISTS vivas_crop_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID REFERENCES vivas_crops(id) ON DELETE CASCADE,
    variety_id UUID REFERENCES vivas_crop_varieties(id) ON DELETE CASCADE,
    harvest_stage_id INT REFERENCES vivas_harvest_stages(id) ON DELETE SET NULL,
    supplier_id INT REFERENCES vivas_seed_suppliers(id) ON DELETE SET NULL,
    template_name VARCHAR(200) NOT NULL,
    
    -- General Botanical & Agronomic Info
    soil_ph_min NUMERIC(4,2) DEFAULT 6.0,
    soil_ph_max NUMERIC(4,2) DEFAULT 6.8,
    frost_tolerance VARCHAR(50) DEFAULT 'Tender',
    light_requirement VARCHAR(50) DEFAULT 'Full Sun',
    seasonality VARCHAR(50) DEFAULT 'Warm Season',
    
    -- Nursery Details
    planting_method VARCHAR(50) DEFAULT 'Transplant',
    tray_size VARCHAR(50) DEFAULT '72-cell',
    seeds_per_cell INT DEFAULT 1,
    days_in_nursery INT DEFAULT 28,
    hardening_off_days INT DEFAULT 5,
    germination_temp_f VARCHAR(50) DEFAULT '65-75°F',
    days_to_germination INT DEFAULT 7,
    nursery_target_stage_temp_f VARCHAR(50) DEFAULT '70°F',
    target_germination_rate_pct NUMERIC(5,2) DEFAULT 90.00,
    
    -- Field Planting Details
    bed_width_in NUMERIC(6,2) DEFAULT 30.0,
    bed_length_ft NUMERIC(6,2) DEFAULT 100.0,
    rows_per_bed INT DEFAULT 2,
    in_row_spacing_in NUMERIC(6,2) DEFAULT 12.0,
    row_spacing_in NUMERIC(6,2) DEFAULT 18.0,
    planting_depth_in NUMERIC(6,2) DEFAULT 0.25,
    days_to_maturity INT DEFAULT 65,
    target_plants_per_100ft INT DEFAULT 200,
    
    -- Yield & Financial Benchmarks
    expected_yield_per_ft NUMERIC(10,2) DEFAULT 1.5,
    yield_unit VARCHAR(50) DEFAULT 'kg',
    default_price_per_unit NUMERIC(10,2) DEFAULT 50.00,
    harvest_window_days INT DEFAULT 21,
    est_revenue_per_100ft_bed NUMERIC(12,2) DEFAULT 15000.00,
    
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Nursery Automated Task Sequences Table
CREATE TABLE IF NOT EXISTS vivas_crop_nursery_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES vivas_crop_templates(id) ON DELETE CASCADE,
    task_name VARCHAR(150) NOT NULL,
    task_category VARCHAR(100) DEFAULT 'Seeding',
    offset_days INT NOT NULL, -- Relative days relative to Sow Date (0 = Sow Date)
    est_labor_hours NUMERIC(6,2) DEFAULT 0.5,
    assigned_role VARCHAR(100) DEFAULT 'Nursery Tech',
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Field Planting Automated Task Sequences Table
CREATE TABLE IF NOT EXISTS vivas_crop_field_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES vivas_crop_templates(id) ON DELETE CASCADE,
    task_name VARCHAR(150) NOT NULL,
    task_category VARCHAR(100) DEFAULT 'Transplanting',
    offset_days INT NOT NULL, -- Relative days relative to Planting Date
    est_labor_hours NUMERIC(6,2) DEFAULT 1.0,
    assigned_role VARCHAR(100) DEFAULT 'Field Hand',
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
