# Vendor Passport — Prioritized Action Plan

## 90-Day Roadmap (MVP)

### Sprint 1-2: Security Hardening (Week 1-2)
- [ ] Replace mock auth with real JWT/session (`server.js:28-47`)
- [ ] Fix search XSS: apply `esc()` to `q` in global search (`app.js:2373`)
- [ ] Fix toast XSS: apply `esc()` to `msg` and `sub` (`app.js:458`)
- [ ] Apply `esc()` to file.name in upload handler (`app.js:1590`)
- [ ] Enable Helmet CSP with proper policy; set CORS to specific origin (`server.js:19-20`)
- [ ] Import express-rate-limit and apply globally (`server.js`)

### Sprint 3-4: Data Model Foundation (Week 3-4)
- [ ] Add `createdAt`, `updatedAt`, `orgId` to all 6 Mongoose models
- [ ] Add indexes on `orgId` + `status` + `createdAt` compound indexes
- [ ] Create Response collection for questionnaire answers
- [ ] Create EvidenceLink collection (evidence → question, finding, control)
- [ ] Fix field name mismatch: `org`→`orgId`, `audit`→`auditId` in mock data
- [ ] Change org reference from name string to ID throughout

### Sprint 5-6: Core Workflow Enablement (Week 5-6)
- [ ] Build CAPA entity with full lifecycle (Open → In Progress → Verified → Closed)
- [ ] Implement questionnaire response capture
- [ ] Link evidence upload to specific questions
- [ ] Add forward/backward audit stage transitions with confirmation

### Sprint 7-8: UX Foundation (Week 7-8)
- [ ] Add form validation to all input fields (Create Audit, SSO Config, Sampling)
- [ ] Add empty states to all 35 routes missing them
- [ ] Add aria-labels, role="alert" for toast, aria-hidden for SVGs
- [ ] Implement focus trapping in modals and drawers
- [ ] Make global search keyboard-navigable

### Sprint 9-10: Architecture Cleanup (Week 9-10)
- [ ] Split app.js into modules (data, routes, helpers, components)
- [ ] Fix duplicate ROUTES.notifications
- [ ] Fix duplicate nav ID api-integrations
- [ ] Remove dead code and unused mock data arrays

### Sprint 11-12: Testing + Docs (Week 11-12)
- [ ] Write unit tests for `esc()`, `classifyAssistantIntent()`, `statusBadge()`
- [ ] Write integration tests for audit lifecycle
- [ ] Write API tests for /api/assistant/query
- [ ] Update README with actual architecture, not blueprint aspirations

## Long-Term Roadmap (6-12 months)

- Build Business Unit + Process hierarchy
- Build Requirement entity linked to Framework
- Build Vendor-specific entity with risk tiering
- Build Policy lifecycle + attestation tracking
- Build Continuous Controls Monitoring engine
- Implement proper CI/CD with GitHub Actions
- Add E2E tests with Playwright
- Achieve SOC 2 compliance for the platform itself
