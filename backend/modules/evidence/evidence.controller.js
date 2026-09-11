const path = require('path');
const fs = require('fs');
const service = require('./evidence.service');
const response = require('../../shared/response');
const { parsePagination } = require('../../shared/pagination');
const { UPLOADS_DIR, deleteUploadedFile } = require('../../shared/upload');
const { ValidationError, NotFoundError } = require('../../shared/errors');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const items = await service.list(req.user.scopeOrgId, req.query);
    response.paginated(res, items.slice(skip, skip + limit), { page, limit, total: items.length });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => { try { response.success(res, await service.getById(req.params.id, req.user.scopeOrgId)); } catch (e) { next(e); } };
exports.create = async (req, res, next) => { try { response.created(res, await service.create(req.body, req.user.scopeOrgId)); } catch (e) { next(e); } };

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) throw new ValidationError([{ field: 'file', message: 'No file uploaded' }]);
    const data = {
      ...req.body,
      name: req.body.name || req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.userId || req.user.orgName || 'unknown',
      version: req.body.version || '1.0',
    };
    response.created(res, await service.create(data, req.user.scopeOrgId));
  } catch (e) { next(e); }
};

exports.downloadFile = async (req, res, next) => {
  try {
    const record = await service.getById(req.params.id, req.user.scopeOrgId);
    if (!record.filePath) throw new NotFoundError('File');
    const filePath = path.join(UPLOADS_DIR, path.basename(record.filePath));
    if (!fs.existsSync(filePath)) throw new NotFoundError('File');
    res.download(filePath, record.name || path.basename(record.filePath));
  } catch (e) { next(e); }
};
exports.update = async (req, res, next) => { try { response.success(res, await service.update(req.params.id, req.body, req.user.scopeOrgId)); } catch (e) { next(e); } };
exports.delete = async (req, res, next) => {
  try {
    // Soft delete only. The stored file is deliberately left on disk: the record
    // is tombstoned, not destroyed, and an audit that once relied on this
    // evidence must remain reconstructable. Physical purge belongs in a separate
    // retention job that runs after the retention window, not on a user click.
    await service.delete(req.params.id, req.user.scopeOrgId);
    response.noContent(res);
  } catch (e) { next(e); }
};

exports.getByAudit = async (req, res, next) => {
  try {
    const items = await service.getByAudit(req.params.auditId, req.user.scopeOrgId);
    response.success(res, items);
  } catch (e) { next(e); }
};

exports.verifyEvidence = async (req, res, next) => {
  try {
    // req.user.userId — `sub` is not part of the JWT payload, so the previous
    // read silently stored `undefined` as the verifier.
    response.success(res, await service.verifyEvidence(
      req.params.id, req.user.userId, req.user.scopeOrgId, req.body?.decision || 'Verified'
    ));
  } catch (e) { next(e); }
};

exports.getExpiring = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const items = await service.getExpiring(req.user.scopeOrgId, days);
    response.success(res, items);
  } catch (e) { next(e); }
};

// ── Evidence Linking Controllers ──

exports.createLink = async (req, res, next) => {
  try {
    const link = await service.createLink(
      req.params.id,
      req.body,
      req.user.userId,
      req.user.scopeOrgId
    );
    response.created(res, link);
  } catch (e) { next(e); }
};

exports.getLinks = async (req, res, next) => {
  try {
    const links = await service.getLinksForEvidence(req.params.id, req.user.scopeOrgId);
    response.success(res, links);
  } catch (e) { next(e); }
};

exports.deleteLink = async (req, res, next) => {
  try {
    await service.deleteLink(req.params.linkId, req.user.scopeOrgId);
    response.noContent(res);
  } catch (e) { next(e); }
};

exports.getEvidenceForTarget = async (req, res, next) => {
  try {
    const items = await service.getEvidenceForTarget(req.params.targetType, req.params.targetId, req.user.scopeOrgId);
    response.success(res, items);
  } catch (e) { next(e); }
};
