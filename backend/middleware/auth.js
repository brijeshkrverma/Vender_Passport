const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getRedis } = require('../config/redis');
const { UnauthorizedError } = require('../shared/errors');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
    
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (queryToken) {
      token = queryToken;
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Check Redis blacklist for logged-out tokens (optional — skip if Redis unavailable)
    if (decoded.jti) {
      try {
        const redis = getRedis();
        const blacklisted = await redis.get(`blacklist:${decoded.jti}`);
        if (blacklisted) throw new UnauthorizedError('Token has been revoked');
      } catch (e) {
        if (e instanceof UnauthorizedError) throw e;
        // Redis unavailable — skip blacklist check
      }
    }

    req.user = {
      userId: decoded.userId,
      // Carried through so the audit trail can name the person who acted;
      // without it every entry fell back to the raw user id.
      name: decoded.name,
      role: decoded.role,
      orgId: decoded.orgId,
      orgName: decoded.orgName,
      scopeOrgId: decoded.role === 'Super Admin' ? null : decoded.orgId,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    if (err.name === 'JsonWebTokenError') return next(new UnauthorizedError('Invalid token'));
    if (err.name === 'TokenExpiredError') return next(new UnauthorizedError('Token expired'));
    next(err);
  }
}

module.exports = { authenticate };
