const rateLimit = require('express-rate-limit');

const enabled = process.env.RATE_LIMIT_ENABLED !== '0';

const jsonMessage = (message) => ({ success: false, code: 'RATE_LIMITED', message });

function makeLimiter(options) {
  if (!enabled) return (req, res, next) => next();
  return rateLimit(options);
}

const globalLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many requests, please try again later.'),
});

const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: jsonMessage('Too many login attempts. Please try again in 15 minutes.'),
});

module.exports = { globalLimiter, loginLimiter };
