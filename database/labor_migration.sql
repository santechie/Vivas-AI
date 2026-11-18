-- ==============================================================================
-- LABOR MODULE MIGRATION & SEED FOR VIVAS AI
-- Covers Workers / Crew Directory, Time & Attendance / Timesheets, Labor Settings
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. LABOR WORKERS / CREW DIRECTORY TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_labor_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(100) NOT NULL, -- Farm Manager, Field Lead, Harvester, Packhouse Specialist, Equipment Operator, Nursery & Greenhouse Tech, Seasonal Worker
    employment_type VARCHAR(50) DEFAULT 'Full-Time', -- Full-Time, Part-Time, Seasonal / Daily Wage, Contractor
    hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 120.00,
    overtime_rate NUMERIC(10,2) NOT NULL DEFAULT 180.00,
    phone VARCHAR(50),
    email VARCHAR(150),
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(50),
    hire_date DATE DEFAULT CURRENT_DATE,
    assigned_location VARCHAR(150) DEFAULT 'Main Farm Grounds',
    status VARCHAR(30) DEFAULT 'active', -- active, on_leave, inactive
    avatar_color VARCHAR(20) DEFAULT '#0284c7',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. LABOR TIMESHEETS / TIME & ATTENDANCE TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_labor_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES vivas_labor_workers(id) ON DELETE CASCADE,
    worker_name VARCHAR(150) NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    break_minutes INT DEFAULT 0,
    total_hours NUMERIC(6,2) DEFAULT 0.00,
    task_type VARCHAR(100) NOT NULL DEFAULT 'General Farm Work', -- Harvesting & Sorting, Field Bed Preparation, Greenhouse Seeding, Packhouse Packing, Irrigation & Fertigation, Weeding & Cultivation, Equipment Maintenance
    task_id UUID,
    crop_name VARCHAR(100),
    crop_id UUID,
    field_location VARCHAR(150) DEFAULT 'Field Block A',
    hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 120.00,
    total_labor_cost NUMERIC(10,2) DEFAULT 0.00,
    is_overtime BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'pending', -- active (currently clocked in), pending, approved, rejected
    approved_by VARCHAR(150),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. LABOR SETTINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vivas_labor_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clock_in_enabled BOOLEAN DEFAULT TRUE,
    require_task_clock_in BOOLEAN DEFAULT TRUE,
    overtime_threshold_daily_hours NUMERIC(4,2) DEFAULT 8.00,
    overtime_multiplier NUMERIC(4,2) DEFAULT 1.50,
    pay_period_type VARCHAR(50) DEFAULT 'Weekly',
    currency_symbol VARCHAR(10) DEFAULT '₹',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SEED DATA
-- ==============================================================================

-- Seed Workers
INSERT INTO vivas_labor_workers (id, employee_code, name, role, employment_type, hourly_rate, overtime_rate, phone, email, emergency_contact_name, emergency_contact_phone, hire_date, assigned_location, status, avatar_color, notes)
VALUES
('a1111111-1111-1111-1111-111111111111', 'EMP-001', 'Suresh Kumar', 'Lead Farm Operator', 'Full-Time', 160.00, 240.00, '+91 98450 11001', 'suresh@vivasai.farm', 'Geetha Kumar (Wife)', '+91 98450 11002', '2023-01-15', 'Tractor Shed & Field Block A', 'active', '#0284c7', 'Certified tractor and heavy machinery operator.'),
('a2222222-2222-2222-2222-222222222222', 'EMP-002', 'Ramesh K.', 'Field & Harvest Lead', 'Full-Time', 140.00, 210.00, '+91 98450 22001', 'ramesh@vivasai.farm', 'Kavitha R. (Sister)', '+91 98450 22002', '2023-03-10', 'Field Blocks B & C', 'active', '#16a34a', 'Oversees daily harvest schedules and field crew coordination.'),
('a3333333-3333-3333-3333-333333333333', 'EMP-003', 'Lakshmi Devi', 'Nursery & Greenhouse Tech', 'Full-Time', 130.00, 195.00, '+91 98450 33001', 'lakshmi@vivasai.farm', 'Venkatesh D. (Brother)', '+91 98450 33002', '2023-06-01', 'Greenhouses 1 & 2', 'active', '#d97706', 'Specialist in microgreen seeding and transplant propagation.'),
('a4444444-4444-4444-4444-444444444444', 'EMP-004', 'Manoj Singh', 'Packhouse & Fulfillment Specialist', 'Full-Time', 125.00, 187.50, '+91 98450 44001', 'manoj@vivasai.farm', 'Anita Singh (Mother)', '+91 98450 44002', '2023-08-20', 'Packhouse & Cold Storage', 'active', '#7c3aed', 'Manages order crate packing, labeling, and delivery slips.'),
('a5555555-5555-5555-5555-555555555555', 'EMP-005', 'Pooja V.', 'Seasonal Harvest Crew', 'Seasonal / Daily Wage', 100.00, 150.00, '+91 98450 55001', 'pooja@vivasai.farm', 'Vijay V. (Father)', '+91 98450 55002', '2024-02-01', 'Field Block A & B', 'active', '#ec4899', 'Primary morning harvester for tomatoes, peppers, and leafy greens.'),
('a6666666-6666-6666-6666-666666666666', 'EMP-006', 'Anand Verma', 'Irrigation & Maintenance Tech', 'Part-Time', 135.00, 202.50, '+91 98450 66001', 'anand@vivasai.farm', 'Sunil Verma (Brother)', '+91 98450 66002', '2024-01-10', 'Pumps & Fertigation Shed', 'active', '#059669', 'Drip fertigation monitoring and pump line maintenance.')
ON CONFLICT (id) DO NOTHING;

-- Seed Timesheets (Past Completed & Active Clocked In)
INSERT INTO vivas_labor_timesheets (id, worker_id, worker_name, work_date, clock_in_time, clock_out_time, break_minutes, total_hours, task_type, crop_name, field_location, hourly_rate, total_labor_cost, is_overtime, status, approved_by, approved_at, notes)
VALUES
-- 1. Suresh - Bed Preparation (Approved)
('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Suresh Kumar', CURRENT_DATE - INTERVAL '2 days', (CURRENT_DATE - INTERVAL '2 days') + TIME '07:30:00', (CURRENT_DATE - INTERVAL '2 days') + TIME '16:00:00', 30, 8.00, 'Field Bed Preparation', 'Tomatoes', 'Field Block A - Beds 1-10', 160.00, 1280.00, FALSE, 'approved', 'Farm Admin', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Tractor rototilling and compost incorporation completed.'),

-- 2. Ramesh - Harvesting & Sorting (Approved)
('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Ramesh K.', CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day') + TIME '06:00:00', (CURRENT_DATE - INTERVAL '1 day') + TIME '14:30:00', 30, 8.00, 'Harvesting & Sorting', 'Tomatoes', 'Field Block A', 140.00, 1120.00, FALSE, 'approved', 'Farm Admin', CURRENT_TIMESTAMP - INTERVAL '12 hours', 'Harvested 180 kg San Marzano tomatoes for restaurant delivery.'),

-- 3. Lakshmi - Greenhouse Seeding (Approved)
('b3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'Lakshmi Devi', CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day') + TIME '08:00:00', (CURRENT_DATE - INTERVAL '1 day') + TIME '16:30:00', 30, 8.00, 'Greenhouse Seeding', 'Microgreens', 'Greenhouse 1 - Nursery Bench A', 130.00, 1040.00, FALSE, 'approved', 'Farm Admin', CURRENT_TIMESTAMP - INTERVAL '10 hours', 'Sowed 30 flats of Basil and 40 trays of Salad Mix microgreens.'),

-- 4. Manoj - Packhouse Packing (Pending Approval)
('b4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', 'Manoj Singh', CURRENT_DATE, CURRENT_DATE + TIME '06:30:00', CURRENT_DATE + TIME '13:00:00', 30, 6.00, 'Packhouse Packing', 'Basil', 'Packhouse Bay 1', 125.00, 750.00, FALSE, 'pending', NULL, NULL, 'Packed restaurant direct crates for Chef Anand order.'),

-- 5. Pooja - Morning Harvest (Pending Approval)
('b5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555555', 'Pooja V.', CURRENT_DATE, CURRENT_DATE + TIME '06:00:00', CURRENT_DATE + TIME '11:30:00', 0, 5.50, 'Harvesting & Sorting', 'Bell Peppers', 'Field Block B', 100.00, 550.00, FALSE, 'pending', NULL, NULL, 'Morning harvest of California Wonder bell peppers.'),

-- 6. Suresh - Currently Clocked In (Active Shift)
('b6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111', 'Suresh Kumar', CURRENT_DATE, CURRENT_DATE + TIME '08:00:00', NULL, 0, 3.50, 'Equipment Maintenance', 'General', 'Tractor Shed Bay 1', 160.00, 560.00, FALSE, 'active', NULL, NULL, 'Greasing hitch assembly and inspecting tiller belts.'),

-- 7. Anand - Irrigation Fertigation (Currently Clocked In Active Shift)
('b7777777-7777-7777-7777-777777777777', 'a6666666-6666-6666-6666-666666666666', 'Anand Verma', CURRENT_DATE, CURRENT_DATE + TIME '07:00:00', NULL, 0, 4.50, 'Irrigation & Fertigation', 'Cucumbers', 'Tunnel House 2', 135.00, 607.50, FALSE, 'active', NULL, NULL, 'Injecting Bio-NPK liquid consortium into drip zone 3.')
ON CONFLICT (id) DO NOTHING;

-- Seed Labor Settings
INSERT INTO vivas_labor_settings (id, clock_in_enabled, require_task_clock_in, overtime_threshold_daily_hours, overtime_multiplier, pay_period_type, currency_symbol)
VALUES
('c1111111-1111-1111-1111-111111111111', TRUE, TRUE, 8.00, 1.50, 'Weekly', '₹')
ON CONFLICT (id) DO NOTHING;
