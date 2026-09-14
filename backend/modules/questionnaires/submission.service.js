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

/**
 * Who may grant the final approval.
 *
 * Narrower than the assessor list on purpose: approving is the step that makes a
 * score final, so it sits with the people accountable for the programme rather
 * than with everyone who can mark an answer.
 */
const APPROVER_ROLES = new Set([
  'Super Admin', 'Organization Admin', 'Compliance Manager',
]);

/**
 * A question as the person answering it may see it.
 *
 * ── WHY THE APPLICANT DOES NOT READ /api/questionnaires ────────────────────
 *
 * The answering screen needs the questions, and the obvious way to give it them
 * was to add `Vendor Manager` and `External Company User` to the authoring
 * router's `restrictTo`. That would have worked and been wrong: a question
 * document carries `scoringRule`, and every option carries the marks it is
 * worth. Handing those to the respondent turns a permission bug into an
 * information-leak bug — they would be told which answer scores best before
 * choosing one, which is the end of the assessment being worth anything.
 *
 * So answering reads through the submission instead, and the submission only
 * ever hands back what a respondent legitimately needs.
 *
 * ── WHAT SURVIVES, AND WHY ────────────────────────────────────────────────
 *
 *   maxMark        shown to the respondent on purpose — how much a question is
 *                  worth in total is disclosed; how each option scores is not.
 *   dependsOn      a follow-up that only appears in some cases. The renderer
 *                  cannot decide visibility without it.
 *   gridFormulas   cells the sheet fills in itself; the screen needs these to
 *                  lock them. They name references, never values.
 *
 * Removed: `scoringRule`, every `score`/`subScore`, and every `assessorOption`
 * and its guidance — the assessor's marking notes, which are not the
 * respondent's business at all.
 */
function forRespondent(q) {
  return {
    _id: q._id,
    financialYear: q.financialYear,
    section: q.section,
    subSection: q.subSection,
    category: q.category,
    position: q.position,
    questionOrderNo: q.questionOrderNo,
    question: q.question,
    description: q.description,
    tooltip: q.tooltip,
    answerType: q.answerType,
    maxMark: q.maxMark,
    isText: q.isText,
    isUpload: q.isUpload,
    status: q.status,
    version: q.version,
    answers: (q.answers || []).map((a) => ({
      key: a.key,
      answerLabel: a.answerLabel,
      displayLabel: a.displayLabel,
      sortOrder: a.sortOrder,
      subAnswer: a.subAnswer,
      subAnswerType: a.subAnswerType,
      subAnswers: (a.subAnswers || []).map((s) => ({
        key: s.key,
        subAnswerLabel: s.subAnswerLabel,
        gridLabel: s.gridLabel,
        subAnswerTypes: s.subAnswerTypes,
        isTypeText: s.isTypeText,
        isTypeNumericText: s.isTypeNumericText,
        isUploadText: s.isUploadText,
        isDisabled: s.isDisabled,
        evidenceRequired: s.evidenceRequired,
        dependsOn: s.dependsOn,
        gridFormulas: s.gridFormulas,
      })),
    })),
  };
}

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

  /**
   * The questions this submission is for, as its respondent may see them.
   *
   * Scoped by the submission, not by a year the caller names: a respondent asks
   * for "my questionnaire", and which year that is follows from the submission
   * they are allowed to open. `assertMayAct` is what stops one applicant reading
   * another's.
   */
  async questionsFor(id, orgId, { section } = {}, actor = {}) {
    const submission = await this.getById(id, orgId, actor);

    // eslint-disable-next-line global-require
    const { ANSWERABLE } = require('./questionnaire.service');
    const filter = {
      ...orgFilter(orgId),
      financialYear: submission.financialYear,
      status: ANSWERABLE,
    };
    if (section) filter.section = section;

    const questions = await Question.find(filter)
      .sort({ position: 1, questionOrderNo: 1 })
      .lean();

    return questions.map(forRespondent);
  }

  /**
   * The rail on the left, and the way out of an empty one.
   *
   * Returns both the sections for this submission's year and every year that
   * has anything answerable at all. The second half is what turns "No questions
   * in this section" — which tells a respondent nothing and is where they used
   * to give up — into "published for a different year: 2026-27".
   *
   * One call rather than two, because the answer to the second is small and the
   * screen needs it exactly when the first comes back empty.
   */
  async sectionsFor(id, orgId, actor = {}) {
    const submission = await this.getById(id, orgId, actor);

    // eslint-disable-next-line global-require
    const { ANSWERABLE } = require('./questionnaire.service');
    const scope = { ...orgFilter(orgId), status: ANSWERABLE };

    const [sections, years] = await Promise.all([
      Question.distinct('section', { ...scope, financialYear: submission.financialYear }),
      Question.distinct('financialYear', scope),
    ]);

    return {
      sections: sections.filter(Boolean).sort(),
      years: years.filter(Boolean).sort(),
    };
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
    // Recorded so approval can refuse the same person twice — see approve().
    fresh.assessedBy = actor.userId || '';
    fresh.status = 'Assessed';
    await fresh.save();
    return fresh;
  }

  /**
   * The final sign-off. Assessed → Approved.
   *
   * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
   *
   * `Approved` and `adminApprovedAt` were both in the model from the start, and
   * nothing could ever set them: the flow stopped at `Assessed`, so a score was
   * final the moment one assessor said so. The status said a second pair of eyes
   * was part of the design; the code never asked for them.
   *
   * ── WHY THE ASSESSOR MAY NOT APPROVE THEIR OWN ASSESSMENT ─────────────────
   *
   * The same rule as evidence verification (`shared/verificationPolicy.js`) and
   * as staffing an audit: whoever produces a record does not attest to it. An
   * approval that the assessor can grant themselves is a click, not a control.
   */
  async approve(id, orgId, actor = {}) {
    if (!APPROVER_ROLES.has(actor?.role)) {
      throw new ForbiddenError('Only an administrator or compliance manager can approve an assessment');
    }

    const submission = await Submission.findOne(byIdQuery(orgId, id));
    if (!submission) throw new NotFoundError('Submission');

    if (submission.status === 'Approved') {
      throw new ValidationError([{ field: 'status', message: 'This assessment is already approved' }]);
    }
    if (!submission.assessorSubmittedAt || submission.status !== 'Assessed') {
      throw new ValidationError([{
        field: 'status',
        message: 'Only a completed assessment can be approved',
      }]);
    }
    if (!actor.userId) {
      throw new ForbiddenError('An approval has to be attributable to a person');
    }
    if (submission.assessedBy && String(submission.assessedBy) === String(actor.userId)) {
      throw new ForbiddenError('You assessed this submission, so you cannot also approve it');
    }

    // Rebuild from the answers first: an approval fixes the score, so it must
    // fix the real one rather than whatever the counters last happened to say.
    await this.recomputeTotals(id, orgId);
    const fresh = await Submission.findOne(byIdQuery(orgId, id));
    fresh.adminApprovedAt = new Date();
    fresh.approvedBy = actor.userId;
    fresh.status = 'Approved';
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
