/* ======================================================================
   VENDOR PASSPORT — Production Server
   MongoDB + Redis + 18 Module APIs + React SPA serving
   ====================================================================== */

require('dotenv').config();
const env = require('./backend/config/env');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { connectRedis } = require('./backend/config/redis');
const { globalLimiter } = require('./backend/config/rateLimit');
const { requestLogger } = require('./backend/shared/logger');
const app = express();
const PORT = env.PORT;

// ── Security ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

// ── Request logging (winston; morgan available for combined format if needed) ──
app.use(requestLogger);

// ── Global rate limiting (skipped when RATE_LIMIT_ENABLED=0, e.g. test runs) ──
app.use('/api', globalLimiter);

/**
 * ── DEMO IDENTITY, OFF UNLESS ASKED FOR ───────────────────────────────────
 *
 * This used to hand every unauthenticated request an identity —
 * `Compliance Manager` of `ORG-101` — for demoing without a login.
 *
 * It was not the security hole it looked like: every router applies
 * `authenticate`, which runs after this and either replaces `req.user` from a
 * verified JWT or rejects with 401. The fallback never reached a handler.
 *
 * The problem was that it *read* like one. Three separate reviews of this file
 * concluded the API was wide open. Worse, it made a real hole one mistake away:
 * mount a router without `authenticate` and it would be publicly readable as an
 * org admin, silently, because `req.user` was already populated. A missing
 * guard should fail closed with a 401, not fall through to an identity.
 *
 * So it is now opt-in and off by default, and `tests/unit/auth-hardening.test.js`
 * asserts that every mounted router requires authentication — which is the part
 * that keeps holding once nobody remembers this comment.
 */
if (env.ALLOW_DEMO_AUTH) {
  console.warn('  ⚠ ALLOW_DEMO_AUTH is on — unauthenticated requests get a demo identity');
  app.use('/api', (req, res, next) => {
    if (!req.user) {
      req.user = {
        userId: 'demo', role: 'Compliance Manager',
        orgId: 'ORG-101', orgName: 'GlobalTech Solutions',
        scopeOrgId: 'ORG-101',
      };
    }
    next();
  });
}

// ── API Routes ──
const routeModules = {
  '/api/auth':           './backend/modules/auth/auth.routes',
  '/api/users':          './backend/modules/users/user.routes',
  '/api/organizations':  './backend/modules/organizations/org.routes',
  '/api/frameworks':     './backend/modules/frameworks/framework.routes',
  '/api/requirements':   './backend/modules/requirements/requirement.routes',
  '/api/controls':       './backend/modules/controls/control.routes',
  '/api/audits':         './backend/modules/audits/audit.routes',
  '/api/questionnaires': './backend/modules/questionnaires/questionnaire.routes',
  '/api/questionnaire-submissions': './backend/modules/questionnaires/submission.routes',
  '/api/evidence':       './backend/modules/evidence/evidence.routes',
  '/api/findings':       './backend/modules/findings/finding.routes',
  '/api/comments':       './backend/modules/comments/comment.routes',
  '/api/capa':           './backend/modules/capa/capa.routes',
  '/api/risks':          './backend/modules/risks/risk.routes',
  '/api/certificates':   './backend/modules/certificates/cert.routes',
  '/api/documents':      './backend/modules/documents/doc.routes',
  '/api/vendors':        './backend/modules/vendors/vendor.routes',
  '/api/assistant':      './backend/modules/assistant/assistant.routes',
  '/api/notifications':  './backend/modules/notifications/notification.routes',
  '/api/reports':        './backend/modules/reports/report.routes',
  '/api/settings':       './backend/modules/settings/settings.routes',
  '/api/ccm':            './backend/modules/ccm/ccm.routes',
  '/api/auditlogs':      './backend/modules/auditlogs/auditlog.routes',
};

for (const [route, modulePath] of Object.entries(routeModules)) {
  try {
    app.use(route, require(modulePath));
  } catch(e) {
    console.warn(`  ⚠ Route not found: ${route} (${e.message})`);
  }
}

// ── Health check ──
app.get('/api/health', (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const stateMap = { 0:'disconnected', 1:'connected', 2:'connecting', 3:'disconnecting' };
  res.json({
    status: 'ok',
    mode: mongoState === 1 ? 'production' : 'demo',
    mongodb: stateMap[mongoState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// ── Error handler (must be after routes) ──
const { errorHandler } = require('./backend/shared/errorHandler');
app.use(errorHandler);

// ── Serve React SPA ──
app.use(express.static(path.join(__dirname, 'frontend-react', 'dist')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'frontend-react', 'dist', 'index.html'));
});

// ── Start ──
async function start() {
  let mongoConnected = false;

  try {
    await mongoose.connect(env.MONGO_URI);
    mongoConnected = true;
    console.log('  ✓ MongoDB connected');
  } catch(e) {
    console.warn(`  ⚠ MongoDB unavailable — demo mode (${e.message})`);
  }

  /*
   * Warn if the database's indexes no longer match the schemas.
   *
   * Mongoose creates what a schema declares but never drops what it stops
   * declaring, so a changed compound index leaves the old one in place and
   * still enforcing itself. When that index is unique the symptom is a
   * duplicate-key error on a write the schema plainly allows — which is how
   * `{orgId, applicantId, financialYear}` went on rejecting audit-scoped
   * submissions after `auditId` joined the key.
   *
   * Detection only. Correcting it drops and rebuilds indexes, which blocks
   * writes on a large collection, so that stays a deliberate act:
   * `node scripts/sync-indexes.js`.
   */
  if (mongoConnected) {
    try {
      const { checkIndexDrift } = require('./backend/shared/indexDrift');
      const drift = await checkIndexDrift();
      if (drift.length) {
        console.warn(`  ⚠ ${drift.length} stale index(es) — run: node scripts/sync-indexes.js`);
        drift.forEach((d) => console.warn(`      ${d.collection}.${d.name}${d.unique ? ' UNIQUE' : ''}`));
      }
    } catch (e) {
      console.warn(`  ⚠ Could not check indexes — ${e.message}`);
    }
  }

  // Resolve the ES-module scoring engines once, so the first submission to be
  // scored does not pay for the import.
  try {
    const { warmUp } = require('./backend/scoring/loader');
    const out = await warmUp();
    console.log(out.ok
      ? `  ✓ Scoring engines loaded (${out.engines})`
      : `  ⚠ Scoring engines unavailable — ${out.error}`);
  } catch (e) {
    console.warn(`  ⚠ Scoring engines unavailable — ${e.message}`);
  }

  try {
    await connectRedis(env.REDIS_URL);
  } catch(e) {
    console.warn(`  ⚠ Redis unavailable — token blacklisting disabled (${e.message})`);
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   🌐 VENDOR PASSPORT — Server Ready      ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║   URL:   http://localhost:${PORT}              ║`);
    console.log(`║   Mode:  ${mongoConnected ? 'PRODUCTION (MongoDB)' : 'DEMO (mock fallback)'}     ║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
  });
}

start();
