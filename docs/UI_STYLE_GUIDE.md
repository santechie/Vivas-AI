# VivasAI Enterprise UI Style Guide & Design Standard (Option C: Agronomic Luxe)

This document formalizes the production design pattern for VivasAI based on **Option C (Agronomic Luxe)**. All screens, existing components, and newly developed modules must adhere to these rules.

---

## 1. Domain Color Architecture

| Domain | Color Name | Primary Token | Light Tint (`10%`) | Border Accent (`25%`) | Standard Usage across VivasAI |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Agronomy & Growth** | **Forest Emerald Green** | `#1B7A2B` | `#F0F9F1` | `#C3E6C9` | Top banner gradient, active vegetative crops, crop health milestones, harvest entries, positive trends, and `.btn-green`. |
| **Enterprise & Commerce** | **Oxford Navy Blue** | `#0F2D59` | `#F0F5FC` | `#C9DBF2` | Application branding, data table headers, purchase orders, financial ledgers, vendor partner hub, and `.btn-blue`. |
| **Risk & Compliance** | **Royal Crimson Maroon** | `#7A1532` | `#FBF0F3` | `#F2C7D3` | Risk sentinel alarms, disease/pest outbreaks, licence expirations (FCO/CIBRC), quarantine blocks, and `.btn-maroon`. |
| **Soil & Physical Assets** | **Warm Umber Brown** | `#733D1B` | `#FAF4EF` | `#ECD5C3` | Soil chemistry (pH/NPK/Carbon), field map parcels/beds, compost lots, farm machinery, and `.btn-brown`. |

---

## 2. Fixed Component Pattern (Option C Specification)

### A. Top System Banner
- **Background:** Forest Emerald Gradient `linear-gradient(90deg, #0F4819 0%, #1B7A2B 60%, #15803D 100%)`.
- **Text:** Crisp white (`#ffffff`) with high-visibility mint arrow (`#A7F3D0`).

### B. Application Header
- **Canvas:** 100% Pure White (`#ffffff`), 1px bottom border (`#eaecf0`).
- **Logo Box:** Official Vivas AI logo image (`/logo.jpg`), **with no "BETA" badge**.
- **Action Buttons:** Explicit domain action buttons (`.btn-green`, `.btn-blue`, `.btn-maroon`, `.btn-brown`).

### C. Sidebar Navigation
- **Canvas:** Pure white background (`#ffffff`), 1px right border (`#eaecf0`).
- **Category Groups:**
  - Agronomy (Grow) → `.nav-item-green` with Green icon and hover background.
  - Commerce (Sell, Buy, Input Partner Hub) → `.nav-item-blue` with Navy icon and hover background.
  - Assets & Soil → `.nav-item-brown` with Warm Umber icon and hover background.
  - Active Item → `.active` with green indicator border (`border-left: 3.5px solid var(--vivas-green)`).

### D. KPI Metric Cards
- **Surface:** Pure white card surface with subtle shadow (`0 2px 6px rgba(15, 45, 89, 0.04)`).
- **Option C Anchor:** **4px solid bottom border** corresponding to domain:
  - Green: `.kpi-card.green { border-bottom: 4px solid var(--vivas-green); }`
  - Blue: `.kpi-card.blue { border-bottom: 4px solid var(--vivas-blue); }`
  - Maroon: `.kpi-card.maroon { border-bottom: 4px solid var(--vivas-maroon); }`
  - Brown: `.kpi-card.brown { border-bottom: 4px solid var(--vivas-brown); }`
- **Icon Boxes:** Solid-fill 34x34px rounded containers with crisp white icons:
  - `.kpi-badge-icon.green`: Solid `#1B7A2B` fill, `#ffffff` icon.
  - `.kpi-badge-icon.blue`: Solid `#0F2D59` fill, `#ffffff` icon.
  - `.kpi-badge-icon.maroon`: Solid `#7A1532` fill, `#ffffff` icon.
  - `.kpi-badge-icon.brown`: Solid `#733D1B` fill, `#ffffff` icon.

### E. Data Grids & Tables
- **Container:** Pure white card surface, rounded corners (`12px`), 1px border (`#eaecf0`).
- **Column Headers (`<th>`):** High-contrast Oxford Navy text (`#0F2D59`, 800 weight, 0.75rem, uppercase) with a **soft Slate-Blue background (`var(--vivas-blue-subtle)`)** and a **2px solid border (`var(--vivas-blue-border)`)**.
- **Rows (`<tr>`):** `#ffffff` background with subtle hover highlight (`#f8fafd`).
- **Status Badges:** Contrasting pill badges (`.badge-green`, `.badge-blue`, `.badge-maroon`, `.badge-brown`).

### F. Scrollbars
- **Width:** Slim 6px.
- **Track:** `#ffffff`.
- **Thumb:** Subtle slate-blue (`#d0dbeb`) with 999px rounded edges.
- **Hover:** Oxford Navy (`#0f2d59`).

---

## 3. Standard Utility Classes

```css
/* Domain Action Buttons */
.btn-green  { background-color: var(--vivas-green); color: #fff; }
.btn-blue   { background-color: var(--vivas-blue); color: #fff; }
.btn-maroon { background-color: var(--vivas-maroon); color: #fff; }
.btn-brown  { background-color: var(--vivas-brown); color: #fff; }
.btn-outline { background-color: #fff; border: 1px solid var(--border-hairline); }

/* Option C KPI Cards */
.kpi-card.green  { border-bottom: 4px solid var(--vivas-green) !important; }
.kpi-card.blue   { border-bottom: 4px solid var(--vivas-blue) !important; }
.kpi-card.maroon { border-bottom: 4px solid var(--vivas-maroon) !important; }
.kpi-card.brown  { border-bottom: 4px solid var(--vivas-brown) !important; }

/* Status Badges */
.badge.green  { background-color: var(--vivas-green-subtle); color: var(--vivas-green); border: 1px solid var(--vivas-green-border); }
.badge.blue   { background-color: var(--vivas-blue-subtle); color: var(--vivas-blue); border: 1px solid var(--vivas-blue-border); }
.badge.maroon { background-color: var(--vivas-maroon-subtle); color: var(--vivas-maroon); border: 1px solid var(--vivas-maroon-border); }
.badge.brown  { background-color: var(--vivas-brown-subtle); color: var(--vivas-brown); border: 1px solid var(--vivas-brown-border); }
```
