const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');

/**
 * A single authored question.
 *
 * One document per question — not one per questionnaire — because a question is
 * the unit that gets versioned, reordered, scored and reused across assessment
 * years. Grouping is derived from (assessmentYear, category, section) rather
 * than stored as a parent document, so moving a question between sections is a
 * field update instead of a two-document migration.
 */

/**
 * What an assessor may award. Two levels, because the source data uses ladders
 * ("a. policy available / b. web link available / c. none in place") where only
 * the ticked rung scores.
 *
 * `marksnotapplicable` is not the same as zero marks: it removes the question
 * from the denominator entirely, which is how "this does not apply to this
 * vendor" is expressed without penalising them.
 */
const assessorSubOptionSchema = new mongoose.Schema({
  option: { type: String, default: '' },
  marks: { type: mongoose.Schema.Types.Mixed, default: 0 },
  marksnotapplicable: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
}, { _id: false });

const assessorOptionSchema = new mongoose.Schema({
  assessorOptionType: { type: String, default: '' },
  assessorGuidence: { type: String, default: '' },
  option: { type: String, default: '' },
  marks: { type: mongoose.Schema.Types.Mixed, default: 0 },
  marksnotapplicable: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
  subOption: { type: [assessorSubOptionSchema], default: [] },
}, { _id: false });

/**
 * A nested follow-up row.
 *
 * `Mixed` on the grid payload is deliberate. The stored table keys every cell
 * by concatenated coordinates (`"11"` = row 1 column 1), so its keys are data,
 * not schema — a strict sub-schema would have to enumerate every possible
 * coordinate. The shape is enforced instead by `gridModel` on write and by the
 * zod schema on the route, both of which are testable in isolation.
 */
const subAnswerSchema = new mongoose.Schema({
  /**
   * Stable identity within its question.
   *
   * Value references in formulas, mark rules and trend rules address this
   * sub-answer by key rather than by position, so that reordering options does
   * not silently re-point every rule at a different field.
   */
  key: { type: String },
  subAnswerLabel: { type: String, default: '' },
  subScore: { type: Number, default: 0 },
  gridLabel: { type: String, default: '' },
  subAnswerTypes: { type: String, default: '' },

  // Mutually exclusive input modes, kept as three fields to match the stored
  // documents. The editor models them as one choice and expands here.
  isTypeText: { type: mongoose.Schema.Types.Mixed, default: '' },
  isTypeNumericText: { type: mongoose.Schema.Types.Mixed, default: '' },
  isUploadText: { type: mongoose.Schema.Types.Mixed, default: '' },

  isDisabled: { type: Boolean, default: false },

  /**
   * Show this only when a condition holds — `{ ref, operator, value }`.
   *
   * The model this replaces declared the same idea as
   * `{ questionIndex, operator, value }`, addressing a position — the failure
   * that made its scoring rules wrong the moment a question was inserted. A Ref
   * names its target by key.
   *
   * Absent means always shown, which must stay distinct from a condition that
   * happens to be false: a hidden follow-up is not an unanswered one, and a
   * scorecard that confuses them penalises a respondent for a question they
   * were never given.
   */
  dependsOn: { type: mongoose.Schema.Types.Mixed, default: undefined },

  /**
   * How much this contributes relative to its siblings. 1 unless set.
   *
   * Declared but never populated in the corpus this replaces — carried forward
   * because the need is real (a five-mark row and a fifty-mark row inside one
   * question) and because leaving it out would push authors back to hand-tuning
   * every score to fake the proportion.
   */
  weight: { type: Number, default: 1 },

  /** The answer is not complete without an attachment. */
  evidenceRequired: { type: Boolean, default: false },
  /** Free-form tag a scoring rule can key off. */
  flag: { type: String, default: '' },

  assessorOptionType: { type: String, default: '' },
  assessorGuidence: { type: String, default: '' },
  assessorOption: { type: [assessorOptionSchema], default: [] },

  /** `{ target: {row, col}, expr: [...] }` — tokens, never executable text. */
  gridFormulas: { type: [mongoose.Schema.Types.Mixed], default: [] },

  /**
   * Assessor validation. Reads the grid's year-on-year intensity change and
   * selects one of this sub-answer's assessor options by itself, replacing a
   * judgement that was previously hardcoded once per question.
   *
   * Absent means the assessor decides by hand — which must stay distinct from a
   * rule that exists but matches nothing, because the second case awards zero.
   */
  trendRule: { type: mongoose.Schema.Types.Mixed, default: undefined },
}, { _id: false, strict: false });

const answerSchema = new mongoose.Schema({
  /** Stable identity within its question — see the note on subAnswerSchema. */
  key: { type: String },
  answerLabel: { type: String, default: '' },
  displayLabel: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  score: { type: Number, default: 0 },

  assessorOptionType: { type: String, default: '' },
  assessorGuidence: { type: String, default: '' },
  assessorOption: { type: [assessorOptionSchema], default: [] },

  subAnswer: { type: String, enum: ['yes', 'no'], default: 'no' },
  subAnswerType: { type: String, default: '' },
  subAnswers: { type: [subAnswerSchema], default: [] },
}, { _id: false });

const questionnaireSchema = new mongoose.Schema({
  type: { type: [String], default: [] },
  /** BRSR / BRSR Core clause ids this question reports against. */
  standardAlignment: { type: [String], default: [] },

  assessmentYear: String,
  financialYear: { type: String, default: '', index: true },
  category: String,
  section: { type: String, default: '' },
  subSection: { type: String, default: '' },
  questionOrderNo: Number,
  /** Drag-and-drop display order, independent of the numbered order slot. */
  position: Number,

  maxMark: Number,
  question: { type: String, required: true },
  description: { type: String, default: '' },
  tooltip: { type: String, default: '' },
  brsrCore: { type: String, default: '' },
  answerType: { type: String, default: '' },

  /**
   * How this question's marks are worked out.
   *
   * `{ engine, config }`, where `engine` names one of a closed registry. This
   * is where the 40 per-question `if (questionId === '682d…')` branches live
   * now — as data on the question they belong to, rather than as code keyed on
   * an id that nothing keeps in step with.
   *
   * Absent means the default (add up the selected options) — which must stay
   * distinct from a rule that ran and produced zero.
   *
   * `Mixed` on `config` because each engine's config is a different shape.
   * The route checks `engine` against the closed registry; the config's
   * contents are checked by that engine's own `validate()` in the authoring
   * screen. See `backend/scoring/engines.js` for why the depth check does not
   * run on the route yet.
   */
  scoringRule: {
    engine: { type: String },
    config: { type: mongoose.Schema.Types.Mixed },
  },

  // Author-controlled, defaulted from the answer-type registry, so the renderer
  // and the scoring pass never re-derive them and a question keeps behaving as
  // authored even if the registry later changes.
  isMarks: { type: Boolean, default: false },
  isText: { type: Boolean, default: false },
  isUpload: { type: Boolean, default: false },

  answers: { type: [answerSchema], default: [] },

  /**
   * Publishing state.
   *
   *   Draft       editable in place; nobody has answered it
   *   Published   live; an edit creates a new version rather than changing this
   *   Superseded  a later version exists; kept because answers point at it
   *   Archived    withdrawn; not offered, not superseded by anything
   *
   * `Superseded` is what makes `questionVersion` on a response mean something.
   * Without it an edit rewrote the document in place, so an answer recorded
   * against "version 1" referred to wording that no longer existed — a record
   * that reads as an audit trail while guaranteeing nothing.
   */
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Superseded', 'Archived'],
    default: 'Draft',
  },
  version: { type: Number, default: 1 },

  /**
   * The first version's id, shared by every version of the same question.
   *
   * Null on version 1 — it is its own root. Storing it there too would mean
   * writing the document's own id back into it after insert, which is a second
   * write for something `version === 1` already tells us.
   */
  rootQuestionId: { type: mongoose.Schema.Types.ObjectId, index: true },

  /**
   * Where an imported question came from.
   *
   * The id it had in the source system. It makes the import re-runnable —
   * matching on it updates rather than duplicates — and it is the only way to
   * answer "which of these 322 is the one that was wrong in the old system"
   * once they have been re-keyed here.
   *
   * A string rather than an ObjectId because the source's ids are not this
   * database's, and casting them would imply a relationship that does not exist.
   */
  sourceQuestionId: { type: String, index: true, sparse: true },

  orgId: { type: String, required: true, index: true },
  createdBy: String,
}, { timestamps: true });

/*
 * INDEXES — shaped to the queries that actually run, not to the fields.
 *
 * The list screen always knows its financial year and applicant type before it
 * asks for anything (that is what the selector screen is for), then optionally
 * narrows by category, and always sorts by position. So the primary index
 * carries equality fields first, then the sort field — which lets Mongo satisfy
 * filter and sort from one index and never build an in-memory sort.
 *
 * `type` is an array; putting it in a compound index makes this a multikey
 * index, which is fine here because no other key in it is an array.
 *
 * Note what is deliberately absent: a text index on `question`. Search is a
 * regex on a field that holds HTML, so an index cannot serve it anyway — if
 * search becomes hot, the fix is a stripped-plaintext field with a text index,
 * not an index on the markup.
 */
questionnaireSchema.index({ orgId: 1, financialYear: 1, type: 1, position: 1 });
questionnaireSchema.index({ orgId: 1, financialYear: 1, category: 1, position: 1 });
questionnaireSchema.index({ orgId: 1, assessmentYear: 1, category: 1 });
questionnaireSchema.index({ orgId: 1, status: 1, position: 1 });

questionnaireSchema.plugin(softDelete);

module.exports = mongoose.model('QuestionnaireQuestion', questionnaireSchema);
