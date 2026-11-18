-- =========================================================
-- Vivas AI: Tend-like Account Management & File Storage Migration
-- Database: vivas_ai
-- =========================================================

-- 1. Extend vivas_users with Profile and Labor fields if not present
ALTER TABLE vivas_users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(10) DEFAULT '+91',
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS labor_rate NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS labor_rate_currency VARCHAR(10) DEFAULT '₹',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS transfer_owner_id UUID;

-- Split existing full_name if first_name / last_name are empty (preserving all existing full_name data)
UPDATE vivas_users 
SET 
  first_name = COALESCE(first_name, NULLIF(SPLIT_PART(full_name, ' ', 1), ''), 'User'),
  last_name = COALESCE(last_name, NULLIF(SUBSTRING(full_name FROM LENGTH(SPLIT_PART(full_name, ' ', 1)) + 2), ''), '')
WHERE first_name IS NULL OR first_name = '';

-- 2. Subscriptions & Plans Table
CREATE TABLE IF NOT EXISTS vivas_account_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    plan_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'ultimate', 'enterprise'
    plan_name VARCHAR(100) DEFAULT 'Free Monthly',
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'annual'
    plan_price NUMERIC(10, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    max_users INT DEFAULT 1,
    base_ai_credits INT DEFAULT 25,
    base_storage_mb NUMERIC(12, 2) DEFAULT 500.00,
    data_retention_years INT DEFAULT 3,
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI Credits Table
CREATE TABLE IF NOT EXISTS vivas_ai_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    monthly_credits_total INT DEFAULT 25,
    monthly_credits_remaining INT DEFAULT 25,
    addon_credits_total INT DEFAULT 0,
    addon_credits_remaining INT DEFAULT 0,
    credits_used INT DEFAULT 0,
    cycle_reset_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_ai_credits UNIQUE (user_id)
);

-- 4. AI Credit Purchases (Add-ons)
CREATE TABLE IF NOT EXISTS vivas_ai_credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    package_name VARCHAR(100) NOT NULL,
    credits_amount INT NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(100) DEFAULT 'Credit Card (Visa •••• 4242)',
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Storage Add-ons Table
CREATE TABLE IF NOT EXISTS vivas_storage_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    package_name VARCHAR(100) NOT NULL, -- '+10 GB', '+50 GB', '+100 GB', '+1 TB'
    storage_gb INT NOT NULL,
    price_usd_per_mo NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. File Storage Table
CREATE TABLE IF NOT EXISTS vivas_file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    farm_id UUID,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT NOT NULL,
    category VARCHAR(100) DEFAULT 'General', -- 'General', 'Soil Test', 'Crop Photos', 'Invoices', 'SOPs & Guides', 'Certifications'
    notes TEXT,
    uploaded_by VARCHAR(255) DEFAULT 'Gopikrishna Santhanam',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payment Methods Table
CREATE TABLE IF NOT EXISTS vivas_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    card_brand VARCHAR(50) DEFAULT 'Visa',
    last4 VARCHAR(4) NOT NULL,
    exp_month INT NOT NULL,
    exp_year INT NOT NULL,
    cardholder_name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT true,
    billing_country VARCHAR(100) DEFAULT 'India',
    billing_postal_code VARCHAR(50) DEFAULT '600001',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Billing Invoices Table
CREATE TABLE IF NOT EXISTS vivas_billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'Paid',
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(100) DEFAULT 'Visa ending in 4242',
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Priority Onboarding Requests
CREATE TABLE IF NOT EXISTS vivas_priority_onboarding_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
    farm_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    preferred_date DATE,
    preferred_time_slot VARCHAR(50),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    amount NUMERIC(10, 2) DEFAULT 199.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Seed Default Subscription & Credits for all users who don't have them yet
INSERT INTO vivas_account_subscriptions (user_id, plan_tier, plan_name, billing_cycle, plan_price, currency, max_users, base_ai_credits, base_storage_mb, data_retention_years, status)
SELECT id, 'free', 'Free Monthly', 'monthly', 0.00, 'USD', 1, 25, 500.00, 3, 'active'
FROM vivas_users u
WHERE NOT EXISTS (SELECT 1 FROM vivas_account_subscriptions s WHERE s.user_id = u.id);

INSERT INTO vivas_ai_credits (user_id, monthly_credits_total, monthly_credits_remaining, addon_credits_total, addon_credits_remaining, credits_used, cycle_reset_date)
SELECT id, 25, 25, 0, 0, 0, (CURRENT_DATE + INTERVAL '1 month')::date
FROM vivas_users u
WHERE NOT EXISTS (SELECT 1 FROM vivas_ai_credits c WHERE c.user_id = u.id);

-- Seed initial sample file in file storage (matching the 2 MB used in Tend screenshot!)
INSERT INTO vivas_file_storage (user_id, file_name, original_name, file_path, file_url, mime_type, file_size_bytes, category, notes, uploaded_by)
SELECT 
  u.id, 
  'farm_soil_sample_report_q3.pdf', 
  'farm_soil_sample_report_q3.pdf', 
  '/uploads/file_storage/farm_soil_sample_report_q3.pdf', 
  '/uploads/file_storage/farm_soil_sample_report_q3.pdf', 
  'application/pdf', 
  2097152, -- 2 MB
  'Soil Test', 
  'Comprehensive Soil Nitrogen, Phosphorus, and Organic Carbon baseline lab analysis', 
  COALESCE(u.full_name, 'Gopikrishna Santhanam')
FROM vivas_users u
WHERE NOT EXISTS (SELECT 1 FROM vivas_file_storage fs WHERE fs.user_id = u.id);

-- Seed initial payment method
INSERT INTO vivas_payment_methods (user_id, card_brand, last4, exp_month, exp_year, cardholder_name, is_default, billing_country, billing_postal_code)
SELECT 
  u.id, 
  'Visa', 
  '4242', 
  12, 
  2028, 
  COALESCE(u.full_name, 'Gopikrishna Santhanam'), 
  true, 
  'India', 
  '600001'
FROM vivas_users u
WHERE NOT EXISTS (SELECT 1 FROM vivas_payment_methods pm WHERE pm.user_id = u.id);

-- Seed initial invoices
INSERT INTO vivas_billing_invoices (user_id, invoice_number, description, amount, currency, status, invoice_date, payment_method)
SELECT 
  u.id, 
  'INV-2026-001', 
  'Free Monthly Plan - Account Activation', 
  0.00, 
  'USD', 
  'Paid', 
  CURRENT_DATE, 
  'Complimentary'
FROM vivas_users u
WHERE NOT EXISTS (SELECT 1 FROM vivas_billing_invoices bi WHERE bi.user_id = u.id);
