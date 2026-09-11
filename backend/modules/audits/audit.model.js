const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');

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
  status: {
    type: String, enum: [
      'Planning', 'Scoping', 'Risk Assessment', 'Questionnaire', 'Auditor Assigned',
      'Execution', 'Evidence Review', 'Findings', 'Corrective Actions',
      'Verification', 'Report', 'Closed'
    ], default: 'Planning'
  },
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
