const Control = require('./control.model');
const { NotFoundError } = require('../../shared/errors');
const { orgFilter, byIdQuery, escapeRegex } = require('../../shared/scope');

class ControlService {
  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);
    if (query.status) filter.status = query.status;
    if (query.family) filter.family = query.family;
    if (query.standard) filter.standard = { $regex: escapeRegex(query.standard), $options: 'i' };
    if (query.frameworkId) filter.frameworkId = query.frameworkId;
    if (query.search) filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    
    const total = await Control.countDocuments(filter);
    let q = Control.find(filter).sort({ createdAt: -1 });
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const items = await q;
    return { items, total };
  }
  async getById(id, orgId) {
    const control = await Control.findOne(byIdQuery(orgId, id));
    if (!control) throw new NotFoundError('Control');
    return control;
  }
  async create(data, orgId) {
    return Control.create({ ...data, ...orgFilter(orgId) });
  }
  async update(id, data, orgId) {
    const control = await Control.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!control) throw new NotFoundError('Control');
    return control;
  }
  async delete(id, orgId) {
    const control = await Control.softDelete(byIdQuery(orgId, id));
    if (!control) throw new NotFoundError('Control');
    return control;
  }
}
module.exports = new ControlService();
