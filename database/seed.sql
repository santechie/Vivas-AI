-- ============================================================
-- VIVAS AI - INTELLIGENCE FOR LIVING AGRICULTURE
-- POSTGRESQL SEED DATA WITH FILTER CRITERIA
-- ============================================================

-- Clean old data
TRUNCATE TABLE vivas_widget_configs CASCADE;
TRUNCATE TABLE vivas_farm_tasks CASCADE;
TRUNCATE TABLE vivas_orders CASCADE;
TRUNCATE TABLE vivas_crop_yields CASCADE;
TRUNCATE TABLE vivas_labor_hours CASCADE;
TRUNCATE TABLE vivas_plantings CASCADE;
TRUNCATE TABLE vivas_greenhouse_sows CASCADE;
TRUNCATE TABLE vivas_notes CASCADE;

-- Insert default widget configs
INSERT INTO vivas_widget_configs (widget_key, title, is_visible, position) VALUES
('greenhouse_sow_kpi', 'Planned Greenhouse Sow Tasks', true, 1),
('field_planting_kpi', 'Planned Field Plantings Tasks', true, 2),
('harvest_kpi', 'Planned Harvest Tasks', true, 3),
('orders_kpi', 'Committed Orders', true, 4),
('yield_chart', 'Est Yield Value by Crop', true, 5),
('completion_chart', 'Task Completion Status', true, 6),
('labor_chart', 'Est Labor Hours by Person', true, 7),
('planting_summary_table', 'New Field Planting Summary', true, 8),
('sow_summary_table', 'Greenhouse Sow Summary', true, 9),
('weather_widget', 'Weather Widget', true, 10),
('today_tasks_widget', 'Tasks to do today', true, 11);

-- Insert farm tasks with rich filter values
-- Greenhouse Sow tasks: 4 complete, 2 incomplete
INSERT INTO vivas_farm_tasks (
  task_name, task_type, status, due_date, assigned_to, 
  planting_type, crop, variety, harvest_stage, location_type, 
  location, priority, tag, planting_id, equipment
) VALUES
('Sow organic heirloom tomatoes', 'greenhouse_sow', 'complete', CURRENT_DATE, 'Alice Johnson', 
 'Starter Trays', 'Heirloom Tomatoes', 'Red Cherry', 'N/A', 'Greenhouse', 
 'Greenhouse 1 - Row A', 'Medium', 'Organic', 'PL-2026-01', 'Seeder'),

('Sow organic sweet basil', 'greenhouse_sow', 'complete', CURRENT_DATE - 1, 'Bob Smith', 
 'Starter Trays', 'Sweet Basil', 'Genovese', 'N/A', 'Greenhouse', 
 'Greenhouse 2 - Row B', 'Low', 'Organic', 'PL-2026-02', 'Seeder'),

('Sow romaine lettuce trays', 'greenhouse_sow', 'complete', CURRENT_DATE - 2, 'Carol Danvers', 
 'Starter Trays', 'Romaine Lettuce', 'Butterhead', 'N/A', 'Greenhouse', 
 'Greenhouse 2 - Row A', 'High', 'Standard', 'PL-2026-03', 'Seeder'),

('Sow bell peppers', 'greenhouse_sow', 'complete', CURRENT_DATE - 3, 'David Miller', 
 'Starter Trays', 'Bell Peppers', 'California Wonder', 'N/A', 'Greenhouse', 
 'Greenhouse 1 - Row B', 'Medium', 'Premium', 'PL-2026-04', 'Seeder'),

('Sow jalapeño peppers', 'greenhouse_sow', 'incomplete', CURRENT_DATE + 1, 'Alice Johnson', 
 'Starter Trays', 'Jalapeno Peppers', 'Early Jalapeno', 'N/A', 'Greenhouse', 
 'Greenhouse 3 - Row A', 'Medium', 'Premium', 'PL-2026-05', 'Seeder'),

('Sow cucumber starter trays', 'greenhouse_sow', 'incomplete', CURRENT_DATE + 2, 'Bob Smith', 
 'Starter Trays', 'Cucumbers', 'Marketmore', 'N/A', 'Greenhouse', 
 'Greenhouse 3 - Row B', 'Low', 'Standard', 'PL-2026-06', 'Seeder');

-- Field Planting tasks: 3 complete, 5 incomplete
INSERT INTO vivas_farm_tasks (
  task_name, task_type, status, due_date, assigned_to, 
  planting_type, crop, variety, harvest_stage, location_type, 
  location, priority, tag, planting_id, equipment
) VALUES
('Transplant kale seedlings to Sector A', 'field_planting', 'complete', CURRENT_DATE, 'Alice Johnson', 
 'Transplant', 'Kale', 'Lacinato', 'N/A', 'Sector Field', 
 'North Field - Sec A', 'Medium', 'Organic', 'PL-2026-07', 'Rototiller'),

('Plant sweet corn rows in Sector B', 'field_planting', 'complete', CURRENT_DATE - 1, 'David Miller', 
 'Direct Seed', 'Sweet Corn', 'Super Sweet', 'N/A', 'Sector Field', 
 'North Field - Sec B', 'High', 'Standard', 'PL-2026-08', 'Tractor'),

('Transplant eggplant to Sector C', 'field_planting', 'complete', CURRENT_DATE - 2, 'Bob Smith', 
 'Transplant', 'Eggplant', 'Black Beauty', 'N/A', 'Sector Field', 
 'East Field - Sec C', 'Low', 'Standard', 'PL-2026-09', 'Rototiller'),

('Transplant tomato seedlings to Sector D', 'field_planting', 'incomplete', CURRENT_DATE + 1, 'Carol Danvers', 
 'Transplant', 'Heirloom Tomatoes', 'Red Cherry', 'N/A', 'Sector Field', 
 'West Field - Sec D', 'Medium', 'Organic', 'PL-2026-10', 'Drip Hose'),

('Sow zucchini direct seeds in Sector E', 'field_planting', 'incomplete', CURRENT_DATE + 2, 'David Miller', 
 'Direct Seed', 'Zucchini', 'Golden Summer', 'N/A', 'Sector Field', 
 'South Field - Sec E', 'Medium', 'Standard', 'PL-2026-11', 'Seeder'),

('Plant red potatoes in Sector F', 'field_planting', 'incomplete', CURRENT_DATE + 3, 'Bob Smith', 
 'Direct Seed', 'Potatoes', 'Red Pontiac', 'N/A', 'Sector Field', 
 'South Field - Sec F', 'Low', 'Standard', 'PL-2026-12', 'Tractor'),

('Transplant butterhead lettuce to Sector A2', 'field_planting', 'incomplete', CURRENT_DATE + 4, 'Carol Danvers', 
 'Transplant', 'Romaine Lettuce', 'Butterhead', 'N/A', 'Sector Field', 
 'North Field - Sec A2', 'Medium', 'Organic', 'PL-2026-13', 'Drip Hose'),

('Sow carrot seeds in Sector G', 'field_planting', 'incomplete', CURRENT_DATE + 5, 'Alice Johnson', 
 'Direct Seed', 'Carrots', 'Nantes', 'N/A', 'Sector Field', 
 'East Field - Sec G', 'Low', 'Organic', 'PL-2026-14', 'Seeder');

-- Harvest tasks: 5 complete, 3 incomplete
INSERT INTO vivas_farm_tasks (
  task_name, task_type, status, due_date, assigned_to, 
  planting_type, crop, variety, harvest_stage, location_type, 
  location, priority, tag, planting_id, equipment
) VALUES
('Harvest early strawberries', 'harvest', 'complete', CURRENT_DATE - 1, 'Bob Smith', 
 'N/A', 'Sweet Strawberries', 'Chandler', 'First Pick', 'Sector Field', 
 'East Field - Row B', 'High', 'Premium', 'PL-2026-15', 'Harvest Bins'),

('Harvest baby spinach', 'harvest', 'complete', CURRENT_DATE - 2, 'Alice Johnson', 
 'N/A', 'Baby Spinach', 'Bloomsdale', 'Main Crop', 'Sector Field', 
 'West Field - Row A', 'Medium', 'Organic', 'PL-2026-16', 'Harvest Bins'),

('Harvest spring onions', 'harvest', 'complete', CURRENT_DATE - 3, 'Carol Danvers', 
 'N/A', 'Spring Onions', 'White Lisbon', 'Main Crop', 'Sector Field', 
 'North Field - Row C', 'Low', 'Standard', 'PL-2026-17', 'Harvest Bins'),

('Harvest red radishes', 'harvest', 'complete', CURRENT_DATE - 4, 'David Miller', 
 'N/A', 'Radishes', 'Cherry Belle', 'Clean Up', 'Sector Field', 
 'South Field - Row D', 'Low', 'Standard', 'PL-2026-18', 'Harvest Bins'),

('Harvest cherry tomatoes', 'harvest', 'complete', CURRENT_DATE, 'Alice Johnson', 
 'N/A', 'Heirloom Tomatoes', 'Red Cherry', 'First Pick', 'Greenhouse', 
 'Greenhouse 1 - Row A', 'Medium', 'Organic', 'PL-2026-01', 'Harvest Bins'),

('Harvest organic honeycrisp apples', 'harvest', 'incomplete', CURRENT_DATE + 1, 'David Miller', 
 'N/A', 'Apples', 'Honeycrisp', 'Main Crop', 'Orchard', 
 'North Orchard', 'High', 'Export', 'PL-2026-19', 'Harvest Bins'),

('Harvest sweet potatoes', 'harvest', 'incomplete', CURRENT_DATE + 2, 'Carol Danvers', 
 'N/A', 'Potatoes', 'Sweet Potato', 'Main Crop', 'Sector Field', 
 'South Field - Row F', 'Medium', 'Standard', 'PL-2026-20', 'Harvest Bins'),

('Harvest romaine lettuce heads', 'harvest', 'incomplete', CURRENT_DATE + 3, 'Bob Smith', 
 'N/A', 'Romaine Lettuce', 'Butterhead', 'Clean Up', 'Sector Field', 
 'North Field - Sec A', 'High', 'Organic', 'PL-2026-07', 'Harvest Bins');

-- Today's Tasks list (Tasks showing up on right sidebar)
INSERT INTO vivas_farm_tasks (
  task_name, task_type, status, due_date, assigned_to, 
  planting_type, crop, variety, harvest_stage, location_type, 
  location, priority, tag, planting_id, equipment
) VALUES
('Check soil moisture in Greenhouse 3', 'today_task', 'incomplete', CURRENT_DATE, 'Bob Smith', 
 'N/A', 'Cucumbers', 'Marketmore', 'N/A', 'Greenhouse', 
 'Greenhouse 3 - Row B', 'Medium', 'Standard', 'PL-2026-06', 'Drip Hose'),

('Clean irrigation drip lines in Sector A', 'today_task', 'incomplete', CURRENT_DATE, 'Alice Johnson', 
 'N/A', 'Kale', 'Lacinato', 'N/A', 'Sector Field', 
 'North Field - Sec A', 'Low', 'Organic', 'PL-2026-07', 'Drip Hose'),

('Apply organic compost to Sector C2', 'today_task', 'complete', CURRENT_DATE, 'Carol Danvers', 
 'N/A', 'Eggplant', 'Black Beauty', 'N/A', 'Sector Field', 
 'East Field - Sec C', 'Low', 'Standard', 'PL-2026-09', 'Tractor'),

('Calibrate temperature sensors in Greenhouse 1', 'today_task', 'incomplete', CURRENT_DATE, 'David Miller', 
 'N/A', 'Heirloom Tomatoes', 'Red Cherry', 'N/A', 'Greenhouse', 
 'Greenhouse 1 - Row A', 'High', 'Organic', 'PL-2026-01', 'Drip Hose');

-- Insert committed orders (e.g. for committed orders KPI)
INSERT INTO vivas_orders (order_no, status, amount, order_date) VALUES
('ORD-2026-001', 'fulfilled', 2500.00, CURRENT_DATE - 2),
('ORD-2026-002', 'fulfilled', 1800.50, CURRENT_DATE - 1),
('ORD-2026-003', 'fulfilled', 4200.00, CURRENT_DATE),
('ORD-2026-004', 'not_fulfilled', 3150.00, CURRENT_DATE + 1),
('ORD-2026-005', 'not_fulfilled', 1250.00, CURRENT_DATE + 2),
('ORD-2026-006', 'not_fulfilled', 5800.00, CURRENT_DATE + 3);

-- Insert crop yields (valuation data)
INSERT INTO vivas_crop_yields (crop_name, estimated_value, actual_value, harvest_date) VALUES
('Heirloom Tomatoes', 12000.00, 11500.00, CURRENT_DATE - 5),
('Sweet Strawberries', 8500.00, 9200.00, CURRENT_DATE - 3),
('Romaine Lettuce', 6000.00, 5800.00, CURRENT_DATE - 1),
('Bell Peppers', 7500.00, 7800.00, CURRENT_DATE),
('Sweet Corn', 15000.00, 0.00, CURRENT_DATE + 10),
('Baby Spinach', 4500.00, 4700.00, CURRENT_DATE - 4);

-- Insert labor hours by person
INSERT INTO vivas_labor_hours (person_name, hours_worked, work_date) VALUES
('Alice Johnson', 38.5, CURRENT_DATE),
('Bob Smith', 42.0, CURRENT_DATE),
('Carol Danvers', 35.0, CURRENT_DATE),
('David Miller', 40.5, CURRENT_DATE),
('Emma Watson', 28.0, CURRENT_DATE);

-- Insert planting summary
INSERT INTO vivas_plantings (field_name, crop_name, area_planted, planting_date) VALUES
('North Field - Sec A', 'Heirloom Tomatoes', 4.5, CURRENT_DATE - 12),
('North Field - Sec B', 'Sweet Corn', 8.0, CURRENT_DATE - 10),
('East Field - Sec C', 'Bell Peppers', 3.2, CURRENT_DATE - 5),
('West Field - Sec D', 'Romaine Lettuce', 2.5, CURRENT_DATE - 2),
('South Field - Sec E', 'Zucchini', 5.0, CURRENT_DATE);

-- Insert greenhouse sow summary
INSERT INTO vivas_greenhouse_sows (greenhouse, crop_name, tray_count, sow_date) VALUES
('Greenhouse 1 - Row A', 'Heirloom Tomatoes', 120, CURRENT_DATE - 15),
('Greenhouse 1 - Row B', 'Sweet Strawberries', 80, CURRENT_DATE - 12),
('Greenhouse 2 - Row A', 'Romaine Lettuce', 200, CURRENT_DATE - 8),
('Greenhouse 2 - Row B', 'Sweet Basil', 150, CURRENT_DATE - 4),
('Greenhouse 3 - Row A', 'Cucumbers', 100, CURRENT_DATE);

-- Insert notes and observations
INSERT INTO vivas_notes (title, note_type, crop_category, crop, location, author_name, note_year, content) VALUES
('First signs of aphids on sweet corn', 'Observations', 'Vegetables', 'Sweet Corn', 'North Field - Sec B', 'Bob Smith', 2026, 'Spotted a small cluster of aphids on the lower leaves of sweet corn rows in Sector B. Need to monitor and potentially introduce ladybugs or apply neem oil.'),
('Basil seedlings germination progress', 'Notes', 'Herbs', 'Sweet Basil', 'Greenhouse 2 - Row B', 'Alice Johnson', 2026, 'Germination rate is at ~92%. Starter trays in Greenhouse 2 look very healthy. Irrigation cycle is functioning well.'),
('Eggplant transplanting complete', 'Notes', 'Vegetables', 'Eggplant', 'East Field - Sec C', 'Bob Smith', 2026, 'Successfully transplanted 250 eggplant seedlings to East Field Sector C. Soil was prepped with organic compost. Drip lines installed and tested.'),
('Tomato leaf blight warning', 'Observations', 'Vegetables', 'Heirloom Tomatoes', 'Greenhouse 1 - Row A', 'Carol Danvers', 2026, 'Early warning signs of early blight detected on lower leaves of cherry tomatoes. Moving affected trays to quarantine zone to prevent spread.'),
('Strawberry harvest yield report', 'Notes', 'Fruit', 'Sweet Strawberries', 'East Field - Row B', 'David Miller', 2026, 'Excellent early strawberry harvest today. Fruit size is medium-large, color is deep red, sugar content is high. Packed 80 flats for export market.');
