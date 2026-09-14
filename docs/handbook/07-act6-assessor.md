« [Chapter 6 — Act 5](06-act5-applicant.md) | **Chapter 7 · Act 6** | [Chapter 8 — Baaki Roles →](08-support-roles.md)

---

# 🎬 Act 6 — Assessor / Reviewer

> **Login:** `reviewer@globaltech.com` / `password123`
> **Time:** 60 min
> **Kahani me jagah:** Vendor ne jawab de diya. Ab jaanch aur faisla — aur audit band.

**Yeh kahani ka aakhri Act hai.** Yahan sab jodkar band hoga.

---

## Yeh role hai kaun?

**Reviewer = doosri nazar.**

Auditor kaam karta hai, Reviewer **jaanchta** hai. Do alag log kyun? Kyunki jisne kaam kiya woh apni galti nahi dekh paata — yeh audit ka basic siddhant hai.

Reviewer ko lagbhag sab dikhta hai, sirf admin cheezein nahi ([AuthContext.jsx:91](../../frontend-react/src/context/AuthContext.jsx)):
```js
'Reviewer': { hidden: [...ADMIN_ONLY, 'users'] },
```

---

## ▶️ Kaam 1 — Assessment Queue kholo

Sidebar → **Assessment Queue** (`/assessor-queue`)

**👀 Dikhega:** ek table, upar do filter — **Status** (default `Submitted`) aur **Financial Year**.

Har row me:

| Column | Kya batata hai |
|---|---|
| Applicant | Kisne bhara |
| Year | Kaunsa financial year |
| Status | Draft / Submitted / Under Assessment / Assessed / Approved / Returned |
| **Answered** | Progress bar — `12/12` |
| **Score** | `85 / 100` |
| — | **Assess** button |

Act 5 wali submission yahan dikhni chahiye.

> **💡 Yeh page bahut halka hai — aur yeh jaan-boojh kar hai.**
>
> Comment padho ([AssessorQueue.jsx:9-16](../../frontend-react/src/features/questionnaire/pages/AssessorQueue.jsx)):
> *"Reads the submission headers only… a row shows how far along a questionnaire is and what it has scored without touching a single answer. In the system this replaces the same list would have read 2.3 MB per row."*
>
> **Yeh Chapter 1 wala design yahan dikh raha hai:** submission sirf "header" hai (status + totals), jawab alag collection me. Isliye 200 vendors ki list bhi turant khulti hai.
>
> **⚠️ Iski ek keemat hai:** totals "counters" hain jo likhte waqt update hote hain, aur counters **drift** kar sakte hain. Isiliye `recomputeTotals()` maujood hai aur **har state change par chalta hai** ([submission.service.js:98-136](../../backend/modules/questionnaires/submission.service.js)) — *"a counter that can only be incremented is a counter that drifts, and drift in a score is not something anyone will notice until it matters."*

### ▶️ Status filter badal kar dekho

`Submitted` se `Draft` kar do → jo submissions abhi bhare ja rahe hain woh dikhenge.

> **💡 Default `Submitted` kyun hai?** *"Submitted first: that is the queue. The others are here to be found, not to be worked through."*

---

## ▶️ Kaam 2 — Assess kholo

**Assess** button dabao.

**👀 Dikhega:**
- Upar dayein: **Score** — `85 / 100` aur `85%`
- Bayein: Sections list + ek sunehra button **"Re-run scoring rules"**
- Beech me: har sawaal ka **ReviewCard** — sawaal, vendor ka jawab, aur marks
- Neeche chipka: **"Return to applicant"** aur **"Complete assessment"**

### ⭐ Dhyan do — marks pehle se bhare hue hain

**Aapko koi "Score" button dabana nahi pada.** Scoring Act 5 me submit karte hi chal chuki thi.

> **💡 Yeh design faisla hai** ([AssessSubmission.jsx:14-20](../../frontend-react/src/features/questionnaire/pages/AssessSubmission.jsx)):
> *"a 'score' button the assessor presses first means whoever forgets reviews a questionnaire that appears to have scored nothing, and there is no way for them to tell that from a real zero."*
>
> Yani agar assessor button dabana bhool jaye, to usko lagega vendor ko 0 mila — jabki asal me scoring chali hi nahi thi.

### 🧪 Agar upar laal banner dikhe

> **The rules did not run when this was submitted** — … *The marks below are not a score until you re-run them.*

Yeh Act 5 wala `scoringError` hai. **Ab "Re-run scoring rules" dabao.**

---

## ▶️ Kaam 3 — Ek jawab review karo

Kisi ReviewCard par:
- Marks badlo (hand se)
- Comment likho
- Status set karo: `Reviewed` / `Accepted` / `Flagged`

Save karo. **👀 Upar ka Score turant update ho jayega.**

> **💡 Kyun turant?** Kyunki server review ke baad totals dobara ginta hai, aur frontend header dobara padhta hai ([AssessSubmission.jsx:86-87](../../frontend-react/src/features/questionnaire/pages/AssessSubmission.jsx)) — *"The review recomputes totals server-side, so the header must catch up."*

### 🧪 Experiment — machine insaan ko overrule nahi karti

1. Kisi sawaal ke marks **hand se** badlo (jaise 10 → 7)
2. Ab **"Re-run scoring rules"** dabao
3. Confirmation kehti hai: *"Marks you have set by hand are kept. Everything else is recalculated."*
4. Haan karo

**👀 Toast aayega:** `X scored, Y left as set.`

**👀 Aapka 7 wahi rahega** — rule ne usko 10 wapas nahi kiya.

Code ([scoring.service.js:109-115](../../backend/modules/questionnaires/scoring.service.js)):
```js
// A mark somebody set by hand is left exactly as it is.
if (response.overridden) { skipped += 1; ... continue; }
```

> **🎯 Yeh is product ka sabse zaroori vasool hai:**
> *"A rule quietly replacing a human decision is worse than a rule that never ran: the assessor would have no way to tell it happened."*
>
> Machine **madad** karti hai, **faisla** insaan ka rehta hai. Ek audit product me isse zyada important koi cheez nahi.

---

## ▶️ Kaam 4 — Ab do raaste

### 🔙 Raasta A — Wapas bhejo

**"Return to applicant"** dabao.

Server me kya hoga ([submission.service.js:228-240](../../backend/modules/questionnaires/submission.service.js)):
```js
submission.status = 'Returned';
submission.applicantSubmittedAt = null;   // ← applicant dobara bhar sakta hai
// assessor ka apna timestamp RAHTA hai — kyunki woh review sach me hua tha
await submission.save();
```

> **💡 Baareek baat:** `applicantSubmittedAt` mit jaata hai (taaki taala khul jaye), par `assessorSubmittedAt` **rehta hai** — *"the assessor's own timestamp stays, because that review did happen."* Itihaas mitaya nahi jaata.

**▶️ Test karo:** Act 5 wale user se dobara login karo → questionnaire ab **editable** hai.

### ✅ Raasta B — Poora karo

**"Complete assessment"** dabao.

**👀 Agar kuch sawaal review nahi hue:** *"3 answers have not been reviewed in this section. Complete anyway?"*
Yeh **rokta nahi**, sirf batata hai — Act 5 wale submit se alag, jo sach me rokta hai.

**👀 Status ho jayega `Assessed`**, page read-only.

Server jaanchta hai ([submission.service.js](../../backend/modules/questionnaires/submission.service.js)):
- Sirf reviewer role hi kar sakta hai
- **Applicant ne submit kiya hona chahiye** — warna: *"The applicant has not submitted yet"*
- Totals dobara gine jaate hain
- **Aur kis ne assess kiya, woh `assessedBy` me likh diya jaata hai** — agla step isi par tika hai

> **⚠️ Par yahan kahani khatam nahi hoti.** Neeche dekho.

---

## ▶️ Kaam 4b — Approve (score final karna) 🔒

Page read-only ho gaya, par neeche ab bhi ek bar hai:

> *Assessment complete. The score is final once it is approved.*
> **[Return to applicant]** **[APPROVE]**

### 🧪 Experiment — apni hi assessment approve karke dekho

Aap (`reviewer@globaltech.com`) ne abhi assess kiya hai. Ab **Approve** dabao.

**👀 Do me se ek hoga:**

| | |
|---|---|
| Button dikhega hi nahi / error | *"Only an administrator or compliance manager can approve an assessment"* — Reviewer approve nahi kar sakta |
| Agar aap Compliance Manager hote | *"You assessed this submission, so you cannot also approve it"* |

**▶️ Ab sahi tareeke se karo:** logout → `org.admin@globaltech.com` se login → Assessment Queue → wahi submission → **Approve**

**👀 Status `Approved` ho jayega.** Score ab final hai.

### ⭐ Yeh step pehle tha hi nahi

> **🔧 `Approved` aur `adminApprovedAt` model me shuru se the — par unhe set karne wala kuch tha hi nahi.**
>
> Flow `Assessed` par ruk jaata tha. Matlab **ek assessor ke kehne bhar se score final ho jaata tha.** Model kehta tha "doosri nazar design ka hissa hai"; code ne woh nazar kabhi maangi hi nahi.

**Ab teen rok hain:**

| Rok | Kyun |
|---|---|
| Sirf Super Admin / Org Admin / Compliance Manager | Score final karna programme ki zimmedari hai, har marking karne wale ki nahi |
| **Jisne assess kiya, wahi approve nahi kar sakta** | Wahi niyam jo evidence verification aur auditor assignment par hai |
| Sirf `Assessed` se, aur ek hi baar | Adhure ya dobara approve se bachne ke liye |

> **💡 Teesri rok ke liye model me `assessedBy` jodna pada.**
>
> Aap soch sakte ho: "audit trail me to pehle se likha hai kisne kya kiya, wahi se padh lo." Baat sahi hai — **par ek niyam log se lagu nahi hota.** Check ko woh id **usi document par** chahiye jiske baare me faisla ho raha hai. Log itihaas ke liye hai, rok lagane ke liye nahi.

---

## ▶️ Kaam 5 — CAPA (kami theek karwana)

Sidebar → **CAPA**

**CAPA = Corrective and Preventive Action.** Finding ne bataya "kya galat hai"; CAPA batata hai "**theek kaise kar rahe hain**".

**"+ Create" → "New CAPA"** se ek banao — finding se jodkar.

> **💡 CAPA sirf 4 roles ko milta hai** ([AuthContext.jsx:123](../../frontend-react/src/context/AuthContext.jsx)): Super Admin, Organization Admin, Compliance Manager, **Reviewer**.
>
> **Auditor ko nahi.** Kyun? Jisne kami dhundhi, wahi uska "theek ho gaya" ka certificate na de. Yeh phir wahi **segregation of duties** hai.
>
> Aur dekho ki comment me kya likha hai ([AuthContext.jsx:97-99](../../frontend-react/src/context/AuthContext.jsx)):
> *"'capa' is deliberately absent [for CA / Consultant]: /api/capa is restricted to… so showing the nav item here only produced a 403 after the click."*
>
> **Yeh us 403-on-click parivaar ka hi bug tha** jo [Act 5](06-act5-applicant.md) me mila — CAPA wala pehle pakad liya gaya tha, Act 5 wala reh gaya tha. **Ab dono theek hain**, aur [rbac-parity test](../../tests/unit/rbac-parity.test.js) is kism ke naye bug ko pakad lega.

---

## ▶️ Kaam 6 — Audit band karo 🏁

Sidebar → **Audits** → `Handbook Test Audit`

**Overview → "Advance Stage →"** baar-baar dabao:

```
Findings → Corrective Actions → Verification → Report → Closed
```

### 🛑 Aakhri kadam par aap ruk jaoge — aur yeh sahi hai

Jab `Report` se `Closed` jaane ki koshish karoge:

**👀 Laal error:**
```
1 finding has not been acknowledged.
Assign an owner and acknowledge them before closing the audit.
```

Yaad hai [Act 4](05-act4-auditor.md) me aapne ek finding banayi thi — *"Access reviews not performed quarterly"*? Woh abhi bhi `Open` hai. **Usko kisi ne uthaya hi nahi.**

**▶️ Theek karo:** Sidebar → **Findings** → us finding par **Edit** → Status: **Acknowledged** → Owner bhi daalo → Save.

**▶️ Ab wapas audit par jao aur "Advance Stage" dabao.**

**👀 Ab `Closed` ho jayega.** Lifecycle tab me **saare 12 gole hare**.

**▶️ Ek baar aur dabao:** *"Audit is already closed"* ([audit.service.js](../../backend/modules/audits/audit.service.js))

Aur jab audit `Closed` hua, `completedAt` par time likh diya gaya.

### ⭐ Yeh rok pehle nahi thi

> **🔧 Pehle aap "Advance Stage" dabate raho aur audit band ho jaata tha** — chahe aisi findings padi hon jinhe kisi ne **dekha tak na ho**.
>
> Ek audit platform me yeh ulta hai: **band hone wala audit hi woh hai jo report hota hai.** Usme likha ho ki "kaam poora" jabki uske nateeje koi padha bhi nahi — yahi ek haalat hai jo system ko banne hi nahi deni chahiye.

> **💡 Rok "resolve" par nahi, "acknowledge" par kyun?**
>
> Asli duniya me audit band hote waqt findings **khuli hoti hain** — unpar CAPA mahinon chalta rehta hai. `Acknowledged` aur `In Progress` ka matlab hai **owner hai, plan hai** — us haalat me audit band karna bilkul sahi hai.
>
> Par `Open` aur `Reopened` ka matlab hai **kisi ne uthaya hi nahi**. Bas wahi roka gaya hai.
>
> **Aur beech ke stages par koi asar nahi** — khuli findings ke saath bhi audit `Planning` se `Report` tak aaram se badhta rahega. Sirf aakhri darwaze par jaanch hai.

# 🎉 Kahani poori hui

```
Org Admin ne team banayi
   → Compliance Manager ne audit + sawaal banaye
      → Audit Manager ne auditor lagaya
         → Auditor ne findings likhe
            → Applicant ne jawab diye, scoring chali
               → Reviewer ne jaancha  (Assessed)
                  → Admin ne approve kiya  (Approved) 🔒
                     → Findings acknowledge huin, CAPA bana
                        → Audit CLOSED ✅
```

**Aapne poora product chalake dekh liya.**

> **📌 Dhyan do ki aakhri do kadam me 3 alag log the:**
> assess karne wala, approve karne wala, aur findings ka owner.
>
> **Yeh sanyog nahi hai** — audit software ka poora matlab hi yahi hai ki koi ek banda akela shuru se ant tak na le ja sake. Aapne yeh niyam is safar me **teen jagah** dekha: auditor assignment ([Act 3](04-act3-audit-manager.md)), evidence verification, aur ab approval.

---

## 🔴 Yahan Kya Toota Hai — Act 6 ka sach

| Cheez | Haalat |
|---|---|
| Assessment Queue (halka, filter ke saath) | ✅ **Achha bana hai** |
| Marks pehle se bhare aana | ✅ **Kaam karta hai** |
| Re-run scoring + override bachana | ✅ **Bahut achha** |
| Return / Complete flow | ✅ **Kaam karta hai** |
| `scoringError` ka banner | ✅ **Achhi soch** |
| Audit close + "already closed" rok | ✅ **Kaam karta hai** |
| CAPA CRUD | ✅ **Kaam karta hai** |
| **`Approved` status** | ✅ **🔧 FIX ho gaya** — Approve button + segregation of duties |
| **Audit close hone par verification** | ✅ **🔧 FIX ho gaya** — bina acknowledge kiye findings par close nahi hoga |
| Verification / Report stage ka apna page | ❌ **Nahi hai** — sirf stage naam badalta hai ([Phase 3](11-what-next.md)) |
| Management Response, Exceptions | ❌ **Khali stubs** — [Phase 3 ka faisla](11-what-next.md) |

### 🔧 Is chapter ke fixes

#### 1. `Approved` ab sach me pahunchne layak hai

Pehle model me 6 status the aur `adminApprovedAt` field bhi — **par unhe set karne wala kuch tha hi nahi.** Flow `Assessed` par ruk jaata tha, matlab ek assessor ke kehne bhar se score final ho jaata tha.

**Ab:**
```
Assessed → [Approve] → Approved
```

**Aur uspar teen rok hain:**

| Rok | Kyun |
|---|---|
| Sirf Super Admin / Organization Admin / Compliance Manager | Score final karna programme ki zimmedari hai, har marking karne wale ki nahi |
| **Jisne assess kiya wahi approve nahi kar sakta** | Wahi niyam jo evidence verification aur auditor assignment par hai — jo record banata hai woh uspar mohar nahi lagata |
| Sirf `Assessed` se, aur ek hi baar | Adhure ya dobara approve se bachne ke liye |

Iske liye model me `assessedBy` aur `approvedBy` jode gaye — **audit trail me actor to pehle se tha, par ek niyam log se lagu nahi hota**, usko document par id chahiye.

#### 2. Audit ab khuli findings par band nahi hota

Pehle "Advance Stage" dabate raho aur audit `Closed` ho jaata tha — chahe aisi findings padi hon **jinhe kisi ne dekha tak na ho**.

**Ab closing par ek shart hai:** koi bhi finding `Open` ya `Reopened` me nahi honi chahiye.

> **Rok "resolve" par nahi, "acknowledge" par hai — aur yeh soch-samajh kar hai.**
>
> Asli duniya me audit close hote waqt findings khuli hoti hain; unpar CAPA chalta rehta hai. To `Acknowledged` aur `In Progress` par rokna galat hota.
>
> Par `Open`/`Reopened` ka matlab hai **kisi ne uthaya hi nahi**. Audit "poora ho gaya" likhna jabki uske nateeje koi padha bhi nahi — yahi ek haalat hai jo audit platform ko banne nahi deni chahiye.

Error saaf batata hai: *"3 findings have not been acknowledged. Assign an owner and acknowledge them before closing the audit."*

**Aur baaki stages par koi asar nahi** — beech ke stage khuli findings ke saath aage badhte rahenge.


---

## ✅ Checkpoint — Act 6

**1. Assessment queue itni tez kyun khulti hai, chahe 200 submissions hon?**

<details><summary>Jawab</summary>

Woh sirf submission ke **headers** padhta hai — status aur stored totals. Jawab alag collection (`QuestionnaireResponse`) me hain aur chhue hi nahi jaate ([AssessorQueue.jsx:9-16](../../frontend-react/src/features/questionnaire/pages/AssessorQueue.jsx)).
</details>

**2. Stored totals ka khatra kya hai aur usse kaise sambhala gaya?**

<details><summary>Jawab</summary>

Counters **drift** kar sakte hain (galat ho jaate hain). Isliye `recomputeTotals()` unhe jawaabon se dobara banata hai, aur woh **har state change par** chalta hai — submit, review, assess ([submission.service.js:98-136](../../backend/modules/questionnaires/submission.service.js)).
</details>

**3. Assessor ne hand se marks 7 kiye. Ab rules dobara chalein to kya hoga?**

<details><summary>Jawab</summary>

**7 hi rahega.** `response.overridden` `true` hai, to scoring us sawaal ko chhodkar aage badh jaati hai. Toast batata hai: `X scored, Y left as set`. *"A rule quietly replacing a human decision is worse than a rule that never ran."*
</details>

**4. "Return to applicant" par kaunsa timestamp mitta hai aur kaunsa rehta hai — kyun?**

<details><summary>Jawab</summary>

`applicantSubmittedAt` **mitta hai** (taaki applicant dobara bhar sake). `assessorSubmittedAt` **rehta hai**, kyunki woh review sach me hua tha — itihaas mitaya nahi jaata.
</details>

**5. Auditor ko CAPA menu me kyun nahi milta?**

<details><summary>Jawab</summary>

`/api/capa` sirf Super Admin, Organization Admin, Compliance Manager, Reviewer ko allow karta hai. **Segregation of duties** — jisne kami dhundhi, wahi uska "theek ho gaya" certificate na de.
</details>

**6. Aapne assess kiya. Ab aap hi approve kyun nahi kar sakte?**

<details><summary>Jawab</summary>

Wahi **segregation of duties** — jo record banata hai woh uspar mohar nahi lagata. Approval jo assessor khud de sake, woh **control nahi, sirf ek click** hai.
Yeh niyam is app me teen jagah hai: auditor assignment, evidence verification, aur ab approval.
</details>

**7. "Kisne assess kiya" audit trail me to likha hi hai. Phir model me `assessedBy` field kyun jodni padi?**

<details><summary>Jawab</summary>

Kyunki **ek niyam log se lagu nahi hota.** Audit trail itihaas ke liye hai — "kya hua tha" batane ke liye. Rok lagane wale check ko woh id **usi document par** chahiye jiske baare me faisla ho raha hai, taaki woh sasti aur bharosemand ho.
</details>

**8. Audit close par rok `Resolved` par kyun nahi, `Acknowledged` par kyun?**

<details><summary>Jawab</summary>

Kyunki asli duniya me audit band hote waqt findings khuli hoti hain — CAPA mahinon chalta rehta hai. `Resolved` maangna galat hota aur log stage ko zabardasti aage badhate.
`Acknowledged`/`In Progress` = **owner hai, plan hai** → band karna sahi.
`Open`/`Reopened` = **kisi ne uthaya hi nahi** → yahi roka gaya hai.
</details>

---

## 🤝 Aage

Kahani khatm. Ab teen chhote chapters bache hain:

- **[Chapter 8](08-support-roles.md)** — Risk Manager, Document Manager, CA / Consultant
- **[Chapter 9](09-architecture.md)** — code ki taraf: ek click se database tak
- **[Chapter 10](10-file-map.md)** — poora naksha: kya zinda, kya murda

**➡️ Agla: [Chapter 8 — Baaki Roles](08-support-roles.md)**
