const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./evidence.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { upload } = require('../../shared/upload');
const { z } = require('zod');

const evidenceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['Document','Image','PDF','Excel','Video','Email','Log','Screenshot','System Record','API Data','Interview Note','Observation']).optional(),
  filePath: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  version: z.string().optional(),
  uploadedBy: z.string().optional(),
  expiry: z.string().optional(),
  confidentiality: z.enum(['public','internal','confidential','restricted']).optional(),
  status: z.enum(['Draft','Submitted','Under Review','Approved','Rejected','Expired']).optional(),
  relatedAuditId: z.string().optional(),
});

router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'Risk Manager', 'Document Manager', 'Vendor Manager', 'Employee', 'External Company User', 'CA / Consultant'));
router.use(auditTrail('Evidence'));

router.get('/expiring', ctrl.getExpiring);
router.get('/by-audit/:auditId', ctrl.getByAudit);
router.get('/by-target/:targetType/:targetId', ctrl.getEvidenceForTarget);
router.post('/upload', tenantIsolation, upload.single('file'), ctrl.uploadFile);
router.get('/:id/download', ctrl.downloadFile);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', tenantIsolation, validate(evidenceSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(evidenceSchema.partial()), ctrl.update);
router.delete('/:id', tenantIsolation, ctrl.delete);
// Attesting to evidence is a control activity, not a data-entry one. Anyone may
// SUPPLY evidence (all roles reach this router), but only an independent
// reviewer may attest to it — previously every role including the audited
// vendor's own users could mark evidence "Verified".
router.patch(
  '/:id/verify',
  tenantIsolation,
  restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Reviewer'),
  validate(z.object({ decision: z.enum(['Verified', 'Rejected']).optional() })),
  ctrl.verifyEvidence
);

// ── Evidence Linking Routes ──
router.get('/:id/links', ctrl.getLinks);
router.post('/:id/links', tenantIsolation, validate(z.object({
  targetType: z.enum(['finding', 'control', 'question']),
  targetId: z.string().min(1),
  targetTitle: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})), ctrl.createLink);
router.delete('/:id/links/:linkId', tenantIsolation, ctrl.deleteLink);

module.exports = router;
