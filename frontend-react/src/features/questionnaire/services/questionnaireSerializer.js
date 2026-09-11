/**
 * SERIALIZER — the only place the form model and the API model meet.
 *
 * The form model is shaped for editing (booleans, stable `key`s for React
 * lists, strings straight out of inputs). The stored model is shaped for
 * storage and scoring, and carries some legacy that is not worth breaking:
 * the `subanswar` misspelling, three mutually-exclusive input-mode booleans,
 * and coordinate-keyed grid rows.
 *
 * Keeping the mapping in one pure module means the edit screen, the importer
 * and the tests all agree, and a backend rename is a one-file change.
 */

import {
  emptyAnswer, emptySubAnswer, emptyQuestionnaire,
} from '../config/questionnaireSchema.js';
import { getAnswerType } from '../config/questionTypes.js';
import { toStoredAssessorOption, fromStoredAssessorOption } from './gridModel.js';
import { getType } from '../types/index.js';

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const trim = (v) => (typeof v === 'string' ? v.trim() : v);
const str = (v) => (v === null || v === undefined ? '' : String(v));

/**
 * One `inputMode` choice <-> the three stored booleans.
 *
 * Stored as `isTypeText` / `isTypeNumericText` / `isUploadText`, each holding
 * `true` or the empty string. They are mutually exclusive in every stored row,
 * so the editor models them as a single choice — which also makes the
 * impossible "text and numeric at once" state unrepresentable.
 */
function inputModeToFlags(mode) {
  return {
    isTypeText: mode === 'text' ? true : '',
    isTypeNumericText: mode === 'numeric' ? true : '',
    isUploadText: mode === 'upload' ? true : '',
  };
}

function flagsToInputMode(sub) {
  if (sub?.isTypeNumericText === true) return 'numeric';
  if (sub?.isUploadText === true) return 'upload';
  if (sub?.isTypeText === true) return 'text';
  return '';
}

/* ── Form -> API ───────────────────────────────────────────────────────── */

function subAnswerToStored(sub, index) {
  // The type decides what its configuration serialises to. Before the contract
  // this was a `subAnswerTypes === 'Grid'` check, and any second type needing
  // its own configuration would have had to find this line and three like it.
  const type = getType(sub.subAnswerType);
  const config = type.toStored(sub.config, { index });

  return {
    // Persisted, not a render-time id: every value reference addresses this
    // sub-answer by key, so losing it would re-point every rule.
    key: sub.key,
    subAnswerLabel: trim(sub.subAnswerLabel) || '',
    subScore: numOrNull(sub.subScore) ?? 0,
    gridLabel: trim(sub.gridLabel) || '',
    subAnswerTypes: sub.subAnswerType || '',
    isDisabled: !!sub.isDisabled,
    flag: trim(sub.flag) || '',
    // Only written when set — absent means always shown, which must stay
    // distinct from a condition that happens to be false.
    ...(sub.dependsOn?.ref ? { dependsOn: sub.dependsOn } : {}),
    weight: numOrNull(sub.weight) ?? 1,
    evidenceRequired: !!sub.evidenceRequired,
    assessorOptionType: sub.assessorOptionType || '',
    assessorGuidence: sub.assessorGuidance || '',
    assessorOption: (sub.assessorOptions || []).map((o) =>
      toStoredAssessorOption({ ...o, assessorOptionType: sub.assessorOptionType })),
    // Only stored when the author actually built one — absent means the
    // assessor decides by hand, which must stay distinguishable from an empty
    // rule that would silently award nothing.
    ...(sub.trendRule ? { trendRule: sub.trendRule } : {}),
    ...inputModeToFlags(sub.inputMode),
    ...(config || {}),
  };
}

export function toPayload(form) {
  const type = getAnswerType(form.answerType);

  return {
    type: form.type || [],
    standardAlignment: form.standardAlignment || [],
    assessmentYear: form.assessmentYear || null,
    financialYear: trim(form.financialYear) || '',
    category: trim(form.category) || null,
    section: trim(form.section) || '',
    subSection: trim(form.subSection) || '',
    questionOrderNo: numOrNull(form.questionOrderNo),
    position: numOrNull(form.position),
    maxMark: numOrNull(form.maxMark),
    question: form.question || '',
    description: form.description || '',
    tooltip: form.tooltip || '',
    brsrCore: form.brsrCore || '',
    answerType: form.answerType || '',
    // Absent means "score normally", which must stay distinct from a rule that
    // ran and produced zero.
    scoringRule: form.scoringRule?.engine ? form.scoringRule : null,

    // Author-controlled, with the type registry supplying the default. Storing
    // them means the renderer and the scoring pass never re-derive the
    // capability, so a question keeps behaving as authored even if the registry
    // later changes.
    isMarks: !!form.isMarks,
    isText: form.isText ?? (type.captures === 'text'),
    isUpload: form.isUpload ?? (type.captures === 'file'),

    answers: (form.answers || []).map((answer, index) => ({
      key: answer.key,
      answerLabel: trim(answer.answerLabel) || '',
      displayLabel: trim(answer.displayLabel) || '',
      sortOrder: numOrNull(answer.sortOrder) ?? index + 1,
      score: numOrNull(answer.score) ?? 0,
      assessorOptionType: answer.assessorOptionType || '',
      assessorGuidence: answer.assessorGuidance || '',
      assessorOption: (answer.assessorOptions || []).map((o) =>
        toStoredAssessorOption({ ...o, assessorOptionType: answer.assessorOptionType })),
      subAnswer: answer.hasSubAnswers ? 'yes' : 'no',
      subAnswerType: answer.hasSubAnswers ? answer.subAnswerType || '' : '',
      subAnswers: answer.hasSubAnswers
        ? (answer.subAnswers || []).map(subAnswerToStored)
        : [],
    })),
  };
}

/* ── API -> Form ───────────────────────────────────────────────────────── */

function subAnswerToForm(sub, index) {
  const subAnswerType = sub.subAnswerTypes || sub.subAnswerType || '';
  return {
    // A stored key is kept; a legacy document that has none gets a fresh one.
    // Minting a key for a document that never had rules pointing at it is safe;
    // overwriting an existing key would not be.
    ...emptySubAnswer(),
    ...(sub.key ? { key: sub.key } : {}),
    subAnswerLabel: sub.subAnswerLabel || '',
    subScore: sub.subScore != null ? str(sub.subScore) : str(sub.subscore ?? ''),
    gridLabel: sub.gridLabel || '',
    subAnswerType,
    inputMode: flagsToInputMode(sub),
    isDisabled: !!sub.isDisabled,
    flag: sub.flag || '',
    dependsOn: sub.dependsOn || null,
    weight: sub.weight != null ? str(sub.weight) : '1',
    evidenceRequired: !!sub.evidenceRequired,
    assessorOptionType: sub.assessorOptionType || '',
    assessorGuidance: sub.assessorGuidence || '',
    assessorOptions: (sub.assessorOption || []).map(fromStoredAssessorOption),
    config: getType(subAnswerType).fromStored(sub, { index }),
    trendRule: sub.trendRule || null,
  };
}

export function toForm(doc) {
  if (!doc) return emptyQuestionnaire();

  return {
    ...emptyQuestionnaire(),
    type: Array.isArray(doc.type) ? doc.type : (doc.type ? [doc.type] : []),
    standardAlignment: doc.standardAlignment || [],
    // Legacy documents call this `assignmentYear`.
    assessmentYear: (doc.assessmentYear || doc.assignmentYear)
      ? str(doc.assessmentYear || doc.assignmentYear).slice(0, 10)
      : '',
    financialYear: str(doc.financialYear || ''),
    category: doc.category || '',
    section: doc.section || '',
    subSection: doc.subSection || '',
    questionOrderNo: doc.questionOrderNo != null ? str(doc.questionOrderNo) : '',
    position: doc.position != null ? str(doc.position) : '',
    maxMark: doc.maxMark != null ? str(doc.maxMark) : '',
    isMarks: doc.isMarks !== false,
    isText: doc.isText === true,
    isUpload: doc.isUpload === true,
    question: doc.question || '',
    description: doc.description || '',
    tooltip: doc.tooltip || '',
    brsrCore: doc.brsrCore || '',
    answerType: doc.answerType || '',
    scoringRule: doc.scoringRule?.engine ? doc.scoringRule : null,
    // `answer` is the stored key; `answers` is what this API writes.
    answers: (doc.answers || doc.answer || []).map((answer) => ({
      ...emptyAnswer(),
      ...(answer.key ? { key: answer.key } : {}),
      answerLabel: answer.answerLabel || '',
      displayLabel: answer.displayLabel || '',
      sortOrder: answer.sortOrder != null ? str(answer.sortOrder) : '',
      score: answer.score != null ? str(answer.score) : '',
      assessorOptionType: answer.assessorOptionType || '',
      assessorGuidance: answer.assessorGuidence || '',
      assessorOptions: (answer.assessorOption || []).map(fromStoredAssessorOption),
      /*
       * Stored sub-answers win over the flag that says whether there are any.
       *
       * The two disagree in the real corpus: four answers carry `subAnswer:
       * 'no'` and a populated `subanswar`. Trusting the flag discarded those
       * four on read — silently, because a dropped follow-up looks exactly like
       * a question that never had one.
       *
       * This only affects reading. Authoring still works as designed: toggling
       * Sub Answer to No sets the flag in form state and `toPayload` writes an
       * empty list, so the next read agrees with it.
       */
      hasSubAnswers: answer.subAnswer === 'yes'
        || answer.subAnswer === true
        || (answer.subAnswers || answer.subanswar || []).length > 0,
      subAnswerType: answer.subAnswerType || '',
      // Tolerate the stored misspelling.
      subAnswers: (answer.subAnswers || answer.subanswar || []).map(subAnswerToForm),
    })),
  };
}
