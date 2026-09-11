« [Chapter 10 — File Map](10-file-map.md) | **Chapter 11** | [Index](00-START-HERE.md)

---

# Chapter 11 — Ab Aage Kya

> **Time:** 30 min padhna, phir hafton ka kaam
> **Lakshya:** Ek saaf order jisme aap kaam karo — aur pehla change khud karo.

---

## Pehle: faisla

Poora project padhne aur chalane ke baad — mera saaf jawab:

# ✅ **CONTINUE karo. Naya mat banao.**

**Wajah — jo aapne khud dekhi:**

| Aapne dekha | Matlab |
|---|---|
| 23 modules, ek hi saaf pattern | Architecture theek hai |
| `orgFilter` har query me | Multi-tenancy sahi lagi hai |
| 4 independence rules server par | Audit domain sahi samjha gaya hai |
| Scoring ki ek hi copy | Sabse mushkil hissa achhe se hal hua |
| 389 tests pass | Behaviour likha hua hai |
| Comments me "kyun" likha hai | Code maintainable hai |

**Problem code ki quality nahi hai. Problem teen cheezein hain:**
1. **Kooda** — 21,000 lines murda code
2. **Adhure vaade** — 23 khali stub pages
3. **Ek toota guard** — jiski wajah se asli bug zinda hai

**Yeh teenon safai se theek hote hain, dobara likhne se nahi.**

Naya banane par aap wahi backend dobara likhoge jo pehle se theek hai — aur multi-tenancy, RBAC, scoring ke woh saare edge cases dobara jhelo ge jo yahan **pehle se hal ho chuke hain**.

| | CONTINUE + safai | START NEW |
|---|---|---|
| Samay | **~2-3 hafte** | ~2-3 mahine |
| Risk | Kam | Zyada |
| Kya bachega | Sab kuch kaam ka | Kuch nahi |

---

# 🗺️ Kaam ka Order — 5 Phases

---

## 🔴 Phase 0 — Suraksha (aaj, 1 ghanta)

**Yeh sab kuch se pehle. Iske bina baaki sab risky hai.**

```powershell
cd "D:\Brijesh Kr. Verma\Test"
git init
git add .
git commit -m "Baseline — handbook ke baad, safai se pehle"
```

Aur:
- `.env` ka backup project ke **bahar** rakho (git me nahi jaata)
- `npm test` ka output save kar lo — yahi aapka baseline hai

> **Abhi koi undo nahi hai.** Git ke baad har galti wapas ho sakti hai.

---

## 🔥 Phase 1 — Toota Guard Theek Karo (2-3 din)

> **Yeh Phase 2 se pehle kyun?** Kyunki abhi aapke paas **ek asli bug ka saboot** hai (Act 5), aur usko pakadne wala test band pada hai. **Pehle alarm theek karo, phir aag bujhao.**

### Kaam 1.1 — `rbac-parity.test.js` chalu karo

[tests/unit/rbac-parity.test.js](../../tests/unit/rbac-parity.test.js) me `MODULES` array band nahi hota. Line ~50 par `];` chahiye:

```js
const MODULES = [
  ['capa', 'capa.routes.js'],
  ['risks', 'risk.routes.js'],
  ['vendors', 'vendor.routes.js'],
  ['organizations', 'org.routes.js'],
  ['settings', 'settings.routes.js'],
  ['audits', 'audit.routes.js'],
  ['findings', 'finding.routes.js'],
  ['controls', 'control.routes.js'],
];          // ← yeh line jodo
```

Phir `npm test` chalao.

**👀 Ab woh test chalega — aur shayad fail hoga.** Har failure ek **asli permission mismatch** hai. Ek-ek karke theek karo.

### Kaam 1.2 — Questionnaire modules bhi us test me jodo

Upar wali list me `questionnaires` aur `questionnaireSubmissions` **hain hi nahi** — isiliye Act 5 wala bug is test se bhi nahi pakda jaata.

```js
  ['questionnaires', 'questionnaire.routes.js'],
  ['questionnaires', 'submission.routes.js'],
```

*(Note: test ka `frontendRoles()` module ke naam se dhundta hai, aur submissions frontend me `questionnaireSubmissions` naam se hai — to test ka mapping thoda adjust karna padega.)*

### Kaam 1.3 — 🔴 Act 5 wala bug theek karo

**Bug:** Vendor Manager aur External Company User `/api/questionnaires` par **403** paate hain, isliye Answer Questionnaire screen khali aur toota hua hai.

**Jagah:** [questionnaire.routes.js:221-224](../../backend/modules/questionnaires/questionnaire.routes.js)

**Do sambhavit hal — faisla aapka:**

| Hal | Kya karna | Fayda | Nuksan |
|---|---|---|---|
| **A** | Un dono roles ko `restrictTo` me jod do | Ek line ka fix | Applicant ko **saare** sawaal dikh jayenge, uske apne hi nahi — aur woh scoring rules bhi padh lega |
| **B** ⭐ | Submissions router par ek naya read-only endpoint banao jo sirf **answerable** sawaal de (bina `scoringRule` ke) | Applicant ko sirf utna hi milega jitna chahiye | Thoda zyada kaam |

> **Meri salaah: B.** Kyunki `scoringRule` me hi likha hota hai ki kaun sa jawab kitne marks ka hai — woh applicant ko dikhna hi nahi chahiye. **A karoge to permission bug ki jagah ek information-leak bug bana doge.**

### Kaam 1.4 — E2E tests chalao

```powershell
npx playwright test
```
[test-results/](../../test-results/) batata hai ki auth, RBAC aur per-role wale fail ho rahe the. Ek-ek karke dekho.

---

## 🧹 Phase 2 — Kooda Hatao (2-3 din, risk kam)

**Har delete ke baad `npm test` chalao. Har delete alag commit me.**

| Kya | Kaise |
|---|---|
| [Books/](../../Books/) | Project ke bahar le jao |
| [test-results/](../../test-results/) | Delete + `.gitignore` me daalo |
| [Eco/](../../Eco/) | **Zip banao, bahar rakho**, phir delete (~20,800 lines) |
| [shared/esc.js](../../shared/esc.js) | Delete (uske test bhi) |
| [pages/AuditComments.jsx](../../frontend-react/src/pages/AuditComments.jsx) | Delete |
| [pages/ExportCSV.jsx](../../frontend-react/src/pages/ExportCSV.jsx) | Delete |

> **⚠️ `CreateAudit.jsx` mat chhedna** — woh Topbar me modal ki tarah use hota hai.
> **⚠️ `backend/assistantService.js` mat chhedna** — woh AI pipeline hai, `assistant.service.js` usko require karta hai.

**Delete se pehle hamesha:**
```powershell
Select-String -Path (Get-ChildItem backend,frontend-react\src,tests,scripts -Recurse -Include *.js,*.jsx).FullName -Pattern "<file-ka-naam>"
```

**Natija:** project ~22,000 lines chhota, ~26 MB halka.

---

## 🎯 Phase 3 — Scope ka Faisla (2-3 din — sochne ka kaam)

23 stub pages ki list ([Chapter 10](10-file-map.md)) lo. Har ek par teen me se ek faisla:

| Faisla | Kya karo |
|---|---|
| ✅ **Chahiye** | Backlog me daalo, sidebar me `soon: true` rehne do |
| ❌ **Nahi chahiye** | [App.jsx](../../frontend-react/src/App.jsx) se route + [Sidebar.jsx](../../frontend-react/src/components/Sidebar.jsx) se entry — **dono** hatao |
| 🤔 **Pata nahi** | Abhi sidebar se hatao, route rehne do |

> **Meri salaah: sirf 5-6 rakho, baaki hata do.**
>
> 23 khali pages product ko adhura dikhate hain. **Kam features jo poore hon, zyada achhe hain — bajaye bahut saare jo khali hon.**

**Isi ke saath yeh adhure kaam bhi list karo:**
- Settings ke security toggles — chalu karo ya UI se hatao ([Act 1](02-act1-org-admin.md))
- Submission ka `Approved` status — uska button banao ya status hata do ([Act 6](07-act6-assessor.md))
- Certificate expiry email — `nodemailer`/`node-cron` install hain par koi job nahi

---

## 📝 Phase 4 — Sach Likho (2-3 din)

1. **[README.md](../../README.md) dobara likho** — abhi woh ek aise project ka varnan hai jo exist nahi karta
2. **Purane docs archive karo** — [docs/](../../docs/) ki 25+ files `docs/archive/` me
3. **`CLAUDE.md`** — pehle se bana diya hai, use update karte raho

---

## 🚀 Phase 5 — Ab Aage Badho (chalta rahega)

Ab naye kaam par lago — patle modules poore karo (reports, ccm), ek-ek karke.

**Har naye feature ke liye 5 niyam** (jo aapne khud dekhe):

1. **Har niyam do jagah** — UI me suvidha ke liye, API me suraksha ke liye
2. **Har service ki pehli line** `orgFilter(orgId)`
3. **`orgId` hamesha `req.user.scopeOrgId` se** — kabhi `req.body`/`req.query` se nahi
4. **Delete hamesha soft** — `softDelete()`, kabhi `deleteOne()` nahi
5. **Naya module = maujooda module ki copy** — wahi 4 files, wahi shakl

---

# 🛠️ Aapka Pehla Change (30 min)

**Yeh abhi karo.** Chhota hai, surakshit hai, aur poori loop sikha dega.

### Kaam: `Books/` folder hatao aur `test-results/` ignore karo

```powershell
cd "D:\Brijesh Kr. Verma\Test"

# 1. Git hai? (Phase 0 kiya tha?)
git status

# 2. Kya koi code Books ko use karta hai? — kuch nahi aana chahiye
Select-String -Path (Get-ChildItem backend,frontend-react\src,tests,scripts -Recurse -Include *.js,*.jsx).FullName -Pattern "Books"

# 3. Bahar le jao (delete nahi — safe)
Move-Item "Books" "$env:USERPROFILE\Desktop\Books-backup"

# 4. test-results ignore karo
Add-Content .gitignore "`ntest-results/"
Remove-Item "test-results" -Recurse -Force

# 5. Kuch toota to nahi?
npm test

# 6. Commit
git add -A
git commit -m "Remove unrelated Books folder and ignore test-results"
```

**👀 `npm test` me wahi natija aana chahiye jo Phase 0 me tha** — `16 passed, 1 failed (rbac-parity)`.

> **🎓 Aapne abhi jo kiya, wahi poore project ki loop hai:**
> **git → check → change → test → commit**
>
> Yehi 5 kadam har baar. Bade change me bhi yahi.

---

# ✅ Aapki Checklist

Print kar lo ya ek file me rakho:

```
PHASE 0 — Suraksha
  [ ] git init + pehla commit
  [ ] .env ka backup bahar
  [ ] npm test ka baseline save

PHASE 1 — Toota Guard  🔥 SABSE PEHLE
  [ ] rbac-parity.test.js ka `];` jodo
  [ ] npm test — jo fail hon woh theek karo
  [ ] questionnaire modules us test me jodo
  [ ] 🔴 Act 5 wala 403 bug theek karo (hal B)
  [ ] playwright test chalao aur theek karo

PHASE 2 — Safai
  [ ] Books/ bahar
  [ ] test-results/ delete + gitignore
  [ ] Eco/ zip karke bahar (~20,800 lines)
  [ ] shared/esc.js delete
  [ ] AuditComments.jsx, ExportCSV.jsx delete
  [ ] ⚠️ CreateAudit.jsx aur assistantService.js MAT chhedo

PHASE 3 — Scope
  [ ] 23 stubs par faisla — rakho / hatao
  [ ] Settings toggles: chalu karo ya hatao
  [ ] Approved status: banao ya hatao

PHASE 4 — Documentation
  [ ] README dobara likho
  [ ] docs/ archive karo

PHASE 5 — Aage
  [ ] Patle modules poore karo
```

---

## 🎓 Aap poora handbook kar chuke ho

Ab aapke paas hai:
- ✅ App chalane ka tareeka
- ✅ Poora business flow — role-by-role
- ✅ Code ka pattern — 23 modules ka ek naksha
- ✅ File map — kya zinda, kya murda
- ✅ **Ek asli bug**, saboot ke saath
- ✅ Ek saaf order kaam ka

**Aap ab is project ke owner ho — sirf naam se nahi.**

---

## 📚 Wapas jaane ke liye

| Chahiye | Chapter |
|---|---|
| App chalu karna | [Ch 0](00-START-HERE.md) |
| Kaunsa role kya karta hai | [Ch 1](01-cast-and-flow.md) |
| Questionnaire + scoring | [Ch 6](06-act5-applicant.md) |
| Permission system | [Ch 5](05-act4-auditor.md) · [Ch 8](08-support-roles.md) |
| Naya module kaise banega | [Ch 9](09-architecture.md) |
| Koi file kahan hai | [Ch 10](10-file-map.md) |
