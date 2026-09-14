const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');

/**
 * ONE APPLICANT'S QUESTIONNAIRE FOR ONE YEAR — the header, and only the header.
 *
 * WHAT BELONGS HERE
 *   Facts about the submission as a whole: whose it is, what year, where it is
 *   in the workflow, and the running totals.
 *
 * WHAT DOES NOT
 *   The answers. They live one document each in `QuestionnaireResponse`.
 *
 *   This is the distinction the old shape collapsed: it kept the submission
 *   status and every answer in the same document, so reading "has this
 *   applicant submitted yet?" — which a dashboard asks for every applicant on
 *   screen — read 2.3 MB per row.
 *
 * WHY THE TOTALS ARE STORED RATHER THAN AGGREGATED
 *   A dashboard listing 200 applicants would otherwise run 200 aggregations
 *   over the response collection. These counters are maintained on write, and
 *   `recomputeTotals` exists to rebuild them — because a counter that can only
 *   be incremented is a counter that drifts, and drift in a score is not
 *   something anyone will notice until it matters.
 */

const submissionSchema = new mongoose.Schema({
  orgId: { type: String, required: true },
  applicantId: { type: String, required: true },
  financialYear: { type: String, required: true },
  applicantType: { type: String, default: '' },

  /**
   * The audit this questionnaire belongs to, when it belongs to one.
   *
   * Two different things reach this model. A vendor filling their yearly
   * assessment has no audit — the pair (applicantId, financialYear) is the
   * whole identity. A questionnaire raised inside an audit engagement does, and
   * without this field it could not be told apart from the yearly one: the same
   * applicant in the same year would collide on the unique index and the second
   * one would fail to start.
   *
   * Optional rather than two collections, because everything else about them is
   * identical — the answers, the review, the scoring and the totals are the same
   * shape, and splitting would duplicate all of it to record one link.
   */
  auditId: { type: mongoose.Schema.Types.ObjectId, index: true },

  /**
   * Three separate submissions, because they happen at different times and each
   * one locks a different set of fields.
   */
  applicantSubmittedAt: Date,
  assessorSubmittedAt: Date,
  adminApprovedAt: Date,

  /**
   * Who did each of the last two, so approval can refuse the assessor.
   *
   * The audit trail records the actor for every mutation, but a rule cannot be
   * enforced from a log — the check needs the id on the document it is about.
   */
  assessedBy: { type: String, default: '' },
  approvedBy: { type: String, default: '' },

  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Under Assessment', 'Assessed', 'Approved', 'Returned'],
    default: 'Draft',
  },

  /** Maintained on write; rebuildable from the responses — never trusted blindly. */
  totals: {
    questions: { type: Number, default: 0 },
    answered: { type: Number, default: 0 },
    flagged: { type: Number, default: 0 },
    maxMark: { type: Number, default: 0 },
    obtainedMark: { type: Number, default: 0 },
    totalsComputedAt: Date,
  },

  /**
   * Why the automatic scoring did not run, if it did not.
   *
   * Recorded rather than thrown: submitting must not fail because the scoring
   * engines could not be loaded. Without this the assessor would see marks of
   * zero with nothing to say whether that is the score or a failure.
   */
  scoringError: { type: String, default: '' },

  isScorecardPublished: { type: Boolean, default: false },
}, { timestamps: true });

/**
 * One submission per applicant per year.
 *
 * Partial on `deletedAt: null` because `softDelete` tombstones rather than
 * removes: a plain unique index would keep holding the tombstone's key, so a
 * deleted submission would block the applicant from ever starting that year
 * again with a duplicate-key error.
 */
submissionSchema.index(
  { orgId: 1, applicantId: 1, financialYear: 1, auditId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

/** The admin dashboard: everyone in this year, by workflow state. */
submissionSchema.index({ orgId: 1, financialYear: 1, status: 1 });

submissionSchema.plugin(softDelete);

module.exports = mongoose.model('QuestionnaireSubmission', submissionSchema);
