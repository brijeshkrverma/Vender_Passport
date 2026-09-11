const service = require('./questionnaire.service');
const response = require('../../shared/response');
const { parsePagination } = require('../../shared/pagination');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await service.list(req.user.scopeOrgId, req.query, { skip, limit });
    response.paginated(res, items, { page, limit, total });
  } catch (e) { next(e); }
};

exports.meta = async (req, res, next) => {
  try { response.success(res, await service.getMeta(req.user.scopeOrgId)); } catch (e) { next(e); }
};

/**
 * Cross-question targets and denominator grids for the formula builder.
 *
 * A dedicated endpoint rather than the client walking `GET /` : the builder
 * needs a few KB of labels, and deriving them in the browser meant downloading
 * every question's answer tree on every load of the authoring form.
 */
exports.formulaSources = async (req, res, next) => {
  try {
    response.success(res, await service.getFormulaSources(req.user.scopeOrgId, {
      excludeId: req.query.exclude,
      financialYear: req.query.financialYear,
    }));
  } catch (e) { next(e); }
};

exports.swapPosition = async (req, res, next) => {
  try {
    response.success(res, await service.swapPosition(
      req.user.scopeOrgId, req.body.fromId, req.body.toId));
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try { response.success(res, await service.getById(req.params.id, req.user.scopeOrgId)); } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    response.created(res, await service.create(req.body, req.user.scopeOrgId, req.user));
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    response.success(res, await service.update(
      req.params.id, req.body, req.user.scopeOrgId, req.user));
  } catch (e) { next(e); }
};

/** Draft -> Published. After this, an edit produces a new version. */
exports.publish = async (req, res, next) => {
  try { response.success(res, await service.publish(req.params.id, req.user.scopeOrgId)); } catch (e) { next(e); }
};

exports.archive = async (req, res, next) => {
  try { response.success(res, await service.archive(req.params.id, req.user.scopeOrgId)); } catch (e) { next(e); }
};

/** Every version, newest first — how an assessor reads the wording answered. */
exports.versions = async (req, res, next) => {
  try { response.success(res, await service.versions(req.params.id, req.user.scopeOrgId)); } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try { await service.delete(req.params.id, req.user.scopeOrgId); response.noContent(res); } catch (e) { next(e); }
};
