« [Chapter 3 — Act 2](03-act2-compliance-manager.md) | **Chapter 4 · Act 3** | [Chapter 5 — Act 4 →](05-act4-auditor.md)

---

# 🎬 Act 3 — Audit Manager

> **Login:** `meera.nair@globaltech.com` / `password123`
> **Time:** 45 min
> **Kahani me jagah:** Audit ban chuka hai (status: Planning). Ab team lagao.

**⭐ Yeh chapter chhota hai par sabse dilchasp hai** — yahan aap dekhoge ki audit software asal me karta kya hai.

---

## Yeh role hai kaun?

**Audit Manager = audit chalane wala.**

Woh audit banata nahi (woh Compliance Manager ne kiya), balki **chalata** hai: team lagata hai, stage aage badhata hai, kaam par nazar rakhta hai.

---

## ▶️ Kaam 1 — Pehle sidebar ka farak dekho

Login karte hi **sidebar dekho aur Act 1/2 se compare karo.**

**👀 Ab yeh gayab hain:** Users, Settings, Audit Trail, Report Scheduler, SLA Dashboard, Audit Cost, Webhooks, Permission Matrix, Risk-Based Scheduler, Sampling Engine.

**👀 Yeh abhi bhi hain:** Audits, Findings, Risks, Controls, Questionnaire, Reports, Documents…

> **💡 Yeh kahan se aaya?** [AuthContext.jsx:89](../../frontend-react/src/context/AuthContext.jsx):
> ```js
> 'Audit Manager': { hidden: AUDITOR_HIDDEN.slice(0, 10) },
> ```
> Matlab `AUDITOR_HIDDEN` list ke **pehle 10** items chhupa do.
>
> **⚠️ Yeh code smell hai** — `.slice(0, 10)` ek "magic number" hai. Kal koi us list me ek item aage jod de, to Audit Manager ka menu bina wajah badal jayega. Chapter 11 me isko theek karne layak cheezon me rakhunga.

---

## ▶️ Kaam 2 — Apna audit kholo

Sidebar → **Audits** → apne `Handbook Test Audit` par click karo.

> **💡 Row par click karna kaam karta hai** — yeh pehle **toota hua tha**. Comment dekho [Audits.jsx:89](../../frontend-react/src/pages/Audits.jsx):
> *"Was console.log — the row looked clickable but went nowhere."*

**👀 Detail page dikhega, 5 tabs ke saath:** Overview · Lifecycle · Evidence · Findings · Questionnaire

## ▶️ Kaam 3 — Lifecycle tab kholo

**Lifecycle** tab dabao.

**👀 Dikhega:** 12 golon ki ek line —
`Planning → Scoping → Risk Assessment → Questionnaire → Auditor Assigned → Execution → Evidence Review → Findings → Corrective Actions → Verification → Report → Closed`

- **Hara ✓** = ho chuka
- **Sunehra (golden)** = abhi yahan ho
- **Grey** = aage aana hai

Abhi pehla gola (Planning) sunehra hoga.

> **💡 Yeh sirf dikhawa nahi hai.** Database me har audit ek number rakhta hai — `stageIdx` (0 se 11). Yeh page us number ko 12 golon me dikha raha hai. Poori list [audit.service.js:8](../../backend/modules/audits/audit.service.js) me hai, aur wahi list frontend me bhi dobara likhi hai [AuditDetail.jsx:8](../../frontend-react/src/pages/AuditDetail.jsx) me.
>
> **⚠️ Yeh duplicate list ek technical debt hai** — do jagah same 12 naam. Ek jagah badla aur doosri bhool gaye, to UI aur database alag baat kahenge.

---

# ⭐ Kaam 4 — Auditor Assign karo (is chapter ka dil)

**Overview** tab par jao → dayein taraf **"Audit Team"** box dikhega.

Abhi likha hoga: *"No auditors assigned yet"*.

## 🧪 Experiment 1 — Dropdown me kaun-kaun hai?

Dropdown kholo.

**👀 Dikhega:** kuch naam, har ek ke aage uska role —
`Rohit Kapoor — Auditor`, `Ananya Desai — Auditor`… waghairah.

**👀 Aur yeh log NAHI dikhenge:**
- `Priya Sharma — Compliance Manager` (role audit-capable nahi)
- `Arjun Verma — Risk Manager` (role audit-capable nahi)
- `Meera Nair` — **aap khud**

Box ke neeche likha bhi hai:
> *"Only active Auditors, Audit Managers and CA / Consultants in your organization appear here. People already on this audit — and you yourself — are excluded, because nobody may staff themselves onto an audit they administer."*

## 🧪 Experiment 2 — `Ananya Desai` ko dhundo

**👀 Woh list me nahi hai** — jabki uska role `Auditor` hai!

**Kyun?** Kyunki seed me uska status `On Leave` hai, `Active` nahi ([seed.js:95](../../scripts/seed.js)).

Server ki query dekho ([audit.service.js:93-101](../../backend/modules/audits/audit.service.js)):
```js
return User.find({
  ...orgFilter(orgId),
  status: 'Active',                        // ← isliye Ananya nahi aayi
  role: { $in: ASSIGNABLE_AUDITOR_ROLES },  // ← isliye Priya nahi aayi
})
```

## ▶️ Ab `Rohit Kapoor` ko assign karo

Dropdown se `Rohit Kapoor — Auditor` chuno → **Assign**

**👀 Teen cheezein ek saath hongi:**

1. **Rohit ka chip** aa jayega, jispar likha hoga **`· lead`**
   *(pehla auditor apne-aap lead ban jaata hai — [audit.service.js:144](../../backend/modules/audits/audit.service.js))*

2. **Status badal jayega** → `Planning` se seedha **`Auditor Assigned`**
   *(stage 0 se 4 par kood gaya — [audit.service.js:146-149](../../backend/modules/audits/audit.service.js))*

3. **Rohit ko notification chala gaya** *(database me — [audit.service.js:153-160](../../backend/modules/audits/audit.service.js))*
   Act 4 me jab Rohit login karega, uski ghanti (🔔) par yeh dikhega.

**▶️ Lifecycle tab dobara kholo** — ab 5th gola (Auditor Assigned) sunehra hoga, pehle 4 hare.

---

## ⭐ Ab 4 Independence Rules — audit software ka asli matlab

Auditor assign karte waqt server **4 jaanch** karta hai ([audit.service.js:109-141](../../backend/modules/audits/audit.service.js)).
Comment me saaf likha hai kyun:

> *"Previously this accepted any free-text name and ran no checks at all, so a manager could appoint themselves to audit their own work — exactly the control failure the software is meant to prevent."*

| # | Rule | Kyun |
|---|---|---|
| **1** | Auditor ek **asli, Active user** hona chahiye | Warna aise audit ban jaate the jinka auditor exist hi nahi karta |
| **2** | Uska **role audit-capable** ho (Auditor / Audit Manager / CA) | Document Manager audit nahi kar sakta |
| **3** | **Khud ko assign nahi kar sakte** | Apne kaam ki jaanch khud karna = poora audit bekaar |
| **4** | **Jis company ka audit ho raha hai, uska banda auditor nahi** | Yahi "independence" hai — audit ka mool siddhant |

### 🧪 Experiment 3 — Rule 3 ko todne ki koshish karo

Dropdown me apna naam (`Meera Nair`) dhundo — **milega hi nahi**, UI ne pehle hi hata diya ([AuditDetail.jsx:125-127](../../frontend-react/src/pages/AuditDetail.jsx)).

**Par UI ki rok asli rok nahi hai.** Server ki rok asli hai.

**▶️ Server ko seedha test karo.** Ek naya PowerShell terminal kholo:

```powershell
# 1. Meera ka token lo
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"meera.nair@globaltech.com","password":"password123"}'
$token = $login.data.accessToken

# 2. Apna audit dhundo
$audits = Invoke-RestMethod -Uri "http://localhost:3000/api/audits" `
  -Headers @{ Authorization = "Bearer $token" }
$auditId = ($audits.data | Where-Object { $_.title -eq "Handbook Test Audit" })._id
$auditId

# 3. Ab KHUD KO assign karne ki koshish karo
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/audits/$auditId/assign-auditor" `
    -Method Post -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" -Body '{"auditor":"Meera Nair"}'
} catch {
  $_.ErrorDetails.Message
}
```

**👀 Yeh milega:**
```
403 — "You cannot assign yourself as an auditor on an audit you administer"
```

> **🎯 Yeh is poore handbook ka sabse important experiment hai.**
>
> Aapne UI ko poori tarah bypass kiya — seedha server se baat ki — **aur phir bhi rok gaye.**
>
> **Yahi is app ka sabse zaroori design rule hai:**
> ```
> UI  = suvidha (galat option dikhao hi mat)
> API = suraksha (galat kaam hone hi mat do)
> ```
>
> Aap poore project me yeh pattern dekhoge: har niyam **do jagah** hota hai. Jab aap koi naya feature banao, **dono jagah** lagana — sirf UI me lagana matlab koi rok hi nahi.

---

## 🔴 Yahan Kya Toota Hai — Act 3 ka sach

| Cheez | Haalat |
|---|---|
| Auditor assign / unassign | ✅ **Kaam karta hai** |
| 4 independence rules | ✅ **Server par lage hain — tested** |
| Auto stage advance (0 → 4) | ✅ **Kaam karta hai** |
| Notification bhejna | ✅ **Kaam karta hai** |
| Lifecycle stage list | ⚠️ **Do jagah likhi hai** (backend + frontend) — drift ka khatra |
| `AUDITOR_HIDDEN.slice(0, 10)` | ⚠️ **Magic number** — list badli to menu tootega |
| "Audit Program" menu item | ❌ **Khali stub** |

---

## ✅ Checkpoint — Act 3

**1. `Ananya Desai` ka role `Auditor` hai, phir bhi dropdown me kyun nahi aayi?**

<details><summary>Jawab</summary>

Uska status `On Leave` hai, `Active` nahi. Server ki query me `status: 'Active'` ki shart hai ([audit.service.js:93-101](../../backend/modules/audits/audit.service.js)).
</details>

**2. Pehla auditor assign karte hi status `Planning` se `Auditor Assigned` kyun ho gaya?**

<details><summary>Jawab</summary>

`assignAuditor()` me ek auto-advance hai: agar `stageIdx < 4` ho to usko 4 par set kar do ([audit.service.js:146-149](../../backend/modules/audits/audit.service.js)) — kyunki team lag gayi matlab woh stage ho hi chuka.
</details>

**3. UI ne mera naam dropdown se hata diya. To kya server par bhi rok honi chahiye? Kyun?**

<details><summary>Jawab</summary>

**Haan, zaroor.** UI ki rok koi bhi bypass kar sakta hai (jaise humne PowerShell se kiya). Asli rok server par hai — `ForbiddenError` phenkta hai ([audit.service.js:133-135](../../backend/modules/audits/audit.service.js)). **UI suvidha hai, API suraksha.**
</details>

**4. `AUDITOR_HIDDEN.slice(0, 10)` me kya dikkat hai?**

<details><summary>Jawab</summary>

Yeh position par nirbhar hai, naam par nahi. Agar koi us array me beech me ek item jod de, to Audit Manager ka menu bina soche badal jayega — aur kisi test me pakda nahi jayega.
</details>

---

## 🤝 Handover

**Aapne kya kiya:** Rohit Kapoor ko auditor lagaya, audit stage 4 par pahunch gaya, Rohit ko notification gaya.
**Ab kya chahiye:** koi zameeni kaam kare — evidence dekhe, findings likhe.

Woh kaam **Auditor** ka hai.

**➡️ Agla: [Chapter 5 — Act 4: Auditor](05-act4-auditor.md)**
