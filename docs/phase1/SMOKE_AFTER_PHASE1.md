# Phase 0 – GET smoke test

Base: http://localhost:5002 | routes tested: 121

| Result | Count |
|---|---|
| 2xx OK | 106 |
| 401/403 auth | 8 |
| 5xx SERVER ERROR | 7 |

## Failing routes (4xx/5xx/none)

| Status | URL | Message |
|---|---|---|
| 401 | /api/auth/me | {"success":false,"message":"Session expired or invalid token."} |
| 500 | /api/farm-map/items | {"success":false,"error":"column c.parent_id does not exist"} |
| 500 | /api/pih/orders | {"success":false,"message":"column f.name does not exist"} |
| 500 | /api/pih/reference/problems | {"success":false,"message":"column \"default_severity\" does not exist"} |
| 401 | /api/pih/v1/demand | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/insights | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/orders | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/outcomes/aggregate | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/products | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/ratings | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 500 | /api/reports/labor | {"success":false,"error":"relation \"vivas_time_logs\" does not exist"} |
| 500 | /api/reports/sales | {"success":false,"error":"column \"sales_channel\" does not exist"} |
| 500 | /api/reports/summary | {"success":false,"error":"relation \"vivas_harvest_logs\" does not exist"} |
| 500 | /api/reports/yield | {"success":false,"error":"relation \"vivas_harvest_logs\" does not exist"} |
| 401 | /api/security/status | {"success":false,"message":"Admin access required."} |
