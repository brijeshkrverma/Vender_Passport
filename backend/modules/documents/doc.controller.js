const path = require('path');
const fs = require('fs');
const service = require('./doc.service');
const response = require('../../shared/response');
const { parsePagination } = require('../../shared/pagination');
const { UPLOADS_DIR, deleteUploadedFile } = require('../../shared/upload');
const { ValidationError, NotFoundError } = require('../../shared/errors');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await service.list(req.user.scopeOrgId, req.query, { skip, limit });
    response.paginated(res, items, { page, limit, total });
  } catch(e) { next(e); }
};
exports.getById = async (req, res, next) => {
  try { response.success(res, await service.getById(req.params.id, req.user.scopeOrgId)); } catch(e) { next(e); }
};
exports.create = async (req, res, next) => {
  try { response.created(res, await service.create(req.body, req.user.scopeOrgId)); } catch(e) { next(e); }
};

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
exports.update = async (req, res, next) => {
  try { response.success(res, await service.update(req.params.id, req.body, req.user.scopeOrgId)); } catch(e) { next(e); }
};
exports.delete = async (req, res, next) => {
  try {
    const record = await service.delete(req.params.id, req.user.scopeOrgId);
    if (record) deleteUploadedFile(record.filePath);
    response.noContent(res);
  } catch(e) { next(e); }
};
exports.getByAudit = async (req, res, next) => {
  try { response.success(res, await service.getByAudit(req.params.auditId, req.user.scopeOrgId)); } catch(e) { next(e); }
};
