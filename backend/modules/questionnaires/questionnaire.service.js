const Question = require('./questionnaire.model');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { orgFilter, byIdQuery, escapeRegex } = require('../../shared/scope');

/**
 * PERFORMANCE NOTES — why this file is shaped the way it is.
 *
 * The system this replaces became slow in three measurable ways, and all three
 * were design choices rather than missing indexes:
 *
 *   1. The list screen fetched every question and filtered in the browser.
 *      322 documents (1.6 MB) were downloaded to display about 106 rows.
 *
 *   2. A question document is 68% answer tree. The list shows 14 columns of
 *      metadata and none of that tree, so two thirds of every list payload was
 *      never read.
 *
 *   3. Dropdown catalogues were derived with one `distinct()` per field. Each
 *      one scans the whole collection, and the authoring screen asked for five
 *      of them on every page load.
 *
 * So: filter on the server, project away the tree unless it is asked for, and
 * cache the catalogues.
 */

const SEED_TYPES = ['OEM', 'Upstream', 'DownStream'];
const SEED_CATEGORIES = [
  'General', 'Decarbonization', 'Circularity',
  'Health & Safety', 'Human Rights', 'Automobile Sector',
];
const ORDER_SLOTS = 30;

/**
 * Which questions a respondent is actually given.
 *
 * Superseded versions exist only so an answer can name the wording it was
 * shown; Archived ones have been withdrawn. Both are excluded, and the same
 * filter has to serve the list and the completeness check — when they disagreed,
 * a superseded version inflated the expected count and made submitting
 * impossible, with the error naming a question the respondent could not see.
 */
const ANSWERABLE = { $nin: ['Superseded', 'Archived'] };

/**
 * Fields the list screen actually renders. Excluding `answers` cuts the payload
 * by roughly two thirds; `?include=answers` opts back in for callers that need
 * the tree (export, duplicate).
 */
const LIST_PROJECTION = [
  'type', 'standardAlignment', 'assessmentYear', 'financialYear', 'category',
  'section', 'subSection', 'questionOrderNo', 'position', 'maxMark',
  'isMarks', 'isText', 'isUpload', 'question', 'description', 'brsrCore',
  'answerType', 'status', 'version', 'createdBy', 'createdAt', 'updatedAt',
].join(' ');

const asOptions = (values) => values.map((v) => ({ value: v, label: String(v) }));
const merged = (seed, found) => [...new Set([...seed, ...found.filter(Boolean)])];

/**
 * Catalogue cache, keyed by org.
 *
 * A short TTL alone would still serve a stale list right after an author adds a
 * category — which is exactly when they look for it — so writes invalidate the
 * org's entry outright and the TTL is only a backstop for changes made
 * elsewhere.
 */
const META_TTL_MS = 60_000;
const metaCache = new Map();

class QuestionnaireService {
  /**
   * @param query.include  'answers' to include the answer tree
   */
  async list(orgId, query = {}, pagination = {}) {
    const filter = orgFilter(orgId);

    // Every one of these narrows on the server. The screen that drives this
    // always knows its financial year and applicant type, so the common case
    // never fetches another org's or another year's rows.
    if (query.category) filter.category = query.category;
    if (query.assessmentYear) filter.assessmentYear = query.assessmentYear;
    if (query.financialYear) filter.financialYear = query.financialYear;
    if (query.section) filter.section = query.section;
    /*
     * Superseded versions are excluded unless asked for by name.
     *
     * They exist so an answer can still name the wording it was given, not so
     * they appear in a list an author picks from — a question edited three
     * times would otherwise show up four times, and only one of them is live.
     */
    if (query.status) filter.status = query.status;
    else filter.status = ANSWERABLE;
    if (query.type) filter.type = query.type;          // matches inside the array
    if (query.search) filter.question = { $regex: escapeRegex(query.search), $options: 'i' };

    const wantsAnswers = query.include === 'answers';

    const [total, items] = await Promise.all([
      Question.countDocuments(filter),
      Question.find(filter, wantsAnswers ? undefined : LIST_PROJECTION)
        .sort({ position: 1, questionOrderNo: 1, createdAt: -1 })
        .skip(pagination.skip ?? 0)
        .limit(pagination.limit ?? 50)
        // Plain objects: nothing here calls a document method, and hydrating
        // 300 nested answer trees into Mongoose documents is pure overhead.
        .lean(),
    ]);

    return { items, total };
  }

  /**
   * Everything the grid formula builder needs from OTHER questions, and nothing
   * else.
   *
   * The builder needs two things: numeric sub-answers it can target, and grids
   * it can divide by. Both were being found by downloading every question and
   * walking the tree in the browser — the same mistake as the list screen, and
   * it ran on every page load of the authoring form.
   *
   * Doing the walk here means the response is a few KB of labels instead of the
   * whole collection, and the tree never leaves the server.
   */
  async getFormulaSources(orgId, { excludeId, financialYear } = {}) {
    const filter = orgFilter(orgId);
    if (financialYear) filter.financialYear = financialYear;

    // `answers` is needed to walk, but nothing else is.
    const rows = await Question.find(filter, 'question answers').lean();

    const crossTargets = [];
    const gridSources = [];

    for (const question of rows) {
      const id = String(question._id);
      if (excludeId && id === String(excludeId)) continue;

      const title = String(question.question || '')
        .replace(/<[^>]*>/g, '').trim().slice(0, 55) || 'Untitled';

      (question.answers || []).forEach((answer, optionIndex) => {
        (answer.subAnswers || []).forEach((sub, subIndex) => {
          if (sub.isTypeNumericText === true) {
            crossTargets.push({
              questionId: id,
              optionIndex,
              subIndex,
              // Value references address by stable key, never by position — an
              // author reordering options must not re-point every rule.
              answerKey: answer.key,
              subKey: sub.key,
              label: `${title} → ${sub.subAnswerLabel || `Sub-answer ${subIndex + 1}`}`,
            });
          }

          const grid = sub[String(subIndex)];
          if (!Array.isArray(grid) || grid.length < 2) return;

          const [header] = grid;
          const colIdx = Object.keys(header || {})
            .filter((k) => /^0\d+$/.test(k))
            .map((_, i) => i);

          const cellText = (cell, fallback) => {
            if (typeof cell === 'string') return cell || fallback;
            return cell?.val || fallback;
          };

          gridSources.push({
            key: `${id}|${optionIndex}|${subIndex}`,
            questionId: id,
            optionIndex,
            subIndex,
            answerKey: answer.key,
            subKey: sub.key,
            questionLabel: title,
            label: `${title} → ${sub.subAnswerLabel || `Grid ${subIndex + 1}`}`,
            /*
             * The grid's cells are deliberately NOT here.
             *
             * Callers pick a row and a column to reference; they need the labels
             * and the dimensions, never the values. Shipping the rows as well
             * made this response 407 KB against the real 322-question corpus —
             * 177 tables of cell data with no consumer, on a call the authoring
             * screen makes on every load.
             *
             * Anything that needs a cell's value resolves it through a Ref at
             * the time it is needed, against one answer rather than all of them.
             */
            rowIdx: grid.map((_, r) => r),
            rowLabels: grid.map((row, r) => cellText(row?.[`${r}0`], r === 0 ? 'Header' : `Row ${r}`)),
            colIdx,
            colLabels: colIdx.map((c) => cellText(header[`0${c}`], `Col ${c + 1}`)),
          });
        });
      });
    }

    return { crossTargets, gridSources, scanned: rows.length };
  }

  async getById(id, orgId) {
    const doc = await Question.findOne(byIdQuery(orgId, id));
    if (!doc) throw new NotFoundError('Question');
    return doc;
  }

  async create(data, orgId, actor = {}) {
    const doc = await Question.create({
      ...data,
      ...orgFilter(orgId),
      deletedAt: undefined,
      createdBy: actor.name || actor.userId || '',
      status: 'Draft',
      version: 1,
    });
    metaCache.delete(orgId);
    return doc;
  }

  /**
   * Edit a question.
   *
   * A Draft is changed in place — nobody has answered it, so there is nothing
   * to preserve. A Published one is not: editing it creates the next version
   * and marks this one Superseded, because answers already recorded against it
   * name this exact document. Rewriting it would leave those answers pointing
   * at wording that no longer exists while still claiming, via
   * `questionVersion`, that they know what was asked.
   */
  async update(id, data, orgId, actor = {}) {
    const current = await Question.findOne(byIdQuery(orgId, id));
    if (!current) throw new NotFoundError('Question');

    if (current.status !== 'Published') {
      Object.assign(current, data);
      await current.save();
      metaCache.delete(orgId);
      return current;
    }

    await this.assertNoOpenSubmissions(orgId, current.financialYear,
      'This question is being answered right now');

    const root = current.rootQuestionId || current._id;

    // The new version first: if the insert fails, the old one is still live and
    // answerable. Superseding first would leave the year with a gap.
    const next = await Question.create({
      ...current.toObject(),
      ...data,
      _id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      version: current.version + 1,
      rootQuestionId: root,
      status: 'Published',
      createdBy: actor.name || actor.userId || current.createdBy,
    });

    current.status = 'Superseded';
    await current.save();

    metaCache.delete(orgId);
    return next;
  }

  /**
   * Make a question answerable.
   *
   * The point at which editing stops being free. Publishing is per question
   * rather than per year because a year's questions are authored over weeks and
   * an author needs the finished ones live while the rest are still drafts.
   */
  async publish(id, orgId) {
    const doc = await Question.findOne(byIdQuery(orgId, id));
    if (!doc) throw new NotFoundError('Question');

    if (doc.status === 'Published') return doc;
    if (doc.status === 'Superseded') {
      throw new ValidationError([{
        field: 'status',
        message: 'A superseded version cannot be published — publish the current one',
      }]);
    }

    doc.status = 'Published';
    await doc.save();
    metaCache.delete(orgId);
    return doc;
  }

  /** Withdraw a question. Answers already given keep pointing at it. */
  async archive(id, orgId) {
    const doc = await Question.findOne(byIdQuery(orgId, id));
    if (!doc) throw new NotFoundError('Question');

    await this.assertNoOpenSubmissions(orgId, doc.financialYear,
      'This question is being answered right now');

    doc.status = 'Archived';
    await doc.save();
    metaCache.delete(orgId);
    return doc;
  }

  /**
   * Every version of one question, newest first.
   *
   * The reason `rootQuestionId` exists: an assessor looking at a score needs to
   * read the wording the applicant actually saw, which may be three versions
   * back.
   */
  async versions(id, orgId) {
    const doc = await Question.findOne(byIdQuery(orgId, id)).lean();
    if (!doc) throw new NotFoundError('Question');

    const root = doc.rootQuestionId || doc._id;
    return Question.find({
      ...orgFilter(orgId),
      $or: [{ _id: root }, { rootQuestionId: root }],
    }).sort({ version: -1 }).lean();
  }

  /**
   * Refuse to change the question set while a cycle is in progress.
   *
   * You do not change the exam while people are sitting it. Allowing it would
   * mean a respondent who answered v1 sees v2 appear unanswered, and their
   * completed questionnaire silently becomes incomplete — with nothing on
   * screen to explain why.
   *
   * Deliberately a hard stop rather than a warning: the alternative is a
   * scorecard whose denominator changed underneath it.
   */
  async assertNoOpenSubmissions(orgId, financialYear, why) {
    if (!financialYear) return;

    // eslint-disable-next-line global-require
    const Submission = require('./submission.model');
    const open = await Submission.countDocuments({
      ...orgFilter(orgId), financialYear, applicantSubmittedAt: null,
    });

    if (open > 0) {
      throw new ValidationError([{
        field: 'status',
        message: `${why}: ${open} questionnaire${open > 1 ? 's are' : ' is'} still open for FY ${financialYear}. `
          + 'Wait until they are submitted, or return them first.',
      }]);
    }
  }

  async delete(id, orgId) {
    const doc = await Question.softDelete(byIdQuery(orgId, id));
    if (!doc) throw new NotFoundError('Question');
    metaCache.delete(orgId);
    return doc;
  }

  /**
   * Reorder. Only the two affected documents are written — the alternative,
   * renumbering the whole list on every drag, turns one move into N writes.
   */
  async swapPosition(orgId, fromId, toId) {
    const [a, b] = await Promise.all([
      Question.findOne(byIdQuery(orgId, fromId)).select('position').lean(),
      Question.findOne(byIdQuery(orgId, toId)).select('position').lean(),
    ]);
    if (!a || !b) throw new NotFoundError('Question');

    await Promise.all([
      Question.updateOne({ _id: a._id }, { position: b.position ?? 0 }),
      Question.updateOne({ _id: b._id }, { position: a.position ?? 0 }),
    ]);
    return { swapped: [String(a._id), String(b._id)] };
  }

  /**
   * Dropdown catalogues.
   *
   * One grouped aggregation rather than five `distinct()` calls: `distinct`
   * cannot use a covering index for this and scans the collection each time,
   * and the authoring screen asked for all five on every load.
   */
  async getMeta(orgId) {
    const cached = metaCache.get(orgId);
    if (cached && cached.expires > Date.now()) return cached.value;

    const [agg] = await Question.aggregate([
      { $match: orgFilter(orgId) },
      {
        $group: {
          _id: null,
          types: { $addToSet: '$type' },
          categories: { $addToSet: '$category' },
          sections: { $addToSet: '$section' },
          years: { $addToSet: '$financialYear' },
          alignments: { $addToSet: '$standardAlignment' },
        },
      },
    ]);

    // `$addToSet` over array fields yields an array of arrays.
    const flat = (v) => [...new Set((v || []).flat())].filter(Boolean);

    const currentYear = new Date().getFullYear();
    const yearWindow = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

    const value = {
      type: asOptions(merged(SEED_TYPES, flat(agg?.types))),
      category: asOptions(merged(SEED_CATEGORIES, flat(agg?.categories))),
      section: asOptions(flat(agg?.sections)),
      questionOrderNo: asOptions(
        Array.from({ length: ORDER_SLOTS }, (_, i) => String(i + 1))
      ),
      financialYear: merged(yearWindow, flat(agg?.years))
        .sort()
        .map((y) => ({ value: y, label: `${y}-${String(Number(y) + 1).slice(2)}` })),
      standardAlignment: asOptions(flat(agg?.alignments)),
    };

    metaCache.set(orgId, { value, expires: Date.now() + META_TTL_MS });
    return value;
  }

  /** Exposed for tests — the cache is process-local and otherwise invisible. */
  clearMetaCache() { metaCache.clear(); }
}

module.exports = new QuestionnaireService();
module.exports.ANSWERABLE = ANSWERABLE;
