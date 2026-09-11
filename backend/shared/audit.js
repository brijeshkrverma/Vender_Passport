// Shared audit helper — writes an append-only AuditLog entry (best-effort).
// Never throws: audit failures must not break the business operation.
const AuditLog = require('../modules/auditlogs/auditlog.model');

async function recordAudit({ orgId, actorId, actorName, actorRole, action, entity, entityId, changes }) {
  try {
    await AuditLog.create({ orgId, actorId, actorName, actorRole, action, entity, entityId, changes });
  } catch (e) {
    // best-effort — drop silently
  }
}

// Convenience wrapper that reads actor from an Express request
function recordAuditFromReq(req, { action, entity, entityId, changes }) {
  return recordAudit({
    orgId: req.user.scopeOrgId || req.user.orgId,
    actorId: req.user.userId,
    // req.user.name comes from the JWT; orgName would name the organization,
    // not the person who performed the action.
    actorName: req.user.name || req.user.userId,
    actorRole: req.user.role,
    action,
    entity,
    entityId,
    changes,
  });
}

module.exports = { recordAudit, recordAuditFromReq };
