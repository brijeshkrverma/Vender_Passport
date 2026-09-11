# Vendor Passport — API Audit

## Overall API Score: 25 / 100

### 5 Real Endpoints (all under /api/assistant)

| Method | Path | Auth | Rate Limit | Validated |
|--------|------|------|------------|-----------|
| POST | /query | Stub header | In-memory 20/min | message length/type only |
| GET | /conversations | Stub header | Shared limit | None |
| GET | /conversations/:id | Stub header | Shared limit | None |
| DELETE | /conversations/:id | Stub header | Shared limit | None |
| GET | /api/health | None | None | None |

### 9 Mock/Documentation-Only Endpoints (not wired)

Listed in `API_ENDPOINTS` (app.js:294-304) but never registered with Express:
- GET/POST /api/v1/audits
- GET /api/v1/findings
- GET /api/v1/risks
- POST /api/v1/evidence
- GET /api/v1/certificates
- GET /api/v1/organizations
- GET/POST /api/webhooks

**Impact:** The API documentation implies a full REST API that doesn't exist. Any integrator reading the docs would be misled.

### Issues

| ID | Severity | Issue |
|----|----------|-------|
| API-01 | P0 | No real authentication on any endpoint |
| API-02 | P1 | 9 documented endpoints are not implemented — misleading |
| API-03 | P1 | No CRUD API for audits, findings, risks, certs, orgs |
| API-04 | P2 | Rate limiter in-memory only — lost on restart, no Redis |
| API-05 | P2 | No API versioning strategy (paths use /api/v1/ but not implemented) |
| API-06 | P2 | No pagination on conversation listing (capped at 20, no cursor) |
| API-07 | P3 | No request logging beyond console.error |
| API-08 | P3 | No correlation IDs in responses |
| API-09 | P3 | Error responses inconsistent — some return `{error}`, some `{error, message}` |
| API-10 | P3 | No OpenAPI/Swagger documentation |

### Missing APIs (Critical for Platform)

- Audit CRUD (create, read, update, delete/archive)
- Finding CRUD with status transitions
- Risk CRUD
- Certificate CRUD
- Document upload (multipart)
- Evidence link/unlink to questions/findings
- User management (invite, role assignment)
- Organization management
- Framework library (read, map to audits)
- Reporting/export endpoints
