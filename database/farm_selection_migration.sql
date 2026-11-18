-- Migration Script: Multi-Farm Selection System for Vivas AI
-- Database: vivas_ai

-- 1. Create vivas_farms Table
CREATE TABLE IF NOT EXISTS vivas_farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    farm_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    location_address TEXT,
    city VARCHAR(100) DEFAULT 'Bangalore',
    state_country VARCHAR(100) DEFAULT 'Karnataka, India',
    total_area_acres NUMERIC(10,2) DEFAULT 25.0,
    farm_type VARCHAR(100) DEFAULT 'Organic Vegetable & Herb Farm',
    weather_summary VARCHAR(100) DEFAULT '78°F Sunny',
    logo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create vivas_user_farms Junction Table
CREATE TABLE IF NOT EXISTS vivas_user_farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
    role_in_farm VARCHAR(100) DEFAULT 'Farm Owner / Manager',
    is_default BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, farm_id)
);

-- 3. Seed Demo Farms for Admin User
DO $$
DECLARE
    admin_id UUID;
    farm1_id UUID;
    farm2_id UUID;
BEGIN
    SELECT id INTO admin_id FROM vivas_users WHERE email = 'admin@vivas.ai' LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        -- Farm 1: Vivas AI Main Demonstration Farm
        INSERT INTO vivas_farms (owner_id, farm_name, legal_name, city, state_country, total_area_acres, farm_type, weather_summary)
        VALUES (admin_id, 'Vivas AI Main Demonstration Farm', 'Vivas Organics India Pvt Ltd', 'Bengaluru', 'Karnataka, India', 120.00, 'Commercial Organic & Microgreens', '82°F Partly Cloudy')
        ON CONFLICT DO NOTHING
        RETURNING id INTO farm1_id;

        IF farm1_id IS NULL THEN
            SELECT id INTO farm1_id FROM vivas_farms WHERE farm_name = 'Vivas AI Main Demonstration Farm' LIMIT 1;
        END IF;

        IF farm1_id IS NOT NULL THEN
            INSERT INTO vivas_user_farms (user_id, farm_id, role_in_farm, is_default)
            VALUES (admin_id, farm1_id, 'Farm Administrator', TRUE)
            ON CONFLICT (user_id, farm_id) DO NOTHING;
        END IF;

        -- Farm 2: Vivas High-Tech Hydroponics Facility
        INSERT INTO vivas_farms (owner_id, farm_name, legal_name, city, state_country, total_area_acres, farm_type, weather_summary)
        VALUES (admin_id, 'Vivas High-Tech Hydroponics Facility', 'Vivas AgTech Labs', 'Mysuru', 'Karnataka, India', 45.50, 'Greenhouse & Controlled Environment', '75°F Clear Sky')
        ON CONFLICT DO NOTHING
        RETURNING id INTO farm2_id;

        IF farm2_id IS NULL THEN
            SELECT id INTO farm2_id FROM vivas_farms WHERE farm_name = 'Vivas High-Tech Hydroponics Facility' LIMIT 1;
        END IF;

        IF farm2_id IS NOT NULL THEN
            INSERT INTO vivas_user_farms (user_id, farm_id, role_in_farm, is_default)
            VALUES (admin_id, farm2_id, 'Operations Manager', FALSE)
            ON CONFLICT (user_id, farm_id) DO NOTHING;
        END IF;
    END IF;
END $$;
