const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const docSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Policy','Certificate','Audit Evidence','Contract','Training Record','Procedure','Compliance Document','Other'], default: 'Other' },
  version: { type: String, default: '1.0' },
  uploadedBy: String,
  filePath: String,
  fileSize: Number,
  expiry: Date,
  relatedAuditId: mongoose.Schema.Types.ObjectId,
  status: { type: String, enum: ['Draft','Approved','Verified','Under Review','Expired','Revoked'], default: 'Draft' },
  orgId: { type: String, required: true, index: true },
}, { timestamps: true });
docSchema.index({ orgId: 1, type: 1 });
docSchema.index({ orgId: 1, expiry: 1 });
docSchema.plugin(softDelete);

module.exports = mongoose.model('Document', docSchema);
