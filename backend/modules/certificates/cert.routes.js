const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./cert.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const certSchema = z.object({
  name: z.string().min(1),
  number: z.string().optional(),
  issuer: z.string().optional(),
  holder: z.string().optional(),
  type: z.string().optional(),
  issue: z.coerce.date().optional(),
  expiry: z.coerce.date(),
  status: z.enum(['Active','Expiring Soon','Expired','Revoked']).optional(),
  verified: z.boolean().optional(),
  ownerOrgId: z.string().optional(),
});
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'Risk Manager', 'Document Manager', 'Vendor Manager', 'Employee', 'External Company User', 'CA / Consultant'));
router.use(auditTrail('Certificate'));
router.get('/expiring', ctrl.expiring);
router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(certSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(certSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
module.exports = router;
