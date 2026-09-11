# Solution Prompt: Configurable Multi-Tenant Roles + Multi-Company Assessment (Vendor Passport)

## 🎯 Context

Vendor Passport is a multi-tenant GRC (Governance, Risk, Compliance) SaaS platform. Each tenant is an **Organization** (identified by `orgId`). Today the system ships with **12 hardcoded roles** (Super Admin, Organization Admin, Compliance Manager, Audit Manager, Auditor, Reviewer, Risk Manager, Document Manager, Vendor Manager, Employee, External Company User, CA / Consultant) that are enforced in **3 hardcoded layers**:

1. Backend Mongoose enum in `backend/modules/auth/auth.model.js`
2. Backend RBAC guards — every route module uses `restrictTo('Super Admin', 'Organization Admin', ..., 'CA / Consultant')`
3. Frontend role matrix in `frontend-react/src/context/AuthContext.jsx` (`ROLE_ROUTES`, `isNavVisibleForRole`, `canAccessPage`)

**Problem:** Clients have different needs. One client (e.g., CII — a main assessor company) wants to control which of the 12 roles are usable in *its own* tenant (e.g., activate/deactivate "CA / Consultant"). Another client may want a **custom role** not in the catalog. And some clients operate a **3-tier supply-chain assessment model** (Main company → Sourcing company → VCPs) requiring cross-company assessment visibility.

**Goal:** Make roles **per-tenant configurable** (no per-client code changes) and support **multi-company assessment** with cross-org visibility — while keeping the existing 12 roles and all current features fully working.

---

## ✅ Preserve (already working — DO NOT BREAK)

- `frameworkId` is `String` in Audit/Control/Requirement/Template models (frontend sends framework *name*).
- Auditor assignment workflow: `POST /api/audits/:id/assign-auditor` and `/unassign-auditor`; auto-advance stage to "Auditor Assigned" (stageIdx 4); creates `audit_assigned` notification.
- `/api/comments` module (finding discussions) — model, service, controller, routes mounted in `server.js`.
- My Workspace page (`/my-workspace`).
- Pagination on list endpoints (`?page=&limit=`) and `usePaginatedApi` + `Pagination` component.
- 20 unit tests + 8 E2E specs (161 tests) must keep passing.

---

## PART 1 — Role Management: 3-Tier Configurable Model

### Tier 1: Role Catalog (keep the 12 predefined roles)
- Keep all 12 roles in the enum. These are the "factory default" catalog every tenant inherits.

### Tier 2: Role Activation (per org)
- Add `activeRoles: [String]` to `backend/modules/organizations/org.model.js` (default: all 12).
- Admin Settings UI: toggle each catalog role on/off for the org (with a searchable grouped list).
- User create/edit form dropdown + Register page: show **only roles active for that org**.
- **Server-side enforcement (critical):**
  - In `backend/middleware/auth.js` `authenticate`, after JWT verify: if the user's role is NOT in the org's `activeRoles`, reject with 403 (role deactivated for org). Cache org activeRoles to avoid a DB hit per request (in-memory TTL cache or Redis).
  - In user create/update service: reject assigning a role not in the org's `activeRoles`.
- Default/seed: first org keeps all roles active; demo seed data unchanged.

### Tier 3: Custom Roles (lightweight, per org)
- New Mongoose model `Role`: `{ orgId, name, baseRole (one of the 12), permissions: [String], status }`.
- Create flow: clone an existing catalog role → rename → toggle permission flags. Permissions reuse the page IDs from the frontend nav matrix (e.g., `audits`, `findings`, `evidence`, `settings`).
- Backend RBAC: add a middleware `canAccess(resource)` that checks (a) catalog role → existing `restrictTo` behavior; (b) custom role → look up org `Role` doc and check permission list. Apply it alongside/in place of `restrictTo` so custom roles can be granted access.
- Frontend: AuthContext must accept custom roles — `ROLE_ROUTES` becomes a function of (user.role, orgCustomRoles loaded from `/api/roles`). Custom role's nav set = union of baseRole nav + toggled permissions.
- API: `/api/roles` (org-scoped CRUD) + `GET /api/roles/mine` for the frontend matrix.

### RBAC Guard Refactor
- Replace hardcoded `restrictTo(...)` argument lists with a shared constant `CATALOG_ROLES` so adding roles doesn't require editing every route file.
- Ensure custom roles that grant permission to a resource actually pass guards (see middleware above).

### Frontend UX
- Group roles in the user form: **Admin / Audit / Compliance / Risk / Document-Vendor / External**.
- By default show primary roles; "Advanced roles" collapsible section.
- Settings → Role Management tab: (a) activate/deactivate catalog roles, (b) create/edit custom roles (clone + permissions).

---

## PART 2 — Multi-Company Assessment (3-Tier Supply Chain)

### Org Types
- Extend `org.model.js` `type` enum to include: `'Main Company (Assessor)'`, `'Sourcing Company'`, `'VCP'` alongside existing `'Own Organization','Supplier','Vendor','Partner','Client'`.
- Seed a sample 3-tier org set (Main → Sourcing → 2 VCPs) to demonstrate.

### Assessment Direction (already partially supported)
- Audit has `party` (`first-party`/`second-party`/`third-party`) + `targetOrgId`.
- Main company assessing a Sourcing company → `party: 'third-party'`, `orgId` = main, `targetOrgId` = sourcing.
- Sourcing company assessing its VCP → `party: 'second-party'`.
- VCP self-assessment → `party: 'first-party'`.

### Cross-Org Visibility Rule (KEY GAP — implement)
- Assessment data (Audit, Findings, Evidence, Responses, CAPA) created under an audit with a `targetOrgId` must be visible to **both** the audit owner (`orgId`) and the target org (`targetOrgId`).
- Implement a shared helper `visibleOrgs(orgId)` and apply to list/detail queries for audits, findings, evidence (e.g., `{ $or: [{ orgId }, { targetOrgId: orgId }] }`).
- Read access is granted across the boundary; **write/update** remains restricted to the owner org (RBAC unchanged for mutations).

### Org Hierarchy / Relationship
- Add a lightweight relationship: `OrgRelation` model `{ orgId, relatedOrgId, relationType: ['assesses','supplies','is_vcp_of'], status }` OR add `parentOrgId` on Organization.
- Sourcing company ↔ VCPs linked via `is_vcp_of`/`supplies`.
- Organization detail page shows related orgs + their assessment status.

### UI
- CreateAudit: when `party` is second/third-party, require selecting a `targetOrgId` (dropdown of related orgs).
- Org detail page: tabs for related orgs and their assessment history.

---

## PART 3 — Role Presentation Simplification (reduce client confusion)

- User-management dropdown groups roles into logical sections (see Part 1 UX).
- Only show roles a client has activated; collapse advanced roles by default.
- Document the 3-tier model in the admin help / onboarding wizard.

---

## 📦 Deliverables Checklist

- [ ] Backend: `activeRoles` on Organization + enforcement in auth middleware + user service
- [ ] Backend: `Role` model + `/api/roles` CRUD + `canAccess` RBAC middleware + `CATALOG_ROLES` constant refactor
- [ ] Backend: org `type` enum extension + cross-org visibility helper applied to audits/findings/evidence queries + `OrgRelation` (or `parentOrgId`)
- [ ] Frontend: Settings → Role Management tab (activation + custom roles)
- [ ] Frontend: user form + register grouped/filtered role dropdown
- [ ] Frontend: AuthContext custom-role support; nav matrix driven by catalog + custom roles
- [ ] Frontend: CreateAudit target-org selector; Org detail related-orgs tabs
- [ ] Seed: sample Main → Sourcing → VCP org tree + custom role example + activeRoles demo
- [ ] Tests: unit tests for role activation enforcement, cross-org visibility, custom-role RBAC; keep existing 20 unit + 161 E2E passing
- [ ] Security: S1 admin self-lockout guard, S2 never-grant list + admin-only role management, S3 `targetOrgId` validation, S4 unified `authorize` middleware, S5 read-only cross-org visibility + indexes + boundary tests, S6 cache invalidation + refresh-token check + demo-fallback disabled in production
- [ ] Docs: update `docs/project_completeness_report.md` and role docs with the new model

## 🛡️ Security Hardening (MANDATORY — implement all of these)

These rules exist to close real loopholes in the design above. Skipping any of them creates a security issue.

### S1. Admin self-lockout protection
- An admin **cannot** deactivate the role they are currently logged in with.
- An org **must** keep at least one admin-capable role (Super Admin / Organization Admin) active at all times. If the last one is toggled off, reject the request with a validation error.

### S2. No privilege escalation via custom roles
- Define a **"never-grant" permission list** for custom roles: `users`, `settings`, `role-management`, `audit-trail`, `api-integrations`, `perm-matrix`. These admin-only resources can **never** be toggled on for a custom role, regardless of base role.
- Custom roles are always **subset** of their base role's permissions + a whitelist of non-admin pages (base role's non-admin set). They can never exceed the base role's non-admin scope.
- Role management (create/edit/activate custom roles + toggle `activeRoles`) is restricted to `Super Admin` and `Organization Admin` only — enforced server-side, not just hidden in UI.

### S3. `targetOrgId` must be validated — no free-form injection
- Creating/updating an audit with a `targetOrgId` is allowed **only** if an approved relationship exists (`OrgRelation` between `orgId` and `targetOrgId`, or `targetOrgId` is a registered org owned by a known partner).
- A rogue user must not be able to point `targetOrgId` at an arbitrary org to create a fake "assessment" and exfiltrate data uploaded under it. Reject unknown/unlinked targets with 422.

### S4. One unified RBAC path (no two parallel systems)
- Single middleware `authorize(resource)` that resolves BOTH catalog roles (via `CATALOG_ROLES`/`restrictTo` lists) AND custom roles (via `Role` doc permissions) in one code path.
- Every protected route uses this unified middleware. Do NOT leave some routes on `restrictTo` and others on `canAccess` — that inconsistency causes both access leaks and false denials.

### S5. Cross-org visibility — read-only + safe joins + indexes
- Cross-org visibility applies to **read (list/get) endpoints only**. All create/update/delete stay strictly on owner `orgId` (RBAC unchanged for mutations).
- For Findings/Evidence/Responses, resolve visibility through `auditId → audit.targetOrgId` (join via the owning audit), NOT by adding `$or` on a stored `orgId` that may belong to either party. This prevents leaking data from unrelated orgs.
- Add compound indexes for the visibility queries: `{ orgId, status }` and `{ targetOrgId, status }` on Audit; matching index on the joined collection.
- Unit-test the exact boundary: target org can READ assessment data, owner org can READ, but **neither can modify the other's records**.

### S6. Role activation must be near-real-time
- Cache org `activeRoles` with a short TTL AND invalidate the cache whenever `activeRoles` or a `Role` doc changes (invalidate by `orgId`).
- The refresh-token endpoint and login must apply the same active-role check as `authenticate` — a deactivated user cannot re-obtain tokens.
- **Pre-existing gap (fix it):** `server.js` has a demo fallback that sets `req.user` to a `Compliance Manager` of `ORG-101` when no/invalid token is present. This must be disabled in production (behind `NODE_ENV !== 'production'` or removed) — otherwise all role/activation enforcement is bypassable.

---

## 🚫 Out of Scope (for now)
- Fully free-form permission editor with per-field granularity (keep it to resource/page-level).
- Real-time notification/email delivery, scheduled report execution, PDF export.
- Replacing the 12 roles with a different fixed set — the catalog stays.

---

## ⚠️ Hard Rules
1. Do not remove or rename existing 12 roles — backward compatibility is required.
2. Existing seed data, unit tests, and E2E tests must pass unchanged (additions allowed).
3. All queries must remain tenant-isolated by `orgId` except the explicit cross-org read rule from Part 2.
4. No hardcoded per-client branches — everything must be config-driven via DB.
5. **Security Hardening S1–S6 are mandatory** — the solution is rejected if any of them is missing.
6. Custom roles can never gain admin-only permissions; `targetOrgId` must always be validated against an approved relationship.
