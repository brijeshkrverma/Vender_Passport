const service = require('./ccm.service');
const response = require('../../shared/response');

exports.dashboard = async (req, res, next) => {
  try {
    const metrics = service.getDashboardMetrics(req.user.scopeOrgId);
    response.success(res, { metrics, lastRefreshed: new Date().toISOString() });
  } catch (e) { next(e); }
};

exports.alerts = async (req, res, next) => {
  try {
    const alerts = service.getAlerts(req.user.scopeOrgId);
    response.success(res, alerts);
  } catch (e) { next(e); }
};
