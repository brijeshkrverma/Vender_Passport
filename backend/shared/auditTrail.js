const { recordAuditFromReq } = require('./audit');

/**
 * Router-level audit trail.
 *
 * Records every successful mutating request against a module's entity. Mounted
 * once per router rather than sprinkled through controllers, so a new endpoint
 * cannot accidentally ship without leaving a trail.
 *
 *   router.use(authenticate, restrictTo(...), auditTrail('Finding'));
 *
 * Writes are best-effort and never block or fail the response.
 */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function auditTrail(entity) {
  return (req, res, next) => {
    if (!MUTATING.has(req.method)) return next();

    let recorded = false;
    const capture = (body) => {
      if (recorded || res.statusCode >= 400) return;
      recorded = true;

      // POST /:id/advance is a state change, not a creation.
      const action = req.method === 'DELETE'
        ? 'delete'
        : req.method === 'POST' && !req.params.id ? 'create' : 'update';

      const payload = body && typeof body === 'object' ? body.data : null;
      const entityId = req.params.id || (payload && (payload.id || payload._id)) || '';

      recordAuditFromReq(req, {
        action,
        entity,
        entityId: String(entityId),
        changes: action === 'delete' ? { path: req.path } : redact(req.body),
      });
    };

    const json = res.json.bind(res);
    const send = res.send.bind(res);
    res.json = (body) => { capture(body); return json(body); };
    res.send = (body) => { capture(body); return send(body); };

    next();
  };
}

/** Never let secrets reach the trail. */
const SENSITIVE = ['password', 'newPassword', 'oldPassword', 'refreshToken', 'token'];
function redact(body) {
  if (!body || typeof body !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = SENSITIVE.includes(k) ? '[redacted]' : v;
  }
  return out;
}

module.exports = { auditTrail };
