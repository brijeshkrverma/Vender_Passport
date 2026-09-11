« [Chapter 7 — Act 6](07-act6-assessor.md) | **Chapter 8** | [Chapter 9 — Architecture →](09-architecture.md)

---

# Chapter 8 — Baaki Roles

> **Time:** 30 min
> **Lakshya:** Bache hue 4 roles chhoo lena, taaki koi kona anjaan na rahe.

Yeh roles main kahani me nahi aate — inka apna alag, chhota kaam hai. **Har ek ke liye 5-7 minute kaafi hain.**

---

## 1. 🎲 Risk Manager

> **Login:** `arjun.verma@globaltech.com` / `password123`

**Yeh role sabse alag tarah se bana hai.** Baaki sab roles me "yeh-yeh chhupa do" (`hidden`) likha hai. Isme ulta hai — "**sirf yeh-yeh dikhao**" (`allowed`) ([AuthContext.jsx:92](../../frontend-react/src/context/AuthContext.jsx)):

```js
'Risk Manager': { allowed: ['risks','risk-heatmap','dashboard','risk-scheduler','reports',
                            'organizations','certificates','documents','evidence',
                            'my-workspace','notifications','settings'] },
```

> **💡 Farak kyun matter karta hai:** `hidden` list "default = sab dikhao" hai. `allowed` list "default = kuch mat dikhao" hai. Naya page banane par `hidden` wale roles ko woh **apne-aap dikh jayega**, `allowed` wale ko nahi. Suraksha ke liye `allowed` behtar hai.

### ▶️ Karo

1. **Sidebar dekho** — sabse chhoti list ab tak
2. **Risks** kholo → seed ka data dikhega, filters ke saath
3. **Risk Heatmap** kholo → **5×5 grid**

### 🧪 Heatmap ka code dekho

[risk.service.js:65-76](../../backend/modules/risks/risk.service.js):
```js
const risks = await Risk.find(orgFilter(orgId), { likelihood: 1, impact: 1 });
const heatmap = [];
for (let l = 1; l <= 5; l++) {
  for (let i = 1; i <= 5; i++) {
    const count = risks.filter(r => r.likelihood === l && r.impact === i).length;
    heatmap.push({ likelihood: l, impact: i, count, score: l * i });
  }
}
```

**Kitni simple hai** — 25 khaane, har khaane me ginti, aur `score = likelihood × impact`. Yeh risk management ka standard formula hai.

> **⚠️ Ek chhoti dikkat:** yeh **saare** risks memory me le aata hai phir 25 baar filter karta hai. 100 risks tak theek hai; 50,000 par yeh dheema padega. Tab ise MongoDB aggregation banana hoga. **Abhi problem nahi hai — par jaan lena achha hai.**

### 🔴 Kya toota hai
- **Settings** menu me dikhta hai (`allowed` list me hai) par `API_MODULE_ROLES.settings` me Risk Manager **nahi** hai → intersection use chhupa deta hai. Yeh **theek kaam kar raha hai**, par dono lists ka aapas me na milna is project ki aam bimari hai.
- **Risk-Based Scheduler** — khali stub

---

## 2. 📁 Document Manager

> **Login:** `kritika.bose@globaltech.com` / `password123`

Bhi `allowed` list wala role hai — sirf documents, evidence, certificates, policy lifecycle.

### ▶️ Karo

1. **Documents** kholo → **file upload karke dekho** (yeh sach me kaam karta hai — [uploads/](../../uploads/) folder me jaata hai, [shared/upload.js](../../backend/shared/upload.js) `multer` se)
2. **Certificates** kholo → expiry dates dekho
3. **Expiry Alerts** kholo → jo certificates jald khatam ho rahe hain

> **💡 Certificates aur Documents alag kyun?** Certificate ki **expiry** hoti hai aur uspar alert chahiye. Document sirf ek file hai. Isliye alag models.

### 🔴 Kya toota hai
- **Document Exchange**, **Doc Versions** — khali stubs
- **Policy Lifecycle** — page hai par patla (46 lines)
- Certificate expiry ka **email** nahi jaata — `nodemailer` aur `node-cron` package install hain ([package.json](../../package.json)), par unka koi scheduled job nahi chalta. Alert sirf tab dikhta hai jab aap page kholo.

---

## 3. 🏢 Vendor Manager

> **Login:** `vendor.mgr@globaltech.com` / `password123`

**Yeh role do zindagi jeeta hai** — aur yahi Act 5 wale bug ki jad hai:
- **Vendors sambhalta hai** (`/api/vendors` allowed ✅)
- **Khud applicant bhi hai** (`/api/questionnaire-submissions` allowed ✅)
- **Par sawaal padh nahi sakta** (`/api/questionnaires` ❌ **403**)

### ▶️ Karo

1. **Vendors** kholo → risk tier ke saath list
2. Kisi vendor par → **Vendor Scorecard** (`/vendors/:id/scorecard`)
3. **Bulk Invite** kholo → ek saath kai vendors ko bulane ka page

### 🔴 Kya toota hai
- 🔴 **Answer Questionnaire → 403** (Act 5 dekho — sabse bada bug)
- Bulk Invite se email sach me jaate hain? — **nahi**, email bhejne ka koi chalta hua system nahi hai

---

## 4. 🎓 CA / Consultant

> **Login:** `ca@consulting.com` / `password123`

**Yeh sabse dilchasp role hai** — yeh **bahar ka** banda hai jo **kai companies** dekhta hai.

`allowed` list me 16 items ([AuthContext.jsx:100](../../frontend-react/src/context/AuthContext.jsx)).

### ▶️ Karo

1. **Client Portfolio** kholo → yeh sirf isi role ke liye hai
2. **CAPA** dhundo sidebar me → **nahi milega**

### 🧪 CAPA gayab kyun — poori kahani

Code me comment hai ([AuthContext.jsx:97-99](../../frontend-react/src/context/AuthContext.jsx)):

> *"'capa' is deliberately absent: /api/capa is restricted to Super Admin, Organization Admin, Compliance Manager and Reviewer, so showing the nav item here only produced a 403 after the click."*

Matlab pehle **CAPA menu me dikhta tha**, CA / Consultant click karta tha, aur **403 error** milta tha.

> **🎯 Yeh bilkul wahi bug hai jo Act 5 me abhi bhi zinda hai** — bas alag module me.
>
> Ek jagah pakda gaya aur theek kar diya gaya. Doosri jagah **nahi pakda gaya**, kyunki usko pakadne wala test ([rbac-parity.test.js](../../tests/unit/rbac-parity.test.js)) **adhura hai**.
>
> **Yahi kaaran hai ki Chapter 11 ka pehla kaam woh test theek karna hai, koi feature banana nahi.**

### 🔴 Kya toota hai
- CA / Consultant ka `scopeOrgId` uski **apni** org hai. To woh "kai clients" kaise dekhega? **Multi-client dekhne ka koi asli mechanism nahi hai.** Client Portfolio page maujood hai par uske peeche ka data model adhura hai.
- Org Comparison, Org Hierarchy — khali stubs

---

## 5. 👤 Employee

> **Login:** `employee@globaltech.com` / `password123`

Sabse kam access. Sirf dashboard, my-workspace, documents, evidence, certificates, notifications, calendar jaisi cheezein.

**▶️ Login karke sidebar dekh lo — 1 minute.** Isse aapko "sabse kam access kaisa dikhta hai" ka andaza ho jayega.

---

## 📊 Sab roles ek table me

| Role | Tareeka | Sabse khaas cheez | Bug? |
|---|---|---|---|
| Super Admin | `allowedAll` | **Sabhi companies** ka data | — |
| Organization Admin | `allowedAll` | Users banata hai | — |
| Compliance Manager | `allowedAll` | Product ka main user | — |
| Audit Manager | `hidden` (10) | Team lagata hai | ⚠️ `.slice(0,10)` magic number |
| Auditor | `hidden` (bada) | Findings likhta hai | — |
| Reviewer | `hidden` (chhota) | CAPA + assessment | — |
| Risk Manager | **`allowed`** | Heatmap | — |
| Document Manager | **`allowed`** | Files + expiry | ⚠️ Email nahi jaate |
| Vendor Manager | `hidden` | Vendors + applicant | 🔴 **403 on questions** |
| External Company User | `hidden` | Sirf applicant | 🔴 **403 on questions** |
| Employee | `hidden` | Bahut kam access | — |
| CA / Consultant | **`allowed`** (16) | Bahar ka, multi-client | ⚠️ Multi-client adhura |

---

## ✅ Checkpoint — Chapter 8

**1. `hidden` aur `allowed` me kya farak hai — aur suraksha ke liye kaunsa behtar hai?**

<details><summary>Jawab</summary>

`hidden` = "default sab dikhao, yeh chhupa do". `allowed` = "default kuch mat dikhao, sirf yeh dikhao".
**`allowed` behtar hai** — naya page banane par woh `hidden` wale roles ko apne-aap dikh jaata hai (jo galat ho sakta hai), `allowed` wale ko nahi.
</details>

**2. CA / Consultant ko CAPA kyun nahi dikhta, aur is kahani ka Act 5 se kya rishta hai?**

<details><summary>Jawab</summary>

`/api/capa` usko allow nahi karta, isliye menu se hata diya gaya — pehle wahan click par 403 aata tha.
**Rishta:** Act 5 ka Vendor Manager wala 403 **bilkul wahi bug** hai, bas theek nahi hua. Dono ko ek hi test pakadta — [rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) — jo adhura hai.
</details>

**3. Risk heatmap ka `score` kaise nikalta hai, aur us code me aage kya dikkat aa sakti hai?**

<details><summary>Jawab</summary>

`score = likelihood × impact`, 5×5 grid ([risk.service.js:65-76](../../backend/modules/risks/risk.service.js)).
Dikkat: saare risks memory me aate hain phir 25 baar filter hote hain. Hazaaron risks par dheema padega — tab aggregation chahiye.
</details>

---

## 🎓 Aap yahan tak pahunch gaye

Aapne **poora product chalake dekh liya** — 12 me se 11 roles, sabhi bade flows.

Ab do chapters bache hain: **code ki taraf**.

**➡️ Agla: [Chapter 9 — Ek Button ka Safar](09-architecture.md)**
