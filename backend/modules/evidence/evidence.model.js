const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const evidenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Document','Image','PDF','Excel','Video','Email','Log','Screenshot','System Record','API Data','Interview Note','Observation'], default: 'Document' },
  filePath: String,
  fileSize: Number,
  mimeType: String,
  version: { type: String, default: '1.0' },
  uploadedBy: String,
  expiry: Date,
  confidentiality: { type: String, enum: ['public','internal','confidential','restricted'], default: 'internal' },
  verificationStatus: { type: String, enum: ['Pending','Verified','Rejected'], default: 'Pending' },
  verifiedBy: String,
  verifiedAt: Date,
  orgId: { type: String, required: true, index: true },
  relatedAuditId: mongoose.Schema.Types.ObjectId,
  status: { type: String, enum: ['Draft','Submitted','Under Review','Approved','Rejected','Expired'], default: 'Draft' },
}, { timestamps: true });
evidenceSchema.index({ orgId: 1, type: 1 });
evidenceSchema.index({ orgId: 1, relatedAuditId: 1 });
evidenceSchema.plugin(softDelete);

module.exports = mongoose.model('Evidence', evidenceSchema);
