# Implementation Plan - General Crop Info & Tend.com Crop Library Enhancements

This implementation plan details the addition of all missing General Crop Info sections and attributes from [Tend.com](https://my.tend.com/my-crops/card-view) to the Vivas AI Crop Library (`frontend/src/grow/CropLibrary.jsx`).

## User Review Required

> [!IMPORTANT]
> **Database Schema Expansion**: New columns will be added to `vivas_crops` and `vivas_crop_templates` to store Scientific Name, Seed Attributes, Crop Attributes, Crop Preferences, Advanced Preferences, and Segmented Agronomic Notes.
> Existing templates and crop catalog records will be retrofitted with default values so that no existing data is impacted.

> [!IMPORTANT]
> **Cascading API Updates**: `POST /api/crops`, `PUT /api/crops/templates/:id`, `GET /api/crops/templates`, and `GET /api/crops/templates/:id` in `backend/server.js` will be updated to handle all newly added botanical fields and allow full CRUD editing in 360 Crop View.

---

## Proposed Changes

### Database Layer

#### [MODIFY] [crop_library_general_info_migration.sql](file:///Volumes/Files/Antigravity%20demo/VivasAI/database/crop_library_general_info_migration.sql)
Create a new migration script to add missing columns to `vivas_crops` and `vivas_crop_templates`:

1. **`vivas_crops` & `vivas_crop_templates` New Columns**:
   - `scientific_name`: Scientific botanical name (e.g. *Solanum lycopersicum*)
   - **Seed Information**:
     - `seeds_per_oz`: Seed count per ounce
     - `seeds_per_gram`: Seed count per gram
     - `seed_viability_years`: Storage life / viability in years
     - `seed_type`: Seed treatment (Organic, Raw, Pelleted, Treated, Prime)
     - `seed_size`: Seed size classification
   - **Crop Attributes**:
     - `growth_habit`: Growth pattern (Determinate, Indeterminate, Bush, Pole, Vining, Rosette)
     - `plant_height_in`: Mature plant height in inches
     - `plant_spread_in`: Mature plant spread/canopy width in inches
     - `crop_lifecycle`: Lifecycle (Annual, Biennial, Perennial)
     - `harvest_part`: Primary harvested part (Fruit, Leaf, Root, Stem, Flower, Seed, Bulb)
     - `harvest_method`: Harvesting method (Cut & Come Again, Single Harvest, Continuous Pick)
   - **Crop Preferences & Environmental Requirements**:
     - `water_needs`: Irrigation requirement (Low, Moderate, Heavy)
     - `ideal_temp_f`: Optimal growing temperature range (e.g. 65-85°F)
   - **Advanced Preferences**:
     - `soil_type`: Preferred soil texture (Loam, Sandy Loam, Clay Loam, Well-drained)
     - `nutrient_demand`: Fertilizer feeder level (Heavy Feeder, Moderate Feeder, Light Feeder, Nitrogen Fixer)
     - `companion_plants`: Good neighbor companion crops
     - `incompatible_plants`: Antagonistic / bad neighbor crops
     - `common_pests`: Common pests and vulnerabilities
     - `disease_resistance`: Disease resistance codes (e.g. V, F, N, T, A)
   - **Segmented Notes**:
     - `nursery_notes`: Nursery & propagation instructions
     - `field_notes`: Field cultivation & bed management notes
     - `harvest_notes`: Harvest timing & post-harvest storage notes

---

### Backend API Layer

#### [MODIFY] [server.js](file:///Volumes/Files/Antigravity%20demo/VivasAI/backend/server.js)

1. **`GET /api/crops/templates` & `GET /api/crops/templates/:id`**:
   - Update SQL `SELECT` to pull all newly added columns (`scientific_name`, `seeds_per_oz`, `seeds_per_gram`, `seed_viability_years`, `seed_type`, `seed_size`, `growth_habit`, `plant_height_in`, `plant_spread_in`, `crop_lifecycle`, `harvest_part`, `harvest_method`, `water_needs`, `ideal_temp_f`, `soil_type`, `nutrient_demand`, `companion_plants`, `incompatible_plants`, `common_pests`, `disease_resistance`, `nursery_notes`, `field_notes`, `harvest_notes`).

2. **`POST /api/crops`**:
   - Update `POST /api/crops` payload handling to insert `scientific_name` into `vivas_crops` and insert seed, crop attribute, preference, and note defaults into `vivas_crop_templates`.

3. **`PUT /api/crops/templates/:id`**:
   - Update `PUT /api/crops/templates/:id` handler to update `vivas_crops` (`scientific_name`, etc.) and `vivas_crop_templates` (all seed attributes, crop attributes, environmental preferences, advanced preferences, and notes).

---

### Frontend UI Component Layer

#### [MODIFY] [CropLibrary.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/grow/CropLibrary.jsx)

1. **360 Crop Detail Popup Modal (`General Crop Info` Tab)**:
   Redesign the **General Crop Info** tab into 6 structured card sections matching Tend.com:
   - **Section 1: Botanical Taxonomy & Classification**: Crop Common Name, Scientific Name (*Genus species*), Custom Name, Variety Name, Botanical Family, Category, Genus, Species, Abbreviation.
   - **Section 2: Seed Information & Attributes**: Seeds/Oz, Seeds/Gram, Storage Viability (years), Seed Type (Organic/Pelleted/Treated), Seed Coating/Size, Germination Rate %, Germination Temp, Days to Germination, Default Seed Supplier.
   - **Section 3: Crop Growth & Harvest Attributes**: Growth Habit, Mature Plant Height (in), Plant Spread (in), Crop Lifecycle, Primary Harvest Part, Harvest Method.
   - **Section 4: Crop Environmental Preferences**: Soil pH Range (Min-Max), Frost Hardiness, Light Requirement, Irrigation / Water Needs, Ideal Temp Range (°F), Seasonality.
   - **Section 5: Advanced Agronomic Preferences**: Soil Type Preference, Fertilizer / Nutrient Demand, Companion Plants, Incompatible Plants, Common Pests & Vulnerabilities, Disease Resistance Codes.
   - **Section 6: Agronomic Notes & Instructions**: General Notes, Nursery Propagation Notes, Field Cultivation Notes, Harvest & Storage Notes.

2. **Interactive CRUD Controls & Icons**:
   - Provide Edit (`<Edit3 />`) and Save (`<Save />`) controls in 360 view with instant live form validation and toast notification.
   - Section headers with clear Lucide icons (`<Leaf />`, `<Sprout />`, `<Sun />`, `<SlidersHorizontal />`, `<ShieldCheck />`, `<AlertTriangle />`, `<Zap />`).

3. **Add New Master Crop Drawer Modal**:
   - Update creation form drawer to include fields for Scientific Name, Growth Habit, Seed Type, Water Needs, Soil Type, and Agronomic Notes.

---

## Verification Plan

### Automated Tests
- Run `npm run build` in `frontend/` to verify zero JSX or build errors.
- Run node script to test Postgres migration and verify column additions in `vivas_crops` and `vivas_crop_templates`.

### Manual Verification
- Test creating a new crop with Scientific Name, Seed Attributes, and Advanced Preferences in Vivas AI.
- Open 360 Crop View on the newly created crop and verify all 6 General Crop Info sections render accurately.
- Toggle Edit mode (`Edit 360`), modify Scientific Name, Seed Type, Companion Plants, and Notes, and click `Save Changes`.
- Verify persistence in DB and instant UI updates.
- Deploy updated code to remote production server (`178.104.164.176`) and restart PM2 `vivasai-backend`.
