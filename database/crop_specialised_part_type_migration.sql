-- Migration Script: Add Specialised Plant Part & Crop Type to vivas_crops and vivas_crop_templates
-- Database: vivas_ai

ALTER TABLE vivas_crops
ADD COLUMN IF NOT EXISTS specialised_plant_part VARCHAR(255),
ADD COLUMN IF NOT EXISTS crop_type VARCHAR(50) DEFAULT 'Annual';

ALTER TABLE vivas_crop_templates
ADD COLUMN IF NOT EXISTS specialised_plant_part VARCHAR(255),
ADD COLUMN IF NOT EXISTS crop_type VARCHAR(50) DEFAULT 'Annual';
