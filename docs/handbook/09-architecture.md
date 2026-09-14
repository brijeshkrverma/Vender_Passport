« [Chapter 8 — Baaki Roles](08-support-roles.md) | **Chapter 9** | [Chapter 10 — File Map →](10-file-map.md)

---

# Chapter 9 — Ek Button ka Safar

> **Time:** 45 min
> **Lakshya:** Ek page ka poora code padhkar aap **baaki 22 modules** samajh jaoge.

---

## Sabse pehle: yeh project itna bada kyun *nahi* hai

Aapko dar lagta hai kyunki 300+ files hain. Par sach yeh hai:

> **Backend ke 23 modules me se lagbhag har ek me wahi 4 files hain, wahi shakl me.**
>
> **Ek module samajh liya = 23 samajh liye.**

Poora backend sirf **~5,500 lines** hai, 120 files me. Matlab har file ausatan **45 lines**. Yeh chhoti, saaf files hain — darne wali baat nahi.

---

## Poora naksha — ek nazar me

```
   🖱️ Aapne "Risks" par click kiya
        │
   ┌────▼─────────────────────────────────────────┐
   │  BROWSER  (localhost:5173)                   │
   │  Risks.jsx → usePaginatedApi('/api/risks')   │
   │  fetch('/api/risks', { Authorization: ... }) │
   └────┬─────────────────────────────────────────┘
        │  Vite proxy → localhost:3000
   ┌────▼─────────────────────────────────────────┐
   │  SERVER  (server.js)                         │
   │  helmet → cors → json → logger → rateLimit   │
   └────┬─────────────────────────────────────────┘
        │
   ┌────▼─────────────────────────────────────────┐
   │  risk.routes.js  — 5 DARWAZE                 │
   │   1. authenticate    token sahi?     → 401   │
   │   2. restrictTo      role sahi?      → 403   │
   │   3. auditTrail      likh do kisne kiya      │
   │   4. tenantIsolation apni company?   → 403   │
   │   5. validate(zod)   data sahi?      → 400   │
   └────┬─────────────────────────────────────────┘
        │
   ┌────▼──────────────┐   ┌──────────────────────┐
   │ risk.controller.js│──▶│  risk.service.js     │
   │ (request kholna)  │   │  (asli logic + DB)   │
   └────┬──────────────┘   └──────────┬───────────┘
        │                             │ orgFilter(orgId)
        │                        ┌────▼───────────┐
        │                        │  risk.model.js │
        │                        │  → MongoDB     │
        │                        └────────────────┘
        ▼
   response.paginated(res, items, {...})
        │
        ▼
   🖥️ Table screen par
```

---

## Ab asli code — `risks` module

Yeh module maine jaan-boojh kar chuna: **sabse chhota aur sabse saaf.** Poora module 4 files, ~120 lines.

Aap chahein to abhi kholkar saath-saath padh sakte ho: [backend/modules/risks/](../../backend/modules/risks/)

---

### 📄 File 1 — `risk.routes.js` — "darwaza"

[backend/modules/risks/risk.routes.js](../../backend/modules/risks/risk.routes.js)

```js
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin',
           'Compliance Manager', 'Risk Manager', 'CA / Consultant'));
router.use(auditTrail('Risk'));

router.get('/heatmap', ctrl.heatmap);
router.get('/',        ctrl.list);
router.get('/:id',     ctrl.getById);
router.post('/',       tenantIsolation, validate(riskSchema),          ctrl.create);
router.put('/:id',     tenantIsolation, validate(riskSchema.partial()), ctrl.update);
router.delete('/:id',  tenantIsolation, ctrl.delete);
```

**Padhne ka tareeka:**
- `router.use(...)` = **har** request par lagega
- `router.get/post/...` = us ek raaste par

**5 darwaze, order me:**

| # | Darwaza | Kaam | Fail hone par | File |
|---|---|---|---|---|
| 1 | `authenticate` | Token kholo, `req.user` bharo | **401** | [auth.js](../../backend/middleware/auth.js) |
| 2 | `restrictTo(...)` | Role list me hai? | **403** | [rbac.js](../../backend/middleware/rbac.js) |
| 3 | `auditTrail('Risk')` | Kisne kya badla, likh do | — | [auditTrail.js](../../backend/shared/auditTrail.js) |
| 4 | `tenantIsolation` | Doosri company ka data to nahi? | **403** | [tenant.js](../../backend/middleware/tenant.js) |
| 5 | `validate(riskSchema)` | Data sahi shape me? | **400** | [validation.js](../../backend/middleware/validation.js) |

> **💡 `/heatmap` `/:id` se PEHLE kyun likha hai?**
> Express upar se neeche match karta hai. Agar `/:id` pehle hota, to `/heatmap` request me `id = "heatmap"` ban jaata aur database cast error deta.
>
> Yeh baat questionnaire module me comment me bhi likhi hai ([questionnaire.routes.js:227](../../backend/modules/questionnaires/questionnaire.routes.js)):
> *"Literal paths are declared before /:id — otherwise Express matches them as an id and the request 404s on a cast error."*

> **💡 `validate()` sirf write par kyun?**
> `GET` me body hoti hi nahi. `POST`/`PUT` me user ka bheja data database me jaata hai — wahi jaanchna zaroori hai.
>
> Aur `riskSchema.partial()` — `PUT` me sirf badle hue fields aate hain, to har field ko optional bana dena.

---

### 📄 File 2 — `risk.controller.js` — "receptionist"

[backend/modules/risks/risk.controller.js](../../backend/modules/risks/risk.controller.js)

```js
exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await service.list(req.user.scopeOrgId, req.query, { skip, limit });
    response.paginated(res, items, { page, limit, total });
  } catch(e) { next(e); }
};
```

**Controller sirf 3 kaam karta hai:**
1. Request me se cheezein nikalo (`req.query`, `req.params.id`, `req.body`, `req.user`)
2. Service ko bulao
3. Jawab bhejo

**Controller me kabhi business logic nahi hoti.** Yeh niyam poore project me nibhaya gaya hai.

> **⭐ Sabse important line: `req.user.scopeOrgId`**
>
> Controller **kabhi** client se `orgId` nahi leta. Woh hamesha **token** se aata hai ([auth.js:43](../../backend/middleware/auth.js)):
> ```js
> scopeOrgId: decoded.role === 'Super Admin' ? null : decoded.orgId,
> ```
> Agar client `?orgId=` bhej sakta, to koi bhi doosri company ka data maang leta.

> **💡 `catch(e) { next(e) }` kya hai?**
> Error ko **central error handler** ko bhej do ([errorHandler.js](../../backend/shared/errorHandler.js)). Isliye har controller me error message likhne ki zarurat nahi — ek jagah sab sambhala jaata hai. Isiliye controllers itne chhote hain.

---

### 📄 File 3 — `risk.service.js` — "dimaag"

[backend/modules/risks/risk.service.js](../../backend/modules/risks/risk.service.js)

```js
async list(orgId, query = {}, pagination = {}) {
  const filter = orgFilter(orgId);                    // ← suraksha, hamesha pehle
  if (query.status)   filter.status   = query.status;
  if (query.category) filter.category = query.category;
  if (query.search)   filter.title = { $regex: escapeRegex(query.search), $options: 'i' };

  const total = await Risk.countDocuments(filter);
  let q = Risk.find(filter).sort({ createdAt: -1 });
  if (pagination.skip  !== undefined) q = q.skip(pagination.skip);
  if (pagination.limit !== undefined) q = q.limit(pagination.limit);
  return { items: await q, total };
}
```

**Teen cheezein dhyan se dekho:**

**1️⃣ `orgFilter(orgId)` hamesha sabse pehli line hai.**
Isse aage koi bhi filter jude, company wali rok hat nahi sakti. Yeh poore project me ek pattern hai — **naya service likho to yeh pehli line honi chahiye.**

**2️⃣ `escapeRegex(query.search)`** — yeh ek suraksha hai.
User `.*` ya `(((` type kar de to woh **regex** ban jaata. `escapeRegex` usko saada text bana deta hai ([scope.js:9](../../backend/shared/scope.js)):
```js
return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
```

**3️⃣ `countDocuments` alag chalta hai** — kyunki pagination ko "kul kitne hain" chahiye, sirf is page ke 20 nahi.

### Delete par dhyan do

```js
async delete(id, orgId) {
  const risk = await Risk.softDelete(byIdQuery(orgId, id));
  if (!risk) throw new NotFoundError('Risk');
  return risk;
}
```

`Risk.deleteOne()` **nahi** — `Risk.softDelete()`. Woh [softDelete.js](../../backend/shared/softDelete.js) plugin se aata hai aur sirf `deletedAt` set karta hai.

---

### 📄 File 4 — `risk.model.js` — "shakl"

[backend/modules/risks/risk.model.js](../../backend/modules/risks/risk.model.js)

Mongoose schema — kaunse fields, kaunsi values allowed, kaunse index.

```js
riskSchema.plugin(softDelete);
```
Yeh ek line har model me hai, aur wahi `softDelete()` method deti hai.

---

## 🎯 Ab jaadu — yeh pattern har jagah hai

Ab [backend/modules/certificates/](../../backend/modules/certificates/) kholo. Ya `capa`. Ya `controls`.

**👀 Wahi 4 files, wahi shakl.** Sirf naam aur fields alag.

**Isiliye ek naya module banana aasan hai:** kisi maujooda module ko copy karo, 4 files me naam badlo, ho gaya.

**Aur isiliye ek bug 23 jagah ho sakta hai** — yeh doosra pehlu hai.

---

## Frontend ka pattern

Frontend me bhi wahi baat — **teen hooks** poora kaam sambhalte hain:

| Hook | Kaam | File |
|---|---|---|
| `useApi(url)` | Ek baar data lao | [useApi.js](../../frontend-react/src/hooks/useApi.js) |
| `usePaginatedApi(url, params)` | Page-wise data | [usePaginatedApi.js](../../frontend-react/src/hooks/usePaginatedApi.js) |
| `useCrud(url)` | Banao / badlo / hatao | [useCrud.js](../../frontend-react/src/hooks/useCrud.js) |

Isliye ek typical list page sirf itna hai:

```js
const { data, loading, pagination, page, setPage, refetch } = usePaginatedApi('/api/risks');
const crud = useCrud('/api/risks', { onDone: refetch });
```

Aur `EntityFormModal` form khud bana deta hai — aapko sirf fields ki list deni hoti hai ([Findings.jsx:19-40](../../frontend-react/src/pages/Findings.jsx) dekho).

> **💡 Isiliye pages itne chhote hain** — Risks 149 lines, Certificates 151, Controls 154. Common kaam hooks me hai.

---

## ⚠️ Do baatein jo is design me kachchi thi

### 1. `useApi` me `json.data || json` — ✅ 🔧 FIX ho gaya

[useApi.js](../../frontend-react/src/hooks/useApi.js) me pehle yeh tha:
```js
setData(json.data || json);      // ← `||`
```

Server **hamesha** `{ success, data, meta }` bhejta hai ([response.js](../../backend/shared/response.js)). To `|| json` kyun? Purane vanilla-JS zamane me kuch endpoints seedha array bhejte the — zarurat khatam, line reh gayi.

**Problem `||` me hai:** woh `null`/`undefined` ke alawa **khaali aur zero** par bhi chal padta hai. Aur jab chalta hai, to state me **poora envelope** (`{success, data, meta}`) chala jaata hai — aur page usko record samajhkar render karne lagta hai.

```js
setData(json?.data ?? json);     // ← ab `??`
```

`??` sirf tab chalta hai jab `data` sach me maujood na ho.

> **💡 Dilchasp baat:** questionnaire feature ki API files ([submissionApi.js](../../frontend-react/src/features/questionnaire/services/submissionApi.js)) me **pehle se** `json?.data ?? json` likha tha. Naya code sahi tha, purane hooks nahi. Ab dono ek jaise hain.

Wahi galti 4 aur jagah thi ([FindingDiscussion](../../frontend-react/src/components/FindingDiscussion.jsx), [AuditDetail](../../frontend-react/src/pages/AuditDetail.jsx), [AuditUniverse](../../frontend-react/src/pages/AuditUniverse.jsx)) — sab theek.

> **📌 Jo abhi bhi baaki hai:** `f.title || f.name`, `a.due || a.due_date`, `o.riskLevel || o.risk_level` jaisi lines. Yeh bhi usi purane daur ki nishaniyan hain, par inhe hatane ke liye pehle tay karna padega ki har field ka **ek** naam kya hoga — woh alag kaam hai.

### 2. Har module me wahi 25 lines ka controller

15+ modules me controller lagbhag ek jaisa hai. Ise ek "factory" me badla ja sakta hai.

> **📌 Par mera salaah: abhi mat karo.** Yeh duplication **padhne me aasan** hai. Factory banane se code chhota hoga par samajhna mushkil. Aur aap abhi project samajh rahe ho. Yeh baad ki cheez hai.
>
> **Yeh jaan-boojh kar chhoda gaya hai** — baaki sab fix kar diya, yeh nahi. Duplication bug nahi hai; yeh ek **trade-off** hai jo abhi aapke haq me hai.

---

## 🐞 Aur is chapter par kaam karte hue do bug mile

Yeh handbook me likhe hi nahi the — `|| json` theek karte waqt saamne aa gaye.

### 1. Audit Universe menu me dikhta tha, par 403 deta tha

[AuditUniverse.jsx](../../frontend-react/src/pages/AuditUniverse.jsx) `/api/organizations` maangta hai — par nav me woh `audits` module se juda tha.

**Natija:**
```
Audit Manager   → menu me dikhta → /api/organizations → 403 BLOCKED
Auditor         → menu me dikhta → 403 BLOCKED
Reviewer        → menu me dikhta → 403 BLOCKED
```

**Yeh teesri baar hai** jab yeh pattern mila — pehle CA / Consultant → CAPA, phir [Act 5](06-act5-applicant.md) ka applicant, ab yeh.

**Fix:** nav mapping ab us API ka naam leti hai jo page **sach me** call karta hai:
```js
'audit-universe': 'organizations',   // pehle 'audits' tha
```

> **💡 Niyam banta hai:** `NAV_ITEM_MODULE` me item ko **us module se jodo jise page fetch karta hai**, us section se nahi jisme woh dikhta hai.

### 2. Audit Universe ka "Risk Score" banta hi nahi tha — **ginaya jaata tha**

Yeh zyada serious hai. Code aisa tha:

```js
const base = ((org.auditHistory || idx) * 15 + ...) % 100;
```

`idx` = us row ka **screen par position**. Matlab jis organization ka score nahi tha, usko score **is hisaab se** mil jaata tha ki woh list me kaunse number par hai — aur `% 100` se woh number kisi bhi arth se khaali ho jaata tha.

Aur:
```js
auditHistory: org.auditHistory || org.auditCount || Math.floor(Math.random() * 5) + 1
```
**Har page load par alag "audit history".**

Aur `recommendedCadence` usi jhoothe score se banta tha — matlab page **jhoothe number ke aadhar par** sifarish karta tha ki kis vendor ka audit kab karna hai.

Upar se page 8 **nakli companies** se shuru hota tha (`Amazon Web Services`, `PayPro Financial`), aur ek banner tha jo kehta tha *"nothing is shown rather than something inaccurate"* — jiski condition **kabhi true ho hi nahi sakti thi**.

**Ab:**
- Asli field (`org.risk`) use hoti hai — pehle code `org.riskScore` dhoondta tha, jo model me hai hi nahi, **isliye jhootha branch hamesha chalta tha**
- Score na ho to **"Not scored"** likha aata hai, koi number nahi
- `auditHistory` asli `activeAudits` se, warna `—`
- Score nahi to cadence bhi nahi
- Nakli companies aur mara hua banner dono hataye

> **🎯 Ek audit product me yeh sabse bura kism ka bug hai** — crash se bhi bura. Crash dikh jaata hai; **banaya hua risk score bilkul asli jaisa dikhta hai**, aur usi ke aadhar par faisle hote hain.
>
> Yeh wahi baat hai jo [UI audit](11-what-next.md) me Dashboard ke hardcoded `+12%` trends par kahi thi.

---

## ✅ Checkpoint — Chapter 9

**1. Ek naye module me `orgId` kahan se aana chahiye — aur kahan se bilkul nahi?**

<details><summary>Jawab</summary>

**`req.user.scopeOrgId` se** — jo verified JWT token se aata hai.
**Kabhi nahi:** `req.query.orgId` ya `req.body.orgId` se. Warna koi bhi doosri company ka data maang lega.
</details>

**2. Har service ki pehli line kya honi chahiye?**

<details><summary>Jawab</summary>

`const filter = orgFilter(orgId);` — taaki company wali rok aur soft-delete wali rok kabhi chhoote nahi. Uske baad hi baaki filter jodo.
</details>

**3. `/heatmap` ko `/:id` se pehle kyun likhna padta hai?**

<details><summary>Jawab</summary>

Express upar se neeche match karta hai. `/:id` pehle hota to `/heatmap` me `id = "heatmap"` ban jaata aur MongoDB cast error deta.
</details>

**4. Controller me `catch(e) { next(e) }` kya karta hai?**

<details><summary>Jawab</summary>

Error ko central [errorHandler.js](../../backend/shared/errorHandler.js) ko de deta hai. Isiliye har controller me alag error handling nahi likhni padti — aur isiliye controllers 3-4 lines ke hain.
</details>

**5. `escapeRegex()` kis cheez se bachata hai?**

<details><summary>Jawab</summary>

User ka search text seedha MongoDB `$regex` me jaata hai. `escapeRegex` uske special characters escape karta hai, taaki user regex inject na kar sake ([scope.js:9](../../backend/shared/scope.js)).
</details>

---

**➡️ Agla: [Chapter 10 — File ka Naksha](10-file-map.md)**
