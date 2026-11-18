-- Phase 2 Consolidation & Schema Drift Migration
-- Vivas AI: Database Integrity, Foreign Keys, Missing Tables, Missing Columns & Performance Indexes

-- 1. Ensure Migration Tracking Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  batch INTEGER NOT NULL DEFAULT 1
);

-- 2. Schema Drift Fixes: vivas_farm_map_items & vivas_farm_map_beds
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vivas_farm_map_items' AND column_name = 'parent_id') THEN
    ALTER TABLE vivas_farm_map_items ADD COLUMN parent_id integer REFERENCES vivas_farm_map_items(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vivas_farm_map_items' AND column_name = 'farm_id') THEN
    ALTER TABLE vivas_farm_map_items ADD COLUMN farm_id uuid REFERENCES vivas_farms(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vivas_farms' AND column_name = 'name') THEN
    ALTER TABLE vivas_farms ADD COLUMN name varchar(255);
    UPDATE vivas_farms SET name = farm_name WHERE name IS NULL;
  END IF;
END $$;

-- 3. Schema Drift Fixes: Crop Health & Agri-Input Hub Lookups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ch_problem' AND column_name = 'default_severity') THEN
    ALTER TABLE ch_problem ADD COLUMN default_severity varchar(50) DEFAULT 'MODERATE';
    UPDATE ch_problem SET default_severity = COALESCE(potential_severity, 'MODERATE') WHERE default_severity IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ch_problem' AND column_name = 'is_active') THEN
    ALTER TABLE ch_problem ADD COLUMN is_active boolean DEFAULT true;
    UPDATE ch_problem SET is_active = true WHERE is_active IS NULL;
  END IF;
END $$;

-- 4. Schema Drift Fixes: Orders & Sales Reporting Columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vivas_orders' AND column_name = 'sales_channel') THEN
    ALTER TABLE vivas_orders ADD COLUMN sales_channel varchar(100);
    UPDATE vivas_orders SET sales_channel = COALESCE(sales_channel_name, 'Direct Farm Retail') WHERE sales_channel IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vivas_orders' AND column_name = 'crop_name') THEN
    ALTER TABLE vivas_orders ADD COLUMN crop_name varchar(150);
    UPDATE vivas_orders o SET crop_name = (
      SELECT crop_name FROM vivas_order_items oi WHERE oi.order_id = o.id LIMIT 1
    ) WHERE crop_name IS NULL;
    UPDATE vivas_orders SET crop_name = 'Mixed Produce' WHERE crop_name IS NULL;
  END IF;
END $$;

-- 5. Missing Analytics & Reporting Tables
CREATE TABLE IF NOT EXISTS vivas_harvest_logs (
  id SERIAL PRIMARY KEY,
  harvest_plan_id integer,
  planting_id varchar(100),
  crop_name varchar(150) NOT NULL,
  variety_name varchar(150),
  field_location varchar(150),
  bed_names varchar(255),
  harvest_quantity_kg numeric(12,2) DEFAULT 0,
  planned_yield_kg numeric(12,2) DEFAULT 0,
  quality_grade varchar(50) DEFAULT 'Grade A',
  harvest_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vivas_time_logs (
  id SERIAL PRIMARY KEY,
  worker_name varchar(150) NOT NULL,
  task_type varchar(100) DEFAULT 'Field Work',
  crop_name varchar(150),
  field_location varchar(150),
  total_hours numeric(8,2) DEFAULT 0,
  labor_cost numeric(12,2) DEFAULT 0,
  work_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vivas_materials_inputs (
  id SERIAL PRIMARY KEY,
  name varchar(200) NOT NULL,
  input_type varchar(100) DEFAULT 'General',
  units_in_stock numeric(12,2) DEFAULT 0,
  estimated_unit_cost numeric(12,2) DEFAULT 0,
  unit varchar(50) DEFAULT 'units',
  created_at timestamp with time zone DEFAULT NOW()
);

-- 6. Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vivas_orders_sales_channel ON vivas_orders(sales_channel);
CREATE INDEX IF NOT EXISTS idx_vivas_orders_status ON vivas_orders(status);
CREATE INDEX IF NOT EXISTS idx_vivas_farm_map_parent ON vivas_farm_map_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_vivas_farm_map_farm ON vivas_farm_map_items(farm_id);
CREATE INDEX IF NOT EXISTS idx_vivas_harvest_logs_crop ON vivas_harvest_logs(crop_name);
CREATE INDEX IF NOT EXISTS idx_vivas_harvest_logs_date ON vivas_harvest_logs(harvest_date);
CREATE INDEX IF NOT EXISTS idx_vivas_time_logs_worker ON vivas_time_logs(worker_name);
CREATE INDEX IF NOT EXISTS idx_vivas_time_logs_date ON vivas_time_logs(work_date);
CREATE INDEX IF NOT EXISTS idx_ch_problem_active ON ch_problem(is_active);

-- 7. Seed Initial Synced Records if empty
INSERT INTO vivas_harvest_logs (planting_id, crop_name, variety_name, field_location, harvest_quantity_kg, planned_yield_kg, quality_grade, harvest_date)
SELECT planting_id, crop_name, variety_name, location_name, COALESCE(actual_harvested_qty, planned_qty, 100), COALESCE(planned_qty, 100), 'Grade A', COALESCE(harvest_date, CURRENT_DATE)
FROM vivas_harvest_plans
WHERE NOT EXISTS (SELECT 1 FROM vivas_harvest_logs LIMIT 1);

INSERT INTO vivas_time_logs (worker_name, task_type, crop_name, field_location, total_hours, labor_cost, work_date)
SELECT worker_name, task_type, crop_name, field_location, COALESCE(total_hours, 8), COALESCE(total_labor_cost, 8 * COALESCE(hourly_rate, 25)), COALESCE(work_date, CURRENT_DATE)
FROM vivas_labor_timesheets
WHERE NOT EXISTS (SELECT 1 FROM vivas_time_logs LIMIT 1);

INSERT INTO vivas_materials_inputs (name, input_type, units_in_stock, estimated_unit_cost, unit)
SELECT name, input_type, COALESCE(quantity_on_hand, 50), COALESCE(unit_cost, 12), unit
FROM vivas_inputs_inventory
WHERE NOT EXISTS (SELECT 1 FROM vivas_materials_inputs LIMIT 1);
