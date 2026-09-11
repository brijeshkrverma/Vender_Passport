const service = require('./settings.service');
const response = require('../../shared/response');

exports.get = async (req, res, next) => {
  try {
    const settings = await service.getByOrgId(req.user.orgId);
    response.success(res, settings || {});
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const result = await service.upsert(req.user.orgId, req.body);
    response.success(res, result);
  } catch (e) { next(e); }
};
