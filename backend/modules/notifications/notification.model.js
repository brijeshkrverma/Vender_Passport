const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  type: { type: String, enum: ['cert_expiry','finding_overdue','audit_due','doc_shared','action_required','audit_assigned','system'], required: true },
  title: String,
  body: String,
  unread: { type: Boolean, default: true },
  metadata: { entityType: String, entityId: String },
}, { timestamps: true });

notificationSchema.index({ userId: 1, unread: 1 });
notificationSchema.plugin(softDelete);

module.exports = mongoose.model('Notification', notificationSchema);
