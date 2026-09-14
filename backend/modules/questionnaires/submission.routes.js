const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('./submission.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { auditTrail } = require('../../shared/auditTrail');

/**
 * Answering, and reviewing what was answered.
 *
 * Every route is scoped by submission, because a response only means anything
 * inside one: "this applicant's answer to this question, in this year".
 *
 * The role list here is broad on purpose — an applicant and an assessor both
 * reach these endpoints. Who may do *what* is decided per request against the
 * submission itself (`assertMayAct`), because the rule is about ownership, not
 * about role alone: an applicant may write their own answers and nobody
 * else's, and a role list cannot express that.
 */
router.use(authenticate, restrictTo(
  'Super Admin', 'Organization Admin', 'Compliance Manager',
  'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant',
  'Vendor Manager', 'External Company User'
));
router.use(auditTrail('QuestionnaireSubmission'));

const startSchema = z.object({
  applicantId: z.string().optional(),
  financialYear: z.string().min(1, 'Financial year is required'),
  applicantType: z.string().optional(),
  auditId: z.string().optional(),
});

/**
 * An answer's shape follows its question's answer type — a grid's rows are
 * keyed by coordinate — so it cannot be enumerated here. It is stored as given
 * and interpreted against the question that owns it.
 */
const saveSchema = z.object({
  answer: z.any().optional(),
  status: z.enum(['Draft', 'Submitted']).optional(),
});

const reviewSchema = z.object({
  response: z.any().optional(),
  comment: z.string().optional(),
  status: z.enum(['Reviewed', 'Flagged', 'Accepted']).optional(),
  obtainedMark: z.coerce.number().optional(),
  marksNotApplicable: z.boolean().optional(),
  overridden: z.boolean().optional(),
});

router.get('/', ctrl.list);
router.post('/', tenantIsolation, validate(startSchema), ctrl.start);
router.get('/:id', ctrl.getById);

// The respondent's view of the questions — projected, without marks or scoring
// rules. This is why an applicant never needs /api/questionnaires.
router.get('/:id/questions', ctrl.questions);
router.get('/:id/sections', ctrl.sections);

router.post('/:id/submit', ctrl.submit);
router.post('/:id/assess', ctrl.markAssessed);
// Final sign-off. Guarded in the service: admin-level roles only, and never the
// same person who assessed it.
router.post('/:id/approve', ctrl.approve);
router.post('/:id/return', ctrl.returnToApplicant);
router.post('/:id/recompute', ctrl.recompute);
// Scoring writes marks, so it is an assessor action even though it awards
// nothing by judgement — the guard lives in the service alongside the others.
router.post('/:id/score', ctrl.score);
router.get('/:id/progress', ctrl.progress);

router.get('/:id/responses', ctrl.listResponses);
// Question + answer + score together — what a review actually needs.
router.get('/:id/review', ctrl.forReview);
// The hot path: one small document per save, called on autosave.
router.put('/:id/responses/:questionId', validate(saveSchema), ctrl.saveResponse);
router.post('/:id/responses/:questionId/review', validate(reviewSchema), ctrl.reviewResponse);
router.delete('/:id/responses/:questionId', ctrl.clearResponse);

module.exports = router;
