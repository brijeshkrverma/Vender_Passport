# Vendor Passport — Documentation Audit

## Overall Documentation Score: 15 / 100

### What Exists

| Document | Status | Accuracy |
|----------|--------|----------|
| README | NOT FOUND | No README.md in project |
| Blueprint (global-audit-grc-blueprint.html) | External HTML file | Describes ideal architecture, not current implementation |
| API_ENDPOINTS (in app.js) | Mock documentation | 9 endpoints listed but not implemented |
| .env.example | Present | Accurate for current config |
| Code comments | Present throughout | Good JSDoc on backend service; sparse on frontend |
| Inline console messages | `npm start` logs | Startup message only |
| Backend README | NOT FOUND | No documentation for developer setup |
| Architecture diagram | NOT FOUND | No visual architecture documentation |

### Documentation Drift

| Claim (Blueprint) | Reality (Code) |
|-------------------|---------------|
| "Multi-tenant SaaS" | Mock auth, all data in-memory |
| "26-step workflow" | Implemented but with mock data only |
| "Dynamic Questionnaire Engine" | Static template, no response capture |
| "Evidence Intelligence" | Documents exist but no question mapping |
| "Risk-Based Audit Planning" | UI exists but no automated engine |
| "AI Copilot with Human Approval" | AI chat exists; approval layer is UI-only |
| "Continuous Controls Monitoring" | Static dashboard, no real connectors |
| "Global Framework Mapping" | Static taxonomy, no linkage to audits |
| "REST API with Webhooks" | 5 endpoints total; webhooks are mock data |

### Missing Documentation

1. Developer onboarding guide (how to run, dependencies, MongoDB setup)
2. API reference (real, not mock)
3. Database schema documentation
4. Deployment guide (production configuration)
5. Security policy / responsible disclosure
6. Contributing guidelines
7. Changelog
8. Architecture decision records (ADRs)
