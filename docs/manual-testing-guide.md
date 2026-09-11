# Vendor Passport — Manual Testing Guide (All 12 Roles)
## Start: `npm run dev` → http://localhost:5173

---

## 🟢 ROLE 1: Super Admin
**Login:** `super.admin@globaltech.com` / `password123`
**Sidebar:** Sabhi 12 sections, ~61 items visible

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login page → "Sign in" button | /dashboard redirect |
| 2 | Dashboard stats (4 cards) | Active Audits, Open Findings, Expiring Certs, High Risks dikhe |
| 3 | Sidebar → "Administration" expand karo | Users, Settings, Webhooks, Audit Trail, My Passport dikhe |
| 4 | Click "Users & Roles" | Users page lode — 13 users dikhe |
| 5 | Click "Settings" | Settings page lode |
| 6 | Click "Audit Trail" | Stub page aaye — API status "Connected" dikhe |
| 7 | Audits → click kisi audit pe | Audit detail page lode — lifecycle tabs dikhe |
| 8 | Findings → click kisi finding pe | Severity, criteria, consequence dikhe |
| 9 | +Create button | 7 items dikhe (New Audit, New Finding, etc.) |
| 10 | +Create → New Audit | Stepper modal open — 6 steps |
| 11 | AI FAB (bottom-right ? button) | Assistant panel slides open |
| 12 | AI → type "certificates expiring" → send | Response with CRT IDs aaye |

---

## 🟢 ROLE 2: Organization Admin
**Login:** `org.admin@globaltech.com` / `password123`
**Sidebar:** Same as Super Admin (~61 items)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard lode |
| 2 | /users access | Users page lode |
| 3 | /settings access | Settings page lode |
| 4 | Audit create + lifecycle advance | Working ✅ |

---

## 🟢 ROLE 3: Compliance Manager
**Login:** `priya.sharma@globaltech.com` / `password123`
**Sidebar:** ~61 items

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login + Dashboard | Stats load |
| 2 | Audits → ISO 27001 Surveillance Audit click | Detail + lifecycle tab |
| 3 | "Advance Stage" button click | Stage advances, status updates |
| 4 | "← Back" button click | Stage retreats |
| 5 | Findings page | 6 findings table dikhe |
| 6 | Certificates → "Expiring Soon" tab | 3 certs dikhe |
| 7 | Risk Register | 6 risks with inherent/residual |
| 8 | CAPA Board | Kanban columns — Open/In Progress/Verified |
| 9 | AI → "summarize open findings" | Findings summary response |

---

## 🟢 ROLE 4: Audit Manager
**Login:** `meera.nair@globaltech.com` / `password123`
**Sidebar:** ~51 items (no admin-only)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard |
| 2 | Click "/users" URL directly | Redirect to /dashboard (RBAC guard) |
| 3 | Sidebar → check "Administration" section | Should NOT have Users/Settings |
| 4 | Audits, Findings, Risks | All accessible |

---

## 🟢 ROLE 5: Auditor
**Login:** `rohit.kapoor@globaltech.com` / `password123`
**Sidebar:** ~35 items

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard |
| 2 | Try `/users` URL | Redirect to /dashboard |
| 3 | Try `/settings` URL | Redirect to /dashboard |
| 4 | Audits page | ✅ Accessible |
| 5 | Findings page | ✅ Accessible |
| 6 | "+ Create" → New Finding | Working |
| 7 | Certificates page | ✅ Has access |
| 8 | Risk Register | ✅ Has access |

---

## 🟢 ROLE 6: Reviewer
**Login:** `reviewer@globaltech.com` / `password123`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard |
| 2 | Findings page | Can view |
| 3 | Audits page | Can view |
| 4 | /users URL | Redirect to /dashboard |

---

## 🟢 ROLE 7: Risk Manager
**Login:** `arjun.verma@globaltech.com` / `password123`
**Sidebar:** ~16 items

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard |
| 2 | Sidebar items count | Sirf ~16 (Risk-focused) |
| 3 | Risk Register | ✅ Accessible — 6 risks |
| 4 | Audits page | ❌ Should NOT be in sidebar |
| 5 | Try `/audits` URL | Redirect to /dashboard |
| 6 | Try `/users` URL | Redirect to /dashboard |

---

## 🟢 ROLE 8: Document Manager
**Login:** `kritika.bose@globaltech.com` / `password123`
**Sidebar:** ~12 items

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard |
| 2 | Documents page | ✅ Accessible |
| 3 | Evidence page | ✅ Accessible |
| 4 | Audits page | ❌ No access |
| 5 | Risks page | ❌ No access |

---

## 🟢 ROLE 9: Vendor Manager
**Login:** `vendor.mgr@globaltech.com` / `password123`
**Sidebar:** ~25 items

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard |
| 2 | Vendors page | ✅ Accessible |
| 3 | Certificates page | ✅ Accessible — vendor certs |
| 4 | Audits page | ❌ No access |
| 5 | Risks page | ❌ No access |

---

## 🟢 ROLE 10: Employee
**Login:** `employee@globaltech.com` / `password123`
**Sidebar:** ~15 items

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard |
| 2 | Certificates | ✅ Can view |
| 3 | Documents | ✅ Can view |
| 4 | /audits URL | Redirect |
| 5 | /users URL | Redirect |
| 6 | /settings URL | Redirect |

---

## 🟢 ROLE 11: External Company User
**Login:** `jwhitfield@securecore.com` / `password123`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard — only own org data |
| 2 | Certificates | Sirf SecureCore ke certs |
| 3 | /users URL | Redirect |

---

## 🟢 ROLE 12: CA / Consultant
**Login:** `ca@consulting.com` / `password123`
**Sidebar:** ~18 items

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login | Dashboard |
| 2 | Client Portfolio page | 6 clients dikhe with compliance bars |
| 3 | Organizations | Client orgs dikhe |
| 4 | /users URL | Redirect to /dashboard |

---

## 🔧 COMMON TESTS (Any Role)

| # | Test | Expected |
|---|------|----------|
| 1 | Wrong password → `super.admin@globaltech.com` / `wrong` | JSON error: "Invalid email or password" |
| 2 | Register new user → `/register` page | Form loads, can submit |
| 3 | Sidebar accordion — click section title | Expands/collapses ▼/▶ |
| 4 | +Create dropdown | 7 items with icons |
| 5 | AI FAB click → chat panel | Slides from right |
| 6 | AI → send message | Loading dots → response |
| 7 | Search bar (topbar) → type "ISO" | Dropdown results |
| 8 | Bell icon click | Notification panel opens |
| 9 | User chip click | Navigates to Settings |
| 10 | Mobile: hamburger button (≤768px width) | Sidebar toggle |
