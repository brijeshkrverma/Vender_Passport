const Document = require('./doc.model');
const { NotFoundError } = require('../../shared/errors');
const { orgFilter, byIdQuery, escapeRegex } = require('../../shared/scope');

class DocumentService {
  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.search) filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    
    const total = await Document.countDocuments(filter);
    let q = Document.find(filter).sort({ createdAt: -1 });
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const items = await q;
    return { items, total };
  }
  async getById(id, orgId) {
    const doc = await Document.findOne(byIdQuery(orgId, id));
    if (!doc) throw new NotFoundError('Document');
    return doc;
  }
  async create(data, orgId) {
    return Document.create({ ...data, ...orgFilter(orgId) });
  }
  async update(id, data, orgId) {
    const doc = await Document.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!doc) throw new NotFoundError('Document');
    return doc;
  }
  async delete(id, orgId) {
    const doc = await Document.softDelete(byIdQuery(orgId, id));
    if (!doc) throw new NotFoundError('Document');
    return doc;
  }
  async getByAudit(auditId, orgId) {
    return Document.find({ relatedAuditId: auditId, ...orgFilter(orgId) }).sort({ createdAt: -1 });
  }
}
module.exports = new DocumentService();
