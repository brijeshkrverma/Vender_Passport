# Vendor Passport — Project Discovery

## Technology Stack (Verified)

| Technology | Version | Purpose | Risk |
|------------|---------|---------|------|
| Node.js | >=18.0.0 | Runtime | OK |
| Express | ^4.21.0 | HTTP server + SPA serving | OK |
| Mongoose | ^8.8.0 | MongoDB ODM | Schema enforcement disabled (strict:false) |
| @anthropic-ai/sdk | ^0.32.0 | Claude API | Stubbed; real key needed for production |
| Helmet | ^8.0.0 | Security headers | CSP disabled explicitly |
| CORS | ^2.8.5 | Cross-origin | Defaults to wildcard `*` |
| dotenv | ^16.4.0 | Config | OK |
| express-rate-limit | ^7.4.0 | Rate limiting | In package.json but **NOT imported/used** |

## File Inventory (21 source files, ~6,700 lines total)

| File | Lines | Type |
|------|-------|------|
| app.js | 5,267 | Frontend SPA (vanilla JS) |
| index.html | 687 | HTML shell + CSS |
| server.js | 92 | Express entry point |
| backend/routes/assistant.js | 226 | AI assistant API routes |
| backend/assistantService.js | 493 | AI pipeline + query builders |
| backend/middleware/roleScopes.js | 135 | RBAC matrix (12 roles × 6 domains) |
| backend/models/AssistantConversation.js | 90 | Conversation Mongoose schema |
| models/*.js (6 files) | ~36 | Mongoose model stubs (all strict:false) |
| package.json | 23 | Dependencies |
| .env.example | 8 | Environment template |
| sw.js | 53 | Service Worker |
| manifest.json | 17 | PWA manifest |

## Architecture Pattern

**Frontend:** Vanilla JavaScript SPA. No framework. HTML rendered via template string interpolation into innerHTML. 52 routes registered on a flat `ROUTES` object. Global `STATE` object + module-level filter variables. No state management library.

**Backend:** Express pipeline architecture. Auth middleware → Intent classification → Scoped data fetch → System prompt build → Claude API call → Response format. 5 total API endpoints (4 assistant + 1 health).

**Data:** 40+ mock data arrays/objects in app.js, ~1,500 total items. 6 Mongoose model stubs with `strict:false`. Real schemas exist but are essentially schemaless wrappers.

## Key Mismatches
- Frontend uses `org` (string name), backend models use `orgId` (string ID)
- Frontend uses `audit` (string ID) on findings, backend uses `auditId`
- `ASSISTANT_CONVERSATION` (frontend) vs `AssistantConversation` (backend) — different names
- express-rate-limit in package.json but never imported
