const AuditLog = require('./auditlog.model');

class AuditLogService {
  // Best-effort: audit writes must never break the business operation.
  async record({ orgId, actorId, actorName, actorRole, action, entity, entityId, changes }) {
    try {
      await AuditLog.create({ orgId, actorId, actorName, actorRole, action, entity, entityId, changes });
    } catch (e) {
      // silently drop — logging is advisory
    }
  }

  async list(orgId, query = {}) {
    // Audit logs are never soft-deleted, so orgFilter's deletedAt clause
    // does not apply here.
    const filter = orgId ? { orgId } : {};
    if (query.entity) filter.entity = query.entity;
    if (query.entityId) filter.entityId = query.entityId;
    if (query.action) filter.action = query.action;
    if (query.actorId) filter.actorId = query.actorId;
    if (query.since) filter.timestamp = { $gte: new Date(query.since) };
    return AuditLog.find(filter).sort({ timestamp: -1 }).limit(Math.min(parseInt(query.limit, 10) || 200, 1000));
  }
}

module.exports = new AuditLogService();
