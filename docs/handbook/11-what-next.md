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
| 452 tests pass | Behaviour likha hua hai |
| Comments me "kyun" likha hai | Code maintainable hai |

**Problem code ki quality nahi hai. Problem teen cheezein thi:**
1. **Kooda** — ~21,000 lines murda code *(abhi bhi hai — Phase 2)*
2. **Adhure vaade** — 23 khali stub pages *(abhi bhi hain — Phase 3 ka faisla)*
3. ~~**Ek toota guard** — jiski wajah se asli bug zinda tha~~ ✅ **theek ho gaya**

> **Teesri wali sabse mahengi thi, aur ab woh khatam hai.** Us ek bandh pade test ki wajah se do 403-on-click bug ship ho chuke the. Ab woh chalta hai, pehle se zyada dekhta hai, aur us kism ke naye bug ko pakad leta hai.

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

## ✅ Phase 1 — Toota Guard aur Behaviour Bugs — **HO GAYA**

> Yeh Phase 2 se pehle isliye tha ki **pehle alarm theek karo, phir aag bujhao.**

Handbook ke saath-saath yeh sab kar diya gaya:

| # | Kaam | Kahan padhein |
|---|---|---|
| 1.1 | `rbac-parity.test.js` chalu kiya — aur 8 → **19 modules** tak badhaya | [Act 4](05-act4-auditor.md) |
| 1.2 | Applicant ka 403 theek kiya (**Hal B** — alag read-only endpoint) | [Act 5](06-act5-applicant.md) |
| 1.3 | Users page ke 3 bug (edit/delete `undefined`, self-delete button) | [Act 1](02-act1-org-admin.md) |
| 1.4 | Lockout guards — apna role/status, aakhri admin | [Act 1](02-act1-org-admin.md) |
| 1.5 | Lifecycle ki **5 copies → 1** + parity test | [Act 3](04-act3-audit-manager.md) |
| 1.6 | `Approved` step + segregation of duties | [Act 6](07-act6-assessor.md) |
| 1.7 | Audit close par acknowledge-check | [Act 6](07-act6-assessor.md) |
| 1.8 | Audit Universe: fake risk score + nav 403 | [Ch 9](09-architecture.md) |
| 1.9 | 4 dead nav entries + unhe rokne wala test | [Ch 8](08-support-roles.md) |

```
Pehle:  Test Files 16 passed, 1 failed (17)   ·   389 tests
Ab:     Test Files 17 passed      (17)        ·   452 tests
```

### ⏳ Phase 1 ka jo bacha hai — E2E tests

```powershell
npx playwright test
```

> **✅ Yeh bhi ho gaya.** Poora suite chromium par chalaya gaya — **239 passed**.
>
> Pehle 13 fail ho rahe the. Unme se **sirf 1 asli bug tha**; baaki **10 purane test** the jo aisi access expect karte the jo API sahi tarah mana karti hai (jaise *"Auditor can access /reports"*). Woh us daur ke hain jab menu 403 dene wali pages dikhata tha.
>
> Teen test files theek ki gayi ([Act 4](05-act4-auditor.md) me detail), aur `test-results/` folder bhi hat gaya.
>
> **Baki:** firefox aur webkit par abhi nahi chalaya — sirf chromium. Chahein to `npx playwright test` (bina `--project`) se teeno chalte hain.

---

## 🧹 Phase 2 — Kooda Hatao (2-3 din, risk kam)

**Har delete ke baad `npm test` chalao. Har delete alag commit me.**

| Kya | Kaise |
|---|---|
| ~~`Books/`~~ | ✅ Ho gaya — hata diya gaya |
| ~~`test-results/`~~ | ✅ Ho gaya — hata diya (`.gitignore` me pehle se tha) |
| [Eco/](../../Eco/) | **Zip banao, bahar rakho**, phir delete (~20,800 lines) |
| [shared/esc.js](../../shared/esc.js) | Delete (uske test bhi) |
| [pages/AuditComments.jsx](../../frontend-react/src/pages/AuditComments.jsx) | Delete |
| [pages/ExportCSV.jsx](../../frontend-react/src/pages/ExportCSV.jsx) | Delete |

> **⚠️ `CreateAudit.jsx` mat chhedna** — woh Audits page par "+ New Audit" wizard ki tarah use hota hai.
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

**Isi ke saath yeh 4 faisle bhi bache hain — sab aapke hain, mere nahi:**

| # | Faisla | Kyun maine nahi liya |
|---|---|---|
| 1 | **Settings ke 5 toggles** — 2FA, session timeout, 3 email flags. Banana hai ya hata dena? ([Act 1](02-act1-org-admin.md)) | Abhi saaf *"Not active yet"* likha hai, to jhooth nahi bol rahe. Par 2FA **banana** ek poora feature hai, product ka faisla. |
| 2 | **Organizations vs Vendors** — dono overlap karte hain ([Act 1](02-act1-org-admin.md)) | `Organizations` tenant-scoped hai (har org ka apna `orgId`) par subtitle "your network" kehta hai; `Vendors` alag model hai jo asal me supply chain hai. **Tay karo dono ka matlab kya hai**, phir seed aur subtitle match karao. Yeh data-model ka faisla hai. |
| 3 | **Email / scheduling** — `nodemailer` aur `node-cron` install hain, [shared/email.js](../../backend/shared/email.js) ko **koi import nahi karta**, koi job nahi chalta | Email system banane ke liye SMTP setup chahiye — woh aapke paas hai, mere paas nahi. Ya banao, ya dono dependencies hata do. |
| 4 | **CA / Consultant ka multi-client** — page hai, mechanism nahi ([Ch 8](08-support-roles.md)) | CA ka `scopeOrgId` uski apni org hai, to "kai clients" dikhenge kaise? Iska jawab #2 se juda hai. |

> **💡 Yeh chaar "bug" nahi hain.** Inme se har ek ka matlab hai *"kisi ne tay hi nahi kiya ki yeh kya hona chahiye."* Code likhne se pehle woh faisla chahiye — warna main ek aur adhura feature bana dunga, jo abhi project ki sabse badi bimari hai.

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

### Kaam: do murda pages hatao

[AuditComments.jsx](../../frontend-react/src/pages/AuditComments.jsx) aur [ExportCSV.jsx](../../frontend-react/src/pages/ExportCSV.jsx) — inka koi route nahi, koi import nahi, koi test nahi.

```powershell
cd "D:\Brijesh Kr. Verma\Test"

# 1. Baseline — abhi kya haalat hai?
npm test                      # 👀 Test Files 17 passed (17) · 452 tests

# 2. ⚠️ SABSE ZAROORI — kya sach me koi inhe use nahi karta?
Select-String -Path (Get-ChildItem frontend-react\src,tests -Recurse -Include *.js,*.jsx).FullName -Pattern "AuditComments|ExportCSV"
#    → kuch bhi na aaye, tabhi aage badho

# 3. Hatao
Remove-Item frontend-react\src\pages\AuditComments.jsx
Remove-Item frontend-react\src\pages\ExportCSV.jsx

# 4. Kuch toota to nahi?
npm test                      # 👀 wahi 452 pass
cd frontend-react; npx vite build; cd ..

# 5. Commit
git add -A
git commit -m "Remove two unreferenced pages"
```

> **⚠️ Step 2 skip mat karna.** Yehi woh kadam hai jisne `CreateAudit.jsx` ko bachaya tha — uska bhi koi route nahi hai, to woh murda lagta tha, par `Audits.jsx` usko "+ New Audit" wizard ki tarah import karta hai. **"Route nahi hai" ka matlab "use nahi hota" nahi.**

> **🎓 Aapne abhi jo kiya, wahi poore project ki loop hai:**
> **git → check → change → test → commit**
>
> Yehi 5 kadam har baar. Bade change me bhi yahi.
>
> Aur yeh sirf theory nahi — **is handbook ke dauraan git ne ek baar sach me bachaya.**
>
> PowerShell se kuch files edit karne par 7 files ki encoding kharab ho gayi thi: em-dash aur emoji toot kar kuda ban gaye. (Wajah: PowerShell 5.1 file ko ANSI me padhta hai aur UTF-8 me likhta hai — beech me characters mar jaate hain.)
>
> `git checkout` se saaf version wapas aa gaya aur edits dobara safe tareeke se lag gaye. **Bina git ke woh 7 files haath se theek karni padti.**
>
> **Sabak:** is repo me text edits ke liye PowerShell ka read/write mat use karna — editor ya koi encoding-safe tool hi.

---

# ✅ Aapki Checklist

Print kar lo ya ek file me rakho:

```
PHASE 0 — Suraksha
  [x] git init + pehla commit
  [x] .env ka backup bahar
  [x] npm test ka baseline save

PHASE 1 — Toota Guard aur behaviour bugs
  [x] rbac-parity.test.js chalu (8 -> 19 modules)
  [x] Applicant ka 403 (hal B: alag read-only endpoint)
  [x] Users page: edit/delete undefined, self-delete button
  [x] Lockout guards: apna role/status, aakhri admin
  [x] Lifecycle 5 copies -> 1 + parity test
  [x] Approved step + segregation of duties
  [x] Audit close par acknowledge-check
  [x] Audit Universe: fake risk score + nav 403
  [x] 4 dead nav entries + rokne wala test
  [x] playwright chalaya - 239 passed (chromium)
  [ ] firefox + webkit par bhi chalao (abhi sirf chromium)

PHASE 2 — Safai
  [x] Books/ bahar
  [x] test-results/ delete
  [ ] AuditComments.jsx, ExportCSV.jsx delete   <-- "pehla change" exercise
  [ ] Eco/ zip karke bahar (~20,800 lines, repo ka 52%)
  [ ] shared/esc.js delete
  [ ] !! CreateAudit.jsx aur assistantService.js MAT chhedo

PHASE 3 — Scope (faisle, code nahi)
  [ ] 23 stubs par faisla — rakho / hatao
  [ ] Settings toggles: banao ya hatao
  [ ] Organizations vs Vendors: dono ka matlab tay karo
  [ ] Email/cron: banao ya dependencies hatao
  [ ] CA multi-client: mechanism tay karo

PHASE 4 — Documentation
  [ ] README dobara likho (abhi bhi "Vanilla JS" likhta hai)
  [ ] docs/ ki 25+ purani files archive karo
  [x] CLAUDE.md — bana aur update hota raha

PHASE 5 — Aage
  [ ] Patle modules poore karo (reports, ccm)
```

---

## 🎓 Aap poora handbook kar chuke ho

Ab aapke paas hai:
- ✅ App chalane ka tareeka
- ✅ Poora business flow — role-by-role, shuru se `Closed` tak
- ✅ Code ka pattern — 23 modules ka ek naksha
- ✅ File map — kya zinda, kya murda
- ✅ Ek saaf order kaam ka, aur **Phase 1 poora ho chuka**

**Aap ab is project ke owner ho — sirf naam se nahi.**

### Jaate-jaate: 4 baatein jo baar-baar kaam aayengi

Yeh handbook ke dauraan mile **asli bugs** se nikli hain, kitaab se nahi:

| # | Sabak | Kahan mila |
|---|---|---|
| 1 | **Jo test chalta hi nahi, woh fail bhi nahi hota.** `Tests: 389 passed` ke bajaye `Test Files: 16 passed (17)` dekho | [Act 4](05-act4-auditor.md) |
| 2 | **Nav ko us module se jodo jo page sach me fetch karta hai** — us section se nahi jisme woh dikhta hai. Yeh galti 3 baar mili | [Act 5](06-act5-applicant.md) · [Ch 9](09-architecture.md) |
| 3 | **"Kya yeh fix kaam karega?" kaafi nahi — "yeh fix kya naya kholta hai?"** 1-line wala fix vendor ko marks dikha deta | [Act 5](06-act5-applicant.md) |
| 4 | **Banaya hua data crash se bura hai.** Crash dikh jaata hai; jhootha risk score asli jaisa dikhta hai | [Ch 9](09-architecture.md) |

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
