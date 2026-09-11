const Risk = require('./risk.model');
const { NotFoundError } = require('../../shared/errors');
const { orgFilter, byIdQuery, escapeRegex } = require('../../shared/scope');

class RiskService {
  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.residual) filter.residual = query.residual;
    if (query.search) filter.title = { $regex: escapeRegex(query.search), $options: 'i' };
    
    const total = await Risk.countDocuments(filter);
    let q = Risk.find(filter).sort({ createdAt: -1 });
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const items = await q;
    return { items, total };
  }
  async getById(id, orgId) {
    const risk = await Risk.findOne(byIdQuery(orgId, id));
    if (!risk) throw new NotFoundError('Risk');
    return risk;
  }
  async create(data, orgId) {
    return Risk.create({ ...data, ...orgFilter(orgId) });
  }
  async update(id, data, orgId) {
    const risk = await Risk.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!risk) throw new NotFoundError('Risk');
    return risk;
  }
  async delete(id, orgId) {
    const risk = await Risk.softDelete(byIdQuery(orgId, id));
    if (!risk) throw new NotFoundError('Risk');
    return risk;
  }
  async getHeatmap(orgId) {
    const risks = await Risk.find(orgFilter(orgId), { likelihood: 1, impact: 1 });
    const heatmap = [];
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        const count = risks.filter(r => r.likelihood === l && r.impact === i).length;
        heatmap.push({ likelihood: l, impact: i, count, score: l * i });
      }
    }
    return heatmap;
  }
}
module.exports = new RiskService();
