const router = require('express').Router();
const { z } = require('zod');
const ctrl = require('./questionnaire.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validation');
const { auditTrail } = require('../../shared/auditTrail');
const { ENGINE_IDS } = require('../../scoring/engines');

const numeric = z.union([z.coerce.number(), z.literal('')]).nullable().optional();

const assessorSubOptionSchema = z.object({
  option: z.string().default(''),
  marks: numeric,
  marksnotapplicable: z.boolean().default(false),
  isSelected: z.boolean().default(false),
});

const assessorOptionSchema = z.object({
  assessorOptionType: z.string().default(''),
  assessorGuidence: z.string().default(''),
  option: z.string().default(''),
  marks: numeric,
  marksnotapplicable: z.boolean().default(false),
  isSelected: z.boolean().default(false),
  subOption: z.array(assessorSubOptionSchema).default([]),
});

/**
 * A grid formula is validated as tokens, never as an expression string.
 *
 * Accepting text here and evaluating it later is how a calculation config turns
 * into a code-execution surface. The token form has no way to express anything
 * but arithmetic over cells and sibling inputs, so nothing read out of the
 * database is executable — the strict enum on `op` is what enforces that, and
 * it is the reason this schema is not `passthrough`.
 */
/**
 * A VALUE REFERENCE — the one way anything here names a value.
 *
 * Formulas, mark rules and trend rules all read and write through this. It
 * replaces three separate token shapes (`{cell:{row,col}}`, `{sub:{index}}`,
 * `{num}`) plus a `targetQuestion` field that existed only because a result
 * landing in another question could not otherwise be expressed.
 *
 * Answers and sub-answers are addressed by their stable `key`, never by
 * position: reordering two options must not silently re-point every rule that
 * mentioned them. That is the same failure the original had at question scale
 * (`if (i == 9)`), and an index here would reproduce it in miniature.
 */
const valueRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('const'), value: z.number() }).strict(),
  /*
   * `questionId` is optional on `input` and `cell`: without it the reference
   * reads this question's own answer, with it another question's. A trend rule
   * cannot work without the second form — intensity is emissions divided by
   * revenue, and revenue is a different question.
   */
  z.object({
    kind: z.literal('input'),
    answerKey: z.string().min(1), subKey: z.string().min(1),
    questionId: z.string().min(1).optional(),
  }).strict(),
  z.object({ kind: z.literal('option'), answerKey: z.string().min(1), field: z.enum(['score', 'selected']) }).strict(),
  z.object({
    kind: z.literal('cell'),
    answerKey: z.string().min(1), subKey: z.string().min(1),
    row: z.number().int().min(0), col: z.number().int().min(0),
    questionId: z.string().min(1).optional(),
  }).strict(),
  z.object({ kind: z.literal('self'), field: z.enum(['maxMark', 'mark']) }).strict(),
  z.object({ kind: z.literal('question'), questionId: z.string().min(1), field: z.string().default('mark') }).strict(),
]);

/**
 * An expression is references and operators, nothing else.
 *
 * Accepting text here and evaluating it later is how a calculation config turns
 * into a code-execution surface. This form has no way to express anything but
 * arithmetic over named values — the closed `kind` union and the strict enum on
 * `op` are what enforce that, and the reason neither is `passthrough`.
 */
const formulaTokenSchema = z.union([
  z.object({ op: z.enum(['+', '-', '*', '/', '(', ')']) }).strict(),
  valueRefSchema,
]);

const gridFormulaSchema = z.object({
  // Anywhere a value can be written: a grid cell, an input, or a field of
  // another question. All three are the same kind of thing now.
  target: valueRefSchema,
  expr: z.array(formulaTokenSchema).min(1),
}).strict();

/**
 * A band maps a range of percentage change onto one assessor option.
 *
 * Lower edge inclusive, upper edge exclusive, `null` meaning unbounded. The
 * frontend rejects a band table with a gap or an overlap; the shape is pinned
 * here so a hand-written request cannot store one that silently drops results
 * into no band at all — which is how the original `> 5` / `< 5` conditions gave
 * a company exactly 5% a quiet zero.
 */
const trendBandSchema = z.object({
  from: z.number().nullable(),
  to: z.number().nullable(),
  option: z.string().min(1),
  marks: z.coerce.number(),
}).strict();

/**
 * Both sides are lists of value references, one per year compared.
 *
 * They were two different shapes before — a row plus columns on one side, a
 * question plus an option plus a sub-answer plus a row plus columns on the
 * other — which is why "the year counts must match" had to be written out as a
 * rule of its own. Two lists of the same kind of thing make it a length check.
 */
const trendRuleSchema = z.object({
  numerator: z.array(valueRefSchema).min(2),
  denominator: z.array(valueRefSchema).min(2),
  /** Optional — without it the option shows on the row that was measured. */
  targetRow: z.number().int().min(0).nullable().optional(),
  bands: z.array(trendBandSchema).min(1),
  allowOverride: z.boolean().default(false),
}).strict().refine(
  (r) => r.numerator.length === r.denominator.length,
  { message: 'Numerator and denominator must compare the same number of years' }
);

/**
 * Sub-answers are `passthrough` because the grid rows are keyed by coordinate
 * ("11" = row 1, column 1) — those keys are data, so they cannot be enumerated
 * in a schema. Every *named* field is still validated; only the coordinate keys
 * pass through.
 */
const subAnswerSchema = z.object({
  // Value references address this by key, so it must survive a round trip.
  key: z.string().optional(),
  subAnswerLabel: z.string().default(''),
  subScore: numeric,
  gridLabel: z.string().default(''),
  subAnswerTypes: z.string().default(''),
  isTypeText: z.union([z.boolean(), z.literal('')]).default(''),
  isTypeNumericText: z.union([z.boolean(), z.literal('')]).default(''),
  isUploadText: z.union([z.boolean(), z.literal('')]).default(''),
  isDisabled: z.boolean().default(false),
  /*
   * A condition is a reference and a comparison — the same closed vocabulary
   * everything else reads values through, so it cannot express anything a
   * formula could not.
   */
  dependsOn: z.object({
    ref: valueRefSchema,
    operator: z.enum(['answered', 'eq', 'neq', 'gt', 'lt', 'in']),
    value: z.union([z.string(), z.number()]).optional(),
  }).strict().nullable().optional(),
  weight: z.coerce.number().min(0).default(1),
  evidenceRequired: z.boolean().default(false),
  flag: z.string().default(''),
  assessorOptionType: z.string().default(''),
  assessorGuidence: z.string().default(''),
  assessorOption: z.array(assessorOptionSchema).default([]),
  gridFormulas: z.array(gridFormulaSchema).default([]),
  trendRule: trendRuleSchema.nullable().optional(),
}).passthrough();

const answerSchema = z.object({
  key: z.string().optional(),
  answerLabel: z.string().min(1, 'Answer label is required'),
  displayLabel: z.string().default(''),
  sortOrder: numeric,
  score: numeric,
  assessorOptionType: z.string().default(''),
  assessorGuidence: z.string().default(''),
  assessorOption: z.array(assessorOptionSchema).default([]),
  subAnswer: z.enum(['yes', 'no']).default('no'),
  subAnswerType: z.string().default(''),
  subAnswers: z.array(subAnswerSchema).default([]),
});

/**
 * The envelope of a scoring rule.
 *
 * `engine` is checked against the closed registry — an unknown engine would
 * score every answer to this question as zero and say nothing. `config` is
 * validated in depth by that engine's own `validate()` in the authoring screen;
 * see `backend/scoring/engines.js` for why it cannot run here yet.
 */
const scoringRuleSchema = z.object({
  engine: z.enum(ENGINE_IDS),
  config: z.record(z.any()).default({}),
}).strict();

const questionSchema = z.object({
  type: z.array(z.string()).default([]),
  standardAlignment: z.array(z.string()).default([]),
  assessmentYear: z.string().nullable().optional(),
  financialYear: z.string().default(''),
  category: z.string().nullable().optional(),
  section: z.string().default(''),
  subSection: z.string().default(''),
  questionOrderNo: numeric,
  position: numeric,
  maxMark: z.union([z.coerce.number().min(0), z.literal('')]).nullable().optional(),
  question: z.string().min(1, 'Question is required'),
  description: z.string().default(''),
  tooltip: z.string().default(''),
  brsrCore: z.string().default(''),
  answerType: z.string().default(''),
  scoringRule: scoringRuleSchema.nullable().optional(),
  isMarks: z.boolean().optional(),
  isText: z.boolean().optional(),
  isUpload: z.boolean().optional(),
  answers: z.array(answerSchema).default([]),
});

// The people who author questions are the same ones
// who run the assessment they belong to.
router.use(authenticate, restrictTo(
  'Super Admin', 'Organization Admin', 'Compliance Manager',
  'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant'
));
router.use(auditTrail('QuestionnaireQuestion'));

// Literal paths are declared before `/:id` — otherwise Express matches them
// as an id and the request 404s on a cast error.
router.get('/meta', ctrl.meta);
router.get('/formula-sources', ctrl.formulaSources);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/reorder', tenantIsolation, validate(
  z.object({ fromId: z.string().min(1), toId: z.string().min(1) })
), ctrl.swapPosition);
router.post('/', tenantIsolation, validate(questionSchema), ctrl.create);
router.put('/:id', tenantIsolation, validate(questionSchema.partial()), ctrl.update);
router.get('/:id/versions', ctrl.versions);
router.post('/:id/publish', tenantIsolation, ctrl.publish);
router.post('/:id/archive', tenantIsolation, ctrl.archive);
router.delete('/:id', tenantIsolation, ctrl.delete);

module.exports = router;

