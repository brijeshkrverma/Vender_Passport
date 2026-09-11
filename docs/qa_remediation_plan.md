# Vendor Passport — QA Remediation & Execution Plan

> **Source document:** `docs/project_status_and_qa_guide.html` (05 Aug 2026, live-verified report)
> **Plan created:** 05 Aug 2026
> **Goal:** Fix the 5 Critical (P0) + key High (P1) issues so the project becomes "honest demo-ready", then track the remaining roadmap (Sprint 1–5).

---

## Sprint 0 — "Stop the Bleeding" (execute now, ~14 hrs)

High-ROI fixes that take the project from "docs are lying" to "honest demo-ready". **No new features before this.**

| # | Task | Ref | Issue | Est. | Status |
|---|------|-----|-------|------|--------|
| SP0-1 | Notification seed fix — use real user `_id`s | R35 | I-06 | 3h | ✅ Done — verified: Priya gets 2 notifications |
| SP0-2 | Wire `connectRedis()` at server startup + graceful logout | R29 | I-02 | 2h | ✅ Done — verified: logout → 200 |
| SP0-3 | Finding reopen flow — add `'Reopened' → 'In Progress'` | — | I-08 | 0.5h | ✅ Done — verified: Reopened → In Progress |
| SP0-4 | Global rate limiting — login 5/15min, global 100/min | R31 | I-05 | 3h | ✅ Done — verified: 6th bad login → 429 |
| SP0-5 | Vendors seed — add vendor records | — | I-09 | 2h | ✅ Done — verified: 8 vendors |
| SP0-6 | AI assistant graceful error handling (until R30 lands) | — | I-01 (partial) | 3h | ✅ Done — UI showed friendly beta error; superseded by S2-2 (R30 landed, real 200 responses) |

**Exit check:** reseed + restart server, verify: notifications return records, logout → 200, reopened finding advances, login throttles after 5 bad attempts, vendors list non-empty, assistant returns a clean error (no 500 stack trace).

---

## Sprint 1 — Trust & Truth (Week 1, ~45 hrs)

| # | Task | Ref | Issue | Est. |
|---|------|-----|-------|------|
| S1-1 | ✅ Done — E2E assertions strengthened: removed conditional `isVisible` guards & `.catch(()=>false)`; suites 03/05/06/07/08 rewritten to assert real behavior; new 09/10 added | R42 | I-10 | 10h |
| S1-2 | ✅ Done — deleted divergent `frontend-react/tests/` + its `playwright.config.js`; single canonical suite in `tests/e2e` | R44 | I-13 | 6h |
| S1-3 | ✅ Done — Firefox + WebKit E2E green (root cause: Helmet CSP `upgrade-insecure-requests` on HTTP → WebKit SSL errors; fixed via `upgradeInsecureRequests: null` + `useDefaults` verified). 3-browser CI matrix added. FF flake hardened (fonts link removed, `commit`-wait login, retries) | R43 | I-12 | 8h |
| S1-4 | ✅ Done — `server.js` wired to `env.js` (zod-validated, fail-fast); removed `'dev-secret'` fallback; `.env` `CORS_ORIGIN` fixed to 5173 (I-24) | R47+R48 | I-04 | 7h |
| S1-5 | ✅ Done — docs honest: `docs/API.md` rewritten to real surface (assistant 500 status marked; no fake auth/response claims), false T06 ✅ corrected (rate limiting IS live — 429 verified), external-user credential fixed `jwhitfield@securecore.com` (I-15) | — | I-15, I-23 | 6h |
| S1-6 | ✅ Done — `requestLogger` (winston, logs method/originalUrl/status/duration/ip) wired into `server.js` | R49 | I-31 | 4h |
| S1-7 | ✅ Done — StubPage now shows honest "In Development" badge, no fake "Backend API Ready ✓" | — | I-14 | 2h |

---

## Sprint 2–3 — Core Gaps (Week 2–3, ~90 hrs)

| # | Task | Ref | Issue | Est. |
|---|------|-----|-------|------|
| S2-1 | ✅ Done — File upload with multer: new `backend/shared/upload.js` (disk storage to `uploads/`, 25MB limit, extension whitelist); `POST /api/evidence/upload` + `POST /api/documents/upload` (multipart, auto-fill `name`/`version`, `uploadedBy` from token, tenant isolation via `tenantIsolation`); `GET /api/:module/:id/download` org-scoped (cross-org 404, no-token 401, live-verified); DB `filePath`/`fileSize`/`mimeType` populated; delete row also deletes file on disk; MulterError → 400 `UPLOAD_ERROR`; frontend upload modals on Evidence + Documents pages with download buttons. Unit 26/26; E2E `11-upload.spec.js` 4/4 (upload→list→download→delete, tenant-scoped download, bad type 400); full chromium 228/228 PASS | R25 | I-11 | 14h |
| S2-2 | ✅ Done — AI assistant pipeline: created `backend/assistantService.js` (intent classification + org-scoped data fetch + HTML answer builder, all DB values escaped); `/api/assistant/query` now returns 200 with real answers across all 7 intents (live-verified: certificates/findings/general_summary/audits/organizations/documents/risks); multi-turn via `conversationId` (4 msgs persisted), conversations list/get/archive working, RBAC 401, validation 400, `orgId` injection blocked; fixed frontend envelope bug in `AssistantPanel.jsx` (`data.data.message`); unit test `tests/unit/helpers.test.js` now imports real `classifyIntent` (20/20 pass); E2E `06-ai-assistant.spec.js` updated to assert real answer — 7/7 green on chromium/firefox/webkit; `docs/API.md` assistant section flipped to working with response shape | R30 | I-01 | 16h |
| S2-3 | ✅ Done — Super Admin role-aware org scoping: services no longer hard-code `{ orgId }`; new `backend/shared/scope.js` (`orgFilter`/`byIdQuery` — empty filter when orgId null) + `req.user.scopeOrgId` (null for Super Admin, `orgId` otherwise) in `auth.js`; migrated every org-scoped module (organizations, certificates, findings, risks, documents, frameworks, requirements, controls, vendors, capa, evidence, comments, reports, audits, questionnaire templates/responses/scoring) to scope-aware filters (incl. getStats/getExpiring/heatmap/advanceStatus paths); assistant pipeline now cross-org for Super Admin; `validate` middleware preserves `orgId` (tenant concern) and `tenantIsolation` injects Super Admin's own orgId on create when none passed. Live-verified: Super Admin sees all 7 orgs + cross-org audits/certs/findings/risks/docs (was 1 org), GET cross-org record OK, create in any org (explicit orgId) + own org (default), report summary + stats cross-org; Compliance Manager (ORG-101) stays scoped and gets 404 on cross-org records; unit tests +6 (scope helpers, 26/26 pass); E2E 06/08 + 02/09/10 chromium 115/115 pass | — | I-07 | 8h |
| S2-4 | Integration tests (supertest + mongodb-memory-server) | R41 | — | 20h |
| S2-5 | Activity / audit log | R33 | — | 8h |
| S2-6 | Real DB-level pagination | — | I-16 | 8h |
| S2-7 | Email dispatch (cert expiry, assignment, overdue) | R27 | — | 10h |
| S2-8 | `tenantIsolation` gaps (notifications, reports, ccm, assessments-root) | R32 | I-20 | 5h |

---

## Sprint 4–5 — Feature Completion (Week 4–5, ~120 hrs)

Build stub pages by value order (not all at once):

- **P1 first (~75h):** R24 My Passport (signature feature!), R01 Audit Program, R03 Traceability Chain, R06 Self Assessment, R07 Scoring Engine, R02 Management Response, R04 Issue Escalation, R09 Audit Trail.
- **P2 (~60h):** Exceptions & Waivers (R05), Sampling Engine (R08), Org Hierarchy/Compare (R12/R13), Doc Versions (R16), Document Exchange (R17), ESG & BRSR (R19), Risk Scheduler (R20), SLA Dashboard (R21), Webhooks (R23), Permission Matrix (R10), Role Dashboard (R11).
- **P3 (~32h):** Three Lines (R14), Competency (R15), Framework Diff (R18), Audit Cost (R22).
- **Alongside:** real-time notifications (R26), scheduled reports + PDF (R28), mobile polish (R39), modal focus trap (R40), a11y tests (R46), loading skeletons (R38).

---

## Production Readiness Backlog

| # | Task | Ref | Est. |
|---|------|-----|------|
| PR-1 | Secrets management (vault / secret manager, remove committed `.env`) | R47 | 4h |
| PR-2 | Env config validation wired to server | R48 | 3h |
| PR-3 | Request logging (morgan + winston) | R49 | 4h |
| PR-4 | Prod deployment config (health probes, graceful shutdown) | R50 | 10h |
| PR-5 | DB migrations + backup (never run seed in prod) | R51 | 12h |
| PR-6 | Security penetration test | R52 | 16h |
| PR-7 | Load / performance testing (k6/Artillery) | R53 | 11h |

---

## Tracked Issues (for reference)

- **P0 (5 → 0 open):** ~~I-01 AI assistant dead~~ → **RESOLVED S2-2 (R30)** · ~~I-02 logout 500~~ → **RESOLVED (R29, Redis wired, logout 200)** · ~~I-03 demo mode broken~~ → **RESOLVED (S2-5, silent demo fallback removed, login page backend banner + honest error)** · ~~I-04 weak JWT secret~~ → **RESOLVED (S1-4, env.js hard-fail)** · ~~I-05 no login rate limit~~ → **RESOLVED S1-1 (R31)**
- **P1 (9 → 2 open):** ~~I-06 notifications empty~~ → **RESOLVED (R35)** · ~~I-07 Super Admin scoping~~ → **RESOLVED S2-3** · ~~I-08 reopen dead-end~~ → **RESOLVED (Sprint 0)** · ~~I-09 vendors empty~~ → **RESOLVED (Sprint 1)** · ~~I-10 weak E2E~~ → **RESOLVED (S1-1, R42)** · ~~I-11 no file upload~~ → **RESOLVED (S2-1, R25, 228/228 E2E)** · ~~I-12 FF/WebKit fail~~ → **RESOLVED (S1-3, R43)** · ~~I-13 duplicate E2E suites~~ → **RESOLVED (S1-1, `frontend-react/tests/` deleted)** · I-14 stub lies · I-15 wrong creds doc
- **P2 (10):** I-16 fake pagination · I-17 regex injection · I-18 stale closure · I-19 shortcut hijack · I-20 tenant gaps · I-21 static reports · I-22 orphan files · I-23 stale API.md · I-24 CORS mismatch · I-25 role chips
- **P3 (6):** I-26 sidebar single-open · I-27 loading text · I-28 log files in repo · I-29 mobile sidebar · I-30 errorHandler position · I-31 no request logging

---

## Verification Checklist (run after each Sprint 0 task)

- [x] `npm run seed` → SEEDING COMPLETE with expected counts (incl. **8 vendors**, **4 notifications**)
- [x] `node server.js` boots, `/api/health` → `mode: production`, `mongodb: connected`
- [x] `POST /api/auth/login` → 200 + JWT
- [x] `POST /api/auth/logout` → **200** (was 500 — I-02 fixed)
- [x] `GET /api/notifications` → **2 records** for Compliance Manager (was 0 — I-06 fixed)
- [x] `GET /api/vendors` → **8 records** (was 0 — I-09 fixed)
- [x] Finding reopen → advance works: Closed → Reopened → In Progress (was dead-end — I-08 fixed)
- [x] 6th bad login attempt → **429** (was unlimited — I-05 fixed)
- [x] `POST /api/assistant/query` → 500 (was: R30 pending). **Now RESOLVED in S2-2** — returns 200 with real org-scoped answers across all 7 intents (live-verified), multi-turn + RBAC + validation tested
- [x] `npx vitest run` → **20/20 pass**
- [x] `npm run frontend-build` → **success** (414 KB / 104 KB gzip)
- [x] `npx playwright test tests/e2e/01-auth.spec.js --project=chromium` → **44/44 pass** (test-server wrapper + rate-limit gating work)

## Sprint 1 verification (quick wins batch)

- [x] `node server.js` boots via zod-validated `env.js`; **missing/weak `JWT_SECRET` → hard fail at startup** (no more silent `'dev-secret'`)
- [x] `/api/health` → 200, MongoDB connected (env-driven `MONGO_URI`)
- [x] `POST /api/auth/login` → 200 + JWT signed with `env.JWT_SECRET`
- [x] CORS: `Access-Control-Allow-Origin: http://localhost:5173` (dev Vite origin; browser blocks mismatches) — I-24 fixed
- [x] Request logging: every request logs `method originalUrl {status, duration, ip}` via winston — I-31 fixed
- [x] StubPage: "In Development" badge, "Planned integration" path only, no green "Backend API Ready" — I-14 fixed
- [x] `npx vitest run` → **20/20**; `npm run frontend-build` → success; auth E2E → **44/44**

## Sprint 1 verification (honest E2E batch — S1-1 + S1-2)

- [x] `frontend-react/tests/` (fake `demo-token` suite) + `frontend-react/playwright.config.js` deleted; one canonical suite in `tests/e2e` — I-13 resolved
- [x] `helpers.js`: real `loginAs` (sessionStorage + real API + `waitForURL`), accordion-aware `countSidebarItems`, `openSection`, strict `verifyCannotAccess`; dead `verifyPageLoads`/`verifySidebar` removed — I-10 resolved
- [x] No `expect(true).toBe(true)`, no `.catch(()=>false)` visibility guards, no `.toContainText()` on unreliable selectors left in rewritten suites
- [x] **Product bug found & fixed by honest suite:** `frontend-react/src/components/Toast.jsx` referenced bare `message`/`sub` (undefined) in the render map → any toast crashed the app (ErrorBoundary blank). Now uses `t.message`/`t.sub`
- [x] `npx playwright test --project=chromium` → **224/224 passed** (rewritten 03/05/06/07/08 + new 09/10 + legacy 01/02/04)

## Sprint 1 verification (cross-browser green — S1-3)

- [x] **WebKit root cause fixed:** Helmet v7 default CSP injects `upgrade-insecure-requests` even when custom directives are given (defaults are merged). On plain HTTP, WebKit upgrades subresources to `https://localhost:3000` → SSL connect errors → React never mounted. Fix: `upgradeInsecureRequests: null` in `server.js` CSP. Verified: header no longer contains `upgrade-insecure-requests`; WebKit mounts `/login` (h1 present)
- [x] `npx playwright test --project=webkit` → **224/224 passed**
- [x] **Firefox flakes hardened:** removed CSP-blocked Google Fonts `<link>` from `index.html` (dead weight + blocked request stalling `load`); `loginAs` navigates with `waitUntil: 'commit'` + asserts real form instead of waiting for browser lifecycle events; `retries` bumped (local 1 / CI 2) so transient browser-network flakes self-heal — no false negatives
- [x] `npx playwright test --project=firefox` → **224/224 passed** (221 pass + 3 retried)
- [x] `npx playwright test --project=chromium` → **224/224 passed** (re-confirmed after CSP change)
- [x] CI matrix added: `.github/workflows/ci.yml` runs chromium/firefox/webkit in parallel (matrix), `npx playwright install --with-deps ${{ matrix.browser }}`, per-project E2E with retries

## Sprint 1 verification (honest docs — S1-5)

- [x] `docs/API.md` rewritten to match reality: only real endpoints documented (health, auth, all 21 module route groups with actual verbs), response envelope `{success, data, pagination, meta}` documented, assistant `/query` explicitly marked **500 (R30 pending)** instead of fake 200 response examples
- [x] False T06 ✅ corrected: `docs/project_status_and_qa_guide.html` claimed rate limiting was a "FALSE ✅" (never imported). Reality: `server.js:14+43` mounts `globalLimiter` (100/60s), `auth.routes.js:28` mounts `loginLimiter` (5/15min). Live-verified: 6th request → **429**. Doc now shows T06 DONE, I-05 RESOLVED, SEC-06 PASS, and "0 falsely done"
- [x] Stale credential fixed (I-15): `external@securecore.com` → `jwhitfield@securecore.com` in `docs/manual-testing-guide.md` + `docs/project_guide_hindi.html` (3 occurrences); matches seed + helpers.js
- [x] `npm run frontend-build` → success; E2E full suite green on all 3 browsers

## Sprint 2 verification (file upload — S2-1)

- [x] `backend/shared/upload.js`: multer disk storage → `uploads/` (root), 25 MB cap, extension allowlist (pdf/images/office/csv/txt/md/rtf/log/eml/zip/7z)
- [x] `POST /api/evidence/upload` + `POST /api/documents/upload` → 201; `GET /:id/download` → 200 round-trip (file bytes identical); delete → 204 + file removed from disk (uploads count verified 3 → 2)
- [x] Tenant/RBAC on upload+download: no token → 401, cross-org download → 404, `.exe` upload → 400 `VALIDATION_ERROR`, >25MB → 400 `UPLOAD_ERROR` (MulterError branch)
- [x] Frontend: Evidence + Documents pages get `+ Upload` modals (FormData: file/name/type/version/expiry/status/confidentiality/relatedAuditId) and Download buttons; `formatBytes` helper
- [x] `npx vitest run` → **26/26**; `npm run frontend-build` → SUCCESS; `npx playwright test tests/e2e/11-upload.spec.js --project=chromium` → **4/4**; full chromium → **228/228**

## Sprint 2 verification (honest login — S2-5 / I-03)

- [x] Silent demo-mode fallback **removed** from `AuthContext.jsx`: network error no longer fabricates a `demo-token` session (which always 401'd on every page). Login/register now return a clear error
- [x] Login page shows a **"Server is unreachable"** banner when `GET /api/health` fails (backend-down visible before sign-in)
- [x] Live-verified (Playwright, backend stopped): banner visible, submit shows "Cannot reach the server", **no** redirect to `/dashboard`; backend up: no banner, normal login + redirect intact
- [x] Regression tests added to `tests/e2e/01-auth.spec.js` (route-abort simulates backend-down): 2 new tests → **46/46 pass**; full chromium → **230/230 PASS**

## Sprint 2 verification (assessment-report hardening batch — 07 Aug 2026)

The 5 verified findings from `docs/project_assessment_report.html` (all fixed + live-verified):

1. **nextStatus() lifecycle bug (Critical)** — `audit.service.js` `nextStatus()` returned `'In Progress'` (not in the `LIFECYCLE` enum) at stage 5. Now clamps: `LIFECYCLE[Math.min(stageIdx, LIFECYCLE.length - 1)]`. Verified: stage5 → Execution, stage11 → Closed, stage0 → Planning.
2. **Register privilege escalation (Critical)** — public `/api/auth/register` accepted `role: z.string()` + client `orgId`, so anyone could self-assign `Super Admin`. Now: `role` is `z.enum(SELF_SIGNUP_ROLES)` from `shared/roles.js` (Super Admin never self-assignable); `orgId` removed from schema; `validation.js` only preserves orgId when the schema declares it; `auth.service.resolveOrg()` resolves/creates the org server-side by name. Live-verified: `role: "Super Admin"` → 400 allow-list error; valid signup → 201 with server-generated orgId.
3. **No audit trail + hard deletes (Critical)** — added `backend/modules/auditlogs/` (append-only `AuditLog` model with pre-hooks blocking all update/delete paths, service, admin-only routes mounted at `/api/auditlogs`); `shared/audit.js` (best-effort `recordAudit`/`recordAuditFromReq`); `shared/auditTrail.js` router middleware (pre-existing) now functional and mounted on every mutating router (added to notifications, requirements, settings, users, templates, responses); `shared/softDelete.js` plugin applied to all models + `scope.js` filters `deletedAt: null`; every `findOneAndDelete` replaced with `.softDelete()` (incl. notifications). Live-verified: DELETE → 204, GET → 404, DB row still present with `deletedAt`; auditlog shows create+delete entries with actor.
4. **Evidence self-verification (High)** — `PATCH /:id/verify` restricted to reviewers (`Super Admin, Organization Admin, Compliance Manager, Audit Manager, Reviewer`); `verifyEvidence` uses `req.user.userId` (was broken `req.user.sub`); `shared/verificationPolicy.js` enforces segregation of duties (uploader ≠ verifier); leftover `req.user.sub` fallback removed from `createLink`.
5. **Frontend bugs (High)** — `AuditDetail.jsx` Advance/Back now sends `authHeaders` (was 401-silent); `CreateAudit.jsx` checks `res.ok` and surfaces errors (was closing modal on failure); `AuthContext.jsx` register `data` TDZ bug fixed (referenced before declaration).

Verification after this batch: **`npx vitest run` → 8 files / 144 tests PASS** (incl. `soft-delete`, `audit-trail`, `segregation-of-duties`, `auth-hardening`, `audit-lifecycle`, `rbac` suites); `npm run frontend-build` → success; live server boot + `/api/health` 200; register admin-role attempt rejected; soft-delete + audit-log round-trip confirmed against real MongoDB.


