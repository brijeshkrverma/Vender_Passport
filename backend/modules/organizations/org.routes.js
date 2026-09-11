const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./org.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const orgSchema = z.object({
  name: z.string().min(1), industry: z.string().optional(), country: z.string().optional(),
  type: z.enum(['Own Organization','Supplier','Vendor','Partner','Client']).optional(),
  contact: z.string().optional(), status: z.enum(['Active','Inactive','Suspended']).optional(),
});
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'CA / Consultant'));
router.use(auditTrail('Organization'));
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(orgSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(orgSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
module.exports = router;
