const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');

/**
 * ONE APPLICANT'S ANSWER TO ONE QUESTION.
 *
 * ── WHY THIS IS NOT ONE DOCUMENT PER APPLICANT ────────────────────────────
 *
 * The system this replaces stored one document per applicant holding every
 * answer they had given. Measured on the production dump:
 *
 *     110 documents, average 2.3 MB, largest 3.97 MB
 *     MongoDB's hard document limit is 16 MB
 *
 * That shape has four costs, and they compound:
 *
 *   1. Reading one answer reads 2.3 MB. The screen that shows a single
 *      question still pulls the whole applicant.
 *   2. Saving one answer rewrites 2.3 MB, and takes a write lock on every
 *      other answer that applicant has given while it does.
 *   3. Two people cannot answer different sections at once without one
 *      overwriting the other — the unit of concurrency is the whole applicant.
 *   4. It grows toward a wall. 322 questions produced 2.3 MB; the limit is not
 *      a performance threshold you can tune past, it is a write that starts
 *      failing.
 *
 * One document per (applicant, question, year) makes a read and a write
 * proportional to what actually changed — a few KB — and removes the ceiling
 * entirely: more questions means more documents, not bigger ones.
 *
 * ── WHY THE QUESTION TEXT IS NOT COPIED IN HERE ───────────────────────────
 *
 * Every answer entry in the old shape carried `question`, `description`,
 * `tooltip`, `type`, `category`, `section`, `subSection`, `standardAlignment`,
 * `answerType`, `maxMark`, `isMarks`, `isText`, `isUpload` and
 * `questionOrderNo` — the question definition, copied per applicant.
 *
 *     tooltip alone: 72 KB per applicant  ×  110 applicants  ≈  8 MB
 *     of identical help text
 *
 * Worse than the size: editing a tooltip did not change what any applicant saw,
 * because they were reading their own stale copy.
 *
 * `questionId` is the reference. Two fields are denormalized on purpose and
 * both are justified at their definition; nothing else is.
 *
 * ── WHY assessorResp AND adminResp STAY IN THIS DOCUMENT ──────────────────
 *
 * They are 1:1 with the answer, they are small, and the assessor screen reads
 * the applicant's answer and its review together — splitting them would turn
 * one read into three and buy nothing. What is NOT done is the old shape's
 * mistake of also keeping `assessorResp` as a second full copy of the entire
 * answers array at the top of the document; that duplicate was 416 KB of the
 * 832 KB sample on its own.
 *
 * Lock contention between the two is low because they happen at different
 * times: the applicant submits, and only then does the assessor review.
 */

const responseSchema = new mongoose.Schema({
  orgId: { type: String, required: true },

  /**
   * The submission this belongs to.
   *
   * The natural key is (applicantId, financialYear), and that is what most
   * queries filter on — but it is three loose strings, so a submission created
   * with `financialYear: '2026'` and responses written with `'2026-27'` would
   * orphan silently and only surface as a scorecard that reads zero. An
   * ObjectId cannot drift like that.
   */
  submissionId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'QuestionnaireSubmission' },

  applicantId: { type: String, required: true },
  financialYear: { type: String, required: true },

  /** The question this answers. Its text is read from there, never copied. */
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'QuestionnaireQuestion' },

  /**
   * Which version of the question was on screen when this was answered.
   *
   * Questions are versioned, and an answer whose question was reworded
   * afterwards is answering a different thing. Storing the number costs 4 bytes
   * and is the difference between "this score is defensible" and "we cannot
   * reconstruct what they were asked" — which, on an audit platform, is the
   * whole point.
   */
  questionVersion: { type: Number, default: 1 },

  /**
   * The respondent's answer tree for this one question.
   *
   * `Mixed` because its shape follows the question's answer type — a grid's
   * coordinate-keyed rows cannot be enumerated in a schema. It is validated on
   * the route against the question's own definition, which is the only place
   * that knows what a valid answer looks like. That route check is also where a
   * size bound belongs: a schema cannot express "no bigger than this question
   * could possibly need".
   */
  answer: { type: mongoose.Schema.Types.Mixed, default: null },

  /** Reviewer overlays for THIS answer — see the header note. */
  assessorResp: { type: mongoose.Schema.Types.Mixed, default: null },
  adminResp: { type: mongoose.Schema.Types.Mixed, default: null },
  assessorComment: { type: String, default: '' },
  adminComment: { type: String, default: '' },

  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Reviewed', 'Flagged', 'Accepted'],
    default: 'Draft',
  },

  /**
   * Scoring snapshot.
   *
   * `maxMark` is copied from the question on purpose. A scorecard needs
   * obtained-over-max across hundreds of answers, and joining every one back to
   * its question to read a number turns one query into a lookup per row.
   * Copying also freezes the denominator: an admin raising a question's marks
   * next year must not silently restate last year's published scores.
   *
   * `marksNotApplicable` is not the same as zero — it removes the question from
   * the denominator entirely, which is how "this does not apply to this vendor"
   * is expressed without penalising them. Every consumer of `maxMark` has to
   * honour it, so it sits directly beside it rather than somewhere else.
   */
  maxMark: { type: Number, default: 0 },
  obtainedMark: { type: Number, default: 0 },
  marksNotApplicable: { type: Boolean, default: false },

  /**
   * How this mark was arrived at, step by step.
   *
   * Stored, not recomputed on demand, because it has to survive the thing that
   * produced it: a rule the admin edits next month must not change the
   * explanation attached to a score awarded last month. On an audit platform a
   * vendor disputing a mark is entitled to the working, and "re-run it and see"
   * is not an answer when the rule has moved on.
   */
  scoreTrace: { type: [mongoose.Schema.Types.Mixed], default: [] },
  scoreWarnings: { type: [String], default: [] },
  scoredAt: Date,

  /**
   * What a trend rule proposes, and its working.
   *
   * Kept apart from `assessorResp` on purpose: that field holds what a person
   * decided, and a proposal written into it would be indistinguishable from a
   * decision afterwards. An assessor confirms or overrides these; until then
   * nothing has been decided.
   */
  autoSelections: { type: [mongoose.Schema.Types.Mixed], default: [] },

  /** Set when a trend rule chose the option rather than the assessor. */
  autoSelected: { type: Boolean, default: false },
  /** Set when the assessor overrode a rule's choice — reviewers filter on it. */
  overridden: { type: Boolean, default: false },

  submittedAt: Date,
  updatedBy: String,
}, { timestamps: true });

/* ── INDEXES ───────────────────────────────────────────────────────────────
 *
 * Four indexes on a collection whose hot path is per-answer autosave, so each
 * one is justified by a query that actually runs, and two are partial to keep
 * them off the write path when they are not needed.
 */

/**
 * The upsert key. Every save is "this applicant's answer to this question",
 * so it must be unique — without it a double submit silently creates a second
 * answer and the scorecard counts it twice.
 *
 * PARTIAL ON `deletedAt: null` — this is not a refinement, it is required.
 * `softDelete` tombstones rather than removes, so a plain unique index would
 * still hold the tombstone's key: clear an answer, answer again, and the insert
 * fails with a duplicate-key error the respondent cannot do anything about.
 * The partial filter takes tombstones out of the index, so re-answering works
 * and live answers stay unique.
 */
responseSchema.index(
  { orgId: 1, submissionId: 1, questionId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

/**
 * "Everything in this submission, by state" — progress, and the rebuild path
 * for the submission's stored totals.
 *
 * Also serves plain `{orgId, submissionId}` through its prefix, which is how
 * the renderer fetches a section: it already holds that section's questionIds
 * (it needs them for the text), so it queries `questionId: { $in: [...] }`
 * against the unique index above rather than needing `section` denormalized
 * onto every response.
 */
responseSchema.index({ orgId: 1, submissionId: 1, status: 1 });

/**
 * The assessor's queue: what is waiting on them across all applicants, oldest
 * first.
 *
 * PARTIAL, and deliberately so. `updatedAt` changes on every single autosave,
 * and an indexed field that changes on every write means the B-tree entry is
 * deleted and re-inserted every time — on the hottest path in the system.
 * Restricting the index to the two states a reviewer actually queues on keeps
 * drafts out of it entirely, so ordinary typing never touches this index at
 * all, and the index itself stays a fraction of the collection.
 */
responseSchema.index(
  { orgId: 1, financialYear: 1, status: 1, updatedAt: 1 },
  { partialFilterExpression: { status: { $in: ['Submitted', 'Flagged'] } } }
);

/** Cross-applicant analytics for one question across a year. */
responseSchema.index({ orgId: 1, financialYear: 1, questionId: 1 });

responseSchema.plugin(softDelete);

module.exports = mongoose.model('QuestionnaireResponse', responseSchema);
