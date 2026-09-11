const mongoose = require('mongoose');

/**
 * Append-only audit log.
 *
 * Immutability is enforced with explicit query/document hooks. Mongoose has no
 * schema-level `immutable` option (only a per-path one), so `schema.set(
 * 'immutable', true)` is silently ignored and must not be relied on. A capped
 * collection is deliberately NOT used either: when it fills, MongoDB overwrites
 * the OLDEST documents, which for an audit trail means silently losing the
 * earliest history — the opposite of what compliance retention requires.
 */
const auditLogSchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  actorId: String,
  actorName: String,
  actorRole: String,
  action: { type: String, enum: ['create', 'update', 'delete'], required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  changes: mongoose.Schema.Types.Mixed,
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false },
});

const IMMUTABLE = 'Audit log entries are append-only and cannot be modified or removed';

// Block edits to an already-persisted document.
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error(IMMUTABLE));
  next();
});

// Block every query-level mutation and deletion path.
for (const op of [
  'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne',
  'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove',
]) {
  auditLogSchema.pre(op, function (next) {
    next(new Error(IMMUTABLE));
  });
}

auditLogSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => { delete ret._id; return ret; },
});

auditLogSchema.index({ orgId: 1, entity: 1, timestamp: -1 });
auditLogSchema.index({ orgId: 1, entityId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
