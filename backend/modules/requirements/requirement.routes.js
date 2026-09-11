const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./requirement.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const requirementSchema = z.object({
  clause: z.string().min(1), title: z.string().min(1),
  description: z.string().optional(), frameworkId: z.string(),
  domain: z.string().optional(), isMandatory: z.boolean().optional(),
  controlIds: z.array(z.string()).optional(),
  status: z.enum(['Active','Deprecated']).optional(),
});
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'Risk Manager', 'Document Manager', 'Vendor Manager', 'Employee', 'External Company User', 'CA / Consultant'));
router.use(auditTrail('Requirement'));
router.get('/by-framework/:frameworkId', ctrl.getByFramework);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(requirementSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(requirementSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
module.exports = router;
