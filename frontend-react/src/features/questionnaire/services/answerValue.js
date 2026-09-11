/**
 * WHAT A RESPONDENT'S ANSWER LOOKS LIKE.
 *
 * ── THE SHAPE IS THE RESOLVER'S CONTEXT, DELIBERATELY ─────────────────────
 *
 *   {
 *     [answerKey]: {
 *       selected: boolean,
 *       subs: {
 *         [subKey]: { value, grid }
 *       }
 *     }
 *   }
 *
 * This is exactly the `answers` map that `resolveRef` reads. That is not a
 * coincidence — it is the point.
 *
 * A formula reads cells, a mark engine reads inputs and options, a trend rule
 * reads a series. If the answer were stored in its own shape, every one of them
 * would need an adapter from "what the respondent typed" to "what a Ref names",
 * and each adapter is somewhere the two can drift. Making the answer *be* the
 * context means a formula runs against the live answer with no translation at
 * all, and the preview an author sees is computed by the same code that will
 * score the real submission.
 *
 * ── WHY GRIDS KEEP THEIR COORDINATE KEYS ──────────────────────────────────
 *
 * `grid` holds the stored row array — `[header, ...rows]` with cells keyed
 * `"11"` — rather than something friendlier. `cellRef` addresses that space, so
 * converting here would mean converting back before every resolve.
 *
 * Everything is pure: no React, no dates, no ids. The same functions run in the
 * authoring preview and on the server.
 */

import { visibleSubAnswers } from './visibility.js';

const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '';

/** An empty answer. A question that has not been touched has no keys at all. */
export const emptyAnswer = () => ({});

const answerAt = (answer, answerKey) => answer?.[answerKey] || { selected: false, subs: {} };

export const isSelected = (answer, answerKey) => !!answer?.[answerKey]?.selected;

export const subValue = (answer, answerKey, subKey) =>
  answer?.[answerKey]?.subs?.[subKey]?.value ?? '';

export const subGrid = (answer, answerKey, subKey) =>
  answer?.[answerKey]?.subs?.[subKey]?.grid;

/**
 * Select or clear an option.
 *
 * `single` clears the others — a radio question whose answer holds two
 * selections is not a question anyone can score, and letting the UI be the only
 * thing enforcing that means the first non-UI writer breaks it.
 *
 * Deselecting keeps whatever was typed underneath. An option ticked by mistake
 * and untickeded should not silently discard the paragraph typed into its
 * follow-up; `toStoredAnswer` drops unselected branches on save instead.
 */
export function setSelected(answer, answerKey, on, { single = false } = {}) {
  const next = { ...answer };

  if (single && on) {
    Object.keys(next).forEach((key) => {
      if (key !== answerKey && next[key]?.selected) {
        next[key] = { ...next[key], selected: false };
      }
    });
  }

  next[answerKey] = { ...answerAt(answer, answerKey), selected: !!on };
  return next;
}

/** Write a sub-answer's typed value. */
export function setSubValue(answer, answerKey, subKey, value) {
  const current = answerAt(answer, answerKey);
  return {
    ...answer,
    [answerKey]: {
      ...current,
      subs: {
        ...current.subs,
        [subKey]: { ...(current.subs?.[subKey] || {}), value },
      },
    },
  };
}

/** Write one grid cell, in the coordinate space `cellRef` addresses. */
export function setGridCell(answer, answerKey, subKey, row, col, value) {
  const current = answerAt(answer, answerKey);
  const sub = current.subs?.[subKey] || {};
  const grid = Array.isArray(sub.grid) ? sub.grid.slice() : [];

  const rowObject = { ...(grid[row] || {}) };
  const key = `${row}${col}`;
  const existing = rowObject[key];
  rowObject[key] = typeof existing === 'object' && existing !== null
    ? { ...existing, val: value }
    : { val: value, type: 'text' };
  grid[row] = rowObject;

  return {
    ...answer,
    [answerKey]: {
      ...current,
      subs: { ...current.subs, [subKey]: { ...sub, grid } },
    },
  };
}

/**
 * Seed a grid from the question's authored table.
 *
 * The author fills default values and column headers; the respondent starts
 * from those rather than from an empty table, and overwrites what they need to.
 */
export function seedGrid(answer, answerKey, subKey, storedRows) {
  if (!Array.isArray(storedRows) || subGrid(answer, answerKey, subKey)) return answer;

  const current = answerAt(answer, answerKey);
  const sub = current.subs?.[subKey] || {};
  return {
    ...answer,
    [answerKey]: {
      ...current,
      subs: {
        ...current.subs,
        [subKey]: { ...sub, grid: JSON.parse(JSON.stringify(storedRows)) },
      },
    },
  };
}

/**
 * The answer as it should be stored: unselected branches dropped.
 *
 * Keeping them would mean a scoring pass has to know that values under an
 * unticked option do not count — a rule that every consumer would have to
 * remember, and that one of them eventually would not.
 */
export function toStoredAnswer(answer) {
  const out = {};
  Object.entries(answer || {}).forEach(([answerKey, entry]) => {
    if (!entry?.selected) return;
    out[answerKey] = { selected: true, subs: entry.subs || {} };
  });
  return out;
}

/**
 * Has this question been answered?
 *
 * An option-based question needs a selection. One with no options — Text or
 * Upload — is answered when its inputs hold something, since there is nothing
 * to tick.
 *
 * `question` is optional, and supplying it is what makes a conditional
 * follow-up behave: a sub-answer whose condition is not met is not required,
 * because the respondent was never shown it. Counting it as unanswered would
 * tell someone they had missed a question that never appeared on their screen.
 */
export function isAnswered(answer, { hasOptions, question } = {}) {
  if (question) {
    const required = (question.answers || [])
      .filter((a) => isSelected(answer, a.key))
      .flatMap((a) => visibleSubAnswers(a.subAnswers, { answers: answer }));

    // An option-based question is answered once an option is chosen; its
    // visible follow-ups are what the completeness check then looks at.
    if (hasOptions) return (question.answers || []).some((a) => isSelected(answer, a.key));
    if (required.length === 0) return Object.keys(answer || {}).length > 0;
  }

  const entries = Object.values(answer || {});
  if (!entries.length) return false;
  if (hasOptions) return entries.some((e) => e.selected);

  return entries.some((e) => Object.values(e.subs || {}).some((s) => {
    if (hasValue(s.value)) return true;
    return Array.isArray(s.grid) && s.grid.slice(1).some(
      (row) => Object.values(row || {}).some((c) => hasValue(typeof c === 'object' ? c?.val : c)));
  }));
}

/**
 * What the respondent's own answer scores.
 *
 * The option's `score`, not its `assessorOption` marks. The two are different
 * stages and conflating them is easy to do and wrong in both directions:
 *
 *   score          — carried by the option itself, awarded for choosing it.
 *                    263 of the 322 stored questions score this way.
 *   assessorOption — what the assessor picks among *afterwards*, once they have
 *                    looked at the evidence. At answering time nobody has
 *                    picked one, so counting them here would show an applicant
 *                    marks they have not been given.
 *
 * A question can have both. The assessor's decision supersedes this figure when
 * it arrives; until then this is the honest number.
 */
export function selectedOptions(question, answer) {
  return (question?.answers || [])
    .filter((a) => isSelected(answer, a.key))
    .map((a) => ({
      option: a.displayLabel || a.answerLabel || 'Option',
      marks: Number(a.score) || 0,
    }));
}

/** Does this question defer to an assessor for some or all of its marks? */
export const hasAssessorMarking = (question) =>
  (question?.answers || []).some((a) => (a.assessorOption || []).length > 0
    || (a.subAnswers || []).some((s) => (s.assessorOption || []).length > 0));

export { hasValue };
