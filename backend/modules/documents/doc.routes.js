const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./doc.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { upload } = require('../../shared/upload');
const { z } = require('zod');

const docSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['Policy','Certificate','Audit Evidence','Contract','Training Record','Procedure','Compliance Document','Other']).optional(),
  version: z.string().optional(),
  uploadedBy: z.string().optional(),
  filePath: z.string().optional(),
  fileSize: z.number().optional(),
  expiry: z.coerce.date().optional(),
  relatedAuditId: z.string().optional(),
  status: z.enum(['Draft','Approved','Verified','Under Review','Expired','Revoked']).optional(),
});
router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'Risk Manager', 'Document Manager', 'Vendor Manager', 'Employee', 'External Company User', 'CA / Consultant'));
router.use(auditTrail('Document'));
router.get('/audit/:auditId', ctrl.getByAudit);
router.post('/upload', tenantIsolation, upload.single('file'), ctrl.uploadFile);
router.get('/:id/download', ctrl.downloadFile);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(docSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(docSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
module.exports = router;
