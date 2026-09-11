# Vendor Passport — Master Task Inventory

**Total Tasks:** 99 (from 18 audit reports + source code TODO/FIXME)

## BATCH 1 — P0/P1 Security (8 tasks, ~15h)

| ID | P | Task | File |
|----|---|------|------|
| T01 | P0 | Fix auth: replace header-based mock with real JWT | server.js:28 |
| T02 | P0 | Fix search XSS: apply esc() to user input | app.js:2373 |
| T03 | P0 | Fix toast XSS: apply esc() to msg/sub params | app.js:458 |
| T04 | P0 | Fix file upload XSS: esc() on file.name in upload handler | app.js:1590 |
| T05 | P0 | Enable Helmet CSP; set CORS to specific origin | server.js:19-20 |
| T06 | P0 | Import and use express-rate-limit globally | server.js |
| T07 | P1 | Apply esc() everywhere user data enters innerHTML | app.js (global) |
| T08 | P1 | Add input validation to all forms (Create Audit, SSO, Bulk CSV) | app.js |

## BATCH 2 — Data Model (6 tasks, ~20h)

| ID | P | Task | File |
|----|---|------|------|
| T09 | P1 | Add createdAt/updatedAt to all 6 Mongoose models | models/*.js |
| T10 | P1 | Add orgId as required field with index on all models | models/*.js |
| T11 | P1 | Fix field name mismatch: org→orgId, audit→auditId | app.js + models |
| T12 | P2 | Add compound indexes: {orgId,status},{orgId,createdAt} | models/*.js |
| T13 | P2 | Add Response model for questionnaire answers | models/Response.js |
| T14 | P2 | Add EvidenceLink model (evidence↔question/finding/control) | models/EvidenceLink.js |

## BATCH 3 — Auth + RBAC (5 tasks, ~30h)

| ID | P | Task | File |
|----|---|------|------|
| T15 | P1 | Implement real JWT auth with token refresh | server.js + auth middleware |
| T16 | P1 | Add password hashing (bcrypt) | auth service |
| T17 | P2 | Move RBAC from cosmetic frontend to backend middleware | backend/ |
| T18 | P2 | Add role-based API guards on all routes | backend/middleware/ |
| T19 | P2 | Fix isNavVisibleForRole: default-deny for unknown roles | app.js:709 |

## BATCH 4 — Core Workflow (5 tasks, ~40h)

| ID | P | Task | File |
|----|---|------|------|
| T20 | P1 | Build CAPA entity with full lifecycle | models/CAPA.js + routes |
| T21 | P1 | Implement questionnaire response capture | routes + service |
| T22 | P2 | Link evidence upload to questions/findings | routes + UI |
| T23 | P2 | Add undo/backward audit stage transitions | app.js:1225 |
| T24 | P2 | Fix finding status machine: allow Closed→Reopen | app.js:1397 |

## BATCH 5 — Architecture (4 tasks, ~80h)

| ID | P | Task | File |
|----|---|------|------|
| T25 | P1 | Split app.js into data/, routes/, helpers/, components/ | app.js → modular |
| T26 | P2 | Remove duplicate ROUTES.notifications | app.js:1882,3312 |
| T27 | P2 | Remove duplicate nav ID api-integrations | app.js:660,669 |
| T28 | P3 | Remove dead code (unused arrays, orphaned functions) | app.js |

## BATCH 6 — UX/UI (8 tasks, ~40h)

| ID | P | Task | File |
|----|---|------|------|
| T29 | P1 | Add empty states to 35 routes missing them | app.js (all ROUTES) |
| T30 | P1 | Add form validation to all input forms | app.js |
| T31 | P1 | Add ARIA labels: nav, search, modal, toast, SVGs | index.html + app.js |
| T32 | P1 | Implement focus trapping in modals/drawers | app.js:481-498 |
| T33 | P2 | Add pagination to all list views (10 per page) | app.js |
| T34 | P2 | Add keyboard navigation to search | app.js:2360 |
| T35 | P3 | Fix sidebar accordion: allow multi-section open | app.js:733 |
| T36 | P3 | Add role="alert" to toast notifications | app.js:451 |

## BATCH 7 — Testing (5 tasks, ~30h)

| ID | P | Task | File |
|----|---|------|------|
| T37 | P2 | Create test framework (vitest) | package.json + tests/ |
| T38 | P2 | Unit tests: esc(), statusBadge(), classifyIntent() | tests/unit/ |
| T39 | P2 | Integration tests: generateAssistantResponse(), getScopedData() | tests/integration/ |
| T40 | P2 | API tests: POST /api/assistant/query | tests/api/ |
| T41 | P3 | E2E smoke test: login → dashboard → create audit | tests/e2e/ |

## BATCH 8 — Documentation (3 tasks, ~8h)

| ID | P | Task | File |
|----|---|------|------|
| T42 | P3 | Create README.md with setup instructions | README.md |
| T43 | P3 | Update .env.example with all required variables | .env.example |
| T44 | P3 | Create API reference documentation | docs/API.md |

---

**Estimated Total Effort:** ~263 hours (6.5 weeks)
**Current Phase:** BATCH 1 — Security Fixes
