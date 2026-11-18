-- ============================================================
-- VIVAS AI - 80 CROPS MASTER CATALOG & DEMO AUTH SEED SCRIPT
-- ============================================================

-- 1. DEMO USER AUTHENTICATION
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

-- Reset / Ensure admin@vivas.ai exists with password 'admin123'
-- SHA-256 for 'admin123' -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT INTO vivas_users (full_name, email, password_hash, farm_name, role)
VALUES ('Admin User', 'admin@vivas.ai', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Vivas AI Demo Farm', 'Farm Administrator')
ON CONFLICT (email) DO UPDATE SET
  password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  is_active = TRUE;

-- 2. MASTER 80 CROPS SEEDING
TRUNCATE TABLE vivas_crop_nursery_tasks CASCADE;
TRUNCATE TABLE vivas_crop_field_tasks CASCADE;
TRUNCATE TABLE vivas_crop_templates CASCADE;
TRUNCATE TABLE vivas_crop_varieties CASCADE;
TRUNCATE TABLE vivas_crops CASCADE;

-- Insert 80 Master Crops
INSERT INTO vivas_crops (id, name, custom_name, abbreviation, crop_family, genus, species, category, icon, color, description, is_active) VALUES
-- 1. Greens & Salads (10)
('c0100000-0000-0000-0000-000000000001', 'Butterhead Lettuce', 'Crisphead & Salanova Butterhead', 'BLT', 'Asteraceae', 'Lactuca', 'sativa', 'Greens', '🥬', '#43a047', 'Tender, buttery leaves forming soft heads for premium salad mixes.', TRUE),
('c0100000-0000-0000-0000-000000000002', 'Romaine Lettuce', 'Cos & Parris Island Lettuce', 'RLT', 'Asteraceae', 'Lactuca', 'sativa', 'Greens', '🥬', '#2e7d32', 'Sturdy, upright romaine leaves with crisp ribs, essential for Caesar salads.', TRUE),
('c0100000-0000-0000-0000-000000000003', 'Crisphead Lettuce', 'Iceberg & Head Lettuce', 'CLT', 'Asteraceae', 'Lactuca', 'sativa', 'Greens', '🥬', '#388e3c', 'Dense, compact round heads with high water content and long shelf life.', TRUE),
('c0100000-0000-0000-0000-000000000004', 'Baby Spinach', 'Bloomsdale & Space Baby Spinach', 'SPN', 'Amaranthaceae', 'Spinacia', 'oleracea', 'Greens', '🍃', '#1b5e20', 'Fast-growing cool season greens harvested as tender baby leaves.', TRUE),
('c0100000-0000-0000-0000-000000000005', 'Arugula', 'Wild Rocket & Astro Arugula', 'ARG', 'Brassicaceae', 'Eruca', 'vesicaria', 'Greens', '🌿', '#22c55e', 'Peppery, pungent salad green rich in antioxidants.', TRUE),
('c0100000-0000-0000-0000-000000000006', 'Swiss Chard', 'Rainbow & Fordhook Chard', 'SWC', 'Amaranthaceae', 'Beta', 'vulgaris', 'Greens', '🥬', '#d97706', 'Vibrant stems with dark green glossy leaves, continuous harvest.', TRUE),
('c0100000-0000-0000-0000-000000000007', 'Kale', 'Curly & Lacinato Dino Kale', 'KLE', 'Brassicaceae', 'Brassica', 'oleracea', 'Greens', '🥬', '#047857', 'Nutrient-dense superfood green withstanding cold frost.', TRUE),
('c0100000-0000-0000-0000-000000000008', 'Mache', 'Corn Salad / Lambs Lettuce', 'MCH', 'Valerianaceae', 'Valerianella', 'locusta', 'Greens', '🌱', '#16a34a', 'Delicate rosette salad green with mild nutty flavor.', TRUE),
('c0100000-0000-0000-0000-000000000009', 'Mizuna Greens', 'Japanese Mustard Mizuna', 'MIZ', 'Brassicaceae', 'Brassica', 'rapa', 'Greens', '🌿', '#15803d', 'Feathery serrated mustard green for spicy salad accents.', TRUE),
('c0100000-0000-0000-0000-000000000010', 'Tatsoi', 'Spoon Mustard Rosette', 'TAT', 'Brassicaceae', 'Brassica', 'narinosa', 'Greens', '🍃', '#065f46', 'Dark green spoon-shaped leaves growing in compact ground rosettes.', TRUE),

-- 2. Solanaceous Vegetables (8)
('c0200000-0000-0000-0000-000000000011', 'Slicing Tomatoes', 'Heirloom & Beefsteak Tomatoes', 'TOM', 'Solanaceae', 'Solanum', 'lycopersicum', 'Vegetables', '🍅', '#d32f2f', 'Large, juicy warm-season slicing fruit for market sales.', TRUE),
('c0200000-0000-0000-0000-000000000012', 'Cherry Tomatoes', 'Sweet 100 & Sun Gold Cherry', 'CTM', 'Solanaceae', 'Solanum', 'lycopersicum', 'Vegetables', '🍅', '#e53935', 'Bite-sized sweet clusters yielding heavily over extended harvest.', TRUE),
('c0200000-0000-0000-0000-000000000013', 'Plum Tomatoes', 'San Marzano & Roma Sauce Tomatoes', 'PTM', 'Solanaceae', 'Solanum', 'lycopersicum', 'Vegetables', '🍅', '#c62828', 'Meaty, low-moisture paste tomatoes ideal for sauces and canning.', TRUE),
('c0200000-0000-0000-0000-000000000014', 'Sweet Bell Peppers', 'California Wonder Sweet Bell', 'PEP', 'Solanaceae', 'Capsicum', 'annuum', 'Vegetables', '🫑', '#388e3c', 'Crisp, thick-walled sweet peppers high in Vitamin C.', TRUE),
('c0200000-0000-0000-0000-000000000015', 'Hot Peppers', 'Jalapeño & Serrano Peppers', 'HPP', 'Solanaceae', 'Capsicum', 'annuum', 'Vegetables', '🌶️', '#b71c1c', 'Spicy hot peppers continuous picking for salsa and hot sauces.', TRUE),
('c0200000-0000-0000-0000-000000000016', 'Eggplant', 'Black Beauty & Japanese Eggplant', 'EGP', 'Solanaceae', 'Solanum', 'melongena', 'Vegetables', '🍆', '#6a1b9a', 'Glossy purple oval fruit for grilling and roasted dishes.', TRUE),
('c0200000-0000-0000-0000-000000000017', 'Tomatillo', 'Toma Verde Husked Tomatillo', 'TMT', 'Solanaceae', 'Physalis', 'philadelphica', 'Vegetables', '🟢', '#558b2f', 'Husk-enclosed tangy fruit essential for salsa verde.', TRUE),
('c0200000-0000-0000-0000-000000000018', 'Paprika Pepper', 'Hungarian Sweet Paprika', 'PPK', 'Solanaceae', 'Capsicum', 'annuum', 'Vegetables', '🌶️', '#d84315', 'Mild sweet drying peppers for artisan spice powders.', TRUE),

-- 3. Roots & Tubers (10)
('c0300000-0000-0000-0000-000000000019', 'Nantes Carrots', 'Sweet Nantes Bunching Carrots', 'CAR', 'Apiaceae', 'Daucus', 'carota', 'Roots', '🥕', '#ef6c00', 'Cylindrical sweet orange root crops for fresh bunches.', TRUE),
('c0300000-0000-0000-0000-000000000020', 'Storage Carrots', 'Bolero Heavy Storage Carrots', 'SCR', 'Apiaceae', 'Daucus', 'carota', 'Roots', '🥕', '#e65100', 'Sturdy storage roots holding quality through winter cold.', TRUE),
('c0300000-0000-0000-0000-000000000021', 'Red Radish', 'Cherry Belle Quick Radish', 'RAD', 'Brassicaceae', 'Raphanus', 'sativus', 'Roots', '🥊', '#c62828', 'Fast 25-day crisp red globes with white interior.', TRUE),
('c0300000-0000-0000-0000-000000000022', 'Daikon Radish', 'Japanese Long White Daikon', 'DRD', 'Brassicaceae', 'Raphanus', 'sativus', 'Roots', '🤍', '#9e9e9e', 'Large white taproot excellent for pickling and soil aeration.', TRUE),
('c0300000-0000-0000-0000-000000000023', 'Red Beetroot', 'Detroit Dark Red Beetroot', 'BET', 'Amaranthaceae', 'Beta', 'vulgaris', 'Roots', '🔴', '#880e4f', 'Deep red roots and edible greens rich in natural sugars.', TRUE),
('c0300000-0000-0000-0000-000000000024', 'Golden Beetroot', 'Touchstone Gold Sweet Beet', 'GBT', 'Amaranthaceae', 'Beta', 'vulgaris', 'Roots', '🟡', '#f57f17', 'Sweet golden roots that do not stain during cooking.', TRUE),
('c0300000-0000-0000-0000-000000000025', 'Turnips', 'Hakurei & Purple Top Turnips', 'TRN', 'Brassicaceae', 'Brassica', 'rapa', 'Roots', '⚪', '#7b1fa2', 'Tender salad turnips eaten fresh or lightly steamed.', TRUE),
('c0300000-0000-0000-0000-000000000026', 'Parsnips', 'Hollow Crown Sweet Parsnip', 'PRS', 'Apiaceae', 'Pastinaca', 'sativa', 'Roots', '🥕', '#fbc02d', 'Sweet ivory root improved after autumn frost.', TRUE),
('c0300000-0000-0000-0000-000000000027', 'Sweet Potatoes', 'Beauregard Orange Sweet Potato', 'SPT', 'Convolvulaceae', 'Ipomoea', 'batatas', 'Roots', '🍠', '#e65100', 'Nutrient-rich orange tubers cured for long-term storage.', TRUE),
('c0300000-0000-0000-0000-000000000028', 'Red Potatoes', 'Red Pontiac Potato', 'POT', 'Solanaceae', 'Solanum', 'tuberosum', 'Roots', '🥔', '#bf360c', 'Smooth red skin with firm waxy flesh for boiling.', TRUE),

-- 4. Cucurbits & Vines (8)
('c0400000-0000-0000-0000-000000000029', 'Slicing Cucumbers', 'Marketmore Slicing Cucumber', 'CUK', 'Cucurbitaceae', 'Cucumis', 'sativus', 'Vegetables', '🥒', '#1b5e20', 'High-yielding green vine cucumber for fresh markets.', TRUE),
('c0400000-0000-0000-0000-000000000030', 'Pickling Cucumbers', 'National Pickling Cucumber', 'PCK', 'Cucurbitaceae', 'Cucumis', 'sativus', 'Vegetables', '🥒', '#2e7d32', 'Short blocky fruits with spines perfect for pickles.', TRUE),
('c0400000-0000-0000-0000-000000000031', 'Zucchini', 'Black Beauty & Golden Zucchini', 'ZUC', 'Cucurbitaceae', 'Cucurbita', 'pepo', 'Vegetables', '🥒', '#33691e', 'Prolific summer squash harvested continuously.', TRUE),
('c0400000-0000-0000-0000-000000000032', 'Yellow Squash', 'Early Straightneck Yellow Squash', 'YSQ', 'Cucurbitaceae', 'Cucurbita', 'pepo', 'Vegetables', '🟡', '#fbc02d', 'Tender yellow squash with mild buttery flavor.', TRUE),
('c0400000-0000-0000-0000-000000000033', 'Butternut Squash', 'Waltham Winter Butternut', 'BSQ', 'Cucurbitaceae', 'Cucurbita', 'moschata', 'Vegetables', '🎃', '#ef6c00', 'Sweet tan winter squash with rich orange flesh.', TRUE),
('c0400000-0000-0000-0000-000000000034', 'Acorn Squash', 'Table Queen Dark Green Acorn', 'ASQ', 'Cucurbitaceae', 'Cucurbita', 'pepo', 'Vegetables', '🎃', '#1b5e20', 'Ribbed acorn-shaped squash with sweet nut flavor.', TRUE),
('c0400000-0000-0000-0000-000000000035', 'Pumpkins', 'Sugar Pie & Jack O Lantern', 'PMK', 'Cucurbitaceae', 'Cucurbita', 'pepo', 'Vegetables', '🎃', '#e65100', 'Classic orange pie and display pumpkins.', TRUE),
('c0400000-0000-0000-0000-000000000036', 'Watermelon', 'Sugar Baby Sweet Watermelon', 'WTM', 'Cucurbitaceae', 'Citrullus', 'lanatus', 'Fruits', '🍉', '#c62828', 'Sweet crisp icebox melon with dark green rind.', TRUE),

-- 5. Cruciferous Vegetables (8)
('c0500000-0000-0000-0000-000000000037', 'Broccoli', 'Calabrese Main Crop Broccoli', 'BRO', 'Brassicaceae', 'Brassica', 'oleracea', 'Vegetables', '🥦', '#1b5e20', 'Tight blue-green central heads followed by side shoots.', TRUE),
('c0500000-0000-0000-0000-000000000038', 'Cauliflower', 'Snowball White Cauliflower', 'CLF', 'Brassicaceae', 'Brassica', 'oleracea', 'Vegetables', '🥦', '#e0e0e0', 'Dense white curds protected by self-blanching leaves.', TRUE),
('c0500000-0000-0000-0000-000000000039', 'Green Cabbage', 'Golden Acre Head Cabbage', 'GCB', 'Brassicaceae', 'Brassica', 'oleracea', 'Vegetables', '🥬', '#2e7d32', 'Solid round green heads for slaw and storage.', TRUE),
('c0500000-0000-0000-0000-000000000040', 'Red Cabbage', 'Red Acre Storage Cabbage', 'RCB', 'Brassicaceae', 'Brassica', 'oleracea', 'Vegetables', '🥬', '#6a1b9a', 'Vibrant magenta-red heads packed with anthocyanins.', TRUE),
('c0500000-0000-0000-0000-000000000041', 'Brussels Sprouts', 'Long Island Brussels Sprouts', 'BSP', 'Brassicaceae', 'Brassica', 'oleracea', 'Vegetables', '🥦', '#33691e', 'Tall stalks lined with mini cabbage-like sprouts.', TRUE),
('c0500000-0000-0000-0000-000000000042', 'Kohlrabi', 'Winner & Purple Vienna Kohlrabi', 'KHL', 'Brassicaceae', 'Brassica', 'oleracea', 'Vegetables', '🔮', '#4a148c', 'Crisp turnip-flavored swollen stems for fresh eating.', TRUE),
('c0500000-0000-0000-0000-000000000043', 'Bok Choy', 'Joi Choi Baby Pak Choi', 'BCY', 'Brassicaceae', 'Brassica', 'rapa', 'Greens', '🥬', '#1b5e20', 'Crisp white petioles with tender green leaves.', TRUE),
('c0500000-0000-0000-0000-000000000044', 'Napa Cabbage', 'Blues Chinese Cabbage', 'NCB', 'Brassicaceae', 'Brassica', 'rapa', 'Vegetables', '🥬', '#558b2f', 'Elongated barrel heads ideal for kimchi and stir-fries.', TRUE),

-- 6. Alliums (6)
('c0600000-0000-0000-0000-000000000045', 'Yellow Onions', 'Stuttgarter Yellow Storage Onion', 'YON', 'Amaryllidaceae', 'Allium', 'cepa', 'Vegetables', '🧅', '#f57f17', 'Pungent yellow bulb onion with long storage life.', TRUE),
('c0600000-0000-0000-0000-000000000046', 'Red Onions', 'Red Baron Storage Onion', 'RON', 'Amaryllidaceae', 'Allium', 'cepa', 'Vegetables', '🧅', '#880e4f', 'Crisp red onion with dark purple rings.', TRUE),
('c0600000-0000-0000-0000-000000000047', 'Spring Onions', 'White Lisbon Scallions', 'SON', 'Amaryllidaceae', 'Allium', 'fistulosum', 'Greens', '🌱', '#2e7d32', 'Non-bulbing green onions harvested young in bunches.', TRUE),
('c0600000-0000-0000-0000-000000000048', 'Garlic', 'Music Hardneck Garlic', 'GRL', 'Amaryllidaceae', 'Allium', 'sativum', 'Herbs', '🧄', '#eeeeee', 'Flavorful garlic cloves cured for culinary spice.', TRUE),
('c0600000-0000-0000-0000-000000000049', 'Leeks', 'Lancelot Summer Leek', 'LEK', 'Amaryllidaceae', 'Allium', 'ampeloprasum', 'Vegetables', '🌱', '#33691e', 'Long blanched white shafts with mild sweet flavor.', TRUE),
('c0600000-0000-0000-0000-000000000050', 'Shallots', 'French Red Gourmet Shallot', 'SHL', 'Amaryllidaceae', 'Allium', 'cepa', 'Vegetables', '🧅', '#ad1457', 'Delicate gourmet allium with reddish copper skin.', TRUE),

-- 7. Culinary Herbs (10)
('c0700000-0000-0000-0000-000000000051', 'Sweet Basil', 'Genovese Italian Sweet Basil', 'BSL', 'Lamiaceae', 'Ocimum', 'basilicum', 'Herbs', '🌿', '#00796b', 'Aromatic basil for pesto and fresh Mediterranean dishes.', TRUE),
('c0700000-0000-0000-0000-000000000052', 'Cilantro', 'Santo Bolt Resistant Cilantro', 'CLT', 'Apiaceae', 'Coriandrum', 'sativum', 'Herbs', '🌿', '#2e7d32', 'Fresh citrusy leaves used in salsas and curries.', TRUE),
('c0700000-0000-0000-0000-000000000053', 'Flat-Leaf Parsley', 'Giant of Italy Parsley', 'PRS', 'Apiaceae', 'Petroselinum', 'crispum', 'Herbs', '🌿', '#1b5e20', 'Robust flat green leaves for culinary seasoning.', TRUE),
('c0700000-0000-0000-0000-000000000054', 'Curly Parsley', 'Triple Curled Parsley', 'CPS', 'Apiaceae', 'Petroselinum', 'crispum', 'Herbs', '🌿', '#33691e', 'Decorative curled leaves for garnishes.', TRUE),
('c0700000-0000-0000-0000-000000000055', 'Dill', 'Bouquet Leaf & Seed Dill', 'DLL', 'Apiaceae', 'Anethum', 'graveolens', 'Herbs', '🌿', '#558b2f', 'Feathery foliage used in pickles and seafood.', TRUE),
('c0700000-0000-0000-0000-000000000056', 'Mint', 'Spearmint & Peppermint', 'MNT', 'Lamiaceae', 'Mentha', 'spicata', 'Herbs', '🌿', '#009688', 'Vigorous perennial herb for teas and cocktails.', TRUE),
('c0700000-0000-0000-0000-000000000057', 'Thyme', 'English Culinary Thyme', 'THM', 'Lamiaceae', 'Thymus', 'vulgaris', 'Herbs', '🌿', '#43a047', 'Woody perennial herb with tiny aromatic leaves.', TRUE),
('c0700000-0000-0000-0000-000000000058', 'Oregano', 'Greek Wild Oregano', 'ORG', 'Lamiaceae', 'Origanum', 'vulgare', 'Herbs', '🌿', '#2e7d32', 'Pungent dried and fresh herb for sauces.', TRUE),
('c0700000-0000-0000-0000-000000000059', 'Rosemary', 'Tuscan Blue Rosemary', 'RSM', 'Lamiaceae', 'Salvia', 'rosmarinus', 'Herbs', '🌿', '#1b5e20', 'Needle-like evergreen leaves with pine aroma.', TRUE),
('c0700000-0000-0000-0000-000000000060', 'Sage', 'Broadleaf Garden Sage', 'SGE', 'Lamiaceae', 'Salvia', 'officinalis', 'Herbs', '🌿', '#558b2f', 'Velvety grey-green leaves for savory roasts.', TRUE),

-- 8. Legumes & Pods (6)
('c0800000-0000-0000-0000-000000000061', 'Bush Green Beans', 'Provider Bush Green Bean', 'GNB', 'Fabaceae', 'Phaseolus', 'vulgaris', 'Vegetables', '🫘', '#2e7d32', 'Compact bush plants producing straight round pods.', TRUE),
('c0800000-0000-0000-0000-000000000062', 'Pole String Beans', 'Kentucky Wonder Pole Bean', 'PLB', 'Fabaceae', 'Phaseolus', 'vulgaris', 'Vegetables', '🫘', '#1b5e20', 'Climbing pole vines yielding heavy crops over summer.', TRUE),
('c0800000-0000-0000-0000-000000000063', 'Snap Peas', 'Sugar Ann Sweet Snap Pea', 'SNP', 'Fabaceae', 'Pisum', 'sativum', 'Vegetables', '🫛', '#43a047', 'Edible crunchy sweet pods eaten fresh off vine.', TRUE),
('c0800000-0000-0000-0000-000000000064', 'Snow Peas', 'Mammoth Melting Snow Pea', 'SNW', 'Fabaceae', 'Pisum', 'sativum', 'Vegetables', '🫛', '#558b2f', 'Flat tender pods used in stir-fries.', TRUE),
('c0800000-0000-0000-0000-000000000065', 'Edamame', 'Midori Giant Soybeans', 'EDM', 'Fabaceae', 'Glycine', 'max', 'Vegetables', '🫛', '#33691e', 'Large green soybean pods steamed for snacks.', TRUE),
('c0800000-0000-0000-0000-000000000066', 'Fava Beans', 'Windsor Broad Bean', 'FVB', 'Fabaceae', 'Vicia', 'faba', 'Vegetables', '🫘', '#1b5e20', 'Cool-season large pods containing buttery green beans.', TRUE),

-- 9. Grains, Berries & Fruits (6)
('c0900000-0000-0000-0000-000000000067', 'Sweet Corn', 'Peaches & Cream Sweet Corn', 'CRN', 'Poaceae', 'Zea', 'mays', 'Vegetables', '🌽', '#fbc02d', 'Bi-color tender sweet ears for summer harvest.', TRUE),
('c0900000-0000-0000-0000-000000000068', 'Strawberries', 'Albion Everbearing Strawberry', 'STR', 'Rosaceae', 'Fragaria', 'ananassa', 'Fruits', '🍓', '#c2185b', 'High-value perennial berries with sweet flavor.', TRUE),
('c0900000-0000-0000-0000-000000000069', 'Muskmelon', 'Hales Best Cantaloupe Melon', 'MLN', 'Cucurbitaceae', 'Cucumis', 'melo', 'Fruits', '🍈', '#f57f17', 'Sweet orange fragrant flesh with netted rind.', TRUE),
('c0900000-0000-0000-0000-000000000070', 'Honeydew Melon', 'Green Flesh Honeydew', 'HDM', 'Cucurbitaceae', 'Cucumis', 'melo', 'Fruits', '🍈', '#7cb342', 'Smooth pale rind with juicy green flesh.', TRUE),
('c0900000-0000-0000-0000-000000000071', 'Okra', 'Clemson Spineless Lady Finger', 'OKR', 'Malvaceae', 'Abelmoschus', 'esculentus', 'Vegetables', '🌾', '#33691e', 'Tender green pods harvested daily in heat.', TRUE),
('c0900000-0000-0000-0000-000000000072', 'Sunflower', 'Mammoth Seed Sunflower', 'SNF', 'Asteraceae', 'Helianthus', 'annuus', 'Flowers', '🌻', '#fbc02d', 'Giant yellow heads producing edible seeds.', TRUE),

-- 10. Specialty & Flowers (8)
('c1000000-0000-0000-0000-000000000073', 'Sunflower Microgreens', 'Black Oil Sunflower Shoots', 'SMG', 'Asteraceae', 'Helianthus', 'annuus', 'Microgreens', '🌻', '#7cb342', 'Nutty, crunchy microgreen shoots grown in 10 days.', TRUE),
('c1000000-0000-0000-0000-000000000074', 'Pea Shoot Microgreens', 'Dun Pea Tendril Microgreens', 'PMG', 'Fabaceae', 'Pisum', 'sativum', 'Microgreens', '🫛', '#558b2f', 'Sweet tendril shoots for garnishes and salads.', TRUE),
('c1000000-0000-0000-0000-000000000075', 'Broccoli Microgreens', 'Waltham Broccoli Microgreens', 'BMG', 'Brassicaceae', 'Brassica', 'oleracea', 'Microgreens', '🥦', '#33691e', 'Mild sulforaphane-rich microgreen greens.', TRUE),
('c1000000-0000-0000-0000-000000000076', 'Radish Microgreens', 'Rambo Purple Radish Microgreens', 'RMG', 'Brassicaceae', 'Raphanus', 'sativus', 'Microgreens', '🥊', '#880e4f', 'Spicy purple shoots with high visual contrast.', TRUE),
('c1000000-0000-0000-0000-000000000077', 'Edible Nasturtium', 'Jewel Mix Edible Flowers', 'NST', 'Tropaeolaceae', 'Tropaeolum', 'majus', 'Flowers', '🌺', '#e65100', 'Peppery edible flowers and leaves for culinary art.', TRUE),
('c1000000-0000-0000-0000-000000000078', 'Edible Calendula', 'Pacific Beauty Marigold', 'CLD', 'Asteraceae', 'Calendula', 'officinalis', 'Flowers', '🌼', '#f57f17', 'Bright orange petals used in salads and teas.', TRUE),
('c1000000-0000-0000-0000-000000000079', 'French Marigold', 'Sparky Mix Companion Flower', 'MGD', 'Asteraceae', 'Tagetes', 'patula', 'Flowers', '🌼', '#e65100', 'Pest deterrent companion plant with golden blooms.', TRUE),
('c1000000-0000-0000-0000-000000000080', 'Chamomile', 'German Herbal Chamomile', 'CHM', 'Asteraceae', 'Matricaria', 'chamomilla', 'Herbs', '🌼', '#fbc02d', 'Apple-scented white flowers dried for herbal tea.', TRUE);

-- 3. SEED VARIETIES AND TEMPLATES FOR ALL 80 CROPS
INSERT INTO vivas_crop_varieties (crop_id, variety_name, supplier, days_to_maturity, days_to_germination, harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size)
SELECT 
  id, 
  COALESCE(custom_name, 'Standard Variety'),
  'Johnny''s Selected Seeds',
  60, 7, 'Mature', 'Transplant', 12.0, 18.0, 2, 1.5, 'kg', 50.00, '72-cell'
FROM vivas_crops;

INSERT INTO vivas_crop_templates (crop_id, variety_id, template_name, planting_method, tray_size, days_to_maturity, in_row_spacing_in, row_spacing_in, expected_yield_per_ft, yield_unit, default_price_per_unit, est_revenue_per_100ft_bed)
SELECT 
  c.id,
  v.id,
  c.name || ' - ' || v.variety_name,
  'Transplant',
  '72-cell',
  60, 12.0, 18.0, 1.5, 'kg', 50.00, 7500.00
FROM vivas_crops c
JOIN vivas_crop_varieties v ON v.crop_id = c.id;
