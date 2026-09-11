# Vendor Passport — Audit Domain Gap Analysis

## Overall Domain Score: 45 / 100

### The 20-Node Chain Analysis

| # | Node | Status | Notes |
|---|------|--------|-------|
| 1 | Organization | PRESENT | Flat model, no Business Unit hierarchy |
| 2 | Business Unit | MISSING | Audit scoping limited to org-level |
| 3 | Process | MISSING | Controls/risks not mapped to processes |
| 4 | Risk | PRESENT | Linked to controls but no residual calculation engine |
| 5 | Obligation | MISSING | No regulatory obligation entity |
| 6 | Framework | PARTIAL | Static taxonomy, no linkage to audits |
| 7 | Framework Version | PARTIAL | Version diffs exist but unlinked to taxonomy |
| 8 | Domain/Clause | MISSING | Standard clauses exist as strings on controls |
| 9 | Requirement | MISSING | Controls point to requirements that don't exist as data |
| 10 | Control | PRESENT | Good library but orphaned without requirement parent |
| 11 | Control Objective | MISSING | Conflated with Control — no "what" vs "how" separation |
| 12 | Question | PRESENT | Static questionnaire, no response capture |
| 13 | Audit/Assessment | PRESENT/CONFLATED | Assessment treated as subset of audit, not separate entity |
| 14 | Response | MISSING | Critical gap — cannot answer questions |
| 15 | Evidence | PARTIAL | Documents exist but not mapped to questions |
| 16 | Test Procedure | MISSING | Controls rated without test methodology |
| 17 | Finding | PRESENT | 5C model (3 of 5Cs) + embedded CAPA lifecycle |
| 18 | Risk Rating | PRESENT | Inherent + residual on Risk; severity on Finding |
| 19 | CAPA | MISSING | Embedded in Finding, not independent |
| 20 | Verification → Closure | PARTIAL | Stage advancement exists but status machine incomplete |

### Classification Issues

**Audit vs Assessment (P2):** Both use the same Audit data structure. Self-Assessment route is broken (ROUTES['self-assessment'] undefined). No distinction between assurance engagement vs evaluation activity. ISO 19011 and IIA standards require formal differentiation.

**Framework Taxonomy (P2):** Standards, Frameworks, Regulations, Reporting Requirements, and Professional Standards are all modeled as the same flat structure. A Regulation needs jurisdiction/penalty, a Standard needs version history/certification body. These structural differences cannot be captured in the current flat model.

**BRSR/BRSR Core (P3):** Correctly categorized under "Reporting" but modeled identically to ISO standards. BRSR data (ESG_DATA, app.js:2776) is structured separately but not linked to the framework taxonomy or audit workflow.

**Party Classification (P3):** First/second/third party added as a string field on audits. No workflow differentiation — a second-party vendor audit has the same lifecycle steps as a third-party certification audit.
