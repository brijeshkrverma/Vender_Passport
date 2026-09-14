const User = require('../auth/auth.model');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../shared/errors');

/**
 * The roles that can administer an organization — the same two `requireAdmin`
 * lets through on this router. Nobody else can create a user or grant a role.
 */
const ADMIN_ROLES = ['Super Admin', 'Organization Admin'];

/**
 * Can this account actually administer, right now?
 *
 * Status matters as much as role: sign-in refuses anything but `Active`
 * (`auth.service.js`), so a Suspended Organization Admin is not a way back into
 * an organization — counting them as one would let the last real admin be
 * removed while the count still looked healthy.
 */
const canAdminister = (u) => ADMIN_ROLES.includes(u.role) && u.status === 'Active';

class UserService {
  /**
   * Refuse a change that would leave an organization with nobody who can
   * administer it.
   *
   * Three different edits reach the same dead end — deleting an admin, demoting
   * one, or deactivating one — so the rule lives here once rather than at each
   * call site. Without it, an organization could be left with no way to create a
   * user or grant a role, recoverable only by a platform Super Admin.
   *
   * @param next  the role/status after the change, or `null` for a deletion.
   */
  async assertOrgKeepsAnAdmin(user, next) {
    if (!canAdminister(user)) return;                     // was not one anyway
    if (next && canAdminister({ role: next.role ?? user.role, status: next.status ?? user.status })) {
      return;                                             // still one afterwards
    }

    const otherAdmins = await User.countDocuments({
      orgId: user.orgId,
      _id: { $ne: user._id },
      role: { $in: ADMIN_ROLES },
      status: 'Active',
      deletedAt: null,
    });

    if (otherAdmins === 0) {
      throw new ForbiddenError(
        `${user.name} is the only active administrator of this organization. `
        + 'Give someone else an admin role first.'
      );
    }
  }

  async list(orgId, role, isSuperAdmin, pagination = {}) {
    const filter = isSuperAdmin ? { deletedAt: null } : { orgId, deletedAt: null };
    if (role) filter.role = role;
    
    const total = await User.countDocuments(filter);
    let q = User.find(filter).sort({ createdAt: -1 }).select('-password -refreshToken');
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const docs = await q;

    /*
     * Same shape as create() and update(), which both return `toSafeObject()`.
     *
     * The list used to return raw documents, so a row carried `_id` while a
     * freshly created one carried `id`. The Users screen reads `.id`, so every
     * row rendered from the list produced `/api/users/undefined` on edit and on
     * delete — and the "is this me?" check that hides your own delete button
     * compared undefined against your id and never matched.
     *
     * One endpoint returning a different shape from its siblings is the whole
     * bug; keeping the three in step here is the fix.
     */
    return { items: docs.map((d) => d.toSafeObject()), total };
  }

  async getById(id, orgId, isSuperAdmin) {
    const user = await User.findOne({ _id: id, deletedAt: null }).select('-password -refreshToken');
    if (!user) throw new NotFoundError('User');
    if (!isSuperAdmin && user.orgId !== orgId) {
      throw new ForbiddenError('Access denied: organization mismatch');
    }
    return user;
  }

  async create(data) {
    const exists = await User.findOne({ email: data.email, orgId: data.orgId });
    if (exists) throw new ConflictError('User already exists in this organization');
    const user = await User.create(data);
    return user.toSafeObject();
  }

  async update(id, data, orgId, isSuperAdmin, actorId) {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User');
    if (!isSuperAdmin && user.orgId !== orgId) {
      throw new ForbiddenError('Access denied: organization mismatch');
    }

    /*
     * You do not change your own role or switch yourself off.
     *
     * Both are one-way doors: the role check is enforced against the token you
     * are already holding, so an admin who demotes themselves keeps working
     * until the token expires and then cannot get back in — and if they were the
     * only admin, nobody can restore them. Deleting your own account is refused
     * for the same reason; doing it by edit instead should not be the loophole.
     *
     * Another administrator can still do either, which is the point: the change
     * gets a second person.
     */
    if (actorId && String(user._id) === String(actorId)) {
      if (data.role && data.role !== user.role) {
        throw new ForbiddenError('You cannot change your own role — ask another administrator to do it.');
      }
      if (data.status && data.status !== 'Active') {
        throw new ForbiddenError('You cannot deactivate your own account.');
      }
    }

    // Would this leave the organization with nobody who can administer it?
    await this.assertOrgKeepsAnAdmin(user, { role: data.role, status: data.status });

    // Do not allow password changes through this endpoint
    delete data.password;
    delete data.refreshToken;

    // If email/orgId changing, check conflict
    if (data.email && data.orgId) {
      const conflict = await User.findOne({ email: data.email, orgId: data.orgId, _id: { $ne: id } });
      if (conflict) throw new ConflictError('Another user with this email already exists in this organization');
    }

    Object.assign(user, data);
    await user.save();
    return user.toSafeObject();
  }

  async delete(id, orgId, isSuperAdmin, actorId) {
    const user = await User.findOne({ _id: id, deletedAt: null });
    if (!user) throw new NotFoundError('User');
    if (!isSuperAdmin && user.orgId !== orgId) {
      throw new ForbiddenError('Access denied: organization mismatch');
    }

    /*
     * Nobody deactivates their own account.
     *
     * The screen hides the button on your own row, but that is convenience, not
     * the rule — and it had been failing silently anyway, because the row it
     * compared carried no `id` at all. The consequence is not theoretical: an
     * Organization Admin who removes themselves is signed out mid-session and,
     * if they were the last admin, nobody can restore the account.
     */
    if (actorId && String(user._id) === String(actorId)) {
      throw new ForbiddenError('You cannot remove your own account');
    }

    // …and not the last person who could have restored them, either.
    await this.assertOrgKeepsAnAdmin(user, null);
    // Tombstone rather than remove: an account that once acted on an audit must
    // stay resolvable when reading the audit trail.
    await User.softDelete({ _id: user._id }, { userId: actorId });
    return { deleted: true };
  }
}

module.exports = new UserService();
