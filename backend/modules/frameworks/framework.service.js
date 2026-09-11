const Framework = require('./framework.model');
const { NotFoundError, ConflictError } = require('../../shared/errors');
const { orgFilter, byIdQuery } = require('../../shared/scope');

class FrameworkService {
  async list(orgId, query = {}) {
    const filter = orgFilter(orgId);
    if (query.category) filter.category = query.category;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    return Framework.find(filter).sort({ createdAt: -1 });
  }
  async getById(id, orgId) {
    const framework = await Framework.findOne(byIdQuery(orgId, id));
    if (!framework) throw new NotFoundError('Framework');
    return framework;
  }
  async create(data, orgId) {
    const exists = await Framework.findOne({ name: data.name, ...orgFilter(orgId) });
    if (exists) throw new ConflictError('Framework already exists');
    return Framework.create({ ...data, ...orgFilter(orgId) });
  }
  async update(id, data, orgId) {
    const framework = await Framework.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!framework) throw new NotFoundError('Framework');
    return framework;
  }
  async delete(id, orgId) {
    const framework = await Framework.softDelete(byIdQuery(orgId, id));
    if (!framework) throw new NotFoundError('Framework');
    return framework;
  }
}
module.exports = new FrameworkService();
