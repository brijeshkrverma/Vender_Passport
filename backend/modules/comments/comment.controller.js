const service = require('./comment.service');
const response = require('../../shared/response');

exports.getByFinding = async (req, res, next) => {
  try { response.success(res, await service.listByFinding(req.params.findingId, req.user.scopeOrgId)); } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try { response.created(res, await service.create(req.body, req.user, req.user.scopeOrgId)); } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try { await service.delete(req.params.id, req.user.userId, req.user.scopeOrgId); response.noContent(res); } catch (e) { next(e); }
};
