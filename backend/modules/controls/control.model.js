const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const controlSchema = new mongoose.Schema({
  name: { type: String, required: true },
  family: String,
  standard: String,
  owner: String,
  effectiveness: { type: String, enum: ['Effective','Partially Effective','Needs Improvement','Ineffective'], default: 'Effective' },
  mappedRisks: [String],
  frameworkId: String,
  description: String,
  testFrequency: String,
  orgId: { type: String, required: true, index: true },
  status: { type: String, enum: ['Active','Retired','Draft'], default: 'Active' },
}, { timestamps: true });
controlSchema.index({ orgId: 1, family: 1 });
controlSchema.index({ orgId: 1, frameworkId: 1 });
controlSchema.plugin(softDelete);

module.exports = mongoose.model('Control', controlSchema);
