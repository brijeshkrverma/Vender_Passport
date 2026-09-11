import { resolveRef, validateRef, labelRef } from './valueRef.js';

/**
 * CONDITIONAL VISIBILITY — show a follow-up only when it applies.
 *
 * ── WHY IT IS A Ref AND A COMPARISON, NOTHING MORE ────────────────────────
 *
 *   { ref: Ref, operator: 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'answered', value }
 *
 * The model this replaces declared `dependsOn` as `{ questionIndex, operator,
 * value }` — a *position*, which is the same failure that made its scoring
 * rules wrong when a question was inserted. It also never held a single
 * instance: the field was declared and unused across every stored template.
 *
 * On the shared `Ref` type it costs almost nothing. The picker that chooses a
 * formula's input chooses this too, `validateRef` already reports a condition
 * aimed at a deleted option, and the dependency graph already knows how to
 * order things — a follow-up whose visibility depends on a calculated cell
 * settles in the right order for free.
 *
 * ── A HIDDEN FOLLOW-UP IS NOT AN UNANSWERED ONE ───────────────────────────
 *
 * That distinction is the whole reason this is careful. "You did not answer
 * question 4" and "question 4 did not apply to you" are different statements,
 * and a scorecard that confuses them penalises a respondent for a question they
 * were never shown.
 */

export const OPERATORS = [
  { value: 'answered', label: 'has been answered', needsValue: false },
  { value: 'eq', label: 'is', needsValue: true },
  { value: 'neq', label: 'is not', needsValue: true },
  { value: 'gt', label: 'is more than', needsValue: true },
  { value: 'lt', label: 'is less than', needsValue: true },
  { value: 'in', label: 'is one of', needsValue: true, hint: 'comma-separated' },
];

const OPERATOR_IDS = OPERATORS.map((o) => o.value);

export const emptyCondition = () => ({ ref: null, operator: 'answered', value: '' });

/**
 * Should this be shown?
 *
 * No condition means always. An unresolvable one means hidden — a follow-up
 * whose trigger cannot be read has not been triggered, and showing it would ask
 * for work on the strength of a value nobody could find.
 */
export function isVisible(condition, ctx, catalog) {
  if (!condition || !condition.ref) return true;

  const out = resolveRef(condition.ref, ctx, catalog);
  const operator = condition.operator || 'answered';

  if (operator === 'answered') return !out.missing;
  if (out.missing) return false;

  const actual = out.value;
  const expected = condition.value;

  switch (operator) {
    case 'eq':
      // Compared as text: an option's label and a typed number both arrive as
      // strings, and `'5' === 5` failing is not a distinction an author made.
      return String(actual).trim().toLowerCase() === String(expected).trim().toLowerCase();

    case 'neq':
      return String(actual).trim().toLowerCase() !== String(expected).trim().toLowerCase();

    case 'gt':
    case 'lt': {
      const a = Number(actual);
      const b = Number(expected);
      // Not a comparison that means anything on text; treat it as not met
      // rather than letting NaN decide.
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      return operator === 'gt' ? a > b : a < b;
    }

    case 'in':
      return String(expected).split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
        .includes(String(actual).trim().toLowerCase());

    default:
      return true;
  }
}

/** Plain English, for the authoring screen and for a trace. */
export function describeCondition(condition, catalog) {
  if (!condition?.ref) return 'Always shown';

  const operator = OPERATORS.find((o) => o.value === (condition.operator || 'answered'));
  const name = labelRef(condition.ref, catalog);

  return operator?.needsValue
    ? `Shown when ${name} ${operator.label} “${condition.value}”`
    : `Shown when ${name} ${operator?.label || 'is set'}`;
}

export function validateCondition(condition, catalog) {
  if (!condition || !condition.ref) return [];

  const errors = validateRef(condition.ref, catalog);

  const operator = condition.operator || 'answered';
  if (!OPERATOR_IDS.includes(operator)) errors.push(`Unknown condition “${operator}”`);

  const spec = OPERATORS.find((o) => o.value === operator);
  if (spec?.needsValue && String(condition.value ?? '').trim() === '') {
    errors.push(`“${spec.label}” needs a value to compare against`);
  }

  if ((operator === 'gt' || operator === 'lt') && !Number.isFinite(Number(condition.value))) {
    errors.push(`“${spec.label}” needs a number`);
  }

  return errors;
}

/** What a condition reads — so the dependency graph can order around it. */
export const conditionRefs = (condition) => (condition?.ref ? [condition.ref] : []);

/**
 * Which sub-answers a respondent is actually being shown.
 *
 * Used by the renderer to decide what to draw, and by the completeness check to
 * decide what to require — the same function, because those two answering
 * differently is exactly how a hidden question ends up counted as unanswered.
 */
export function visibleSubAnswers(subAnswers, ctx, catalog) {
  return (subAnswers || []).filter((sub) => isVisible(sub.dependsOn, ctx, catalog));
}
