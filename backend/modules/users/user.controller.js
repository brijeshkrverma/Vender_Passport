const service = require('./user.service');
const response = require('../../shared/response');
const { parsePagination } = require('../../shared/pagination');
const { canGrantRole } = require('../../shared/roles');
const { ForbiddenError } = require('../../shared/errors');
const { recordAuditFromReq } = require('../../shared/audit');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const isSuperAdmin = req.user.role === 'Super Admin';
    const { items, total } = await service.list(req.user.orgId, req.query.role, isSuperAdmin, { skip, limit });
    response.paginated(res, items, { page, limit, total });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    response.success(res, await service.getById(req.params.id, req.user.orgId, isSuperAdmin));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    // An Organization Admin must not be able to mint a Super Admin — that role
    // bypasses tenant isolation, so granting it is a platform-wide escalation.
    if (!canGrantRole(req.user.role, req.body.role)) {
      throw new ForbiddenError(`You are not allowed to grant the role '${req.body.role}'`);
    }
    const user = await service.create(req.body);
    await recordAuditFromReq(req, {
      action: 'create', entity: 'User', entityId: String(user.id || user._id),
      changes: { email: req.body.email, role: req.body.role },
    });
    response.created(res, user);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    if (req.body.role && !canGrantRole(req.user.role, req.body.role)) {
      throw new ForbiddenError(`You are not allowed to grant the role '${req.body.role}'`);
    }
    const isSuperAdmin = req.user.role === 'Super Admin';
    const user = await service.update(req.params.id, req.body, req.user.orgId, isSuperAdmin);
    await recordAuditFromReq(req, {
      action: 'update', entity: 'User', entityId: req.params.id, changes: req.body,
    });
    response.success(res, user);
  } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    await service.delete(req.params.id, req.user.orgId, isSuperAdmin, req.user.userId);
    await recordAuditFromReq(req, { action: 'delete', entity: 'User', entityId: req.params.id });
    response.noContent(res);
  } catch (e) { next(e); }
};
