# Vendor Passport — Multi-Tenancy Audit

## Overall Multi-Tenancy Score: 45 / 100

### Backend (Strong Foundation)

**roleScopes.js** (`backend/middleware/roleScopes.js`): Well-designed 12-role × 6-domain scope matrix. Correctly differentiates `all`, `ownOrg`, `assignedAudits`, `ownFindings`, `ownVendors`, `assignedClients`, `none` per domain. The `getScope()`, `canAccessDomain()`, `accessibleDomains()` functions are clean.

**assistantService.js query builders**: Each domain has its own query builder with switch-case on scope level. MongoDB queries enforce `orgId` filtering. Good security-by-design pattern.

**AssistantConversation model**: Stores `userId`, `orgId`, `role` per conversation. Ownership checks on GET/DELETE.

### Frontend (Cosmetic)

**isNavVisibleForRole()** (`app.js:699-710`): Client-side only sidebar filtering. Does not prevent access — any user can call `navigate()` via console to reach any page. This is **cosmetic RBAC**, not real authorization.

**Data scoping in assistant** (`app.js:4115-4200`): Client-side data filtering mirrors backend scope matrix. However, all mock data is available in-memory — the filtering is a UI convenience, not a security control.

### Gaps

| ID | Severity | Issue |
|----|----------|-------|
| MT-01 | P1 | Frontend org isolation is cosmetic — console `navigate()` bypasses nav filtering |
| MT-02 | P2 | No orgId in frontend API calls — all data accessible in browser memory |
| MT-03 | P2 | No tenant-scoped caching strategy |
| MT-04 | P2 | Auth middleware assigns same orgId for all requests (from header) |
| MT-05 | P3 | No tenant onboarding/isolation testing |
| MT-06 | P3 | File storage has no org-level path segregation |

### IDOR Risk Assessment

- **Medium**: Conversation IDs are UUID-like, ownership-checked. But auth is header-based.
- **Low**: All data is client-side mock. No real data exposure possible in current state.
- **High (future)**: When real DB is connected, same `userId` from header pattern would enable full IDOR.

### Tenancy Verification Checklist

| Layer | Tenant Isolated? | Notes |
|-------|-----------------|-------|
| Authentication | NO | Header-based mock |
| Authorization | PARTIAL | Backend scope matrix exists; frontend cosmetic-only |
| API | NO | Single demo user; no tenant routing |
| Service | YES | all scope queries use `orgId` |
| Database | PARTIAL | Schemas have `orgId` but models lack it as required field |
| File Storage | NO | No storage layer; all in-memory |
| Cache | NO | No cache layer |
| Reports | NO | No report generation |
| Search | NO | Global search scans ALL data arrays |
