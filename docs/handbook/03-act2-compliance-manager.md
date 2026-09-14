« [Chapter 2 — Act 1](02-act1-org-admin.md) | **Chapter 3 · Act 2** | [Chapter 4 — Act 3 →](04-act3-audit-manager.md)

---

# 🎬 Act 2 — Compliance Manager

> **Login:** `priya.sharma@globaltech.com` / `password123`
> **Time:** 60 min (sabse lamba chapter — do bade kaam hain)
> **Kahani me jagah:** Team taiyar hai. Ab asli kaam khada karo.

---

## Yeh role hai kaun?

**Compliance Manager = rozmarra ka boss.**

Organization Admin log rakhta hai. Compliance Manager **kaam** banata hai:
- Audit shuru karta hai
- Questionnaire (sawaal) likhta hai aur publish karta hai

Isko bhi menu me **sab kuch** dikhta hai (`allowedAll: true`).

> **💡 Product ka asli "main user" yahi role hai.** Backend me ek jagah comment bhi hai ki *"the product's primary + Create → New Audit flow is built for that role"* ([rbac.js:27-33](../../backend/middleware/rbac.js)) — pehle yeh role list me se chhoot gaya tha aur wizard 403 de raha tha.

---

# 🅰️ Hissa 1 — Audit banao

## ▶️ Kaam 1 — Audits page kholo

Sidebar → **Audits**

**👀 Dikhega:** audits ki table, upar filter pills (All / Planning / In Progress / Closed), aur upar dayein **"+ New Audit"** button.

> **🔧 Yeh button pehle nahi tha.** Jab yeh handbook likhi gayi thi, Audits page par create karne ka koi tareeka hi nahi tha — audit sirf topbar ke "+ Create" se banta tha. Matlab jis page par log audit shuru karne jaate hain, wahi ek page tha jahan se shuru nahi hota tha.
>
> **Ab theek kar diya gaya hai** ([Audits.jsx](../../frontend-react/src/pages/Audits.jsx)). Dono jagah se ban sakta hai.

## ▶️ Kaam 2 — Doosra raasta: upar dayein "+ Create"

Topbar me (upar dayein taraf) **"+ Create"** dabao.

**👀 Dikhega — 9 options ka menu** ([Topbar.jsx:13-23](../../frontend-react/src/components/Topbar.jsx)):

| Option | Kya karta hai |
|---|---|
| **New Audit** | `/audits?new=1` — wizard khud khul jaata hai |
| New Finding | `/findings?new=1` par le jaata hai — wahan dialog khud khul jaata hai |
| New CAPA | `/capa?new=1` |
| New Risk | `/risks?new=1` |
| Add Certificate | `/certificates?new=1` |
| Add Vendor | `/vendors?new=1` |
| Add User | `/users?new=1` |
| Upload Document | `/documents` |
| Invite Vendors (bulk) | `/bulk-invite` |

> **💡 Woh `?new=1` kya hai?** Woh page kholte hi uska "create" dialog apne-aap khol deta hai ([useCreateFromUrl.js](../../frontend-react/src/hooks/useCreateFromUrl.js)). Pehle yeh menu sirf list page par chhod deta tha aur user button dhoondta rehta tha — comment me likha hai.
>
> **Ab saare 9 items ek hi tareeke se kaam karte hain:** list page par le jao, aur list page apna wizard khol de. Pehle "New Audit" akela alag tha — woh topbar me hi apna modal kholta tha, isiliye Audits page par button banaya hi nahi gaya.

## ▶️ Kaam 3 — Audit wizard bharo

**"+ Create" → "New Audit"**

6 steps aayenge ([CreateAudit.jsx:7](../../frontend-react/src/pages/CreateAudit.jsx)):

| Step | Kya bharna hai |
|---|---|
| 1. Type & Title | 15 types me se ek chuno + party + title |
| 2. Framework | Seed ne jo frameworks banaye, unme se ek |
| 3. Scope & Risk | Scope likho, risk level chuno |
| 4. Assign Auditor | Lead auditor — **dropdown se** |
| 5. Dates | Start aur due date |
| 6. Review | Sab dekh lo → **Create Audit** |

Aise bharo:
- Type: **Supplier/Vendor Audit**, Party: **third-party**
- Title: `Handbook Test Audit`
- Framework: koi bhi
- Scope: `Testing the handbook flow`
- Risk: **High**
- **Lead Auditor: khaali chhod do** (Act 3 me assign karenge)
- Dates: kuch bhi

**Create Audit** dabao → Audits list par wapas aa jaoge, aapka naya audit dikhega with status **Planning**.

### ▶️ Step 4 par ruk kar ek cheez dekho

Lead Auditor **dropdown** hai, text box nahi.

Usme sirf yeh log dikhte hain: **Auditor, Audit Manager, CA / Consultant** — aur woh bhi sirf **Active** wale.

> **💡 Kyun dropdown?** Comment me likha hai ([CreateAudit.jsx:141](../../frontend-react/src/pages/CreateAudit.jsx)):
> *"Picked, not typed: a free-text lead produced audits naming people who did not exist."*
>
> Pehle yahan koi bhi naam type kar sakte the — to aise audit ban jaate the jinka auditor exist hi nahi karta tha. Ab list server se aati hai: `GET /api/audits/assignable-auditors`.

> **📌 Ek architecture detail dhyan dene layak:** yeh list `/api/users` se **nahi** aati, `/api/audits/...` se aati hai. Kyun? Kyunki `/api/users` sirf admin ke liye hai — Compliance Manager ko wahan 403 milta tha aur dropdown hamesha khaali rehta tha. Isliye woh endpoint audits router par rakha gaya ([audit.service.js:85-92](../../backend/modules/audits/audit.service.js)).

---

# 🅱️ Hissa 2 — Questionnaire likho (project ka dil)

> **🔧 Yahan bhi ek sudhaar hua hai.** Pehle `npm run seed` **koi questionnaire nahi banata tha** — to Act 5 tak pahunchne ke liye aapko 20 minute sawaal likhne padte the.
>
> **Ab seed 5 published sawaal banata hai** ([seed.js](../../scripts/seed.js) section 14):
>
> | Section | Sawaal | Type | Marks |
> |---|---|---|---|
> | Environment | ISO 14001 certificate hai? | RadioButton | 10 |
> | Environment | Emission-reduction measures | CheckBox | 15 |
> | Governance | Code of conduct board-approved? | RadioButton | 10 |
> | Governance | Risk register kitni baar review hota hai? | RadioButton | 10 |
> | Social | Grievance mechanism batao | Text | 5 |
>
> **Total 50 marks.** Sab **Published** hain aur **abhi ke financial year** me hain — matlab Act 5 seedha chal jayega.
>
> Agar aapne handbook shuru karne ke baad `npm run seed` nahi chalaya, to ab chala lo (⚠️ database khali karke naya data daalega).

## ▶️ Kaam 4 — Question list kholo

Sidebar → **Questions** (`/questionnaire-list`)

**👀 Dikhega:** 5 seeded sawaal, sab `Published` badge ke saath + upar filters (Financial Year, Type, Category, Search).

**Neeche khud ek naya sawaal banayenge, taaki authoring ka poora flow dikhe.**

## ▶️ Kaam 5 — Pehla sawaal banao

Sidebar → **Create Questionnaire** (`/questionnaire-create`)

**👀 Dikhega:** ek bada authoring form — [QuestionnaireEditor.jsx](../../frontend-react/src/features/questionnaire/pages/QuestionnaireEditor.jsx), 647 lines, project ka sabse bada single page.

Kam se kam yeh bharo:
- **Financial Year** — **abhi ka saal** chuno (jaise `2026`)
- **Section** — `Environment` (kuch bhi, par yaad rakhna)
- **Question text** — `Kya aapke paas ISO 14001 certificate hai?`
- **Answer type** — `Radio` (ek hi jawab chuna ja sake)
- **Options** — `Yes` (score 10), `No` (score 0)
- **Max Mark** — `10`

Save karo.

> **⚠️ Financial Year ka dhyan rakho.** Answer screen apne-aap **abhi ka saal** chunta hai ([AnswerQuestionnaire.jsx](../../frontend-react/src/features/questionnaire/pages/AnswerQuestionnaire.jsx)). Agar aapne sawaal `2028` me banaya aur vendor `2026` par khada hai, to usko us saal ke sawaal nahi dikhenge.
>
> **🔧 Pehle yeh chupchaap fail hota tha** — bas *"No questions in this section"* likha aata tha, aur atakne ki yahi sabse badi wajah thi.
>
> **Ab screen khud batati hai:** *"No questions for 2028-29 — Questions are published for a different year. Switch to: [2026-27]"* — aur us button par click karke turant sahi saal par ja sakte ho.

**Isi tarah 2-3 aur sawaal bana lo** — Act 5 aur 6 zyada maza denge.

## ▶️ Kaam 6 — Sawaal PUBLISH karo (yeh step skip mat karna)

Wapas **Questions** list par jao. Aapka sawaal dikhega with status **Draft**.

Uske aage **Publish** dabao.

**👀 Ek confirmation aayega:**
> *"It becomes answerable. After this, editing it creates a new version rather than changing it — so answers already given keep the wording they were shown."*

Haan karo. Status **Published** ho jayega.

### ⭐ Yeh sabse important concept hai — dhyan se padho

Sawaal ke **4 status** hote hain ([QuestionnaireList.jsx:30](../../frontend-react/src/features/questionnaire/pages/QuestionnaireList.jsx)):

| Status | Matlab | Vendor ko dikhega? |
|---|---|---|
| **Draft** | Author abhi likh raha hai | ❌ Nahi |
| **Published** | Taiyar hai, jawab diya ja sakta hai | ✅ **Haan** |
| **Superseded** | Iska naya version bana, yeh purana hai | ❌ Nahi |
| **Archived** | Wapas le liya gaya | ❌ Nahi |

Server me yeh ek line hai ([questionnaire.service.js](../../backend/modules/questionnaires/questionnaire.service.js)):
```js
const ANSWERABLE = { $nin: ['Superseded', 'Archived'] };
```

> **💡 Publish ke baad edit karne par kya hota hai?**
> Sawaal badalta **nahi** — uska **naya version** ban jaata hai, aur purana `Superseded` ho jaata hai.
>
> **Kyun?** Kyunki agar kisi ne purana sawaal padh kar jawab de diya, aur aap sawaal ka matlab hi badal do, to uska jawab **galat sawaal ka jawab** ban jaata hai. Audit me yeh sabse bura hai. Isliye purana version zinda rehta hai — taaki har jawab ke saath woh wording judi rahe jo us waqt dikhi thi.
>
> `Versions` button dabakar aap purane version dekh sakte ho.

---

## 🔴 Yahan Kya Toota Hai — Act 2 ka sach

| Cheez | Haalat |
|---|---|
| Audit banana (6-step wizard) | ✅ **Kaam karta hai** |
| Question likhna, publish, versioning | ✅ **Kaam karta hai — bahut achha bana hai** |
| Auditor dropdown (server se, validated) | ✅ **Kaam karta hai** |
| Audits page par create button | ✅ **🔧 FIX ho gaya** — ab "+ New Audit" button hai |
| Seed me questionnaire data | ✅ **🔧 FIX ho gaya** — 5 published sawaal, 50 marks |
| Financial year mismatch par warning | ✅ **🔧 FIX ho gaya** — saaf message + sahi saal ka button |
| Sidebar me "Q-Scoring", "Sampling Engine", "Self Assessment" | ❌ **Khali stubs** — [Phase 3 ka faisla](11-what-next.md) |

### 🔧 Is chapter ke fixes (kya-kya badla)

| # | Kya | Kahan |
|---|---|---|
| 1 | Audits page par "+ New Audit" button + khali-list par hint | [Audits.jsx](../../frontend-react/src/pages/Audits.jsx) |
| 2 | Topbar ka "New Audit" ab `?new=1` bhejta hai (baaki 8 items jaisa) | [Topbar.jsx](../../frontend-react/src/components/Topbar.jsx) |
| 3 | Wizard `onCreated` leta hai — list page par filter nahi tootta; submit ke baad form reset | [CreateAudit.jsx](../../frontend-react/src/pages/CreateAudit.jsx) |
| 4 | Seed 5 published sawaal banata hai (abhi ke FY me) | [seed.js](../../scripts/seed.js) |
| 5 | Khali questionnaire ab wajah batata hai aur sahi saal ka button deta hai | [AnswerQuestionnaire.jsx](../../frontend-react/src/features/questionnaire/pages/AnswerQuestionnaire.jsx) |

> **Baaki ek cheez — 3 stub pages — jaan-boojh kar nahi chhui.** Woh "bug" nahi hai, **scope ka faisla** hai: Q-Scoring, Sampling Engine aur Self Assessment banane hain ya sidebar se hata dene hain — yeh aapko tay karna hai, [Chapter 11 Phase 3](11-what-next.md) me.

---

## ✅ Checkpoint — Act 2

**1. Naya audit banane ke kitne raaste hain?**

<details><summary>Jawab</summary>

**Do, aur dono ek hi jagah pahunchte hain:**
1. Audits page par **"+ New Audit"** button
2. Topbar me **"+ Create" → "New Audit"** — jo `/audits?new=1` par le jaata hai, aur wahan wizard khud khul jaata hai

Pehle sirf doosra raasta tha, aur Audits page par koi button hi nahi tha.
</details>

**2. Aapne sawaal banaya par vendor ko khaali page dikha. Do sabse sambhavit wajah?**

<details><summary>Jawab</summary>

1. Sawaal **Publish nahi kiya** — `Draft` sawaal answerable nahi hote.
2. **Financial Year alag hai** — answer screen abhi ka saal chunta hai; sawaal kisi aur saal me bana hai.
</details>

**3. Published sawaal ko edit karne par kya hota hai, aur kyun?**

<details><summary>Jawab</summary>

Naya **version** banta hai, purana **Superseded** ho jaata hai. Kyunki jisne purana sawaal padh kar jawab diya tha, uska jawab us purani wording se juda rehna chahiye — warna woh galat sawaal ka jawab ban jayega.
</details>

**4. Lead Auditor dropdown `/api/users` ke bajaye `/api/audits/assignable-auditors` se kyun aata hai?**

<details><summary>Jawab</summary>

`/api/users` sirf Super Admin aur Organization Admin ke liye hai. Compliance Manager ko wahan **403** milta tha, isliye dropdown hamesha khaali rehta tha. Woh endpoint audits router par le jaaya gaya ([audit.service.js:85-92](../../backend/modules/audits/audit.service.js)).
</details>

---

## 🤝 Handover

**Aapne kya kiya:** ek audit banaya (status: Planning), aur kuch sawaal publish kiye.
**Ab kya chahiye:** audit par team lagni chahiye.

Woh kaam **Audit Manager** ka hai.

**➡️ Agla: [Chapter 4 — Act 3: Audit Manager](04-act3-audit-manager.md)**

> **Logout karo** aur agle chapter me naye user se login karna.
