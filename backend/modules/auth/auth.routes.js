const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const { loginLimiter } = require('../../config/rateLimit');
const { z } = require('zod');
const { SELF_SIGNUP_ROLES } = require('../../shared/roles');

// `orgId` is deliberately absent: sign-up always provisions a new organization
// server-side (see auth.service.resolveOrg). Accepting it let a caller drop
// themselves into an existing tenant.
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1),
  role: z.enum(SELF_SIGNUP_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${SELF_SIGNUP_ROLES.join(', ')}` }),
  }),
  orgName: z.string().min(2, 'Organization name is required'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login', loginLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.put('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword);

module.exports = router;
