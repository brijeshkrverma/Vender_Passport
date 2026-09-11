# CLAUDE.md — Vendor Passport

Context for AI assistants working in this repo. **Read this before assuming anything;
[README.md](README.md) is stale and describes a project that no longer exists.**

For a guided walkthrough see [docs/handbook/](docs/handbook/00-START-HERE.md).

---

## What this is

Enterprise **Audit / GRC / Compliance** platform. Two domains that meet in one place:

- **Audit** — a 12-stage engagement lifecycle (Planning → … → Closed)
- **Questionnaire / assessment** — authored questions, applicant answers, rule-driven scoring

The questionnaire + scoring feature (`frontend-react/src/features/questionnaire/`, ~6,000 lines)
is the product's core, not a side feature.

## Stack

| Layer | Actual |
|---|---|
| Backend | Node 20, Express 4, **CommonJS**, MongoDB + Mongoose 8 |
| Frontend | **React 18 + Vite + Tailwind** (NOT vanilla JS) |
| Auth | JWT bearer; Redis optional (token blacklist) |
| Validation | zod, on write routes |
| Tests | Vitest (unit), Playwright (e2e) |

## Running it

```bash
npm run seed      # WIPES the database, then loads demo data
npm run dev       # backend :3000 + vite :5173 concurrently
```

**Open http://localhost:5173, not :3000.** Vite proxies `/api` → `:3000`.
All 13 seeded users share the password `password123` (see `scripts/seed.js`).

---

## Architecture

Every one of the 23 backend modules has the same four files:

```
backend/modules/<name>/
  <name>.routes.js       authenticate → restrictTo → auditTrail → tenantIsolation → validate
  <name>.controller.js   unwrap request, call service, send response — no logic
  <name>.service.js      business logic + DB, always starting from orgFilter(orgId)
  <name>.model.js        mongoose schema + softDelete plugin
```

`backend/modules/risks/` is the cleanest reference (~120 lines total).

Frontend list pages are thin: `usePaginatedApi` + `useCrud` + `EntityFormModal`.

---

## Non-negotiable rules

1. **`orgId` comes from `req.user.scopeOrgId` only** — never from body/query.
   `scopeOrgId` is `null` for Super Admin, which intentionally removes the tenant filter.
2. **Every service query starts with `orgFilter(orgId)`** (`backend/shared/scope.js`).
   It applies both the tenant filter and `deletedAt: null`.
3. **Soft delete only.** `Model.softDelete()`, never `deleteOne()`. This is audit software —
   records are never erased.
4. **Every rule lives in two places:** the UI hides what a role cannot do (convenience),
   the API refuses it (security). A UI-only rule is not a rule.
5. **Literal routes before `/:id`** — otherwise Express matches them as an id.
6. **Scoring logic has exactly one copy.** It lives in the frontend ES modules under
   `features/questionnaire/services/` and the CommonJS backend loads it via
   `await import()` (`backend/scoring/loader.js`). Never port or duplicate it: the author's
   preview and the vendor's real score must come from the same code.

---

## Permissions — two lists that must agree

- `frontend-react/src/context/AuthContext.jsx` → `API_MODULE_ROLES` (what the server accepts)
  and `ROLE_ROUTES` (what is useful per role). Nav visibility is their **intersection**.
- `backend/modules/*/*.routes.js` → `restrictTo(...)` — the real enforcement.

`tests/unit/rbac-parity.test.js` exists to keep them in sync.

> 🔴 **That test is currently broken** — its `MODULES` array is unterminated, so the file has a
> syntax error and never runs. Fixing it is the highest-priority task in the repo.

---

## Known broken / incomplete (do not treat as working)

| Issue | Detail |
|---|---|
| 🔴 **Applicant flow is broken** | `Vendor Manager` and `External Company User` get **403** on `/api/questionnaires`, so the Answer Questionnaire screen loads no questions. They are allowed on `/api/questionnaire-submissions` but not on the questions route (`questionnaire.routes.js:221-224`). |
| 🔴 **`rbac-parity.test.js` never runs** | Syntax error; this is why the bug above shipped. |
| 🟠 E2E tests | Were failing (see `test-results/`) — auth, RBAC, per-role content. |
| 🟠 23 stub pages | `<StubPage>` in `App.jsx` — rendered, but empty. Marked `soon: true` in the sidebar. |
| 🟠 Settings security toggles | `twoFactor`, `sessionTimeout` etc. are stored and validated but **never read** by any code. |
| 🟠 `Approved` submission status | Exists in the model with `adminApprovedAt`, but no endpoint or button sets it. |
| 🟠 Email / scheduling | `nodemailer` and `node-cron` are installed; no job actually runs. |
| 🟠 Duplicated lifecycle list | The 12 audit stages are written in both `audit.service.js` and `AuditDetail.jsx`. |
| 🟠 `AUDITOR_HIDDEN.slice(0, 10)` | Position-dependent nav config in `AuthContext.jsx`; reordering that array silently changes Audit Manager's menu. |
| 🔴 Dead weight | `Eco/` (~20,800 lines of unused Angular), `Books/` (unrelated), `test-results/` (~25 MB), `shared/esc.js`, `pages/AuditComments.jsx`, `pages/ExportCSV.jsx`. |

**Looks dead but is NOT — do not delete:**
- `frontend-react/src/pages/CreateAudit.jsx` — no route, but `Topbar.jsx` mounts it as a modal.
- `backend/assistantService.js` — the AI pipeline; `modules/assistant/assistant.service.js` requires it.

---

## Working here

- Read the comments. This codebase explains **why**, not what, and those comments record real
  incidents (a 403 after a nav click, a button that silently 401'd, a unique index that blocked
  audit-scoped submissions). Do not delete them when editing nearby code.
- `tests/unit/` is the most reliable specification of intended behaviour — more so than any
  document in `docs/`, most of which is outdated.
- Prefer completing an existing module over adding a new page. The project's problem is
  unfinished breadth, not missing features.
