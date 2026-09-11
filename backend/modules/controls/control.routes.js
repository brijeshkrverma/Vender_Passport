const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./control.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const controlSchema = z.object({
  name: z.string().min(1), family: z.string().optional(), standard: z.string().optional(),
  owner: z.string().optional(), effectiveness: z.enum(['Effective','Partially Effective','Needs Improvement','Ineffective']).optional(),
  mappedRisks: z.array(z.string()).optional(), frameworkId: z.string().optional(),
  description: z.string().optional(), testFrequency: z.string().optional(),
});
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'Risk Manager', 'CA / Consultant'));
router.use(auditTrail('Control'));
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(controlSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(controlSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
module.exports = router;
