const Evidence = require('./evidence.model');
const EvidenceLink = require('./evidenceLink.model');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../shared/errors');
const { assertCanVerify } = require('../../shared/verificationPolicy');
const { orgFilter, byIdQuery } = require('../../shared/scope');

class EvidenceService {
  async list(orgId, query = {}) {
    const filter = orgFilter(orgId);
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.confidentiality) filter.confidentiality = query.confidentiality;
    if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;
    if (query.relatedAuditId) filter.relatedAuditId = query.relatedAuditId;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    if (query.expiringBefore) filter.expiry = { $lte: new Date(query.expiringBefore) };
    return Evidence.find(filter).sort({ createdAt: -1 });
  }

  async getById(id, orgId) {
    const evidence = await Evidence.findOne(byIdQuery(orgId, id));
    if (!evidence) throw new NotFoundError('Evidence');
    return evidence;
  }

  async create(data, orgId) {
    return Evidence.create({ ...data, ...orgFilter(orgId) });
  }

  async update(id, data, orgId) {
    const evidence = await Evidence.findOneAndUpdate(
      byIdQuery(orgId, id), data, { new: true, runValidators: true }
    );
    if (!evidence) throw new NotFoundError('Evidence');
    return evidence;
  }

  async delete(id, orgId) {
    const evidence = await Evidence.softDelete(byIdQuery(orgId, id));
    if (!evidence) throw new NotFoundError('Evidence');
    return evidence;
  }

  async getByAudit(auditId, orgId) {
    return Evidence.find({ relatedAuditId: auditId, ...orgFilter(orgId) }).sort({ createdAt: -1 });
  }

  /**
   * Verify or reject a piece of evidence.
   *
   * Segregation of duties: the person who supplied the evidence can never be the
   * person who attests to it. Without this an auditor — or the audited vendor
   * itself — could mark their own upload "Verified", which voids the evidentiary
   * value of the whole audit.
   */
  async verifyEvidence(id, userId, orgId, decision = 'Verified') {
    const evidence = await Evidence.findOne(byIdQuery(orgId, id));
    if (!evidence) throw new NotFoundError('Evidence');

    assertCanVerify(evidence, userId, decision);

    evidence.verificationStatus = decision;
    evidence.verifiedBy = userId;
    evidence.verifiedAt = new Date();
    await evidence.save();
    return evidence;
  }

  async getExpiring(orgId, days = 30) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return Evidence.find({
      ...orgFilter(orgId),
      expiry: { $lte: threshold, $gte: new Date() },
      status: { $ne: 'Expired' },
    }).sort({ expiry: 1 });
  }

  // ── Evidence Linking ──

  async createLink(evidenceId, { targetType, targetId, targetTitle, notes }, userId, orgId) {
    const evidence = await Evidence.findOne(byIdQuery(orgId, evidenceId));
    if (!evidence) throw new NotFoundError('Evidence');
    return EvidenceLink.create({ evidenceId, targetType, targetId, targetTitle, notes, linkedBy: userId, ...orgFilter(orgId) });
  }

  async getLinksForEvidence(evidenceId, orgId) {
    return EvidenceLink.find({ evidenceId, ...orgFilter(orgId) }).sort({ createdAt: -1 });
  }

  async deleteLink(linkId, orgId) {
    const link = await EvidenceLink.softDelete(byIdQuery(orgId, linkId));
    if (!link) throw new NotFoundError('Link');
    return link;
  }

  async getEvidenceForTarget(targetType, targetId, orgId) {
    const links = await EvidenceLink.find({ targetType, targetId, ...orgFilter(orgId) }).sort({ createdAt: -1 });
    const evidenceIds = links.map(l => l.evidenceId);
    if (evidenceIds.length === 0) return [];
    const evidence = await Evidence.find({ _id: { $in: evidenceIds }, ...orgFilter(orgId) });
    return evidence.map(e => {
      const link = links.find(l => l.evidenceId.toString() === e._id.toString());
      return { evidence: e, link };
    });
  }
}

module.exports = new EvidenceService();
