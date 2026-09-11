const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: String,
  email: String,
  riskTier: { type: String, enum: ['Critical','High','Medium','Low'], default: 'Medium' },
  complianceScore: { type: Number, min:0, max:100, default: 0 },
  onboardingStatus: { type: String, enum: ['Invited','Onboarding','Active','Suspended','Offboarded'], default: 'Invited' },
  certIds: [mongoose.Schema.Types.ObjectId],
  contractRef: String,
  performanceScore: Number,
  lastAssessment: Date,
  orgId: { type: String, required: true, index: true },
  vendorOrgId: String,
}, { timestamps: true });
vendorSchema.index({ orgId: 1, riskTier: 1 });
vendorSchema.index({ orgId: 1, onboardingStatus: 1 });
vendorSchema.plugin(softDelete);

module.exports = mongoose.model('Vendor', vendorSchema);
