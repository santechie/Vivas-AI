-- Migration: Planting Methods Multi-Selection Support
-- Non-destructive: Alters column types to TEXT for multiple method strings.
-- Preserves 100% of existing data.

DO $$
BEGIN
    -- 1. vivas_crop_varieties.planting_method -> TYPE TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_crop_varieties' AND column_name = 'planting_method'
    ) THEN
        ALTER TABLE vivas_crop_varieties ALTER COLUMN planting_method TYPE TEXT;
    END IF;

    -- 2. vivas_crop_templates.planting_method -> TYPE TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_crop_templates' AND column_name = 'planting_method'
    ) THEN
        ALTER TABLE vivas_crop_templates ALTER COLUMN planting_method TYPE TEXT;
    END IF;

    -- 3. vivas_plantings.planting_type -> TYPE TEXT and ensure planting_method column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_plantings' AND column_name = 'planting_type'
    ) THEN
        ALTER TABLE vivas_plantings ALTER COLUMN planting_type TYPE TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_plantings' AND column_name = 'planting_method'
    ) THEN
        ALTER TABLE vivas_plantings ADD COLUMN planting_method TEXT;
    ELSE
        ALTER TABLE vivas_plantings ALTER COLUMN planting_method TYPE TEXT;
    END IF;

    UPDATE vivas_plantings 
    SET planting_method = planting_type 
    WHERE planting_method IS NULL AND planting_type IS NOT NULL;

    -- 4. vivas_farm_tasks.planting_type -> TYPE TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_farm_tasks' AND column_name = 'planting_type'
    ) THEN
        ALTER TABLE vivas_farm_tasks ALTER COLUMN planting_type TYPE TEXT;
    END IF;

END $$;
