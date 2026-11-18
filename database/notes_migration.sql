-- ============================================================
-- VIVAS AI - NOTES & OBSERVATIONS EXTENDED MODULES MIGRATION
-- ============================================================

-- Create Soil Tests Table
CREATE TABLE IF NOT EXISTS vivas_soil_tests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  crop_category  VARCHAR(100),
  crop           VARCHAR(100),
  location       VARCHAR(150),
  author_name    VARCHAR(150) NOT NULL,
  note_year      INT DEFAULT 2026,
  ph             NUMERIC(4,2),
  nitrogen       NUMERIC(5,2), -- ppm
  phosphorus     NUMERIC(5,2), -- ppm
  potassium      NUMERIC(5,2), -- ppm
  content        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Create Completed Tasks Records Table
CREATE TABLE IF NOT EXISTS vivas_completed_tasks_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  crop_category  VARCHAR(100),
  crop           VARCHAR(100),
  location       VARCHAR(150),
  author_name    VARCHAR(150) NOT NULL,
  note_year      INT DEFAULT 2026,
  hours_spent    NUMERIC(5,2),
  content        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Create Expenses Table
CREATE TABLE IF NOT EXISTS vivas_expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  crop_category  VARCHAR(100),
  crop           VARCHAR(100),
  location       VARCHAR(150),
  author_name    VARCHAR(150) NOT NULL,
  note_year      INT DEFAULT 2026,
  amount         NUMERIC(12,2) DEFAULT 0.00,
  content        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Values
INSERT INTO vivas_soil_tests (title, crop_category, crop, location, author_name, note_year, ph, nitrogen, phosphorus, potassium, content)
VALUES 
('Spring Soil Test Greenhouse 1', 'Vegetables', 'Heirloom Tomatoes', 'Greenhouse 1 - Row A', 'Alice Johnson', 2026, 6.5, 45.2, 12.5, 34.1, 'Soil pH is optimal. Nitrogen levels are slightly low; recommend adding organic compost before next planting cycle.')
ON CONFLICT DO NOTHING;

INSERT INTO vivas_completed_tasks_records (title, crop_category, crop, location, author_name, note_year, hours_spent, content)
VALUES 
('Weeding Greenhouse 2 Row B', 'Herbs', 'Sweet Basil', 'Greenhouse 2 - Row B', 'Bob Smith', 2026, 2.5, 'Completed hand weeding along the basil starter beds. Seedlings look strong and healthy.')
ON CONFLICT DO NOTHING;

INSERT INTO vivas_expenses (title, crop_category, crop, location, author_name, note_year, amount, content)
VALUES 
('Greenhouse 3 Drip Tape Purchase', 'Vegetables', 'Cucumbers', 'Greenhouse 3 - Row A', 'Vivas Owner', 2026, 120.50, 'Purchased 500ft of heavy duty drip irrigation tape for Cucumber rows.')
ON CONFLICT DO NOTHING;
