const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');
const ctrl = require('./settings.controller');

const settingsSchema = z.object({
  orgName: z.string().optional(),
  industry: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  notifications: z.object({
    emailNotifications: z.boolean().optional(),
    auditReminders: z.boolean().optional(),
    certExpiryAlerts: z.boolean().optional(),
  }).optional(),
  security: z.object({
    twoFactor: z.boolean().optional(),
    sessionTimeout: z.boolean().optional(),
    auditLog: z.boolean().optional(),
  }).optional(),
});

router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager'));
router.use(auditTrail('Settings'));

router.get('/', ctrl.get);
router.put('/', tenantIsolation, validate(settingsSchema), ctrl.update);

module.exports = router;
