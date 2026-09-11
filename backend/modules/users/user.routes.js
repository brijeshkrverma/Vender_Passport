const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./user.controller');
const { authenticate } = require('../../middleware/auth');
const { tenantIsolation } = require('../../middleware/tenant');
const { requireAdmin } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([
    'Super Admin','Organization Admin','Compliance Manager','Audit Manager',
    'Auditor','Reviewer','Risk Manager','Document Manager','Vendor Manager',
    'Employee','External Company User','CA / Consultant'
  ]),
  orgId: z.string().optional(),
  orgName: z.string().optional(),
  status: z.enum(['Active','Inactive','Suspended','On Leave']).optional(),
});

const updateSchema = userSchema.partial().omit({ password: true });

router.use(authenticate, requireAdmin);
router.use(auditTrail('User'));
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(userSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(updateSchema), ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
