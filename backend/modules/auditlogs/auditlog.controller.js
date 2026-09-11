const service = require('./auditlog.service');
const response = require('../../shared/response');

exports.list = async (req, res, next) => {
  try {
    const items = await service.list(req.user.scopeOrgId, req.query);
    response.success(res, items);
  } catch (e) { next(e); }
};
