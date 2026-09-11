const router = require('express').Router();
const ctrl = require('./assistant.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { getRedis } = require('../../config/redis');
const crypto = require('crypto');

const assistantRoles = ['Super Admin','Organization Admin','Compliance Manager','Audit Manager','Auditor','Reviewer','Risk Manager','Document Manager','Vendor Manager','Employee','External Company User','CA / Consultant'];

const rateMap = new Map();

async function rateLimit(req, res, next) {
  const key = `ratelimit:assistant:${req.user.userId}`;
  try {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    if (count > 20) return res.status(429).json({ error: 'Too many requests', retryAfter: 60 });
    return next();
  } catch {
    const now = Date.now();
    let entry = rateMap.get(req.user.userId);
    if (!entry || now > entry.resetAt) { entry = { count: 0, resetAt: now + 60000 }; rateMap.set(req.user.userId, entry); }
    entry.count++;
    if (entry.count > 20) return res.status(429).json({ error: 'Too many requests', retryAfter: 60 });
    next();
  }
}

function validateQuery(req, res, next) {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.length > 2000 || message.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid message — must be string, max 2000 chars' });
  }
  if (req.body.orgId || req.body.role || req.body.scope) {
    return res.status(400).json({ error: 'Scope, orgId, and role are derived from your session' });
  }
  next();
}

router.post('/query', authenticate, restrictTo(...assistantRoles), rateLimit, validateQuery, async (req, res, next) => {
  try {
    const { message } = req.body;
    try {
      const redis = getRedis();
      const cacheKey = `ai:query:${crypto.createHash('md5').update(`${message}|${req.user.role}|${req.user.scopeOrgId ?? ''}`).digest('hex')}`;
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch {}
    await ctrl.query(req, res, next);
  } catch (e) { next(e); }
});

router.get('/conversations', authenticate, restrictTo(...assistantRoles), ctrl.listConversations);
router.get('/conversations/:id', authenticate, restrictTo(...assistantRoles), ctrl.getConversation);
router.delete('/conversations/:id', authenticate, restrictTo(...assistantRoles), ctrl.archiveConversation);

module.exports = router;
