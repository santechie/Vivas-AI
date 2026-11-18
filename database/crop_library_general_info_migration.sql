-- Migration Script: Expand Tend.com General Crop Info & Seed Attributes
-- Database: vivas_ai

-- 1. Add Scientific Name to vivas_crops
ALTER TABLE vivas_crops
ADD COLUMN IF NOT EXISTS scientific_name VARCHAR(255);

-- 2. Add Seed Information & Attributes to vivas_crop_templates
ALTER TABLE vivas_crop_templates
ADD COLUMN IF NOT EXISTS seeds_per_oz NUMERIC(10,2) DEFAULT 1000.00,
ADD COLUMN IF NOT EXISTS seeds_per_gram NUMERIC(10,2) DEFAULT 35.00,
ADD COLUMN IF NOT EXISTS seed_viability_years INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS seed_type VARCHAR(50) DEFAULT 'Raw',
ADD COLUMN IF NOT EXISTS seed_size VARCHAR(50) DEFAULT 'Medium';

-- 3. Add Crop Attributes to vivas_crop_templates
ALTER TABLE vivas_crop_templates
ADD COLUMN IF NOT EXISTS growth_habit VARCHAR(50) DEFAULT 'Determinate',
ADD COLUMN IF NOT EXISTS plant_height_in NUMERIC(6,2) DEFAULT 36.0,
ADD COLUMN IF NOT EXISTS plant_spread_in NUMERIC(6,2) DEFAULT 24.0,
ADD COLUMN IF NOT EXISTS crop_lifecycle VARCHAR(50) DEFAULT 'Annual',
ADD COLUMN IF NOT EXISTS harvest_part VARCHAR(50) DEFAULT 'Fruit',
ADD COLUMN IF NOT EXISTS harvest_method VARCHAR(50) DEFAULT 'Continuous Pick';

-- 4. Add Environmental & Irrigation Preferences to vivas_crop_templates
ALTER TABLE vivas_crop_templates
ADD COLUMN IF NOT EXISTS water_needs VARCHAR(50) DEFAULT 'Moderate (1-1.5 in/wk)',
ADD COLUMN IF NOT EXISTS ideal_temp_f VARCHAR(50) DEFAULT '65-85°F';

-- 5. Add Advanced Agronomic Preferences to vivas_crop_templates
ALTER TABLE vivas_crop_templates
ADD COLUMN IF NOT EXISTS soil_type VARCHAR(100) DEFAULT 'Well-drained Loam',
ADD COLUMN IF NOT EXISTS nutrient_demand VARCHAR(100) DEFAULT 'Heavy Feeder',
ADD COLUMN IF NOT EXISTS companion_plants TEXT DEFAULT 'Basil, Marigolds, Carrots',
ADD COLUMN IF NOT EXISTS incompatible_plants TEXT DEFAULT 'Fennel, Potatoes, Brassicas',
ADD COLUMN IF NOT EXISTS common_pests TEXT DEFAULT 'Aphids, Hornworms, Flea Beetles',
ADD COLUMN IF NOT EXISTS disease_resistance VARCHAR(150) DEFAULT 'V, F, N, T';

-- 6. Add Segmented Agronomic Notes to vivas_crop_templates
ALTER TABLE vivas_crop_templates
ADD COLUMN IF NOT EXISTS nursery_notes TEXT,
ADD COLUMN IF NOT EXISTS field_notes TEXT,
ADD COLUMN IF NOT EXISTS harvest_notes TEXT;

-- Update scientific_name for existing crops if empty
UPDATE vivas_crops
SET scientific_name = CONCAT(COALESCE(genus, 'Solanum'), ' ', COALESCE(species, 'lycopersicum'))
WHERE scientific_name IS NULL OR scientific_name = '';
