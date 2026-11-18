-- ============================================================
-- VIVAS AI - INTELLIGENCE FOR LIVING AGRICULTURE
-- POSTGRESQL DATABASE SCHEMA
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Widget Configuration Table
CREATE TABLE IF NOT EXISTS vivas_widget_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_key  VARCHAR(50) UNIQUE NOT NULL,
  title       VARCHAR(100) NOT NULL,
  is_visible  BOOLEAN DEFAULT TRUE,
  position    INT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table (Greenhouse Sow, Field Plantings, Harvest, Today's Tasks)
-- Extended with rich filters: planting_type, crop, variety, harvest_stage, location_type, location, priority, tag, planting_id, equipment
CREATE TABLE IF NOT EXISTS vivas_farm_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name     VARCHAR(255) NOT NULL,
  task_type     VARCHAR(50) NOT NULL, -- 'greenhouse_sow', 'field_planting', 'harvest', 'today_task'
  status        VARCHAR(30) DEFAULT 'incomplete', -- 'complete', 'incomplete'
  due_date      DATE NOT NULL,
  assigned_to   VARCHAR(150),
  planting_type VARCHAR(100),
  crop          VARCHAR(100),
  variety       VARCHAR(100),
  harvest_stage VARCHAR(100),
  location_type VARCHAR(100),
  location      VARCHAR(150),
  priority      VARCHAR(50) DEFAULT 'Medium',
  tag           VARCHAR(100),
  planting_id   VARCHAR(50),
  equipment     VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Committed Orders Table
CREATE TABLE IF NOT EXISTS vivas_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no    VARCHAR(50) UNIQUE NOT NULL,
  status      VARCHAR(30) DEFAULT 'not_fulfilled', -- 'fulfilled', 'not_fulfilled'
  amount      NUMERIC(12,2) DEFAULT 0.00,
  order_date  DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Yield Estimation Data
CREATE TABLE IF NOT EXISTS vivas_crop_yields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name   VARCHAR(100) NOT NULL,
  estimated_value NUMERIC(12,2) DEFAULT 0.00,
  actual_value    NUMERIC(12,2) DEFAULT 0.00,
  harvest_date DATE NOT NULL
);

-- Labor Hours Data
CREATE TABLE IF NOT EXISTS vivas_labor_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name VARCHAR(150) NOT NULL,
  hours_worked NUMERIC(5,2) NOT NULL,
  work_date   DATE NOT NULL
);

-- Planting Summary
CREATE TABLE IF NOT EXISTS vivas_plantings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name  VARCHAR(150) NOT NULL,
  crop_name   VARCHAR(100) NOT NULL,
  area_planted NUMERIC(8,2) NOT NULL, -- in acres
  planting_date DATE NOT NULL
);

-- Greenhouse Sow Summary
CREATE TABLE IF NOT EXISTS vivas_greenhouse_sows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  greenhouse  VARCHAR(150) NOT NULL,
  crop_name   VARCHAR(100) NOT NULL,
  tray_count  INT NOT NULL,
  sow_date    DATE NOT NULL
);

-- Notes and Observations Table
CREATE TABLE IF NOT EXISTS vivas_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  note_type      VARCHAR(50) DEFAULT 'Notes', -- 'Notes', 'Observations'
  crop_category  VARCHAR(100),
  crop           VARCHAR(100),
  location       VARCHAR(150),
  author_name    VARCHAR(150) NOT NULL,
  note_year      INT DEFAULT 2026,
  content        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
