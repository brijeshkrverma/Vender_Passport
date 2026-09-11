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

## ▶️ Kaam 4 — Organizations dekho

Sidebar → **Organizations**

**👀 Dikhega:** cards — vendors, partners, clients — compliance score bar ke saath.

**▶️ Ab ek cheez dhundo: "Add Organization" button.**

**👀 Nahi milega.** Yeh page **sirf padhne ke liye** hai ([Organizations.jsx](../../frontend-react/src/pages/Organizations.jsx) — koi create/edit code nahi).

> **📌 Yeh gap hai, feature nahi.** Backend me `POST /api/organizations` bana hua hai ([org.routes.js](../../backend/modules/organizations/org.routes.js)), par UI me use karne ka koi raasta nahi. **Aisi cheezein aapko poore project me milengi — backend taiyar, UI adhura.**

---

## ▶️ Kaam 5 — Settings kholo

Sidebar → **Settings** (ya upar apne naam → Settings)

**👀 Dikhega:** Organization naam, industry, contact email, aur kuch toggle switches:
Email Notifications, Audit Reminders, Certificate Expiry Alerts, Two-Factor Authentication, Session Timeout, Audit Logging.

Kuch badlo aur **Save Changes** dabao → "Settings saved" toast aayega.

### ⚠️ Ab sach jaan lo

**Yeh toggles kuch karte nahi hain.**

Maine poore backend me dhoonda — `twoFactor`, `sessionTimeout`, `certExpiryAlerts`, `auditReminders` sirf **do jagah** milte hain:
- [settings.model.js](../../backend/modules/settings/settings.model.js) — database me save karne ke liye
- [settings.routes.js](../../backend/modules/settings/settings.routes.js) — validate karne ke liye

**Kahin bhi inko padha nahi jaata.** Matlab:
- "Two-Factor Authentication" ON karo → **2FA chalu nahi hoga**
- "Session Timeout" OFF karo → **kuch nahi hoga**

Yeh sirf database me `true`/`false` save ho jaate hain aur wahin pade rehte hain.

> **💡 Yeh "one-shot AI project" ki classic nishani hai** — UI bana diya gaya kyunki dikhna chahiye tha, par usse jodne wala kaam nahi hua. Chapter 11 me faisla lena hoga: yeh toggles chalu karein ya UI se hata dein.

---

## 🔴 Yahan Kya Toota Hai — Act 1 ka sach

| Cheez | Haalat |
|---|---|
| Users banana / badalna / hatana | ✅ **Poora kaam karta hai** |
| Super Admin ki rok | ✅ **Dono taraf lagi hai** (UI + server) |
| Soft delete + audit trail | ✅ **Kaam karta hai** |
| Organizations create/edit | ❌ **UI nahi hai** (API bani hui hai) |
| Settings ke security toggles | ❌ **Save hote hain, use nahi hote** |
| Permission Matrix / Role Dashboard (menu me) | ❌ **Khali stub pages** |

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

**3. Settings me "Two-Factor Authentication" ON karne se kya hoga?**

<details><summary>Jawab</summary>

**Kuch nahi.** Database me `twoFactor: true` save ho jayega, par koi code use nahi padhta. Yeh adhura feature hai.
</details>

**4. User "Remove" karne par uska data mit jaata hai?**

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
