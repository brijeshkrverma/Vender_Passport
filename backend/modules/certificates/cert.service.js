const Certificate = require('./cert.model');
const { NotFoundError } = require('../../shared/errors');
const { orgFilter, byIdQuery } = require('../../shared/scope');

class CertificateService {
  async list(orgId, query = {}) {
    const filter = orgFilter(orgId);
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.issuer) filter.issuer = { $regex: query.issuer, $options: 'i' };
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    return Certificate.find(filter).sort({ createdAt: -1 });
  }
  async getById(id, orgId) {
    const cert = await Certificate.findOne(byIdQuery(orgId, id));
    if (!cert) throw new NotFoundError('Certificate');
    return cert;
  }
  async create(data, orgId) {
    return Certificate.create({ ...data, ...orgFilter(orgId) });
  }
  async update(id, data, orgId) {
    const cert = await Certificate.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!cert) throw new NotFoundError('Certificate');
    return cert;
  }
  async delete(id, orgId) {
    const cert = await Certificate.softDelete(byIdQuery(orgId, id));
    if (!cert) throw new NotFoundError('Certificate');
    return cert;
  }
  async getExpiring(orgId, days = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return Certificate.find({
      ...orgFilter(orgId),
      expiry: { $gte: new Date(), $lte: cutoff },
      status: { $in: ['Active', 'Expiring Soon'] },
    }).sort({ expiry: 1 });
  }
  async getStats(orgId) {
    const counts = await Certificate.aggregate([
      { $match: orgFilter(orgId) },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const stats = { total: 0, active: 0, expiringSoon: 0, expired: 0, revoked: 0 };
    counts.forEach(c => {
      stats[c._id === 'Expiring Soon' ? 'expiringSoon' : c._id.toLowerCase()] = c.count;
      stats.total += c.count;
    });
    return stats;
  }
}
module.exports = new CertificateService();
