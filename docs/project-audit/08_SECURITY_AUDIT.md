# Vendor Passport — Security Audit

## Overall Security Score: 28 / 100

### P0 - Blocker (6 issues)

| ID | Issue | File:Line |
|----|-------|-----------|
| S-P0-01 | Auth is mock only — header-based spoofable role | server.js:28-47 |
| S-P0-02 | Reflected XSS in global search — unescaped `q` in innerHTML | app.js:2373 |
| S-P0-03 | XSS via toast — unescaped `msg`/`sub` in innerHTML | app.js:458 |
| S-P0-04 | XSS via file.name in upload status | app.js:1590 |
| S-P0-05 | XSS via bulk CSV company names | app.js:1798 |
| S-P0-06 | esc() used in only 2 of 37 innerHTML injection sites | Global |

### P1 - Critical (10 issues)

| ID | Issue | File:Line |
|----|-------|-----------|
| S-P1-01 | Login has no actual auth — hardcoded password, no JWT | app.js:597-603 |
| S-P1-02 | No password hashing (bcrypt/argon2) anywhere | N/A |
| S-P1-03 | No token expiration or refresh mechanism | N/A |
| S-P1-04 | Helmet CSP explicitly disabled | server.js:19 |
| S-P1-05 | CORS defaults to wildcard `*` | server.js:20 |
| S-P1-06 | express-rate-limit not imported despite being in package.json | server.js |
| S-P1-07 | No CSRF protection on POST endpoints | server.js |
| S-P1-08 | Auth middleware only applied to /api/assistant, not all routes | server.js:50 |
| S-P1-09 | Assistant chat renders LLM text in innerHTML without esc() | app.js:5054 |
| S-P1-10 | API keys embedded in client-side JavaScript (mock data) | app.js:313-316 |

### P2 - High (16 issues)

| ID | Issue | File:Line |
|----|-------|-----------|
| S-P2-01 | User data (names, emails, roles) in plain JS visible via DevTools | app.js:267-276 |
| S-P2-02 | Notification rendering in panel — innerHTML without esc() | app.js:1900 |
| S-P2-03 | All Mongoose models use strict:false — no schema enforcement | models/*.js |
| S-P2-04 | MongoDB error swallowed — starts in "demo mode" silently | server.js:84-88 |
| S-P2-05 | No error IDs/correlation IDs in API error responses | server.js:149-155 |
| S-P2-06 | Claude API fallback produces responses without user notification | assistantService.js:362 |
| S-P2-07 | sw.js caches all matched resources; stale responses possible | sw.js:25-41 |
| S-P2-08 | No file upload validation (type, size, MIME) server-side | N/A |
| S-P2-09 | express.static serves entire __dirname — could expose .env | server.js:58 |
| S-P2-10 | No idempotency on POST endpoints | assistant.js:68 |
| S-P2-11 | In-memory rate limiter lost on restart (no Redis) | assistant.js:16-46 |
| S-P2-12 | conversationId not validated for type/length | assistant.js:52-65 |
| S-P2-13 | Offline queue in localStorage — accessible to any same-origin JS | app.js:374 |
| S-P2-14 | No security.txt or vulnerability disclosure policy | N/A |
| S-P2-15 | No CSP nonce/hash for inline scripts | index.html |
| S-P2-16 | Referral link hardcoded to production domain | app.js:279 |
