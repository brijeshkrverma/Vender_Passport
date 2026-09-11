« [Chapter 0 — Setup](00-START-HERE.md) | **Chapter 1** | [Chapter 2 — Act 1 →](02-act1-org-admin.md)

---

# Chapter 1 — Kaun-Kaun Hai aur Kaam ka Order

> **Time:** 20 min · **Code:** koi nahi, sirf padhna
> **Lakshya:** Chapter ke ant me aap bata paoge ki koi bhi kaam **kaunsa role** karta hai aur **kab**.

---

## 1. Yeh app asal me karta kya hai?

Ek line me:

> **"Ek company (ya uska vendor) niyamon ka paalan kar rahi hai ya nahi — yeh jaanchne ka poora system."**

Isko **audit** kehte hain. Real duniya me yeh aise hota hai:

1. Ek company kehti hai "hum ISO 27001 follow karte hain"
2. Koi auditor aata hai aur **saboot** maangta hai
3. Company sawaalon ke jawab deti hai aur documents deti hai
4. Auditor jaanchta hai — jahan kami mile, woh **finding** hai
5. Company kami theek karti hai — woh **CAPA** (Corrective Action) hai
6. Sab theek ho jaye to **certificate** milta hai

**Yeh app poore is process ko computer par le aata hai.** Bas.

Baaki jitne bhi 47 pages hain, woh isi 6-step ke alag-alag hisse hain.

---

## 2. Do alag-alag duniya

Project me **do** cheezein hain jo alag lagti hain, aur yahi confusion ki jad hai:

### 🅰️ Audit ki duniya (traditional)
Audit banao → auditor lagao → evidence dekho → findings likho → CAPA → close.
Yeh **12-stage lifecycle** par chalti hai.

### 🅱️ Questionnaire ki duniya (assessment)
Sawaal banao → vendor jawab deta hai → **auto scoring** → assessor jaanchta hai → score final.
Yeh **6-status lifecycle** par chalti hai.

**Yeh dono judte kahan hain?**
Audit ke 12 stages me se ek stage ka naam hi **"Questionnaire"** hai. Aur audit detail page par ek **"Questionnaire" tab** hai. Matlab ek audit ke andar questionnaire bheja ja sakta hai.

> **💡 Yeh baat samajh li to aadha project samajh gaye.** 🅱️ wali duniya (questionnaire + scoring) is project ka sabse zyada mehnat se bana hissa hai — ~6,000 lines. 🅰️ wali duniya tulnatmak roop se simple hai.

---

## 3. Kirdaar — 12 Roles

Poori list [backend/shared/roles.js:11](../../backend/shared/roles.js) me hai. Inko **4 group** me samjho:

### 👑 Group 1 — Malik (sab kuch dekh sakte hain)

| Role | Kaam | Demo login |
|---|---|---|
| **Super Admin** | Poore platform ka malik. **Sabhi companies** ka data dekh sakta hai | `super.admin@globaltech.com` |
| **Organization Admin** | Ek company ka malik. Users banata hai | `org.admin@globaltech.com` |
| **Compliance Manager** | Rozmarra ka boss. Audit banata hai, questionnaire likhta hai | `priya.sharma@globaltech.com` |

> **⚠️ Super Admin khaas hai.** Baaki sab apni company ka data dekhte hain. Super Admin **sabka** dekhta hai — [auth.js:43](../../backend/middleware/auth.js) me `scopeOrgId` uske liye `null` set hota hai, aur `null` ka matlab "koi filter nahi". Isiliye register page par Super Admin option **nahi** milta ([roles.js:25](../../backend/shared/roles.js)) — warna koi bhi sign-up karke sabka data padh leta.

### 🔍 Group 2 — Audit karne wale

| Role | Kaam | Demo login |
|---|---|---|
| **Audit Manager** | Audit chalata hai, team lagata hai | `meera.nair@globaltech.com` |
| **Auditor** | Zameeni kaam — evidence dekhna, findings likhna | `rohit.kapoor@globaltech.com` |
| **Reviewer** | Doosri nazar — jaanch karta hai, CAPA approve karta hai | `reviewer@globaltech.com` |
| **CA / Consultant** | Bahar ka expert — kai clients dekhta hai | `ca@consulting.com` |

### 📋 Group 3 — Vishesh kaam

| Role | Kaam | Demo login |
|---|---|---|
| **Risk Manager** | Sirf risks aur heatmap | `arjun.verma@globaltech.com` |
| **Document Manager** | Sirf documents aur certificates | `kritika.bose@globaltech.com` |
| **Vendor Manager** | Vendors sambhalta hai | `vendor.mgr@globaltech.com` |

### 🏢 Group 4 — Jinki jaanch hoti hai

| Role | Kaam | Demo login |
|---|---|---|
| **External Company User** | Bahar ki company ka banda — questionnaire bharta hai | `jwhitfield@securecore.com` |
| **Employee** | Andar ka aam karmchari — bahut kam access | `employee@globaltech.com` |

**Sabka password: `password123`**

---

## 4. Kaam ka Order — poori kahani ek nazar me

Yeh **exact order** hai jo Chapters 2-7 me aap khud karoge:

```
┌──────────────────────────────────────────────────────────────┐
│ 🎬 ACT 1 — Organization Admin                     (Ch 2)     │
│    "Log to hone chahiye pehle"                               │
│    → Users banata hai, roles deta hai                        │
└──────────────────────────┬───────────────────────────────────┘
                           │ handover: team taiyar hai
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 🎬 ACT 2 — Compliance Manager                     (Ch 3)     │
│    "Ab kaam khada karo"                                      │
│    → Audit banata hai        (status: Planning)              │
│    → Questionnaire likhta hai aur PUBLISH karta hai          │
└──────────────────────────┬───────────────────────────────────┘
                           │ handover: audit bana, sawaal taiyar
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 🎬 ACT 3 — Audit Manager                          (Ch 4)     │
│    "Team lagao"                                              │
│    → Auditor assign karta hai                                │
│    → status apne-aap "Auditor Assigned" ho jaata hai         │
│    → 4 independence rules yahan check hote hain ⭐           │
└──────────────────────────┬───────────────────────────────────┘
                           │ handover: auditor ko notification gaya
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 🎬 ACT 4 — Auditor                                (Ch 5)     │
│    "Zameeni kaam"                                            │
│    → Evidence dekhta hai                                     │
│    → Findings banata hai (jahan kami mili)                   │
│    → Stage aage badhata hai: Execution → Evidence Review     │
└──────────────────────────┬───────────────────────────────────┘
                           │ handover: sawaal vendor ke paas
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 🎬 ACT 5 — Applicant (Vendor / External User)     (Ch 6)     │
│    "Jawab do"                                                │
│    → Questionnaire bharta hai  (Draft)                       │
│    → Submit karta hai          (Submitted)                   │
│    → 🤖 SCORING APNE-AAP CHALTI HAI ⭐                       │
└──────────────────────────┬───────────────────────────────────┘
                           │ handover: assessor ki queue me aaya
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 🎬 ACT 6 — Assessor / Reviewer                    (Ch 7)     │
│    "Jaanch karo aur band karo"                               │
│    → Assessment Queue kholta hai                             │
│    → Assess karta hai → Assessed / Returned                  │
│    → CAPA approve karta hai                                  │
│    → Audit ko "Closed" tak le jaata hai                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Do lifecycle — yaad rakhne layak

Aage baar-baar yeh do lists dikhengi. Ek baar dekh lo:

### 🅰️ Audit ke 12 stages
[audit.service.js:8](../../backend/modules/audits/audit.service.js) me hardcoded:

```
1. Planning          5. Auditor Assigned   9.  Verification
2. Scoping           6. Execution          10. Report
3. Risk Assessment   7. Evidence Review     11. Closed
4. Questionnaire     8. Findings
                     (+ Corrective Actions)
```

Har audit ek number rakhta hai — `stageIdx` (0 se 11). "Advance Stage" button usko +1 karta hai.

### 🅱️ Questionnaire ke 6 status
[submission.model.js:59](../../backend/modules/questionnaires/submission.model.js) me:

```
Draft → Submitted → Under Assessment → Assessed → Approved
                 ↖________ Returned ________↙
```

`Returned` ka matlab: assessor ne wapas bhej diya, applicant dobara bhar sakta hai.

---

## 6. Ek zaroori niyam jo poore app me chalta hai

**Har user sirf apni company ka data dekhta hai.**

Yeh koi ek jagah likha hua rule nahi hai — yeh **har database query me** ghusa hua hai. Dekho [shared/scope.js](../../backend/shared/scope.js) — poori file sirf 13 lines hai:

```js
function orgFilter(orgId) {
  return orgId ? { orgId, deletedAt: null } : { deletedAt: null };
}
```

Har service isko lagati hai. Matlab:
- `orgId` diya → sirf us company ka data
- `deletedAt: null` → delete kiya hua data kabhi nahi dikhega

> **💡 Yeh "soft delete" hai.** Delete karne par data mitta nahi, sirf `deletedAt` par time likh diya jaata hai. Audit software me yeh zaroori hai — record mitana hi sabse bada compliance crime hai.

---

## ✅ Checkpoint — Chapter 1

**1. Ek vendor ko sawaal bharne se pehle kis role ko kya kaam karna padta hai?**

<details><summary>Jawab</summary>

**Compliance Manager** ko questionnaire likhna aur **Publish** karna padta hai. Bina publish kiye vendor ko sawaal dikhenge hi nahi (Draft/Superseded/Archived questions answer screen par nahi aate — [questionnaire.service.js](../../backend/modules/questionnaires/questionnaire.service.js) ka `ANSWERABLE`).
</details>

**2. Super Admin baaki sabse alag kaise hai?**

<details><summary>Jawab</summary>

Uska `scopeOrgId` `null` hota hai ([auth.js:43](../../backend/middleware/auth.js)), aur `orgFilter(null)` company ka filter hata deta hai — matlab **sabhi companies** ka data. Isiliye woh public sign-up me offer nahi hota.
</details>

**3. Audit lifecycle aur questionnaire lifecycle — yeh do alag hain ya ek?**

<details><summary>Jawab</summary>

**Alag hain.** Audit ke 12 stages (`stageIdx` 0-11), questionnaire ke 6 status (Draft…Approved). Jodne wali kadi: audit ka stage 4 ka naam "Questionnaire" hai, aur Audit Detail page par ek Questionnaire tab hai.
</details>

**4. Data delete karne par kya hota hai?**

<details><summary>Jawab</summary>

Mitta nahi — `deletedAt` par timestamp lag jaata hai (soft delete), aur `orgFilter` usko har query se chhupa deta hai. Record database me rehta hai.
</details>

---

**➡️ Agla: [Chapter 2 — Act 1: Organization Admin](02-act1-org-admin.md)**
