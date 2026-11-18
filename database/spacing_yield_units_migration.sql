-- Spacing (mtr / ft) and Yield (/ Acre in Ton) Migration
-- Non-destructive: adds columns if not exists, preserves all existing rows and columns.

DO $$
BEGIN
    -- 1. vivas_crop_varieties: spacing_unit and expected_yield_per_acre
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_crop_varieties' AND column_name = 'spacing_unit'
    ) THEN
        ALTER TABLE vivas_crop_varieties ADD COLUMN spacing_unit VARCHAR(20) DEFAULT 'mtr';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_crop_varieties' AND column_name = 'expected_yield_per_acre'
    ) THEN
        ALTER TABLE vivas_crop_varieties ADD COLUMN expected_yield_per_acre NUMERIC(10,2);
    END IF;

    -- 2. vivas_crop_templates: spacing_unit and expected_yield_per_acre
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_crop_templates' AND column_name = 'spacing_unit'
    ) THEN
        ALTER TABLE vivas_crop_templates ADD COLUMN spacing_unit VARCHAR(20) DEFAULT 'mtr';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_crop_templates' AND column_name = 'expected_yield_per_acre'
    ) THEN
        ALTER TABLE vivas_crop_templates ADD COLUMN expected_yield_per_acre NUMERIC(10,2);
    END IF;

    -- 3. vivas_plantings: spacing_unit and expected_yield_per_acre
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_plantings' AND column_name = 'spacing_unit'
    ) THEN
        ALTER TABLE vivas_plantings ADD COLUMN spacing_unit VARCHAR(20) DEFAULT 'mtr';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_plantings' AND column_name = 'expected_yield_per_acre'
    ) THEN
        ALTER TABLE vivas_plantings ADD COLUMN expected_yield_per_acre NUMERIC(10,2);
    END IF;

    -- 4. Fill defaults non-destructively for existing rows where null
    UPDATE vivas_crop_varieties 
    SET spacing_unit = 'mtr' 
    WHERE spacing_unit IS NULL;

    UPDATE vivas_crop_varieties 
    SET expected_yield_per_acre = ROUND((COALESCE(expected_yield_per_ft, 1.5) * 8.5)::numeric, 1)
    WHERE expected_yield_per_acre IS NULL;

    UPDATE vivas_crop_varieties 
    SET yield_unit = 'Ton' 
    WHERE yield_unit = 'kg' OR yield_unit IS NULL;

    UPDATE vivas_crop_templates 
    SET spacing_unit = 'mtr' 
    WHERE spacing_unit IS NULL;

    UPDATE vivas_crop_templates 
    SET expected_yield_per_acre = ROUND((COALESCE(expected_yield_per_ft, 1.5) * 8.5)::numeric, 1)
    WHERE expected_yield_per_acre IS NULL;

    UPDATE vivas_crop_templates 
    SET yield_unit = 'Ton' 
    WHERE yield_unit = 'kg' OR yield_unit IS NULL;

    UPDATE vivas_plantings 
    SET spacing_unit = 'mtr' 
    WHERE spacing_unit IS NULL;

    UPDATE vivas_plantings 
    SET expected_yield_per_acre = ROUND((COALESCE(target_yield, 15.0))::numeric, 1)
    WHERE expected_yield_per_acre IS NULL;

    UPDATE vivas_plantings 
    SET yield_unit = 'Ton' 
    WHERE yield_unit = 'kg' OR yield_unit IS NULL;

    UPDATE vivas_harvest_plans 
    SET unit = 'Ton' 
    WHERE unit = 'kg' OR unit IS NULL;

END $$;
