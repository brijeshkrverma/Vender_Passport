const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const frameworkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['Standard','Framework','Regulation','Reporting','Professional Standard'] },
  domain: String,
  certifiable: Boolean,
  currentVersion: String,
  jurisdiction: String,
  description: String,
  orgId: { type: String, required: true, index: true },
  status: { type: String, enum: ['Active','Superseded','Draft'], default: 'Active' },
}, { timestamps: true });
frameworkSchema.index({ orgId: 1, category: 1 });
frameworkSchema.index({ name: 1, orgId: 1 }, { unique: true });
frameworkSchema.plugin(softDelete);

module.exports = mongoose.model('Framework', frameworkSchema);
