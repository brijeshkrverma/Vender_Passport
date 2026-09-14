« [Chapter 1 — Cast & Flow](01-cast-and-flow.md) | **Chapter 2 · Act 1** | [Chapter 3 — Act 2 →](03-act2-compliance-manager.md)

---

# 🎬 Act 1 — Organization Admin

> **Login:** `org.admin@globaltech.com` / `password123`
> **Time:** 30 min
> **Kahani me jagah:** Sabse pehla kadam — kaam karne wale log hone chahiye.

---

## Yeh role hai kaun?

**Organization Admin = ek company ka malik.**

Woh audit nahi karta, findings nahi likhta. Uska ek hi bada kaam hai: **team khadi karna.**
Users banao, unhe role do, galat log hata do.

Menu me usko **sab kuch** dikhta hai ([AuthContext.jsx:87](../../frontend-react/src/context/AuthContext.jsx) me `allowedAll: true`).

---

## ▶️ Kaam 1 — Login karo aur apna naam dekho

1. `http://localhost:5173` kholo
2. `org.admin@globaltech.com` / `password123`
3. Upar dayein kone me apne naam par click karo

**👀 Dikhega:** aapka naam, email, aur **organization ka naam** (`GlobalTech Solutions`).

> **💡 Yeh org naam kahan se aaya?** Login ke waqt server ne JWT token banaya, usme `orgId` aur `orgName` bhar diye ([auth.js:35-44](../../backend/middleware/auth.js)). Ab har request ke saath woh token jaata hai, aur server usme se padh leta hai ki aap kaun ho. Aapko har baar batana nahi padta.

**▶️ Khud dekho:** Browser me `F12` dabao → `Application` tab → `Local Storage` → `http://localhost:5173`
Wahan `vp_token` aur `vp_user` milenge. Yahi aapka login hai ([AuthContext.jsx:27](../../frontend-react/src/context/AuthContext.jsx)).

---

## ▶️ Kaam 2 — Sidebar dekho aur ginno

Left ka sidebar poora scroll karo.

**👀 Dikhega:** Bahut saare items — Dashboard, Audits, Questionnaire, Findings, Risks, Controls, Documents, Vendors, Users, Settings…

Aur kuch par ek chhota **"soon"** tag.

> **⚠️ "soon" = woh page bana hi nahi.** Click karoge to ek khali placeholder milega. Aise ~20 items hain. Poori list Chapter 10 me.

**Ab yaad rakho:** aapko `allowedAll` mila hai, isliye **sab dikha**. Act 4 me jab Auditor se login karoge, yahi sidebar chhota ho jayega. Wahi is app ka sabse important behaviour hai.

---

## ▶️ Kaam 3 — Users banao (yeh is role ka asli kaam hai)

Sidebar → **Users**

**👀 Dikhega:** 13 demo users ki table — naam, role, email, status, last login.

Upar ek neela note bhi dikhega:

> *"Signing up from the login screen always creates a **new** organization. Adding someone to **this** organization is done here…"*

> **💡 Yeh line bahut important hai.** Register page se koi sign-up kare to uski **nayi company** ban jaati hai — woh aapka data kabhi nahi dekh payega. **Apni** company me kisi ko laane ka sirf ek raasta hai: yeh page. Yahi multi-tenant security ka core idea hai ([roles.js:17-24](../../backend/shared/roles.js)).

### Ab ek user banao

1. **"+ Add User"** dabao
2. Bharo:
   - Name: `Test Auditor`
   - Email: `test.auditor@globaltech.com`
   - Temporary password: `password123`
   - Role: **Auditor**
   - Status: Active
3. **Create user**

**👀 Dikhega:** table me naya row aa gaya.

### ▶️ Ab ek experiment karo — role dropdown gino

"+ Add User" dobara kholo aur **Role** dropdown dekho.

**👀 Kitne options hain? — 11.**
**Kaunsa NAHI hai? — `Super Admin`.**

> **💡 Kyun nahi hai?** Kyunki Super Admin sabhi companies ka data padh sakta hai. Agar Organization Admin ek Super Admin bana de, to woh **doosri companies** ka data khol lega.
>
> Yeh rok **do jagah** lagi hai:
> - UI me: [Users.jsx:61](../../frontend-react/src/pages/Users.jsx) — `me?.role === 'Super Admin'` ho tabhi option judta hai
> - Server me: [roles.js:43](../../backend/shared/roles.js) — `canGrantRole()`
>
> **Do jagah kyun?** UI wali rok sirf *soovidha* ke liye hai (galat option dikhe hi na). Asli rok server wali hai. UI ki rok koi bhi bypass kar sakta hai — server ki nahi.
>
> **Yeh is poore project ka pattern hai: UI suggest karta hai, server decide karta hai.**

### ▶️ Ab dekho ki khud ko delete nahi kar sakte

Table me apne row (`Org Admin`, jiske aage `(you)` likha hai) ko dekho.

**👀 "Remove" button hai hi nahi** — sirf "Edit".
Baaki sabke paas dono hain.

Wajah [Users.jsx:216](../../frontend-react/src/pages/Users.jsx) me likhi hai: *"Removing your own account would lock you out mid-session."*

### ▶️ Kisi aur ko Remove karke dekho (`Test Auditor`)

**👀 Dikhega:** ek confirmation box, jisme likha hai:
> *"The account is deactivated, not erased — their past actions stay in the audit trail."*

> **💡 Yeh soft delete hai** — Chapter 1 me padha tha. User ka record database me rehta hai, bas `deletedAt` set ho jaata hai. **Audit software me record mitana sabse bada gunaah hai** — kal ko koi poochhe "yeh finding kisne likhi thi?" to jawab hona chahiye.

---

## ▶️ Kaam 4 — Organizations sambhalo

Sidebar → **Organizations**

**👀 Dikhega:** organization cards — compliance score bar, status, contact — aur upar dayein **"+ Add Organization"** button.

> **🔧 Yeh pehle sirf padhne ka page tha.** Backend me poora CRUD bana hua tha ([org.routes.js](../../backend/modules/organizations/org.routes.js)) par UI me use karne ka koi raasta nahi tha. **Ab jud gaya hai** — add, edit, remove teenon.

### ▶️ Ek organization banao

**"+ Add Organization"** → bharo:
- Name: `Handbook Test Vendor`
- Relationship: **Supplier**
- Industry / Country / Contact: kuch bhi

**Create organization** → card list me aa jayega. **Edit** aur **Remove** bhi try karo (Remove soft delete hai — wahi confirmation dikhega).

### 🧪 Filter pills dekho

**👀 Ab 5 pills hain:** Own Organization · Supplier · Vendor · Partner · Client

> **🔧 Pehle yahan `Internal` naam ka pill tha — jo model me exist hi nahi karta.** Matlab us pill par click karne se **hamesha khaali list** aati thi. Aur `Own Organization` aur `Supplier` — jo asli types hain — unke liye koi pill hi nahi tha.
>
> Ab pills model ke enum se match karte hain ([org.model.js:6](../../backend/modules/organizations/org.model.js)).

### 🤔 Ek design sawaal jo abhi khula hai

Aapko shayad sirf **1-2 cards** dikhen, jabki seed 7 organizations banata hai.

**Yeh bug nahi hai** — yeh multi-tenancy hai. Har organization ka apna `orgId` hai (ORG-101 se ORG-107), aur `orgFilter` sirf **aapki** org dikhata hai. Aap ORG-101 ho, to aapko ORG-101 wali dikhi.

**Par page ka subtitle kehta hai** *"Vendors, partners, and internal orgs in your network"* — jo "mera network" wala matlab hai, "platform ke tenants" wala nahi.

**Aur is project me ek alag `Vendors` module bhi hai** ([vendor.model.js](../../backend/modules/vendors/vendor.model.js)) — riskTier, onboardingStatus ke saath — jo asal me "mera supply chain" hai.

> **📌 To sawaal yeh hai: `Organizations` aur `Vendors` me farak kya hai?**
> - Agar Organizations = **platform ke tenants**, to abhi jo ho raha hai woh sahi hai — bas subtitle galat hai.
> - Agar Organizations = **mera network**, to seed galat hai (sabko `orgId: ORG-101` hona chahiye) aur Vendors ke saath overlap hai.
>
> **Yeh maine jaan-boojh kar nahi badla** — yeh code ka bug nahi, **product ka faisla** hai, aur woh aapka hai. [Chapter 11 Phase 3](11-what-next.md) me isko list kiya hai.

---

## ▶️ Kaam 5 — Settings kholo

Sidebar → **Settings** (ya upar apne naam → Settings)

**👀 Dikhega:** Organization naam, industry, contact email, aur kuch toggle switches:
Email Notifications, Audit Reminders, Certificate Expiry Alerts, Two-Factor Authentication, Session Timeout, Audit Logging.

Kuch badlo aur **Save Changes** dabao → "Settings saved" toast aayega.

### 👀 Dhyan do — toggles ab sach bolte hain

Har toggle ke neeche ek chhoti line hai, aur woh **dabte nahi**:

| Toggle | Kya likha hai |
|---|---|
| Email Notifications | *Not active yet — no mail is sent.* |
| Audit Reminders | *Not active yet — no reminder job runs.* |
| Certificate Expiry Alerts | *Not active yet — expiry shows on the Expiry Alerts page instead.* |
| Two-Factor Authentication | *Not active yet — sign-in is password + JWT only.* |
| Session Timeout | *Not active yet — sessions end when the token expires (24h).* |
| **Audit Logging** | ✅ **Always on** — *cannot be disabled.* |

> **🔧 Pehle yeh sab chalu-band ho jaate the aur "Settings saved" bhi dikha dete the — par karte kuch nahi the.**
>
> Maine poore backend me dhoonda tha: `twoFactor`, `sessionTimeout`, `certExpiryAlerts`, `auditReminders` sirf **do jagah** milte hain — [settings.model.js](../../backend/modules/settings/settings.model.js) (save karne ke liye) aur [settings.routes.js](../../backend/modules/settings/settings.routes.js) (validate karne ke liye). **Koi code inhe padhta hi nahi.**
>
> Aur email? [shared/email.js](../../backend/shared/email.js) file to hai, par usko **koi module import nahi karta.** Koi mail kabhi nahi jaati.

> ### ⚠️ Yeh sirf UI ki galti nahi thi — yeh khatarnaak tha
>
> Ek compliance product me **"Two-Factor Authentication: ON"** dikhna, aur asal me kuch na hona — iska matlab hai koi is control ko **"lagu hai"** report kar dega. Audit me isse bura kuch nahi: aisa control jo kagaz par hai, hakeekat me nahi.
>
> **Isliye ab woh saaf-saaf "Not active yet" kehta hai.** Toggle hataya nahi — feature ka iraada asli hai — par jhooth bolna band kar diya.

> ### 💡 "Audit Logging" ab band ho hi nahi sakta — aur yeh jaan-boojh kar hai
>
> Maine check kiya: `auditTrail(...)` **18 routers par bina shart lagi hai** — har badlav record hota hai.
>
> To woh toggle pehle bhi jhooth tha (band karne se logging band nahi hoti thi). **Aur honi bhi nahi chahiye** — jis audit platform ka audit log settings page se band ho jaye, woh audit platform hai hi nahi.
>
> Ab woh locked hai: hamesha on.

---

## 🔴 Yahan Kya Toota Hai — Act 1 ka sach

| Cheez | Haalat |
|---|---|
| Users banana / badalna / hatana | ✅ **Poora kaam karta hai** |
| Super Admin ki rok | ✅ **Dono taraf lagi hai** (UI + server) |
| Soft delete + audit trail | ✅ **Kaam karta hai** |
| Organizations create/edit | ✅ **🔧 FIX ho gaya** — add / edit / remove jud gaya |
| Organizations ke filter pills | ✅ **🔧 FIX ho gaya** — `Internal` (jo exist hi nahi karta) hataya, asli 5 types lagaye |
| Settings ke toggles | ✅ **🔧 FIX ho gaya** — jhooth bolna band; "Not active yet" saaf likha hai |
| Audit Logging toggle | ✅ **🔧 FIX ho gaya** — ab locked, hamesha on |
| Permission Matrix / Role Dashboard (menu me) | ❌ **Khali stubs** — [Phase 3 ka faisla](11-what-next.md) |
| Organizations vs Vendors ka overlap | 🤔 **Product ka faisla** — upar wala "design sawaal" dekho |

### 🔧 Is chapter ke fixes (kya-kya badla)

| # | Kya | Kahan |
|---|---|---|
| 1 | Organizations page par poora CRUD — "+ Add Organization", Edit, Remove | [Organizations.jsx](../../frontend-react/src/pages/Organizations.jsx) |
| 2 | Filter pills model ke enum se match karte hain (`Internal` hata, `Own Organization` + `Supplier` jude) | [Organizations.jsx](../../frontend-react/src/pages/Organizations.jsx) |
| 3 | Settings ke 5 dead toggles ab disabled + "Not active yet" wajah ke saath | [Settings.jsx](../../frontend-react/src/pages/Settings.jsx) |
| 4 | Audit Logging toggle locked — hamesha on, band nahi ho sakta | [Settings.jsx](../../frontend-react/src/pages/Settings.jsx) |

> **Do cheezein jaan-boojh kar nahi chhui:**
> - **Stub pages** (Permission Matrix, Role Dashboard) — scope ka faisla, bug nahi.
> - **Organizations vs Vendors** — yeh **product ka faisla** hai (dono ka matlab kya hai), code ka nahi. Iska jawab aapko dena hai.

---

## ✅ Checkpoint — Act 1

**1. Kisi ko apni company me laane ka sahi tareeka kya hai, aur register page se kyun nahi?**

<details><summary>Jawab</summary>

Sahi tareeka: **Users → + Add User**.
Register page se sign-up karne par **nayi company** ban jaati hai (`SELF_SIGNUP_ROLES` me Organization Admin isiliye allowed hai — woh hamesha ek khaali nayi org paata hai, [roles.js:17-28](../../backend/shared/roles.js)). Woh banda aapka data kabhi nahi dekh payega.
</details>

**2. Organization Admin, Super Admin role kyun nahi de sakta — aur yeh rok kahan-kahan lagi hai?**

<details><summary>Jawab</summary>

Kyunki Super Admin ka `scopeOrgId` `null` hota hai = **sabhi companies** ka data. Rok do jagah: UI me [Users.jsx:61](../../frontend-react/src/pages/Users.jsx) (option chhupata hai) aur server me [roles.js:43](../../backend/shared/roles.js) `canGrantRole()` (asli rok). **Server wali asli hai.**
</details>

**3. "Two-Factor Authentication" toggle ab dabta kyun nahi?**

<details><summary>Jawab</summary>

Kyunki woh **kaam nahi karta** — 2FA kahin implement nahi hai. Pehle woh dabta tha aur "Settings saved" bhi dikha deta tha, matlab user ko lagta tha 2FA chalu ho gaya.
Ek compliance product me yeh khatarnaak hai: koi us control ko "lagu hai" report kar deta. Ab woh disabled hai aur *"Not active yet"* saaf likha hai.
</details>

**4. "Audit Logging" toggle band kyun nahi ho sakta?**

<details><summary>Jawab</summary>

Kyunki audit logging **band hoti hi nahi** — `auditTrail(...)` 18 routers par bina shart lagi hai. Woh toggle pehle bhi jhooth tha.
Aur usko band karne ki suvidha honi bhi nahi chahiye: jis audit platform ka audit log settings se band ho jaye, woh audit platform hai hi nahi.
</details>

**5. User "Remove" karne par uska data mit jaata hai?**

<details><summary>Jawab</summary>

Nahi — soft delete. `deletedAt` set hota hai aur `orgFilter` usko queries se chhupa deta hai ([scope.js](../../backend/shared/scope.js)). Record database me rehta hai taaki audit trail toote nahi.
</details>

---

## 🤝 Handover

**Aapne kya kiya:** team khadi kar di, roles de diye.
**Ab kya chahiye:** koi to audit banaye aur sawaal likhe.

Woh kaam **Compliance Manager** ka hai.

**➡️ Agla: [Chapter 3 — Act 2: Compliance Manager](03-act2-compliance-manager.md)**

> **Logout karna mat bhoolna** — upar apne naam par click → Sign out. Har Act me naya login karna hai.
