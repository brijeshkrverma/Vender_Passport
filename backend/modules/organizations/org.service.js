const Organization = require('./org.model');
const { NotFoundError, ConflictError } = require('../../shared/errors');
const { orgFilter, byIdQuery, escapeRegex } = require('../../shared/scope');

class OrgService {
  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);
    if (query.type) filter.type = query.type;
    if (query.search) filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    
    const total = await Organization.countDocuments(filter);
    let q = Organization.find(filter).sort({ createdAt: -1 });
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const items = await q;
    return { items, total };
  }
  async getById(id, orgId) {
    const org = await Organization.findOne(byIdQuery(orgId, id));
    if (!org) throw new NotFoundError('Organization');
    return org;
  }
  async create(data, orgId) {
    const exists = await Organization.findOne({ name: data.name, ...orgFilter(orgId) });
    if (exists) throw new ConflictError('Organization already exists');
    return Organization.create({ ...data, ...orgFilter(orgId) });
  }
  async update(id, data, orgId) {
    const org = await Organization.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!org) throw new NotFoundError('Organization');
    return org;
  }
  async delete(id, orgId) {
    const org = await Organization.softDelete(byIdQuery(orgId, id));
    if (!org) throw new NotFoundError('Organization');
    return org;
  }
}
module.exports = new OrgService();
