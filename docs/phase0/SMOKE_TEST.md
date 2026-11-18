# Phase 0 – GET smoke test

Base: http://localhost:5001 | routes tested: 122

| Result | Count |
|---|---|
| 2xx OK | 113 |
| 401/403 auth | 9 |

## Failing routes (4xx/5xx/none)

| Status | URL | Message |
|---|---|---|
| 401 | /api/admin/scheduled-jobs | {"success":false,"message":"Admin access required."} |
| 401 | /api/auth/me | {"success":false,"message":"Session expired or invalid token."} |
| 401 | /api/pih/v1/demand | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/insights | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/orders | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/outcomes/aggregate | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/products | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/pih/v1/ratings | {"error":"unauthorized","message":"Missing X-API-Key header"} |
| 401 | /api/security/status | {"success":false,"message":"Admin access required."} |
