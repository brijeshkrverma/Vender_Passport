const service = require('./assistant.service');
const response = require('../../shared/response');

exports.query = async (req, res, next) => {
  try {
    const { message, conversationId } = req.body;
    const models = {
      Audit: req.app.get('models')?.Audit,
      Finding: req.app.get('models')?.Finding,
      Risk: req.app.get('models')?.Risk,
      Certificate: req.app.get('models')?.Certificate,
      Document: req.app.get('models')?.Document,
      Organization: req.app.get('models')?.Organization,
    };
    const result = await service.processQuery(message, req.user, models, conversationId);
    response.success(res, result);
  } catch (e) { next(e); }
};

exports.listConversations = async (req, res, next) => {
  try {
    const result = await service.listConversations(req.user.userId);
    response.success(res, result.conversations, { total: result.meta.total });
  } catch (e) { next(e); }
};

exports.getConversation = async (req, res, next) => {
  try {
    const conversation = await service.getConversation(req.params.id, req.user.userId);
    response.success(res, conversation);
  } catch (e) { next(e); }
};

exports.archiveConversation = async (req, res, next) => {
  try {
    await service.archiveConversation(req.params.id, req.user.userId);
    response.noContent(res);
  } catch (e) { next(e); }
};
