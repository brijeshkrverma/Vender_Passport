const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const requirementSchema = new mongoose.Schema({
  clause: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  frameworkId: { type: String, required: true, index: true },
  domain: String,
  isMandatory: { type: Boolean, default: true },
  controlIds: [mongoose.Schema.Types.ObjectId],
  orgId: { type: String, required: true, index: true },
  status: { type: String, enum: ['Active','Deprecated'], default: 'Active' },
}, { timestamps: true });
requirementSchema.index({ orgId: 1, frameworkId: 1, clause: 1 });
requirementSchema.plugin(softDelete);

module.exports = mongoose.model('Requirement', requirementSchema);
