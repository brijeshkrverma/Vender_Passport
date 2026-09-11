const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const riskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, enum: ['Information Security','Vendor Risk','Regulatory','Financial','Operational','Cybersecurity','ESG','Strategic','Compliance'], default: 'Operational' },
  inherent: { type: String, enum: ['Low','Medium','High','Critical'], default: 'Medium' },
  residual: { type: String, enum: ['Low','Medium','High','Critical'], default: 'Medium' },
  owner: String,
  linkedControls: [mongoose.Schema.Types.ObjectId],
  linkedAudits: [mongoose.Schema.Types.ObjectId],
  likelihood: { type: Number, min:1, max:5 },
  impact: { type: Number, min:1, max:5 },
  orgId: { type: String, required: true, index: true },
  status: { type: String, enum: ['Active','Mitigated','Accepted','Closed'], default: 'Active' },
}, { timestamps: true });
riskSchema.index({ orgId: 1, residual: 1 });
riskSchema.index({ orgId: 1, category: 1 });
riskSchema.plugin(softDelete);

module.exports = mongoose.model('Risk', riskSchema);
