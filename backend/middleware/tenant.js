const { ForbiddenError } = require('../shared/errors');

function tenantIsolation(req, res, next) {
  const requestOrgId = req.params.orgId || req.query.orgId || req.body.orgId;

  // Super Admin can access any org (default to their own org on create when none specified)
  if (req.user.role === 'Super Admin') {
    if (req.method === 'POST' && req.body && !req.body.orgId) {
      req.body.orgId = req.user.orgId;
    }
    return next();
  }

  // All other roles can only access their own org
  if (requestOrgId && requestOrgId !== req.user.orgId) {
    return next(new ForbiddenError('Access denied: organization mismatch'));
  }

  // Auto-inject user's orgId into body for create operations
  if (req.method === 'POST' && req.body) {
    req.body.orgId = req.user.orgId;
  }

  next();
}

module.exports = { tenantIsolation };
