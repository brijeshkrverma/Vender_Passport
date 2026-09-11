import { describe, it, expect } from 'vitest';

import {
  formulaToText, evaluateExpression, evaluateFormulas,
  validateFormulas, computedRefKeys,
} from '../../frontend-react/src/features/questionnaire/services/gridFormula.js';
import {
  validateTrendRule, evaluateTrendRule, defaultBands,
} from '../../frontend-react/src/features/questionnaire/services/trendRule.js';
import {
  cellRef, inputRef, questionRef, constRef, resolveNumber,
} from '../../frontend-react/src/features/questionnaire/services/valueRef.js';

/**
 * A formula's expression is `(Ref | {op})[]` — the same references the mark
 * engines and the trend rule use.
 *
 * Three private token shapes went away with that change: `{cell:{row,col}}`,
 * `{sub:{index}}` and `{num}` — plus a `targetQuestion` field that existed only
 * because a result landing in another question could not otherwise be
 * expressed. These tests pin the behaviour that survived the change, and the
 * capabilities that only became possible after it.
 */

const CATALOG = {
  answers: [{
    key: 'a1',
    label: 'Data',
    subs: [
      { key: 'g1', label: 'Table', type: 'Grid', config: { rows: [{}, {}, {}], columns: [{}, {}, {}] } },
      { key: 's1', label: 'Consent to operate', type: 'Text', inputMode: 'numeric' },
    ],
  }],
  questions: [{ id: 'q-other', label: 'Renewable sources' }],
};

/** One respondent's answers, in the shape the resolver reads. */
const ctxOf = ({ r1c1, r2c1, s1 } = {}) => ({
  self: {},
  questions: {},
  answers: {
    a1: {
      selected: true,
      subs: {
        g1: { grid: [{}, { 11: { val: r1c1 } }, { 21: { val: r2c1 } }] },
        s1: { value: s1 },
      },
    },
  },
});

/** `(R2C1 / R1C1) * 100` */
const PERCENT = [
  { op: '(' }, cellRef('a1', 'g1', 2, 1), { op: '/' },
  cellRef('a1', 'g1', 1, 1), { op: ')' }, { op: '*' }, constRef(100),
];

describe('grid formulas', () => {
  it('renders using the same labels the picker shows', () => {
    // This used to read "R3C1 = ( R2C1 / R1C1 ) * 100" — coordinates only. A
    // Ref knows what it points at, so the text can say so.
    expect(formulaToText({ target: cellRef('a1', 'g1', 3, 1), expr: PERCENT }, CATALOG))
      .toBe('Table R3C1 = ( Table R2C1 / Table R1C1 ) * 100');
  });

  it('evaluates without eval, honouring precedence and brackets', () => {
    const ctx = ctxOf({ r1c1: 50, r2c1: 20 });
    const read = (ref) => resolveNumber(ref, ctx, CATALOG);

    expect(evaluateExpression(PERCENT, read)).toBe(40);
    expect(evaluateExpression(
      [cellRef('a1', 'g1', 1, 1), { op: '+' }, cellRef('a1', 'g1', 2, 1), { op: '*' }, constRef(2)],
      read
    )).toBe(90);
  });

  it('reads a sibling input that lives outside the grid', () => {
    // "Water utilisation %" divides a grid row by "Consent to operate (KL)",
    // which is a checkbox input, not a cell. That needed its own token kind
    // before; now it is an ordinary reference.
    const ctx = ctxOf({ r2c1: 50, s1: '200' });
    expect(evaluateExpression(
      [cellRef('a1', 'g1', 2, 1), { op: '/' }, inputRef('a1', 's1'), { op: '*' }, constRef(100)],
      (ref) => resolveNumber(ref, ctx, CATALOG)
    )).toBe(25);
  });

  it('leaves the target empty rather than writing 0 when a divisor is missing', () => {
    // A half-filled grid is the normal state while the respondent works. A
    // confident 0 in a percentage cell reads as a real answer; empty does not.
    const ctx = ctxOf({ r1c1: 0, r2c1: 10 });
    expect(evaluateExpression(PERCENT, (ref) => resolveNumber(ref, ctx, CATALOG))).toBeNull();
  });

  it('writes the result where the target names, without mutating the input', () => {
    const ctx = ctxOf({ r1c1: 80, r2c1: 20 });
    const out = evaluateFormulas(ctx, [{ target: cellRef('a1', 'g1', 3, 1), expr: PERCENT }], CATALOG);

    expect(out.results[0].value).toBe(25);
    expect(resolveNumber(cellRef('a1', 'g1', 3, 1), out.ctx, CATALOG)).toBe(25);
    expect(ctx.answers.a1.subs.g1.grid[3]).toBeUndefined();
  });

  it('sends a result to another question with no special case for it', () => {
    // This was a `targetQuestion` field of its own, sitting beside `target`.
    // It is now just a target that happens to be a questionRef.
    const out = evaluateFormulas(
      ctxOf({ r1c1: 5 }),
      [{
        target: questionRef('q-other', 'mark'),
        expr: [cellRef('a1', 'g1', 1, 1), { op: '*' }, constRef(2)],
      }],
      CATALOG
    );
    expect(out.results[0].value).toBe(10);
    expect(out.ctx.questions['q-other'].mark).toBe('10');
  });

  it('lets one formula consume another’s result', () => {
    const out = evaluateFormulas(
      ctxOf({ r1c1: 10, r2c1: 4 }),
      [
        { target: cellRef('a1', 'g1', 3, 1), expr: [cellRef('a1', 'g1', 1, 1), { op: '+' }, cellRef('a1', 'g1', 2, 1)] },
        { target: questionRef('q-other', 'mark'), expr: [cellRef('a1', 'g1', 3, 1), { op: '*' }, constRef(10)] },
      ],
      CATALOG
    );
    expect(out.results.map((r) => r.value)).toEqual([14, 140]);
  });

  it('marks formula-driven values as computed so they become read-only', () => {
    expect(computedRefKeys([{ target: cellRef('a1', 'g1', 3, 1), expr: [] }]))
      .toEqual(['cell:a1/g1/3,1']);
  });
});

describe('formula validation', () => {
  const ok = [{ target: cellRef('a1', 'g1', 3, 1), expr: [cellRef('a1', 'g1', 1, 1)] }];

  it('accepts a well-formed formula', () => {
    expect(validateFormulas(ok, CATALOG)).toEqual([]);
  });

  it('rejects a reference outside the table', () => {
    // The previous engine read a missing cell as 0 and carried on, so a formula
    // pointing past the end produced a plausible wrong number and said nothing.
    expect(validateFormulas(
      [{ target: cellRef('a1', 'g1', 3, 1), expr: [cellRef('a1', 'g1', 9, 9)] }], CATALOG
    ).join(' ')).toMatch(/outside “Table”/);
  });

  it('rejects a value calculated from itself', () => {
    expect(validateFormulas(
      [{ target: cellRef('a1', 'g1', 3, 1), expr: [cellRef('a1', 'g1', 3, 1)] }], CATALOG
    ).join(' ')).toMatch(/cannot be calculated from itself/);
  });

  it('rejects two formulas writing the same value', () => {
    expect(validateFormulas(ok.concat(ok), CATALOG).join(' ')).toMatch(/already has a formula/);
  });

  it('rejects a target nothing can be written to', () => {
    // A constant is not a place. Before Refs the target was always a cell, so
    // this could not be expressed — or checked.
    expect(validateFormulas(
      [{ target: constRef(5), expr: [cellRef('a1', 'g1', 1, 1)] }], CATALOG
    ).join(' ')).toMatch(/cannot write to/);
  });

  it('rejects a dangling operator and two adjacent values', () => {
    expect(validateFormulas(
      [{ target: cellRef('a1', 'g1', 3, 1), expr: [cellRef('a1', 'g1', 1, 1), { op: '+' }] }], CATALOG
    ).join(' ')).toMatch(/ends on an operator/);

    expect(validateFormulas(
      [{ target: cellRef('a1', 'g1', 3, 1), expr: [constRef(1), constRef(2)] }], CATALOG
    ).join(' ')).toMatch(/an operator is missing/);
  });

  it('rejects unbalanced brackets', () => {
    expect(validateFormulas(
      [{ target: cellRef('a1', 'g1', 3, 1), expr: [{ op: '(' }, cellRef('a1', 'g1', 1, 1)] }], CATALOG
    ).join(' ')).toMatch(/brackets are unbalanced/);
  });
});

/* ── trend rule ─────────────────────────────────────────────────────────── */

/**
 * `numerator` and `denominator` are Ref lists, one entry per year.
 *
 * They used to be `{ row, cols[] }` on one side and
 * `{ questionId, optionIndex, subIndex, row, cols[] }` on the other, with a
 * hand-written rule that their year counts had to match.
 */
describe('trend rule — evaluation', () => {
  const CAT = {
    answers: [
      { key: 'a1', label: 'Emissions', subs: [{ key: 'g1', label: 'Emissions grid', type: 'Grid', config: { rows: [{}], columns: [{}, {}] } }] },
      { key: 'rev', label: 'Revenue', subs: [{ key: 'rg', label: 'Revenue grid', type: 'Grid', config: { rows: [{}], columns: [{}, {}] } }] },
    ],
    questions: [],
  };

  const numerator = [cellRef('a1', 'g1', 1, 1), cellRef('a1', 'g1', 1, 2)];
  const denominator = [cellRef('rev', 'rg', 1, 1), cellRef('rev', 'rg', 1, 2)];

  const ctx = (n, d) => ({
    self: {}, questions: {},
    answers: {
      a1: { selected: true, subs: { g1: { grid: [{}, { 11: { val: n[0] }, 12: { val: n[1] } }] } } },
      rev: { selected: true, subs: { rg: { grid: [{}, { 11: { val: d[0] }, 12: { val: d[1] } }] } } },
    },
  });

  const rule = (over = {}) => ({
    numerator, denominator,
    bands: defaultBands(['Decreasing', 'Flat', 'Increasing']),
    allowOverride: false, ...over,
  });

  it('works out intensity per year and the change between first and last', () => {
    const out = evaluateTrendRule(rule(), ctx(['100', '90'], ['10', '10']), CAT);

    expect(out.intensities.map((i) => i.value)).toEqual([10, 9]);
    expect(out.pctChange).toBeCloseTo(-10);
    expect(out.option).toBe('Decreasing');
    expect(out.marks).toBe(20);
    expect(out.skipped).toBe(false);
  });

  it('treats an intensity of zero as a real result, not as missing data', () => {
    // The original wrote `if (intensityY1 || intensityY2)`, so the best possible
    // result — zero emissions — was read as "no data" and scored nothing.
    const out = evaluateTrendRule(rule(), ctx(['100', '0'], ['10', '10']), CAT);
    expect(out.skipped).toBe(false);
    expect(out.pctChange).toBe(-100);
    expect(out.option).toBe('Decreasing');
  });

  it('skips rather than borrowing another year when one is empty', () => {
    // The original wrote `cell(col12) || cell(col13)`, so an empty year quietly
    // used the next one and the comparison changed which years it was about.
    const out = evaluateTrendRule(rule(), ctx(['', '90'], ['10', '10']), CAT);
    expect(out.skipped).toBe(true);
    expect(out.marks).toBeNull();
    expect(out.warnings.join(' ')).toMatch(/numerator is empty/);
  });

  it('does not divide by a zero denominator', () => {
    const out = evaluateTrendRule(rule(), ctx(['100', '90'], ['0', '10']), CAT);
    expect(out.skipped).toBe(true);
    expect(out.warnings.join(' ')).toMatch(/denominator is zero/);
  });

  it('reports when no band covers the result', () => {
    const out = evaluateTrendRule(
      rule({ bands: [{ from: 50, to: 60, option: 'x', marks: 1 }] }),
      ctx(['100', '90'], ['10', '10']), CAT);
    expect(out.option).toBeNull();
    expect(out.warnings.join(' ')).toMatch(/No band covers this result/);
  });

  it('labels each year by what it reads, so the working can be checked', () => {
    const out = evaluateTrendRule(rule(), ctx(['100', '90'], ['10', '10']), CAT);
    expect(out.intensities[0].label).toBe('Emissions grid R1C1');
  });

  it('can compare values that are not grid cells at all', () => {
    // The numerator had to be a row of this grid. Any reference works now.
    const catalog = {
      answers: [{
        key: 'a1', label: 'Q', subs: [
          { key: 'y1', label: 'FY22', type: 'Text', inputMode: 'numeric' },
          { key: 'y2', label: 'FY23', type: 'Text', inputMode: 'numeric' },
        ],
      }],
      questions: [],
    };
    const out = evaluateTrendRule(
      {
        numerator: [inputRef('a1', 'y1'), inputRef('a1', 'y2')],
        denominator: [constRef(10), constRef(10)],
        bands: defaultBands(['Down', 'Flat', 'Up']),
      },
      { self: {}, questions: {}, answers: { a1: { selected: true, subs: { y1: { value: '100' }, y2: { value: '90' } } } } },
      catalog
    );
    expect(out.pctChange).toBeCloseTo(-10);
    expect(out.option).toBe('Down');
  });
});

describe('trend rule — shape validation', () => {
  const CAT = {
    answers: [{ key: 'a1', label: 'E', subs: [{ key: 'g1', label: 'G', type: 'Grid', config: { rows: [{}], columns: [{}, {}] } }] }],
    questions: [],
  };
  const two = [cellRef('a1', 'g1', 1, 1), cellRef('a1', 'g1', 1, 2)];
  const valid = { numerator: two, denominator: two, bands: defaultBands(['a', 'b', 'c']) };

  it('accepts a complete rule', () => {
    expect(validateTrendRule(valid, CAT)).toEqual([]);
  });

  it('needs at least two years on each side', () => {
    expect(validateTrendRule({ ...valid, numerator: [two[0]] }, CAT).join(' '))
      .toMatch(/at least two years/);
  });

  it('rejects mismatched year counts — the two sides are paired in order', () => {
    // A hand-written rule about `cols` on two different shapes; now a length
    // comparison between two lists of the same kind of thing.
    expect(validateTrendRule({ ...valid, denominator: [...two, two[0]] }, CAT).join(' '))
      .toMatch(/different number of years \(2 vs 3\)/);
  });

  it('reports a year pointing at something that no longer exists', () => {
    expect(validateTrendRule(
      { ...valid, numerator: [cellRef('a1', 'gone', 1, 1), two[1]] }, CAT
    ).join(' ')).toMatch(/Numerator year 1: .*no longer exists/);
  });
});
