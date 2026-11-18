-- Migration: Crop Categories & Add New Options Enhancement for Vivas AI
-- Environment: LOCAL ONLY (vivas_ai PostgreSQL)

-- 1. Create table vivas_crop_categories
CREATE TABLE IF NOT EXISTS vivas_crop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT '🌱',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed tend.com standard crop categories
INSERT INTO vivas_crop_categories (name, icon, description) VALUES
('Vegetables', '🥬', 'Edible plants including leafy greens, roots, tubers, and fruiting vegetables'),
('Spices and Herbs', '🌿', 'Aromatic culinary and medicinal herbs and spice plants'),
('Flowers & Ornamentals', '🌸', 'Cut flowers, bedding plants, and ornamental farm flora'),
('Cover Crops & Farm Seed', '🌾', 'Soil-building green manures, erosion control, and bio-fumigants'),
('Mushrooms', '🍄', 'Cultivated fungi and culinary mushroom species'),
('Legumes', '🫘', 'Nitrogen-fixing pulse crops, beans, peas, and lentils'),
('Grains', '🌾', 'Cereal crops including wheat, oats, rye, corn, and barley'),
('Industrial', '🏭', 'Commercial non-food crops including fiber, dye, and biofuel species'),
('Medicinal', '💊', 'Herbal and botanical species cultivated for medicinal uses'),
('Beverage', '☕', 'Tea, coffee, hops, and beverage crops'),
('Nuts and Seeds', '🥜', 'Tree nuts, edible seeds, and oil-rich seeds'),
('Oilseeds', '🌻', 'Oil-producing crops such as sunflower, canola, and sesame'),
('Sugar and Sweetener', '🍯', 'Sweetener crops including sugarcane, sugar beet, and sweet sorghum'),
('Fruits', '🍎', 'Tree fruits, cane berries, bush berries, and vine fruits'),
('Animal Feed and Forage', '🐄', 'Pasture grasses, silage crops, and livestock forage species')
ON CONFLICT (name) DO NOTHING;

-- 3. Add category_id foreign key to vivas_crops if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vivas_crops' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE vivas_crops ADD COLUMN category_id UUID REFERENCES vivas_crop_categories(id) ON DELETE SET NULL;
    END IF;
END $$;
