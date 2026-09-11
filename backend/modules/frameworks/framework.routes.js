const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./framework.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const frameworkSchema = z.object({
  name: z.string().min(1), domain: z.string().optional(), category: z.enum(['Standard','Framework','Regulation','Reporting','Professional Standard']),
  certifiable: z.boolean().optional(), currentVersion: z.string().optional(), jurisdiction: z.string().optional(),
  description: z.string().optional(), status: z.enum(['Active','Superseded','Draft']).optional(),
});
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'Risk Manager', 'Document Manager', 'Vendor Manager', 'Employee', 'External Company User', 'CA / Consultant'));
router.use(auditTrail('Framework'));
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(frameworkSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(frameworkSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
module.exports = router;
