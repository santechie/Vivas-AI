-- Migration script for Vivas AI Reports & Analytics Module

CREATE TABLE IF NOT EXISTS vivas_saved_reports (
  id SERIAL PRIMARY KEY,
  report_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General', -- 'Yield', 'Sales', 'Labor', 'Financials', 'Inputs', 'General'
  description TEXT,
  filters_json JSONB DEFAULT '{}'::jsonb,
  metrics_json JSONB DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(150) DEFAULT 'Farm Manager',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vivas_report_snapshots (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES vivas_saved_reports(id) ON DELETE CASCADE,
  report_name VARCHAR(255) NOT NULL,
  date_range VARCHAR(100) DEFAULT 'This Month',
  summary_json JSONB DEFAULT '{}'::jsonb,
  generated_by VARCHAR(150) DEFAULT 'System Automated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_saved_reports_category ON vivas_saved_reports(category);
CREATE INDEX IF NOT EXISTS idx_saved_reports_favorite ON vivas_saved_reports(is_favorite);

-- Seed Initial Default Saved Reports if table is empty
INSERT INTO vivas_saved_reports (report_name, category, description, filters_json, metrics_json, is_favorite, created_by)
SELECT 'Weekly Harvest Yield & Variance Report', 'Yield', 'Track planned vs actual harvest yields by crop variety and bed foot capacity', '{"crop": "All", "date_range": "This Month"}'::jsonb, '["harvest_weight", "planned_yield", "yield_variance", "quality_grade"]'::jsonb, true, 'Head Grower'
WHERE NOT EXISTS (SELECT 1 FROM vivas_saved_reports WHERE report_name = 'Weekly Harvest Yield & Variance Report');

INSERT INTO vivas_saved_reports (report_name, category, description, filters_json, metrics_json, is_favorite, created_by)
SELECT 'Sales Revenue by Distribution Channel', 'Sales', 'Channel revenue breakdown across wholesale distributors, restaurant direct, and CSA', '{"channel": "All", "date_range": "Year-to-Date"}'::jsonb, '["gross_revenue", "order_count", "average_order_value"]'::jsonb, true, 'Sales Manager'
WHERE NOT EXISTS (SELECT 1 FROM vivas_saved_reports WHERE report_name = 'Sales Revenue by Distribution Channel');

INSERT INTO vivas_saved_reports (report_name, category, description, filters_json, metrics_json, is_favorite, created_by)
SELECT 'Labor Hours & Cost Allocation by Crop', 'Labor', 'Detailed breakdown of worker hours and labor costs spent per crop and task type', '{"task_type": "All", "date_range": "This Month"}'::jsonb, '["total_hours", "labor_cost", "cost_per_crop"]'::jsonb, true, 'Operations Manager'
WHERE NOT EXISTS (SELECT 1 FROM vivas_saved_reports WHERE report_name = 'Labor Hours & Cost Allocation by Crop');

INSERT INTO vivas_saved_reports (report_name, category, description, filters_json, metrics_json, is_favorite, created_by)
SELECT 'Executive P&L and Crop Enterprise Margins', 'Financials', 'Complete Profit & Loss overview with direct input costs, overhead, and net margin %', '{"date_range": "Year-to-Date"}'::jsonb, '["gross_revenue", "cogs", "gross_profit", "operating_expenses", "net_profit", "margin_pct"]'::jsonb, true, 'General Manager'
WHERE NOT EXISTS (SELECT 1 FROM vivas_saved_reports WHERE report_name = 'Executive P&L and Crop Enterprise Margins');

INSERT INTO vivas_saved_reports (report_name, category, description, filters_json, metrics_json, is_favorite, created_by)
SELECT 'Material Inputs & Fertilizer Usage Log', 'Inputs', 'Consumption audit of seeds, organic fertilizers, plant protection chemicals, and tray capacities', '{"date_range": "This Month"}'::jsonb, '["item_name", "quantity_used", "total_cost", "storage_location"]'::jsonb, false, 'Inventory Lead'
WHERE NOT EXISTS (SELECT 1 FROM vivas_saved_reports WHERE report_name = 'Material Inputs & Fertilizer Usage Log');
