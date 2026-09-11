# Vendor Passport — Testing Gap Analysis

## Overall Testing Score: 5 / 100

### What Exists

**Nothing.** The project has zero tests across the entire codebase:
- 0 unit tests
- 0 integration tests
- 0 API/E2E tests
- 0 security tests
- 0 regression tests
- No testing framework configured (no jest, mocha, vitest in package.json)
- No test scripts in package.json
- No CI/CD pipeline

### Minimum Test Coverage Required for MVP

| Module | Tests Needed | Priority |
|--------|-------------|----------|
| `esc()` | Unit: special chars, empty string, null, HTML entities | P0 |
| `statusBadge()` | Unit: all 30+ status mappings | P1 |
| `classifyAssistantIntent()` | Unit: all 7 domains, edge cases | P1 |
| `classifyIntent()` (frontend) | Unit: keyword matching for all domains | P1 |
| `generateAssistantResponse()` (frontend) | Integration: per intent, verify [[ID]] output | P1 |
| `getScopedData()` | Integration: per role × per domain — verify result length | P1 |
| `buildAuditQuery()` | Unit: all scope levels | P2 |
| `extractReferencedIds()` | Unit: valid IDs, malformed text, duplicates | P2 |
| `advanceAuditStage()` | Integration: forward only, status derivation, boundary (stage 0, stage 25) | P2 |
| `advanceFinding()` | Integration: status transitions, reopen prohibition | P2 |
| `/api/assistant/query` | E2E: valid request, missing auth, invalid body, rate limit | P1 |
| Login flow | E2E: role selection, navigation | P2 |
| Create Audit modal | E2E: all steps, submit, cancel | P2 |

### Recommended Testing Strategy

```
tests/
  unit/
    helpers.test.js       — esc(), statusBadge(), formatDate()
    intent.test.js        — classifyAssistantIntent()
    queries.test.js       — buildAuditQuery(), buildFindingsQuery()
  integration/
    assistant.test.js     — generateAssistantResponse() with scoped data
    scope.test.js         — getScopedData() per role
    workflow.test.js      — audit lifecycle + finding transitions
  api/
    assistant.test.js     — POST /api/assistant/query
  e2e/
    login.test.js         — Full login → dashboard flow
    audit-flow.test.js    — Create audit → advance stages → close
```

### Tools
- **Unit/Integration:** Vitest (fast, native ESM)
- **API:** Supertest + Vitest
- **E2E:** Playwright (cross-browser, mobile emulation)
- **Coverage:** c8 / Istanbul (target: 70%+ for critical paths)
