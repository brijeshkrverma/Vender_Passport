# Vendor Passport — Data Model Gap Analysis

## Overall Data Score: 35 / 100

### Critical Gaps (P1)

| ID | Issue | Impact |
|----|-------|--------|
| D-01 | No Response entity. Cannot capture questionnaire answers. | Entire audit fieldwork phase non-functional |
| D-02 | No Evidence-to-Question mapping. Documents only link to audits, not questions. | Cannot prove which document satisfies which control |
| D-03 | No CAPA entity. CAPA lifecycle embedded as inline finding fields. | Cannot track CAPA independently (aging, approval, evidence) |
| D-04 | All 6 Mongoose models lack createdAt/updatedAt timestamps. | No auditability in an audit platform — compliance failure |
| D-05 | All models use `strict:false` — essentially schemaless. | No data quality enforcement; any field can be added |

### Entity Relationship Gaps (P2-P3)

| Missing Entity | Why Needed |
|---------------|-----------|
| Business Unit | Department-level risk aggregation, hierarchical compliance |
| Process | RCSA (Risk & Control Self-Assessment), process-level residual risk |
| Requirement | Map single standard clause → multiple controls; track compliance status |
| Test Procedure | Record HOW controls were tested, not just effectiveness rating |
| Vendor (separate from Org) | Vendor-specific: risk tier, performance score, contract ref |
| Contract | Contract lifecycle, SLA linkage, auto-expiry tracking |
| Policy (separate from Document) | Approval workflow, attestation, exception tracking |
| Training Record | Competency-to-audit assignment suitability |

### Schema Issues (P2)

- Field name mismatch: frontend `org` (name) vs backend `orgId` (ID) on all 6 models
- Field name mismatch: frontend `audit` vs backend `auditId` on findings
- Organization reference uses name string, not ID — `orgById(name)` breaks on rename
- Risk↔Control bidirectional arrays with no join table — denormalized drift guaranteed
- No referential integrity enforcement at any layer (no foreign keys, no population)
- Only AssistantConversation has soft delete (`isArchived`) — other entities can be hard-deleted
- Only Documents have version field — no entity versioning for audit/risk/finding history

### Unbounded Arrays (P3)

- `linkedControls` on Risk, `mappedRisks` on Control — could grow to 50+ entries
- `messages` on AssistantConversation — thousands of messages cause write amplification
- `history` on REFERRAL — grows indefinitely

### What's Good

- ID patterns are consistent (AUD-2026-014, CRT-1001, FND-2026-041)
- All mock data references currently resolve (no broken links in current data)
- Certificate expiry dates are internally consistent with status values
- FRAMEWORK_VERSIONS with version diffs is well-designed (though unlinked to taxonomy)
- AssistantConversation schema is actually well-designed (timestamps, soft delete, enum validation)
