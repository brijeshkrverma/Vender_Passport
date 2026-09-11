const Submission = require('./submission.model');
const Response = require('./response.model');
const Question = require('./questionnaire.model');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../shared/errors');
const { orgFilter, byIdQuery } = require('../../shared/scope');

/**
 * One applicant's questionnaire for one year.
 *
 * The submission is the header only — status, totals, who and when. The answers
 * are one document each in `QuestionnaireResponse`. That split is the whole
 * point of this model: the system it replaces kept both in one document, so
 * reading "has this applicant submitted yet?" — which a dashboard asks once per
 * row — read 2.3 MB.
 */

/** Roles that may act on someone else's submission. */
const REVIEWER_ROLES = new Set([
  'Super Admin', 'Organization Admin', 'Compliance Manager',
  'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant',
]);

const isReviewer = (user) => REVIEWER_ROLES.has(user?.role);

class SubmissionService {
  /**
   * The applicant's own submission for a year, created on first use.
   *
   * Idempotent by design: the answering screen calls this on every load, and a
   * second submission for the same year would split an applicant's answers in
   * two with nothing to say which half counts.
   */
  async start(orgId, { applicantId, financialYear, applicantType, auditId }, actor = {}) {
    if (!applicantId || !financialYear) {
      throw new ValidationError([{ field: 'financialYear', message: 'applicantId and financialYear are required' }]);
    }
    this.assertMayAct(actor, { applicantId });

    // `auditId: null` is part of the key, not a wildcard: a vendor's yearly
    // questionnaire and one raised inside an audit are different documents even
    // for the same applicant and year.
    const existing = await Submission.findOne({
      ...orgFilter(orgId), applicantId, financialYear, auditId: auditId || null,
    });
    if (existing) return existing;

    return Submission.create({
      ...orgFilter(orgId),
      deletedAt: undefined,
      applicantId,
      financialYear,
      applicantType: applicantType || '',
      auditId: auditId || null,
      status: 'Draft',
    });
  }

  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);
    if (query.financialYear) filter.financialYear = query.financialYear;
    if (query.status) filter.status = query.status;
    if (query.applicantId) filter.applicantId = query.applicantId;
    if (query.auditId) filter.auditId = query.auditId;

    const [total, items] = await Promise.all([
      Submission.countDocuments(filter),
      Submission.find(filter)
        .sort({ updatedAt: -1 })
        .skip(pagination.skip ?? 0)
        .limit(pagination.limit ?? 50)
        // The dashboard reads the stored totals; it never touches the answers.
        .lean(),
    ]);
    return { items, total };
  }

  async getById(id, orgId, actor = {}) {
    const doc = await Submission.findOne(byIdQuery(orgId, id));
    if (!doc) throw new NotFoundError('Submission');
    this.assertMayAct(actor, doc);
    return doc;
  }

  /**
   * An applicant may only touch their own submission.
   *
   * Without this, any authenticated user could write answers into anyone
   * else's questionnaire simply by knowing its id — and on an assessment
   * platform that is not a privacy problem, it is a scoring one.
   */
  assertMayAct(actor, submission) {
    if (isReviewer(actor)) return;
    if (String(submission.applicantId) !== String(actor.userId)) {
      throw new ForbiddenError('You can only work on your own questionnaire');
    }
  }

  /**
   * Rebuild the stored counters from the answers.
   *
   * The counters exist so a dashboard listing 200 applicants does not run 200
   * aggregations. But a counter that is only ever incremented drifts, and drift
   * in a score is not something anyone notices until it matters — so this path
   * exists and is run at every state change.
   */
  async recomputeTotals(id, orgId) {
    const submission = await Submission.findOne(byIdQuery(orgId, id));
    if (!submission) throw new NotFoundError('Submission');

    const [agg] = await Response.aggregate([
      { $match: { orgId, submissionId: submission._id, deletedAt: null } },
      {
        $group: {
          _id: null,
          questions: { $sum: 1 },
          answered: { $sum: { $cond: [{ $ne: ['$status', 'Draft'] }, 1, 0] } },
          flagged: { $sum: { $cond: [{ $eq: ['$status', 'Flagged'] }, 1, 0] } },
          // "Not applicable" removes a question from the denominator entirely —
          // it is not the same as scoring zero on it.
          maxMark: { $sum: { $cond: ['$marksNotApplicable', 0, '$maxMark'] } },
          obtainedMark: { $sum: { $cond: ['$marksNotApplicable', 0, '$obtainedMark'] } },
        },
      },
    ]);

    submission.totals = {
      questions: agg?.questions || 0,
      answered: agg?.answered || 0,
      flagged: agg?.flagged || 0,
      maxMark: agg?.maxMark || 0,
      obtainedMark: agg?.obtainedMark || 0,
      totalsComputedAt: new Date(),
    };
    await submission.save();
    return submission;
  }

  /**
   * The applicant declares themselves finished.
   *
   * Refuses while anything is still a draft: a half-answered questionnaire that
   * has been "submitted" reads to the assessor as a complete one with gaps,
   * which is a different and worse thing than an unfinished one.
   */
  async submit(id, orgId, actor = {}) {
    const submission = await this.getById(id, orgId, actor);
    if (submission.applicantSubmittedAt) {
      throw new ValidationError([{ field: 'status', message: 'This questionnaire has already been submitted' }]);
    }

    await this.recomputeTotals(id, orgId);
    const fresh = await Submission.findOne(byIdQuery(orgId, id));

    /*
     * Counted with the same definition the answering screen lists by.
     *
     * When the two disagreed, a superseded version inflated this number and
     * submitting became impossible — and the error named a question the
     * respondent had never been shown, so there was no way to act on it.
     */
    // eslint-disable-next-line global-require
    const { ANSWERABLE } = require('./questionnaire.service');
    const expected = await Question.countDocuments({
      ...orgFilter(orgId), financialYear: fresh.financialYear, status: ANSWERABLE,
    });
    if (fresh.totals.answered < expected) {
      throw new ValidationError([{
        field: 'status',
        message: `${expected - fresh.totals.answered} of ${expected} questions are still unanswered`,
      }]);
    }

    fresh.applicantSubmittedAt = new Date();
    fresh.status = 'Submitted';
    await fresh.save();

    /*
     * Score it now, so the assessor opens a submission with the rules already
     * applied rather than a page of zeroes and a button they have to remember
     * to press. Whoever forgot would review a questionnaire that appeared to
     * have scored nothing.
     *
     * Deliberately after the save and deliberately swallowed: the applicant has
     * submitted, and that fact must not depend on the scoring engines being
     * loadable. A failure here leaves marks at zero, which the assessor can fix
     * with the re-run button — losing the submission itself would not be fixable.
     *
     * Required lazily because the two services reference each other; at module
     * load one of them would still be half-built.
     */
    try {
      // eslint-disable-next-line global-require
      await require('./scoring.service').scoreSubmission(orgId, id);
    } catch (e) {
      fresh.scoringError = e.message;
      await fresh.save();
    }

    /*
     * Re-read: scoring wrote the marks and rebuilt the totals, and `fresh` was
     * loaded before any of that. Returning it would tell the applicant they
     * scored zero on a questionnaire that had just been scored — and the number
     * would only correct itself on the next page load, which reads as the
     * system losing their submission.
     */
    return Submission.findOne(byIdQuery(orgId, id));
  }

  /** Assessment finished — moves the submission on, does not award anything. */
  async markAssessed(id, orgId, actor = {}) {
    if (!isReviewer(actor)) throw new ForbiddenError('Only an assessor can complete an assessment');

    const submission = await Submission.findOne(byIdQuery(orgId, id));
    if (!submission) throw new NotFoundError('Submission');
    if (!submission.applicantSubmittedAt) {
      throw new ValidationError([{ field: 'status', message: 'The applicant has not submitted yet' }]);
    }

    await this.recomputeTotals(id, orgId);
    const fresh = await Submission.findOne(byIdQuery(orgId, id));
    fresh.assessorSubmittedAt = new Date();
    fresh.status = 'Assessed';
    await fresh.save();
    return fresh;
  }

  /** Sent back for changes — reopens the applicant's side. */
  async returnToApplicant(id, orgId, actor = {}) {
    if (!isReviewer(actor)) throw new ForbiddenError('Only an assessor can return a questionnaire');

    const submission = await Submission.findOne(byIdQuery(orgId, id));
    if (!submission) throw new NotFoundError('Submission');

    submission.status = 'Returned';
    // Cleared so the applicant can submit again; the assessor's own timestamp
    // stays, because that review did happen.
    submission.applicantSubmittedAt = null;
    await submission.save();
    return submission;
  }
}

module.exports = new SubmissionService();
module.exports.isReviewer = isReviewer;
