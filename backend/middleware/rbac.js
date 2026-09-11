const { ForbiddenError } = require('../shared/errors');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ForbiddenError('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' does not have access to this resource`));
    }
    next();
  };
}

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ForbiddenError('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' does not have access to this module`));
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  requireRole('Super Admin', 'Organization Admin')(req, res, next);
}

/**
 * Roles allowed to open and close an audit engagement.
 *
 * 'Compliance Manager' belongs here: the product's primary "+ Create → New
 * Audit" flow is built for that role, but it was missing from this list, so the
 * wizard returned 403 while the UI reported success.
 */
function requireAuditor(req, res, next) {
  requireRole(
    'Super Admin', 'Organization Admin', 'Compliance Manager',
    'Audit Manager', 'Auditor', 'CA / Consultant'
  )(req, res, next);
}

module.exports = { requireRole, requireAdmin, requireAuditor, restrictTo };
