const Vendor = require('./vendor.model');
const { NotFoundError } = require('../../shared/errors');
const { orgFilter, byIdQuery, escapeRegex } = require('../../shared/scope');

class VendorService {
  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);
    if (query.riskTier) filter.riskTier = query.riskTier;
    if (query.onboardingStatus) filter.onboardingStatus = query.onboardingStatus;
    if (query.search) filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    
    const total = await Vendor.countDocuments(filter);
    let q = Vendor.find(filter).sort({ createdAt: -1 });
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const items = await q;
    return { items, total };
  }
  async getById(id, orgId) {
    const vendor = await Vendor.findOne(byIdQuery(orgId, id));
    if (!vendor) throw new NotFoundError('Vendor');
    return vendor;
  }
  async create(data, orgId) {
    return Vendor.create({ ...data, ...orgFilter(orgId) });
  }
  async update(id, data, orgId) {
    const vendor = await Vendor.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!vendor) throw new NotFoundError('Vendor');
    return vendor;
  }
  async delete(id, orgId) {
    const vendor = await Vendor.softDelete(byIdQuery(orgId, id));
    if (!vendor) throw new NotFoundError('Vendor');
    return vendor;
  }
  async getScorecard(vendorId, orgId) {
    const vendor = await Vendor.findOne(byIdQuery(orgId, vendorId));
    if (!vendor) throw new NotFoundError('Vendor');
    let certs = [];
    let findings = [];
    if (vendor.certIds && vendor.certIds.length > 0) {
      try {
        const Certificate = require('../../modules/certificates/cert.model');
        certs = await Certificate.find({ _id: { $in: vendor.certIds } });
      } catch (e) { /* certs module may not be loaded */ }
    }
    try {
      const Finding = require('../../modules/findings/finding.model');
      findings = await Finding.find({ vendorId: vendor._id, ...orgFilter(orgId) });
    } catch (e) { /* findings module may not be loaded */ }
    return { vendor, certs, findings };
  }
}
module.exports = new VendorService();
