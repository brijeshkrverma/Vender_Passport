const Response = require('./response.model');
const Question = require('./questionnaire.model');
const Submission = require('./submission.model');
const submissionService = require('./submission.service');
const { NotFoundError, ForbiddenError } = require('../../shared/errors');
const { orgFilter, byIdQuery } = require('../../shared/scope');

/**
 * ONE ANSWER PER DOCUMENT.
 *
 * The write path here is the hottest in the system — it runs on autosave, once
 * per answer the respondent touches. Everything below is shaped around keeping
 * that one write small:
 *
 *   · the document is a few KB, not the applicant's whole questionnaire
 *   · the submission's counters are NOT rewritten on every keystroke; they are
 *     rebuilt at state changes, and `recomputeTotals` exists so they can be
 *   · the question is read once, on the first save of that answer, because the
 *     read is needed for security anyway
 *
 * The system this replaces rewrote 2.3 MB per answer and took a write lock on
 * every other answer that applicant had given while it did.
 */
class ResponseService {
  /**
   * Everything answered in one submission.
   *
   * `questionIds` narrows to a section: the answering screen already holds that
   * section's questions — it needs them for the text — so it can ask for
   * exactly those answers rather than pulling the whole questionnaire.
   */
  async list(orgId, submissionId, { questionIds, status } = {}) {
    const filter = { ...orgFilter(orgId), submissionId };
    if (status) filter.status = status;
    if (questionIds?.length) filter.questionId = { $in: questionIds };

    return Response.find(filter).lean();
  }

  /**
   * Save one answer.
   *
   * An upsert keyed on (submission, question) — the unique index makes a double
   * submit impossible to turn into two answers, which would double-count in the
   * scorecard.
   */
  async save(orgId, submissionId, questionId, data, actor = {}) {
    const submission = await Submission.findOne(byIdQuery(orgId, submissionId));
    if (!submission) throw new NotFoundError('Submission');
    submissionService.assertMayAct(actor, submission);

    /*
     * Once submitted, the applicant's answer is a record of what they said —
     * and nobody gets to change it in place, reviewers included.
     *
     * Letting an assessor correct it here would be the easy thing to allow, and
     * it would quietly destroy the only evidence of what was actually
     * submitted. An assessor's view of an answer goes in `assessorResp` through
     * `review()`, beside the original rather than over it; if the applicant
     * genuinely needs to change something, `returnToApplicant` reopens the
     * questionnaire and says so on the record.
     */
    if (submission.applicantSubmittedAt) {
      throw new ForbiddenError(
        'This questionnaire has been submitted. Return it to the applicant to allow changes.');
    }

    /*
     * The question is read for two reasons at once: to reject an id that does
     * not belong to this organisation — without which anyone could write an
     * answer against any question — and to freeze `maxMark` and the version at
     * the moment of answering. One read serves both, so the security check is
     * not an extra cost.
     */
    const question = await Question.findOne(byIdQuery(orgId, questionId))
      .select('maxMark isMarks version')
      .lean();
    if (!question) throw new NotFoundError('Question');

    return Response.findOneAndUpdate(
      { ...orgFilter(orgId), submissionId, questionId },
      {
        $set: {
          answer: data.answer ?? null,
          status: data.status || 'Draft',
          updatedBy: actor.name || actor.userId || '',
        },
        $setOnInsert: {
          orgId,
          submissionId,
          questionId,
          applicantId: submission.applicantId,
          financialYear: submission.financialYear,
          // Frozen here on purpose: raising a question's marks next year must
          // not silently restate a score that was already published.
          maxMark: question.isMarks === false ? 0 : (question.maxMark || 0),
          questionVersion: question.version || 1,
          deletedAt: null,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  /**
   * An assessor's or admin's view of one answer.
   *
   * Kept beside the answer rather than as a second copy of the whole set — the
   * old shape stored `assessorResp` as a duplicate of every answer at the top
   * of the document, which was half its size on its own.
   */
  async review(orgId, submissionId, questionId, data, actor = {}) {
    if (!submissionService.isReviewer(actor)) {
      throw new ForbiddenError('Only an assessor can review an answer');
    }

    const isAdmin = ['Super Admin', 'Organization Admin', 'Compliance Manager'].includes(actor.role);
    const update = {
      status: data.status || 'Reviewed',
      updatedBy: actor.name || actor.userId || '',
    };

    if (isAdmin) {
      if (data.response !== undefined) update.adminResp = data.response;
      if (data.comment !== undefined) update.adminComment = data.comment;
    } else {
      if (data.response !== undefined) update.assessorResp = data.response;
      if (data.comment !== undefined) update.assessorComment = data.comment;
    }

    if (data.obtainedMark !== undefined) update.obtainedMark = Number(data.obtainedMark) || 0;
    if (data.marksNotApplicable !== undefined) update.marksNotApplicable = !!data.marksNotApplicable;
    // Recorded separately so a reviewer can tell a rule's choice from a human's.
    if (data.overridden !== undefined) update.overridden = !!data.overridden;

    const doc = await Response.findOneAndUpdate(
      { ...orgFilter(orgId), submissionId, questionId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!doc) throw new NotFoundError('Response');

    // A mark changed, so the submission's stored totals are now stale.
    await submissionService.recomputeTotals(submissionId, orgId);
    return doc;
  }

  /** Clear one answer. Tombstoned, and the partial unique index lets it be re-answered. */
  async clear(orgId, submissionId, questionId, actor = {}) {
    const submission = await Submission.findOne(byIdQuery(orgId, submissionId));
    if (!submission) throw new NotFoundError('Submission');
    submissionService.assertMayAct(actor, submission);

    const doc = await Response.softDelete(
      { ...orgFilter(orgId), submissionId, questionId }, actor);
    if (!doc) throw new NotFoundError('Response');
    return doc;
  }

  /**
   * Everything the assessor screen needs for one section, in one read.
   *
   * A review needs three things side by side: the question as authored, what
   * the respondent answered, and what the rules made of it. Fetching those
   * separately would be three round trips per section, and the assessor would
   * watch them arrive out of order.
   *
   * Scoped by section for the same reason the answering screen is: a
   * questionnaire runs to hundreds of questions, and an assessor works through
   * it a section at a time.
   */
  async forReview(orgId, submissionId, { section } = {}) {
    const answers = await Response.find({
      ...orgFilter(orgId), submissionId,
    }).lean();
    if (!answers.length) return [];

    const filter = { ...orgFilter(orgId), _id: { $in: answers.map((a) => a.questionId) } };
    if (section) filter.section = section;

    const questions = await Question.find(filter)
      .sort({ position: 1, questionOrderNo: 1 })
      .lean();

    const byQuestion = new Map(answers.map((a) => [String(a.questionId), a]));

    return questions.map((question) => ({
      question,
      response: byQuestion.get(String(question._id)) || null,
    }));
  }

  /**
   * How far along one submission is, by section.
   *
   * An aggregation rather than fetching the answers and counting in JS — the
   * progress bar must not cost what reading the questionnaire costs.
   */
  async progress(orgId, submissionId) {
    return Response.aggregate([
      { $match: { orgId, submissionId, deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }
}

module.exports = new ResponseService();
