# Vendor Passport API

> **Honesty note (S1-5):** This document reflects the *actual* API as implemented in the current codebase, verified against `server.js` route mounts, module route files, and live E2E runs. Anything marked **known-broken / pending** really is broken — no claims here are aspirational.

## Base URL

```
http://localhost:3000/api
```

Auth endpoints are JWT-based. Demo/local: any logged-in frontend session sends `Authorization: Bearer <accessToken>`.

---

## Authentication

All protected endpoints require a valid JWT Bearer token:

```
Authorization: Bearer <accessToken>
```

Tokens are HMAC-SHA256 signed with `JWT_SECRET` (zod-validated in `backend/config/env.js`; weak/missing secret → server refuses to start). Payload: `{ userId, role, orgId, orgName, iat, exp, jti }`.

- Access token expiry: `JWT_EXPIRY` (default 24h, `expiresIn: 86400` reported by login)
- Refresh token: 7d, stored on the user document; `/refresh` rotates both tokens
- Logout blacklists the access token `jti` in Redis (best-effort — skipped if Redis is down)

**Demo mode is NOT a real mode.** When MongoDB is unreachable the server still boots and answers `/api/health` with `mode: "demo"`, but protected routes will fail (no data). This is a known limitation (issue I-03), not a feature.

---

## Rate Limits

Rate limiting is **live** (T06 verified — 6th request in a window → `429`).

| Scope    | Limit     | Window  | Where                          |
|----------|-----------|---------|--------------------------------|
| Global   | 100 req   | 60 s    | `server.js` on `/api`          |
| Login    | 5 attempts| 15 min  | `auth.routes.js` on POST /login (successful logins don't count) |
| Assistant| 20 queries| 60 s    | `assistant.routes.js` (in-memory fallback when Redis down) |

429 response:
```json
{ "success": false, "code": "RATE_LIMITED", "message": "Too many requests, please try again later." }
```
Headers: `RateLimit-Limit`, `RateLimit-Remaining` (assistant uses `{ error: 'Too many requests', retryAfter: 60 }`).

Note: the test-mode server (`scripts/start-test-server.js`) sets `RATE_LIMIT_ENABLED=0` so E2E runs aren't throttled.

---

## Error Response Format

```json
{ "success": false, "code": "SHORT_CODE", "message": "Human-readable description" }
```

Validation errors include an `errors` array:
```json
{ "success": false, "code": "VALIDATION_ERROR", "errors": [{ "field": "email", "message": "Invalid email" }] }
```

HTTP status codes:
- `400` — validation failure (`VALIDATION_ERROR`)
- `401` — missing/invalid/expired token (`UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_EXPIRED`)
- `403` — authenticated but not allowed (`FORBIDDEN`)
- `404` — not found (`NOT_FOUND`)
- `409` — duplicate key (`DUPLICATE`)
- `429` — rate limited (`RATE_LIMITED`)

---

## Response Envelope

Collection endpoints return a paginated envelope:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3, "hasNext": true, "hasPrev": false },
  "meta": { "timestamp": "..." }
}
```

Single-resource endpoints return:
```json
{ "success": true, "data": { ... }, "meta": { "timestamp": "..." } }
```

Pagination params: `?page=1&limit=20` (limit capped at 100, default 20).
**Honesty note:** pagination is applied in memory after the full collection is fetched (`items.slice(skip, skip+limit)`), not in the DB query — see issue I-16 / Sprint 2-6.

---

## Endpoints

### Health Check

```
GET /api/health
```

**Response** `200`:
```json
{
  "status": "ok",
  "mode": "production",
  "mongodb": "connected",
  "timestamp": "2026-07-27T12:00:00.000Z"
}
```
`mode` = `production` when MongoDB connected, `demo` otherwise. `mongodb` ∈ `connected | disconnected | connecting | disconnecting`.

---

### Auth

| Method | Path                   | Auth  | Purpose                          |
|--------|------------------------|-------|----------------------------------|
| POST   | `/api/auth/register`   | no    | Create user (`email`, `password` ≥8, `name`, `role`, `orgId`) |
| POST   | `/api/auth/login`      | no    | `{ email, password }` → user + tokens |
| POST   | `/api/auth/refresh`    | no    | `{ refreshToken }` → new token pair |
| POST   | `/api/auth/logout`     | yes   | Blacklist access token, clear refresh token |
| GET    | `/api/auth/me`         | yes   | Current user from token          |
| PUT    | `/api/auth/change-password` | yes | `{ oldPassword, newPassword }` |

Login response `200`:
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "email": "priya.sharma@globaltech.com", "name": "Priya Sharma", "role": "Compliance Manager", "orgId": "ORG-101", "orgName": "GlobalTech Solutions", "status": "Active", "lastLogin": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 86400
  },
  "meta": { "timestamp": "..." }
}
```

---

### Resource CRUD Modules

All follow the same pattern. Fields vary per module (Zod-validated).

| Module         | Routes (verbs) |
|----------------|----------------|
| `/api/users`   | GET `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` |
| `/api/organizations` | GET `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` |
| `/api/frameworks` | GET `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` |
| `/api/requirements` | GET `/by-framework/:frameworkId` `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` |
| `/api/controls` | GET `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` |
| `/api/audits` | GET `/stats` `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` · POST `/:id/advance` `/:id/retreat` `/:id/assign-auditor` `/:id/unassign-auditor` |
| `/api/evidence` | GET `/expiring` `/by-audit/:auditId` `/by-target/:targetType/:targetId` `/` `/:id` · POST `/upload` (multipart) `/` · GET `/:id/download` · PUT `/:id` · DELETE `/:id` · PATCH `/:id/verify` · GET `/:id/links` · POST `/:id/links` · DELETE `/:id/links/:linkId` |
| `/api/findings` | GET `/stats` `/by-audit/:auditId` `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` · POST `/:id/advance` `/:id/reopen` |
| `/api/comments` | GET `/by-finding/:findingId` · POST `/` · DELETE `/:id` |
| `/api/capa` | GET `/stats` `/by-finding/:findingId` `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` · POST `/:id/advance` |
| `/api/risks` | GET `/heatmap` `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` |
| `/api/certificates` | GET `/expiring` `/stats` `/` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` |
| `/api/documents` | GET `/audit/:auditId` `/` `/:id` · POST `/upload` (multipart) `/` · GET `/:id/download` · PUT `/:id` · DELETE `/:id` |
| `/api/vendors` | GET `/` `/:id/scorecard` `/:id` · POST `/` · PUT `/:id` · DELETE `/:id` |
| `/api/settings` | GET `/` · PUT `/` (per-org) |
| `/api/ccm` | GET `/dashboard` `/alerts` |

### File upload (I-11 / R25 done)

Evidence and Documents support real file attachments via `multipart/form-data`.

| Method | Path                        | Purpose |
|--------|-----------------------------|---------|
| POST   | `/api/evidence/upload`      | Upload evidence file + metadata (creates an Evidence record) |
| POST   | `/api/documents/upload`     | Upload document file + metadata (creates a Document record) |
| GET    | `/api/evidence/:id/download`  | Download the stored evidence file (org-scoped) |
| GET    | `/api/documents/:id/download` | Download the stored document file (org-scoped) |

**Upload request:** `multipart/form-data` with a `file` field plus optional fields
(`name`, `type`, `version`, `expiry`, `status`, `confidentiality`, `relatedAuditId`).
`name` defaults to the original file name; `version` defaults to `1.0`.
`uploadedBy` is derived from the session token — never from the body.

**Limits & rules:**
- Max file size **25 MB** (`LIMIT_FILE_SIZE` → 400 `UPLOAD_ERROR`).
- Allowed extensions: PDF, images (png/jpg/jpeg/gif/webp/bmp/tiff), Office (doc/docx/xls/xlsx/ppt/pptx),
  CSV, TXT, MD, RTF, LOG, EML, ZIP, 7Z. Anything else → **400** `VALIDATION_ERROR`.
- Files are stored under `uploads/` on disk; the DB row keeps `filePath` (`/uploads/<name>`),
  `fileSize`, `mimeType`. Deleting the DB row also deletes the file on disk.
- **Download is tenant-scoped** like every other resource: cross-org download → 404, no token → 401.

### Reports

| Method | Path                  | Purpose |
|--------|-----------------------|---------|
| GET    | `/api/reports/summary` | 4 KPI counts (audits/findings/risks/certificates) |
| GET    | `/api/reports/export/:type` | CSV export; `:type` ∈ audits/findings/risks/certificates |

### Notifications

| Method | Path                  | Purpose |
|--------|-----------------------|---------|
| GET    | `/api/notifications`  | List user's notifications |
| GET    | `/api/notifications/unread-count` | Unread badge count |
| POST   | `/api/notifications/mark-all-read` | Mark all read |
| GET    | `/api/notifications/:id` | Single notification |
| PATCH  | `/api/notifications/:id/read` | Mark one read |
| POST   | `/api/notifications`  | Create |
| DELETE | `/api/notifications/:id` | Delete |

---

### AI Assistant ✅

| Method | Path                      | Status |
|--------|---------------------------|--------|
| POST   | `/api/assistant/query`    | Implemented (real pipeline) |
| GET    | `/api/assistant/conversations` | Implemented |
| GET    | `/api/assistant/conversations/:id` | Implemented |
| DELETE | `/api/assistant/conversations/:id` | Implemented |

**Status (Sprint 2-2 / R30 done):** `POST /api/assistant/query` returns **200** with a real, org-scoped answer. `backend/assistantService.js` classifies the message into one of `certificates | audits | findings | risks | documents | organizations | general_summary`, queries the six core collections scoped to the caller's tenant (`req.user.scopeOrgId` — all orgs for Super Admin), and builds an HTML answer. Multi-turn works via `conversationId` (a new conversation is created on first turn, appended to after). Request body: `{ "message": "...", "conversationId?": "..." }`; `orgId`/`role`/`scope` in the body are rejected (400) — scope is derived from the session token.

Response shape (wrapped in the standard `{ success, data, meta }` envelope):

```json
{
  "conversationId": "6a7411d8...",
  "message": { "role": "assistant", "content": "<strong>Certificates</strong> — ...", "referencedIds": ["..."] },
  "metadata": { "intent": "certificates", "scopeNote": "Scoped to GlobalTech Solutions", "totalRecords": 2 }
}
```

Every answer is scoped to the caller's tenant (no cross-tenant leakage). **Super Admin (S2-3):** scope is the whole platform — `req.user.scopeOrgId` is `null` for Super Admin, so the assistant aggregates data across all orgs. All DB-sourced values are HTML-escaped before rendering. Rate limiting: 20 queries / 60 s per user (in-memory fallback when Redis is down).

---

## Tenant scoping (S2-3)

All org-scoped read/write endpoints (organizations, audits, certificates, findings, risks, documents, frameworks, requirements, controls, vendors, capa, evidence, comments, reports, questionnaire templates/responses) derive their tenant from the session:

- **Regular roles:** `req.user.scopeOrgId = req.user.orgId` — only their own org's records are visible; accessing another org's record by ID returns **404** (no existence leak); passing a foreign `orgId` in a create/update body is rejected by `tenantIsolation`.
- **Super Admin:** `req.user.scopeOrgId = null` — sees all orgs. Creating without an explicit `orgId` defaults to the Super Admin's own org; passing `orgId` in the body creates in that org.

Implemented via `backend/shared/scope.js` (`orgFilter`, `byIdQuery`) — services call `orgFilter(orgId)` for filters and `byIdQuery(orgId, id)` for single-record lookups.

---

## Frontend/SPA fallback

Non-`/api` routes return the built React app (`frontend-react/dist/index.html`). Unknown `/api/*` paths return `404` JSON (`{ error: 'API route not found' }`).

## Auth flow used by the frontend

- Login stores `vp_token` (access token) + user in `localStorage`
- Every authenticated fetch sends `Authorization: Bearer <vp_token>`
- Route guard redirects unauthenticated visitors to `/login`, unauthorized roles to `/dashboard`
