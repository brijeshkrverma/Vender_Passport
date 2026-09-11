const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const certSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: String,
  issuer: String,
  holder: String,
  type: String,
  issue: Date,
  expiry: { type: Date, required: true },
  status: { type: String, enum: ['Active','Expiring Soon','Expired','Revoked'], default: 'Active' },
  verified: { type: Boolean, default: false },
  orgId: { type: String, required: true, index: true },
  ownerOrgId: String,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });
certSchema.virtual('daysLeft').get(function() {
  return Math.round((this.expiry - new Date()) / 86400000);
});
certSchema.index({ orgId: 1, status: 1 });
certSchema.index({ orgId: 1, expiry: 1 });
certSchema.plugin(softDelete);

module.exports = mongoose.model('Certificate', certSchema);
