const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./vendor.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const vendorSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  riskTier: z.enum(['Critical','High','Medium','Low']).optional(),
  complianceScore: z.number().min(0).max(100).optional(),
  onboardingStatus: z.enum(['Invited','Onboarding','Active','Suspended','Offboarded']).optional(),
  certIds: z.array(z.string()).optional(),
  contractRef: z.string().optional(),
  performanceScore: z.number().optional(),
  lastAssessment: z.coerce.date().optional(),
  vendorOrgId: z.string().optional(),
});
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Vendor Manager', 'CA / Consultant'));
router.use(auditTrail('Vendor'));
router.get('/', ctrl.list);
router.get('/:id/scorecard', ctrl.scorecard);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(vendorSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(vendorSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
module.exports = router;
