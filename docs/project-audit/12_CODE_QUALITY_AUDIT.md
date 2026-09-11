# Vendor Passport — Code Quality Audit

## Overall Code Quality Score: 35 / 100

### Architecture Issues (P1-P2)

| ID | Issue | Evidence |
|----|-------|----------|
| CQ-01 | 5,267-line monolith app.js — no module separation | app.js: entire file |
| CQ-02 | No separation of concerns — data, routes, rendering, and business logic all in one file | app.js |
| CQ-03 | 40+ mock data arrays mixed with 52 route renderers mixed with helper functions | app.js:64-4543 |
| CQ-04 | Global mutable state: `STATE`, `AUDIT_FILTER`, `FINDING_FILTER`, etc. | app.js:363,954,1319,1449 |
| CQ-05 | `window.CURRENT_AUDIT_ID` and `window.AUDIT_TAB` — global state pollution | app.js:1017,1105 |
| CQ-06 | Duplicate `ROUTES.notifications` defined twice | app.js:1882,3312 |
| CQ-07 | Duplicate nav ID `api-integrations` defined twice | app.js:660,669 |

### Code Patterns (P2-P3)

| ID | Issue | Evidence |
|----|-------|----------|
| CQ-08 | innerHTML used as rendering strategy for ALL views — no virtual DOM or template engine | Global |
| CQ-09 | No component abstraction — every route renders raw HTML strings inline | All ROUTES functions |
| CQ-10 | SVG icons as inline HTML strings — no icon component | app.js:12-46 |
| CQ-11 | Magic strings throughout — status names hardcoded in multiple places | Status badge maps, filter arrays |
| CQ-12 | No TypeScript or JSDoc type annotations | Global |
| CQ-13 | `var` used inconsistently alongside `let`/`const` | Multiple locations |
| CQ-14 | Template literals generate 200+ line HTML strings indented inconsistently | ROUTES functions |
| CQ-15 | `Object.keys(scopedData).forEach()` mutation in async context | assistantService.js:412 |

### Dead Code (P3-P4)

| ID | Issue |
|----|-------|
| DC-01 | `linkedAudits` field in Risk model — never populated |
| DC-02 | Control IDs CTL-003 and CTL-007 missing — suggest deleted but no marker |
| DC-03 | `ROUTES['self-assessment']` referenced in nav but undefined |
| DC-04 | `ROUTES['capa']` referenced in nav but undefined |
| DC-05 | `ROUTES['vendor-scorecard']` referenced in nav but undefined |
| DC-06 | Offline banner element referenced but never created in HTML |
| DC-07 | express-rate-limit in package.json but never imported |
| DC-08 | `checkConditionalQuestions()` defined but never called |

### SOLID Analysis

- **S (Single Responsibility):** FAIL — app.js does everything
- **O (Open/Closed):** FAIL — no extension points, all hardcoded
- **L (Liskov Substitution):** N/A — no inheritance used
- **I (Interface Segregation):** N/A — no interfaces
- **D (Dependency Inversion):** FAIL — tight coupling to mock data arrays

### Estimated Technical Debt

| Category | Hours to Fix |
|----------|-------------|
| Module separation | 80h |
| Component abstraction | 60h |
| Type safety | 40h |
| Dead code removal | 8h |
| State management | 24h |
| **Total** | **212h** |
