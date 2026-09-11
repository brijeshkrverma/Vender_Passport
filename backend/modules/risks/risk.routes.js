const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./risk.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const riskSchema = z.object({
  title: z.string().min(1),
  category: z.enum(['Information Security','Vendor Risk','Regulatory','Financial','Operational','Cybersecurity','ESG','Strategic','Compliance']).optional(),
  inherent: z.enum(['Low','Medium','High','Critical']).optional(),
  residual: z.enum(['Low','Medium','High','Critical']).optional(),
  owner: z.string().optional(),
  linkedControls: z.array(z.string()).optional(),
  linkedAudits: z.array(z.string()).optional(),
  likelihood: z.number().min(1).max(5).optional(),
  impact: z.number().min(1).max(5).optional(),
  status: z.enum(['Active','Mitigated','Accepted','Closed']).optional(),
});
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Risk Manager', 'CA / Consultant'));
router.use(auditTrail('Risk'));
router.get('/heatmap', ctrl.heatmap);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(riskSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(riskSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
module.exports = router;
