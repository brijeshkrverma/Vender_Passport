const Requirement = require('./requirement.model');
const { NotFoundError } = require('../../shared/errors');
const { orgFilter, byIdQuery } = require('../../shared/scope');

class RequirementService {
  async list(orgId, query = {}) {
    const filter = orgFilter(orgId);
    if (query.status) filter.status = query.status;
    if (query.frameworkId) filter.frameworkId = query.frameworkId;
    if (query.domain) filter.domain = query.domain;
    if (query.search) filter.title = { $regex: query.search, $options: 'i' };
    return Requirement.find(filter).sort({ createdAt: -1 });
  }
  async getById(id, orgId) {
    const req = await Requirement.findOne(byIdQuery(orgId, id));
    if (!req) throw new NotFoundError('Requirement');
    return req;
  }
  async create(data, orgId) {
    return Requirement.create({ ...data, ...orgFilter(orgId) });
  }
  async update(id, data, orgId) {
    const req = await Requirement.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!req) throw new NotFoundError('Requirement');
    return req;
  }
  async delete(id, orgId) {
    const req = await Requirement.softDelete(byIdQuery(orgId, id));
    if (!req) throw new NotFoundError('Requirement');
    return req;
  }
  async getByFramework(frameworkId, orgId) {
    return Requirement.find({ frameworkId, ...orgFilter(orgId) }).sort({ clause: 1 });
  }
}
module.exports = new RequirementService();
