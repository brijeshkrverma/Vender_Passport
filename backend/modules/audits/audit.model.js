const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const { LIFECYCLE } = require('./lifecycle');

const auditSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: {
    type: String, required: true, enum: [
      'Financial Audit', 'Internal Audit', 'Operational Audit', 'Compliance Audit',
      'IT Audit', 'Cybersecurity Audit', 'Information Security Audit', 'Quality Audit',
      'Environmental Audit', 'Health & Safety Audit', 'ESG/Sustainability Audit',
      'Supplier/Vendor Audit', 'Fraud Audit', 'Forensic Audit', 'Custom Audit'
    ]
  },
  party: { type: String, enum: ['first-party', 'second-party', 'third-party'] },
  orgId: { type: String, required: true, index: true },
  targetOrgId: String,
  frameworkId: String,
  scope: String,
  status: { type: String, enum: LIFECYCLE, default: LIFECYCLE[0] },
  /** An index into LIFECYCLE — see the note in `lifecycle.js` on why order is a contract. */
  stageIdx: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  lead: String,
  auditors: [String],
  start: Date,
  due: Date,
  completedAt: Date,
}, { timestamps: true });

auditSchema.index({ orgId: 1, status: 1 });
auditSchema.index({ orgId: 1, due: 1 });
auditSchema.index({ orgId: 1, lead: 1 });

auditSchema.plugin(softDelete);

module.exports = mongoose.model('Audit', auditSchema);
