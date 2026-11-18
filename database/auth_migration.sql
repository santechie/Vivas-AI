-- Migration Script: User Authentication System for Vivas AI
-- Database: vivas_ai

CREATE TABLE IF NOT EXISTS vivas_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    farm_name VARCHAR(255) DEFAULT 'Vivas Organics Farm',
    role VARCHAR(50) DEFAULT 'Farm Manager',
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial admin user if table is empty (Password: admin123)
-- SHA-256 for 'admin123' -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT INTO vivas_users (full_name, email, password_hash, farm_name, role)
SELECT 'Admin User', 'admin@vivas.ai', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Vivas AI Demo Farm', 'Farm Administrator'
WHERE NOT EXISTS (SELECT 1 FROM vivas_users WHERE email = 'admin@vivas.ai');
