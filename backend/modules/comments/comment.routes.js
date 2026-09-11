const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./comment.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { z } = require('zod');

const commentSchema = z.object({
  findingId: z.string().min(1),
  body: z.string().min(1),
});

router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant'));
router.use(auditTrail('Comment'));
router.get('/by-finding/:findingId', ctrl.getByFinding);
router.post('/', tenantIsolation, validate(commentSchema), ctrl.create);
router.delete('/:id', ctrl.delete);

module.exports = router;
