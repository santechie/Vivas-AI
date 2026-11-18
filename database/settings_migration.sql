-- ============================================================
-- VIVAS AI - TEND.COM SETTINGS SYSTEM DATABASE MIGRATION
-- Database: vivas_ai
-- Preserves all existing tables & data.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Farm Profile & General Settings Table
CREATE TABLE IF NOT EXISTS vivas_settings_farm_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    farm_name VARCHAR(150) NOT NULL,
    year_founded INT DEFAULT 2026,
    location_mode VARCHAR(20) DEFAULT 'address', -- 'address' | 'coords'
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(30),
    gps_lat NUMERIC(10, 8) DEFAULT 12.9716,
    gps_lng NUMERIC(11, 8) DEFAULT 77.5946,
    farm_size NUMERIC(10, 2) DEFAULT 25.00,
    farm_size_unit VARCHAR(20) DEFAULT 'Acres', -- 'Hectares', 'Acres', 'Sq Meters', 'Sq Feet'
    operation_type VARCHAR(100) DEFAULT 'Mixed Vegetable & Fruit Farm',
    logo_url TEXT,
    invoice_header_mode VARCHAR(30) DEFAULT 'LOGO_AND_NAME', -- 'LOGO_AND_NAME', 'LOGO_ONLY', 'NAME_ONLY'
    operating_hours JSONB DEFAULT '{"start": "08:00", "end": "17:00", "work_days": ["Mon","Tue","Wed","Thu","Fri","Sat"]}',
    growing_format VARCHAR(50) DEFAULT 'Beds & Pathways',
    default_bed_width_ft NUMERIC(5, 2) DEFAULT 2.50,
    default_pathway_width_ft NUMERIC(5, 2) DEFAULT 1.50,
    default_yield_area_unit VARCHAR(50) DEFAULT 'Acre',
    default_yield_mass_unit VARCHAR(20) DEFAULT 'Ton',
    frost_date_option VARCHAR(30) DEFAULT 'manual', -- 'manual', 'suggested', 'na'
    first_fall_frost DATE,
    last_spring_frost DATE,
    units_system VARCHAR(20) DEFAULT 'Metric', -- 'Metric' | 'Standard'
    temperature_unit VARCHAR(5) DEFAULT 'C',    -- 'C' | 'F'
    currency_code VARCHAR(10) DEFAULT 'INR',
    currency_symbol VARCHAR(5) DEFAULT '₹',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    public_description TEXT DEFAULT 'Sustainable organic agriculture producing high quality heirloom vegetables, greens, and fruits.',
    public_website TEXT DEFAULT 'https://vivas.ai',
    instagram_handle VARCHAR(100) DEFAULT '@vivasfarm',
    facebook_handle VARCHAR(100) DEFAULT 'vivasfarm',
    public_phone VARCHAR(50) DEFAULT '+91 9940091521',
    public_email VARCHAR(150) DEFAULT 'gksvijay@gmail.com',
    show_public_address BOOLEAN DEFAULT TRUE,
    certifications JSONB DEFAULT '["USDA Organic", "NPOP Organic India", "Good Agricultural Practices (GAP)"]',
    tax_registration_id VARCHAR(100) DEFAULT 'GSTIN29ABCDE1234F1Z5',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_farm_profile_settings UNIQUE (farm_id)
);

-- 2. Task Type Management Table
CREATE TABLE IF NOT EXISTS vivas_settings_task_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Planting & Sowing', 'Crop Maintenance', 'Harvesting', etc.
    bg_color VARCHAR(20) DEFAULT '#b8f4a5',
    text_color VARCHAR(20) DEFAULT '#212529',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    is_system_default BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Roles and Permissions Table
CREATE TABLE IF NOT EXISTS vivas_settings_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Product Settings Table
CREATE TABLE IF NOT EXISTS vivas_settings_product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    shelf_life_tracking_enabled BOOLEAN DEFAULT TRUE,
    default_shelf_life_value INT DEFAULT 10,
    default_shelf_life_unit VARCHAR(20) DEFAULT 'Days', -- 'Days', 'Weeks', 'Months'
    unlimited_shelf_life_enabled BOOLEAN DEFAULT FALSE,
    inventory_impact_mode VARCHAR(30) DEFAULT 'Standard', -- 'Standard', 'Flexible', 'None'
    update_committed_on_pack BOOLEAN DEFAULT TRUE,
    update_on_hand_on_pack BOOLEAN DEFAULT TRUE,
    block_if_stock_short BOOLEAN DEFAULT TRUE,
    allow_negative_available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_farm_product_settings UNIQUE (farm_id)
);

-- 5. Online Store / Offer Sheet Settings Table
CREATE TABLE IF NOT EXISTS vivas_settings_online_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    store_enabled BOOLEAN DEFAULT TRUE,
    brand_farm_name VARCHAR(150),
    brand_year_founded INT DEFAULT 2026,
    brand_address TEXT,
    default_tax_rate NUMERIC(6, 3) DEFAULT 5.000, -- 5.000%
    order_cutoff_hours INT DEFAULT 24,
    minimum_order_amount NUMERIC(10, 2) DEFAULT 250.00,
    terms_and_policies TEXT DEFAULT 'Freshly harvested orders are packed every morning. Standard returns accepted within 24 hours of delivery.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_farm_store_settings UNIQUE (farm_id)
);

-- 5b. Delivery Types Table
CREATE TABLE IF NOT EXISTS vivas_settings_delivery_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    method_name VARCHAR(100) NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    minimum_order_amount NUMERIC(10, 2) DEFAULT 0.00,
    estimated_window VARCHAR(100) DEFAULT 'Same Day / Next Morning',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5c. Pickup Locations Table
CREATE TABLE IF NOT EXISTS vivas_settings_pickup_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    location_name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    instructions TEXT,
    schedule VARCHAR(150) DEFAULT 'Saturday & Sunday 8:00 AM - 12:00 PM',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notification Settings Table
CREATE TABLE IF NOT EXISTS vivas_settings_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'task', 'equipment', 'crop_plan', 'inventory', 'online_store'
    event_key VARCHAR(100) NOT NULL,
    event_title VARCHAR(150) NOT NULL,
    mobile_push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_notification_pref UNIQUE (farm_id, user_id, category, event_key)
);

-- 7. Planting ID Configuration Table
CREATE TABLE IF NOT EXISTS vivas_settings_planting_id (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) DEFAULT 'auto_number', -- 'auto_number', 'crop_variety_year_num', 'location_crop_num'
    starting_sequence INT DEFAULT 1,
    show_auto_number_only BOOLEAN DEFAULT FALSE,
    prefix VARCHAR(20) DEFAULT 'PLN',
    separator VARCHAR(5) DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_farm_planting_id_settings UNIQUE (farm_id)
);

-- 8. Label Management Table
CREATE TABLE IF NOT EXISTS vivas_settings_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    design_name VARCHAR(150) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'Planting', 'Harvest', 'Location', 'Materials & Inputs Lot'
    label_type VARCHAR(50) DEFAULT 'Thermal Label', -- 'Thermal Label', 'Sheet (Avery 5160)', 'Sheet (Avery 5163)'
    dimensions VARCHAR(50) DEFAULT '4" x 2"',
    fields_included JSONB NOT NULL DEFAULT '["Crop", "Variety", "Harvest Date", "Weight", "Lot #", "QR Code"]',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Payment Processors Table
CREATE TABLE IF NOT EXISTS vivas_settings_payment_processors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    provider_code VARCHAR(50) NOT NULL, -- 'stripe', 'square', 'razorpay', 'cash_check'
    provider_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    is_test_mode BOOLEAN DEFAULT TRUE,
    publishable_key TEXT,
    secret_key_encrypted TEXT,
    webhook_secret TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_farm_payment_provider UNIQUE (farm_id, provider_code)
);

-- 9b. Channel Payment Mappings Table
CREATE TABLE IF NOT EXISTS vivas_settings_channel_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    sales_channel VARCHAR(100) NOT NULL, -- 'Online Store', 'Wholesale', 'CSA', 'Farm Stand'
    default_processor_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_farm_channel_mapping UNIQUE (farm_id, sales_channel)
);

-- 10. Time & Attendance Settings Table
CREATE TABLE IF NOT EXISTS vivas_settings_time_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    clock_in_enabled BOOLEAN DEFAULT TRUE,
    task_clock_in_required BOOLEAN DEFAULT TRUE,
    geofencing_enabled BOOLEAN DEFAULT FALSE,
    geofence_radius_meters INT DEFAULT 500,
    overtime_threshold_hours INT DEFAULT 40,
    overtime_multiplier NUMERIC(3, 2) DEFAULT 1.50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_farm_time_attendance UNIQUE (farm_id)
);

-- 11. Custom Data Fields Table
CREATE TABLE IF NOT EXISTS vivas_settings_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    field_label VARCHAR(100) NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    target_entity VARCHAR(50) NOT NULL, -- 'Crops', 'Plantings', 'Locations', 'Tasks', 'Equipment', 'Contacts', 'Orders'
    field_type VARCHAR(30) NOT NULL, -- 'text', 'number', 'date', 'select', 'boolean', 'file'
    select_options JSONB DEFAULT '[]',
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_farm_custom_field UNIQUE (farm_id, target_entity, field_key)
);

-- 12. Personal Access Tokens & Webhooks Table
CREATE TABLE IF NOT EXISTS vivas_settings_api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    token_name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    token_preview VARCHAR(20) NOT NULL, -- e.g. "vivas_live_...9f2b"
    permission_scope VARCHAR(50) DEFAULT 'read_write',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vivas_settings_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    endpoint_url TEXT NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    subscribed_events JSONB NOT NULL DEFAULT '["order.created", "task.completed", "harvest.logged"]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED INITIAL SETTINGS DATA FOR ALL EXISTING FARMS
-- ============================================================

DO $$
DECLARE
    f RECORD;
    u RECORD;
BEGIN
    FOR f IN SELECT id, farm_name, location_address, city, total_area_acres FROM vivas_farms LOOP

        -- 1. Seed Farm Profile Settings
        INSERT INTO vivas_settings_farm_profile (
            farm_id, farm_name, address, city, farm_size, farm_size_unit
        ) VALUES (
            f.id, f.farm_name, COALESCE(f.location_address, 'Kanakapura Road, Near Art of Living'), COALESCE(f.city, 'Bangalore'), COALESCE(f.total_area_acres, 25.00), 'Acres'
        ) ON CONFLICT (farm_id) DO NOTHING;

        -- 2. Seed 22 Standard Agricultural Task Types (Tend.com standard catalog)
        INSERT INTO vivas_settings_task_types (farm_id, name, abbreviation, category, bg_color, text_color, sort_order, is_system_default)
        VALUES
        -- Planting & Sowing
        (f.id, 'Broadcast Sow', 'BS', 'Planting & Sowing', '#b8f4a5', '#212529', 1, TRUE),
        (f.id, 'Container Plant / Transplant', 'CP', 'Planting & Sowing', '#e03f3f', '#ffffff', 2, TRUE),
        (f.id, 'Container Sow', 'CS', 'Planting & Sowing', '#80c8d7', '#212529', 3, TRUE),
        (f.id, 'Furrow Sow', 'FS', 'Planting & Sowing', '#b8f4a5', '#212529', 4, TRUE),
        (f.id, 'Precision Sow', 'PS', 'Planting & Sowing', '#b8f4a5', '#212529', 5, TRUE),
        (f.id, 'Transplant', 'TP', 'Planting & Sowing', '#80c8d7', '#212529', 6, TRUE),
        -- Crop Maintenance
        (f.id, 'Fertilize & Amend', 'FA', 'Crop Maintenance', '#d32f2f', '#ffffff', 7, TRUE),
        (f.id, 'Cultivate', 'CL', 'Crop Maintenance', '#e2e8f0', '#0f172a', 8, TRUE),
        (f.id, 'Weed', 'WD', 'Crop Maintenance', '#fef08a', '#713f12', 9, TRUE),
        (f.id, 'Prune', 'PR', 'Crop Maintenance', '#fed7aa', '#7c2d12', 10, TRUE),
        (f.id, 'Trellis', 'TR', 'Crop Maintenance', '#e9d5ff', '#581c87', 11, TRUE),
        (f.id, 'Scout', 'SC', 'Crop Maintenance', '#c7d2fe', '#312e81', 12, TRUE),
        (f.id, 'Thin', 'TH', 'Crop Maintenance', '#fbcfe8', '#831843', 13, TRUE),
        (f.id, 'Irrigate', 'IR', 'Crop Maintenance', '#bae6fd', '#0369a1', 14, TRUE),
        (f.id, 'Spray & Protect', 'SP', 'Crop Maintenance', '#fecdd3', '#881337', 15, TRUE),
        -- Harvesting & Packing
        (f.id, 'Field Harvest', 'HV', 'Harvesting', '#86efac', '#14532d', 16, TRUE),
        (f.id, 'Wash & Pack', 'WP', 'Post-Harvest & Packing', '#6ee7b7', '#064e3b', 17, TRUE),
        (f.id, 'Cold Storage Sort', 'CS', 'Post-Harvest & Packing', '#a5f3fc', '#164e63', 18, TRUE),
        -- Infrastructure
        (f.id, 'Bed Preparation', 'BP', 'Infrastructure & Soil', '#d97706', '#ffffff', 19, TRUE),
        (f.id, 'Irrigation Maintenance', 'IM', 'Infrastructure & Soil', '#0284c7', '#ffffff', 20, TRUE),
        (f.id, 'Equipment Inspection', 'EQ', 'Equipment & Tools', '#475569', '#ffffff', 21, TRUE),
        (f.id, 'General Farm Admin', 'AD', 'Administration', '#64748b', '#ffffff', 22, TRUE)
        ON CONFLICT DO NOTHING;

        -- 3. Seed Standard Roles
        INSERT INTO vivas_settings_roles (farm_id, role_name, description, is_custom, permissions)
        VALUES
        (f.id, 'Owner', 'Full access to all modules, billing, settings, and team management', FALSE, '{"all": true}'),
        (f.id, 'Farm Manager', 'Manages crops, tasks, labor, orders, and view financials', FALSE, '{"tasks": true, "grow": true, "labor": true, "orders": true, "reports": true, "settings_view": true}'),
        (f.id, 'Field Crew', 'Executes and logs field tasks, sowings, and clock-in/out', FALSE, '{"tasks_execute": true, "clock_in": true, "notes": true}'),
        (f.id, 'Harvester', 'Logs crop harvest yields, pack crate records, and weights', FALSE, '{"harvest": true, "pack": true, "clock_in": true}'),
        (f.id, 'Viewer', 'Read-only access to farm maps, crop plans, and reports', FALSE, '{"read_only": true}')
        ON CONFLICT DO NOTHING;

        -- 4. Seed Product Settings
        INSERT INTO vivas_settings_product (
            farm_id, shelf_life_tracking_enabled, default_shelf_life_value, default_shelf_life_unit,
            inventory_impact_mode, update_committed_on_pack, update_on_hand_on_pack
        ) VALUES (
            f.id, TRUE, 10, 'Days', 'Standard', TRUE, TRUE
        ) ON CONFLICT (farm_id) DO NOTHING;

        -- 5. Seed Online Store Settings
        INSERT INTO vivas_settings_online_store (
            farm_id, brand_farm_name, default_tax_rate, minimum_order_amount
        ) VALUES (
            f.id, f.farm_name, 5.000, 250.00
        ) ON CONFLICT (farm_id) DO NOTHING;

        -- 5b. Seed Delivery Types
        INSERT INTO vivas_settings_delivery_types (farm_id, method_name, delivery_fee, minimum_order_amount, estimated_window)
        VALUES
        (f.id, 'Standard Home Delivery', 50.00, 300.00, 'Next Morning 7:00 AM - 11:00 AM'),
        (f.id, 'Express Harvest Delivery', 100.00, 500.00, 'Same Day Evening 4:00 PM - 8:00 PM'),
        (f.id, 'Wholesale Bulk Freight', 250.00, 2500.00, 'Scheduled Weekly Route')
        ON CONFLICT DO NOTHING;

        -- 5c. Seed Pickup Locations
        INSERT INTO vivas_settings_pickup_locations (farm_id, location_name, address, schedule)
        VALUES
        (f.id, 'Main Farm Gate Stall', 'Gate 2, Vivas Farm Estate, Kanakapura Road, Bangalore', 'Wed & Sat 9:00 AM - 1:00 PM'),
        (f.id, 'Downtown Farmers Market Booth', 'Central Park Pavilion, Booth #14, Bangalore', 'Sunday 7:00 AM - 12:00 PM')
        ON CONFLICT DO NOTHING;

        -- 7. Seed Planting ID Settings
        INSERT INTO vivas_settings_planting_id (
            farm_id, pattern_type, starting_sequence, prefix, separator
        ) VALUES (
            f.id, 'crop_variety_year_num', 1, 'PLN', '-'
        ) ON CONFLICT (farm_id) DO NOTHING;

        -- 8. Seed Label Templates
        INSERT INTO vivas_settings_labels (farm_id, design_name, purpose, label_type, dimensions, fields_included, is_default)
        VALUES
        (f.id, 'Standard Field Harvest Crate Tag', 'Harvest', 'Thermal Label', '4" x 2"', '["Crop", "Variety", "Harvest Date", "Lot #", "Weight", "QR Code"]', TRUE),
        (f.id, 'Nursery Seeding Tray Label', 'Planting', 'Thermal Label', '2" x 1"', '["Crop", "Variety", "Sow Date", "Planting ID"]', FALSE),
        (f.id, 'Wholesale Shipment Outer Carton', 'Harvest', 'Sheet (Avery 5163)', '4" x 2"', '["Farm Name", "Crop", "Quantity", "Packed Date", "Certification Seal"]', FALSE)
        ON CONFLICT DO NOTHING;

        -- 9. Seed Payment Processors
        INSERT INTO vivas_settings_payment_processors (farm_id, provider_code, provider_name, is_enabled, description, currency)
        VALUES
        (f.id, 'razorpay', 'Razorpay & UPI', TRUE, 'Accept UPI, NetBanking, Credit/Debit cards across India with instant settlement.', 'INR'),
        (f.id, 'stripe', 'Stripe', FALSE, 'Global payment processor for international card transactions and recurring subscriptions.', 'USD'),
        (f.id, 'square', 'Square POS', FALSE, 'Direct point of sale integration for on-farm store and farmers market card readers.', 'INR'),
        (f.id, 'cash_check', 'Cash on Delivery / Direct Bank Transfer', TRUE, 'Accept COD, direct IMPS/NEFT, and manual verification.', 'INR')
        ON CONFLICT DO NOTHING;

        -- 9b. Seed Channel Mappings
        INSERT INTO vivas_settings_channel_mappings (farm_id, sales_channel, default_processor_code)
        VALUES
        (f.id, 'Online Store', 'razorpay'),
        (f.id, 'Wholesale', 'cash_check'),
        (f.id, 'Farm Stand', 'square'),
        (f.id, 'CSA Subscriptions', 'stripe')
        ON CONFLICT DO NOTHING;

        -- 10. Seed Time & Attendance Settings
        INSERT INTO vivas_settings_time_attendance (
            farm_id, clock_in_enabled, task_clock_in_required, overtime_threshold_hours, overtime_multiplier
        ) VALUES (
            f.id, TRUE, TRUE, 40, 1.50
        ) ON CONFLICT (farm_id) DO NOTHING;

        -- 11. Seed Custom Fields
        INSERT INTO vivas_settings_custom_fields (farm_id, field_label, field_key, target_entity, field_type, select_options, is_required)
        VALUES
        (f.id, 'Brix Sweetness Reading', 'brix_reading', 'Harvests', 'number', '[]', FALSE),
        (f.id, 'Harvest Quality Grade', 'harvest_grade', 'Harvests', 'select', '["Grade A (Premium)", "Grade B (Standard)", "Grade C (Processing)"]', TRUE),
        (f.id, 'Soil Moisture at Seeding %', 'soil_moisture_pct', 'Plantings', 'number', '[]', FALSE),
        (f.id, 'Organic Lot Reference', 'organic_lot_ref', 'Crop Catalog', 'text', '[]', FALSE)
        ON CONFLICT DO NOTHING;

    END LOOP;

    -- Seed Notification Preferences for all users
    FOR u IN SELECT id FROM vivas_users LOOP
        FOR f IN SELECT id FROM vivas_farms LOOP
            INSERT INTO vivas_settings_notifications (farm_id, user_id, category, event_key, event_title, mobile_push_enabled, in_app_enabled)
            VALUES
            (f.id, u.id, 'task', 'task_assigned', 'New Task is assigned', TRUE, TRUE),
            (f.id, u.id, 'task', 'task_due', 'Due Date of Task approaching', TRUE, TRUE),
            (f.id, u.id, 'task', 'task_dates_changed', 'Start Date/End Date of Task changed', FALSE, TRUE),
            (f.id, u.id, 'equipment', 'maintenance_due', 'Equipment Maintenance Due', TRUE, TRUE),
            (f.id, u.id, 'crop_plan', 'planting_scheduled', 'Scheduled Planting Upcoming', TRUE, TRUE),
            (f.id, u.id, 'inventory', 'low_stock_warning', 'Materials Low Stock Warning', TRUE, TRUE),
            (f.id, u.id, 'online_store', 'new_order_placed', 'New Online Store Order Received', TRUE, TRUE)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

END $$;
