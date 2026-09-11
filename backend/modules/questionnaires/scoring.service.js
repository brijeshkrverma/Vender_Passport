const Response = require('./response.model');
const Question = require('./questionnaire.model');
const Submission = require('./submission.model');
const submissionService = require('./submission.service');
const { loadEngines } = require('../../scoring/loader');
const { NotFoundError } = require('../../shared/errors');
const { orgFilter, byIdQuery } = require('../../shared/scope');

/**
 * SCORING PASS — runs the authored rules over a whole submission.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * Six mark engines, grid formulas and trend rules were all built and could all
 * be configured, but nothing ran them outside the author's browser. The point
 * of replacing 40 hardcoded `if (questionId === '682d…')` branches with data
 * was that the data would be executed; until this, it was configured and then
 * ignored, and a real score still had to be typed in by hand.
 *
 * ── ONE PASS, IN DEPENDENCY ORDER ─────────────────────────────────────────
 *
 * A rule may read another question's mark, so questions cannot be scored in
 * whatever order they come back in. `orderRules` sorts them and reports cycles;
 * a cycle is recorded as a warning and those questions are left unscored rather
 * than looped over.
 *
 * The whole submission is loaded once and scored in memory. Fetching each
 * dependency on demand would be an N+1 against the collection this model exists
 * to keep small.
 *
 * ── IT DOES NOT OVERRULE A PERSON ─────────────────────────────────────────
 *
 * An assessor who has set a mark by hand keeps it. A rule quietly replacing a
 * human decision is worse than a rule that never ran: the assessor would have
 * no way to tell it happened.
 */
class ScoringService {
  /**
   * Score one submission.
   *
   * @param dryRun  compute and return, write nothing — used to preview the
   *                effect of a rule change before it touches real scores.
   */
  async scoreSubmission(orgId, submissionId, { dryRun = false } = {}) {
    const engines = await loadEngines();
    const { markEngines, gridFormula, valueRef } = engines;

    const submission = await Submission.findOne(byIdQuery(orgId, submissionId));
    if (!submission) throw new NotFoundError('Submission');

    const responses = await Response.find({
      ...orgFilter(orgId), submissionId: submission._id,
    }).lean();

    if (!responses.length) {
      return { scored: 0, skipped: 0, warnings: ['This submission has no answers yet'], results: [] };
    }

    const questions = await Question.find({
      ...orgFilter(orgId),
      _id: { $in: responses.map((r) => r.questionId) },
    }).lean();

    const questionById = new Map(questions.map((q) => [String(q._id), q]));
    const responseByQuestion = new Map(responses.map((r) => [String(r.questionId), r]));

    /*
     * What other questions expose to a rule.
     *
     *   answers — every respondent answer in this submission, available from
     *             the start. A trend rule divides by a figure in a different
     *             question ("emissions per unit of revenue"), so it needs the
     *             other question's answer, not its mark.
     *   mark    — filled in as scoring proceeds, which is why the order below
     *             matters.
     *
     * Everything was loaded in the two queries above, so exposing it costs
     * nothing; fetching a dependency when a rule asked for it would be an N+1
     * against the collection this model exists to keep small.
     */
    const questionMarks = {};
    responses.forEach((r) => {
      questionMarks[String(r.questionId)] = { answers: r.answer || {} };
    });

    // Build the dependency graph from what each rule actually reads.
    const rules = questions.map((q) => ({
      id: String(q._id),
      reads: q.scoringRule ? markEngines.ruleDependencies(q.scoringRule) : [],
      writes: valueRef.questionRef(String(q._id), 'mark'),
    }));
    const { order, cycles } = valueRef.orderRules(rules);

    const warnings = cycles.map(
      (c) => `Questions ${c.join(' → ')} depend on each other and were not scored`);
    const inCycle = new Set(cycles.flat());

    const results = [];
    let scored = 0;
    let skipped = 0;

    for (const questionId of order) {
      const question = questionById.get(questionId);
      const response = responseByQuestion.get(questionId);
      if (!question || !response) continue;

      if (inCycle.has(questionId)) { skipped += 1; continue; }

      // A mark somebody set by hand is left exactly as it is.
      if (response.overridden) {
        skipped += 1;
        results.push({ questionId, marks: response.obtainedMark, skipped: 'assessor override' });
        questionMarks[questionId] = { ...questionMarks[questionId], mark: response.obtainedMark };
        continue;
      }

      const catalog = valueRef.buildCatalog(
        // `buildCatalog` reads the editor's field names; the stored document
        // uses the legacy ones, so the shapes are bridged here rather than in
        // the catalog, which the authoring screen also depends on.
        {
          maxMark: question.maxMark,
          answers: (question.answers || []).map((a) => ({
            key: a.key,
            answerLabel: a.answerLabel,
            displayLabel: a.displayLabel,
            score: a.score,
            subAnswers: (a.subAnswers || []).map((s) => ({
              key: s.key,
              subAnswerLabel: s.subAnswerLabel,
              subAnswerType: s.subAnswerTypes,
              inputMode: s.isTypeNumericText === true ? 'numeric'
                : s.isUploadText === true ? 'upload'
                  : s.isTypeText === true ? 'text' : '',
              grid: null,
            })),
          })),
        },
        Object.keys(questionMarks).map((id) => ({ questionId: id, label: id }))
      );

      let refCtx = {
        answers: response.answer || {},
        self: { maxMark: question.maxMark || 0 },
        questions: questionMarks,
      };

      /*
       * Formulas first: they fill cells, and a mark rule may read a filled
       * cell. Running them the other way round scores the blank.
       */
      const formulas = (question.answers || []).flatMap(
        (a) => (a.subAnswers || []).flatMap((s) => s.gridFormulas || []));

      const formulaWarnings = [];
      if (formulas.length) {
        const out = gridFormula.evaluateFormulas(refCtx, formulas, catalog);
        refCtx = out.ctx;
        formulaWarnings.push(...out.warnings);
      }

      const selectedOptions = (question.answers || [])
        .filter((a) => refCtx.answers?.[a.key]?.selected)
        .map((a) => ({ option: a.displayLabel || a.answerLabel || 'Option', marks: Number(a.score) || 0 }));

      const rule = question.scoringRule?.engine
        ? question.scoringRule
        : { engine: 'optionSum', config: {} };

      const outcome = markEngines.evaluateRule(rule, {
        catalog, refCtx, maxMark: question.maxMark || 0, selectedOptions,
      }) || { marks: 0, trace: [], warnings: [] };

      /*
       * Trend rules run after the marks, and produce something different from
       * them: not a score, but which assessor option the figures point to.
       *
       * The result is pre-filled for the assessor rather than awarded. That is
       * the whole intent — it replaces the arithmetic an assessor does by hand
       * (three years of intensity, compare first with last, read off a band),
       * not the judgement of whether the evidence supports it. `allowOverride`
       * and `overridden` only mean anything if a person still decides.
       */
      const autoSelections = [];
      for (const answer of question.answers || []) {
        for (const sub of answer.subAnswers || []) {
          if (!sub.trendRule) continue;

          const verdict = engines.trendRule.evaluateTrendRule(sub.trendRule, refCtx, catalog);
          if (verdict.skipped || !verdict.option) {
            formulaWarnings.push(
              `${sub.subAnswerLabel || 'Trend rule'}: ${verdict.warnings[0] || 'no band matched'}`);
            continue;
          }

          autoSelections.push({
            answerKey: answer.key,
            subKey: sub.key,
            option: verdict.option,
            marks: verdict.marks,
            pctChange: Math.round(verdict.pctChange * 100) / 100,
            allowOverride: !!sub.trendRule.allowOverride,
            // The working, so an assessor can check the figure rather than
            // take it on trust.
            intensities: verdict.intensities.map((i) => ({
              numerator: i.numerator, denominator: i.denominator, value: i.value,
            })),
          });
        }
      }

      questionMarks[questionId] = { ...questionMarks[questionId], mark: outcome.marks };
      scored += 1;

      results.push({
        questionId,
        marks: outcome.marks,
        engine: rule.engine,
        trace: outcome.trace,
        autoSelections,
        warnings: [...formulaWarnings, ...(outcome.warnings || [])],
      });
    }

    if (!dryRun) {
      await Promise.all(results
        .filter((r) => !r.skipped)
        .map((r) => Response.updateOne(
          { ...orgFilter(orgId), submissionId: submission._id, questionId: r.questionId },
          {
            $set: {
              obtainedMark: r.marks,
              scoreTrace: r.trace,
              scoreWarnings: r.warnings,
              scoredAt: new Date(),
              // What a trend rule proposes, waiting for the assessor. Written
              // separately from `assessorResp` so a proposal is never mistaken
              // for a decision somebody made.
              autoSelections: r.autoSelections,
              autoSelected: r.autoSelections.length > 0,
            },
          }
        )));

      await submissionService.recomputeTotals(submissionId, orgId);
    }

    return { scored, skipped, warnings, results, dryRun };
  }
}

module.exports = new ScoringService();
