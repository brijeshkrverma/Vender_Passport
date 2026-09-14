« [Chapter 4 — Act 3](04-act3-audit-manager.md) | **Chapter 5 · Act 4** | [Chapter 6 — Act 5 →](06-act5-applicant.md)

---

# 🎬 Act 4 — Auditor

> **Login:** `rohit.kapoor@globaltech.com` / `password123`
> **Time:** 45 min
> **Kahani me jagah:** Aapko abhi-abhi audit par lagaya gaya hai. Ab zameeni kaam.

---

## Yeh role hai kaun?

**Auditor = jo asal me jaanch karta hai.**

Woh audit banata nahi, team lagata nahi. Woh **dekhta** hai: evidence padhta hai, sawaal poochhta hai, aur jahan kami mile wahan **finding** likhta hai.

Iska access sabse kam hai un logon me jo audit ka kaam karte hain — aur yahi is chapter ki sabse badi seekh hai.

---

## ▶️ Kaam 1 — Ghanti dekho 🔔

Login karte hi upar dayein **ghanti (bell)** icon par ek **laal bindi** dikhegi.

Ghanti dabao.

**👀 Dikhega:**
> **New audit assigned to you**
> *Handbook Test Audit (Supplier/Vendor Audit) — assigned as auditor.*

> **💡 Yeh notification Act 3 me bana tha** — jab Meera ne aapko assign kiya ([audit.service.js:153-160](../../backend/modules/audits/audit.service.js)). Woh database me `Notification` document ban gaya tha, aur ab aapke login par dikh raha hai.
>
> **📌 Ek achhi technical detail:** yeh page live bhi sunta hai. [Topbar.jsx:68](../../frontend-react/src/components/Topbar.jsx) me `EventSource` hai — server naya notification bheje to woh **turant** dikhega, page refresh kiye bina.
>
> Usme ek chota jugaad bhi hai: `EventSource` header nahi bhej sakta, isliye token URL me jaata hai (`?token=...`) aur notifications router sirf **isi ek route** ke liye usko accept karta hai ([auth.js:9-16](../../backend/middleware/auth.js) me `req.query.token`).

---

## ▶️ Kaam 2 — Sidebar ginno (ab bada farak dikhega)

**👀 Ab yeh sab gayab hain:**
Users, Settings, Audit Trail, Organizations, **CAPA**, Calendar, Gantt, Gap Analysis, Client Portfolio, Vendor Scorecard, ESG, Maturity Model, Sampling Engine, Risk Scheduler, Traceability, Issues, Exceptions, Org Compare, Org Hierarchy, Audit Program, Q-Scoring, Role Dashboard.

**👀 Bache hain:** Dashboard, My Workspace, **Audits**, Audit Universe, Auditor Workspace, Working Papers, **Findings**, **Evidence**, **Documents**, **Certificates**, Questionnaire pages, Controls, Control Testing, Risks, Reports, Notifications.

Poori list [AuthContext.jsx:80](../../frontend-react/src/context/AuthContext.jsx) me `AUDITOR_HIDDEN` naam se hai.

### 🧪 Experiment 1 — Chhupe hue page par zabardasti jao

Browser ke address bar me type karo:

```
http://localhost:5173/users
```

**👀 Kya hoga?** Aap **turant `/dashboard` par phenk diye jaoge.**

Kyun? [ProtectedLayout.jsx:13-15](../../frontend-react/src/components/ProtectedLayout.jsx):
```js
if (!canAccessPage(user.role, location.pathname)) {
  return <Navigate to="/dashboard" replace />;
}
```

> **💡 To yeh do rok ho gayi:** menu me item chhupana (dikhe hi na), aur URL par redirect (type karke bhi na jaa sako).
>
> **Par yaad rakho — yeh dono abhi bhi sirf browser me hain.** Teesri aur asli rok server par hai. Woh humne Act 3 me PowerShell se test ki thi.

### 🧪 Experiment 2 — CCM gayab kyun hai?

`AUDITOR_HIDDEN` list me `ccm-dashboard` naam **nahi** hai. Phir bhi CCM menu me nahi dikhta. Kyun?

**Jawab:** menu **do** shartein poori hone par dikhta hai ([AuthContext.jsx:173-182](../../frontend-react/src/context/AuthContext.jsx)):

```js
export function isNavVisibleForRole(role, itemId) {
  const config = ROLE_ROUTES[role];
  if (!config) return false;
  // The server has the final say — never advertise a page it will refuse.
  if (!isApiAllowedForRole(role, itemId)) return false;   // ← shart 1
  ...                                                      // ← shart 2
}
```

- **Shart 1 (suraksha):** `API_MODULE_ROLES.ccm` me Auditor hai? → **Nahi** ([AuthContext.jsx:120](../../frontend-react/src/context/AuthContext.jsx))
- **Shart 2 (product):** `AUDITOR_HIDDEN` me hai? → Nahi

Shart 1 fail → item chhup gaya.

> **⭐ Yeh design bahut soch kar banaya gaya hai.** Comment padho ([AuthContext.jsx:103-114](../../frontend-react/src/context/AuthContext.jsx)):
>
> *"The nav lists above are a product decision ('what is useful to this role'); this map is the security decision ('what will the server actually answer'). Showing an item the API rejects produced a 403 after the click — CA / Consultant → CAPA, Risk Manager → Settings, Reviewer → Organizations were all broken this way."*
>
> Matlab: pehle menu me aisi cheezein dikhti thi jinpar click karte hi **403 error** aata tha. Ab menu dono ka **intersection** hai.

> ### 🔴 Aur yahi woh jagah hai jahan project ka sabse bada chhupa hua khatra hai
>
> Yeh do lists (`API_MODULE_ROLES` frontend me, aur `restrictTo(...)` backend me) **haath se same rakhni padti hain.**
>
> Inko milane wala test hai — [tests/unit/rbac-parity.test.js](../../tests/unit/rbac-parity.test.js).
>
> > **🔧 Woh test lambe samay tak chalta hi nahi tha.** Uska `MODULES` array band hi nahi hua tha, matlab poori file ek **syntax error** thi — aur Vitest usko `(0 test)` kehkar chhod deta tha. **Guard tha hi nahi.**
> >
> > Yahi wajah hai ki `capa` aur `organizations` wale 403-on-click **ship ho gaye** the (dono baad me haath se pakde gaye).
> >
> > **Ab woh chalta hai, aur pehle se kaafi zyada cover karta hai** — 8 modules se badhkar 19, plus:
> > - `ALL` wale modules sach me sabke liye khule hain ya nahi
> > - jo router har route par alag guard lagata hai (jaise `reports`), uski **koi route bina guard ke to nahi**
> > - `API_MODULE_ROLES` me koi module hai jo test me cover hi nahi — woh bhi pakadta hai
> >
> > **Natija: `Test Files 17 passed (17)`** — pehli baar saari test files chal rahi hain.
>
> **▶️ Khud dekh lo:** `npm test` chalao → `Test Files 17 passed (17)`, `Tests 433 passed`.
>
> **▶️ Aur guard sach me kaam karta hai — todkar dekho:**
> [AuthContext.jsx](../../frontend-react/src/context/AuthContext.jsx) me `risks:` wali line me ek extra role jod do (jaise `'Employee'`), phir `npm test` chalao:
> ```
> FAIL  rbac-parity.test.js > risks
> +   "Employee",
> ```
> Test turant pakad leta hai aur **exact role ka naam** bata deta hai. Wapas hata do, sab pass.

---

## ▶️ Kaam 3 — Apna audit kholo aur stage aage badhao

Sidebar → **Audits** → `Handbook Test Audit`

**Overview** tab → **Actions** box → **"Advance Stage →"** dabao.

**👀 Status badlega:** `Auditor Assigned` → `Execution`

Do aur baar dabao: → `Evidence Review` → `Findings`

**Lifecycle** tab kholkar hare golon ko badhte dekho.

> **💡 Yeh button bhi pehle toota tha.** Comment dekho ([AuditDetail.jsx:166-170](../../frontend-react/src/pages/AuditDetail.jsx)):
> *"These two calls previously went out WITHOUT the Authorization header, so the server answered 401 and the code reloaded the page anyway — the button appeared to do nothing at all."*
>
> **Yeh seekhne layak baat hai:** bina token ke request → 401 → par UI ne error dikhaya hi nahi. **Chup-chaap fail hone wala bug sabse bura hota hai.** Isliye ab har action ka error `actionError` me dikhta hai.

**▶️ "← Back" dabakar ek stage peeche bhi jao** — `retreatStage` chalta hai ([audit.service.js:74-83](../../backend/modules/audits/audit.service.js)).

---

## ▶️ Kaam 4 — Evidence dekho

**Evidence** tab dabao (audit detail page par).

**👀 Shayad dikhega:** *"No evidence linked to this audit"*

Yeh sahi hai — seed ne evidence banaya hai, par **aapke naye audit se linked nahi**.

Sidebar → **Evidence** kholo. Wahan seed ka evidence dikhega (file upload, status, links).

> **💡 Evidence ka apna model hai** — [evidence.model.js](../../backend/modules/evidence/evidence.model.js) aur ek alag [evidenceLink.model.js](../../backend/modules/evidence/evidenceLink.model.js). Do models kyun? Kyunki ek hi evidence file kai jagah link ho sakti hai — ek audit se, ek finding se, ek control se. Isliye "file" aur "link" alag rakhe gaye hain.

---

## ▶️ Kaam 5 — Finding banao (Auditor ka asli kaam)

Sidebar → **Findings** → upar dayein **"+ New Finding"**

**👀 Dikhega:** ek bada form. Upar intro likha hai:
> *"Criteria / condition / cause / consequence is the standard structure auditors use to make a finding defensible."*

Bharo:
- **Title:** `Access reviews not performed quarterly`
- **Audit:** `Handbook Test Audit` ← **yeh zaroori hai**
- Severity: **High**, Risk: **High**
- Owner: `Priya Sharma`
- Due date: koi bhi
- **Criteria — what should happen:** `Access reviews must run every quarter`
- **Condition — what actually happens:** `Last review was 14 months ago`
- **Cause:** `No owner assigned to the review process`
- **Consequence:** `Ex-employees may retain system access`
- **Recommendation:** `Assign an owner and set a quarterly calendar reminder`

**Create finding**

**👀 Table me naya row aa jayega.**

### 💡 Yeh 5 fields kyun hain? (audit ki asli padhai)

Yeh AI ne mann se nahi banaye — yeh **duniya bhar ke auditors ka standard structure** hai:

| Field | Sawaal | Udaharan |
|---|---|---|
| **Criteria** | Hona kya chahiye tha? | "Har quarter review ho" |
| **Condition** | Ho kya raha hai? | "14 mahine se nahi hua" |
| **Cause** | Aisa kyun hua? | "Koi owner hi nahi tha" |
| **Consequence** | Isse nuksan kya? | "Purane employees ka access bacha reh sakta hai" |
| **Recommendation** | Karein kya? | "Owner lagao, reminder set karo" |

> **💡 Isko "5 C's" kehte hain.** Iske bina finding sirf shikayat hai; iske saath woh **defensible** hai — matlab company argue nahi kar sakti.

### ▶️ Finding par click karo

Row par click karo (Edit button par nahi, row par).

**👀 Ek discussion panel khulega** ([FindingDiscussion.jsx](../../frontend-react/src/components/FindingDiscussion.jsx)) — yahan finding par baat-cheet ho sakti hai. Yeh `/api/comments` module use karta hai.

### ▶️ Audit ke andar se bhi dekho

Wapas **Audits** → apna audit → **Findings** tab.

**👀 Ab aapki finding wahan dikhegi** — kyunki aapne usme `auditId` set kiya tha ([AuditDetail.jsx:66](../../frontend-react/src/pages/AuditDetail.jsx) `?auditId=` se filter karta hai).

---

## 🔴 Yahan Kya Toota Hai — Act 4 ka sach

| Cheez | Haalat |
|---|---|
| Notifications (+ live stream) | ✅ **Kaam karta hai** |
| Menu chhupana + URL redirect | ✅ **Kaam karta hai** |
| Stage advance / retreat | ✅ **Kaam karta hai** |
| Findings CRUD + 5 C's + discussion | ✅ **Achha bana hai** |
| Evidence list aur upload | ✅ **Kaam karta hai** |
| **`rbac-parity.test.js`** | ✅ **🔧 FIX ho gaya** — chalta hai, aur pehle se zyada cover karta hai |
| Evidence ko audit se jodna | ✅ **🔧 FIX ho gaya** — Evidence tab par Attach / Detach |
| Working Papers / Auditor Workspace | ⚠️ **Patle hain** (69 aur 156 lines) — gap, bug nahi |
| Management Response, Traceability, Issues, Exceptions | ❌ **Khali stubs** — [Phase 3 ka faisla](11-what-next.md) |

### 🔧 Is chapter ke fixes (kya-kya badla)

| # | Kya | Kahan |
|---|---|---|
| 1 | `MODULES` array band kiya — file ab **chalti** hai | [rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) |
| 2 | Coverage 8 → **19 modules** (ccm, auditlogs, reports, users, dono questionnaire wale) | same |
| 3 | `ALL` wale 5 modules bhi verify hote hain | same |
| 4 | Per-route guard wale router ki **har route** check hoti hai | same |
| 5 | Koi module cover se chhoot gaya to test batata hai | same |
| 6 | Evidence tab par Attach / Detach | [AuditDetail.jsx](../../frontend-react/src/pages/AuditDetail.jsx) |
| 7 | `relatedAuditId` ab `null` le sakta hai (detach ke liye) | [evidence.routes.js](../../backend/modules/evidence/evidence.routes.js) |

> ### 🐞 Fix #6 — "evidence link karo" ek aisi jagah bhejta tha jahan ho hi nahi sakta tha
>
> Evidence tab par likha aata tha: *"Upload evidence from the Evidence Repository and link it to findings"*.
>
> **Par Evidence page par audit se jodne ka koi tareeka tha hi nahi.** Model me `relatedAuditId` field thi, uspar index bhi tha, `GET /by-audit/:id` endpoint bhi tha — **bas usko set karne ka raasta nahi tha.**
>
> Ab Evidence tab par ek picker hai (sirf woh evidence dikhata hai jo kisi audit se judi nahi), **Attach** button, aur har card par **Detach**.
>
> Detach ke liye backend me ek chhota fix bhi karna pada — `relatedAuditId` zod me `.optional()` tha, jo `null` reject kar deta tha. Ab `.nullable().optional()` hai.
>
> **Live verify kiya:** attach → `by-audit` me dikha → detach → picker me wapas aaya → dobara attach → original state restore.

---

## ✅ Checkpoint — Act 4

**1. Auditor ko CCM menu me kyun nahi dikhta, jabki woh `AUDITOR_HIDDEN` list me nahi hai?**

<details><summary>Jawab</summary>

Menu **do shartein** maangta hai. `API_MODULE_ROLES.ccm` me Auditor nahi hai, isliye `isApiAllowedForRole` `false` deta hai aur item chhup jaata hai — chahe product-list me woh hidden na ho ([AuthContext.jsx:173-182](../../frontend-react/src/context/AuthContext.jsx)).
</details>

**2. Ek Auditor `/users` URL type kare to kya hoga? Kya yeh kaafi suraksha hai?**

<details><summary>Jawab</summary>

`/dashboard` par redirect ho jayega ([ProtectedLayout.jsx:13](../../frontend-react/src/components/ProtectedLayout.jsx)).
**Nahi, yeh kaafi nahi hai** — yeh browser ki rok hai. Asli rok server par `restrictTo('Super Admin','Organization Admin')` hai. Browser wali rok Postman/PowerShell se bypass ho sakti hai; server wali nahi.
</details>

**3. Finding banate waqt "Audit" field zaroori kyun hai?**

<details><summary>Jawab</summary>

Finding kisi audit se hi nikalti hai — bina audit ke woh sirf ek raay hai. API `auditId` maangti hai ([Findings.jsx:15-18](../../frontend-react/src/pages/Findings.jsx)), aur isi se audit detail page ka Findings tab bhara jaata hai.
</details>

**4. "Advance Stage" button pehle kya bug rakhta tha, aur woh khatarnaak kyun tha?**

<details><summary>Jawab</summary>

Request bina `Authorization` header ke jaati thi → server 401 deta tha → par UI phir bhi page reload kar deta tha, koi error nahi dikhta tha. Button "kuch nahi kar raha" lagta tha. **Chup-chaap fail hona sabse khatarnaak bug hai** — user ko lagta hai kaam ho gaya.
</details>

---

## 🤝 Handover

**Aapne kya kiya:** audit ko `Findings` stage tak pahuncha diya, ek finding likhi.
**Ab kya chahiye:** jis company ki jaanch ho rahi hai, woh sawaalon ke jawab de.

Woh kaam **Applicant** ka hai — vendor ya external company user.

**➡️ Agla: [Chapter 6 — Act 5: Applicant](06-act5-applicant.md)** ← *yeh sabse important chapter hai*
