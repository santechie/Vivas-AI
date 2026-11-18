# Phase 0 Inventory (auto-generated)

Generated: 2026-11-16T05:56:41.602Z

## Summary

| Metric | Value |
|---|---|
| API routes | 356 |
| Routes with detectable auth check | 19 |
| Tables defined in SQL | 134 |
| Tables referenced in backend code | 124 |
| Referenced but NOT defined in any SQL | 2 |
| Defined but never referenced | 12 |
| Tables defined in more than one SQL file | 6 |
| Frontend .jsx files | 67 |
| Frontend screens (currentScreen) | 27 |
| Files >1000 lines | 17 frontend |
| Files using alert/prompt/confirm | 26 |
| Files calling raw fetch() | 44 |

## Referenced but not defined in SQL (verify against live DB)

- `vivas_farm_map_beds` (used in backend/routes/farmMap.js)
- `vivas_farm_map_items` (used in backend/routes/farmMap.js)

## Defined but never referenced in backend

- `ch_ai_feedback`
- `ch_case_note`
- `ch_import_batch`
- `ch_import_error`
- `ch_risk_rule`
- `pih_jobs`
- `schema_migrations`
- `vivas_financial_budgets`
- `vivas_labor_settings`
- `vivas_pack_batches`
- `vivas_report_snapshots`
- `vivas_settings_webhooks`

## Duplicate definitions across migrations

- `vivas_users`: database/auth_migration.sql, database/seed_80_crops.sql
- `vivas_customers`: database/contacts_migration.sql, database/sell_migration.sql
- `vivas_completed_tasks_records`: database/missing_tables.sql, database/notes_migration.sql
- `vivas_expenses`: database/missing_tables.sql, database/notes_migration.sql
- `vivas_soil_tests`: database/missing_tables.sql, database/notes_migration.sql
- `vivas_orders`: database/schema.sql, database/sell_migration.sql

## Largest frontend files

| File | Lines | alert/prompt | raw fetch |
|---|---|---|---|
| frontend/src/App.jsx | 5121 | yes | 27 |
| frontend/src/grow/CropLibrary.jsx | 2869 |  | 13 |
| frontend/src/grow/CropHealth.jsx | 2260 | yes | 21 |
| frontend/src/settings/modules/OnlineStoreSettings.jsx | 1857 | yes | 6 |
| frontend/src/labor/CrewManager.jsx | 1853 | yes | 6 |
| frontend/src/partnerhub/PartnerProducts.jsx | 1706 |  | 0 |
| frontend/src/contacts/Customers.jsx | 1572 | yes | 7 |
| frontend/src/contacts/Vendors.jsx | 1531 | yes | 7 |
| frontend/src/financials/Transactions.jsx | 1411 | yes | 7 |
| frontend/src/grow/CropPlan.jsx | 1350 | yes | 7 |
| frontend/src/account/AccountManagement.jsx | 1286 | yes | 13 |
| frontend/src/FarmMap.jsx | 1155 | yes | 4 |
| frontend/src/assets/MaterialsInputs.jsx | 1092 | yes | 8 |
| frontend/src/buy/PurchaseOrders.jsx | 1090 | yes | 9 |
| frontend/src/buy/SmartShoppingList.jsx | 1049 |  | 8 |

## Frontend screens

`account`, `accounting-categories`, `buy`, `contact-directory`, `containers`, `crew-manager`, `crop-health`, `crop-library`, `crop-plan`, `customers`, `dashboard`, `equipment-tools`, `farm-map`, `financial-summary`, `harvest-planner`, `labor-analytics`, `materials-inputs`, `notes`, `orders`, `pack-manager`, `reports`, `sales-channels`, `settings`, `tasks`, `time-attendance`, `transactions`, `vendors`

## API routes

| Method | URL | Source | Auth detected |
|---|---|---|---|
| GET | /api/health | server.js:55 | **no** |
| GET | /api/security/status | server.js:56 | **no** |
| POST | /api/auth/register | server.js:93 | **no** |
| POST | /api/auth/login | server.js:136 | **no** |
| POST | /api/auth/forgot-password | server.js:186 | **no** |
| POST | /api/auth/reset-password | server.js:230 | **no** |
| GET | /api/auth/me | server.js:266 | yes |
| POST | /api/auth/logout | server.js:288 | **no** |
| GET | /api/farms | server.js:301 | **no** |
| GET | /api/farms/:id | server.js:365 | **no** |
| POST | /api/farms | server.js:380 | **no** |
| PUT | /api/farms/:id | server.js:438 | **no** |
| DELETE | /api/farms/:id | server.js:482 | **no** |
| POST | /api/farms/select | server.js:494 | **no** |
| GET | /api/widgets/config | server.js:533 | **no** |
| POST | /api/widgets/config | server.js:546 | **no** |
| GET | /api/modules/tasks | server.js:572 | **no** |
| GET | /api/modules/orders | server.js:600 | **no** |
| GET | /api/modules/yields | server.js:621 | **no** |
| GET | /api/modules/labor | server.js:634 | **no** |
| GET | /api/modules/plantings | server.js:647 | **no** |
| GET | /api/modules/sows | server.js:660 | **no** |
| GET | /api/modules/today-tasks | server.js:673 | **no** |
| PATCH | /api/modules/today-tasks/:id | server.js:686 | **no** |
| GET | /api/tasks | server.js:716 | **no** |
| POST | /api/tasks | server.js:787 | **no** |
| PUT | /api/tasks/:id | server.js:847 | **no** |
| DELETE | /api/tasks/:id | server.js:920 | **no** |
| GET | /api/notes | server.js:939 | **no** |
| POST | /api/notes | server.js:1071 | **no** |
| DELETE | /api/notes/:id | server.js:1244 | **no** |
| GET | /api/labs | server.js:1277 | **no** |
| POST | /api/labs | server.js:1296 | **no** |
| GET | /api/locations | server.js:1315 | **no** |
| GET | /api/ch/lookups | routes/cropHealth.js:91 | **no** |
| GET | /api/ch/nutrients | routes/cropHealth.js:120 | **no** |
| GET | /api/ch/symptoms | routes/cropHealth.js:131 | **no** |
| GET | /api/ch/problems | routes/cropHealth.js:160 | **no** |
| GET | /api/ch/problems/:id | routes/cropHealth.js:226 | **no** |
| GET | /api/ch/helpers/create-problem-stub | routes/cropHealth.js:289 | **no** |
| POST | /api/ch/problems | routes/cropHealth.js:293 | **no** |
| PUT | /api/ch/problems/:id | routes/cropHealth.js:438 | **no** |
| POST | /api/ch/problems/:id/workflow | routes/cropHealth.js:514 | **no** |
| GET | /api/ch/cases | routes/cropHealth.js:570 | **no** |
| GET | /api/ch/cases/:id | routes/cropHealth.js:641 | **no** |
| POST | /api/ch/cases | routes/cropHealth.js:694 | **no** |
| PUT | /api/ch/cases/:id | routes/cropHealth.js:784 | **no** |
| POST | /api/ch/cases/bulk-delete | routes/cropHealth.js:858 | **no** |
| DELETE | /api/ch/cases/:id | routes/cropHealth.js:876 | **no** |
| POST | /api/ch/upload-image | routes/cropHealth.js:894 | **no** |
| POST | /api/ch/cases/:id/followups | routes/cropHealth.js:938 | **no** |
| POST | /api/ch/cases/:id/resolve | routes/cropHealth.js:960 | **no** |
| POST | /api/ch/cases/:id/diagnose | routes/cropHealth.js:988 | **no** |
| POST | /api/ch/diagnoses/:id/confirm | routes/cropHealth.js:1054 | **no** |
| GET | /api/ch/cases/:id/remedies | routes/cropHealth.js:1086 | **no** |
| POST | /api/ch/cases/:id/treatments | routes/cropHealth.js:1123 | **no** |
| GET | /api/ch/dashboard/summary | routes/cropHealth.js:1167 | **no** |
| GET | /api/account/summary | routes/account.js:75 | yes |
| GET | /api/account/profile | routes/account.js:170 | yes |
| PUT | /api/account/profile | routes/account.js:191 | yes |
| GET | /api/account/plans | routes/account.js:273 | yes |
| POST | /api/account/upgrade-plan | routes/account.js:377 | yes |
| GET | /api/account/ai-credits | routes/account.js:456 | yes |
| POST | /api/account/ai-credits/buy | routes/account.js:482 | yes |
| POST | /api/account/ai-credits/use | routes/account.js:536 | yes |
| GET | /api/account/storage | routes/account.js:585 | yes |
| POST | /api/account/storage/add-on | routes/account.js:655 | yes |
| POST | /api/account/storage/upload | routes/account.js:700 | yes |
| DELETE | /api/account/storage/files/:id | routes/account.js:786 | yes |
| PATCH | /api/account/storage/files/:id | routes/account.js:824 | yes |
| GET | /api/account/payment-methods | routes/account.js:860 | yes |
| POST | /api/account/payment-methods | routes/account.js:876 | yes |
| GET | /api/account/invoices | routes/account.js:928 | yes |
| POST | /api/account/priority-onboarding | routes/account.js:947 | yes |
| POST | /api/account/delete-farm | routes/account.js:979 | yes |
| GET | /api/settings/overview | routes/settings.js:30 | **no** |
| GET | /api/settings/farm-profile | routes/settings.js:92 | **no** |
| PUT | /api/settings/farm-profile | routes/settings.js:118 | **no** |
| GET | /api/settings/task-types | routes/settings.js:250 | **no** |
| POST | /api/settings/task-types | routes/settings.js:291 | **no** |
| PUT | /api/settings/task-types/:id | routes/settings.js:339 | **no** |
| DELETE | /api/settings/task-types/:id | routes/settings.js:380 | **no** |
| GET | /api/settings/users | routes/settings.js:399 | **no** |
| POST | /api/settings/users | routes/settings.js:426 | **no** |
| PUT | /api/settings/users/:id | routes/settings.js:459 | **no** |
| DELETE | /api/settings/users/:id | routes/settings.js:493 | **no** |
| GET | /api/settings/roles | routes/settings.js:509 | **no** |
| POST | /api/settings/roles | routes/settings.js:523 | **no** |
| GET | /api/settings/product | routes/settings.js:545 | **no** |
| PUT | /api/settings/product | routes/settings.js:559 | **no** |
| GET | /api/settings/online-store | routes/settings.js:614 | **no** |
| PUT | /api/settings/online-store | routes/settings.js:665 | **no** |
| POST | /api/settings/delivery-types | routes/settings.js:731 | **no** |
| PUT | /api/settings/delivery-types/:id | routes/settings.js:764 | **no** |
| DELETE | /api/settings/delivery-types/:id | routes/settings.js:806 | **no** |
| POST | /api/settings/pickup-locations | routes/settings.js:818 | **no** |
| PUT | /api/settings/pickup-locations/:id | routes/settings.js:849 | **no** |
| DELETE | /api/settings/pickup-locations/:id | routes/settings.js:889 | **no** |
| GET | /api/settings/notifications | routes/settings.js:903 | **no** |
| PUT | /api/settings/notifications/:id | routes/settings.js:924 | **no** |
| GET | /api/settings/planting-id | routes/settings.js:948 | **no** |
| PUT | /api/settings/planting-id | routes/settings.js:962 | **no** |
| GET | /api/settings/labels | routes/settings.js:1003 | **no** |
| POST | /api/settings/labels | routes/settings.js:1030 | **no** |
| DELETE | /api/settings/labels/:id | routes/settings.js:1056 | **no** |
| GET | /api/settings/payment-processors | routes/settings.js:1070 | **no** |
| PUT | /api/settings/payment-processors/:id | routes/settings.js:1100 | **no** |
| GET | /api/settings/time-attendance | routes/settings.js:1141 | **no** |
| PUT | /api/settings/time-attendance | routes/settings.js:1155 | **no** |
| GET | /api/settings/custom-fields | routes/settings.js:1202 | **no** |
| POST | /api/settings/custom-fields | routes/settings.js:1223 | **no** |
| DELETE | /api/settings/custom-fields/:id | routes/settings.js:1251 | **no** |
| GET | /api/settings/api-tokens | routes/settings.js:1265 | **no** |
| POST | /api/settings/api-tokens | routes/settings.js:1280 | **no** |
| DELETE | /api/settings/api-tokens/:id | routes/settings.js:1311 | **no** |
| GET | /api/pih/partners | routes/partnerHub.js:296 | **no** |
| POST | /api/pih/partners | routes/partnerHub.js:336 | **no** |
| GET | /api/pih/partners/:id | routes/partnerHub.js:484 | **no** |
| PUT | /api/pih/partners/:id | routes/partnerHub.js:537 | **no** |
| POST | /api/pih/partners/:id/submit | routes/partnerHub.js:642 | **no** |
| POST | /api/pih/partners/:id/review | routes/partnerHub.js:697 | **no** |
| GET | /api/pih/partners/:id/documents | routes/partnerHub.js:821 | **no** |
| POST | /api/pih/partners/:id/documents | routes/partnerHub.js:840 | **no** |
| PUT | /api/pih/documents/:id/review | routes/partnerHub.js:918 | **no** |
| GET | /api/pih/partners/:id/users | routes/partnerHub.js:1005 | **no** |
| POST | /api/pih/partners/:id/users | routes/partnerHub.js:1022 | **no** |
| PUT | /api/pih/partner-users/:id | routes/partnerHub.js:1105 | **no** |
| DELETE | /api/pih/partner-users/:id | routes/partnerHub.js:1124 | **no** |
| GET | /api/pih/stores/:partnerId | routes/partnerHub.js:1138 | **no** |
| PUT | /api/pih/stores/:partnerId | routes/partnerHub.js:1156 | **no** |
| GET | /api/pih/stores/slug/:slug | routes/partnerHub.js:1264 | **no** |
| GET | /api/pih/products | routes/partnerHub.js:1398 | **no** |
| POST | /api/pih/products | routes/partnerHub.js:1525 | **no** |
| GET | /api/pih/products/:id | routes/partnerHub.js:1772 | **no** |
| PUT | /api/pih/products/:id | routes/partnerHub.js:1887 | **no** |
| DELETE | /api/pih/products/:id | routes/partnerHub.js:1998 | **no** |
| POST | /api/pih/products/:id/submit | routes/partnerHub.js:2034 | **no** |
| POST | /api/pih/products/:id/review | routes/partnerHub.js:2079 | **no** |
| POST | /api/pih/products/:id/status | routes/partnerHub.js:2207 | **no** |
| POST | /api/pih/products/:id/skus | routes/partnerHub.js:2263 | **no** |
| POST | /api/pih/products/:id/composition | routes/partnerHub.js:2315 | **no** |
| POST | /api/pih/products/:id/suitability | routes/partnerHub.js:2409 | **no** |
| POST | /api/pih/products/:id/claims | routes/partnerHub.js:2456 | **no** |
| POST | /api/pih/products/:id/media | routes/partnerHub.js:2502 | **no** |
| GET | /api/pih/claims | routes/partnerHub.js:2541 | **no** |
| PUT | /api/pih/claims/:id/review | routes/partnerHub.js:2581 | **no** |
| GET | /api/pih/import/template | routes/partnerHub.js:2648 | **no** |
| POST | /api/pih/import | routes/partnerHub.js:2662 | **no** |
| GET | /api/pih/import/:batchId/errors | routes/partnerHub.js:2792 | **no** |
| GET | /api/pih/reference/crops | routes/partnerHub.js:2810 | **no** |
| GET | /api/pih/reference/problems | routes/partnerHub.js:2820 | **no** |
| GET | /api/pih/audit-log | routes/partnerHub.js:2830 | **no** |
| GET | /api/pih/stores | routes/partnerHub.js:2961 | **no** |
| GET | /api/pih/cart | routes/partnerHub.js:3016 | **no** |
| POST | /api/pih/cart/items | routes/partnerHub.js:3129 | **no** |
| PUT | /api/pih/cart/items/:id | routes/partnerHub.js:3214 | **no** |
| DELETE | /api/pih/cart/items/:id | routes/partnerHub.js:3250 | **no** |
| POST | /api/pih/shopping-list/add | routes/partnerHub.js:3260 | **no** |
| POST | /api/pih/checkout | routes/partnerHub.js:3359 | **no** |
| GET | /api/pih/orders | routes/partnerHub.js:3718 | **no** |
| GET | /api/pih/orders/:id | routes/partnerHub.js:3808 | **no** |
| POST | /api/pih/orders/:id/status | routes/partnerHub.js:3868 | **no** |
| POST | /api/pih/orders/:id/receive | routes/partnerHub.js:4034 | **no** |
| GET | /api/pih/products/:id/reviews | routes/partnerHub.js:4294 | **no** |
| POST | /api/pih/products/:id/reviews | routes/partnerHub.js:4322 | **no** |
| POST | /api/pih/reviews/:id/reply | routes/partnerHub.js:4407 | **no** |
| GET | /api/pih/settlements | routes/partnerHub.js:4452 | **no** |
| POST | /api/pih/settlements/generate | routes/partnerHub.js:4479 | **no** |
| PUT | /api/pih/settlements/:id/status | routes/partnerHub.js:4554 | **no** |
| GET | /api/pih/outcomes | routes/partnerHub.js:4576 | **no** |
| POST | /api/pih/outcomes | routes/partnerHub.js:4653 | **no** |
| POST | /api/pih/outcomes/sync | routes/partnerHub.js:4798 | **no** |
| GET | /api/pih/outcomes/prompts | routes/partnerHub.js:4812 | **no** |
| GET | /api/pih/products/:id/rating | routes/partnerHub.js:4830 | **no** |
| GET | /api/pih/ratings/leaderboard | routes/partnerHub.js:4856 | **no** |
| GET | /api/pih/insights | routes/partnerHub.js:4900 | **no** |
| POST | /api/pih/insights/recompute | routes/partnerHub.js:4953 | **no** |
| PUT | /api/pih/insights/:id/review | routes/partnerHub.js:4972 | **no** |
| GET | /api/pih/trials | routes/partnerHub.js:5018 | **no** |
| POST | /api/pih/trials | routes/partnerHub.js:5075 | **no** |
| PUT | /api/pih/trials/:id/status | routes/partnerHub.js:5148 | **no** |
| POST | /api/pih/trials/:id/observations | routes/partnerHub.js:5194 | **no** |
| GET | /api/pih/partner-dashboard/summary | routes/partnerHub.js:5240 | **no** |
| GET | /api/pih/recommendations | routes/partnerHub.js:5349 | **no** |
| POST | /api/pih/recommendations/generate | routes/partnerHub.js:5458 | **no** |
| PUT | /api/pih/recommendations/:id | routes/partnerHub.js:5491 | **no** |
| POST | /api/pih/recommendations/:id/buy-now | routes/partnerHub.js:5544 | **no** |
| POST | /api/pih/recommendations/:id/add-to-shopping-list | routes/partnerHub.js:5640 | **no** |
| POST | /api/pih/recommendations/:id/create-task | routes/partnerHub.js:5725 | **no** |
| GET | /api/pih/api-keys | routes/partnerHub.js:5848 | **no** |
| POST | /api/pih/api-keys | routes/partnerHub.js:5877 | **no** |
| POST | /api/pih/api-keys/:id/revoke | routes/partnerHub.js:5954 | **no** |
| GET | /api/pih/webhooks | routes/partnerHub.js:5997 | **no** |
| POST | /api/pih/webhooks | routes/partnerHub.js:6033 | **no** |
| PUT | /api/pih/webhooks/:id | routes/partnerHub.js:6100 | **no** |
| POST | /api/pih/webhooks/:id/test | routes/partnerHub.js:6150 | **no** |
| GET | /api/pih/consents | routes/partnerHub.js:6303 | **no** |
| PUT | /api/pih/consents | routes/partnerHub.js:6350 | **no** |
| GET | /api/pih/v1/docs | routes/partnerApiV1.js:134 | **no** |
| GET | /api/pih/v1/products | routes/partnerApiV1.js:252 | **no** |
| GET | /api/pih/v1/products/:code | routes/partnerApiV1.js:302 | **no** |
| PUT | /api/pih/v1/products/:code | routes/partnerApiV1.js:336 | **no** |
| PATCH | /api/pih/v1/skus/:sku/price | routes/partnerApiV1.js:403 | **no** |
| PATCH | /api/pih/v1/skus/:sku/stock | routes/partnerApiV1.js:471 | **no** |
| GET | /api/pih/v1/orders | routes/partnerApiV1.js:538 | **no** |
| PATCH | /api/pih/v1/orders/:no/status | routes/partnerApiV1.js:585 | **no** |
| GET | /api/pih/v1/ratings | routes/partnerApiV1.js:658 | **no** |
| GET | /api/pih/v1/ratings/:code | routes/partnerApiV1.js:688 | **no** |
| GET | /api/pih/v1/insights | routes/partnerApiV1.js:727 | **no** |
| GET | /api/pih/v1/outcomes/aggregate | routes/partnerApiV1.js:773 | **no** |
| GET | /api/pih/v1/demand | routes/partnerApiV1.js:830 | **no** |
| GET | /api/farm-map/items | routes/farmMap.js:13 | **no** |
| GET | /api/farm-map/tree | routes/farmMap.js:43 | **no** |
| GET | /api/farm-map/items/:id | routes/farmMap.js:77 | **no** |
| POST | /api/farm-map/items | routes/farmMap.js:91 | **no** |
| PUT | /api/farm-map/items/:id | routes/farmMap.js:160 | **no** |
| DELETE | /api/farm-map/items/:id | routes/farmMap.js:224 | **no** |
| GET | /api/farm-map/items/:id/beds | routes/farmMap.js:272 | **no** |
| PUT | /api/farm-map/beds/:id | routes/farmMap.js:286 | **no** |
| GET | /api/financials/transactions | routes/financials.js:13 | **no** |
| GET | /api/financials/transactions/stats | routes/financials.js:101 | **no** |
| GET | /api/financials/transactions/:id | routes/financials.js:139 | **no** |
| POST | /api/financials/transactions | routes/financials.js:160 | **no** |
| PUT | /api/financials/transactions/:id | routes/financials.js:258 | **no** |
| DELETE | /api/financials/transactions/:id | routes/financials.js:364 | **no** |
| PUT | /api/financials/transactions/:id/status | routes/financials.js:379 | **no** |
| GET | /api/financials/categories | routes/financials.js:404 | **no** |
| GET | /api/financials/categories/stats | routes/financials.js:439 | **no** |
| POST | /api/financials/categories | routes/financials.js:460 | **no** |
| PUT | /api/financials/categories/:id | routes/financials.js:509 | **no** |
| DELETE | /api/financials/categories/:id | routes/financials.js:565 | **no** |
| GET | /api/financials/analytics | routes/financials.js:588 | **no** |
| GET | /api/contacts/customers | routes/contacts.js:13 | **no** |
| GET | /api/contacts/customers/stats | routes/contacts.js:90 | **no** |
| GET | /api/contacts/customers/:id | routes/contacts.js:129 | **no** |
| POST | /api/contacts/customers | routes/contacts.js:176 | **no** |
| PUT | /api/contacts/customers/:id | routes/contacts.js:225 | **no** |
| DELETE | /api/contacts/customers/:id | routes/contacts.js:280 | **no** |
| GET | /api/contacts/vendors | routes/contacts.js:299 | **no** |
| GET | /api/contacts/vendors/stats | routes/contacts.js:370 | **no** |
| GET | /api/contacts/vendors/:id | routes/contacts.js:411 | **no** |
| POST | /api/contacts/vendors | routes/contacts.js:464 | **no** |
| PUT | /api/contacts/vendors/:id | routes/contacts.js:528 | **no** |
| DELETE | /api/contacts/vendors/:id | routes/contacts.js:602 | **no** |
| GET | /api/contacts/directory | routes/contacts.js:621 | **no** |
| POST | /api/contacts/communications | routes/contacts.js:670 | **no** |
| GET | /api/reports/summary | routes/reports.js:12 | **no** |
| GET | /api/reports/yield | routes/reports.js:66 | **no** |
| GET | /api/reports/sales | routes/reports.js:140 | **no** |
| GET | /api/reports/labor | routes/reports.js:191 | **no** |
| GET | /api/reports/financials | routes/reports.js:240 | **no** |
| GET | /api/reports/saved | routes/reports.js:280 | **no** |
| POST | /api/reports/saved | routes/reports.js:291 | **no** |
| DELETE | /api/reports/saved/:id | routes/reports.js:323 | **no** |
| GET | /api/buy/shopping-list/stats | routes/buy.js:12 | **no** |
| GET | /api/buy/shopping-list | routes/buy.js:45 | **no** |
| POST | /api/buy/shopping-list | routes/buy.js:93 | **no** |
| PUT | /api/buy/shopping-list/:id | routes/buy.js:138 | **no** |
| DELETE | /api/buy/shopping-list/:id | routes/buy.js:184 | **no** |
| POST | /api/buy/shopping-list/convert-to-po | routes/buy.js:199 | **no** |
| GET | /api/buy/purchase-orders/stats | routes/buy.js:265 | **no** |
| GET | /api/buy/purchase-orders | routes/buy.js:295 | **no** |
| GET | /api/buy/purchase-orders/:id | routes/buy.js:335 | **no** |
| POST | /api/buy/purchase-orders | routes/buy.js:366 | **no** |
| PUT | /api/buy/purchase-orders/:id | routes/buy.js:438 | **no** |
| PUT | /api/buy/purchase-orders/:id/receive | routes/buy.js:490 | **no** |
| DELETE | /api/buy/purchase-orders/:id | routes/buy.js:538 | **no** |
| GET | /api/labor/timesheets | routes/labor.js:13 | **no** |
| GET | /api/labor/timesheets/stats | routes/labor.js:55 | **no** |
| GET | /api/labor/timesheets/active | routes/labor.js:77 | **no** |
| POST | /api/labor/clock-in | routes/labor.js:94 | **no** |
| POST | /api/labor/clock-out | routes/labor.js:137 | **no** |
| POST | /api/labor/timesheets | routes/labor.js:177 | **no** |
| PUT | /api/labor/timesheets/:id | routes/labor.js:228 | **no** |
| DELETE | /api/labor/timesheets/:id | routes/labor.js:265 | **no** |
| PATCH | /api/labor/timesheets/:id/approve | routes/labor.js:277 | **no** |
| POST | /api/labor/timesheets/bulk-approve | routes/labor.js:300 | **no** |
| GET | /api/labor/workers | routes/labor.js:329 | **no** |
| GET | /api/labor/workers/stats | routes/labor.js:368 | **no** |
| GET | /api/labor/workers/:id | routes/labor.js:387 | **no** |
| POST | /api/labor/workers | routes/labor.js:410 | **no** |
| PUT | /api/labor/workers/:id | routes/labor.js:448 | **no** |
| DELETE | /api/labor/workers/:id | routes/labor.js:482 | **no** |
| GET | /api/labor/analytics | routes/labor.js:497 | **no** |
| GET | /api/containers | routes/assets.js:13 | **no** |
| GET | /api/containers/stats | routes/assets.js:50 | **no** |
| GET | /api/containers/:id | routes/assets.js:72 | **no** |
| POST | /api/containers | routes/assets.js:84 | **no** |
| PUT | /api/containers/:id | routes/assets.js:133 | **no** |
| DELETE | /api/containers/:id | routes/assets.js:179 | **no** |
| GET | /api/equipment | routes/assets.js:195 | **no** |
| GET | /api/equipment/stats | routes/assets.js:229 | **no** |
| GET | /api/equipment/:id | routes/assets.js:250 | **no** |
| POST | /api/equipment | routes/assets.js:274 | **no** |
| PUT | /api/equipment/:id | routes/assets.js:314 | **no** |
| DELETE | /api/equipment/:id | routes/assets.js:354 | **no** |
| POST | /api/equipment/:id/maintenance | routes/assets.js:366 | **no** |
| GET | /api/inputs/catalog | routes/assets.js:414 | **no** |
| POST | /api/inputs/catalog | routes/assets.js:441 | **no** |
| PUT | /api/inputs/catalog/:id | routes/assets.js:473 | **no** |
| DELETE | /api/inputs/catalog/:id | routes/assets.js:508 | **no** |
| GET | /api/inputs/inventory | routes/assets.js:520 | **no** |
| GET | /api/inputs/inventory/stats | routes/assets.js:548 | **no** |
| POST | /api/inputs/inventory/adjust | routes/assets.js:567 | **no** |
| GET | /api/inputs/lots | routes/assets.js:603 | **no** |
| POST | /api/inputs/lots | routes/assets.js:635 | **no** |
| GET | /api/sales-channels | routes/sell.js:13 | **no** |
| POST | /api/sales-channels | routes/sell.js:35 | **no** |
| PUT | /api/sales-channels/:id | routes/sell.js:72 | **no** |
| DELETE | /api/sales-channels/:id | routes/sell.js:115 | **no** |
| GET | /api/customers | routes/sell.js:132 | **no** |
| POST | /api/customers | routes/sell.js:169 | **no** |
| GET | /api/orders | routes/sell.js:203 | **no** |
| GET | /api/orders/stats | routes/sell.js:263 | **no** |
| GET | /api/orders/:id | routes/sell.js:287 | **no** |
| POST | /api/orders | routes/sell.js:311 | **no** |
| PUT | /api/orders/:id | routes/sell.js:382 | **no** |
| PATCH | /api/orders/:id/status | routes/sell.js:465 | **no** |
| DELETE | /api/orders/:id | routes/sell.js:489 | **no** |
| GET | /api/pack-manager/summary | routes/sell.js:506 | **no** |
| PATCH | /api/pack-manager/order-item/:id/pack | routes/sell.js:599 | **no** |
| POST | /api/pack-manager/mark-order-packed/:orderId | routes/sell.js:643 | **no** |
| GET | /api/crops/categories | routes/grow.js:17 | **no** |
| POST | /api/crops/categories | routes/grow.js:28 | **no** |
| PUT | /api/crops/categories/:id | routes/grow.js:49 | **no** |
| DELETE | /api/crops/categories/:id | routes/grow.js:67 | **no** |
| POST | /api/crops/upload-image | routes/grow.js:83 | **no** |
| GET | /api/crops | routes/grow.js:156 | **no** |
| GET | /api/crops/:id | routes/grow.js:200 | **no** |
| POST | /api/crops | routes/grow.js:233 | **no** |
| PUT | /api/crops/:id | routes/grow.js:364 | **no** |
| DELETE | /api/crops/:id | routes/grow.js:410 | **no** |
| POST | /api/crops/:id/clone | routes/grow.js:425 | **no** |
| POST | /api/crops/:id/varieties | routes/grow.js:472 | **no** |
| PUT | /api/crops/varieties/:varietyId | routes/grow.js:596 | **no** |
| DELETE | /api/crops/varieties/:varietyId | routes/grow.js:655 | **no** |
| GET | /api/harvest-stages | routes/grow.js:670 | **no** |
| GET | /api/seed-suppliers | routes/grow.js:680 | **no** |
| GET | /api/crops/templates | routes/grow.js:690 | **no** |
| GET | /api/crops/templates/:id | routes/grow.js:795 | **no** |
| POST | /api/crops/templates | routes/grow.js:907 | **no** |
| PUT | /api/crops/templates/:id | routes/grow.js:949 | **no** |
| DELETE | /api/crops/templates/:id | routes/grow.js:1232 | **no** |
| POST | /api/crops/templates/:id/nursery-tasks | routes/grow.js:1281 | **no** |
| POST | /api/crops/templates/:id/field-tasks | routes/grow.js:1296 | **no** |
| DELETE | /api/crops/nursery-tasks/:taskId | routes/grow.js:1311 | **no** |
| DELETE | /api/crops/field-tasks/:taskId | routes/grow.js:1322 | **no** |
| GET | /api/plantings | routes/grow.js:1337 | **no** |
| GET | /api/plantings/stats | routes/grow.js:1383 | **no** |
| POST | /api/plantings | routes/grow.js:1410 | **no** |
| PUT | /api/plantings/:id | routes/grow.js:1476 | **no** |
| DELETE | /api/plantings/:id | routes/grow.js:1552 | **no** |
| GET | /api/harvest-plans | routes/grow.js:1568 | **no** |
| POST | /api/harvest-plans | routes/grow.js:1613 | **no** |
| PATCH | /api/harvest-plans/:id/status | routes/grow.js:1658 | **no** |
| DELETE | /api/harvest-plans/:id | routes/grow.js:1685 | **no** |
