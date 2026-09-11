const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./finding.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const findingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  criteria: z.string().optional(),
  condition: z.string().optional(),
  cause: z.string().optional(),
  consequence: z.string().optional(),
  severity: z.enum(['Low','Medium','High','Critical']).optional(),
  risk: z.enum(['Low','Medium','High','Critical']).optional(),
  auditId: z.string(),
  controlId: z.string().optional(),
  owner: z.string().optional(),
  due: z.string().optional(),
  status: z.enum(['Open','Acknowledged','In Progress','Resolved','Closed','Overdue','Reopened']).optional(),
  recommendation: z.string().optional(),
  managementResponse: z.string().optional(),
  action: z.string().optional(),
  verification: z.string().optional(),
});

router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant'));
router.use(auditTrail('Finding'));

router.get('/stats', ctrl.getStats);
router.get('/by-audit/:auditId', ctrl.getByAudit);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(findingSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(findingSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
router.post('/:id/advance', tenantIsolation, ctrl.advanceStatus);
router.post('/:id/reopen', tenantIsolation, ctrl.reopenFinding);

module.exports = router;
