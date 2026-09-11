const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const capaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  findingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  rootCause: String,
  actionPlan: String,
  verificationCriteria: String,
  owner: String,
  due: Date,
  severity: { type: String, enum: ['Low','Medium','High','Critical'], default: 'Medium' },
  status: { type: String, enum: ['Open','In Progress','Pending Verification','Verified','Closed'], default: 'Open' },
  evidenceIds: [mongoose.Schema.Types.ObjectId],
  verifiedBy: String,
  verifiedAt: Date,
  orgId: { type: String, required: true, index: true },
}, { timestamps: true });
capaSchema.index({ orgId: 1, status: 1 });
capaSchema.index({ orgId: 1, findingId: 1 });
capaSchema.plugin(softDelete);

module.exports = mongoose.model('CAPA', capaSchema);
