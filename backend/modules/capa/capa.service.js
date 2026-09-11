const CAPA = require('./capa.model');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { orgFilter, byIdQuery } = require('../../shared/scope');

const STATUS_FLOW = {
  'Open': 'In Progress',
  'In Progress': 'Pending Verification',
  'Pending Verification': 'Verified',
  'Verified': 'Closed',
};

class CAPAService {
  async list(orgId, query = {}) {
    const filter = orgFilter(orgId);
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.findingId) filter.findingId = query.findingId;
    if (query.owner) filter.owner = query.owner;
    if (query.search) filter.title = { $regex: query.search, $options: 'i' };
    if (query.dueBefore) filter.due = { $lte: new Date(query.dueBefore) };
    return CAPA.find(filter).sort({ createdAt: -1 });
  }

  async getById(id, orgId) {
    const capa = await CAPA.findOne(byIdQuery(orgId, id));
    if (!capa) throw new NotFoundError('CAPA');
    return capa;
  }

  async create(data, orgId) {
    return CAPA.create({ ...data, ...orgFilter(orgId) });
  }

  async update(id, data, orgId) {
    const capa = await CAPA.findOneAndUpdate(
      byIdQuery(orgId, id), data, { new: true, runValidators: true }
    );
    if (!capa) throw new NotFoundError('CAPA');
    return capa;
  }

  async delete(id, orgId) {
    const capa = await CAPA.softDelete(byIdQuery(orgId, id));
    if (!capa) throw new NotFoundError('CAPA');
    return capa;
  }

  async advanceStatus(id, orgId) {
    const capa = await CAPA.findOne(byIdQuery(orgId, id));
    if (!capa) throw new NotFoundError('CAPA');
    const next = STATUS_FLOW[capa.status];
    if (!next) throw new ValidationError([{ field: 'status', message: `Cannot advance from status '${capa.status}'` }]);
    capa.status = next;
    await capa.save();
    return capa;
  }

  async getByFinding(findingId, orgId) {
    return CAPA.find({ findingId, ...orgFilter(orgId) }).sort({ createdAt: -1 });
  }

  async getStats(orgId) {
    const match = orgId ? { orgId } : {};
    const [totalStats, statusStats] = await Promise.all([
      CAPA.countDocuments(match),
      CAPA.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = {};
    statusStats.forEach(s => { byStatus[s._id] = s.count; });

    return { total: totalStats, byStatus };
  }
}

module.exports = new CAPAService();
