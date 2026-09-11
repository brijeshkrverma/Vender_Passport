/**
 * VALIDATION — pure, framework-free, shareable with the server.
 *
 * Returns a flat map keyed by dotted path:
 *   { 'category': 'Category is required',
 *     'answers.0.assessorOptions.1.marks': 'Marks must be a number' }
 *
 * A flat map (rather than a nested mirror of the form) means a control only has
 * to know its own path to find its error, which is what lets the answer, grid
 * and assessor-option editors stay generic at any nesting depth. The Angular
 * screen instead inlined ~30 `@if` blocks in the template, which is why none of
 * that validation could be reused on the server.
 */

import { BASIC_FIELDS, REPORTING_FIELDS } from '../config/questionnaireSchema.js';
import { getAnswerType } from '../config/questionTypes.js';
import { getType } from '../types/index.js';
import { validateCondition } from './visibility.js';
import { validateTrendRule } from './trendRule.js';
import { validateRule } from './markEngines.js';
import { buildCatalog } from './valueRef.js';

const isBlank = (v) =>
  v === null || v === undefined ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0);

/** Rich text arrives as HTML — an "empty" editor still contains tags. */
const isBlankHtml = (v) =>
  isBlank(v) || String(v).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';

const notNumber = (v) => !isBlank(v) && Number.isNaN(Number(v));

export function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

/** Assessor options, wherever they hang — answer, sub-answer or grid row. */
function validateAssessorOptions(options, prefix, errors) {
  (options || []).forEach((option, i) => {
    const at = `${prefix}.${i}`;
    if (isBlank(option.option)) errors[`${at}.option`] = 'Option text is required';
    if (notNumber(option.marks)) errors[`${at}.marks`] = 'Marks must be a number';

    (option.subOptions || []).forEach((sub, j) => {
      const st = `${at}.subOptions.${j}`;
      if (isBlank(sub.option)) errors[`${st}.option`] = 'Option text is required';
      if (notNumber(sub.marks)) errors[`${st}.marks`] = 'Marks must be a number';
    });
  });
}

function validateGrid(grid, prefix, errors, catalog) {
  if (!grid) {
    errors[prefix] = 'Grid type selected but no table has been built';
    return;
  }
  if ((grid.columns || []).length === 0) errors[`${prefix}.columns`] = 'Add at least one column';
  if ((grid.rows || []).length === 0) errors[`${prefix}.rows`] = 'Add at least one row';

  (grid.columns || []).forEach((column, i) => {
    if (isBlank(column.label)) errors[`${prefix}.columns.${i}.label`] = 'Column heading is required';
  });

  (grid.rows || []).forEach((row, i) => {
    validateAssessorOptions(row.assessorOptions, `${prefix}.rows.${i}.assessorOptions`, errors);
  });

  /*
   * Formulas name their targets and inputs with value references, so the
   * catalog is all the engine needs — it no longer has to be told the table's
   * dimensions, because a Ref that points outside one cannot pass
   * `validateRef` in the first place.
   */
  const formulaErrors = validateFormulas(grid.formulas, catalog);
  if (formulaErrors.length) errors[`${prefix}.formulas`] = formulaErrors.join(' · ');
}

function validateSubAnswer(sub, prefix, errors, catalog) {
  if (isBlank(sub.subAnswerLabel) && sub.subAnswerType !== 'Grid') {
    errors[`${prefix}.subAnswerLabel`] = 'Answer label is required';
  }
  if (notNumber(sub.subScore)) errors[`${prefix}.subScore`] = 'Score must be a number';
  if (notNumber(sub.weight)) errors[`${prefix}.weight`] = 'Weight must be a number';

  // A condition aimed at an option the author has since deleted would hide the
  // follow-up for everyone, silently — the same class of failure as a rule
  // pointing at a renamed field.
  const conditionErrors = validateCondition(sub.dependsOn, catalog);
  if (conditionErrors.length) errors[`${prefix}.dependsOn`] = conditionErrors.join(' · ');
  if (isBlank(sub.subAnswerType)) errors[`${prefix}.subAnswerType`] = 'Sub answer type is required';

  // Each type says what is wrong with its own configuration, in the author's
  // words. The validator no longer knows what a grid is.
  const typeErrors = getType(sub.subAnswerType).validate(sub.config, {
    catalog, typeId: sub.subAnswerType, trendRule: sub.trendRule,
    assessorOptions: sub.assessorOptions,
  });
  if (typeErrors.length) errors[`${prefix}.config`] = typeErrors.join(' · ');

  if ((sub.assessorOptions || []).length > 0 && isBlank(sub.assessorOptionType)) {
    errors[`${prefix}.assessorOptionType`] = 'Pick how the assessor marks these options';
  }
  validateAssessorOptions(sub.assessorOptions, `${prefix}.assessorOptions`, errors);

  if (sub.trendRule) {
    const trendErrors = validateTrendRule(sub.trendRule, catalog);

    // A band naming an option this sub-answer does not have can never fire, so
    // the rule would quietly award nothing on that branch.
    const available = (sub.assessorOptions || []).map((o) => o.option).filter(Boolean);
    (sub.trendRule.bands || []).forEach((b, i) => {
      if (b.option && available.indexOf(b.option) < 0) {
        trendErrors.push(`Band ${i + 1}'s option "${b.option}" does not exist on this sub-answer`);
      }
    });

    if (trendErrors.length) errors[`${prefix}.trendRule`] = [...new Set(trendErrors)].join(' · ');
  }
}

export function validateQuestionnaire(form) {
  const errors = {};

  /**
   * What every value reference in this question is allowed to point at.
   *
   * Derived from the form itself, so a formula or rule aimed at an option the
   * author has since deleted is caught here rather than becoming a wrong score
   * later.
   */
  const catalog = buildCatalog(form);

  for (const field of [...BASIC_FIELDS, ...REPORTING_FIELDS]) {
    const value = form[field.name];
    const blank = field.control === 'richtext' ? isBlankHtml(value) : isBlank(value);

    if (field.required && blank) {
      errors[field.name] = `${field.label} is required`;
      continue;
    }
    if (field.maxWords && countWords(value) > field.maxWords) {
      errors[field.name] = `${field.label} cannot exceed ${field.maxWords} words`;
    }
  }

  if (!isBlank(form.maxMark) && Number(form.maxMark) < 0) {
    errors.maxMark = 'Max marks cannot be negative';
  }

  // A rule that saves broken produces a silently wrong score, which is the
  // worst failure mode a scoring system has.
  const ruleErrors = validateRule(form.scoringRule, catalog);
  if (ruleErrors.length) errors.scoringRule = ruleErrors.join(' · ');
  if (notNumber(form.position)) errors.position = 'Position must be a number';

  const type = getAnswerType(form.answerType);
  const answers = form.answers || [];

  // An option-based question with no options can never be answered. The
  // original let this save and the failure only surfaced to the respondent.
  if (form.answerType && type.hasOptions && answers.length === 0) {
    errors.answers = `${type.label} needs at least one answer option`;
  }

  answers.forEach((answer, i) => {
    const at = `answers.${i}`;
    if (isBlank(answer.answerLabel)) errors[`${at}.answerLabel`] = 'Answer label is required';
    if (notNumber(answer.score)) errors[`${at}.score`] = 'Score must be a number';
    if (notNumber(answer.sortOrder)) errors[`${at}.sortOrder`] = 'Sort order must be a number';

    if ((answer.assessorOptions || []).length > 0 && isBlank(answer.assessorOptionType)) {
      errors[`${at}.assessorOptionType`] = 'Pick how the assessor marks these options';
    }
    validateAssessorOptions(answer.assessorOptions, `${at}.assessorOptions`, errors);

    if (answer.hasSubAnswers) {
      if (isBlank(answer.subAnswerType)) {
        errors[`${at}.subAnswerType`] = 'Sub answer type is required';
      }
      if ((answer.subAnswers || []).length === 0) {
        errors[`${at}.subAnswers`] = 'Add at least one sub answer, or set Sub Answer to No';
      }
      (answer.subAnswers || []).forEach((sub, j) => {
        validateSubAnswer(sub, `${at}.subAnswers.${j}`, errors, catalog);
      });
    }
  });

  return errors;
}

/**
 * Every score the author has entered, so they can see whether the marking
 * scheme can actually reach Max Marks before saving.
 *
 * Assessor-option marks are counted separately from option scores because they
 * are alternatives, not additions: when an option carries assessor options, the
 * scoring pass uses those and ignores the option's own score.
 */
export function summariseScores(form) {
  let optionTotal = 0;
  let subTotal = 0;
  let assessorTotal = 0;

  const addOptions = (options) => {
    (options || []).forEach((o) => {
      const subs = o.subOptions || [];
      // Radio sub-options are alternatives: the best one is the reachable max.
      if (subs.length) assessorTotal += Math.max(...subs.map((s) => Number(s.marks) || 0), 0);
      else assessorTotal += Number(o.marks) || 0;
    });
  };

  (form.answers || []).forEach((a) => {
    optionTotal += Number(a.score) || 0;
    addOptions(a.assessorOptions);
    (a.subAnswers || []).forEach((s) => {
      subTotal += Number(s.subScore) || 0;
      addOptions(s.assessorOptions);
      (s.config?.rows || []).forEach((r) => addOptions(r.assessorOptions));
    });
  });

  const max = Number(form.maxMark) || 0;
  const reachable = Math.max(optionTotal + subTotal, assessorTotal);

  return {
    optionTotal, subTotal, assessorTotal, reachable, max,
    combined: optionTotal + subTotal,
    exceedsMax: max > 0 && reachable > max,
  };
}
