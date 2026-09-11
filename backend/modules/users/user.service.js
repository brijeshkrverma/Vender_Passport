const User = require('../auth/auth.model');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../shared/errors');

class UserService {
  async list(orgId, role, isSuperAdmin, pagination = {}) {
    const filter = isSuperAdmin ? { deletedAt: null } : { orgId, deletedAt: null };
    if (role) filter.role = role;
    
    const total = await User.countDocuments(filter);
    let q = User.find(filter).sort({ createdAt: -1 }).select('-password -refreshToken');
    if (pagination.skip !== undefined) q = q.skip(pagination.skip);
    if (pagination.limit !== undefined) q = q.limit(pagination.limit);
    const items = await q;
    return { items, total };
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

  async update(id, data, orgId, isSuperAdmin) {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User');
    if (!isSuperAdmin && user.orgId !== orgId) {
      throw new ForbiddenError('Access denied: organization mismatch');
    }
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
    // Tombstone rather than remove: an account that once acted on an audit must
    // stay resolvable when reading the audit trail.
    await User.softDelete({ _id: user._id }, { userId: actorId });
    return { deleted: true };
  }
}

module.exports = new UserService();
