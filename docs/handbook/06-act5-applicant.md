« [Chapter 5 — Act 4](05-act4-auditor.md) | **Chapter 6 · Act 5** | [Chapter 7 — Act 6 →](07-act6-assessor.md)

---

# 🎬 Act 5 — Applicant (jiski jaanch ho rahi hai)

> **Login:** `vendor.mgr@globaltech.com` / `password123`
> **Time:** 90 min — **sabse lamba aur sabse important chapter**
> **Kahani me jagah:** Sawaal taiyar hain. Ab jawab dene ki baari.

---

## ⚠️ Sabse pehle — ek asli bug ki chetavni

**Is chapter ka pehla kaam fail hoga. Aapki galti nahi hai. Yeh project ka ek asli bug hai.**

Main isko chhupa sakta tha aur aapko seedha workaround de sakta tha — par tab aap kabhi na jaante ki aapke product ka **sabse important flow toota hua hai**.

Pehle bug dekho, phir workaround se aage badhenge.

---

## ▶️ Kaam 1 — Vendor Manager se login karo

`vendor.mgr@globaltech.com` / `password123`

**👀 Sidebar ab bahut chhota hai.** Gayab: Audits, Findings, Risks, Controls, Questionnaire (authoring), Question Bank, Assessment Queue, CCM…

**👀 Bacha hai:** Dashboard, My Workspace, **Answer Questionnaire**, Documents, Evidence, Certificates, Vendors, Notifications.

> **💡 Yeh theek hai.** Vendor ko audit ke andar ka kuch nahi dikhna chahiye — na findings, na risks. Usko sirf **apne sawaal** dikhne chahiye. Yeh list [AuthContext.jsx:81](../../frontend-react/src/context/AuthContext.jsx) me `VENDOR_HIDDEN` hai.
>
> Dhyan do: `questionnaire` (authoring) chhupa hai, par `answer-questionnaire` **nahi** — kyunki *"Answering reaches further than authoring: an applicant is not an author"* ([AuthContext.jsx:131](../../frontend-react/src/context/AuthContext.jsx)).

## ▶️ Kaam 2 — "Answer Questionnaire" kholo

Sidebar → **Answer Questionnaire**

### 🔴 👀 Yeh dikhega — ek laal error banner:

```
Role 'Vendor Manager' does not have access to this module
```

**Aur ek bhi sawaal nahi dikhega.**

---

## 🔬 Bug ki jaanch — khud karke dekho

Yeh maine socha nahi, chalake dekha hai. Aap bhi dekho.

Backend chalna chahiye. Naya PowerShell terminal kholo:

```powershell
function T($email){
  (Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post `
    -ContentType "application/json" `
    -Body (@{email=$email;password="password123"}|ConvertTo-Json)).data.accessToken
}

foreach ($u in @("vendor.mgr@globaltech.com","jwhitfield@securecore.com","rohit.kapoor@globaltech.com")) {
  $t = T $u
  try {
    $null = Invoke-WebRequest "http://localhost:3000/api/questionnaires?limit=1" `
      -Headers @{Authorization="Bearer $t"} -UseBasicParsing
    "$u -> 200 OK"
  } catch { "$u -> $($_.Exception.Response.StatusCode.value__) BLOCKED" }
}
```

**👀 Yeh aayega:**
```
vendor.mgr@globaltech.com    -> 403 BLOCKED
jwhitfield@securecore.com    -> 403 BLOCKED     ← External Company User
rohit.kapoor@globaltech.com  -> 200 OK          ← Auditor
```

### Bug hai kya?

Answer screen ko **do** API chahiye:

| API | Kaam | Vendor Manager allowed? |
|---|---|---|
| `/api/questionnaire-submissions` | Submission shuru/save/submit | ✅ **Haan** ([submission.routes.js:22-26](../../backend/modules/questionnaires/submission.routes.js)) |
| `/api/questionnaires` | **Sawaal padhna** | ❌ **NAHI** ([questionnaire.routes.js:221-224](../../backend/modules/questionnaires/questionnaire.routes.js)) |

Answer screen sawaal isi doosri API se laata hai ([AnswerQuestionnaire.jsx:104](../../frontend-react/src/features/questionnaire/pages/AnswerQuestionnaire.jsx)):
```js
const rows = await questionnaireApi.list({ financialYear, limit: 200 }, ...);
```

**Matlab:** vendor submission to bana sakta hai, par **sawaal padh hi nahi sakta.**

**Natija: is app ka core flow — "vendor jawab deta hai" — un dono roles ke liye kaam nahi karta jinke liye woh bana hai.**

### Yeh bug pakda kyun nahi gaya?

Yaad karo Act 4 me kya padha tha:

> [tests/unit/rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) — jo test in permission lists ko milata hai — **adhura hai, usme syntax error hai, aur woh kabhi chalta hi nahi.**

**Yeh bug bilkul wahi cheez hai jo woh test pakadta.** Guard band pada tha, isliye bug nikal gaya.

> **🎯 Yeh handbook ka sabse zaroori sabak hai:** ek toota hua **test** khud me bug nahi hai — woh ek **khuli hui khidki** hai jisme se bug andar aate rehte hain. Isliye Chapter 11 me pehla kaam yeh test theek karna hai, koi feature nahi.

---

## 🩹 Workaround — ab aage badhte hain

Flow samajhne ke liye aisa role chahiye jo **dono** kaam kar sake. `Auditor` kar sakta hai.

**Logout karo → `rohit.kapoor@globaltech.com` / `password123` se login karo → "Answer Questionnaire" kholo.**

> **⚠️ Yaad rakho: yeh sirf padhne ke liye jugaad hai.** Asli zindagi me Auditor apne hi sawaalon ka jawab nahi dega — woh Act 3 ke independence rules ke bilkul khilaaf hai. Hum yeh sirf isliye kar rahe hain taaki screen dikh jaye.

---

## ▶️ Kaam 3 — Questionnaire bharo

**👀 Ab dikhega:**
- Upar dayein: **Financial Year** dropdown
- Bayein: **Sections** list (Act 2 me aapne `Environment` banaya tha)
- Beech me: sawaal, ek-ek card me
- Neeche chipka hua: **"Submit questionnaire"** bar

**Agar khaali dikhe** → Financial Year check karo. Act 2 wali chetavni yaad hai? Sawaal jis saal me banaye the, wahi chuno.

### ▶️ Ek jawab do aur upar dayein kone me dekho

Koi option chuno.

**👀 Sawaal ke card ke upar dayein:** `Saving…` → phir `Saved`

> **⭐ Yahan koi "Save" button hai hi nahi.** Har jawab **khud ba khud** save hota hai.
>
> Comment padho ([AnswerQuestionnaire.jsx:32-36](../../frontend-react/src/features/questionnaire/pages/AnswerQuestionnaire.jsx)):
> *"There is no page-level Save. Each answer debounces and writes its own small document."*
>
> **Yeh design ka bada faisla hai.** 322 sawaalon wale form me agar ek hi "Save" button ho aur browser crash ho jaye — sab kaam gaya. Yahan har jawab apna alag chhota document hai ([response.model.js](../../backend/modules/questionnaires/response.model.js)), turant save.

### ▶️ Ab dhyan do ki ek section ek baar me aata hai

Doosre section par click karo.

**👀 Naye sawaal load honge.** Sab ek saath nahi aate.

> **💡 Kyun?** Comment me hai: *"A questionnaire runs to 322 questions; asking for all of them and all of their answers is the shape that made the old system slow."*
>
> Ek aur baareek baat: section badalne se pehle code `sheet.flushAll()` chalata hai ([AnswerQuestionnaire.jsx:158-163](../../frontend-react/src/features/questionnaire/pages/AnswerQuestionnaire.jsx)) — matlab jo jawab abhi "save hone ki line me" tha, woh pehle bhej diya jaata hai. **Warna section badalte hi woh jawab kho jaata.**

---

## ⭐ Kaam 4 — Submit karo (yeh dekhne wala moment hai)

Sabhi sawaal bhar do. Phir neeche **"Submit questionnaire"** dabao.

**👀 Ek confirmation:**
> *"You will not be able to change your answers afterwards unless an assessor returns it to you."*

Haan karo.

**👀 Page badal jayega:**
> **Submitted.** *An assessor is reviewing your answers. If something needs changing, they can return the questionnaire to you.*

Aur poora form **read-only** ho jayega.

### 🎬 Ab dekho ki us ek click par server ke andar kya-kya hua

Yeh poori kahani [submission.service.js:145-207](../../backend/modules/questionnaires/submission.service.js) me hai:

```
Aapne "Submit" dabaya
        │
   1️⃣  Baaki jawab bheje gaye (flushAll)
        │
   2️⃣  Totals dobara gine gaye (recomputeTotals)
        │
   3️⃣  ✋ JAANCH: koi sawaal baaki to nahi?
        │      haan → ROK DO: "3 of 12 questions are still unanswered"
        │      nahi → aage
        ▼
   4️⃣  status = "Submitted", time save
        │
   5️⃣  🤖 SCORING APNE-AAP CHALTI HAI
        │      • formulas pehle
        │      • phir mark engines
        │      • phir trend rules
        │
   6️⃣  Marks database me likhe gaye, totals dobara bane
        │
   7️⃣  Fresh data padha gaya aur bheja gaya
```

Har kadam ke peeche ek soch hai. **Teen sabse important:**

### 💡 (a) Adhura questionnaire submit nahi ho sakta — kyun?

> *"Refuses while anything is still a draft: a half-answered questionnaire that has been 'submitted' reads to the assessor as a complete one with gaps, which is a different and worse thing than an unfinished one."*

Matlab: assessor ko lagega vendor ne jaan-boojh kar khaali chhoda, jabki woh sirf bhoola tha.

**▶️ Khud dekho:** ek sawaal khaali chhod kar submit dabao → *"1 of 3 questions are still unanswered"*

### 💡 (b) Scoring fail ho jaye to bhi submission bach jaata hai

[submission.service.js:191-197](../../backend/modules/questionnaires/submission.service.js):
```js
try {
  await require('./scoring.service').scoreSubmission(orgId, id);
} catch (e) {
  fresh.scoringError = e.message;   // ← error likh do, phenko mat
  await fresh.save();
}
```

> *"the applicant has submitted, and that fact must not depend on the scoring engines being loadable… losing the submission itself would not be fixable."*

Aur assessor ki queue me `rules did not run` likha dikhega ([AssessorQueue.jsx:124](../../frontend-react/src/features/questionnaire/pages/AssessorQueue.jsx)) — kyunki **0 marks ke do matlab hote hain**: "sach me zero mila" ya "scoring chali hi nahi". Yeh unhe alag karta hai.

### 💡 (c) Data dobara padha jaata hai — chhoti par badi baat

> *"Returning it would tell the applicant they scored zero on a questionnaire that had just been scored — and the number would only correct itself on the next page load, which reads as the system losing their submission."*

---

## ⭐ Scoring engine — project ka sabse mushkil hissa

Yeh samajhna zaroori hai kyunki **yahi is product ka asli maal hai.**

### Ek sawaal ka score kaise banta hai

[scoring.service.js](../../backend/modules/questionnaires/scoring.service.js) me **teen cheezein, isi order me**:

| # | Kya | Kaam |
|---|---|---|
| 1️⃣ | **Grid Formulas** | Table ke khaane bharti hain (`total = a + b`) |
| 2️⃣ | **Mark Engines** | Marks nikalte hain — 6 engines |
| 3️⃣ | **Trend Rules** | Kai saal ka trend dekhkar assessor ke liye option **suggest** karte hain |

**Order kyun matters?** *"Formulas first: they fill cells, and a mark rule may read a filled cell. Running them the other way round scores the blank."*

### 6 Mark Engines
[backend/scoring/engines.js](../../backend/scoring/engines.js):
`optionSum` · `fixed` · `passthrough` · `numericBand` · `gridLookup` · `gridCompleteness`

### 🎯 Ab teen sabse zaroori design decisions

#### 1. Scoring code ki **sirf ek copy** hai

Scoring frontend ki files me likhi hai. Backend usko `await import()` karke chalata hai ([backend/scoring/loader.js](../../backend/scoring/loader.js)).

Comment kehta hai — do copies rakhne ka natija:
> *"a score that differs between what the author was shown and what the vendor was given — the single worst failure this system can have."*

**Sochiye:** author ne rule banate waqt preview me dekha "10 marks". Vendor ko mila "8 marks". Kaunsa sahi hai? Kisi ko nahi pata. Isliye **ek hi code** dono jagah chalta hai.

#### 2. Rules **dependency order** me chalte hain

Ek sawaal ka rule doosre sawaal ka mark padh sakta hai. To pehle kaunsa chale?

`orderRules()` unhe sahi order me lagata hai. Aur agar do sawaal ek doosre par depend karein (circle), to woh **skip** ho jaate hain warning ke saath — infinite loop nahi.

#### 3. Machine insaan ko **overrule nahi** karti

[scoring.service.js:109-115](../../backend/modules/questionnaires/scoring.service.js):
```js
// A mark somebody set by hand is left exactly as it is.
if (response.overridden) { skipped += 1; ... continue; }
```

> *"A rule quietly replacing a human decision is worse than a rule that never ran: the assessor would have no way to tell it happened."*

Aur trend rules **marks dete hi nahi** — woh sirf option **suggest** karte hain, `autoSelections` me alag likhe jaate hain, taaki *"a proposal is never mistaken for a decision somebody made"*.

---

## 🔴 Yahan Kya Toota Hai — Act 5 ka sach

| Cheez | Haalat |
|---|---|
| **Vendor Manager / External User sawaal padh sakta hai?** | 🔴 **NAHI — 403. Core flow toota hua hai** |
| Autosave (har jawab alag) | ✅ **Kaam karta hai — achha design** |
| Section-wise loading | ✅ **Kaam karta hai** |
| Adhura submit rokna | ✅ **Kaam karta hai** |
| Auto-scoring on submit | ✅ **Kaam karta hai** |
| Scoring ki ek hi copy | ✅ **Bahut achha design** |
| Assessor override ki suraksha | ✅ **Kaam karta hai** |
| `rbac-parity` test | 🔴 **Toota — isiliye upar wala bug nikla** |
| Seed me questionnaire data | ❌ **Nahi hai** |
| Financial year mismatch par warning | ❌ **Chupchaap khaali page** |

---

## ✅ Checkpoint — Act 5

**1. Vendor Manager `/answer-questionnaire` khole to kya hota hai aur kyun?**

<details><summary>Jawab</summary>

Laal error banner: *"Role 'Vendor Manager' does not have access to this module"*, aur koi sawaal nahi.
Wajah: `/api/questionnaire-submissions` usko allow karta hai, par sawaal `/api/questionnaires` se aate hain — **us list me Vendor Manager nahi hai** ([questionnaire.routes.js:221-224](../../backend/modules/questionnaires/questionnaire.routes.js)).
</details>

**2. Is bug ko kis cheez ne pakadna tha?**

<details><summary>Jawab</summary>

[tests/unit/rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) — jo frontend ki `API_MODULE_ROLES` aur backend ke `restrictTo(...)` ko milata hai. **Woh file adhuri hai (syntax error), isliye chalti hi nahi** aur bug nikal gaya.
</details>

**3. Scoring frontend ki file me kyun hai, backend me kyun nahi?**

<details><summary>Jawab</summary>

Taaki **ek hi copy** rahe. Author ko preview me jo score dikhta hai aur vendor ko jo milta hai — woh ek hi code se aata hai. Do copies drift kar jaati aur scores alag ho jaate — *"the single worst failure this system can have"*. Backend usko `await import()` se load karta hai ([loader.js](../../backend/scoring/loader.js)).
</details>

**4. Scoring fail ho jaye to submission ka kya hota hai?**

<details><summary>Jawab</summary>

Submission **bach jaata hai**. Error `scoringError` field me likh diya jaata hai, aur assessor ki queue me *"rules did not run"* dikhta hai — taaki 0 marks ka matlab saaf rahe. Assessor baad me scoring dobara chala sakta hai.
</details>

**5. Formulas mark engines se pehle kyun chalte hain?**

<details><summary>Jawab</summary>

Formulas grid ke khaane bharte hain, aur mark rule un bhare hue khaanon ko padh sakta hai. Ulta chalane par rule **khaali khaane** ko score kar deta.
</details>

---

## 🤝 Handover

**Aapne kya kiya:** questionnaire bhara, submit kiya, scoring apne-aap chali.
**Aur kya jaana:** ek asli bug — jiske liye ab aapke paas poora sabook hai.
**Ab kya chahiye:** koi jaanch kare aur faisla de.

**➡️ Agla: [Chapter 7 — Act 6: Assessor](07-act6-assessor.md)**
