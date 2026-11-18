-- ============================================================
-- VIVAS AI - GROW MODULE DATABASE MIGRATION
-- Crop Library, Crop Varieties, Seasonal Plantings & Harvest Planner
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Crops Master Table
CREATE TABLE IF NOT EXISTS vivas_crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  custom_name VARCHAR(150),
  abbreviation VARCHAR(20),
  crop_family VARCHAR(100),
  genus VARCHAR(100),
  species VARCHAR(100),
  category VARCHAR(50) DEFAULT 'Vegetables',
  image_url VARCHAR(255),
  icon VARCHAR(20) DEFAULT '🌱',
  color VARCHAR(20) DEFAULT '#2e7d32',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crop Varieties & Growing Templates Table
CREATE TABLE IF NOT EXISTS vivas_crop_varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES vivas_crops(id) ON DELETE CASCADE,
  variety_name VARCHAR(150) NOT NULL,
  supplier VARCHAR(150),
  days_to_maturity INT DEFAULT 60,
  days_to_germination INT DEFAULT 7,
  harvest_stage VARCHAR(50) DEFAULT 'Mature',
  planting_method VARCHAR(50) DEFAULT 'Transplant',
  in_row_spacing_in NUMERIC(6,2) DEFAULT 12.0,
  row_spacing_in NUMERIC(6,2) DEFAULT 18.0,
  rows_per_bed INT DEFAULT 2,
  expected_yield_per_ft NUMERIC(8,2) DEFAULT 1.5,
  yield_unit VARCHAR(30) DEFAULT 'kg',
  default_price_per_unit NUMERIC(10,2) DEFAULT 50.00,
  seeds_per_oz_gram NUMERIC(10,2),
  tray_size VARCHAR(50) DEFAULT '72-cell',
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure columns exist on vivas_plantings
ALTER TABLE vivas_plantings ALTER COLUMN planting_date DROP NOT NULL;
ALTER TABLE vivas_plantings ALTER COLUMN area_planted DROP NOT NULL;
ALTER TABLE vivas_plantings ALTER COLUMN field_name DROP NOT NULL;

ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS planting_id VARCHAR(50);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS crop_id UUID;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS variety_id UUID;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS variety_name VARCHAR(150);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS harvest_stage VARCHAR(50) DEFAULT 'Mature';
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS planting_type VARCHAR(50) DEFAULT 'Transplant';
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS season_year INT DEFAULT 2026;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS sow_date DATE;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS plant_date DATE;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS first_harvest_date DATE;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS last_harvest_date DATE;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS location_id INT;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS location_name VARCHAR(150);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS bed_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS bed_names VARCHAR(255);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS bed_feet NUMERIC(10,2) DEFAULT 100.0;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS row_feet NUMERIC(10,2);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS rows_per_bed INT DEFAULT 2;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS in_row_spacing_in NUMERIC(6,2) DEFAULT 12.0;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS gps_lat NUMERIC(11,8);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS gps_lng NUMERIC(11,8);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS target_yield NUMERIC(12,2);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS yield_unit VARCHAR(30) DEFAULT 'kg';
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS estimated_revenue NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS actual_yield NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'planned';
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS seed_vendor VARCHAR(150);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS seed_lot VARCHAR(100);
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS tray_count INT DEFAULT 1;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vivas_plantings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Harvest Plans Table
CREATE TABLE IF NOT EXISTS vivas_harvest_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_id UUID REFERENCES vivas_plantings(id) ON DELETE SET NULL,
  crop_name VARCHAR(150) NOT NULL,
  variety_name VARCHAR(150),
  harvest_stage VARCHAR(50) DEFAULT 'Mature',
  harvest_date DATE NOT NULL,
  location_name VARCHAR(150),
  bed_names VARCHAR(255),
  in_storage_qty NUMERIC(10,2) DEFAULT 0.0,
  current_yield_est NUMERIC(10,2) DEFAULT 0.0,
  total_available_qty NUMERIC(10,2) DEFAULT 0.0,
  pending_orders_qty NUMERIC(10,2) DEFAULT 0.0,
  planned_qty NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  unit VARCHAR(30) DEFAULT 'kg',
  container_type VARCHAR(100) DEFAULT 'Standard Crate',
  container_count INT DEFAULT 1,
  assignee VARCHAR(150),
  order_value NUMERIC(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'scheduled',
  actual_harvested_qty NUMERIC(10,2) DEFAULT 0.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED CROPS & VARIETIES
-- ============================================================

DELETE FROM vivas_harvest_plans;
DELETE FROM vivas_crop_varieties;
DELETE FROM vivas_crops;

-- 1. Tomatoes
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c1111111-1111-1111-1111-111111111111', 'Tomatoes', 'Heirloom & Slicing Tomatoes', 'TOM', 'Solanaceae', 'Solanum', 'lycopersicum', 'Vegetables', '🍅', '#d32f2f', 'Warm-season tender perennial grown as annual for high-yield fresh fruit and sauces.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c1111111-1111-1111-1111-111111111111', 'Roma VF', 'Johnny''s Selected Seeds', 75, 7, 'Mature', 'Transplant', 18.0, 36.0, 1, 3.2, 'kg', 60.00, '72-cell'),
('c1111111-1111-1111-1111-111111111111', 'San Marzano', 'High Mowing Seeds', 80, 8, 'Mature', 'Transplant', 18.0, 36.0, 1, 3.5, 'kg', 80.00, '72-cell'),
('c1111111-1111-1111-1111-111111111111', 'Cherry Sweet 100', 'Territorial Seed', 65, 6, 'Mature', 'Transplant', 24.0, 36.0, 1, 4.0, 'kg', 120.00, '72-cell');

-- 2. Bell Peppers
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c2222222-2222-2222-2222-222222222222', 'Bell Peppers', 'Sweet Bell & Specialty Peppers', 'PEP', 'Solanaceae', 'Capsicum', 'annuum', 'Vegetables', '🫑', '#388e3c', 'Sweet, crisp peppers high in vitamins C and A, ideal for fresh market sales.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c2222222-2222-2222-2222-222222222222', 'California Wonder', 'Baker Creek', 75, 10, 'Mature', 'Transplant', 12.0, 18.0, 2, 2.0, 'kg', 75.00, '128-cell'),
('c2222222-2222-2222-2222-222222222222', 'King of the North', 'Fedco Seeds', 68, 9, 'Mature', 'Transplant', 12.0, 18.0, 2, 2.2, 'kg', 90.00, '128-cell');

-- 3. Spinach
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c3333333-3333-3333-3333-333333333333', 'Spinach', 'Baby & Bunching Spinach', 'SPN', 'Amaranthaceae', 'Spinacia', 'oleracea', 'Greens', '🍃', '#2e7d32', 'Cool-season leafy green packed with iron, nutrients, and fast turnover cycles.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c3333333-3333-3333-3333-333333333333', 'Bloomsdale Long Standing', 'Johnny''s Selected Seeds', 45, 5, 'Baby', 'Direct Seed', 2.0, 4.0, 5, 1.2, 'kg', 90.00, 'Direct Seed'),
('c3333333-3333-3333-3333-333333333333', 'Space F1', 'High Mowing Seeds', 40, 4, 'Bunch', 'Direct Seed', 3.0, 6.0, 4, 1.8, 'bunches', 40.00, 'Direct Seed');

-- 4. Lettuce
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c4444444-4444-4444-4444-444444444444', 'Lettuce', 'Crisphead & Salanova Lettuce', 'LET', 'Asteraceae', 'Lactuca', 'sativa', 'Greens', '🥬', '#43a047', 'Crisp, tender salad green with rapid rotation cycles for steady year-round revenue.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c4444444-4444-4444-4444-444444444444', 'Buttercrunch', 'Territorial Seed', 50, 4, 'Head', 'Transplant', 8.0, 10.0, 3, 1.5, 'heads', 50.00, '200-cell'),
('c4444444-4444-4444-4444-444444444444', 'Red Salad Bowl', 'Johnny''s Selected Seeds', 42, 3, 'Baby', 'Direct Seed', 2.0, 4.0, 5, 1.0, 'kg', 110.00, 'Direct Seed');

-- 5. Carrots
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c5555555-5555-5555-5555-555555555555', 'Carrots', 'Nantes & Sweet Storage Carrots', 'CAR', 'Apiaceae', 'Daucus', 'carota', 'Roots', '🥕', '#ef6c00', 'Deep orange, sweet root crop suitable for bunches and long-term cold storage.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c5555555-5555-5555-5555-555555555555', 'Nelson F1', 'Bejo Seeds', 58, 10, 'Bunch', 'Direct Seed', 1.5, 4.0, 4, 2.5, 'bunches', 45.00, 'Direct Seed'),
('c5555555-5555-5555-5555-555555555555', 'Bolero', 'Johnny''s Selected Seeds', 75, 12, 'Mature', 'Direct Seed', 2.0, 4.0, 4, 3.0, 'kg', 55.00, 'Direct Seed');

-- 6. Cucumbers
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c6666666-6666-6666-6666-666666666666', 'Cucumbers', 'Marketmore & Greenhouse Cukes', 'CUK', 'Cucurbitaceae', 'Cucumis', 'sativus', 'Vegetables', '🥒', '#1b5e20', 'High-yielding warm season vine produce with continuous harvest over 6-8 weeks.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c6666666-6666-6666-6666-666666666666', 'Marketmore 76', 'Fedco Seeds', 58, 6, 'Mature', 'Transplant', 12.0, 24.0, 1, 3.8, 'kg', 45.00, '72-cell'),
('c6666666-6666-6666-6666-666666666666', 'Diva', 'Johnny''s Selected Seeds', 52, 5, 'Baby', 'Transplant', 12.0, 24.0, 1, 4.2, 'kg', 70.00, '72-cell');

-- 7. Strawberries
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c7777777-7777-7777-7777-777777777777', 'Strawberries', 'Ever-bearing & Day-Neutral Berries', 'STR', 'Rosaceae', 'Fragaria', 'ananassa', 'Fruits', '🍓', '#c2185b', 'High-value perennial berries with premium wholesale and CSA market appeal.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c7777777-7777-7777-7777-777777777777', 'Albion', 'Nourse Farms', 90, 14, 'Mature', 'Transplant', 12.0, 12.0, 2, 2.0, 'kg', 250.00, '50-cell');

-- 8. Kale
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c8888888-8888-8888-8888-888888888888', 'Kale', 'Lacinato & Curly Kale', 'KLE', 'Brassicaceae', 'Brassica', 'oleracea', 'Greens', '🥬', '#004d40', 'Hardy superfood green yielding multiple leaf harvests per plant throughout the season.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c8888888-8888-8888-8888-888888888888', 'Darkibor F1', 'Bejo Seeds', 55, 5, 'Bunch', 'Transplant', 12.0, 18.0, 2, 2.4, 'bunches', 50.00, '128-cell'),
('c8888888-8888-8888-8888-888888888888', 'Lacinato Dino', 'High Mowing Seeds', 60, 5, 'Bunch', 'Transplant', 12.0, 18.0, 2, 2.2, 'bunches', 60.00, '128-cell');

-- 9. Sweet Corn
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('c9999999-9999-9999-9999-999999999999', 'Sweet Corn', 'Bi-color & Sugar-Enhanced Corn', 'CRN', 'Poaceae', 'Zea', 'mays', 'Vegetables', '🌽', '#fbc02d', 'Sweet, tender ears with concentrated summer harvest window and bulk volume demand.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('c9999999-9999-9999-9999-999999999999', 'Peaches and Cream', 'Johnny''s Selected Seeds', 70, 7, 'Mature', 'Direct Seed', 8.0, 24.0, 2, 2.0, 'ears', 20.00, 'Direct Seed');

-- 10. Basil
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active)
VALUES ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Basil', 'Genovese & Sweet Italian Basil', 'BSL', 'Lamiaceae', 'Ocimum', 'basilicum', 'Herbs', '🌿', '#00796b', 'Aromatic culinary herb providing continuous weekly cutting yields in warm conditions.', TRUE);

INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
VALUES
('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Genovese', 'High Mowing Seeds', 45, 6, 'Bunch', 'Transplant', 8.0, 12.0, 3, 1.8, 'bunches', 40.00, '128-cell');

-- ============================================================
-- SEED SAMPLE PLANTINGS FOR CROP PLAN (SEASON 2026)
-- ============================================================

INSERT INTO vivas_plantings (
  id, planting_id, crop_id, crop_name, variety_id, variety_name, harvest_stage, planting_type,
  season_year, sow_date, plant_date, planting_date, first_harvest_date, last_harvest_date,
  location_id, location_name, bed_names, bed_feet, row_feet, rows_per_bed, in_row_spacing_in,
  gps_lat, gps_lng, target_yield, yield_unit, estimated_revenue, unit_price, status, seed_vendor, tray_count, notes, area_planted, field_name
)
VALUES
(
  'd1111111-1111-1111-1111-111111111111', 'PL-2026-TOM-01', 'c1111111-1111-1111-1111-111111111111', 'Tomatoes',
  (SELECT id FROM vivas_crop_varieties WHERE variety_name = 'Roma VF' LIMIT 1), 'Roma VF', 'Mature', 'Transplant',
  2026, '2026-02-15', '2026-04-01', '2026-04-01', '2026-06-15', '2026-08-30',
  1, 'Greenhouse Block A', 'Bed 1, Bed 2', 120.0, 240.0, 2, 18.0,
  12.97160000, 77.59460000, 384.0, 'kg', 23040.00, 60.00, 'in_ground', 'Johnny''s Selected Seeds', 4, 'High priority crop for main CSA market.', 0.25, 'Greenhouse Block A'
),
(
  'd2222222-2222-2222-2222-222222222222', 'PL-2026-PEP-01', 'c2222222-2222-2222-2222-222222222222', 'Bell Peppers',
  (SELECT id FROM vivas_crop_varieties WHERE variety_name = 'California Wonder' LIMIT 1), 'California Wonder', 'Mature', 'Transplant',
  2026, '2026-02-20', '2026-04-10', '2026-04-10', '2026-06-25', '2026-09-15',
  1, 'Greenhouse Block A', 'Bed 3, Bed 4', 100.0, 200.0, 2, 12.0,
  12.97160000, 77.59460000, 200.0, 'kg', 15000.00, 75.00, 'in_ground', 'Baker Creek', 3, 'Transplanted under drip irrigation with trellis netting.', 0.20, 'Greenhouse Block A'
),
(
  'd3333333-3333-3333-3333-333333333333', 'PL-2026-SPN-01', 'c3333333-3333-3333-3333-333333333333', 'Spinach',
  (SELECT id FROM vivas_crop_varieties WHERE variety_name = 'Bloomsdale Long Standing' LIMIT 1), 'Bloomsdale Long Standing', 'Baby', 'Direct Seed',
  2026, '2026-03-01', '2026-03-01', '2026-03-01', '2026-04-15', '2026-05-15',
  2, 'Outdoor Bed Section 1', 'Bed 1', 80.0, 400.0, 5, 2.0,
  12.97200000, 77.59500000, 96.0, 'kg', 8640.00, 90.00, 'harvesting', 'Johnny''s Selected Seeds', 0, 'Direct seeded with Jang Seeder.', 0.15, 'Outdoor Bed Section 1'
),
(
  'd4444444-4444-4444-4444-444444444444', 'PL-2026-LET-01', 'c4444444-4444-4444-4444-444444444444', 'Lettuce',
  (SELECT id FROM vivas_crop_varieties WHERE variety_name = 'Buttercrunch' LIMIT 1), 'Buttercrunch', 'Head', 'Transplant',
  2026, '2026-03-10', '2026-04-05', '2026-04-05', '2026-05-25', '2026-06-30',
  2, 'Outdoor Bed Section 1', 'Bed 2', 80.0, 240.0, 3, 8.0,
  12.97200000, 77.59500000, 120.0, 'heads', 6000.00, 50.00, 'in_ground', 'Territorial Seed', 2, 'Paperpot transplanter 6 inch chain.', 0.15, 'Outdoor Bed Section 1'
),
(
  'd5555555-5555-5555-5555-555555555555', 'PL-2026-KLE-01', 'c8888888-8888-8888-8888-888888888888', 'Kale',
  (SELECT id FROM vivas_crop_varieties WHERE variety_name = 'Darkibor F1' LIMIT 1), 'Darkibor F1', 'Bunch', 'Transplant',
  2026, '2026-03-15', '2026-04-20', '2026-04-20', '2026-06-10', '2026-10-30',
  3, 'Hoop House B', 'Bed 1, Bed 2', 60.0, 120.0, 2, 12.0,
  12.97100000, 77.59420000, 144.0, 'bunches', 7200.00, 50.00, 'in_ground', 'Bejo Seeds', 2, 'Bi-weekly harvest planned for restaurant orders.', 0.10, 'Hoop House B'
)
ON CONFLICT (id) DO UPDATE SET
  planting_id = EXCLUDED.planting_id,
  crop_id = EXCLUDED.crop_id,
  crop_name = EXCLUDED.crop_name,
  variety_id = EXCLUDED.variety_id,
  variety_name = EXCLUDED.variety_name,
  harvest_stage = EXCLUDED.harvest_stage,
  planting_type = EXCLUDED.planting_type,
  season_year = EXCLUDED.season_year,
  sow_date = EXCLUDED.sow_date,
  plant_date = EXCLUDED.plant_date,
  planting_date = EXCLUDED.planting_date,
  first_harvest_date = EXCLUDED.first_harvest_date,
  last_harvest_date = EXCLUDED.last_harvest_date,
  location_id = EXCLUDED.location_id,
  location_name = EXCLUDED.location_name,
  bed_names = EXCLUDED.bed_names,
  bed_feet = EXCLUDED.bed_feet,
  row_feet = EXCLUDED.row_feet,
  rows_per_bed = EXCLUDED.rows_per_bed,
  in_row_spacing_in = EXCLUDED.in_row_spacing_in,
  gps_lat = EXCLUDED.gps_lat,
  gps_lng = EXCLUDED.gps_lng,
  target_yield = EXCLUDED.target_yield,
  yield_unit = EXCLUDED.yield_unit,
  estimated_revenue = EXCLUDED.estimated_revenue,
  unit_price = EXCLUDED.unit_price,
  status = EXCLUDED.status,
  seed_vendor = EXCLUDED.seed_vendor,
  tray_count = EXCLUDED.tray_count,
  notes = EXCLUDED.notes;

-- ============================================================
-- SEED SAMPLE HARVEST PLANS
-- ============================================================

INSERT INTO vivas_harvest_plans (
  planting_id, crop_name, variety_name, harvest_stage, harvest_date, location_name, bed_names,
  in_storage_qty, current_yield_est, total_available_qty, pending_orders_qty, planned_qty, unit,
  container_type, container_count, assignee, order_value, status
)
VALUES
(
  'd3333333-3333-3333-3333-333333333333', 'Spinach', 'Bloomsdale Long Standing', 'Baby', CURRENT_DATE,
  'Outdoor Bed Section 1', 'Bed 1', 12.0, 25.0, 37.0, 20.0, 20.0, 'kg',
  'Green Harvest Tote', 4, 'Ramesh Kumar', 1800.00, 'scheduled'
),
(
  'd1111111-1111-1111-1111-111111111111', 'Tomatoes', 'Roma VF', 'Mature', CURRENT_DATE,
  'Greenhouse Block A', 'Bed 1', 30.0, 45.0, 75.0, 40.0, 40.0, 'kg',
  'Orange Heavy Crate', 5, 'Suresh Patel', 2400.00, 'scheduled'
),
(
  'd5555555-5555-5555-5555-555555555555', 'Kale', 'Darkibor F1', 'Bunch', CURRENT_DATE + INTERVAL '1 day',
  'Hoop House B', 'Bed 1', 5.0, 30.0, 35.0, 25.0, 25.0, 'bunches',
  'Yellow Open Crate', 3, 'Kavya Reddy', 1250.00, 'scheduled'
),
(
  'd4444444-4444-4444-4444-444444444444', 'Lettuce', 'Buttercrunch', 'Head', CURRENT_DATE + INTERVAL '2 days',
  'Outdoor Bed Section 1', 'Bed 2', 0.0, 35.0, 35.0, 30.0, 30.0, 'heads',
  'Lg Waxed Box', 3, 'Anand Verma', 1500.00, 'scheduled'
);

