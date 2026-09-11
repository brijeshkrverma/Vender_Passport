const service = require('./cert.service');
const response = require('../../shared/response');
const { parsePagination } = require('../../shared/pagination');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const items = await service.list(req.user.scopeOrgId, req.query);
    response.paginated(res, items.slice(skip, skip+limit), { page, limit, total: items.length });
  } catch(e) { next(e); }
};
exports.getById = async (req, res, next) => {
  try { response.success(res, await service.getById(req.params.id, req.user.scopeOrgId)); } catch(e) { next(e); }
};
exports.create = async (req, res, next) => {
  try { response.created(res, await service.create(req.body, req.user.scopeOrgId)); } catch(e) { next(e); }
};
exports.update = async (req, res, next) => {
  try { response.success(res, await service.update(req.params.id, req.body, req.user.scopeOrgId)); } catch(e) { next(e); }
};
exports.delete = async (req, res, next) => {
  try { await service.delete(req.params.id, req.user.scopeOrgId); response.noContent(res); } catch(e) { next(e); }
};
exports.expiring = async (req, res, next) => {
  try { response.success(res, await service.getExpiring(req.user.scopeOrgId, parseInt(req.query.days) || 90)); } catch(e) { next(e); }
};
exports.stats = async (req, res, next) => {
  try { response.success(res, await service.getStats(req.user.scopeOrgId)); } catch(e) { next(e); }
};
