# Vendor Passport — Risk Register (Top Issues)

| ID | Severity | Category | Module | Issue | Evidence (File:Line) | Business Impact | Effort | Priority |
|----|----------|----------|--------|-------|---------------------|-----------------|--------|----------|
| RR-001 | P0 | Security | Auth | Mock auth via spoofable HTTP headers. Any client can become Super Admin | server.js:28-47 | Full data breach, no access control | 40h | 1 |
| RR-002 | P0 | Security | Search | Reflected XSS in global search — unescaped user input in innerHTML | app.js:2373 | Attacker can execute arbitrary JS in victim's browser | 2h | 2 |
| RR-003 | P0 | Security | Toast | XSS in toast messages — msg/sub injected unescaped into innerHTML | app.js:458 | Any toast-triggered action is an XSS vector | 2h | 3 |
| RR-004 | P0 | Security | Global | esc() defined but used in only 2 of 37 innerHTML sites across 5,267 lines | Entire app.js | Comprehensive XSS vulnerability surface | 20h | 4 |
| RR-005 | P0 | Security | Server | Helmet CSP disabled; CORS defaults to wildcard; no CSRF protection | server.js:19-23 | API exposed to any origin; no request forgery protection | 4h | 5 |
| RR-006 | P0 | Security | UI | File upload XSS — file.name directly in innerHTML without esc() | app.js:1590 | Malicious filename executes script | 1h | 6 |
| RR-007 | P1 | Data | Findings | No CAPA entity. CAPA lifecycle embedded in Finding as inline fields | app.js:151-170 | Cannot track CAPA aging, approval, evidence linkage | 60h | 7 |
| RR-008 | P1 | Data | Questionnaire | No Response entity. Questions are static data; no way to store audit answers | app.js:111-130 | Entire fieldwork workflow non-functional | 80h | 8 |
| RR-009 | P1 | Data | Evidence | No Evidence entity mapped to questions. Documents only link to audits, not questions | app.js:186-195 | Cannot prove which document satisfies which control test | 40h | 9 |
| RR-010 | P1 | Data | Models | All 6 Mongoose models lack createdAt/updatedAt, orgId isolation, indexes | models/*.js | No auditability in an audit platform — compliance failure | 20h | 10 |
| RR-011 | P1 | UI | Forms | Zero form validation on any input across all 52 routes | Global | Data integrity; empty audits, invalid dates, XSS via form fields | 30h | 11 |
| RR-012 | P1 | UI | Search | Search results not keyboard-navigable; no aria labels on search | app.js:2360 | Accessibility failure; keyboard-only users blocked | 8h | 12 |
| RR-013 | P1 | UI | Modal | No focus trap in modals/drawers; Tab escapes overlay | app.js:481-498 | Keyboard navigation broken; focus lands behind modal | 6h | 13 |
| RR-014 | P1 | UI | Notifications | Toast notifications have no role="alert"; screen reader users get no feedback | app.js:451-461 | WCAG compliance failure | 3h | 14 |
| RR-015 | P1 | Business | CAPA | CAPA Board route exists but ROUTES['capa'] is undefined — broken link | app.js:633 | User clicks a nav item that leads nowhere | 40h | 15 |
| RR-016 | P2 | Data | Orgs | Organization reference uses name string, not ID. orgById(name) breaks on renames | app.js:430 | Data integrity failure at scale | 20h | 16 |
| RR-017 | P2 | Data | Risk/Control | Bidirectional Risk↔Control denormalization with no join table | app.js:133,146 | Eventual inconsistency guaranteed; write amplification | 15h | 17 |
| RR-018 | P2 | UI | Nav | Duplicate nav ID 'api-integrations' — second definition overwrites first | app.js:660,669 | Developer section appears broken | 1h | 18 |
| RR-019 | P2 | UI | Filters | Filter state not persisted (no localStorage). Lost on page refresh | app.js:954 | Poor UX for filtering workflows | 4h | 19 |
| RR-020 | P2 | UI | Empty | 35 of 43 ROUTES lack empty states | Global | User sees blank pages with no guidance | 12h | 20 |

**Total Identified Issues:** 99 (18 Critical + 35 High + 28 Medium + 18 Low)
