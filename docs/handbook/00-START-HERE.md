# 📘 Vendor Passport Handbook — Yahan Se Shuru Karo

> **Yeh kya hai:** Is project ko samajhne ka ek guided course. 8 chapters, ~5 ghante.
> **Kiske liye:** Aap — project ke owner, jisne yeh code khud nahi likha.
> **Kaise padhna hai:** Order me. Chapter 3 se shuru mat karna.

---

## ⚠️ Sabse pehle yeh niyam

**Sirf padhne se yeh project samajh nahi aayega.**

Har chapter me ek `▶️ Karo` section hai — command chalane ko, button dabane ko.
Woh **skip mat karna**. Padhna 30% hai, chalake dekhna 70%.

Har chapter ke ant me `✅ Checkpoint` hai — 2-3 sawaal.
Agar jawab nahi de paye, **wahi ruk jao**, aage mat badho. Chapter dobara karo.

---

## 📚 Chapters

Yeh handbook **role-by-role** chalti hai — jaise asli zindagi me kaam hota hai.
Har chapter me: **ek role se login karo → uske saare kaam karo → agle role ko handover.**

### Part A — Taiyari

| # | Chapter | Kya hoga | Time |
|---|---|---|---|
| **0** | **[Setup — App Chalao](#chapter-0--app-chalao)** ⬇️ isi file me | App chalne lagega | 30 min |
| **1** | [Kaun-Kaun Hai aur Kaam ka Order](01-cast-and-flow.md) | 12 roles ka parichay + poora flow ek nazar me | 20 min |

### Part B — Role ka Safar (asli kaam yahan hai) 🎭

> Yeh 6 chapters **ek hi kahani** hain. Ek audit shuru se band tak, har role ke haath se guzarti hui.
> **Order me karo** — Act 4 ke liye Act 2 ka kaam zaroori hai.

| # | Act | Login karo | Kya karoge |
|---|---|---|---|
| **2** | [🎬 Act 1 — Setup](02-act1-org-admin.md) | `org.admin@globaltech.com` | Users banao, organization dekho, settings |
| **3** | [🎬 Act 2 — Kaam Shuru](03-act2-compliance-manager.md) | `priya.sharma@globaltech.com` | Audit banao, questionnaire likho aur publish karo |
| **4** | [🎬 Act 3 — Team Lagao](04-act3-audit-manager.md) | `meera.nair@globaltech.com` | Auditor assign karo (+ 4 independence rules live dekho) |
| **5** | [🎬 Act 4 — Fieldwork](05-act4-auditor.md) | `rohit.kapoor@globaltech.com` | Evidence dekho, findings banao, stage aage badhao |
| **6** | [🎬 Act 5 — Jawab Do](06-act5-applicant.md) ⭐ | `vendor.mgr@globaltech.com` | Questionnaire bharo, submit karo, scoring — **aur ek asli bug** |
| **7** | [🎬 Act 6 — Jaanch aur Band](07-act6-assessor.md) | `reviewer@globaltech.com` | Assess karo, return, CAPA, audit close |

| # | Chapter | Kya samjhoge | Time |
|---|---|---|---|
| **8** | [Baaki Roles](08-support-roles.md) | Risk Manager, Document Manager, CA / Consultant | 30 min |

### Part C — Code ki Taraf

| # | Chapter | Kya samjhoge | Time |
|---|---|---|---|
| **9** | [Ek Button ka Safar](09-architecture.md) | Click se database tak — 6 layers, 23 modules ka ek pattern | 45 min |
| **10** | [File ka Naksha](10-file-map.md) | Zinda / adhura / murda — kya delete karna hai | 30 min |
| **11** | [Ab Aage Kya](11-what-next.md) | Cleanup ke phases + aapka pehla change | 30 min |

---

**Jaldi me ho?** Minimum: Chapter 0 → 1 → 3 → 6 → 10.
Us se aap app chala paoge, sabse important flow samajh loge, aur naksha aa jayega.

**⚠️ Ek zaroori baat:** Har role ke chapter me ek **"Yahan Kya Toota Hai"** section hai.
Kuch cheezein is project me **bani hi nahi** hain. Main woh chhupaunga nahi — warna aap wahan atak kar sochoge ki aapse galti hui.

---

## Chapter 0 — App Chalao

**Lakshya:** Is chapter ke ant me app aapke browser me chal raha hoga, demo data ke saath, aur aap login kar chuke honge.

---

### 🎯 Step 1 — Git (5 min) — SABSE ZAROORI

Abhi is project me **git nahi hai**. Matlab agar kuch toota, wapas laane ka koi tareeka nahi.

```powershell
cd "D:\Brijesh Kr. Verma\Test"
git init
git add .
git commit -m "Baseline — handbook se pehle"
```

Ab aap nishchint hoke kuch bhi try kar sakte ho. Kabhi bhi wapas aane ke liye:
```powershell
git status              # kya-kya badla dekho
git checkout -- .       # sab badlav wapas hata do
```

> **💡 Yeh kyun pehla step hai:** Aage aap files delete karoge, code badloge. Bina git ke har change permanent hai. Git ke saath har change wapas ho sakta hai.

---

### 🎯 Step 2 — Jaanch lo ki sab taiyar hai (2 min)

```powershell
node --version
```
Node 20 ya usse upar hona chahiye.

```powershell
Get-Service *mongo*
```
`Running` dikhna chahiye. (Maine check kiya tha — aapke system par MongoDB chal raha hai. ✔)

```powershell
Get-Content .env
```
`MONGO_URI`, `JWT_SECRET` waghairah dikhne chahiye. (Yeh file bhi maujood hai. ✔)

> **⚠️ `.env` ka backup abhi bana lo** — kisi USB ya notes app me copy kar lo. Yeh file git me nahi jaati (`.gitignore` me hai), to agar kho gayi to `JWT_SECRET` aur `ANTHROPIC_API_KEY` dobara nahi milenge.

---

### 🎯 Step 3 — Demo data daalo (2 min)

```powershell
npm run seed
```

**👀 Yeh dikhega:**
```
Connected to MongoDB
All collections cleared
  ✔ Organizations: ...
  ✔ Frameworks: ...
  ✔ Users: 13
  ✔ Audits: ...
  ✔ Controls / Findings / Risks / Certificates / Documents / Vendors ...
═══════════════════════════════════
  SEEDING COMPLETE
═══════════════════════════════════
```

> **⚠️ Dhyan do:** `All collections cleared` ka matlab hai **poora database khaali karke** naya demo data daala jaata hai. Aage kabhi apna asli data daalo, to `npm run seed` mat chalana.

> **📌 Questionnaire ke 5 sawaal bhi seed hote hain** — Published, abhi ke financial year me, 50 marks ke. Isliye Act 5 (questionnaire bharna) seedha chal jaata hai, bina pehle sawaal likhe.
>
> *(Yeh pehle nahi hota tha — seed sirf audits/findings/risks banata tha aur questionnaire khud likhna padta tha. Ab theek hai.)*

---

### 🎯 Step 4 — App chalao (2 min)

```powershell
npm run dev
```

Yeh **do** cheezein ek saath chalata hai (dekho [package.json:7](../../package.json)):
- `BACKEND` (neela) — `node server.js` → port **3000**
- `REACT` (hara) — Vite dev server → port **5173**

**👀 Backend taiyar hone par yeh dikhega:**
```
  ✓ MongoDB connected
  ✓ Scoring engines loaded (6)
╔══════════════════════════════════════════╗
║   🌐 VENDOR PASSPORT — Server Ready      ║
╚══════════════════════════════════════════╝
```

`⚠ Redis unavailable` dikhe to **koi baat nahi** — Redis optional hai (sirf logout ke baad token block karne ke liye). App poora kaam karega.

---

### 🎯 Step 5 — Browser kholo

# 👉 http://localhost:5173

## ❌ `localhost:3000` **NAHI**

**Yeh shayad aapki sabse badi uljhan thi.** [README.md](../../README.md) 3000 bolta hai — **woh galat hai** (woh purane version ka README hai, Ch-6 me detail).

Asli baat:

```
Aap kholte ho :5173  (Vite — React dev server)
        │
        │  page + JavaScript yahan se aata hai
        │
        │  jab page /api/... maangta hai:
        └──────► Vite chupke se use :3000 par bhej deta hai
                 (yeh setting: frontend-react/vite.config.js)
```

`:3000` khologe to aapko **purana build** dikhega ya kuch bhi nahi — kyunki dev me React `:5173` par chal raha hai.

**Yaad rakhne ka tareeka:** *Kaam karte waqt hamesha 5173. 3000 sirf API ke liye hai, aankhon ke liye nahi.*

---

### 🎯 Step 6 — Login karo

Login page dikhega. Yeh use karo:

| Email | Password | Role |
|---|---|---|
| `org.admin@globaltech.com` | `password123` | Organization Admin |

**Sabhi 13 demo users ka password `password123` hai** ([seed.js:90](../../scripts/seed.js)).

Login ke baad Dashboard dikhega, aur left me ek lamba sidebar.

> **👋 Pehli baar ek popup aayega: "Welcome to Vendor Passport"**
>
> Yeh **first-run setup wizard** hai — 2 steps: company details aur ek vendor. **Yeh sach me save karta hai** (settings aur vendors me), to chaho to bhar lo.
>
> Aage badhne ke liye **"Skip setup"** dabao — bas.
>
> **Yeh ek hi baar aata hai, har user ke liye alag.** Agar baar-baar aaye to woh bug hai, batana.
>
> Dhyan do: yeh sirf **Super Admin, Organization Admin aur Compliance Manager** ko dikhta hai — kyunki inhi ke account woh dono steps kar sakte hain. [Act 3](04-act3-audit-manager.md) se aage ke roles ko nahi dikhega.

---

### ▶️ Karo — 5 minute ki tour

Ab bas ghoomo. Kuch samajhne ki koshish mat karo, sirf **dekho**:

1. **Audits** kholo → list dikhegi → kisi ek par click karo → detail page
2. **Findings** kholo → problems ki list
3. **Risks** kholo → phir **Risk Heatmap** → 5×5 ka grid
4. **Vendors** kholo → supplier companies
5. Sidebar me scroll karo → kuch items par **"soon"** ka tag dikhega

> **👀 Woh "soon" wale items** — yeh woh khali pages hain jo bane hi nahi. Sidebar khud bata raha hai ([Sidebar.jsx](../../frontend-react/src/components/Sidebar.jsx) me `soon: true`). Chapter 6 me poori list milegi.

---

### ✅ Checkpoint — Chapter 0

Aage badhne se pehle yeh 4 sawaal:

**1. Kaam karte waqt kaunsa port kholna hai, aur dusra port kis kaam ka hai?**

<details><summary>Jawab dekho</summary>

**5173** kholna hai — wahan React dev server hai.
**3000** backend/API hai. Browser me khud nahi kholte; Vite `/api` wali requests apne aap wahan bhej deta hai ([vite.config.js](../../frontend-react/vite.config.js)).
</details>

**2. `npm run dev` kitni cheezein chalata hai?**

<details><summary>Jawab dekho</summary>

Do — backend (`node server.js`) aur React frontend. `concurrently` package dono ko ek saath chalata hai, isliye terminal me `BACKEND` (neela) aur `REACT` (hara) dono ke messages mix hokar aate hain.
</details>

**3. `npm run seed` chalane se pehle kya sochna zaroori hai?**

<details><summary>Jawab dekho</summary>

Woh **poora database khaali kar deta hai** phir demo data daalta hai. Development me theek hai, par jahan asli data ho wahan kabhi nahi.
</details>

**4. Sidebar me "soon" tag ka kya matlab hai?**

<details><summary>Jawab dekho</summary>

Woh page banaya nahi gaya — click karoge to khali placeholder milega. Project me aise ~20 pages hain.
</details>

---

### 🎉 Chapter 0 poora hua

Agar app chal raha hai aur aap login kar chuke ho — **aapne sabse bada kadam le liya**. Ab code padhna aasan hoga, kyunki har cheez ko aap screen par dekh sakte ho.

**➡️ Agla: [Chapter 1 — Kaun-Kaun Hai aur Kaam ka Order](01-cast-and-flow.md)**

---

## 🆘 Kuch nahi chala to

| Problem | Wajah | Hal |
|---|---|---|
| `MongoDB unavailable — demo mode` | MongoDB band hai | `Get-Service *mongo*` → `Start-Service MongoDB` |
| Login par "Cannot reach the server" | Backend nahi chal raha | Terminal me `BACKEND` wale messages dekho |
| Login par "Invalid credentials" | Seed nahi chala | `npm run seed` chalao |
| Page khali / 404 | Aapne `:3000` khola hai | `:5173` kholo |
| `Cannot find module` | Dependencies missing | `npm run install-all` |
| Port already in use | Purana server chal raha hai | `Get-Process node \| Stop-Process` phir dobara |
