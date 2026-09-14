« [Chapter 5 — Act 4](05-act4-auditor.md) | **Chapter 6 · Act 5** | [Chapter 7 — Act 6 →](07-act6-assessor.md)

---

# 🎬 Act 5 — Applicant (jiski jaanch ho rahi hai)

> **Login:** `vendor.mgr@globaltech.com` / `password123`
> **Time:** 90 min — **sabse lamba aur sabse important chapter**
> **Kahani me jagah:** Sawaal taiyar hain. Ab jawab dene ki baari.

---

## 📜 Pehle ek kahani — kyunki iska sabak sabse bada hai

**Jab yeh handbook likhi gayi thi, is chapter ka pehla hi kaam fail hota tha.**

Vendor Manager "Answer Questionnaire" kholta tha aur ek laal banner milta tha:
```
Role 'Vendor Manager' does not have access to this module
```
**Ek bhi sawaal nahi.** Matlab is app ka core flow — *"vendor jawab deta hai"* — **theek un dono roles ke liye kaam nahi karta tha jinke liye woh bana tha.**

**🔧 Ab yeh theek ho chuka hai** (neeche poora hisaab hai). Par kahani chapter me rehne di gayi hai, kyunki **isse jo 3 baatein sikhne ko milti hain, woh is project me baar-baar kaam aayengi.**

Aap seedha `vendor.mgr@globaltech.com` se login karke aage badh sakte ho — koi workaround nahi chahiye.

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

**👀 Sawaal dikhne chahiye** — sections rail bayein, sawaal beech me, neeche "Submit questionnaire" bar.

> **📌 Agar khaali dikhe:** ghabrao mat, ab screen khud bata degi kyun — *"No questions for 2027-28 — Questions are published for a different year. Switch to: [2026]"*. Us button par click karo. (Yeh bhi ek fix tha, [Act 2](03-act2-compliance-manager.md) me.)

---

## 🔬 Woh bug tha kya — aur 3 sabak

### Bug ki jad

Answer screen ko **do** API chahiye thi:

| API | Kaam | Vendor Manager allowed tha? |
|---|---|---|
| `/api/questionnaire-submissions` | Submission shuru/save/submit | ✅ Haan |
| `/api/questionnaires` | **Sawaal padhna** | ❌ **NAHI** |

Screen sawaal doosri wali se laati thi. **Matlab vendor submission bana sakta tha, par sawaal padh hi nahi sakta tha.**

### 🎓 Sabak 1 — toota hua test bug nahi, khuli khidki hota hai

Yeh bug isliye ship ho gaya kyunki [rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) **syntax error ki wajah se chalta hi nahi tha** ([Act 4](05-act4-auditor.md) me poori kahani).

> Ek test jo **fail** hota hai, woh shor machata hai. Ek test jo **chalta hi nahi**, woh chup rehta hai aur aapko lagta hai sab theek hai. **Doosra zyada khatarnaak hai.**

### 🎓 Sabak 2 — har bug permission-list ka nahi hota

Yeh dilchasp hai: **woh test ab theek hai, par yeh bug woh phir bhi nahi pakadta.**

Kyunki **yeh parity ka mismatch hai hi nahi** — dono lists apne routers se bilkul match karti hain. Problem alag kism ki thi:

> **Screen ko do module chahiye the, aur nav sirf ek par gate kar raha tha.**

Nav `answer-questionnaire` ko `questionnaireSubmissions` se joda tha ([NAV_ITEM_MODULE](../../frontend-react/src/context/AuthContext.jsx)) — jo sahi tha, par adhura. Doosri zarurat kisi ne likhi hi nahi thi.

**Isliye guard hone ke baad bhi dimaag lagana padta hai.**

### 🎓 Sabak 3 — aasan fix aksar naya bug hota hai

Fix ke do raaste the:

| | Hal A — 1 line | Hal B — jo chuna gaya ⭐ |
|---|---|---|
| Kya | Dono roles ko authoring router me jod do | Submission par apna read-only endpoint |
| Vendor ko dikhta | Saare sawaal + **`scoringRule`** + har option ke **marks** | Sirf woh jo bharne hain |

**Hal A permission bug ko information-leak bug me badal deta.** Vendor pehle dekh leta ki kaun sa jawab kitne marks ka hai, phir chunta — **assessment ka matlab hi khatam.**

> **Yeh soch is poore project me kaam aayegi:** "kya yeh fix kaam kar jayega?" kaafi nahi hai. Sawaal hai — **"yeh fix kya naya kholta hai?"**

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
| **Vendor Manager / External User sawaal padh sakta hai?** | ✅ **🔧 FIX ho gaya** — 322 sawaal milte hain, scoring leak zero |
| Autosave (har jawab alag) | ✅ **Kaam karta hai — achha design** |
| Section-wise loading | ✅ **Kaam karta hai** |
| Adhura submit rokna | ✅ **Kaam karta hai** |
| Auto-scoring on submit | ✅ **Kaam karta hai** |
| Scoring ki ek hi copy | ✅ **Bahut achha design** |
| Assessor override ki suraksha | ✅ **Kaam karta hai** |
| `rbac-parity` test | ✅ **Ab chalta hai** ([Act 4](05-act4-auditor.md)) — par yeh bug parity ka mismatch nahi hai |
| Seed me questionnaire data | ✅ **🔧 FIX ho gaya** ([Act 2](03-act2-compliance-manager.md)) — 5 published sawaal |
| Financial year mismatch par warning | ✅ **🔧 FIX ho gaya** ([Act 2](03-act2-compliance-manager.md)) — sahi saal ka button milta hai |

> **📌 Act 5 ke saare issues ab fix ho chuke hain.**

### 🔧 Is chapter ka fix — 403 kaise theek hua

**Do raaste the:**

| | Hal A — seedha | Hal B — jo chuna gaya ⭐ |
|---|---|---|
| Kya | Dono roles ko authoring router ke `restrictTo` me jod do | Submission par apna read-only endpoint |
| Mehnat | 1 line | ~120 lines |
| Vendor ko kya dikhta | **Saare** sawaal + **`scoringRule`** + har option ke **marks** | Sirf woh jo bharne hain |

**Hal A kyun nahi:** `scoringRule` me likha hota hai ki kaun sa jawab kitne marks ka hai. Woh applicant ko de dena = **permission bug ko information-leak bug me badal dena**. Vendor pehle marks dekh leta, phir jawab chunta — assessment ka matlab hi khatam.

**Ab kya hota hai:**
```
GET /api/questionnaire-submissions/:id/questions   ← applicant yahan se padhta hai
GET /api/questionnaire-submissions/:id/sections    ← rail + "kaunse saal me sawaal hain"
```

Yeh apni submission ke through jaata hai, isliye `assertMayAct` apne-aap lag jaata hai — **ek applicant doosre ka questionnaire nahi khol sakta.**

**Kya hataya gaya:** `scoringRule`, har option ka `score`/`subScore`, saara `assessorOption` aur uski guidance, `trendRule`.
**Kya rakha gaya:** `maxMark` (jaan-boojh kar — kul kitne marks ka sawaal hai woh batana theek hai), `dependsOn` (warna chhupe follow-up dikh jaate), `gridFormulas` (warna computed cells lock nahi hote).

**Live verify:**
```
vendor.mgr@globaltech.com → 322 questions ✅
  scoringRule leak?  → nahi ✅
  option score leak? → nahi ✅
  assessorOption?    → nahi ✅
```

---

## ✅ Checkpoint — Act 5

**1. Applicant sawaal kahan se padhta hai, aur `/api/questionnaires` se kyun nahi?**

<details><summary>Jawab</summary>

`GET /api/questionnaire-submissions/:id/questions` se — apni submission ke through.

`/api/questionnaires` **authoring document** deta hai: `scoringRule`, har option ke marks, assessor ki guidance. Woh applicant ko de dena matlab usko pehle bata dena ki kaun sa jawab sabse zyada marks ka hai.

Submission ke through jaane ka ek aur fayda: `assertMayAct` apne-aap lag jaata hai, to **ek applicant doosre ka questionnaire nahi khol sakta.**
</details>

**2. Woh bug pakda kyun nahi gaya tha — aur ab bhi `rbac-parity` test usko kyun nahi pakadta?**

<details><summary>Jawab</summary>

**Pakda nahi gaya kyunki** [rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) syntax error ki wajah se chalta hi nahi tha — **jo test chalta hi nahi, woh fail bhi nahi hota**, isliye kisi ko shak nahi hua.

**Ab bhi nahi pakadta kyunki yeh parity ka mismatch hai hi nahi** — dono lists apne routers se match karti hain. Problem yeh thi ki **screen do module maangti thi aur nav sirf ek par gate karta tha**. Guard sirf wahi pakadta hai jo woh dekhne ke liye bana ho.
</details>

**3. Fix ke do raaste the. "1 line wala" kyun nahi chuna?**

<details><summary>Jawab</summary>

Kyunki woh dono roles ko authoring router me jod deta — aur unhe `scoringRule` + har option ke marks mil jaate. **Permission bug ki jagah information-leak bug ban jaata**, jo isse bada nuksan karta.

Sabak: sawaal "kya yeh fix kaam karega?" nahi, **"yeh fix kya naya kholta hai?"** hai.
</details>

**4. Scoring frontend ki file me kyun hai, backend me kyun nahi?**

<details><summary>Jawab</summary>

Taaki **ek hi copy** rahe. Author ko preview me jo score dikhta hai aur vendor ko jo milta hai — woh ek hi code se aata hai. Do copies drift kar jaati aur scores alag ho jaate — *"the single worst failure this system can have"*. Backend usko `await import()` se load karta hai ([loader.js](../../backend/scoring/loader.js)).
</details>

**5. Scoring fail ho jaye to submission ka kya hota hai?**

<details><summary>Jawab</summary>

Submission **bach jaata hai**. Error `scoringError` field me likh diya jaata hai, aur assessor ki queue me *"rules did not run"* dikhta hai — taaki 0 marks ka matlab saaf rahe. Assessor baad me scoring dobara chala sakta hai.
</details>

**6. Formulas mark engines se pehle kyun chalte hain?**

<details><summary>Jawab</summary>

Formulas grid ke khaane bharte hain, aur mark rule un bhare hue khaanon ko padh sakta hai. Ulta chalane par rule **khaali khaane** ko score kar deta.
</details>

---

## 🤝 Handover

**Aapne kya kiya:** questionnaire bhara, submit kiya, scoring apne-aap chali.
**Aur kya jaana:** ek asli bug — jiske liye ab aapke paas poora sabook hai.
**Ab kya chahiye:** koi jaanch kare aur faisla de.

**➡️ Agla: [Chapter 7 — Act 6: Assessor](07-act6-assessor.md)**
