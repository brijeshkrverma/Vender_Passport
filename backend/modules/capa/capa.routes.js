const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./capa.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const capaSchema = z.object({
  title: z.string().min(1),
  findingId: z.string(),
  rootCause: z.string().optional(),
  actionPlan: z.string().optional(),
  verificationCriteria: z.string().optional(),
  owner: z.string().optional(),
  due: z.string().optional(),
  severity: z.enum(['Low','Medium','High','Critical']).optional(),
  status: z.enum(['Open','In Progress','Pending Verification','Verified','Closed']).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Reviewer'));
router.use(auditTrail('CAPA'));

router.get('/stats', ctrl.getStats);
router.get('/by-finding/:findingId', ctrl.getByFinding);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(capaSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(capaSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
router.post('/:id/advance', tenantIsolation, ctrl.advanceStatus);

module.exports = router;
