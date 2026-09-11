const Finding = require('./finding.model');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { orgFilter, byIdQuery, escapeRegex } = require('../../shared/scope');

const STATUS_FLOW = {
  'Open': 'Acknowledged',
  'Acknowledged': 'In Progress',
  'In Progress': 'Resolved',
  'Resolved': 'Closed',
  'Reopened': 'In Progress',
  'Overdue': 'In Progress',
};

class FindingService {
  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.risk) filter.risk = query.risk;
    if (query.auditId) filter.auditId = query.auditId;
    if (query.owner) filter.owner = query.owner;
    if (query.search) filter.title = { $regex: escapeRegex(query.search), $options: 'i' };
    if (query.dueBefore) filter.due = { $lte: new Date(query.dueBefore) };
    
    const total = await Finding.countDocuments(filter);
    let q = Finding.find(filter).sort({ createdAt: -1 });
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const items = await q;
    return { items, total };
  }

  async getById(id, orgId) {
    const finding = await Finding.findOne(byIdQuery(orgId, id));
    if (!finding) throw new NotFoundError('Finding');
    return finding;
  }

  async create(data, orgId) {
    return Finding.create({ ...data, ...orgFilter(orgId) });
  }

  async update(id, data, orgId) {
    const finding = await Finding.findOneAndUpdate(
      byIdQuery(orgId, id), data, { new: true, runValidators: true }
    );
    if (!finding) throw new NotFoundError('Finding');
    return finding;
  }

  async delete(id, orgId) {
    const finding = await Finding.softDelete(byIdQuery(orgId, id));
    if (!finding) throw new NotFoundError('Finding');
    return finding;
  }

  async advanceStatus(id, orgId) {
    const finding = await Finding.findOne(byIdQuery(orgId, id));
    if (!finding) throw new NotFoundError('Finding');
    const next = STATUS_FLOW[finding.status];
    if (!next) throw new ValidationError([{ field: 'status', message: `Cannot advance from status '${finding.status}'` }]);
    finding.status = next;
    await finding.save();
    return finding;
  }

  async reopenFinding(id, orgId) {
    const finding = await Finding.findOne(byIdQuery(orgId, id));
    if (!finding) throw new NotFoundError('Finding');
    if (!['Closed', 'Resolved'].includes(finding.status)) {
      throw new ValidationError([{ field: 'status', message: 'Only Closed or Resolved findings can be reopened' }]);
    }
    finding.status = 'Reopened';
    const note = `Reopened on ${new Date().toISOString()} — requires re-investigation`;
    finding.verification = finding.verification
      ? `${finding.verification}\n${note}`
      : note;
    await finding.save();
    return finding;
  }

  async getByAudit(auditId, orgId) {
    return Finding.find({ auditId, ...orgFilter(orgId) }).sort({ createdAt: -1 });
  }

  async getStats(orgId) {
    const [totalStats, severityStats, statusStats] = await Promise.all([
      Finding.countDocuments(orgFilter(orgId)),
      Finding.aggregate([
        { $match: orgFilter(orgId) },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Finding.aggregate([
        { $match: orgFilter(orgId) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const bySeverity = {};
    severityStats.forEach(s => { bySeverity[s._id] = s.count; });

    const byStatus = {};
    statusStats.forEach(s => { byStatus[s._id] = s.count; });

    return { total: totalStats, bySeverity, byStatus };
  }
}

module.exports = new FindingService();
