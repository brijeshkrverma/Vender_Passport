const AssistantConversation = require('./assistant.model');
const { NotFoundError } = require('../../shared/errors');

class AssistantService {
  async processQuery(message, user, models, conversationId) {
    const { processQuery: runPipeline } = require('../../assistantService');

    let conversation = null;
    if (conversationId) {
      conversation = await AssistantConversation.findOne({ _id: conversationId, userId: user.userId });
      if (!conversation) throw new NotFoundError('Conversation');
    }

    const result = await runPipeline(message, user, models, conversation);

    if (!conversation) {
      conversation = new AssistantConversation({
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        title: message.slice(0, 80) + (message.length > 80 ? '\u2026' : ''),
      });
    }

    conversation.messages.push({ role: 'user', content: message });
    conversation.messages.push({
      role: 'assistant',
      content: result.text,
      referencedIds: result.referencedIds,
      metadata: { intent: result.intent, scopedOrg: user.orgId, recordCount: result.totalRecords },
    });
    await conversation.save();

    return {
      conversationId: conversation._id,
      message: { role: 'assistant', content: result.text, referencedIds: result.referencedIds },
      metadata: { intent: result.intent, scopeNote: result.scopeNote, totalRecords: result.totalRecords },
    };
  }

  async listConversations(userId) {
    const conversations = await AssistantConversation.find({ userId, isArchived: false })
      .sort({ updatedAt: -1 }).select('title updatedAt messages').limit(20).lean();

    return {
      conversations: conversations.map(c => ({
        id: c._id,
        title: c.title,
        updatedAt: c.updatedAt,
        messageCount: c.messages.length,
        lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 100),
      })),
      meta: { total: conversations.length },
    };
  }

  async getConversation(id, userId) {
    const conversation = await AssistantConversation.findOne({ _id: id, userId }).lean();
    if (!conversation) throw new NotFoundError('Conversation');
    return conversation;
  }

  async archiveConversation(id, userId) {
    const conversation = await AssistantConversation.findOne({ _id: id, userId });
    if (!conversation) throw new NotFoundError('Conversation');
    conversation.isArchived = true;
    await conversation.save();
    return conversation;
  }
}

module.exports = new AssistantService();
