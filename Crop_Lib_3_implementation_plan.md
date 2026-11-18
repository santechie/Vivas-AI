# Implementation Plan - Tend.com Style "Add New" (Crop & Variety, Crop, Variety) and Crop Categories

Implement the tend.com **"Add New"** dropdown menu feature in Vivas AI's Crop Library along with **Crop Categories** management and CRUD operations, strictly in the local environment without altering existing functionalities.

---

## User Review Required

> [!IMPORTANT]
> **Local Environment Only**: All database migrations, backend API endpoints, and frontend modifications will be executed **ONLY** on the local environment (`http://localhost:5001` / Vite dev server) as requested, with no deployment to the remote server.

> [!NOTE]
> **Tend.com Categories Alignment**: 15 standard crop categories from tend.com will be seeded into the database (`vivas_crop_categories`), allowing users to categorize and filter crops easily in the Crop Library.

---

## Proposed Changes

### Database Migration (Local PostgreSQL `vivas_ai`)

#### [NEW] [crop_categories_migration.sql](file:///Volumes/Files/Antigravity%20demo/VivasAI/database/crop_categories_migration.sql)
- Create table `vivas_crop_categories`:
  - `id` (UUID, Primary Key)
  - `name` (VARCHAR, Unique, e.g., 'Vegetables', 'Spices and Herbs', 'Flowers & Ornamentals', etc.)
  - `icon` (VARCHAR, e.g. '🥬', '🌿', '🌸', '🌾')
  - `description` (TEXT)
  - `created_at` (TIMESTAMP)
- Seed 15 tend.com standard categories:
  1. Vegetables
  2. Spices and Herbs
  3. Flowers & Ornamentals
  4. Cover Crops & Farm Seed
  5. Mushrooms
  6. Legumes
  7. Grains
  8. Industrial
  9. Medicinal
  10. Beverage
  11. Nuts and Seeds
  12. Oilseeds
  13. Sugar and Sweetener
  14. Fruits
  15. Animal Feed and Forage
- Add `category_id` (FOREIGN KEY referencing `vivas_crop_categories(id)`) to `vivas_crops` if not present.

---

### Backend API (`backend/server.js`)

#### [MODIFY] [server.js](file:///Volumes/Files/Antigravity%20demo/VivasAI/backend/server.js)

1. **Crop Categories Endpoints**:
   - `GET /api/crops/categories` - Fetch all crop categories.
   - `POST /api/crops/categories` - Create custom category.
   - `PUT /api/crops/categories/:id` - Update category.
   - `DELETE /api/crops/categories/:id` - Delete custom category.

2. **Add New Flow Endpoints**:
   - **`POST /api/crops`** (Crop or Crop & Variety):
     - Handles creation of master crop record in `vivas_crops`.
     - If variety data is included (`variety_name`), creates variety in `vivas_crop_varieties` and template in `vivas_crop_templates`.
     - Returns `{ success: true, data: { crop, variety, template_id } }`.
   - **`POST /api/crops/:id/varieties`** (Variety Only):
     - Adds a new variety to an existing master crop (ID passed in params).
     - Generates default growing template (`vivas_crop_templates`) and returns `template_id`.

---

### Frontend UI (`frontend/src/grow/CropLibrary.jsx`)

#### [MODIFY] [CropLibrary.jsx](file:///Volumes/Files/Antigravity%20demo/VivasAI/frontend/src/grow/CropLibrary.jsx)

1. **"Add New" Dropdown Button**:
   - Replace single "Add New Crop" button with tend.com style **"Add New"** split button / dropdown menu containing:
     - 🌿 **Crop & Variety**: Opens modal to create a new Master Crop + Variety simultaneously.
     - 🌱 **Crop**: Opens modal to create a new Master Crop only.
     - 🌾 **Variety**: Opens modal to select an existing Master Crop and create a new Variety for it.

2. **Modal Screens**:
   - **`Add Crop & Variety Modal`**: Full creation flow with Crop Name, Category selector (from `vivas_crop_categories`), Scientific Name, Variety Name, DTM, Seeding Method, and Days to Maturity.
   - **`Add Crop Modal`**: Streamlined form for Master Crop details & Category selection.
   - **`Add Variety Modal`**: Includes a searchable Master Crop selector dropdown + Variety details (Name, DTM, Seeding Method, Description).

3. **Crop Categories Manager & Filter UI**:
   - Display category filter dropdown / pill bar featuring tend.com categories.
   - Allow filtering catalog cards by category.
   - Provide a category management modal for CRUD operations on categories.

---

## Verification Plan

### Automated / API Verification
- Run database migration on local PostgreSQL (`vivas_ai`).
- Test `GET /api/crops/categories` to confirm 15 seeded categories return.
- Test `POST /api/crops` for "Crop & Variety" payload creation.
- Test `POST /api/crops` for "Crop" payload creation.
- Test `POST /api/crops/:id/varieties` for "Variety" payload creation.

### Manual Verification
1. Launch local dev server (`npm run dev`).
2. Navigate to **Grow -> Crop Library** in local Vivas AI (`http://localhost:5173/grow/crop-library`).
3. Click **Add New** button and verify dropdown menu shows 3 options:
   - Crop & Variety
   - Crop
   - Variety
4. Click **Crop & Variety**, fill in fields, click Save: verify crop card appears and 360 view opens.
5. Click **Crop**, fill in master crop details, click Save: verify master crop is created.
6. Click **Variety**, select created crop, fill in variety details, click Save: verify new variety is added to the crop.
7. Test filtering by **Crop Categories** (Vegetables, Spices and Herbs, Flowers & Ornamentals, etc.).
