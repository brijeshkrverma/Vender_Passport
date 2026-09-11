const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./auth.model');
const Organization = require('../organizations/org.model');
const { getRedis } = require('../../config/redis');
const logger = require('../../shared/logger');
const env = require('../../config/env');
const { UnauthorizedError, ForbiddenError, ValidationError, ConflictError } = require('../../shared/errors');

class AuthService {
  async register({ email, password, name, role, orgName }) {
    const org = await this.resolveOrg(orgName);
    const exists = await User.findOne({ email, orgId: org.orgId });
    if (exists) throw new ConflictError('User already exists in this organization');

    const user = await User.create({ email, password, name, role, orgId: org.orgId, orgName: org.name });
    const tokens = await this.generateTokens(user);
    return { user: user.toSafeObject(), ...tokens };
  }

  // Resolve orgId server-side from orgName — never trust a client-supplied orgId.
  //
  // Self-signup provisions a NEW organization only. Returning an existing org
  // here would let anyone join a tenant just by typing its name ("GlobalTech
  // Solutions") and then read and write that tenant's audits, findings and
  // documents. Joining an existing org is an invite-only operation performed by
  // that org's admin via POST /api/users.
  async resolveOrg(orgName) {
    const name = String(orgName || '').trim();
    if (!name) throw new ValidationError([{ field: 'orgName', message: 'Organization name is required' }]);

    const existing = await Organization.findOne({ name: { $regex: `^${this.escapeRegex(name)}$`, $options: 'i' } });
    if (existing) {
      throw new ConflictError(
        `An organization named "${existing.name}" already exists. Ask its administrator to invite you instead of signing up.`
      );
    }

    const orgs = await Organization.find({}).select('orgId');
    const lastNum = orgs.reduce((max, o) => {
      const m = /^ORG-(\d+)$/.exec(o.orgId);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const orgId = `ORG-${lastNum + 1}`;
    return Organization.create({ name, orgId, type: 'Client' });
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async login({ email, password }) {
    const user = await User.findOne({ email, deletedAt: null }).select('+password');
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password');

    if (user.status !== 'Active') throw new ForbiddenError('Account is inactive or suspended');

    user.lastLogin = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);
    return { user: user.toSafeObject(), ...tokens };
  }

  async generateTokens(user) {
    const accessToken = jwt.sign(
      { userId: user._id, name: user.name, role: user.role, orgId: user.orgId, orgName: user.orgName },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRY, jwtid: crypto.randomUUID() }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      env.JWT_SECRET,
      { expiresIn: '7d', jwtid: crypto.randomUUID() }
    );

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken, expiresIn: 86400 };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_SECRET);
      if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

      const user = await User.findById(decoded.userId).select('+refreshToken');
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      return await this.generateTokens(user);
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(userId, accessToken) {
    const decoded = jwt.decode(accessToken);
    if (decoded?.jti) {
      try {
        // Blacklist the JWT in Redis until it expires (best-effort — never block logout)
        const redis = getRedis();
        const ttl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
        await redis.set(`blacklist:${decoded.jti}`, '1', 'EX', ttl);
      } catch (e) {
        logger.warn('Redis unavailable during logout — skipping token blacklist', { error: e.message });
      }
    }

    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new UnauthorizedError();

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) throw new ValidationError([{ field: 'oldPassword', message: 'Current password is incorrect' }]);

    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }
}

module.exports = new AuthService();
