const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  referencedIds: [String],
  metadata: {
    intent: { type: String, enum: ['audits','findings','risks','certificates','documents','organizations','general_summary','out_of_scope'] },
    scopedOrg: String,
    recordCount: Number,
  },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true },
  role: { type: String, required: true },
  title: { type: String, default: 'New conversation' },
  messages: [messageSchema],
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

conversationSchema.methods.toLLMHistory = function () {
  return this.messages.map(m => ({ role: m.role, content: m.content }));
};

module.exports = mongoose.model('AssistantConversation', conversationSchema);
