# Complete Implementation Plan: Tend.com Crop Library & Automated Growing Workflows in Vivas AI

This plan provides an exhaustive blueprint for replicating 100% of Tend.com's Crop Library functionality (`https://my.tend.com/my-crops/card-view?parentcropid=109&varietyid=1345&harveststageid=28&id=10629565`) within Vivas AI.

---

## 1. Complete Architecture & Feature Matrix (Tend.com vs Vivas AI)

Tend.com organizes crop data into a **4-Tier Hierarchy** connected to **Automated Task Generators**, **Nursery & Field Specifications**, and **Financial Yield Benchmarks**.

```mermaid
graph TD
    A["1. Parent Crop (e.g., Tomato)"] --> B["2. Variety / Cultivar (e.g., Cherokee Purple)"]
    B --> C["3. Harvest Stage (e.g., Full Mature Fruit)"]
    C --> D["4. Growing Template ID (e.g., ID: 10629565)"]
    
    D --> E1["General Crop Info"]
    D --> E2["Nursery Details"]
    D --> E3["Planting Details"]
    D --> E4["Nursery Automated Tasks"]
    D --> E5["Field Automated Tasks"]
    D --> E6["Custom Add Task Builder"]
    D --> E7["Yield & Revenue Benchmarks"]
```

### 1.1 General Crop Info
- **Botanical Identity**: Common Name, Custom Name, Abbreviation, Genus, Species, Botanical Family (Solanaceae, Brassicaceae, etc.), Category (Vegetables, Herbs, Fruits, Flowers, Microgreens, Cover Crops).
- **Visual Branding**: Crop Icon (Emoji / SVG Avatar), Primary Brand Color Tag.
- **Agronomic Profile**: Description, General Growing Notes, Ideal Soil pH range (e.g., 6.0 - 6.8), Frost Tolerance (Hardy, Half-Hardy, Tender), Light Requirement (Full Sun, Partial Shade), Seasonality (Cool Season, Warm Season).

### 1.2 Nursery Details
- **Nursery Seeding Setup**: Tray Cell Size (20, 32, 50, 72, 128, 200, 288-cell), Seeds Per Cell, Target Germination Rate (%).
- **Environmental Parameters**: Soil Mix Type, Target Germination Temperature range (°F / °C), Days to Germination, Target Nursery Stage Temperature.
- **Nursery Duration**: Days in Nursery (Weeks in Greenhouse), Hardening-Off Period (Days).

### 1.3 Planting Details
- **Seeding / Planting Method**: Direct Sow, Greenhouse Transplant, Bare-Root, Hydroponic.
- **Field Bed Geometry**: Bed Width (e.g., 30", 48"), Bed Length (e.g., 100 ft), Rows Per Bed (1, 2, 3, 4, 5, 6 rows), In-Row Spacing (inches), Row Spacing (inches), Planting Depth (inches).
- **Population Density**: Calculated Target Plants per 100ft Bed & per Acre.

### 1.4 Nursery Planting Automated Tasks (Task Sequence Generator)
Automatically schedules greenhouse tasks relative to the **Sow Date**:
- **Day 0**: Sow Seeds in Nursery Trays (Greenhouse Task)
- **Day 1**: Move Trays to Germination Chamber
- **Day 3-7**: Move Trays to Greenhouse Benches & Initial Watering
- **Day 14**: Inspect Germination & Thin Seedlings (1 per cell)
- **Day 21**: Apply Liquid Organic Fertilizer (Fish Emulsion / Kelp)
- **Day 24-28**: Move Trays to Shade House for Hardening Off

### 1.5 Field Planting Automated Tasks (Task Sequence Generator)
Automatically schedules field tasks relative to the **Transplant / Direct Sow Date**:
- **Day -7**: Bed Preparation (Chisel Plow, Apply Compost & Organic Fertilizer)
- **Day -3**: Lay Drip Irrigation & Plastic / Bio-Mulch
- **Day 0**: Transplant / Direct Sow Field Bed
- **Day 1**: Initial Deep Irrigation Run
- **Day 7**: Wheel Hoe / Flame Weed Cultivation (Pass 1)
- **Day 14**: Pest & Disease Inspection (Foliar Spray if needed)
- **Day 21**: Secondary Cultivation & Hilling (Pass 2)
- **Day 60-90**: Harvest Window (Recurring Daily / Weekly Harvest Tasks)
- **Day 95**: Crop Termination & Bed Flail Mowing / Cover Crop Prep

### 1.6 Custom "Add Tasks" & Task Builder
- Allows farm managers to add custom task triggers to any growing template:
  - Task Name, Task Category (Soil Prep, Seeding, Irrigation, Cultivation, Pest Control, Harvest, Post-Harvest, Maintenance)
  - Offset Days (+/- days relative to Sow Date or Transplant Date)
  - Estimated Labor Hours per 100ft bed
  - Equipment / Tools Required
  - Default Assigned Labor Role (Nursery Tech, Field Hand, Harvester, Manager)

### 1.7 Yield & Revenue Benchmarks
- Target Yield per Bed Foot (e.g., 1.5 kg / ft) or per Sq Ft.
- Target Market Price per Unit (e.g., ₹60 / kg).
- Projected Gross Revenue per 100ft Bed (e.g., 150 kg × ₹60 = ₹9,000).
- Preferred Packaging Unit (lbs, kg, bunches, 250g clamshells, 5kg crates).

---

## 2. Database Migration Plan (`database/crop_library_full_migration.sql`)

```sql
-- 1. Master Harvest Stages
CREATE TABLE IF NOT EXISTS vivas_harvest_stages (
    id SERIAL PRIMARY KEY,
    stage_name VARCHAR(100) NOT NULL UNIQUE, -- Baby Leaf, Full Mature, Microgreen, Bunching, Heavy Fruit
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Seed Suppliers
CREATE TABLE IF NOT EXISTS vivas_seed_suppliers (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL, -- Johnny's Selected Seeds, High Mowing, BioEarth
    contact_email VARCHAR(150),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Comprehensive Crop Templates Table (General Info + Nursery + Planting + Yield)
CREATE TABLE IF NOT EXISTS vivas_crop_templates (
    id SERIAL PRIMARY KEY,
    crop_id INT REFERENCES vivas_crops(id) ON DELETE CASCADE,
    variety_id INT REFERENCES vivas_crop_varieties(id) ON DELETE CASCADE,
    harvest_stage_id INT REFERENCES vivas_harvest_stages(id) ON DELETE SET NULL,
    supplier_id INT REFERENCES vivas_seed_suppliers(id) ON DELETE SET NULL,
    template_name VARCHAR(200) NOT NULL,
    
    -- General Botanical & Agronomic Info
    soil_ph_min NUMERIC(4,2) DEFAULT 6.0,
    soil_ph_max NUMERIC(4,2) DEFAULT 6.8,
    frost_tolerance VARCHAR(50) DEFAULT 'Tender', -- Hardy, Half-Hardy, Tender
    light_requirement VARCHAR(50) DEFAULT 'Full Sun',
    seasonality VARCHAR(50) DEFAULT 'Warm Season',
    
    -- Nursery Details
    planting_method VARCHAR(50) DEFAULT 'Transplant', -- Direct Sow, Transplant, Bare-Root, Hydroponic
    tray_size VARCHAR(50) DEFAULT '72-cell', -- 20, 32, 50, 72, 128, 200, 288-cell
    seeds_per_cell INT DEFAULT 1,
    days_in_nursery INT DEFAULT 28,
    hardening_off_days INT DEFAULT 5,
    germination_temp_f VARCHAR(50) DEFAULT '65-75°F',
    days_to_germination INT DEFAULT 7,
    nursery_target_stage_temp_f VARCHAR(50) DEFAULT '70°F',
    target_germination_rate_pct NUMERIC(5,2) DEFAULT 90.00,
    
    -- Field Planting Details
    bed_width_in NUMERIC(6,2) DEFAULT 30.0,
    bed_length_ft NUMERIC(6,2) DEFAULT 100.0,
    rows_per_bed INT DEFAULT 2,
    in_row_spacing_in NUMERIC(6,2) DEFAULT 12.0,
    row_spacing_in NUMERIC(6,2) DEFAULT 18.0,
    planting_depth_in NUMERIC(6,2) DEFAULT 0.25,
    days_to_maturity INT DEFAULT 65,
    target_plants_per_100ft INT DEFAULT 200,
    
    -- Yield & Financial Benchmarks
    expected_yield_per_ft NUMERIC(10,2) DEFAULT 1.5,
    yield_unit VARCHAR(50) DEFAULT 'kg',
    default_price_per_unit NUMERIC(10,2) DEFAULT 50.00,
    harvest_window_days INT DEFAULT 21,
    est_revenue_per_100ft_bed NUMERIC(12,2) DEFAULT 15000.00,
    
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Nursery Automated Task Sequences Table
CREATE TABLE IF NOT EXISTS vivas_crop_nursery_tasks (
    id SERIAL PRIMARY KEY,
    template_id INT REFERENCES vivas_crop_templates(id) ON DELETE CASCADE,
    task_name VARCHAR(150) NOT NULL,
    task_category VARCHAR(100) DEFAULT 'Seeding', -- Seeding, Germination, Thinning, Irrigation, Fertigation, Hardening
    offset_days INT NOT NULL, -- Days relative to Sow Date (0 = Sow Date)
    est_labor_hours NUMERIC(6,2) DEFAULT 0.5,
    assigned_role VARCHAR(100) DEFAULT 'Nursery Tech',
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Field Planting Automated Task Sequences Table
CREATE TABLE IF NOT EXISTS vivas_crop_field_tasks (
    id SERIAL PRIMARY KEY,
    template_id INT REFERENCES vivas_crop_templates(id) ON DELETE CASCADE,
    task_name VARCHAR(150) NOT NULL,
    task_category VARCHAR(100) DEFAULT 'Transplanting', -- Soil Prep, Irrigation, Transplanting, Cultivation, Pest Control, Harvest, Cleanup
    offset_days INT NOT NULL, -- Days relative to Field Planting Date (0 = Planting Date, -7 = Bed Prep)
    est_labor_hours NUMERIC(6,2) DEFAULT 1.0,
    assigned_role VARCHAR(100) DEFAULT 'Field Hand',
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Backend API Routes (`backend/server.js`)

- `GET /api/crops/hierarchy`: Returns complete 4-tier tree (`Parent Crop → Varieties → Harvest Stages → Templates → Tasks`).
- `GET /api/crops/templates/:id`: Returns complete template object with nursery specs, planting specs, nursery tasks, and field tasks.
- `POST /api/crops/templates`: Creates a full crop template with initial nursery and field task workflows.
- `PUT /api/crops/templates/:id`: Updates template parameters, nursery specs, planting details, and task schedules.
- `DELETE /api/crops/templates/:id`: Archives template.
- `POST /api/crops/templates/:id/nursery-tasks`: Adds a custom automated nursery task.
- `POST /api/crops/templates/:id/field-tasks`: Adds a custom automated field task.
- `DELETE /api/crops/nursery-tasks/:taskId`: Deletes a nursery task.
- `DELETE /api/crops/field-tasks/:taskId`: Deletes a field task.

---

## 4. Frontend Component Architecture (`frontend/src/grow/CropLibrary.jsx`)

### 4.1 URL Deep-Linking & State Management
- Supports direct links: `/#crop-library?parentcropid=109&varietyid=1345&harveststageid=28&id=10629565`.
- Automatically fetches and displays the exact 360 Crop Detail Popup modal on page load.

### 4.2 Views & Sub-Modules
1. **Catalog View Switcher**:
   - **Card View Grid (Tend `my-crops/card-view`)**: Cards showing crop avatar, botanical name, variety count, DTM, seeding method, spacing, yield, price, and hover action icons (Eye 👁️, Edit ✏️, Clone 📑, Delete 🗑️).
   - **Spreadsheet Table View**: Multi-column list for fast review and sorting.
2. **Sub-Module Tabs**:
   - 🌿 **All Crops & Varieties**
   - 📐 **Nursery & Field Planting Details**
   - ⚡ **Nursery & Field Automated Tasks**
   - 💰 **Yield & Revenue Benchmarks**

### 4.3 360 Crop Template Popup Modal (`id=10629565`)
Structured into 5 interactive sub-tabs with Read-Only and Edit Mode toggles:
- **Tab 1: General Crop Info**: Botanical Genus/Species, Family, Category, Description, Soil pH, Frost Tolerance, Light Requirements.
- **Tab 2: Variety & Supplier**: Variety Name, Supplier/Brand, SKU/Item Code, Price/unit.
- **Tab 3: Nursery Details**: Tray Cell Size, Seeds/cell, Days in Nursery, Germ Temp, Target Stage Temp, Hardening Off Days.
- **Tab 4: Field Planting Details**: Seeding Method, Bed Width, Length, Rows/Bed, In-Row Spacing, Row Spacing, Planting Depth, Plants/100ft.
- **Tab 5: Nursery & Field Automated Tasks**:
  - Interactive Task Schedule Table for Nursery & Field tasks.
  - **"+ Add Custom Task"** button to append offset tasks.
- **Action Header**:
  - ✏️ **Edit Button**: Toggles input controls.
  - 💾 **Save Button**: Sends PUT request to persist changes in PostgreSQL.
  - 🗑️ **Delete Button**: Archives template.

---

## 5. Verification & Testing Plan

### Automated Tests
1. Run PostgreSQL database migration script:
   ```bash
   node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/vivas_ai' }); pool.query('SELECT COUNT(*) FROM vivas_crop_templates', (err, res) => { console.log('Templates count:', res.rows[0].count); pool.end(); });"
   ```
2. Build frontend project:
   ```bash
   cd frontend && npm run build
   ```

### Manual Verification
1. Load `/#crop-library?parentcropid=109&varietyid=1345&harveststageid=28&id=10629565`.
2. Verify 360 Crop Modal opens with General Info, Nursery Details, Field Planting Details, and Automated Tasks.
3. Add a custom automated Nursery Task (+14 days: Thin Seedlings) and Field Task (+7 days: Wheel Hoe Cultivation), click **Save Changes**, and verify data persistence in PostgreSQL.
