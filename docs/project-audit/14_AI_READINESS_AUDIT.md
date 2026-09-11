# Vendor Passport — AI Readiness Audit

## Overall AI Score: 55 / 100

### Strengths

| Area | Rating | Notes |
|------|--------|-------|
| Architecture | Strong | Clean pipeline: classify → scope → fetch → prompt → call → format |
| Data Scoping | Strong | roleScopes.js + per-domain query builders enforcing orgId in MongoDB queries |
| System Prompt | Strong | Well-crafted prompt with anti-hallucination rules, role context, org scoping |
| Source Citation | Strong | [[ID]] pattern with extractReferencedIds() for clickable reference chips |
| Fallback | Adequate | Claude API failure → structured keyword-based response (though user not notified) |
| Rate Limiting | Adequate | In-memory 20/min per user (needs Redis for production) |
| Conversation Persistence | Good | Mongoose schema with userId/orgId ownership, timestamps, archive support |
| Conversation History | Good | Last 10 turns passed to Claude for context continuity |

### Human Approval Layer

The `AI_DRAFTS` array and `ROUTES['ai-drafts']` page have been added for pending AI content review (finding drafts, suggestions). Status: `pending_review` → Approve/Reject/Discard. However, the approve flow doesn't yet write approved content into the actual data model — it's UI-level only.

### AI Governance Gaps (P2-P3)

| ID | Issue |
|----|-------|
| AI-01 | No confidence scoring on AI responses |
| AI-02 | No RAG (Retrieval-Augmented Generation) — Claude gets raw JSON context, no vector search |
| AI-03 | No prompt versioning or A/B testing infrastructure |
| AI-04 | No token usage monitoring or cost tracking |
| AI-05 | Claude fallback generates answers without marking them as "AI unavailable — canned response" |
| AI-06 | No rate-limiting on AI drafts — a user could flood AI_DRAFTS with suggestions |
| AI-07 | System prompt exposes internal architecture ("You are answering a Compliance Manager at...") — minimal risk but verbose |
| AI-08 | No PII/anonymization layer before sending data to Claude |
| AI-09 | No retrieval pipeline for unstructured documents (PDFs, policies) — `retrieveDocs()` is a stub |
| AI-10 | No defense against prompt injection in user messages |

### Claude Integration (How To Complete)

The stub at `askClaude()` (assistantService.js:341-372) is production-ready except for the API key check. To activate:
1. Set `ANTHROPIC_API_KEY` in `.env`
2. Remove the try/catch or handle the fallback more gracefully
3. Add prompt injection defense (strip `{{ }}`, `[[ ]]`, `system:` patterns from user messages)
4. Add response time monitoring

### AI Readiness for Enterprise Audit

For enterprise GRC, AI must:
- [x] Never make compliance decisions without human review
- [x] Cite sources ([[ID]] reference system)
- [ ] Show confidence level for each response
- [ ] Log all AI interactions with audit trail
- [ ] Support model fallback / graceful degradation
- [ ] Strip PII from context before sending to LLM
- [ ] Defend against adversarial prompts
- [ ] Track costs per organization
