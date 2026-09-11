import { describe, it, expect } from 'vitest';
import {
  emptyAnswer, isSelected, subValue, subGrid,
  setSelected, setSubValue, setGridCell, seedGrid,
  toStoredAnswer, isAnswered, selectedOptions, hasAssessorMarking,
} from '../../frontend-react/src/features/questionnaire/services/answerValue.js';
import {
  cellRef, inputRef, resolveRef,
} from '../../frontend-react/src/features/questionnaire/services/valueRef.js';

/**
 * The answer's shape is deliberately the same one `resolveRef` reads, so that a
 * formula, a mark rule and a trend rule all run against what the respondent
 * typed with nothing in between. These tests hold that property in place — the
 * moment an adapter is needed, the two have drifted.
 */

const QUESTION = {
  maxMark: 100,
  answerType: 'RadioButton',
  answers: [
    { key: 'a1', answerLabel: 'Yes, published', score: 100, assessorOption: [] },
    { key: 'a2', answerLabel: 'No', score: 0, assessorOption: [] },
  ],
};

describe('selecting options', () => {
  it('clears the others for a single-choice question', () => {
    // A radio question whose stored answer holds two selections cannot be
    // scored. Leaving that to the UI means the first non-UI writer breaks it.
    let a = setSelected(emptyAnswer(), 'a1', true, { single: true });
    a = setSelected(a, 'a2', true, { single: true });

    expect(isSelected(a, 'a1')).toBe(false);
    expect(isSelected(a, 'a2')).toBe(true);
  });

  it('allows several for a multiple-choice question', () => {
    let a = setSelected(emptyAnswer(), 'a1', true);
    a = setSelected(a, 'a2', true);
    expect(isSelected(a, 'a1')).toBe(true);
    expect(isSelected(a, 'a2')).toBe(true);
  });

  it('keeps what was typed when an option is unticked', () => {
    // An option ticked by mistake should not take a typed paragraph with it.
    let a = setSelected(emptyAnswer(), 'a1', true);
    a = setSubValue(a, 'a1', 's1', 'a long explanation');
    a = setSelected(a, 'a1', false);

    expect(subValue(a, 'a1', 's1')).toBe('a long explanation');
  });

  it('but does not store an unselected branch', () => {
    // Otherwise every consumer has to remember that values under an unticked
    // option do not count, and one of them eventually will not.
    let a = setSelected(emptyAnswer(), 'a1', true);
    a = setSubValue(a, 'a1', 's1', 'text');
    a = setSelected(a, 'a1', false);

    expect(toStoredAnswer(a)).toEqual({});
  });
});

describe('grid cells', () => {
  it('writes in the coordinate space a cell reference addresses', () => {
    const a = setGridCell(emptyAnswer(), 'a1', 'g1', 2, 3, '42');
    expect(subGrid(a, 'a1', 'g1')[2]['23']).toEqual({ val: '42', type: 'text' });
  });

  it('is readable by resolveRef with no conversion at all', () => {
    // This is the property the whole shape exists for.
    const a = setGridCell(emptyAnswer(), 'a1', 'g1', 2, 3, '42');
    const out = resolveRef(cellRef('a1', 'g1', 2, 3), { answers: a });

    expect(out.missing).toBe(false);
    expect(out.value).toBe('42');
  });

  it('reads a typed input through the same path', () => {
    const a = setSubValue(emptyAnswer(), 'a1', 's1', '17');
    expect(resolveRef(inputRef('a1', 's1'), { answers: a }).value).toBe('17');
  });

  it('seeds from the authored table, and never overwrites an answer', () => {
    const authored = [{ '00': 'Metric', '01': { val: 'FY24' } }, { 10: { val: 'Revenue' } }];

    let a = seedGrid(emptyAnswer(), 'a1', 'g1', authored);
    expect(subGrid(a, 'a1', 'g1')[1]['10'].val).toBe('Revenue');

    a = setGridCell(a, 'a1', 'g1', 1, 1, '999');
    a = seedGrid(a, 'a1', 'g1', authored);
    expect(subGrid(a, 'a1', 'g1')[1]['11'].val).toBe('999');
  });

  it('copies the authored table rather than sharing it', () => {
    // A shared reference would let one respondent's typing change the question.
    const authored = [{ '00': 'h' }, { 10: { val: 'Row' } }];
    const a = setGridCell(seedGrid(emptyAnswer(), 'a1', 'g1', authored), 'a1', 'g1', 1, 0, 'edited');

    expect(authored[1]['10'].val).toBe('Row');
    expect(subGrid(a, 'a1', 'g1')[1]['10'].val).toBe('edited');
  });
});

describe('has it been answered', () => {
  it('needs a selection when the question has options', () => {
    expect(isAnswered(emptyAnswer(), { hasOptions: true })).toBe(false);
    expect(isAnswered(setSelected(emptyAnswer(), 'a1', true), { hasOptions: true })).toBe(true);
  });

  it('needs a filled input when it has none', () => {
    // Text and Upload questions have nothing to tick.
    const typed = setSubValue(emptyAnswer(), 'a1', 's1', 'something');
    expect(isAnswered(typed, { hasOptions: false })).toBe(true);
    expect(isAnswered(setSubValue(emptyAnswer(), 'a1', 's1', '   '), { hasOptions: false })).toBe(false);
  });

  it('counts a filled grid cell', () => {
    const grid = setGridCell(emptyAnswer(), 'a1', 'g1', 1, 1, '5');
    expect(isAnswered(grid, { hasOptions: false })).toBe(true);
  });
});

/**
 * The applicant's own score and the assessor's marks are different stages.
 * Conflating them showed a live preview of 0 for a question whose selected
 * option was worth 100 — which is how this was found.
 */
describe('what a selected option scores', () => {
  it('uses the option’s own score', () => {
    const a = setSelected(emptyAnswer(), 'a1', true, { single: true });
    expect(selectedOptions(QUESTION, a)).toEqual([{ option: 'Yes, published', marks: 100 }]);
  });

  it('ignores assessor options, which nobody has picked yet', () => {
    const withAssessor = {
      ...QUESTION,
      answers: [{
        key: 'a1', answerLabel: 'Yes', score: 40,
        assessorOption: [{ option: 'Verified', marks: 100 }],
      }],
    };
    const a = setSelected(emptyAnswer(), 'a1', true);

    // 40, not 100: the assessor has not reviewed the evidence yet.
    expect(selectedOptions(withAssessor, a)).toEqual([{ option: 'Yes', marks: 40 }]);
    expect(hasAssessorMarking(withAssessor)).toBe(true);
  });

  it('prefers the label shown to the respondent', () => {
    const q = { answers: [{ key: 'a1', answerLabel: 'internal', displayLabel: 'Yes, we do', score: 10 }] };
    expect(selectedOptions(q, setSelected(emptyAnswer(), 'a1', true))[0].option).toBe('Yes, we do');
  });

  it('reports nothing for a question with no assessor marking', () => {
    expect(hasAssessorMarking(QUESTION)).toBe(false);
  });
});
