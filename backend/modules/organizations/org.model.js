const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const orgSchema = new mongoose.Schema({
  name: { type: String, required: true },
  industry: String, country: String,
  type: { type: String, enum: ['Own Organization','Supplier','Vendor','Partner','Client'], default: 'Client' },
  compliance: { type: Number, min:0, max:100, default: 0 },
  risk: { type: Number, min:0, max:100, default: 0 },
  activeAudits: { type: Number, default: 0 },
  certs: { type: Number, default: 0 },
  docs: { type: Number, default: 0 },
  contact: String,
  status: { type: String, enum: ['Active','Inactive','Suspended'], default: 'Active' },
  orgId: { type: String, required: true, index: true },
}, { timestamps: true });
orgSchema.index({ orgId: 1, type: 1 });
orgSchema.index({ name: 1, orgId: 1 }, { unique: true });
orgSchema.plugin(softDelete);

module.exports = mongoose.model('Organization', orgSchema);
