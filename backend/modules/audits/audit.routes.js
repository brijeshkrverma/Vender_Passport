const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./audit.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { requireAuditor } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const auditSchema = z.object({
  title: z.string().min(5), type: z.string(),
  party: z.enum(['first-party','second-party','third-party']).optional(),
  frameworkId: z.string().optional(), scope: z.string().optional(),
  riskLevel: z.enum(['Low','Medium','High','Critical']).optional(),
  lead: z.string().optional(), targetOrgId: z.string().optional(),
  start: z.string().optional(), due: z.string().optional(),
});

router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant'));
router.use(auditTrail('Audit'));
router.get('/stats', ctrl.getStats);
// Must stay above '/:id', otherwise Express treats the literal path as an id.
router.get('/assignable-auditors', ctrl.assignableAuditors);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, requireAuditor, validate(auditSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(auditSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, requireAuditor, ctrl.delete);
router.post('/:id/advance', tenantIsolation, ctrl.advanceStage);
router.post('/:id/retreat', tenantIsolation, ctrl.retreatStage);
router.post('/:id/assign-auditor', tenantIsolation, validate(z.object({auditor:z.string()})), ctrl.assignAuditor);
router.post('/:id/unassign-auditor', tenantIsolation, validate(z.object({auditor:z.string()})), ctrl.unassignAuditor);

module.exports = router;
