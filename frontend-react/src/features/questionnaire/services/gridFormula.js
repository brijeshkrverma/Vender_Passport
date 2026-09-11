/**
 * GRID FORMULA ENGINE — admin-configurable cell calculations.
 *
 * WHAT IT DOES
 *   One cell's value is derived from other values:
 *     R4C4 = R1C1 + R2C4          R3C1 = R2C1 / R1C1 * 100
 *
 * WHY IT EXISTS
 *   This behaviour already shipped — as hardcoded branches keyed on a
 *   question's *position* in the list:
 *
 *     if (i == 9 && category == 'Decarbonization') {
 *       const a = question10[6]['64'].val;
 *       const b = question10[7]['74'].val;
 *       patchValue(((a / b) * 100).toFixed(2));
 *     }
 *
 *   Insert one question earlier and it reads the wrong cells. There were 37
 *   such references.
 *
 * ── EXPRESSIONS ARE Refs AND OPERATORS, NOTHING ELSE ──────────────────────
 *
 *   expr: (Ref | { op })[]
 *
 * This engine used to carry three token shapes of its own — `{cell:{row,col}}`,
 * `{sub:{index}}`, `{num}` — plus a separate `targetQuestion` field for the
 * case where the result belonged to a different question. Each was a private
 * way of saying "this value, from there", and none of them could be compared
 * with how the mark engines or the trend rule said the same thing.
 *
 * On the shared `Ref` type all of that collapses:
 *
 *   {cell:{row,col}}  ->  cellRef(answerKey, subKey, row, col)
 *   {sub:{index}}     ->  inputRef(answerKey, subKey)
 *   {num: 100}        ->  constRef(100)
 *   targetQuestion    ->  a target that happens to be a questionRef
 *
 * The cross-question case stops being a special case, one picker serves every
 * mechanism, and a cycle spanning a formula and a mark rule becomes detectable
 * — which it could not be while each described its inputs differently.
 *
 * NOT THE SAME LAYER AS SCORING
 *   This produces the value the respondent *sees* (auto-filled, read-only).
 *   Marks are a separate pass. They compose: the formula fills a cell, the
 *   marking scheme then reads the filled cell.
 *
 * NOTHING STORED IS EXECUTABLE
 *   Refs and a closed set of operators. No expression strings, no `eval`.
 */

import {
  refKey, labelRef, validateRef, resolveNumber, writeRef, isWritable, REF_KINDS,
} from './valueRef.js';

const OPS = ['+', '-', '*', '/'];
const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 };

const isRef = (t) => !!t && typeof t.kind === 'string' && REF_KINDS.includes(t.kind);
const isOp = (t) => !!t && typeof t.op === 'string';

/* ── Text rendering ────────────────────────────────────────────────────── */

export function tokenText(token, catalog) {
  if (isOp(token)) return token.op;
  if (isRef(token)) return token.kind === 'const' ? String(token.value) : labelRef(token, catalog);
  return '?';
}

/** `Water % = Consumed / Total * 100` — readable, because every Ref has a label. */
export function formulaToText(formula, catalog) {
  if (!formula?.target) return '';
  const rhs = (formula.expr || []).map((t) => tokenText(t, catalog)).join(' ');
  return `${labelRef(formula.target, catalog)} = ${rhs}`;
}

/* ── Evaluation ────────────────────────────────────────────────────────── */

/**
 * Shunting-yard, infix -> RPN, with standard maths precedence (`*` and `/`
 * first) rather than calculator left-to-right: an author writing `a + b * c`
 * expects what a spreadsheet would do.
 */
function toRPN(tokens) {
  const out = [];
  const ops = [];
  for (const t of tokens) {
    if (isOp(t) && t.op === '(') ops.push(t);
    else if (isOp(t) && t.op === ')') {
      while (ops.length && ops[ops.length - 1].op !== '(') out.push(ops.pop());
      ops.pop();
    } else if (isOp(t)) {
      while (
        ops.length && ops[ops.length - 1].op !== '('
        && PRECEDENCE[ops[ops.length - 1].op] >= PRECEDENCE[t.op]
      ) out.push(ops.pop());
      ops.push(t);
    } else out.push(t);
  }
  while (ops.length) out.push(ops.pop());
  return out;
}

/**
 * Evaluate RPN.
 *
 * A missing value yields `null` and propagates, rather than being read as 0.
 * A half-filled grid is the normal state while the respondent works through it,
 * and writing a confident `0` into a percentage cell reads as a real answer.
 * Division by zero is the same case for the same reason.
 */
function evalRPN(rpn, read) {
  const stack = [];
  for (const t of rpn) {
    if (isOp(t)) {
      const b = stack.pop();
      const a = stack.pop();
      if (a === null || b === null || a === undefined || b === undefined) { stack.push(null); continue; }
      if (t.op === '+') stack.push(a + b);
      else if (t.op === '-') stack.push(a - b);
      else if (t.op === '*') stack.push(a * b);
      else if (t.op === '/') stack.push(b === 0 ? null : a / b);
      else stack.push(null);
    } else if (isRef(t)) {
      stack.push(read(t));
    } else stack.push(null);
  }
  return stack.length === 1 ? stack[0] : null;
}

export function evaluateExpression(expr, read) {
  if (!expr || !expr.length) return null;
  return evalRPN(toRPN(expr), read);
}

/** Identity of every cell a formula writes — those are read-only for the respondent. */
export function computedRefKeys(formulas) {
  return (formulas || []).filter((f) => f.target).map((f) => refKey(f.target));
}

/**
 * Run every formula against one respondent's answers and return the updated
 * context.
 *
 * Formulas are applied in order and each reads the context as it stands, so one
 * formula can consume another's result. `validateFormulas` reports a cycle up
 * front rather than letting evaluation loop.
 */
export function evaluateFormulas(refCtx, formulas, catalog) {
  let ctx = refCtx || {};
  const warnings = [];
  const results = [];

  (formulas || []).forEach((f) => {
    const value = evaluateExpression(f.expr, (ref) => resolveNumber(ref, ctx, catalog));
    const label = labelRef(f.target, catalog);

    if (value === null) {
      warnings.push(`${label} could not be calculated yet`);
      results.push({ target: f.target, value: null });
      return;
    }

    const rounded = Math.round(value * 100) / 100;
    results.push({ target: f.target, value: rounded });

    const out = writeRef(ctx, f.target, String(rounded));
    if (!out.written) warnings.push(`${label} is not somewhere a formula can write to`);
    ctx = out.ctx;
  });

  return { ctx, warnings, results };
}

/* ── Validation ────────────────────────────────────────────────────────── */

/**
 * Structural checks, run before saving.
 *
 * The out-of-range case matters more than it looks: the previous engine read a
 * missing cell as `0` and carried on, so a formula pointing past the end of a
 * table produced a plausible wrong number and said nothing. A Ref cannot be out
 * of range without `validateRef` saying so.
 */
export function validateFormulas(formulas, catalog) {
  const errors = [];
  const targets = new Set();

  (formulas || []).forEach((f, i) => {
    const name = formulaToText(f, catalog) || `Formula ${i + 1}`;

    if (!f.target) { errors.push(`${name}: no target chosen`); return; }

    if (!isWritable(f.target)) {
      errors.push(`${name}: a formula cannot write to ${labelRef(f.target, catalog)}`);
    }
    validateRef(f.target, catalog).forEach((m) => errors.push(`${name}: ${m}`));

    const key = refKey(f.target);
    if (targets.has(key)) errors.push(`${labelRef(f.target, catalog)} already has a formula`);
    targets.add(key);

    // A cell that feeds itself never settles on a value.
    if ((f.expr || []).some((t) => isRef(t) && refKey(t) === key)) {
      errors.push(`${name}: a value cannot be calculated from itself`);
    }

    const expr = f.expr || [];
    if (!expr.length) { errors.push(`${name}: the formula is empty`); return; }

    let depth = 0;
    let expectsValue = true;

    expr.forEach((t) => {
      if (isOp(t) && t.op === '(') { depth += 1; return; }
      if (isOp(t) && t.op === ')') { depth -= 1; return; }

      if (isOp(t)) {
        if (expectsValue) errors.push(`${name}: '${t.op}' needs a value before it`);
        expectsValue = true;
        return;
      }

      if (!expectsValue) errors.push(`${name}: two values in a row — an operator is missing`);
      expectsValue = false;

      validateRef(t, catalog).forEach((m) => errors.push(`${name}: ${m}`));
    });

    if (depth !== 0) errors.push(`${name}: brackets are unbalanced`);
    if (expectsValue) errors.push(`${name}: the formula ends on an operator`);
  });

  return [...new Set(errors)];
}

/** Every value the formulas read — for the dependency graph. */
export function formulaDependencies(formulas) {
  return (formulas || []).flatMap((f) => (f.expr || []).filter(isRef));
}

export { OPS, isRef, isOp };
