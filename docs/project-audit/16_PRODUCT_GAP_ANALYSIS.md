# Vendor Passport — Product Gap Analysis

## Overall Product Score: 42 / 100

### Differentiators (What makes this product special)

1. **Role-scoped AI Assistant** — Not just a chatbot; data is pre-filtered by role before reaching the LLM. Source citation with clickable [[ID]] chips. Audit-trailed conversations.
2. **Blueprint design system** — Distinctive dark navy "engineering drawing" theme with seal-mark branding. Memorable and professional.
3. **Breadth of vision** — 52 routes covering audit, GRC, ESG, vendor management, AI — broader than most competitors at prototype stage.
4. **Framework version diff** — Unique feature showing what changed between standard versions.
5. **Three Lines Model** — Governance framework integrated into the platform.
6. **Free vendor model** — "Vendors join free" + document exchange is a strong network-effect growth loop.

### Competitive Comparison (Conceptual)

| Capability | Vendor Passport | AuditBoard | Vanta | Drata |
|------------|----------------|------------|-------|-------|
| Audit Management | Prototype | Enterprise | Mid | Mid |
| AI Assistant | Built (read-only) | Emerging | None | None |
| Vendor Passport | Core concept | None | None | None |
| Continuous Monitoring | Dashboard mock | Yes | Yes (core) | Yes (core) |
| Evidence Automation | Manual | Manual | Auto | Auto |
| Framework Coverage | 16 (taxonomy) | 50+ | 5-10 | 5-10 |
| Multi-Tenancy | Stub | Enterprise | SaaS | SaaS |

### Critical Missing Product Features (Enterprise Buyer Checklist)

Enterprise procurement teams typically evaluate:

| Feature | Status | Priority |
|---------|--------|----------|
| SOC 2 / ISO 27001 for the platform itself | MISSING | Must-have for enterprise |
| SSO (SAML/OIDC) | UI toggle only | Must-have for enterprise |
| Role-based dashboards | MISSING | Must-have |
| Audit trail (immutable) | Mock data | Must-have |
| Data export (CSV/PDF) | Partial | High |
| SLA guarantees | MISSING | High |
| Uptime monitoring | MISSING | High |
| Data residency options | MISSING | Medium |
| API rate limits documentation | Mock only | Medium |
| Penetration test report | MISSING | High |
| Business continuity plan | MISSING | Medium |

### Product Positioning Recommendation

Vendor Passport's strongest differentiator is its **vendor-centric compliance model** — the "passport" concept where vendors maintain one verified profile that multiple enterprises reuse. This is currently under-exploited because:

1. No vendor self-service portal (they can't upload/update their own certs)
2. No "shared evidence vault" (vendor uploads once, multiple enterprises view)
3. No vendor risk tiering (same questionnaire for all vendors)
4. The "Passport" in the name isn't reflected in a distinct feature

**Recommendation:** Make the "Passport" concept the core product — a verified vendor identity that includes certifications, compliance status, audit history, and documents. Enterprise customers subscribe to access passport data. Vendors join free. The AI assistant answers questions from this passport data. This aligns the product name, the free-vendor model, and the AI feature into a coherent value proposition.
