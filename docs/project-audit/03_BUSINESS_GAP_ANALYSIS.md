# Vendor Passport — Business Gap Analysis

## Overall Business Score: 52 / 100

### Implemented (REAL — fully functional)
- Audit Management (list + detail + lifecycle)
- Certificate Management (CRUD + expiry alerts)
- Document Management (upload + versioning)
- Organization Management (list + detail drawer + comparison)
- Risk Register (list + heatmap)
- Control Library (list + framework mapping)
- Notifications (list + detail panel)
- Dashboard (dynamic stats from mock data)
- AI Assistant (read-only chat + scoped data + Claude pipeline)
- Document Exchange (share workflow)
- Client Portfolio (CA/consultant view)

### Partially Implemented (PARTIAL)
- Audit Planning (audit universe exists but no plan generation)
- Risk-Based Auto Scheduling (engine exists but uses mock data, no persistence)
- Questionnaire Builder (structure exists; no response capture, conditional logic orphaned)
- Evidence Repository (UI exists; shares Document entity, no question mapping)
- Findings (4 of 5Cs present; no CAPA entity)
- Three Lines Model (page exists; mappings are cosmetic)
- Self Assessment (route registered but ROUTES['self-assessment'] is undefined — broken)
- CAPA Board (nav item exists; no ROUTES['capa'] renderer — broken)
- Vendor Scorecard (nav item exists but no ROUTES renderer — broken)
- Competency Matrix (nav item exists but no data or renderer)

### Mock-Only / Placeholder (MOCK)
- Framework Taxonomy (static data, no linkage to audits)
- Framework Version Diff (static diffs, no linkage to audit impact)
- Sampling Engine (calculator works; methodology table is static)
- Regulatory Changes (static tracking, no alert linkage)
- Maturity Model (static domains, no assessment flow)
- Audit Programs (data structure exists but minimal)
- Working Papers (UI skeleton, limited data)
- Management Response (exists but not linked to CAPA workflow)

### Missing (NOT PRESENT)
- Response capture for questionnaire answers
- Evidence-to-Question mapping
- CAPA as separate entity with lifecycle
- Business Unit hierarchy
- Process entity for RCSA
- Policy lifecycle + attestation tracking
- Vendor risk tiering
- Contract lifecycle management
- Training/competency tracking
- Offline evidence capture (only queue stub, no camera/GPS)
- Real SSO (UI toggle only)
- Audit trail (mock data only, no schema backing)
- Continuous monitoring (static dashboard, no real connectors)
- Reporting engine (static charts, no PDF/Excel export)
- Role-based dashboard views (all roles see same dashboard)
