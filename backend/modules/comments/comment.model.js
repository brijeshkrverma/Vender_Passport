const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');

const commentSchema = new mongoose.Schema({
  findingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  authorId: String,
  author: { type: String, required: true },
  body: { type: String, required: true, trim: true },
  orgId: { type: String, required: true, index: true },
}, { timestamps: true });

commentSchema.index({ findingId: 1, createdAt: 1 });
commentSchema.index({ orgId: 1, createdAt: -1 });

commentSchema.plugin(softDelete);

module.exports = mongoose.model('Comment', commentSchema);
