const Audit = require('./audit.model');
const User = require('../auth/auth.model');
const Notification = require('../notifications/notification.model');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../shared/errors');
const { orgFilter, byIdQuery, escapeRegex } = require('../../shared/scope');
const { ASSIGNABLE_AUDITOR_ROLES } = require('../../shared/roles');

const LIFECYCLE = [
  'Planning','Scoping','Risk Assessment','Questionnaire','Auditor Assigned',
  'Execution','Evidence Review','Findings','Corrective Actions',
  'Verification','Report','Closed'
];

// Helper: get next status based on stage
function nextStatus(stageIdx) {
  return LIFECYCLE[Math.min(stageIdx, LIFECYCLE.length - 1)];
}

class AuditService {
  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.party) filter.party = query.party;
    if (query.riskLevel) filter.riskLevel = query.riskLevel;
    if (query.lead) filter.lead = query.lead;
    if (query.search) filter.title = { $regex: escapeRegex(query.search), $options: 'i' };
    if (query.dueBefore) filter.due = { $lte: new Date(query.dueBefore) };
    if (query.dueAfter) filter.due = { ...filter.due, $gte: new Date(query.dueAfter) };

    const total = await Audit.countDocuments(filter);
    let q = Audit.find(filter).sort({ due: 1 });
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const items = await q;
    return { items, total };
  }


  async getById(id, orgId) {
    const audit = await Audit.findOne(byIdQuery(orgId, id));
    if (!audit) throw new NotFoundError('Audit');
    return audit;
  }

  async create(data, orgId) {
    return Audit.create({ ...data, ...orgFilter(orgId), stageIdx: 0, status: 'Planning' });
  }

  async update(id, data, orgId) {
    const audit = await Audit.findOneAndUpdate(byIdQuery(orgId, id), data, { new: true, runValidators: true });
    if (!audit) throw new NotFoundError('Audit');
    return audit;
  }

  async delete(id, orgId) {
    const audit = await Audit.softDelete(byIdQuery(orgId, id));
    if (!audit) throw new NotFoundError('Audit');
    return audit;
  }

  // Lifecycle operations
  async advanceStage(id, orgId) {
    const audit = await Audit.findOne(byIdQuery(orgId, id));
    if (!audit) throw new NotFoundError('Audit');
    if (audit.stageIdx >= LIFECYCLE.length - 1) throw new ValidationError([{ field:'stage', message:'Audit is already closed' }]);
    audit.stageIdx += 1;
    audit.status = nextStatus(audit.stageIdx);
    if (audit.stageIdx === LIFECYCLE.length - 1) audit.completedAt = new Date();
    await audit.save();
    return audit;
  }

  async retreatStage(id, orgId) {
    const audit = await Audit.findOne(byIdQuery(orgId, id));
    if (!audit) throw new NotFoundError('Audit');
    if (audit.stageIdx <= 0) throw new ValidationError([{ field:'stage', message:'Audit is at the first stage' }]);
    audit.stageIdx -= 1;
    audit.status = nextStatus(audit.stageIdx);
    audit.completedAt = null;
    await audit.save();
    return audit;
  }

  /**
   * Active users in this organization who may be staffed onto an audit.
   *
   * Lives on the audits router rather than /api/users because that router is
   * admin-only: the people who actually assign auditors (Audit Manager,
   * Compliance Manager) were getting 403 there, so the picker they were meant
   * to choose from was always empty.
   */
  async listAssignableAuditors(orgId) {
    return User.find({
      ...orgFilter(orgId),
      status: 'Active',
      role: { $in: ASSIGNABLE_AUDITOR_ROLES },
    })
      .select('name role email')
      .sort({ name: 1 });
  }

  /**
   * Assign an auditor, enforcing the independence rules an audit platform
   * exists to guarantee. Previously this accepted any free-text name and ran no
   * checks at all, so a manager could appoint themselves to audit their own
   * work — exactly the control failure the software is meant to prevent.
   */
  async assignAuditor(id, auditorName, orgId, actor = {}) {
    const audit = await Audit.findOne(byIdQuery(orgId, id));
    if (!audit) throw new NotFoundError('Audit');

    // 1. The auditor must be a real, active user — not a typed-in string.
    const auditor = await User.findOne({
      name: auditorName, ...orgFilter(orgId), status: 'Active',
    });
    if (!auditor) {
      throw new ValidationError([{
        field: 'auditor',
        message: `'${auditorName}' is not an active user in this organization`,
      }]);
    }

    // 2. …and must hold a role that actually performs audit work.
    if (!ASSIGNABLE_AUDITOR_ROLES.includes(auditor.role)) {
      throw new ValidationError([{
        field: 'auditor',
        message: `${auditor.name} is a ${auditor.role} and cannot be staffed as an auditor`,
      }]);
    }

    // 3. No self-appointment: the person assigning cannot be the auditor.
    if (actor.userId && String(auditor._id) === String(actor.userId)) {
      throw new ForbiddenError('You cannot assign yourself as an auditor on an audit you administer');
    }

    // 4. Independence: on a second/third-party audit the auditor must not
    //    belong to the organization being audited.
    if (audit.targetOrgId && auditor.orgId === audit.targetOrgId) {
      throw new ForbiddenError('An auditor cannot be a member of the organization under audit');
    }

    if (!audit.auditors.includes(auditorName)) audit.auditors.push(auditorName);
    if (!audit.lead) audit.lead = auditorName;
    // Auto-advance workflow to "Auditor Assigned" stage once a team is in place
    if (audit.stageIdx < 4) {
      audit.stageIdx = 4;
      audit.status = nextStatus(4);
    }
    await audit.save();

    // Notify the assigned auditor (already resolved and validated above).
    await Notification.create({
      userId: auditor._id.toString(),
      orgId: auditor.orgId,
      type: 'audit_assigned',
      title: 'New audit assigned to you',
      body: `${audit.title} (${audit.type}) — assigned as auditor.`,
      metadata: { entityType: 'Audit', entityId: id },
    });
    return audit;
  }

  async unassignAuditor(id, auditorName, orgId) {
    const audit = await Audit.findOne(byIdQuery(orgId, id));
    if (!audit) throw new NotFoundError('Audit');
    audit.auditors = audit.auditors.filter((a) => a !== auditorName);
    if (audit.lead === auditorName) audit.lead = audit.auditors[0] || '';
    await audit.save();
    return audit;
  }

  async getStats(orgId) {
    const match = orgId ? { orgId } : {};
    const [total, active, closed, overdue] = await Promise.all([
      Audit.countDocuments(match),
      Audit.countDocuments({ ...match, status: { $ne: 'Closed' } }),
      Audit.countDocuments({ ...match, status: 'Closed' }),
      Audit.countDocuments({ ...match, due: { $lt: new Date() }, status: { $ne: 'Closed' } }),
    ]);
    return { total, active, closed, overdue };
  }
}
module.exports = new AuditService();
