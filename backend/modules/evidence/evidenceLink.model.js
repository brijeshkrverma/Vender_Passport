const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');

const evidenceLinkSchema = new mongoose.Schema({
  evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence', required: true },
  targetType: { type: String, enum: ['finding', 'control', 'question'], required: true },
  targetId: { type: String, required: true },
  targetTitle: { type: String, default: '' },
  orgId: { type: String, required: true, index: true },
  linkedBy: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

evidenceLinkSchema.index({ evidenceId: 1, orgId: 1 });
evidenceLinkSchema.index({ targetType: 1, targetId: 1, orgId: 1 });

evidenceLinkSchema.plugin(softDelete);

module.exports = mongoose.model('EvidenceLink', evidenceLinkSchema);
