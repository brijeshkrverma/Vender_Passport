const submissions = require('./submission.service');
const responses = require('./response.service');
const scoring = require('./scoring.service');
const response = require('../../shared/response');
const { parsePagination } = require('../../shared/pagination');

/* ── submissions ───────────────────────────────────────────────────────── */

exports.start = async (req, res, next) => {
  try {
    response.created(res, await submissions.start(req.user.scopeOrgId, {
      // An applicant may only start their own; the guard lives in the service,
      // so defaulting to the caller here is a convenience, not the check.
      applicantId: req.body.applicantId || req.user.userId,
      financialYear: req.body.financialYear,
      applicantType: req.body.applicantType,
      // Part of the identity, not a detail: without it a questionnaire raised
      // inside an audit resolves to the applicant's yearly one and silently
      // shares its answers.
      auditId: req.body.auditId,
    }, req.user));
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await submissions.list(req.user.scopeOrgId, req.query, { skip, limit });
    response.paginated(res, items, { page, limit, total });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    response.success(res, await submissions.getById(req.params.id, req.user.scopeOrgId, req.user));
  } catch (e) { next(e); }
};

exports.submit = async (req, res, next) => {
  try {
    response.success(res, await submissions.submit(req.params.id, req.user.scopeOrgId, req.user));
  } catch (e) { next(e); }
};

exports.markAssessed = async (req, res, next) => {
  try {
    response.success(res, await submissions.markAssessed(req.params.id, req.user.scopeOrgId, req.user));
  } catch (e) { next(e); }
};

exports.returnToApplicant = async (req, res, next) => {
  try {
    response.success(res, await submissions.returnToApplicant(req.params.id, req.user.scopeOrgId, req.user));
  } catch (e) { next(e); }
};

exports.recompute = async (req, res, next) => {
  try {
    response.success(res, await submissions.recomputeTotals(req.params.id, req.user.scopeOrgId));
  } catch (e) { next(e); }
};

/**
 * Run the authored rules over the whole submission.
 *
 * `?dryRun=1` computes and returns without writing, so the effect of a rule
 * change can be seen before it touches a real score.
 */
exports.score = async (req, res, next) => {
  try {
    response.success(res, await scoring.scoreSubmission(
      req.user.scopeOrgId, req.params.id, { dryRun: req.query.dryRun === '1' }));
  } catch (e) { next(e); }
};

/* ── responses ─────────────────────────────────────────────────────────── */

exports.listResponses = async (req, res, next) => {
  try {
    // Confirms the caller may see this submission at all before returning any
    // of its answers.
    await submissions.getById(req.params.id, req.user.scopeOrgId, req.user);
    response.success(res, await responses.list(req.user.scopeOrgId, req.params.id, {
      questionIds: req.query.questionIds ? String(req.query.questionIds).split(',') : undefined,
      status: req.query.status,
    }));
  } catch (e) { next(e); }
};

exports.saveResponse = async (req, res, next) => {
  try {
    response.success(res, await responses.save(
      req.user.scopeOrgId, req.params.id, req.params.questionId, req.body, req.user));
  } catch (e) { next(e); }
};

exports.reviewResponse = async (req, res, next) => {
  try {
    response.success(res, await responses.review(
      req.user.scopeOrgId, req.params.id, req.params.questionId, req.body, req.user));
  } catch (e) { next(e); }
};

exports.clearResponse = async (req, res, next) => {
  try {
    await responses.clear(req.user.scopeOrgId, req.params.id, req.params.questionId, req.user);
    response.noContent(res);
  } catch (e) { next(e); }
};

exports.forReview = async (req, res, next) => {
  try {
    await submissions.getById(req.params.id, req.user.scopeOrgId, req.user);
    response.success(res, await responses.forReview(
      req.user.scopeOrgId, req.params.id, { section: req.query.section }));
  } catch (e) { next(e); }
};

exports.progress = async (req, res, next) => {
  try {
    await submissions.getById(req.params.id, req.user.scopeOrgId, req.user);
    response.success(res, await responses.progress(req.user.scopeOrgId, req.params.id));
  } catch (e) { next(e); }
};
