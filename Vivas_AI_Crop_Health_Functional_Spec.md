# Vivas AI — Crop Health Module (Pest · Disease · Nutrient Deficiency)
### Functional Specification, Screen Instructions, Database Schema and Bulk-Upload Templates

**Version:** 1.0 (draft for build) **Product:** Vivas AI (BETA) **Module location:** Grow → Crop Health

---

## 0. Instructions to the AI builder (read first)

You are adding a new module to an **existing** application. Follow these rules:

1. **Inspect the existing codebase first.** Identify the tech stack, routing, component library, state management, API conventions, auth/roles, file-upload service, i18n setup and DB migration tool. **Reuse them.** Do not introduce a new framework or UI library.
2. **Match the existing UI exactly.** Section 4 describes the Vivas AI design language as seen in the Crop Plan screen. Reuse the existing layout shell, sidebar, page header, KPI card, filter bar, table, modal and button components. Where this document and the existing components differ, **the existing components win**.
3. **Map assumed table names.** Section 12 (schema) assumes these existing tables: `farms, sites, beds, crops, crop_varieties, plantings, inputs, tasks, users, contacts, notes, files`. Rename foreign keys to the real names.
4. **Build in phases (Section 15).** Complete and test one phase before starting the next. Phase 1 = Library, Phase 2 = Cases, Phase 3 = AI Diagnosis, Phase 4 = Weather & Alerts.
5. **Every requirement has an ID** (`FR-…`). Reference IDs in commits/PRs and tick them off against the acceptance criteria in Section 15.
6. **Do not invent agronomy data.** Seed only the lookup values in the schema. Pest/disease/deficiency content is entered by agronomists through the app or Bulk Import.
7. **Assumptions to confirm** are marked **[CONFIRM]**. If the codebase contradicts an assumption, follow the codebase and note the change.

### 0.1 Assumptions (from screenshots and the client brief)
- The app is farm-scoped (a farm switcher shows "Gopikrishna's Farm — Owner"). All case data is scoped to the active farm.
- Sidebar items: Import Hub, Dashboards, Tasks, Notes, Farm Map, **Grow**, Sell, Buy & Procurement, Assets, Labor, Contacts, Financials, Reports & Analytics, Settings, Guided Onboarding, Help Docs.
- **Grow** contains at least **Crop Plan** (plantings, Gantt timeline, bed/location assignment). A **Crop Library** with growing templates also exists. **[CONFIRM]** the exact children of Grow.
- Existing masters: Crop, Variety, Inputs, Activities/Tasks. **Weather does not exist yet.**
- Farmers and Agronomists/Consultants both create pest/disease/infection records.
- An AI engine exists (or will exist) and must be integrated for diagnostics and remedy recommendations. **[CONFIRM]** the AI service interface; Section 9 defines the contract this module expects.
- Currency is ₹ (INR). Users may need local-language names (e.g., Tamil).

---

## 1. Purpose and scope

### 1.1 Goal
Give farmers and agronomists one place to (a) maintain a trusted knowledge base of pests, diseases and nutrient deficiencies, (b) record problems observed on real plantings, (c) get AI-assisted diagnosis and remedies grounded in that knowledge base, (d) turn remedies into Tasks, and (e) learn from outcomes to improve future diagnosis.

### 1.2 Key concepts
| Term | Meaning |
|---|---|
| **Problem** | A library record of type **Pest**, **Disease** or **Deficiency** (the three masters from the data-entry document). |
| **Library** | The collection of Problems. Two scopes: **Global** (verified, shared by all farms) and **Farm** (private drafts created by a farm's users). |
| **Case** (a.k.a. infection record) | An observation of a problem on a specific planting/bed at a specific time. |
| **Diagnosis** | A candidate or confirmed identification of a Case's problem (from AI, agronomist or farmer). |
| **Treatment** | A remedy applied to a Case, linked to a Task and Inputs. |
| **Confirmed diagnosis** | Agronomist-verified label on a Case. It is the ground truth used to evaluate and improve the AI. |

### 1.3 In scope
Library CRUD with approval workflow · Bulk import (Excel) · Case logging · AI diagnosis · Remedy → Task · Follow-ups and outcomes · Dashboards/reports · Integration with Crop Plan, Farm Map, Tasks, Inputs, Notes, Contacts, Buy & Procurement, Sell, Financials · Weather-ready design (Phase 4).

### 1.4 Out of scope (v1)
Automated pesticide purchasing · Drone/satellite imagery · Live IoT sensor ingestion · Offline-first sync (photos should queue when offline if the platform already supports it).

---

## 2. Users, roles and permissions

| Role | Description |
|---|---|
| **Owner / Manager** | Farm owner or manager. Full access to their farm's cases, can approve Farm-scope library entries for their farm. |
| **Farmer / Field Worker** | Logs cases and follow-ups, uses AI Diagnose, creates draft library entries (Farm scope). |
| **Agronomist / Consultant** | Verifies library entries and diagnoses, edits remedies. May be an internal user or an external Contact invited to the farm. |
| **Vivas Admin (platform)** | Curates the Global library, manages lookups, publishes Global entries, sees AI quality metrics. |

**[CONFIRM]** map these to the app's existing role names.

| Action | Field Worker | Owner/Manager | Agronomist | Vivas Admin |
|---|:-:|:-:|:-:|:-:|
| View published Global library | ✔ | ✔ | ✔ | ✔ |
| View Farm-scope library entries of own farm | ✔ | ✔ | ✔ | ✔ |
| Create/edit Farm-scope library draft | ✔ | ✔ | ✔ | ✔ |
| Submit draft for review | ✔ | ✔ | ✔ | ✔ |
| Verify / request changes / reject | ✖ | ✖ | ✔ | ✔ |
| Publish to Global library | ✖ | ✖ | ✖ | ✔ |
| Create case / add follow-up | ✔ | ✔ | ✔ | ✔ |
| Run AI Diagnose | ✔ | ✔ | ✔ | ✔ |
| Confirm / correct diagnosis | ✖ | ✔ (own farm) | ✔ | ✔ |
| Approve chemical remedy for a case | ✖ | ✔ | ✔ | ✔ |
| Delete case (soft) | own draft only | ✔ | ✖ | ✔ |
| Bulk import | ✖ | ✔ (Farm scope) | ✔ (Farm scope) | ✔ (Global) |
| Manage lookups / risk rules | ✖ | ✖ | ✖ | ✔ |
| View AI quality dashboard | ✖ | ✔ | ✔ | ✔ |

---

## 3. Navigation and information architecture

**FR-NAV-01** Add **Crop Health** as a child of **Grow** in the left sidebar (same style as other Grow children). Route prefix: `/grow/crop-health`.

| Route | Screen | Tab label |
|---|---|---|
| `/grow/crop-health` | Overview (redirects to Cases) | — |
| `/grow/crop-health/cases` | S1 Cases list | **Cases** |
| `/grow/crop-health/cases/new` | S2 Report Issue (wizard) | — |
| `/grow/crop-health/cases/:id` | S3 Case detail | — |
| `/grow/crop-health/diagnose` | S4 Diagnose with AI | **Diagnose (AI)** |
| `/grow/crop-health/library` | S5 Library list | **Library** |
| `/grow/crop-health/library/new?type=pest\|disease\|deficiency` | S6 Library entry form | — |
| `/grow/crop-health/library/:id` | S7 Library entry detail | — |
| `/grow/crop-health/review` | S8 Review queue | **Review** (agronomist/admin only) |
| `/grow/crop-health/alerts` | S10 Alerts (Phase 4) | **Alerts** |
| `/import-hub?entity=crop-health` | S9 Bulk import (inside Import Hub) | — |
| `/settings/crop-health` | S11 Lookups & AI settings | — |

**Other entry points (FR-NAV-02):**
- **Crop Plan** → each planting row shows a small warning badge with the count of open cases; the planting detail gets a **Crop Health** tab; row action "Report issue".
- **Farm Map** → new layer toggle **Crop Health cases** (colour-coded pins by severity).
- **Tasks** → a task created from a remedy shows a "Crop Health case CH-…" chip linking back.
- **Dashboards** → new widgets (Section 10).
- **Guided Onboarding** → new step "Log your first Crop Health case".
- **Global "+" / quick actions** (if present) → "Report crop issue".

---

## 4. Design system instructions (from the Vivas AI screens)

> Observed from the Crop Plan and sidebar screenshots. Colours are approximate — **read exact tokens/values from the existing CSS/theme** and reuse existing components.

### 4.1 App shell
- **Left sidebar (~245 px, white, fixed):** Vivas AI logo with a small green **BETA** pill; below it a **farm switcher card** (pink rounded avatar with initials, bold farm name, small grey role text "Owner", refresh/switch icon); then the nav list — each item is an outline icon + label; groups with children show a right **chevron** (▾ when open). The **active** item has a light-green rounded background with green text/icon. Bottom-pinned: Settings, Guided Onboarding, Help Docs. Sidebar scrolls independently.
- **Top strips:** a solid deep-blue **onboarding bar** ("Start Your Guided Onboarding → 0/5 Steps Completed", white text, centred), then a dismissible light-blue **info banner** (info icon, blue text, "Close And Don't Show Again" link on the right).
- **Top bar:** left — period selector dropdown ("This Week ▾") followed by the grey date-range text; right — green circular user avatar with initials.
- **Page background:** very light green-grey; content sits in white rounded cards with a thin border and soft shadow (radius ≈ 12 px).

### 4.2 Page header pattern (use on every Crop Health page)
1. Small **module pill** above the title — uppercase, letter-spaced, green text on light-green fill: `GROW MODULE`.
2. **Page title** — large bold dark text (e.g., "Crop Health").
3. **Subtitle** — one line of grey helper text.
4. **Right side actions:** primary green button with a "+" icon (e.g., **+ Report Issue**), optionally one solid green stat card and a bordered secondary control (like the "SEASON: 2026" box).

### 4.3 Components to reuse
| Component | Style notes |
|---|---|
| **Primary button** | Solid green, white text, rounded, leading "+" icon for create actions. |
| **Secondary button** | White with grey border, icon + label (like "Live Edit"). |
| **Info card** | Light-blue fill, sparkle/info icon, bold blue title, two-column bullet text; has a close (×) icon. Use for "How Crop Health works" and AI hints. |
| **KPI cards row** | White cards in a row: large bold number, small grey label beneath. Numbers are dark by default, **green** for positive/active, **orange/red** for attention (like "1 Harvesting Now"). |
| **Segmented view toggle** | Bordered group with icon + label; active segment has a white/raised look (e.g., *Crop View (Timeline) · Location View · Table View*). |
| **Search input** | Wide, left magnifier icon, placeholder "Search …". |
| **Filter dropdowns** | Bordered boxes with an **uppercase prefix label** and value: `SITE: All Locations`, `STATUS: All Statuses`. |
| **Gantt/timeline** | Month header with week numbers; rows with round crop icon, bold crop name, grey variety and location text, edit/delete icons on hover; bars: **hatched green** = Nursery, **solid green** = growth, **orange** = harvest with yield label. |
| **Currency** | ₹ with Indian digit grouping (e.g., ₹82,380). |

### 4.4 Crop Health colour semantics (add to the existing palette only if missing)
| Meaning | Use |
|---|---|
| Green | Resolved, healthy, verified/published |
| Blue | Info, AI-generated content, under review |
| Amber/Orange | Moderate/High severity, treating, warning |
| Red | Severe/critical, failed treatment |
| Grey | Draft, closed, archived |

Severity chips: **Low** (green), **Moderate** (amber), **High** (orange), **Severe** (red). Always pair colour with text (accessibility).

### 4.5 Responsive and accessibility
- Farmers use phones: all screens must work at 360 px width. Tables collapse to card lists; filter bars collapse into a "Filters" drawer; the wizard is one step per screen.
- Photo capture uses the device camera (`<input type="file" accept="image/*" capture="environment">`) in addition to file browse.
- WCAG AA contrast, visible keyboard focus, labels on all inputs, alt text on images, chips never rely on colour alone.
- All UI strings go through the app's i18n mechanism. Library records support translated names (`local_names`).

---

## 5. Screen specifications

Every page uses the header pattern in §4.2 and the tab row **Cases · Diagnose (AI) · Library · Review · Alerts** (Review only for Agronomist/Admin; Alerts from Phase 4). Every list/detail screen must define **loading** (skeleton), **empty** (illustration + guidance + primary action), **error** (message + retry) and **no-permission** states.

### S1 — Cases list (`/grow/crop-health/cases`)  *Phase 2*

**Header:** pill `GROW MODULE` · title **Crop Health** · subtitle "Report, diagnose and treat pests, diseases and nutrient deficiencies across your plantings." · buttons: **+ Report Issue** (primary), **Diagnose with AI** (secondary, sparkle icon).

**Info card (dismissible, remembered per user):** "How Crop Health works — 1. Report what you see with photos · 2. Get an AI diagnosis and remedies · 3. Turn remedies into Tasks and track recovery."

**KPI cards (FR-S1-01)** — clickable, each applies the matching filter:
| Card | Definition | Colour |
|---|---|---|
| Open Cases | status not in (RESOLVED, CLOSED) | dark |
| High / Severe | open cases with severity HIGH or SEVERE | red |
| Awaiting Review | status AGRONOMIST_REVIEW or AI_REVIEW | blue |
| Treating Now | status TREATING | orange |
| Resolved This Season | resolved in the selected season | green |

**Toolbar (FR-S1-02):** segmented view toggle **Table View · Location View · Timeline View** · search box "Search cases, crops, problems…" · filters `SITE: All Locations`, `CROP: All`, `TYPE: All` (Pest/Disease/Deficiency/Unknown), `SEVERITY: All`, `STATUS: All Statuses`, `ASSIGNED: Anyone` · **Export** (CSV). The top-bar period selector also filters by observed date.

**Table View columns:** Case No · Crop (round icon) + Variety · Location (Site • Bed) · Problem (confirmed name, else "Suspected: …", else "Unknown – AI pending") · Type chip · Severity chip · % Affected · Status chip · Observed · Reported by · Assigned to · row actions (View, Add follow-up, Delete). Sortable; server-side pagination (25/50/100). Row click → S3.

**Location View (FR-S1-03):** Leaflet map (reuse the Farm Map component) with pins coloured by severity, clustered when dense; pin popup = case no., crop, problem, severity, "Open case". Side list synced with the map. Cases without GPS fall back to their bed/site centroid.

**Timeline View (FR-S1-04):** reuse the Crop Plan Gantt (same month/week header and crop rows). Each planting row shows **case markers** (small dots coloured by severity) at the observed date; hovering shows case summary; clicking opens S3. Row label pattern identical to Crop Plan.

**Acceptance:** filters combine (AND); KPI counts equal the filtered table count; view toggle preserves filters and search.

---

### S2 — Report Issue wizard (`/grow/crop-health/cases/new`)  *Phase 2*
Opens as a full page on mobile and a wide modal/page on desktop. Progress indicator "Step n of 5". **Save draft** available on every step. Query params allowed: `?planting_id=`, `?site_id=&bed_id=`.

**Step 1 — Where and when**
| Field | Control | Req | Rules |
|---|---|---|---|
| Planting | Searchable select of active plantings (shows crop icon, crop, variety, site • bed) | ✔* | On select, auto-fill crop, variety, site, bed, growth stage. *Optional if "Not on a planting" is chosen. |
| Crop | Select (Crop Library) | ✔ | Read-only when planting chosen. |
| Variety | Select | – | Filtered by crop. |
| Site / Bed | Selects | – | Filtered by farm; read-only when planting chosen. |
| Growth stage | Text/select | – | Default from Crop Plan phase (Nursery / Growing / Harvest). |
| Observed on | Date-time | ✔ | Default now; cannot be in the future. |
| Location (GPS) | Auto-detect + mini-map pin | – | Editable; stored as latitude/longitude. |

**Step 2 — What do you see?**
| Field | Control | Req | Rules |
|---|---|---|---|
| Photos | Camera/upload, up to 8 (JPEG/PNG/WebP, ≤10 MB each, compressed client-side to ≤2 MB / 2048 px) | recommended | Each photo gets a label chip: Whole plant · Leaf · Stem · Fruit · Root · Pest close-up. Show tip: "Take one wide shot and one close-up." |
| Affected plant parts | Multi-select chips (Root, Stem, Leaf, Flower, Fruit, Seed) | ✔ | At least one. |
| Symptoms | Searchable multi-select chips from the symptom vocabulary, filtered by chosen parts | – | Powers AI matching. |
| Notes | Textarea (+ speech-to-text if the platform has it) | – | ≤ 2,000 chars. |

**Evidence rule (FR-S2-01):** at least one of photo, symptom or note is required.

**Step 3 — How bad is it?**
| Field | Control | Req | Rules |
|---|---|---|---|
| Severity | Segmented Low · Moderate · High · Severe, with one-line help under each (e.g., Low = a few plants, no yield impact) | ✔ | Default Low. |
| % plants affected | Slider + number (0–100) | – | Validates 0–100. |
| Area affected | Number + unit (bed-ft, sq ft, acre, ha) | – | Unit default from farm settings. |

**Step 4 — Diagnosis** (choose one path)
1. **Diagnose with AI** (default when ≥1 photo): sets status `AI_REVIEW`, creates an AI request (§9), then opens S3 → Diagnosis tab.
2. **I know what it is:** searchable library picker (filter by type) → sets `suspected_problem_id` and `suspected_type`.
3. **Ask an agronomist:** select internal agronomist or Contact (consultant) → sets `assigned_to`/`assigned_contact_id`, status `AGRONOMIST_REVIEW`, sends notification.
Collapsible **Weather conditions (optional)**: temperature °C, humidity %, rain in last 7 days (mm). Stored in `weather_snapshot` with `source:"manual"`. Once the Weather integration exists (§8.2) this block auto-fills and becomes read-only with an "Edit" link.

**Step 5 — Review and submit:** summary card, edit links per step, **Submit**. On success: toast "Case CH-2026-000123 created", navigate to S3.

**Acceptance:** wizard works at 360 px; a draft can be resumed; submit is blocked with inline messages when validation fails; photo upload shows progress and allows retry.

---

### S3 — Case detail (`/grow/crop-health/cases/:id`)  *Phase 2–3*

**Header:** back link · case no. · status chip · severity chip · crop + variety + link to the planting (opens Crop Plan planting detail) · actions: **Edit**, **Assign**, **+ Follow-up**, **Create Task**, **Mark Resolved**, **Reopen**, **Delete**.

**Layout:** main column with tabs, right column summary card (crop, variety, planting link, site • bed, stage, observed on, reported by, assigned to, % affected, area, weather snapshot, mini-map).

**Tab: Overview** — description, affected parts (chips), symptoms (chips), photo strip, latest follow-up, status timeline (who changed what and when).

**Tab: Diagnosis (FR-S3-01…06)**
- Ranked **candidate cards** (AI first): problem name, type chip, **confidence bar with %**, matched symptoms, library reference photo beside the case photo, "why" rationale text, links to the Library entry.
- Actions per card: **Confirm this** (Owner/Manager/Agronomist/Admin), **Not this**, 👍/👎 feedback (writes `ch_ai_feedback`), **Ask agronomist**.
- **Pick a different problem** (library search) when none fits; "Not in library" lets the agronomist type a suggested name (creates a Farm-scope draft entry stub for later completion).
- Confidence bands (configurable in S11, defaults): **≥ 0.80 High** → show remedies; **0.50–0.79 Medium** → show top 3 with "Similar problems — please verify"; **< 0.50 Low** → "Not confident", auto-route to agronomist, **no chemical remedies shown**.
- When confirmed: green banner "Confirmed by <name> on <date>", `confirmed_problem_id` set, status → `DIAGNOSED`.
- Correction requires a **reason** (stored in `correction_reason`) — this is high-value AI feedback.

**Tab: Treatment (FR-S3-07…12)**
- Remedies come from the confirmed (or top candidate, if High confidence) problem's **published control measures for this crop**, grouped by method type: Cultural · Biological · Chemical · Mechanical/Physical · Nutritional.
- Each remedy card: title, product (linked Input with **stock badge**), dose + basis, application method, interval, max applications, **PHI**, re-entry hours, safety notes.
- Buttons: **Create Task** (opens the existing Task form pre-filled: title, type "Crop Health Treatment", location bed/site, input + quantity estimated from area, assignee from Labor, due date), **Mark Applied** (date, actual dose, cost), **Skip**.
- **Stock check (FR-S3-10):** if the Input's stock < required, show "Low stock" and **Add to Procurement** (creates a Buy & Procurement request).
- **PHI guard (FR-S3-11):** after a chemical is marked applied, compute `safe_harvest_date = applied_date + PHI` and show a warning on the planting in Crop Plan and in Sell/harvest screens until that date.
- Chemical remedies show a red **"Requires agronomist approval"** tag until an Owner/Manager/Agronomist approves; only approved ones can create tasks.
- AI-suggested remedies that are **not** in the library are labelled "AI suggestion — not verified"; **chemical suggestions are never allowed to come from the AI** — only from the library.

**Tab: Follow-ups** — timeline of observations (date, severity, % affected, trend Improving/Stable/Worsening, photos, notes, by whom) and a small trend chart of % affected. **+ Add follow-up** modal. After a treatment is applied, auto-create a follow-up reminder Task after *N* days (default 3, setting in S11).

**Tab: Photos** — grid of all case photos with labels; add/remove; lightbox with side-by-side compare against library reference images.

**Tab: Notes & Activity** — Notes module entries linked to the case plus an audit trail.

**Mark Resolved modal:** outcome (Resolved / Partial / Failed / Self-resolved) · resolved date · estimated loss ₹ (optional) · treatment cost (auto-summed from treatments, editable) · notes. If no confirmed diagnosis exists, show a warning: "This case will be excluded from AI learning." Status → `RESOLVED` (or `CLOSED` for failed/closed-out).

**Acceptance:** status transitions follow §7.2; every change is audited; permissions per §2.

---

### S4 — Diagnose with AI (`/grow/crop-health/diagnose`)  *Phase 3*
A fast "scan" screen for quick checks. **Left panel:** photo drop-zone with camera button (up to 8), Crop select (defaults to last used), optional Planting select, optional symptom chips, notes. **Right panel:** results area (empty state shows an illustrated hint). Button **Analyse** → progress text ("Uploading photos… Analysing… Matching with library…") → ranked candidates with the same card design as S3-Diagnosis. Buttons: **Save as Case** (creates a Case with source `AI_SCAN`, prefilled), **Start over**. Handle timeout (30 s) and offline states with retry. Rate limit configurable per farm (default 30 scans/day). Show disclaimer: "AI suggestions can be wrong. Confirm with an agronomist before applying chemicals."

---

### S5 — Library list (`/grow/crop-health/library`)  *Phase 1*
**Header:** title **Crop Health Library** · subtitle "Verified knowledge on pests, diseases and nutrient deficiencies." · **+ Add Entry ▾** (menu: Pest / Disease / Deficiency) · **Import** (opens Import Hub, S9).
**Toolbar:** segmented **All · Pests · Diseases · Deficiencies** (with counts) · view toggle **Cards · Table** · search (name, scientific name, local name) · filters `CROP`, `CATEGORY`, `SEVERITY`, `STATUS`, `SCOPE: Global / My Farm`.
**Card:** primary image (placeholder if none) · name · scientific name (italic) · type chip · crop chips (+N) · severity chip · status chip (Draft/Submitted/Verified/Published). **Table columns:** Code · Name · Type · Category/Nutrient · Crops · Severity · Scope · Status · Updated.
Non-agronomists see Published Global entries plus their own farm's entries. Non-published entries show a status chip.

---

### S6 — Library entry form (`/grow/crop-health/library/new?type=…` and `/:id/edit`)  *Phase 1*
Single-page form with **left anchor navigation** (Basic · Identification · Conditions · Management · Varieties · Images) on desktop and accordion sections on mobile. Buttons (sticky footer): **Save Draft**, **Submit for Review**, **Cancel**. Autosave draft every 30 s. Duplicate check (same type + name + overlapping crop) shows a warning, not a hard block.

**General rules:** required fields marked *; multi-selects use chips; every dropdown reads from `ch_lookup` (editable in S11); images ≥ 1 required to Submit; text fields trimmed; scientific names shown in italics on detail views.

#### S6-A Pest form — fields (from the data-entry document)
| Field (document) | Control | Req | Options / source | Notes |
|---|---|---|---|---|
| Pest Name | Text (≤120) | ✔ | — | |
| Local names *(added)* | Repeater: language + name | – | Languages configured in app | For Tamil/Hindi etc. |
| Affected Crop | **Multi-select** from Crop Library | ✔ (≥1) | Crops | Mark one as **Primary**; per-crop optional stage/peak months |
| Scientific Name | Text | – | — | |
| Pest Category | Select | ✔ | Insect / Mite / Nematode / Other | |
| Pest Type | Select | ✔ if Insect | Chewing / Sucking / Boring / Mining / Root-feeding | |
| Affected Plant Part | Multi-select chips | ✔ | Root / Stem / Leaf / Flower / Fruit / Seed | |
| Identification Symptoms | Textarea | ✔ | — | ≥ 20 chars |
| Structured symptoms *(added)* | Multi-select from symptom vocabulary | – | `ch_symptom` | Used by AI; agronomist may set weights |
| Pest Life Cycle | Repeater rows: Stage · Duration min/max (days) · Description | – | Egg / Larva / Nymph / Adult (+ Pupa suggested) | Ordered |
| Favourable Conditions | Textarea + Temp min/max °C + Humidity min/max % + Rainfall note + Soil note | – | — | Numeric fields drive Phase-4 alerts |
| Peak Occurrence | Textarea + Month multi-select | – | Jan–Dec | Months drive seasonal alerts |
| Severity Level | Select | ✔ | Low / Moderate / High / Severe | Library-level potential severity |
| Spread Mechanism | Multi-select | – | Wind / Soil / Water / Planting Material / Insect Vector (+ Seed) | |
| Monitoring Method | Multi-select | – | Trap / Visual inspection / Sampling / Scouting | |
| Preventive Measures | Textarea | – | — | |
| Control Measures | Repeater (see §6.4) | – | — | Includes **Application Method** per row |
| Resistant/Tolerant Varieties | Repeater: Crop → Variety → Resistant/Tolerant | – | Crop Library varieties | |
| Image | Multi-upload with label per image | ✔ (≥1 to submit) | Egg / Larva / Adult / Damage… | Identification images |
| Reference / source *(added)* | Text | – | — | Where the information came from |

#### S6-B Disease form — fields
| Field (document) | Control | Req | Options / source | Notes |
|---|---|---|---|---|
| Disease Name | Text | ✔ | — | |
| Local names *(added)* | Repeater | – | — | |
| Affected Crop | Multi-select | ✔ (≥1) | Crops | Primary flag |
| Scientific/Causal Organism | Text | – | — | e.g., organism name |
| Disease Category | Select | ✔ | Fungal / Bacterial / Viral / Nematode / Phytoplasma / Abiotic | |
| Affected Plant Part | Multi-select chips | ✔ | Root / Stem / Leaf / Flower / Fruit / Seed | |
| Disease Identification | Textarea | ✔ | — | ≥ 20 chars |
| Structured symptoms *(added)* | Multi-select | – | `ch_symptom` | For AI |
| Favourable Conditions | Textarea + Temp/Humidity ranges + Rainfall + Soil notes | – | — | Soil conditions field included per document |
| Disease Development Stage | Textarea | – | — | Progression from early to advanced |
| Mode of Spread | Multi-select | – | Seed / Soil / Water / Wind / Insect Vector / Planting Material | Document's "Vector" = Insect vector |
| Disease Severity | Select | ✔ | Low / Moderate / High / Severe | |
| Preventive Measures *(added)* | Textarea | – | — | |
| Control Measures | Repeater (§6.4) | – | — | Includes **Application Method** (Seed treatment / Spray / Soil application) |
| Resistant Varieties | Repeater | – | Crop Library varieties | |
| Image | Multi-upload with labels | ✔ (≥1 to submit) | Leaf / Stem / Fruit / Root symptom… | |

#### S6-C Nutrient Deficiency form — fields
| Field (document) | Control | Req | Options / source | Notes |
|---|---|---|---|---|
| Deficiency Name | Text | ✔ | — | e.g., "Nitrogen deficiency" |
| Local names *(added)* | Repeater | – | — | |
| Affected Crop | Multi-select | ✔ (≥1) | Crops | |
| Nutrient | Select | ✔ | N / P / K / Ca / Mg / S / Fe / Zn / B / Mn / Cu / Mo / Cl / Ni | |
| Nutrient Category | **Read-only, auto-derived** | — | Macronutrient (N, P, K) · Secondary (Ca, Mg, S) · Micronutrient (Fe, Zn, B, Mn, Cu, Mo, Cl, Ni) | |
| Affected Plant Part | Multi-select chips | ✔ | Root / Stem / Leaf / Flower / Fruit | No "Seed" for deficiencies |
| Deficiency Symptoms | Textarea | ✔ | — | ≥ 20 chars |
| Structured symptoms *(added)* | Multi-select | – | `ch_symptom` | For AI |
| Severity Level | Select | ✔ | Mild / Moderate / Severe | Stored as LOW / MODERATE / SEVERE |
| Diagnostic Method | Multi-select | ✔ | Visual / Soil test / Tissue test | |
| Corrective Measures | Repeater of NUTRITIONAL measures | – | — | Each row: **Fertilizer Source** (Inputs master or text), **Application Method** (Foliar / Soil / Fertigation / Other), **Recommended Dose** (value + unit + basis), timing notes |
| Preventive Measures | Textarea | – | — | |
| Image | Multi-upload | ✔ (≥1 to submit) | Leaf / Fruit / Whole plant… | |

#### 6.4 Control-measure repeater (used by Pest, Disease, Deficiency)
| Field | Control | Req | Rules |
|---|---|---|---|
| Method type | Select | ✔ | Cultural / Biological / Chemical / Mechanical / Physical / Nutritional |
| Title | Text | ✔ | Short name of the action |
| Crop | Select (mapped crops) | – | Blank = all mapped crops |
| Product | Input select (Inputs master) + "not in inventory" text fallback | – | Shows stock badge |
| Active ingredient | Text | – | |
| Dose | Number + unit (ml, L, g, kg) + basis (per litre water, per acre, per ha, per plant, per bed) | – | Required for Chemical and Nutritional |
| Application method | Select | – | Spray / Soil application / Seed treatment / Foliar / Fertigation / Other |
| Frequency / interval days / max applications | Text / number / number | – | |
| **PHI (days)** | Number | ✔ for Chemical | Pre-harvest interval; blocks Submit if missing |
| Re-entry hours | Number | – | |
| Safety notes | Textarea | – | Shown in red box on remedy cards |
| Order | Drag handle | – | |

---

### S7 — Library entry detail (`/grow/crop-health/library/:id`)
Read-only page: hero with image gallery (lightbox), name, italic scientific name, type/category/severity/status chips, crop chips. Sections/tabs: **Overview · Identification & Symptoms · Life Cycle (pests) / Development (diseases) · Conditions & Spread · Management (grouped control measures, preventive, monitoring) · Resistant Varieties · Linked Cases** (count + link to S1 filtered by problem). Actions (by permission): Edit, Duplicate as Farm draft, Submit, Archive, **Version history** (drawer listing versions with diff), **Report a correction** (creates a review comment). Deficiency pages show the nutrient badge with category.

### S8 — Review queue (`/grow/crop-health/review`)  *Agronomist / Admin*
Two tabs: **Library entries** (status SUBMITTED) and **Case diagnoses** (cases in AGRONOMIST_REVIEW). List columns: item, type, submitted by/farm, submitted on, age. **Review panel** (side drawer): full preview, diff vs previous version, checklist (mandatory fields complete · ≥ 1 image · crops mapped · chemical rows have dose + PHI + safety notes · no duplicate), buttons **Verify**, **Request changes** (comment required), **Reject** (comment required). Vivas Admin also sees **Publish to Global**. All actions write to `ch_problem_review` and notify the author.

### S9 — Bulk import (inside Import Hub)  *Phase 1*
Add a **Crop Health Library** card in Import Hub. Steps: **1 Download template** (three workbooks/sheets from the companion Excel file) → **2 Choose entity + mode** (Create only / Update by Code) → **3 Upload .xlsx** (+ optional .zip with images named as referenced) → **4 Validate** (summary counts, error table with sheet/row/column/message, **Download error report**) → **5 Confirm import** → **6 Results**. Imported records land as `DRAFT` (Farm scope) or `SUBMITTED` when the user chooses "Send for review"; Vivas Admin may choose "Publish immediately to Global". Full rules in §13.

### S10 — Alerts (`/grow/crop-health/alerts`)  *Phase 4*
Feed of risk alerts (level chip, message such as "High humidity for 3 days — risk of <disease> on <planting>", planting link, problem link, time). Actions: **Acknowledge**, **Dismiss**, **Create case**, **Create scouting task**. Filters: level, crop, status.

### S11 — Settings → Crop Health (`/settings/crop-health`)
Tabs: **Lookups** (manage each list: add, rename, reorder, deactivate, translations) · **Symptoms** (vocabulary manager) · **AI settings** (confidence thresholds, max photos, daily scan limit, require approval for chemical remedies [default ON], follow-up reminder days) · **Risk rules** (Phase 4: condition builder per problem/crop). Vivas Admin only for global lists; Owners can add farm-specific lookup values.

---

## 6. Business rules (summary)

| ID | Rule |
|---|---|
| BR-01 | Only **PUBLISHED** (Global) or **VERIFIED** (own-farm) library entries feed remedies and the AI engine. Drafts and Submitted entries are never used for recommendations. |
| BR-02 | A **Chemical** control measure requires dose, basis and **PHI**; it cannot be submitted without them. |
| BR-03 | The AI may **never originate a chemical recommendation**. Chemical remedies come only from verified library control measures for the case's crop. |
| BR-04 | Low-confidence AI results (< low threshold) show no remedies and route to an agronomist. |
| BR-05 | Applying a chemical starts a PHI countdown; harvest/sale warnings show until `safe_harvest_date`. |
| BR-06 | A case is a **training example** only if it has an agronomist-confirmed diagnosis and ≥ 1 photo. |
| BR-07 | Editing a Published entry creates a new version; the previous version stays in history; the entry returns to SUBMITTED for re-verification (Admin may bypass). |
| BR-08 | Soft-delete only (`deleted_at`); cases with treatments cannot be hard-deleted. |
| BR-09 | Farm-scope entries are visible only to the owning farm until promoted to Global by Vivas Admin. |
| BR-10 | Deficiency severity labels are Mild/Moderate/Severe; pest/disease are Low/Moderate/High/Severe; both map to `ch_severity`. |

## 7. Workflows and state machines

### 7.1 Library entry (`ch_problem.status`)
`DRAFT → SUBMITTED → (CHANGES_REQUESTED → SUBMITTED)* → VERIFIED → PUBLISHED` · `SUBMITTED → REJECTED` · any → `ARCHIVED` · `PUBLISHED/VERIFIED → SUBMITTED` on edit (BR-07).
Each transition writes `ch_problem_review` and notifies the author. **Verify** = agronomist; **Publish** = Vivas Admin (promotes scope to GLOBAL).

### 7.2 Case (`ch_case.status`)
`OPEN → AI_REVIEW → AGRONOMIST_REVIEW → DIAGNOSED → TREATING → MONITORING → RESOLVED → CLOSED`
- `OPEN`: created, no diagnosis path chosen.
- `AI_REVIEW`: AI request in flight or candidates awaiting a human.
- `AGRONOMIST_REVIEW`: assigned to an agronomist/consultant (also auto-set when AI confidence is Low).
- `DIAGNOSED`: a confirmed diagnosis exists.
- `TREATING`: at least one treatment planned/applied.
- `MONITORING`: treatment applied, follow-ups running.
- `RESOLVED`: outcome recorded. `CLOSED`: archived/final (also used for failed/abandoned).
- **Reopen:** RESOLVED/CLOSED → OPEN (Owner/Manager/Agronomist), logged.
Backward moves other than Reopen are not allowed; a diagnosis may be corrected at any time before CLOSED.

### 7.3 End-to-end flow
1. Field worker reports issue (S2) with photos → 2. AI diagnoses (S3/S4) → 3. Agronomist confirms/corrects → 4. System lists remedies from the library → 5. Owner/Agronomist approves chemical remedies → 6. Tasks created (with Inputs, Labor) → 7. Treatment applied, PHI tracked → 8. Follow-ups → 9. Resolve with outcome → 10. Confirmed cases + outcomes + feedback flow to the AI evaluation set.

## 8. Integration specification

### 8.1 Existing modules
| Module | Integration behaviour | Data exchanged | Req IDs |
|---|---|---|---|
| **Crop Plan (plantings)** | Case wizard picks a planting and auto-fills crop/variety/site/bed/stage. Crop Plan rows show open-case badge; planting detail has a **Crop Health** tab; row action "Report issue". PHI warning appears on the planting timeline. | `planting_id`, crop, variety, site, bed, stage, `safe_harvest_date` | FR-INT-01 |
| **Crop Library** | Library entries link to crops/varieties; resistant varieties reference real varieties; Crop Library detail gets a **Common problems** section listing mapped problems. | `crop_id`, `variety_id` | FR-INT-02 |
| **Farm Map** | New "Crop Health cases" layer; pins coloured by severity; click opens case. Optional heat overlay by problem. | lat/long, severity, case id | FR-INT-03 |
| **Tasks** | Remedy → task. Task carries `crop_health_case_id` and shows a back-link chip. Completing the task marks the treatment `APPLIED` (with prompt for actual dose/cost). Follow-up reminders are tasks. | task id, dates, assignee, location, input+qty | FR-INT-04 |
| **Inputs (Buy & Procurement / Assets)** | Control measures reference Inputs; stock badge on remedies; **Add to Procurement** when short; consumption deducts stock via the existing task/input flow. | `input_id`, qty, unit, stock level | FR-INT-05 |
| **Labor** | Assign treatment/scouting tasks to workers; hours flow into cost. | worker id, hours | FR-INT-06 |
| **Contacts** | External consultants/agronomists are Contacts that can be assigned to a case and invited to review (limited access to the case only). | contact id | FR-INT-07 |
| **Notes** | Notes can be attached to a case; case Notes tab lists them. | note id | FR-INT-08 |
| **Sell** | If a planting has an active PHI window, harvest/sale creation shows a blocking-or-warning banner (configurable: warn / block). | `safe_harvest_date` | FR-INT-09 |
| **Financials** | Treatment cost and estimated loss roll into planting profitability and Financial reports. | cost, loss amount | FR-INT-10 |
| **Dashboards / Reports & Analytics** | Widgets and reports in §10. | aggregated case data | FR-INT-11 |
| **Import Hub** | New "Crop Health Library" import card (S9). | .xlsx / .zip | FR-INT-12 |
| **Guided Onboarding** | New step "Log your first Crop Health case". | step completion | FR-INT-13 |
| **Settings / Roles** | New permissions and settings page (S11). | role permissions | FR-INT-14 |
| **Notifications** | In-app (and email/push if existing) for: review requested/completed, case assigned, AI result ready, Severe case opened, PHI safe date reached, follow-up due, alert raised. | event payloads | FR-INT-15 |

### 8.2 Weather (does not exist yet — design now, build in Phase 4)
- **Phase 1–3:** optional manual weather fields on the case form, stored in `weather_snapshot` (`source:"manual"`).
- **Phase 4:**
  1. Create a `weather` service that fetches forecast/observed data by farm/site GPS from a provider (choose provider — **[CONFIRM]**), caches hourly, and stores daily aggregates per site (temp min/max, humidity, rainfall, wind).
  2. Auto-fill `weather_snapshot` on each new case using the last 7 days of data at the case location.
  3. Nightly job evaluates `ch_risk_rule` (built from library `temp_*`, `humidity_*`, `peak_months`) against recent weather per planting whose crop is mapped to the problem; creates `ch_alert` rows and notifications with de-duplication (one active alert per planting × problem).
  4. Pass weather to the AI diagnose and risk requests (§9).
- Keep the `weather_snapshot` JSON shape stable: `{"temp_c":29.1,"humidity_pct":84,"rain_7d_mm":42,"source":"provider|manual","captured_at":"ISO-8601"}`.

## 9. AI engine integration

### 9.1 Architecture
The app calls an **AI Gateway** endpoint owned by the backend (never directly from the browser). The gateway builds the request, calls the AI engine, validates the response against the library, stores everything in `ch_ai_request` / `ch_case_diagnosis`, and returns candidates to the UI. **[CONFIRM]** whether the AI engine is an internal service or a third-party model API; keep the contract below so it can be swapped.

### 9.2 Diagnose request (`request_type = DIAGNOSE`)
```json
{
  "request_id": "uuid",
  "farm": {"id": "uuid", "country": "IN", "region": "Tamil Nadu"},
  "crop": {"id": "uuid", "name": "Tomato", "variety": "Roma VF", "stage": "Fruiting"},
  "planting": {"id": "uuid", "site": "Greenhouse Block A", "bed": "Bed 2", "days_since_planting": 62},
  "observation": {
    "observed_at": "2026-09-28T09:30:00+05:30",
    "plant_parts": ["LEAF", "FRUIT"],
    "symptom_codes": ["LEAF_SPOTS_CONCENTRIC", "LEAF_YELLOWING"],
    "notes": "spots started on lower leaves",
    "severity": "MODERATE",
    "incidence_pct": 20
  },
  "images": [{"url": "signed-url", "label": "LEAF"}, {"url": "signed-url", "label": "FRUIT"}],
  "weather": {"temp_c": 29.1, "humidity_pct": 84, "rain_7d_mm": 42, "source": "manual"},
  "history": {"recent_cases_same_planting": [{"problem_id": "uuid", "date": "2026-09-01"}]},
  "candidate_library_ids": ["uuid", "uuid"],
  "options": {"max_candidates": 5, "language": "en"}
}
```
`candidate_library_ids` = published/verified problems mapped to the crop (grounding set). The engine must return library IDs where possible.

### 9.3 Diagnose response
```json
{
  "request_id": "uuid",
  "model": {"name": "vivas-diagnose", "version": "x.y.z"},
  "candidates": [
    {
      "rank": 1,
      "problem_id": "uuid-or-null",
      "suggested_name": "only when problem_id is null",
      "problem_type": "DISEASE",
      "confidence": 0.86,
      "matched_symptom_codes": ["LEAF_SPOTS_CONCENTRIC"],
      "rationale": "Concentric ring lesions on older leaves with humid weather...",
      "needs_more_info": [],
      "follow_up_questions": ["Are the spots also on stems?"]
    }
  ],
  "overall_confidence_band": "HIGH",
  "safety": {"escalate_to_agronomist": false, "reasons": []},
  "latency_ms": 2400
}
```

### 9.4 Gateway responsibilities (FR-AI-01…10)
1. Build the grounding set from the library (BR-01) and attach it.
2. Store the full request/response; log latency, model version, errors.
3. Validate: every `problem_id` exists and is verified/published; confidence in 0–1; drop or flag invalid items.
4. Map confidence to bands using S11 thresholds; apply BR-03/BR-04 (no chemicals from AI; low confidence → agronomist).
5. Timeout 30 s, one retry, then show a friendly error and allow "Ask an agronomist".
6. Per-farm rate limit and per-user daily cap; image size/type checks; signed, expiring image URLs; no PII in the payload.
7. Persist candidates to `ch_case_diagnosis`; record human confirmation/correction and feedback.
8. **Remedy request (`REMEDY`)**: input = confirmed problem + crop + stage + farm inventory (Input IDs in stock); output = ordered list of **library control measure IDs** with reason (e.g., "in stock", "lowest PHI"). The AI *ranks* library measures; it does not invent them (BR-03).
9. **Chat (`CHAT`, optional)**: follow-up Q&A on a case, grounded in the case + library; every answer shows a disclaimer; no chemical dosing outside library data.
10. **Learning loop:** export `v_ch_training_set` and `ch_ai_feedback` on a schedule for evaluation/retraining; surface an **AI quality panel** (top-1 accuracy = share of confirmed cases whose confirmed problem equals AI rank 1; top-3 accuracy; average confidence; escalation rate; feedback ratio) on the Dashboard for Agronomist/Admin.

## 10. Dashboards and reports
**Dashboard widgets (add to existing Dashboards):**
- *Crop Health Overview* — open cases, high/severe, treating, resolved this season (same KPI-card style).
- *Cases by Problem* (bar), *Cases by Crop* (bar), *Cases over Time* (line, weekly).
- *Severity by Site/Bed* (heat table).
- *PHI countdown* — plantings with an active safe-harvest date.
- *AI quality* (Agronomist/Admin): top-1/top-3 accuracy, escalation rate.
**Reports & Analytics (add category "Crop Health"):** Case register (CSV/PDF) · Treatment & input usage · Cost and loss per planting · Problem frequency by crop/season · Chemical application log (product, dose, date, PHI, operator) for audit/compliance · Time-to-resolution · Library coverage (crops without any mapped problems).

## 11. REST API (adapt paths/naming to existing conventions)
| Method & path | Purpose |
|---|---|
| `GET /api/ch/lookups?list=PEST_CATEGORY,…` | Dropdown values (with translations) |
| `GET/POST /api/ch/problems` · `GET/PUT/DELETE /api/ch/problems/:id` | Library CRUD (`?type=&crop_id=&status=&scope=&q=`) |
| `POST /api/ch/problems/:id/submit` · `/verify` · `/request-changes` · `/reject` · `/publish` · `/archive` | Workflow actions |
| `GET /api/ch/problems/:id/versions` | Version history |
| `POST /api/ch/problems/:id/media` · `DELETE /api/ch/media/:id` | Library images |
| `GET/POST /api/ch/cases` · `GET/PUT/DELETE /api/ch/cases/:id` | Cases |
| `POST /api/ch/cases/:id/media` | Case photos |
| `POST /api/ch/cases/:id/diagnose` | Trigger AI diagnosis |
| `POST /api/ch/scan` | Quick scan (S4), optional save-as-case |
| `POST /api/ch/diagnoses/:id/confirm` · `/reject` · `/feedback` | Human decisions |
| `GET /api/ch/cases/:id/remedies` | Ranked library remedies for the case |
| `POST /api/ch/cases/:id/treatments` · `PUT /api/ch/treatments/:id` | Treatments; `POST …/:id/create-task` |
| `POST /api/ch/cases/:id/followups` | Follow-ups |
| `POST /api/ch/cases/:id/resolve` · `/reopen` | Outcome |
| `GET /api/ch/dashboard/summary` | KPI + chart data |
| `POST /api/ch/import/validate` · `POST /api/ch/import/commit` · `GET /api/ch/import/:batchId/errors` | Bulk import |
| `GET /api/ch/alerts` · `POST /api/ch/alerts/:id/ack` · `/dismiss` · `/convert` | Alerts (Phase 4) |
Standards: pagination (`page`, `page_size`), consistent error format, farm scoping enforced server-side from the session, audit logging on all writes, idempotency key on AI requests.

## 12. Database schema
The complete PostgreSQL DDL follows in **Appendix A** (also delivered as `schema.sql`). Summary of tables:

| Group | Tables |
|---|---|
| Lookups | `ch_lookup`, `ch_nutrient`, `ch_symptom` |
| Library | `ch_problem` (+ `ch_problem_attr`, `ch_problem_crop`, `ch_resistant_variety`, `ch_lifecycle_stage`, `ch_problem_symptom`, `ch_control_measure`, `ch_media`, `ch_problem_review`, `ch_problem_version`) |
| Cases | `ch_case` (+ `ch_case_plant_part`, `ch_case_symptom`, `ch_case_diagnosis`, `ch_case_treatment`, `ch_case_followup`, `ch_case_note`) |
| AI | `ch_ai_request`, `ch_ai_feedback`, view `v_ch_training_set` |
| Alerts (Phase 4) | `ch_risk_rule`, `ch_alert` |
| Import | `ch_import_batch`, `ch_import_error` |

**How the document's fields map:** the three data-entry tables become one `ch_problem` table with a `problem_type` discriminator; many-to-many crops (`ch_problem_crop`) replace the single "Affected Crop"; life cycle, control measures (incl. application method, fertilizer source, recommended dose), resistant varieties and images are child tables; multi-value categories (plant part, spread mechanism, monitoring, diagnostic method) use `ch_problem_attr` + `ch_lookup`.

## 13. Bulk import (Excel) rules
Companion workbook **`Vivas_AI_Crop_Health_Bulk_Upload_Templates.xlsx`** contains: *Instructions, Lists, Pest, Pest_Control, Pest_LifeCycle, Disease, Disease_Control, Deficiency, Deficiency_Correction*. Rules:
1. **Keys:** each main sheet has a unique **Record Code** (e.g., `PST-0001`). Child sheets reference it. Codes are unique within the file; with *Update by Code* they match existing entries.
2. **Multi-value cells** use the pipe `|` separator, e.g., `Leaf|Fruit`. Matching is case-insensitive against lookup labels; unknown values are errors.
3. **Crops** must match Crop Library names; **Resistant/Tolerant Varieties** use `Crop > Variety (Resistant)` or `Crop > Variety (Tolerant)` entries separated by `|`, and each variety must exist. The importer trims a trailing ` *` from header names (required-column marker), ignores row 2 if its Record Code starts with `EXAMPLE`, and reads data from row 3. Nutrient Category is derived from Nutrient and must not be supplied.
4. **Products** in control sheets should match the Inputs master by name; if not found, the text is stored in `input_name_text` and a **warning** (not error) is raised.
5. **Required-field, lookup, numeric-range and length checks** mirror the form rules (S6). Chemical rows without dose, basis or PHI are errors.
6. **Images:** filenames in the *Image Files* column (pipe-separated) must exist in the optional ZIP; otherwise a warning. URLs (https) are allowed and downloaded server-side with size/type checks.
7. **Row limits:** ≤ 2,000 rows per main sheet, ≤ 20 MB workbook, ≤ 200 MB ZIP.
8. **Validation is all-or-nothing per record:** a record with any error is skipped; valid records import. The error report lists sheet, row, column, message.
9. Imported records default to `DRAFT`/Farm scope (or `SUBMITTED`/`PUBLISHED` per S9 options and role).
10. Rows starting with `EXAMPLE` in the Record Code are ignored by the importer.

## 14. Non-functional requirements
| Area | Requirement |
|---|---|
| Performance | List pages < 2 s for 10k cases; AI diagnosis < 30 s p95; image upload with progress and retry; thumbnails generated server-side. |
| Security | Farm data isolation enforced server-side; role checks on every endpoint; signed expiring image URLs; EXIF GPS stripped from public library images; input sanitisation (rich text, filenames); rate limits on AI and import. |
| Privacy | Do not send user names/contacts to the AI engine; retain AI request payloads per platform policy. |
| Audit | Log creates/updates/status changes/approvals with user and timestamp. |
| Reliability | AI/weather outages must not block case creation; queue and retry. |
| i18n / l10n | UI strings externalised; library names translatable; dates/numbers in the user's locale; ₹ formatting. |
| Accessibility | WCAG 2.1 AA. |
| Mobile | Full functionality at 360 px; camera capture; image compression client-side. |
| Analytics | Track: cases created, AI scans, confirmation rate, time-to-diagnosis, library growth. |
| Data quality | Duplicate detection on library entries; required-field completeness score shown to reviewers. |

## 15. Delivery phases and acceptance criteria

### Phase 1 — Library (foundation)
Build: lookups/seed data · Problem CRUD for Pest, Disease, Deficiency (forms S6) · images · approval workflow (S8) · Library list/detail (S5/S7) · Settings lookups (S11) · Bulk import (S9) · navigation entry · permissions.
**Accept when:** an agronomist can create a Pest, a Disease and a Deficiency with all fields from the document; a chemical row cannot be submitted without PHI; a farmer's draft is invisible to other farms; Admin can publish and the entry becomes visible to other farms; a valid import creates records and an invalid row produces a downloadable error report; nutrient category auto-derives from nutrient.

### Phase 2 — Cases
Build: S1, S2, S3 (overview, treatment, follow-ups, photos, notes) · Crop Plan badge/tab · Farm Map layer · Task/Inputs/Procurement/Labor/Contacts/Notes integrations · PHI warning · dashboard widgets · notifications.
**Accept when:** a worker on a phone can report a case in < 2 minutes with photos; Crop Plan shows the badge; a remedy creates a Task that links back; completing the task marks the treatment applied and starts the PHI timer; resolving a case records outcome and cost.

### Phase 3 — AI diagnosis
Build: AI gateway · S4 · Diagnosis tab (candidates, confirm/correct/feedback) · confidence bands · escalation · remedy ranking · AI quality panel · training-set export.
**Accept when:** ≥ 1 photo returns ranked candidates linked to library IDs; low confidence escalates and hides remedies; AI never shows chemical remedies outside the library; corrections capture a reason; feedback and confirmed labels appear in the training view.

### Phase 4 — Weather and alerts
Build: weather service · auto weather snapshot · risk rules and nightly evaluation · Alerts screen · notifications.
**Accept when:** a new case auto-fills weather; a rule breach creates one deduplicated alert; an alert converts to a case in one click.

### Definition of done (every phase)
Unit and integration tests for services and permission rules · UI tests for critical flows · responsive check at 360/768/1280 px · accessibility check · migrations reversible · seed script · API docs updated · no console errors · feature flag `crop_health` to enable per farm.

## 16. Open questions to confirm before build
1. Exact children of the Grow menu and the real names of roles.
2. AI engine: internal or third-party? Sync or async? Image size limits?
3. Weather data provider and budget.
4. Regulatory product lists: should control measures be restricted to products approved for a crop in your region? (The schema supports an approved-use flag on Input × Crop if needed.)
5. Should Farm-scope entries ever be visible to consultants of other farms?
6. Languages required beyond English.
7. Should PHI **block** or only **warn** on harvest/sale?
8. Do farmers also need this in a mobile app or only in the web app?

---

## Appendix A — PostgreSQL schema (`schema.sql`)

Rename the assumed existing tables (`farms, sites, beds, crops, crop_varieties, plantings, inputs, tasks, users, contacts, notes, files`) to match the real database before running. Adapt to the project's migration tool/ORM.

```sql
-- =====================================================================
-- Vivas AI · Crop Health module (Pest / Disease / Nutrient Deficiency)
-- Target: PostgreSQL 14+   (adapt types/syntax if the app uses another DB/ORM)
--
-- ASSUMED EXISTING TABLES (rename to match the real schema before running):
--   farms, sites, beds, crops, crop_varieties, plantings, inputs,
--   tasks, users, contacts, notes, files
-- All new tables are prefixed ch_ to avoid collisions.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
CREATE TYPE ch_problem_type   AS ENUM ('PEST','DISEASE','DEFICIENCY');
CREATE TYPE ch_scope          AS ENUM ('GLOBAL','FARM');   -- FARM = private to one farm until promoted
CREATE TYPE ch_publish_status AS ENUM ('DRAFT','SUBMITTED','CHANGES_REQUESTED','VERIFIED','PUBLISHED','REJECTED','ARCHIVED');
-- Severity is stored as LOW/MODERATE/HIGH/SEVERE. For deficiencies the UI label for LOW is "Mild"
-- and HIGH is not offered (Mild / Moderate / Severe only).
CREATE TYPE ch_severity       AS ENUM ('LOW','MODERATE','HIGH','SEVERE');
CREATE TYPE ch_control_method AS ENUM ('CULTURAL','BIOLOGICAL','CHEMICAL','MECHANICAL','PHYSICAL','NUTRITIONAL');
CREATE TYPE ch_resistance     AS ENUM ('RESISTANT','TOLERANT');
CREATE TYPE ch_case_status    AS ENUM ('OPEN','AI_REVIEW','AGRONOMIST_REVIEW','DIAGNOSED','TREATING','MONITORING','RESOLVED','CLOSED');
CREATE TYPE ch_case_source    AS ENUM ('MANUAL','AI_SCAN','IMPORT','ALERT');
CREATE TYPE ch_outcome        AS ENUM ('RESOLVED','PARTIAL','FAILED','SELF_RESOLVED');
CREATE TYPE ch_diag_source    AS ENUM ('AI','AGRONOMIST','FARMER');
CREATE TYPE ch_treatment_status AS ENUM ('RECOMMENDED','PLANNED','APPLIED','SKIPPED','CANCELLED');
CREATE TYPE ch_alert_level    AS ENUM ('INFO','WATCH','WARNING','CRITICAL');

-- generic updated_at trigger
CREATE OR REPLACE FUNCTION ch_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- human-readable codes
CREATE SEQUENCE ch_seq_pest START 1;
CREATE SEQUENCE ch_seq_disease START 1;
CREATE SEQUENCE ch_seq_deficiency START 1;
CREATE SEQUENCE ch_seq_case START 1;

-- ---------------------------------------------------------------------
-- 2. LOOKUPS (editable dropdown values; global rows have farm_id NULL)
-- list_code values: PEST_CATEGORY, PEST_TYPE, PLANT_PART, SPREAD_MECHANISM,
--   MONITORING_METHOD, APPLICATION_METHOD, DISEASE_CATEGORY, DIAGNOSTIC_METHOD,
--   LIFECYCLE_STAGE, IMAGE_LABEL, DOSE_UNIT, DOSE_BASIS
-- ---------------------------------------------------------------------
CREATE TABLE ch_lookup (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_code   text NOT NULL,
  code        text NOT NULL,
  label       text NOT NULL,
  label_i18n  jsonb NOT NULL DEFAULT '{}',          -- {"ta":"...","hi":"..."}
  sort_order  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  farm_id     uuid REFERENCES farms(id),            -- NULL = global
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_ch_lookup ON ch_lookup (list_code, code, COALESCE(farm_id,'00000000-0000-0000-0000-000000000000'));
CREATE INDEX ix_ch_lookup_list ON ch_lookup (list_code, is_active, sort_order);

CREATE TABLE ch_nutrient (
  code        text PRIMARY KEY,                     -- N,P,K,Ca,Mg,S,Fe,Zn,B,Mn,Cu,Mo,Cl,Ni
  name        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('MACRONUTRIENT','SECONDARY','MICRONUTRIENT')),
  sort_order  int NOT NULL DEFAULT 0
);

-- Structured symptom vocabulary (used by forms AND the AI engine)
CREATE TABLE ch_symptom (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,               -- e.g. LEAF_YELLOWING_INTERVEINAL
  label         text NOT NULL,
  plant_part_id uuid REFERENCES ch_lookup(id),
  description   text,
  applies_to    ch_problem_type[] NOT NULL DEFAULT '{PEST,DISEASE,DEFICIENCY}',
  is_active     boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- 3. LIBRARY (knowledge base) - one base table, discriminated by problem_type
-- ---------------------------------------------------------------------
CREATE TABLE ch_problem (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_type        ch_problem_type NOT NULL,
  code                text NOT NULL UNIQUE,                       -- PST-0001 / DIS-0001 / DEF-0001
  name                text NOT NULL,                              -- Pest Name / Disease Name / Deficiency Name
  local_names         jsonb NOT NULL DEFAULT '{}',
  scientific_name     text,                                       -- Pest: scientific name; Disease: causal organism
  category_id         uuid REFERENCES ch_lookup(id),              -- PEST_CATEGORY or DISEASE_CATEGORY (NULL for deficiency)
  pest_type_id        uuid REFERENCES ch_lookup(id),              -- PEST only (Chewing/Sucking/...)
  nutrient_code       text REFERENCES ch_nutrient(code),          -- DEFICIENCY only
  identification_text text,                                       -- Identification Symptoms / Disease Identification / Deficiency Symptoms
  favourable_text     text,                                       -- free-text favourable conditions
  temp_min_c          numeric(4,1),
  temp_max_c          numeric(4,1),
  humidity_min_pct    numeric(4,1),
  humidity_max_pct    numeric(4,1),
  rainfall_note       text,
  soil_note           text,
  peak_occurrence_text text,                                      -- Pest: Peak Occurrence
  peak_months         smallint[],                                 -- 1..12, drives seasonal alerts
  development_stage_text text,                                    -- DISEASE only: Disease Development Stage
  potential_severity  ch_severity,                                -- Severity Level (library-level)
  preventive_measures text,
  is_soil_test_required boolean,                                  -- DEFICIENCY convenience flag
  notes               text,
  scope               ch_scope NOT NULL DEFAULT 'FARM',
  farm_id             uuid REFERENCES farms(id),                  -- required when scope = FARM
  status              ch_publish_status NOT NULL DEFAULT 'DRAFT',
  version             int NOT NULL DEFAULT 1,
  created_by          uuid NOT NULL REFERENCES users(id),
  verified_by         uuid REFERENCES users(id),
  verified_at         timestamptz,
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CHECK ( (scope = 'FARM') = (farm_id IS NOT NULL) ),
  CHECK ( (problem_type = 'DEFICIENCY') = (nutrient_code IS NOT NULL) ),
  CHECK ( problem_type = 'PEST'    OR pest_type_id IS NULL ),
  CHECK ( problem_type = 'DISEASE' OR development_stage_text IS NULL ),
  CHECK ( problem_type <> 'DEFICIENCY' OR category_id IS NULL )
);
CREATE INDEX ix_ch_problem_type_status ON ch_problem (problem_type, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_ch_problem_farm        ON ch_problem (farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX ix_ch_problem_name_fts   ON ch_problem USING gin (to_tsvector('simple', name || ' ' || COALESCE(scientific_name,'')));
CREATE TRIGGER trg_ch_problem_upd BEFORE UPDATE ON ch_problem FOR EACH ROW EXECUTE FUNCTION ch_touch_updated_at();

-- Multi-select attributes: Affected Plant Part, Spread Mechanism / Mode of Spread,
-- Monitoring Method, Diagnostic Method (the lookup row's list_code tells which)
CREATE TABLE ch_problem_attr (
  problem_id uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  lookup_id  uuid NOT NULL REFERENCES ch_lookup(id),
  PRIMARY KEY (problem_id, lookup_id)
);

-- Problem <-> Crop (many-to-many) : replaces the single "Affected Crop" field
CREATE TABLE ch_problem_crop (
  problem_id        uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id           uuid NOT NULL REFERENCES crops(id),
  is_primary        boolean NOT NULL DEFAULT false,
  susceptible_stage text,                                          -- e.g. 'Flowering to fruiting'
  peak_months       smallint[],                                    -- crop-specific override
  crop_severity     ch_severity,
  notes             text,
  PRIMARY KEY (problem_id, crop_id)
);
CREATE INDEX ix_ch_problem_crop_crop ON ch_problem_crop (crop_id);

-- Resistant / Tolerant varieties (links to real varieties)
CREATE TABLE ch_resistant_variety (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id  uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id     uuid NOT NULL REFERENCES crops(id),
  variety_id  uuid NOT NULL REFERENCES crop_varieties(id),
  resistance  ch_resistance NOT NULL DEFAULT 'TOLERANT',
  notes       text,
  UNIQUE (problem_id, variety_id)
);

-- Pest life cycle (child rows instead of one text box)
CREATE TABLE ch_lifecycle_stage (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id        uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  stage_id          uuid NOT NULL REFERENCES ch_lookup(id),        -- LIFECYCLE_STAGE: Egg/Larva/Nymph/Adult (+Pupa)
  seq               int  NOT NULL,
  duration_days_min int,
  duration_days_max int,
  description       text,
  UNIQUE (problem_id, seq)
);

-- Structured symptoms for a problem (AI matching weights)
CREATE TABLE ch_problem_symptom (
  problem_id uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES ch_symptom(id),
  weight     numeric(3,2) NOT NULL DEFAULT 1.00 CHECK (weight BETWEEN 0 AND 1),
  PRIMARY KEY (problem_id, symptom_id)
);

-- Control / corrective measures. Covers: Control Measures, Application Method,
-- Fertilizer Source, Recommended Dose, Corrective Measures
CREATE TABLE ch_control_measure (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id          uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id             uuid REFERENCES crops(id),                   -- NULL = applies to all mapped crops
  method_type         ch_control_method NOT NULL,
  title               text NOT NULL,
  description         text,
  input_id            uuid REFERENCES inputs(id),                  -- product / fertilizer from Inputs master
  input_name_text     text,                                        -- fallback when no Input record exists
  active_ingredient   text,
  dose_value          numeric(10,3),
  dose_unit_id        uuid REFERENCES ch_lookup(id),               -- ml, g, kg, L ...
  dose_basis_id       uuid REFERENCES ch_lookup(id),               -- per litre water / per acre / per ha / per plant
  application_method_id uuid REFERENCES ch_lookup(id),
  frequency_text      text,
  interval_days       int,
  max_applications    int,
  phi_days            int,                                         -- pre-harvest interval
  reentry_hours       int,
  safety_notes        text,
  seq                 int NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  CHECK ( method_type <> 'CHEMICAL' OR phi_days IS NOT NULL )      -- PHI mandatory for chemicals
);
CREATE INDEX ix_ch_control_problem ON ch_control_measure (problem_id, crop_id);

-- Images (library, case, diagnosis, follow-up). Reuse platform file storage via file_id.
CREATE TABLE ch_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type    text NOT NULL CHECK (owner_type IN ('PROBLEM','CASE','DIAGNOSIS','FOLLOWUP')),
  owner_id      uuid NOT NULL,
  file_id       uuid REFERENCES files(id),
  url           text NOT NULL,
  thumb_url     text,
  image_label_id uuid REFERENCES ch_lookup(id),                    -- IMAGE_LABEL: Egg, Larva, Adult, Leaf symptom, Fruit symptom, Whole plant...
  caption       text,
  is_primary    boolean NOT NULL DEFAULT false,
  source_credit text,
  width         int,
  height        int,
  checksum      text,
  uploaded_by   uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ch_media_owner ON ch_media (owner_type, owner_id);

-- Approval workflow log + version snapshots
CREATE TABLE ch_problem_review (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id  uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  action      text NOT NULL CHECK (action IN ('SUBMIT','REQUEST_CHANGES','VERIFY','PUBLISH','REJECT','ARCHIVE','REOPEN')),
  reviewer_id uuid NOT NULL REFERENCES users(id),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ch_problem_version (
  problem_id  uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  version     int  NOT NULL,
  snapshot    jsonb NOT NULL,                                      -- full record incl. children
  changed_by  uuid REFERENCES users(id),
  changed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (problem_id, version)
);

-- ---------------------------------------------------------------------
-- 4. CASES (farm-level infection / outbreak records)
-- ---------------------------------------------------------------------
CREATE TABLE ch_case (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no               text NOT NULL UNIQUE,                      -- CH-2026-000123
  farm_id               uuid NOT NULL REFERENCES farms(id),
  planting_id           uuid REFERENCES plantings(id),
  site_id               uuid REFERENCES sites(id),
  bed_id                uuid REFERENCES beds(id),
  crop_id               uuid NOT NULL REFERENCES crops(id),
  variety_id            uuid REFERENCES crop_varieties(id),
  crop_stage            text,                                      -- Nursery / Vegetative / Flowering / Fruiting / Harvest (from planting)
  observed_at           timestamptz NOT NULL,
  reported_by           uuid NOT NULL REFERENCES users(id),
  assigned_to           uuid REFERENCES users(id),
  assigned_contact_id   uuid REFERENCES contacts(id),              -- external consultant
  suspected_type        ch_problem_type,                           -- NULL = Unknown
  suspected_problem_id  uuid REFERENCES ch_problem(id),
  confirmed_problem_id  uuid REFERENCES ch_problem(id),            -- ground-truth label for AI
  severity              ch_severity NOT NULL DEFAULT 'LOW',
  incidence_pct         numeric(5,2) CHECK (incidence_pct BETWEEN 0 AND 100),  -- % plants affected
  area_affected         numeric(10,2),
  area_unit             text,                                      -- bed-ft / sq ft / acre / ha
  symptoms_notes        text,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  weather_snapshot      jsonb,                                     -- {temp_c, humidity_pct, rain_7d_mm, source, captured_at}
  status                ch_case_status NOT NULL DEFAULT 'OPEN',
  source                ch_case_source NOT NULL DEFAULT 'MANUAL',
  outcome               ch_outcome,
  resolved_at           timestamptz,
  estimated_loss_amount numeric(12,2),
  follow_up_date        date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);
CREATE INDEX ix_ch_case_farm_status ON ch_case (farm_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_ch_case_planting    ON ch_case (planting_id);
CREATE INDEX ix_ch_case_crop        ON ch_case (crop_id, confirmed_problem_id);
CREATE INDEX ix_ch_case_geo         ON ch_case (latitude, longitude);
CREATE TRIGGER trg_ch_case_upd BEFORE UPDATE ON ch_case FOR EACH ROW EXECUTE FUNCTION ch_touch_updated_at();

CREATE TABLE ch_case_plant_part (
  case_id       uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  plant_part_id uuid NOT NULL REFERENCES ch_lookup(id),
  PRIMARY KEY (case_id, plant_part_id)
);

CREATE TABLE ch_case_symptom (
  case_id    uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES ch_symptom(id),
  note       text,
  PRIMARY KEY (case_id, symptom_id)
);

-- Every diagnosis attempt (AI ranked candidates + human decisions)
CREATE TABLE ch_case_diagnosis (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  source           ch_diag_source NOT NULL,
  problem_id       uuid REFERENCES ch_problem(id),                 -- NULL when AI is not in library
  problem_type     ch_problem_type,
  suggested_name   text,                                           -- used when problem_id is NULL
  rank             int,
  confidence       numeric(5,4) CHECK (confidence BETWEEN 0 AND 1),
  model_name       text,
  model_version    text,
  ai_request_id    uuid,
  rationale        text,
  is_confirmed     boolean NOT NULL DEFAULT false,
  confirmed_by     uuid REFERENCES users(id),
  confirmed_at     timestamptz,
  correction_reason text,
  raw_response     jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ch_diag_case ON ch_case_diagnosis (case_id, rank);
CREATE UNIQUE INDEX ux_ch_diag_one_confirmed ON ch_case_diagnosis (case_id) WHERE is_confirmed;

-- Treatments (link recommendation -> Task -> outcome)
CREATE TABLE ch_case_treatment (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id            uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  control_measure_id uuid REFERENCES ch_control_measure(id),
  task_id            uuid REFERENCES tasks(id),
  input_id           uuid REFERENCES inputs(id),
  recommended_by     ch_diag_source NOT NULL DEFAULT 'AI',
  title              text NOT NULL,
  planned_date       date,
  applied_date       date,
  dose_value         numeric(10,3),
  dose_unit_id       uuid REFERENCES ch_lookup(id),
  dose_basis_id      uuid REFERENCES ch_lookup(id),
  application_method_id uuid REFERENCES ch_lookup(id),
  phi_days           int,
  safe_harvest_date  date GENERATED ALWAYS AS (applied_date + phi_days) STORED,
  cost               numeric(12,2),
  status             ch_treatment_status NOT NULL DEFAULT 'RECOMMENDED',
  outcome_notes      text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ch_treat_case ON ch_case_treatment (case_id);
CREATE INDEX ix_ch_treat_safe_harvest ON ch_case_treatment (safe_harvest_date);

-- Follow-up observations (progress tracking)
CREATE TABLE ch_case_followup (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  observed_at   timestamptz NOT NULL DEFAULT now(),
  observed_by   uuid NOT NULL REFERENCES users(id),
  severity      ch_severity,
  incidence_pct numeric(5,2) CHECK (incidence_pct BETWEEN 0 AND 100),
  trend         text CHECK (trend IN ('IMPROVING','STABLE','WORSENING')),
  notes         text
);

CREATE TABLE ch_case_note (
  case_id uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, note_id)
);

-- ---------------------------------------------------------------------
-- 5. AI ENGINE
-- ---------------------------------------------------------------------
CREATE TABLE ch_ai_request (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       uuid NOT NULL REFERENCES farms(id),
  case_id       uuid REFERENCES ch_case(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES users(id),
  request_type  text NOT NULL CHECK (request_type IN ('DIAGNOSE','REMEDY','RISK','CHAT')),
  payload       jsonb NOT NULL,
  response      jsonb,
  status        text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESS','FAILED','TIMEOUT')),
  model_name    text,
  model_version text,
  latency_ms    int,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ch_ai_req_case ON ch_ai_request (case_id);

CREATE TABLE ch_ai_feedback (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id       uuid NOT NULL REFERENCES ch_case_diagnosis(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES users(id),
  was_correct        boolean NOT NULL,
  correct_problem_id uuid REFERENCES ch_problem(id),
  rating             smallint CHECK (rating BETWEEN 1 AND 5),
  comment            text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Training/evaluation export: agronomist-confirmed cases with images
CREATE VIEW v_ch_training_set AS
SELECT c.id AS case_id, c.crop_id, c.variety_id, c.crop_stage, c.confirmed_problem_id,
       p.problem_type, p.name AS problem_name,
       (SELECT count(*) FROM ch_media m WHERE m.owner_type='CASE' AND m.owner_id=c.id) AS image_count,
       c.weather_snapshot, c.observed_at
FROM ch_case c
JOIN ch_problem p ON p.id = c.confirmed_problem_id
WHERE c.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM ch_case_diagnosis d
              WHERE d.case_id = c.id AND d.is_confirmed AND d.source = 'AGRONOMIST');

-- ---------------------------------------------------------------------
-- 6. WEATHER-BASED RISK ALERTS (Phase 4; create tables now, populate later)
-- ---------------------------------------------------------------------
CREATE TABLE ch_risk_rule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id    uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id       uuid REFERENCES crops(id),
  conditions    jsonb NOT NULL,     -- {"temp_c":{"min":20,"max":28},"humidity_pct":{"min":80},"rain_days_in_window":{"min":3}}
  lookback_days int NOT NULL DEFAULT 7,
  level         ch_alert_level NOT NULL DEFAULT 'WATCH',
  is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE ch_alert (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         uuid NOT NULL REFERENCES farms(id),
  planting_id     uuid REFERENCES plantings(id),
  problem_id      uuid REFERENCES ch_problem(id),
  rule_id         uuid REFERENCES ch_risk_rule(id),
  level           ch_alert_level NOT NULL,
  message         text NOT NULL,
  status          text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','ACKNOWLEDGED','DISMISSED','CONVERTED_TO_CASE')),
  acknowledged_by uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ch_alert_farm ON ch_alert (farm_id, status, created_at DESC);

-- ---------------------------------------------------------------------
-- 7. BULK IMPORT (reuse Import Hub tables if they already exist)
-- ---------------------------------------------------------------------
CREATE TABLE ch_import_batch (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       uuid REFERENCES farms(id),
  user_id       uuid NOT NULL REFERENCES users(id),
  entity_type   text NOT NULL CHECK (entity_type IN ('PEST','DISEASE','DEFICIENCY')),
  file_name     text NOT NULL,
  status        text NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','VALIDATING','VALIDATED','IMPORTING','COMPLETED','FAILED')),
  total_rows    int NOT NULL DEFAULT 0,
  success_rows  int NOT NULL DEFAULT 0,
  failed_rows   int NOT NULL DEFAULT 0,
  import_mode   text NOT NULL DEFAULT 'CREATE_ONLY' CHECK (import_mode IN ('CREATE_ONLY','UPSERT_BY_CODE')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE TABLE ch_import_error (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id  uuid NOT NULL REFERENCES ch_import_batch(id) ON DELETE CASCADE,
  sheet     text NOT NULL,
  row_no    int  NOT NULL,
  column_name text,
  message   text NOT NULL
);

-- ---------------------------------------------------------------------
-- 8. SEED DATA (values taken from the "Data Entry Fields" document)
-- ---------------------------------------------------------------------
INSERT INTO ch_nutrient (code,name,category,sort_order) VALUES
 ('N','Nitrogen','MACRONUTRIENT',1),('P','Phosphorus','MACRONUTRIENT',2),('K','Potassium','MACRONUTRIENT',3),
 ('Ca','Calcium','SECONDARY',4),('Mg','Magnesium','SECONDARY',5),('S','Sulphur','SECONDARY',6),
 ('Fe','Iron','MICRONUTRIENT',7),('Zn','Zinc','MICRONUTRIENT',8),('B','Boron','MICRONUTRIENT',9),
 ('Mn','Manganese','MICRONUTRIENT',10),('Cu','Copper','MICRONUTRIENT',11),('Mo','Molybdenum','MICRONUTRIENT',12),
 ('Cl','Chlorine','MICRONUTRIENT',13),('Ni','Nickel','MICRONUTRIENT',14);

INSERT INTO ch_lookup (list_code, code, label, sort_order) VALUES
 ('PEST_CATEGORY','INSECT','Insect',1),('PEST_CATEGORY','MITE','Mite',2),('PEST_CATEGORY','NEMATODE','Nematode',3),('PEST_CATEGORY','OTHER','Other',4),
 ('PEST_TYPE','CHEWING','Chewing',1),('PEST_TYPE','SUCKING','Sucking',2),('PEST_TYPE','BORING','Boring',3),('PEST_TYPE','MINING','Mining',4),('PEST_TYPE','ROOT_FEEDING','Root-feeding',5),
 ('DISEASE_CATEGORY','FUNGAL','Fungal',1),('DISEASE_CATEGORY','BACTERIAL','Bacterial',2),('DISEASE_CATEGORY','VIRAL','Viral',3),('DISEASE_CATEGORY','NEMATODE','Nematode',4),('DISEASE_CATEGORY','PHYTOPLASMA','Phytoplasma',5),('DISEASE_CATEGORY','ABIOTIC','Abiotic',6),
 ('PLANT_PART','ROOT','Root',1),('PLANT_PART','STEM','Stem',2),('PLANT_PART','LEAF','Leaf',3),('PLANT_PART','FLOWER','Flower',4),('PLANT_PART','FRUIT','Fruit',5),('PLANT_PART','SEED','Seed',6),
 ('SPREAD_MECHANISM','WIND','Wind',1),('SPREAD_MECHANISM','SOIL','Soil',2),('SPREAD_MECHANISM','WATER','Water',3),('SPREAD_MECHANISM','SEED','Seed',4),('SPREAD_MECHANISM','PLANTING_MATERIAL','Planting material',5),('SPREAD_MECHANISM','INSECT_VECTOR','Insect vector',6),
 ('MONITORING_METHOD','TRAP','Trap',1),('MONITORING_METHOD','VISUAL','Visual inspection',2),('MONITORING_METHOD','SAMPLING','Sampling',3),('MONITORING_METHOD','SCOUTING','Scouting',4),
 ('APPLICATION_METHOD','SPRAY','Spray',1),('APPLICATION_METHOD','SOIL','Soil application',2),('APPLICATION_METHOD','SEED_TREATMENT','Seed treatment',3),('APPLICATION_METHOD','FOLIAR','Foliar',4),('APPLICATION_METHOD','FERTIGATION','Fertigation',5),('APPLICATION_METHOD','OTHER','Other',9),
 ('DIAGNOSTIC_METHOD','VISUAL','Visual',1),('DIAGNOSTIC_METHOD','SOIL_TEST','Soil test',2),('DIAGNOSTIC_METHOD','TISSUE_TEST','Tissue test',3),
 ('LIFECYCLE_STAGE','EGG','Egg',1),('LIFECYCLE_STAGE','LARVA','Larva',2),('LIFECYCLE_STAGE','NYMPH','Nymph',3),('LIFECYCLE_STAGE','ADULT','Adult',4),
 ('IMAGE_LABEL','WHOLE_PLANT','Whole plant',1),('IMAGE_LABEL','LEAF','Leaf symptom',2),('IMAGE_LABEL','STEM','Stem symptom',3),('IMAGE_LABEL','FRUIT','Fruit symptom',4),('IMAGE_LABEL','ROOT','Root symptom',5),('IMAGE_LABEL','PEST_EGG','Pest - egg',6),('IMAGE_LABEL','PEST_LARVA','Pest - larva/nymph',7),('IMAGE_LABEL','PEST_ADULT','Pest - adult',8),
 ('DOSE_UNIT','ML','ml',1),('DOSE_UNIT','L','L',2),('DOSE_UNIT','G','g',3),('DOSE_UNIT','KG','kg',4),
 ('DOSE_BASIS','PER_LITRE','per litre of water',1),('DOSE_BASIS','PER_ACRE','per acre',2),('DOSE_BASIS','PER_HA','per hectare',3),('DOSE_BASIS','PER_PLANT','per plant',4),('DOSE_BASIS','PER_BED','per bed',5);

```

## Appendix B — Bulk-upload templates
Delivered as `Vivas_AI_Crop_Health_Bulk_Upload_Templates.xlsx` (sheets: Instructions, Pest, Pest_Control, Pest_LifeCycle, Disease, Disease_Control, Deficiency, Deficiency_Correction, Lists). Column list per sheet:

**Pest** (27 columns): Record Code * · Pest Name * · Local Names · Affected Crops * · Primary Crop * · Scientific Name · Pest Category * · Pest Type · Affected Plant Parts * · Identification Symptoms * · Favourable Conditions · Temp Min (°C) · Temp Max (°C) · Humidity Min (%) · Humidity Max (%) · Rainfall Note · Soil Note · Peak Occurrence · Peak Months · Severity Level * · Spread Mechanism · Monitoring Method · Preventive Measures · Resistant/Tolerant Varieties · Image Files · Reference / Source · Notes

**Pest_Control** (17 columns): Record Code * · Seq · Method Type * · Title * · Crop · Product / Input Name · Active Ingredient · Dose Value · Dose Unit · Dose Basis · Application Method · Frequency · Interval Days · Max Applications · PHI Days · Re-entry Hours · Safety Notes

**Pest_LifeCycle** (6 columns): Record Code * · Seq * · Stage * · Duration Min Days · Duration Max Days · Description

**Disease** (24 columns): Record Code * · Disease Name * · Local Names · Affected Crops * · Primary Crop * · Causal Organism · Disease Category * · Affected Plant Parts * · Disease Identification * · Favourable Conditions · Temp Min (°C) · Temp Max (°C) · Humidity Min (%) · Humidity Max (%) · Rainfall Note · Soil Conditions · Disease Development Stage · Mode of Spread · Disease Severity * · Preventive Measures · Resistant/Tolerant Varieties · Image Files · Reference / Source · Notes

**Disease_Control** (17 columns): Record Code * · Seq · Method Type * · Title * · Crop · Product / Input Name · Active Ingredient · Dose Value · Dose Unit · Dose Basis · Application Method · Frequency · Interval Days · Max Applications · PHI Days · Re-entry Hours · Safety Notes

**Deficiency** (14 columns): Record Code * · Deficiency Name * · Local Names · Affected Crops * · Primary Crop * · Nutrient * · Affected Plant Parts * · Deficiency Symptoms * · Severity Level * · Diagnostic Method * · Preventive Measures · Image Files · Reference / Source · Notes

**Deficiency_Correction** (13 columns): Record Code * · Seq · Fertilizer Source * · Crop · Nutrient Content · Application Method * · Recommended Dose Value * · Dose Unit * · Dose Basis * · Timing / Frequency · Interval Days · Max Applications · Notes

