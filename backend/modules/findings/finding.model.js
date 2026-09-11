const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const findingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  criteria: String,
  condition: String,
  cause: String,
  consequence: String,
  severity: { type: String, enum: ['Low','Medium','High','Critical'], default: 'Medium' },
  risk: { type: String, enum: ['Low','Medium','High','Critical'], default: 'Medium' },
  auditId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  controlId: mongoose.Schema.Types.ObjectId,
  owner: String,
  due: Date,
  status: { type: String, enum: ['Open','Acknowledged','In Progress','Resolved','Closed','Overdue','Reopened'], default: 'Open' },
  recommendation: String,
  managementResponse: String,
  action: String,
  verification: String,
  orgId: { type: String, required: true, index: true },
}, { timestamps: true });
findingSchema.index({ orgId: 1, status: 1 });
findingSchema.index({ orgId: 1, severity: 1 });
findingSchema.plugin(softDelete);

module.exports = mongoose.model('Finding', findingSchema);
