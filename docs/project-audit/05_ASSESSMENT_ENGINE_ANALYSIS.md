# Vendor Passport — Assessment Engine Analysis

## Overall Assessment Score: 22 / 100

### Current State

The platform has a static `QUESTIONNAIRE` object (app.js:111-130) with 3 sections, 9 questions. Question types: Yes/No, Pass/Fail, Rating, Text Response, Date, Number. Questions have tags for `control`, `risk`, `mandatory`, `evidence`.

Recently added: `dependsOn` fields for 3 questions implementing basic conditional logic. `checkConditionalQuestions()` function exists but is never called from any response handler because there IS no response handler.

### What's Present

| Feature | Status |
|---------|--------|
| Question Types | 6 types (of 26 possible) |
| Templates | Single hardcoded template |
| Sections | 3 sections supported |
| Conditional Logic | 3 questions have `dependsOn` — orphaned (no handler calls it) |
| Evidence Required Flag | Boolean per question |
| Mandatory Flag | Boolean per question |
| Risk Tag | String per question |
| Control Mapping | String per question |
| Question Bank | 20 questions across 4 frameworks (app.js:3043-3064) |
| Questionnaire Builder | View/edit page (renderQuestionnaireBody) |
| Auditor Workspace | Question-by-question execution UI |
| Scoring Engine | Weighted scoring (`ROUTES['q-scoring']`) |
| AI Suggest | "Suggest with AI" button on text questions |

### What's Missing

| Feature | Impact |
|---------|--------|
| Response Capture | Cannot answer or store answers — fieldwork is non-functional |
| Branching Logic | Conditional questions designed but inoperable |
| N/A Support | No "Not Applicable" answer type for irrelevant questions |
| Auto-calculation | No computed scores from multi-question formulas |
| Weighting Engine | Static weights, no configurable scheme |
| Template Versioning | No version tracking for questionnaire templates |
| Bulk Answer Import | No CSV/bulk answer entry |
| Evidence Request Workflow | No automated evidence request from flagged questions |
| Question Reuse Across Audits | Templates are per-audit, not reusable |
| Multi-framework Support | Questions tagged to frameworks but template is single-framework |
| Third-Party Access | Vendors cannot fill questionnaires via portal |

### Recommendation

The Assessment Engine is the single biggest gap in the platform. Until Response capture + Evidence mapping exists, the entire audit fieldwork phase is non-functional. This should be the #1 development priority after security hardening:

1. Create `Response` model (questionId, auditId, answer, answeredBy, timestamp)
2. Create `EvidenceLink` model (evidenceId, questionId, findingId, controlId — polymorphic)
3. Connect `checkConditionalQuestions()` to response capture handlers
4. Build questionnaire response UI for auditees
5. Build evidence request workflow (auto-request from flagged questions)
