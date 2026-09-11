# Vendor Passport — Gaps & Issues
> Generated: 27 July 2026  
> Status: Project builds but NOT running end-to-end

---

## 🔴 CRITICAL — Blocking

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | **Server not running** | `npm start` / `npm run dev` not executed, or crashes on startup | Run `npm run dev` from root. Check console for errors. |
| 2 | **Database not seeded** | `npm run seed` never ran. 0 records in all collections. | Run `npm run seed` to populate MongoDB with demo data. |
| 3 | **Root `npm install`** | Dependencies may not be installed (express, mongoose, etc.) | Run `npm install` in root directory. |
| 4 | **Frontend `npm install`** | React deps may be missing | Run `npm install` in `frontend-react/` directory. |

## 🟠 HIGH — Integration Issues

| # | Issue | File | Fix |
|---|-------|------|-----|
| 5 | Frontend API calls hit `/api/...` but backend may not be running | All pages | Start server on port 3000 + Vite proxy configured. |
| 6 | Login/Register call real API but fallback to demo silently | `AuthContext.jsx` | When MongoDB is seeded and server running, remove fallback or show banner. |
| 7 | 30+ sidebar nav items have StubPage (no real page) | `Sidebar.jsx` | Create individual pages for: `risk-heatmap`, `control-testing`, `traceability`, `issues`, `exceptions`, `auditor-workspace`, `audit-program`, `question-bank`, `q-scoring`, `self-assessment`, `mgmt-response`, `org-compare`, `org-hierarchy`, `auditors`, `competency`, `doc-versions`, `policy-lifecycle`, `perm-matrix`, `role-dashboard`, `expiry-alerts`, `my-passport`, `esg`, `report-scheduler`, `sla-dashboard`, `audit-cost`, `three-lines`, `exchange`, `notifications` |
| 8 | No `/api/users` route in backend | `Users.jsx` | Create `backend/modules/users/` with CRUD or add users route to auth module. |
| 9 | No `/api/comments` route for finding discussions | `AuditComments.jsx` | Create comments API. |
| 10 | Settings page doesn't save to backend | `Settings.jsx` | Wire to API or add localStorage persistence. |
| 11 | `/api/notifications` route exists but notifications module may not be registered | `app.js` | Verify route mount in backend/app.js. |

## 🟡 MEDIUM — UX/UI

| # | Issue | File | Fix |
|---|-------|------|-----|
| 12 | Stub pages show generic "Page under development" | 28 stubs | Create full pages or improve stubs with relevant info. |
| 13 | Mobile hamburger toggle may not fully work | `Sidebar.jsx`, `Layout.jsx` | Test on mobile viewport. Add close-on-navigate for mobile. |
| 14 | Filter persistence lost on page navigation | All list pages | Add URL query params or localStorage for filter state. |
| 15 | No pagination on list pages (all data loads at once) | Dashboard, Audits, etc. | Add pagination to API calls + UI controls. |

## 🟢 LOW — Polish

| # | Issue |
|---|-------|
| 16 | No favicon |
| 17 | No PWA icons (manifest.json references icons/icon-192.png which doesn't exist) |
| 18 | No loading skeletons (just text "Loading...") |
| 19 | No 404 page (routes to Dashboard) |
| 20 | No error boundary for React crashes |

---

## Quick Start Commands (Run in order)

```bash
# 1. Root — Install backend deps
cd C:\Users\vs\Downloads\files\\(1\)
npm install

# 2. Seed MongoDB with demo data
npm run seed

# 3. Start backend server
npm run dev

# 4. New terminal — Frontend
cd frontend-react
npm install
npm run dev

# 5. Open browser
# → http://localhost:5173
# → Login: priya.sharma@globaltech.com / password123 / Compliance Manager
```

---

## Verification Checklist

- [ ] `npm install` succeeds in both root and frontend-react
- [ ] `npm run seed` prints "Seeding complete!" with counts
- [ ] `npm run dev` (root) prints "Vendor Passport server running on http://localhost:3000"
- [ ] `npm run dev` (frontend) opens Vite on localhost:5173
- [ ] Login works → redirects to Dashboard
- [ ] Dashboard shows stats from API (not mock)
- [ ] Sidebar has 12 sections with accordion toggle
- [ ] +Create button has 7 dropdown items
- [ ] Role-based nav filtering works (login as Auditor, see fewer items)
- [ ] AI Assistant FAB opens chat panel
- [ ] All 61 nav items navigate without 404
