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
6. **List, create and update must return the same shape.** `/api/users` once returned raw
   documents (`_id`) from `list()` while `create()`/`update()` returned `toSafeObject()` (`id`),
   so every row rendered from the list called `/api/users/undefined`, and the "is this me?"
   check that hides your own delete button never matched. When a model has a safe-object
   projection, every endpoint that returns it uses it.
7. **The audit lifecycle has one definition.** `backend/modules/audits/lifecycle.js` — the model
   enum, the stage machine and the assistant all read it. `stageIdx` is an index into that array,
   so reordering it is a migration, not an edit. The two browser copies
   (`AuditDetail.jsx`, `Audits.jsx`) cannot import CommonJS and are held in step by
   `tests/unit/audit-lifecycle.test.js`.
8. **An applicant never reads `/api/questionnaires`.** That router serves the authoring
   document — `scoringRule`, every option's marks, the assessor's guidance. Answering reads
   `GET /api/questionnaire-submissions/:id/questions`, which is scoped by the submission (so
   `assertMayAct` applies) and projected through `forRespondent()` in `submission.service.js`.
   Adding a field to a question? Decide whether it belongs in that projection.
9. **Whoever produces a record does not attest to it.** Evidence uploader ≠ verifier
   (`shared/verificationPolicy.js`), nobody staffs themselves onto an audit
   (`audit.service.js`), and the assessor of a submission cannot approve it
   (`submission.service.js` → `approve()`). New sign-off steps follow the same shape.
10. **Scoring logic has exactly one copy.** It lives in the frontend ES modules under
   `features/questionnaire/services/` and the CommonJS backend loads it via
   `await import()` (`backend/scoring/loader.js`). Never port or duplicate it: the author's
   preview and the vendor's real score must come from the same code.

---

## Permissions — two lists that must agree

- `frontend-react/src/context/AuthContext.jsx` → `API_MODULE_ROLES` (what the server accepts)
  and `ROLE_ROUTES` (what is useful per role). Nav visibility is their **intersection**.
- `NAV_ITEM_MODULE` must name **the module the page actually fetches**, not the section it
  appears under. Three separate 403-on-click bugs came from getting this wrong
  (CA/Consultant → CAPA, the applicant's questionnaire, Audit Universe → `/api/organizations`).
  A page that reads two modules is gated on only one — check the fetches, not the menu group.
- `backend/modules/*/*.routes.js` → `restrictTo(...)` — the real enforcement.

`tests/unit/rbac-parity.test.js` exists to keep them in sync.

**Lockout guards on `/api/users`** (`user.service.js`) — an organization must always keep someone
who can administer it, so the service refuses to: change your own role, deactivate your own
account, delete your own account, or demote/deactivate/delete the last *active* `Super Admin` or
`Organization Admin` of an org. An Organization Admin creating another Organization Admin **is**
allowed and deliberate — it is a lateral grant inside a tenant they already control, and without
it a one-admin org has no way to hand over.

It covers all 19 declared modules, asserts that `ALL` modules really are open to every role,
checks that a router guarding per route (`reports`) leaves no route unguarded, and fails if a
module is added to `API_MODULE_ROLES` without being covered here. **Add new modules to its
`MODULES` list.**

---

## Known broken / incomplete (do not treat as working)

| Issue | Detail |
|---|---|
| 🟠 E2E tests | Were failing (see `test-results/`) — auth, RBAC, per-role content. |
| 🟠 23 stub pages | `<StubPage>` in `App.jsx` — rendered, but empty. Marked `soon: true` in the sidebar. |
| 🟠 Settings toggles do nothing | `twoFactor`, `sessionTimeout`, and the three notification flags are stored and validated but **never read** by any code, and `shared/email.js` is imported by nothing — no mail is ever sent. The UI now renders them disabled with a "Not active yet" note rather than pretending; wiring them up is still open. `auditLog` is locked on, because `auditTrail(...)` is mounted unconditionally on 18 routers. |
| 🤔 Organizations vs Vendors | Both exist and overlap. `Organization` is tenant-scoped by `orgId` (the seed gives each its own, so they behave as tenants) yet its page is titled "orgs in your network"; `Vendor` is a separate model that is the actual supply chain. Which is which is an open **product** decision — do not "fix" it by changing the seed or the scope filter without one. |
| 🟠 Email / scheduling | `nodemailer` and `node-cron` are installed; no job actually runs. |
| 🔴 Dead weight | `Eco/` (~20,800 lines of unused Angular), `Books/` (unrelated), `test-results/` (~25 MB), `shared/esc.js`, `pages/AuditComments.jsx`, `pages/ExportCSV.jsx`. |

**Looks dead but is NOT — do not delete:**
- `frontend-react/src/pages/CreateAudit.jsx` — no route of its own, but `Audits.jsx` mounts it
  as the "+ New Audit" wizard (it takes an optional `onCreated` so the list re-fetches instead
  of navigating). The topbar reaches it by navigating to `/audits?new=1`.
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
