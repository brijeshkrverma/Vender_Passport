<<<<<<< HEAD
# Vender_Passport
This is the my vender passport application. 
=======
# Vendor Passport

**Enterprise Audit, Compliance & Certification Platform**

Vendor Passport is a full-stack audit, compliance, and vendor certification platform. It enables organizations to manage audits, findings, risks, certifications, vendor assessments, and evidence collection — all from a single dashboard. An AI-powered "Ask Passport" assistant provides natural-language querying over scoped audit data.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Vanilla JS, HTML5, CSS Custom Props |
| Backend     | Node.js, Express 4                  |
| Database    | MongoDB, Mongoose 8                 |
| AI          | Anthropic Claude (Sonnet 4)         |
| Testing     | Vitest                              |
| Security    | Helmet, CORS, rate-limiting, JWT    |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
copy .env.example .env

# 3. (Optional) Edit .env with your Anthropic API key for AI features

# 4. Start the server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Setup

Copy `.env.example` to `.env` and configure:

| Variable           | Description                      | Default                                  |
|--------------------|----------------------------------|------------------------------------------|
| `PORT`             | Server port                      | `3000`                                   |
| `MONGO_URI`        | MongoDB connection string        | `mongodb://localhost:27017/vendor-passport` |
| `ANTHROPIC_API_KEY`| Claude API key                   | *(required for AI assistant)*            |
| `ANTHROPIC_MODEL`  | Claude model ID                  | `claude-sonnet-4-20250514`               |
| `CORS_ORIGIN`      | Allowed CORS origin              | `http://localhost:3000`                  |
| `NODE_ENV`         | Environment mode                 | `development`                            |
| `JWT_SECRET`       | HMAC-SHA256 signing secret       | *(change in production)*                 |
| `JWT_EXPIRY`       | Token lifetime                   | `24h`                                    |

---

## Project Structure

```
vendor-passport/
├── app.js                  # Frontend SPA logic (vanilla JS)
├── index.html              # SPA shell
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── server.js               # Express entry point
├── package.json
├── vitest.config.js        # Test runner config
├── .env.example            # Environment template
│
├── shared/
│   └── esc.js              # Shared HTML-escaping utility
│
├── backend/
│   ├── assistantService.js # AI assistant business logic
│   ├── routes/
│   │   └── assistant.js    # /api/assistant/* endpoints
│   ├── models/
│   │   └── AssistantConversation.js
│   └── middleware/
│       └── roleScopes.js   # RBAC scope definitions
│
├── models/                 # Mongoose schemas
│   ├── Audit.js
│   ├── Finding.js
│   ├── Risk.js
│   ├── Certificate.js
│   ├── Document.js
│   ├── Organization.js
│   ├── Response.js
│   └── EvidenceLink.js
│
├── docs/
│   ├── API.md
│   ├── Search_Keyword.md
│   ├── implementation/
│   └── project-audit/
│
├── tests/
│   └── unit/
│       └── helpers.test.js
│
├── icons/
└── output/
```

---

## Available npm Scripts

| Script         | Command                | Description                          |
|----------------|------------------------|--------------------------------------|
| `start`        | `node server.js`       | Start production server              |
| `dev`          | `node --watch server.js` | Start with auto-reload             |
| `test`         | `vitest run`           | Run all tests once                   |
| `test:watch`   | `vitest`               | Run tests in watch mode              |

---

## Demo Mode vs Production Mode

### Demo Mode (default, no MongoDB)
When MongoDB is unavailable, the server starts in **frontend-only demo mode**. All data is served from in-memory mock data defined in `app.js`. No authentication is required — pass demo headers for role simulation:

```
x-demo-role: Compliance Manager
x-demo-org-id: ORG-101
x-demo-user-id: demo-user-001
```

Available roles: `Compliance Manager`, `Auditor`, `Vendor Manager`, `CA / Consultant`.

### Production Mode
Requires MongoDB and valid `.env` configuration. Enables:
- JWT Bearer token authentication
- Role-based data scoping
- Persistent conversation history
- Claude AI integration (requires `ANTHROPIC_API_KEY`)
- Rate limiting (100 req/min global, 20 req/min per user on queries)
>>>>>>> e647ac3 (Initial commit - Vendor Passport audit & compliance platform)
