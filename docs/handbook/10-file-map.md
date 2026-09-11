« [Chapter 9 — Architecture](09-architecture.md) | **Chapter 10** | [Chapter 11 — Ab Aage Kya →](11-what-next.md)

---

# Chapter 10 — File ka Naksha

> **Time:** 30 min
> **Lakshya:** Har folder ke saamne teen me se ek label — **🟢 zinda / 🟡 adhura / 🔴 murda**.

**Yeh chapter aap baar-baar khologe.** Isko bookmark kar lo.

---

## Poora project — ek nazar me

| Folder | Kya hai | Files | Lines | Label |
|---|---|---|---|---|
| [backend/](../../backend/) | Node + Express + MongoDB API | 120 | ~5,500 | 🟢 **Zinda** |
| [frontend-react/](../../frontend-react/) | React + Vite + Tailwind | 129 | ~17,900 | 🟢 **Zinda** |
| [tests/](../../tests/) | Vitest + Playwright | 29 | ~3,850 | 🟡 **Zinda par ek toota** |
| [scripts/](../../scripts/) | seed, sync-indexes, import | 4 | ~500 | 🟢 **Zinda** |
| [docs/](../../docs/) | 25+ purane documents + **yeh handbook** | 30+ | — | 🟡 **Zyadatar purana** |
| [Eco/](../../Eco/) | Purana **Angular** code | 70 | **~20,800** | 🔴 **Murda** |
| [Books/](../../Books/) | Personal-growth tutorial | 3 | ~1 MB | 🔴 **Project ka nahi** |
| [test-results/](../../test-results/) | E2E failure videos/screenshots | 80+ | ~25 MB | 🔴 **Kooda** |
| [uploads/](../../uploads/) | Upload ki gayi files | — | — | 🟢 **Zinda** (git me nahi) |

> **⚠️ Sabse chaunkane wali baat:** [Eco/](../../Eco/) akela **~20,800 lines** hai — poore backend se **teen guna bada**. Aur app kahin bhi usko use nahi karta.

---

## 🟢 Backend — zinda hissa

```
backend/
├── config/          🟢 env, database, redis, rateLimit
├── middleware/       🟢 auth, rbac, tenant, validation      ← 4 darwaze
├── shared/           🟢 scope, softDelete, auditTrail, errors, response…
├── scoring/          🟢 loader (ES module bridge) + engines
├── assistantService.js 🟢 AI pipeline (assistant module isko use karta hai)
└── modules/          🟢 23 modules × 4 files
```

### 23 modules — kaunsa kitna bhara hua

| 🟢 Poore (achhe bane) | 🟡 Patle (kaam chalta hai, gehraai kam) |
|---|---|
| auth · users · audits · findings · risks | comments · notifications · settings |
| controls · frameworks · requirements | auditlogs · **ccm** · **reports** |
| certificates · documents · evidence | organizations · capa · vendors |
| **questionnaires** (7 files — sabse bada) · assistant | |

> **📌 "Patla" ka matlab bura nahi.** [report.routes.js](../../backend/modules/reports/report.routes.js) sirf 9 lines hai — kyunki reports me abhi 1-2 hi endpoint hain. Yeh gap hai, bug nahi.

### ⭐ Sabse zaroori 6 files — inhe kabhi mat todna

| File | Kyun zaroori |
|---|---|
| [shared/scope.js](../../backend/shared/scope.js) | 13 lines — **poori multi-tenant suraksha** isi par tiki hai |
| [middleware/auth.js](../../backend/middleware/auth.js) | Token → `req.user` → `scopeOrgId` |
| [middleware/rbac.js](../../backend/middleware/rbac.js) | `restrictTo()` — role wali rok |
| [shared/roles.js](../../backend/shared/roles.js) | 12 roles ka **ek hi** sach |
| [shared/softDelete.js](../../backend/shared/softDelete.js) | Record kabhi mitta nahi |
| [scoring/loader.js](../../backend/scoring/loader.js) | Scoring ki **ek hi copy** ka pul |

---

## 🟢🟡 Frontend

```
frontend-react/src/
├── components/     🟢 24 shared components (Layout, Modal, Toast…)
├── context/        🟢 AuthContext.jsx  ← login + poora permission system
├── hooks/          🟢 useApi, useCrud, usePaginatedApi
├── features/
│   └── questionnaire/  🟢 ~6,000 lines — PROJECT KA DIL
└── pages/          🟡 47 pages — inme se 23 khali stubs
```

### 🔴 47 pages me se 23 KHALI STUBS

Yeh sab [App.jsx](../../frontend-react/src/App.jsx) me `<StubPage title="..." />` hain — click karo to bas naam dikhta hai:

| | | |
|---|---|---|
| Audit Program | Scoring Engine (`q-scoring`) | Sampling Engine |
| Self Assessment | Management Response | Traceability Chain |
| Issue Escalation | Exceptions & Waivers | Framework Version Diff |
| Document Exchange | ESG & BRSR | Risk-Based Scheduler |
| SLA Dashboard | Audit Cost | Org Comparison |
| Org Hierarchy | Three Lines Model | Competency Matrix |
| Doc Versions | Permission Matrix | Role Dashboard |
| Webhooks (`api-integrations`) | My Passport | |

> **🎯 Yahi hai woh "AI ne zyada bana diya" wala hissa.** Features ki list bana di gayi, sidebar me daal di gayi, **implementation nahi hui**.
>
> Achhi baat: [Sidebar.jsx](../../frontend-react/src/components/Sidebar.jsx) me inpar `soon: true` laga hai, to user ko warning to milti hai.
>
> **Chapter 11 me aapko har ek par faisla lena hai: rakho ya hatao.**

### 🔴 2 pages jo kahin use hi nahi hote

| File | Haalat |
|---|---|
| [pages/AuditComments.jsx](../../frontend-react/src/pages/AuditComments.jsx) | Koi import nahi, koi route nahi — **murda** |
| [pages/ExportCSV.jsx](../../frontend-react/src/pages/ExportCSV.jsx) | Koi import nahi, koi route nahi — **murda** |

> **⚠️ [pages/CreateAudit.jsx](../../frontend-react/src/pages/CreateAudit.jsx) is list me NAHI hai.**
> Uska koi route nahi hai, isliye pehli nazar me murda lagta hai — **par woh zinda hai.** [Topbar.jsx:6](../../frontend-react/src/components/Topbar.jsx) usko import karke **modal** ki tarah dikhata hai.
>
> **Seekh: "route nahi hai" ka matlab "use nahi hota" nahi hai.** Delete karne se pehle hamesha import search karo:
> ```powershell
> Select-String -Path (Get-ChildItem frontend-react\src -Recurse -Include *.jsx).FullName -Pattern "CreateAudit"
> ```

---

## 🔴 Murda / gair-zaroori hissa

### 1. [Eco/](../../Eco/) — ~20,800 lines Angular

```
Eco/
├── Questionnaire/   43 files, 15,339 lines  — Angular components (.ts)
├── scoring/          8 files,  1,972 lines  — scoring ki PURANI copy
└── scripts/         19 files,  3,469 lines  — migration/diagnostic scripts
```

**App isko bilkul use nahi karta.** Maine poore `server.js`, `backend/`, `frontend-react/src/`, `tests/` me `Eco` dhundha — **ek bhi import nahi**.

> **⚠️ Delete karne se pehle:**
> - [Eco/scoring/](../../Eco/scoring/) me scoring ki **purani copy** hai (`grid-formula.js`, `rule-engines.js`, `trend-rule.js`). Nayi copy [frontend-react/.../services/](../../frontend-react/src/features/questionnaire/services/) me hai. Purani sirf **reference** ke liye hai.
> - [scripts/import-eco-questions.js](../../scripts/import-eco-questions.js) naam se lagta hai ki isko chahiye — **par nahi**. Woh ek JSON file argument me leta hai, `Eco/` folder ka code nahi.
>
> **Salaah:** delete mat karo — **zip banakar project ke bahar rakh do**. Kal ko kisi purane behaviour ka reference chahiye ho sakta hai.

### 2. [Books/](../../Books/) — project se koi rishta nahi

`personal-growth-master-tutorial.html` (988 KB) + 2 markdown. Galti se aa gaya. **Bahar nikal do.**

### 3. [test-results/](../../test-results/) — ~25 MB kooda

Playwright ke fail hue tests ki videos, screenshots, trace files. Yeh **hamesha** `.gitignore` me hone chahiye.

> **💡 Par ek kaam ki baat:** yeh batate hain ki **E2E tests fail ho rahe the** — auth, RBAC, aur per-role content wale. Chapter 11 me inhe chalana hai.

### 4. [shared/esc.js](../../shared/esc.js) — root wala purana folder

16 lines, HTML escape karne ke liye. **Sirf ek test file** ise use karti hai, asli code nahi. Purane vanilla-JS zamane ki nishani.

---

## 🟡 Tests

```
tests/
├── unit/   17 files, 2,824 lines  → 389 tests ✅ PASS
└── e2e/    12 files, 1,028 lines  → Playwright ❌ fail ho rahe the
```

### 🔴 Ek test file kabhi chalti hi nahi

[tests/unit/rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) — **68 lines, syntax error, adhuri.**

Line 50 ke aas-paas `MODULES` array **band hi nahi hota**:
```js
const MODULES = [
  ['capa', 'capa.routes.js'],
  ...
  ['controls', 'control.routes.js'],

                          ← yahan `];` hona chahiye tha. Nahi hai.

describe('frontend nav permissions mirror backend RBAC', () => {
```

**▶️ Khud dekho:**
```powershell
npm test
```
**👀 Milega:** `Test Files  1 failed | 16 passed (17)` aur `rbac-parity.test.js (0 test)`

> **🎯 Yeh project ka sabse mahenga toota hua tukda hai.**
>
> 389 test pass ho rahe hain — dikhne me sab hara. Par yeh **ek** file jo permission lists ko milati thi, chal hi nahi rahi. **Aur usi wajah se Act 5 wala 403 bug zinda hai.**

### 🟢 Baaki tests achhe hain

`auth-hardening` (36), `mark-engines` (50), `questionnaire-authoring` (38), `soft-delete` (37), `helpers` (28), `questionnaire-responses` (28), `grid-formula` (26), `rbac` (24)…

> **💡 Yeh tests documentation se behtar hain** — inhe padho to pata chalta hai system ko **kya karna chahiye**. Aur woh kabhi purana nahi hota, kyunki galat hone par test fail ho jaata hai.

---

## 🟡 Docs — 25+ purani files

[docs/](../../docs/) me pehle se bahut kuch hai: 18 audit reports, gap analysis, implementation plans, role-based docs.

**Zyadatar purana hai.** Sabse bada saboot: [README.md](../../README.md) aaj bhi likhta hai —

> *"Frontend: Vanilla JS, HTML5, CSS Custom Props"* aur `models/` folder ka structure

**Dono galat hain.** Frontend React hai, aur `models/` folder maujood hi nahi. **README ek aise project ka varnan karta hai jo ab exist nahi karta.**

---

## 📌 Ek page ka cheat sheet

```
Kuch dhundhna ho to:

  Ek API kaise kaam karti hai?    → backend/modules/<naam>/*.routes.js
  Business rule kahan hai?         → backend/modules/<naam>/*.service.js
  Company wali suraksha?           → backend/shared/scope.js
  Kaun kya dekh sakta hai?         → frontend-react/src/context/AuthContext.jsx
  Kaunsa page kis URL par?         → frontend-react/src/App.jsx
  Menu me kya hai?                 → frontend-react/src/components/Sidebar.jsx
  Scoring kaise chalti hai?        → backend/modules/questionnaires/scoring.service.js
  Scoring ka asli code?            → frontend-react/src/features/questionnaire/services/
  Demo data / logins?              → scripts/seed.js
  System ko karna kya chahiye?     → tests/unit/
```

---

## ✅ Checkpoint — Chapter 10

**1. Project ka sabse bada folder kaunsa hai, aur woh zinda hai?**

<details><summary>Jawab</summary>

[Eco/](../../Eco/) — ~20,800 lines (backend se 3 guna bada). **Murda hai** — app kahin bhi import nahi karta. Yeh purana Angular version hai.
</details>

**2. Kisi file ko delete karne se pehle kya check karna zaroori hai — aur kis udaharan ne yeh sikhaya?**

<details><summary>Jawab</summary>

**Import search karo**, sirf route list mat dekho.
[CreateAudit.jsx](../../frontend-react/src/pages/CreateAudit.jsx) ka koi route nahi hai — par [Topbar.jsx](../../frontend-react/src/components/Topbar.jsx) usko modal ki tarah import karta hai. Route na hone ka matlab murda hona nahi.
</details>

**3. 389 tests pass ho rahe hain. To test coverage achhi hai?**

<details><summary>Jawab</summary>

**Zaroori nahi.** Ek poori file — [rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) — syntax error ki wajah se **kabhi chalti hi nahi**, aur usi wajah se Act 5 wala 403 bug zinda hai. Chalte hue tests achhe hain; **na chalne wala test sabse khatarnaak hai** — woh suraksha ka jhootha ehsaas deta hai.
</details>

**4. README bharosemand hai?**

<details><summary>Jawab</summary>

**Nahi.** Woh "Vanilla JS" frontend aur ek `models/` folder ka zikr karta hai — dono galat. Project React par hai aur `models/` folder hai hi nahi.
</details>

---

**➡️ Aakhri: [Chapter 11 — Ab Aage Kya](11-what-next.md)**
