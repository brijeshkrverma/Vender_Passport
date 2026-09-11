import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  ENGINE_IDS, evaluateRule, validateRule, describeRule, ruleDependencies,
} from '../../frontend-react/src/features/questionnaire/services/markEngines.js';
import {
  inputRef, optionRef, cellRef, selfRef, constRef, questionRef,
  refKey, sameRef, labelRef, validateRef, resolveRef,
  areaToRefs, areaSize, collectRefs, orderRules,
} from '../../frontend-react/src/features/questionnaire/services/valueRef.js';
import { ENGINE_IDS as BACKEND_ENGINE_IDS } from '../../backend/scoring/engines.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* ── shared fixtures ───────────────────────────────────────────────────── */

/** One question: two numeric inputs and a 3×3 grid, all addressed by key. */
const CATALOG = {
  answers: [{
    key: 'a1',
    label: 'Information available',
    score: 100,
    subs: [
      { key: 's1', label: 'Male', type: 'Text', inputMode: 'numeric' },
      { key: 's2', label: 'Female', type: 'Text', inputMode: 'numeric' },
      {
        key: 'g1', label: 'Data grid', type: 'Grid',
        // A type's configuration, whatever the type. Grid's happens to be a table.
        config: { rows: [{}, {}, {}], columns: [{}, {}, {}] },
      },
    ],
  }],
  questions: [{ id: 'q-other', label: 'Revenue' }],
  maxMark: 100,
};

/** A stored grid row array: `[header, ...dataRows]`, cells keyed `${row}${col}`. */
const gridRows = (labelCell, ...vals) => ([
  { '00': 'Metric', '01': { val: 'FY22' }, '02': { val: 'FY23' }, '03': { val: 'FY24' } },
  {
    10: { val: labelCell }, 11: { val: vals[0] ?? '' },
    12: { val: vals[1] ?? '' }, 13: { val: vals[2] ?? '' },
  },
]);

const ctx = ({ s1, s2, grid, maxMark = 100, questions } = {}) => ({
  catalog: CATALOG,
  maxMark,
  refCtx: {
    self: { maxMark },
    questions: questions || {},
    answers: {
      a1: {
        selected: true,
        score: 100,
        subs: { s1: { value: s1 }, s2: { value: s2 }, g1: { grid } },
      },
    },
  },
});

/* ── value references ──────────────────────────────────────────────────── */

/**
 * A Ref names a value by stable key rather than by position. The system this
 * replaces keyed its rules on a question's position (`if (i == 9)`), so
 * inserting one question earlier made 37 references wrong with nothing to
 * report it. These tests pin the properties that prevent the same class of bug.
 */
describe('value references', () => {
  it('gives every reference a stable identity', () => {
    expect(refKey(inputRef('a1', 's1'))).toBe('input:a1/s1');
    expect(sameRef(inputRef('a1', 's1'), inputRef('a1', 's1'))).toBe(true);
    expect(sameRef(inputRef('a1', 's1'), inputRef('a1', 's2'))).toBe(false);
  });

  it('is unaffected by reordering, because it names a key not a position', () => {
    const swapped = { ...CATALOG, answers: [...CATALOG.answers].reverse() };
    expect(labelRef(inputRef('a1', 's1'), swapped)).toBe('Information available → Male');
  });

  it('reports a reference whose target was deleted', () => {
    expect(validateRef(inputRef('a1', 'gone'), CATALOG))
      .toContain('The sub-answer this points at no longer exists');
    expect(validateRef(inputRef('gone', 's1'), CATALOG))
      .toContain('The option this points at no longer exists');
  });

  it('rejects a cell reference outside the grid', () => {
    // Coordinates address the stored grid, so R0/C0 are the header and label
    // lanes — a 3×3 editor grid allows R0..R3 and C0..C3.
    expect(validateRef(cellRef('a1', 'g1', 3, 3), CATALOG)).toEqual([]);
    expect(validateRef(cellRef('a1', 'g1', 9, 1), CATALOG).join(' ')).toMatch(/outside “Data grid”/);
  });

  it('rejects a cell reference to something that is not a grid', () => {
    expect(validateRef(cellRef('a1', 's1', 1, 1), CATALOG).join(' ')).toMatch(/is not a grid/);
  });

  it('resolves a missing value to null, never to zero', () => {
    // A half-filled questionnaire is the normal state while someone works
    // through it. A confident 0 reads as a real answer; null does not.
    const out = resolveRef(inputRef('a1', 's1'), ctx({ s1: '' }).refCtx, CATALOG);
    expect(out.missing).toBe(true);
    expect(out.value).toBeNull();
  });

  it('treats an unselected option as a real zero, not as missing', () => {
    const refCtx = { answers: { a1: { selected: false, score: 100, subs: {} } } };
    const out = resolveRef(optionRef('a1', 'score'), refCtx, CATALOG);
    expect(out.missing).toBe(false);
    expect(out.value).toBe(0);
  });

  it('finds references at any depth in a config object', () => {
    const config = { a: constRef(1), b: { c: [inputRef('a1', 's1'), { d: selfRef('maxMark') }] } };
    expect(collectRefs(config).map(refKey))
      .toEqual(['const:1', 'input:a1/s1', 'self:maxMark']);
  });
});

describe('areas', () => {
  const area = { answerKey: 'a1', subKey: 'g1', rows: [1, 2], cols: [1, 2, 3] };

  it('expands to the same cell references the dependency graph sees', () => {
    // An area is authoring sugar for a rectangle; everything downstream deals
    // in Refs, so there is one notion of "which cells does this rule touch".
    expect(areaSize(area)).toBe(6);
    expect(areaToRefs(area).map(refKey)).toContain('cell:a1/g1/2,3');
  });
});

/**
 * Cross-question rules make a dependency graph, and a cycle in it never
 * settles. Detecting one is only possible because all three mechanisms name
 * values the same way — a cycle running formula → mark → trend → formula is
 * invisible if each describes its inputs differently.
 */
describe('rule ordering', () => {
  it('runs a rule after whatever it reads', () => {
    const { order, cycles } = orderRules([
      { id: 'B', reads: [cellRef('a1', 'g1', 1, 1)], writes: selfRef('mark') },
      { id: 'A', reads: [inputRef('a1', 's1')], writes: cellRef('a1', 'g1', 1, 1) },
    ]);
    expect(cycles).toEqual([]);
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
  });

  it('reports a cycle instead of looping', () => {
    const { cycles } = orderRules([
      { id: 'A', reads: [cellRef('a1', 'g1', 2, 2)], writes: cellRef('a1', 'g1', 1, 1) },
      { id: 'B', reads: [cellRef('a1', 'g1', 1, 1)], writes: cellRef('a1', 'g1', 2, 2) },
    ]);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('reports a rule that reads its own output', () => {
    const { cycles } = orderRules([
      { id: 'A', reads: [cellRef('a1', 'g1', 1, 1)], writes: cellRef('a1', 'g1', 1, 1) },
    ]);
    expect(cycles).toContainEqual(['A', 'A']);
  });
});

/* ── engine dispatch ───────────────────────────────────────────────────── */

describe('rule dispatch', () => {
  it('returns null when no rule applies, which is not the same as scoring zero', () => {
    expect(evaluateRule(null)).toBeNull();
    expect(evaluateRule({})).toBeNull();
    expect(evaluateRule({ engine: 'fixed', config: { marks: 0 } }).marks).toBe(0);
  });

  it('scores zero and warns on an unknown engine rather than throwing', () => {
    const out = evaluateRule({ engine: 'nonsense', config: {} });
    expect(out.marks).toBe(0);
    expect(out.warnings[0]).toMatch(/Unknown engine/);
  });

  it('refuses to run a rule whose config is invalid', () => {
    const out = evaluateRule({ engine: 'fixed', config: {} });
    expect(out.marks).toBe(0);
    expect(out.warnings[0]).toMatch(/config is invalid/);
  });

  it('refuses to run a rule pointing at a field that no longer exists', () => {
    // Before Refs this was a parsed string, so a renamed field kept "working"
    // and only a wrong score revealed it.
    const out = evaluateRule(
      { engine: 'passthrough', config: { input: inputRef('a1', 'gone') } },
      ctx({ s1: '10' })
    );
    expect(out.marks).toBe(0);
    expect(out.warnings[0]).toMatch(/no longer exists/);
  });

  it('caps a rule at the question’s own maximum and says so', () => {
    const out = evaluateRule({ engine: 'fixed', config: { marks: 500 } }, { maxMark: 100 });
    expect(out.marks).toBe(100);
    expect(out.warnings[0]).toMatch(/above this question's 100/);
  });

  it('clamps a negative result to zero', () => {
    const out = evaluateRule(
      { engine: 'passthrough', config: { input: inputRef('a1', 's1') } },
      ctx({ s1: '-20' })
    );
    expect(out.marks).toBe(0);
    expect(out.warnings[0]).toMatch(/negative/);
  });

  it('always returns a trace, because a disputed score has to be explainable', () => {
    const out = evaluateRule({ engine: 'fixed', config: { marks: 40 } });
    expect(out.trace).toHaveLength(1);
    expect(out.trace[0]).toMatchObject({ engine: 'fixed', marks: 40 });
  });

  it('lists what a rule depends on, whichever engine it uses', () => {
    const deps = ruleDependencies({
      engine: 'gridCompleteness',
      config: { area: { answerKey: 'a1', subKey: 'g1', rows: [1], cols: [1, 2] }, marks: 10 },
    });
    expect(deps.map(refKey)).toEqual(['cell:a1/g1/1,1', 'cell:a1/g1/1,2']);
  });
});

/* ── individual engines ────────────────────────────────────────────────── */

describe('engine: fixed', () => {
  it('always returns the configured number', () => {
    expect(evaluateRule({ engine: 'fixed', config: { marks: 40 } }).marks).toBe(40);
  });

  it('rejects a missing or negative value', () => {
    expect(validateRule({ engine: 'fixed', config: {} })).toContain('Marks is required');
    expect(validateRule({ engine: 'fixed', config: { marks: -1 } })).toContain('Marks cannot be negative');
  });
});

describe('engine: passthrough', () => {
  const rule = (config) => ({ engine: 'passthrough', config: { input: inputRef('a1', 's1'), ...config } });

  it('turns the respondent’s number into the mark', () => {
    expect(evaluateRule(rule(), ctx({ s1: '35' })).marks).toBe(35);
  });

  it('applies a floor and a cap', () => {
    expect(evaluateRule(rule({ min: 10, max: 50 }), ctx({ s1: '5' })).marks).toBe(10);
    expect(evaluateRule(rule({ min: 10, max: 50 }), ctx({ s1: '80' })).marks).toBe(50);
  });

  it('reads an empty input as zero without failing', () => {
    const out = evaluateRule(rule(), ctx({ s1: '' }));
    expect(out.marks).toBe(0);
    expect(out.trace[0].detail).toMatch(/\(empty\)/);
  });

  it('names the input in the trace rather than showing a path', () => {
    expect(evaluateRule(rule(), ctx({ s1: '35' })).trace[0].detail)
      .toMatch(/Information available → Male = 35/);
  });

  it('rejects a floor above the cap', () => {
    expect(validateRule(rule({ min: 90, max: 10 }), CATALOG)).toContain('Floor cannot be above the cap');
  });

  it('can read another question’s mark', () => {
    // Cross-question needed no new mechanism — it is just another Ref kind.
    const out = evaluateRule(
      { engine: 'passthrough', config: { input: questionRef('q-other', 'mark') } },
      ctx({ questions: { 'q-other': { mark: 42 } } })
    );
    expect(out.marks).toBe(42);
  });
});

describe('engine: numericBand', () => {
  /** The stored rule for question 682d863f: two inputs, three bands, summed. */
  const rule = {
    engine: 'numericBand',
    config: {
      inputs: [inputRef('a1', 's1'), inputRef('a1', 's2')],
      bands: [
        { min: 1, max: 15, marks: 50 },
        { min: 16, max: 20, marks: 25 },
        { min: 21, max: 30, marks: 15 },
      ],
      aggregate: 'sum',
    },
  };

  it('bands each input separately and sums the results', () => {
    // The exact arithmetic of the branch it replaces: 50 + 25.
    expect(evaluateRule(rule, ctx({ s1: '12', s2: '18' })).marks).toBe(75);
  });

  it('scores an out-of-range input as zero and says which one', () => {
    const out = evaluateRule(rule, ctx({ s1: '12', s2: '99' }));
    expect(out.marks).toBe(50);
    expect(out.trace.map((t) => t.detail).join(' '))
      .toMatch(/Information available → Female = 99 matches no band/);
  });

  it('supports max, min and avg as well as sum', () => {
    const withAgg = (aggregate) => ({ ...rule, config: { ...rule.config, aggregate } });
    expect(evaluateRule(withAgg('max'), ctx({ s1: '12', s2: '18' })).marks).toBe(50);
    expect(evaluateRule(withAgg('min'), ctx({ s1: '12', s2: '18' })).marks).toBe(25);
    expect(evaluateRule(withAgg('avg'), ctx({ s1: '12', s2: '18' })).marks).toBe(37.5);
  });

  it('rejects overlapping bands', () => {
    // With an overlap the score depends on the order the bands happen to be
    // listed in, which the author cannot see.
    const overlapping = {
      engine: 'numericBand',
      config: {
        inputs: [inputRef('a1', 's1')],
        bands: [{ min: 1, max: 15, marks: 50 }, { min: 10, max: 20, marks: 25 }],
      },
    };
    expect(validateRule(overlapping, CATALOG).join(' ')).toMatch(/Bands 1 and 2 overlap/);
  });

  it('rejects a band table with no inputs to read', () => {
    expect(validateRule({ engine: 'numericBand', config: { bands: [{ min: null, max: null, marks: 1 }] } }, CATALOG))
      .toContain('Add at least one input');
  });
});

describe('engine: gridLookup', () => {
  /** Question 682c2cfd: one cell decides, gated on other cells being filled. */
  const rule = {
    engine: 'gridLookup',
    config: {
      keyCell: cellRef('a1', 'g1', 1, 0),
      rules: [
        {
          keyEquals: 'Inventory sheets', marks: 80,
          requiresAnyValueIn: [cellRef('a1', 'g1', 1, 1), cellRef('a1', 'g1', 1, 2)],
        },
        {
          keyEquals: 'Software based', marks: 100,
          requiresAnyValueIn: [cellRef('a1', 'g1', 1, 1), cellRef('a1', 'g1', 1, 2)],
        },
      ],
      fallbackMarks: 0,
    },
  };

  it('awards the marks of the matching cell value', () => {
    expect(evaluateRule(rule, ctx({ grid: gridRows('Software based', 'yes') })).marks).toBe(100);
    expect(evaluateRule(rule, ctx({ grid: gridRows('Inventory sheets', 'yes') })).marks).toBe(80);
  });

  it('falls back when the required cells are all empty', () => {
    const out = evaluateRule(rule, ctx({ grid: gridRows('Software based') }));
    expect(out.marks).toBe(0);
    expect(out.trace[0].detail).toMatch(/required cells are filled/);
  });

  it('matches case-insensitively and ignores surrounding spaces', () => {
    expect(evaluateRule(rule, ctx({ grid: gridRows('  software BASED  ', 'y') })).marks).toBe(100);
  });

  it('falls back when nothing matches', () => {
    const out = evaluateRule(rule, ctx({ grid: gridRows('Paper based', 'y') }));
    expect(out.marks).toBe(0);
    expect(out.trace[0].detail).toMatch(/no value matches/);
  });

  it('rejects a deciding value that is not a grid cell', () => {
    const bad = {
      engine: 'gridLookup',
      config: { keyCell: inputRef('a1', 's1'), rules: [{ keyEquals: 'a', marks: 1 }] },
    };
    expect(validateRule(bad, CATALOG).join(' ')).toMatch(/must be a grid cell/);
  });

  it('rejects the same value listed twice', () => {
    const dup = {
      engine: 'gridLookup',
      config: {
        keyCell: cellRef('a1', 'g1', 1, 0),
        rules: [{ keyEquals: 'a', marks: 1 }, { keyEquals: 'A', marks: 2 }],
      },
    };
    expect(validateRule(dup, CATALOG).join(' ')).toMatch(/listed twice/);
  });
});

describe('engine: gridCompleteness', () => {
  const rule = (config) => ({
    engine: 'gridCompleteness',
    config: { area: { answerKey: 'a1', subKey: 'g1', rows: [1], cols: [1, 2, 3] }, marks: 60, ...config },
  });

  it('all: full marks only when every cell is filled', () => {
    expect(evaluateRule(rule(), ctx({ grid: gridRows('Revenue', '1', '2', '3') })).marks).toBe(60);
    expect(evaluateRule(rule(), ctx({ grid: gridRows('Revenue', '1', '2') })).marks).toBe(0);
  });

  it('proportional: marks in proportion to what was filled', () => {
    expect(evaluateRule(rule({ mode: 'proportional' }), ctx({ grid: gridRows('Revenue', '1', '2') })).marks).toBe(40);
  });

  it('atLeast: full marks once the minimum is reached', () => {
    const r = rule({ mode: 'atLeast', minFilled: 2 });
    expect(evaluateRule(r, ctx({ grid: gridRows('Revenue', '1', '2') })).marks).toBe(60);
    expect(evaluateRule(r, ctx({ grid: gridRows('Revenue', '1') })).marks).toBe(0);
  });

  it('counts a zero as filled, because zero is a real answer', () => {
    expect(evaluateRule(rule(), ctx({ grid: gridRows('Revenue', '0', '0', '0') })).marks).toBe(60);
  });

  it('names the empty cells in the trace', () => {
    const out = evaluateRule(rule(), ctx({ grid: gridRows('Revenue', '1') }));
    expect(out.trace[0].detail).toMatch(/1 of 3 cells filled/);
    expect(out.trace[0].detail).toMatch(/R1C2, R1C3/);
  });

  it('rejects a minimum larger than the selected area', () => {
    expect(validateRule(rule({ mode: 'atLeast', minFilled: 9 }), CATALOG).join(' '))
      .toMatch(/only has 3 cells/);
  });

  it('rejects an area whose grid was deleted', () => {
    const bad = rule({ area: { answerKey: 'a1', subKey: 'gone', rows: [1], cols: [1] } });
    expect(validateRule(bad, CATALOG).join(' ')).toMatch(/no longer exists/);
  });
});

describe('engine: optionSum', () => {
  it('adds up what was selected', () => {
    const out = evaluateRule({ engine: 'optionSum', config: {} }, {
      selectedOptions: [{ option: 'Policy available', marks: 15 }, { option: 'Web link', marks: 5 }],
    });
    expect(out.marks).toBe(20);
    expect(out.trace).toHaveLength(2);
  });
});

describe('authoring helpers', () => {
  it('describes every engine in one line', () => {
    for (const id of ENGINE_IDS) {
      expect(describeRule({ engine: id, config: {} }, CATALOG)).toBeTruthy();
    }
  });
});

/**
 * The engine names exist in two places — the ES module the authoring screen
 * uses, and a CommonJS list the route validates against, because Node 20 cannot
 * `require()` an ES module. Two copies of a list drift, and the drift only
 * shows up as an engine that saves and then scores everything zero.
 */
describe('frontend and backend agree on the engine list', () => {
  it('the lists match exactly', () => {
    expect([...BACKEND_ENGINE_IDS].sort()).toEqual([...ENGINE_IDS].sort());
  });

  it('the route validates engine against that list', () => {
    const source = readFileSync(
      join(ROOT, 'backend/modules/questionnaires/questionnaire.routes.js'), 'utf8');
    expect(source).toMatch(/engine:\s*z\.enum\(ENGINE_IDS\)/);
  });
});
