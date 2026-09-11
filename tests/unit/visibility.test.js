import { describe, it, expect } from 'vitest';
import {
  isVisible, validateCondition, describeCondition,
  visibleSubAnswers, emptyCondition, OPERATORS,
} from '../../frontend-react/src/features/questionnaire/services/visibility.js';
import {
  inputRef, optionRef,
} from '../../frontend-react/src/features/questionnaire/services/valueRef.js';
import {
  isAnswered, setSelected, setSubValue, emptyAnswer,
} from '../../frontend-react/src/features/questionnaire/services/answerValue.js';

const CATALOG = {
  answers: [{
    key: 'a1',
    label: 'Do you have a policy?',
    subs: [
      { key: 's1', label: 'Policy name', type: 'Text', inputMode: 'text' },
      { key: 's2', label: 'Employees covered', type: 'Text', inputMode: 'numeric' },
    ],
  }],
  questions: [],
};

const answers = (subs = {}, selected = true) => ({
  answers: { a1: { selected, score: 0, subs } },
});

/**
 * Conditional visibility is a Ref and a comparison, and nothing else.
 *
 * The model this replaces expressed it as `{ questionIndex, ... }` — a position,
 * which is the failure that made its scoring rules wrong whenever a question was
 * inserted. It also never held a single instance across any stored template, so
 * this is being introduced rather than migrated.
 */
describe('conditions', () => {
  it('shows everything when there is no condition', () => {
    expect(isVisible(null, answers(), CATALOG)).toBe(true);
    expect(isVisible({ ref: null }, answers(), CATALOG)).toBe(true);
  });

  it('“answered” means a value is present, not that it is truthy', () => {
    // Zero is an answer. Treating it as absent is the mistake the original
    // scoring code made with `if (intensity || ...)`.
    const cond = { ref: inputRef('a1', 's2'), operator: 'answered' };
    expect(isVisible(cond, answers({ s2: { value: '0' } }), CATALOG)).toBe(true);
    expect(isVisible(cond, answers({ s2: { value: '' } }), CATALOG)).toBe(false);
  });

  it('compares text without caring about case or padding', () => {
    // An author typing "Yes" and an option labelled "yes " is not a distinction
    // they intended to make.
    const cond = { ref: inputRef('a1', 's1'), operator: 'eq', value: 'Yes' };
    expect(isVisible(cond, answers({ s1: { value: '  yes ' } }), CATALOG)).toBe(true);
    expect(isVisible(cond, answers({ s1: { value: 'no' } }), CATALOG)).toBe(false);
  });

  it('treats a numeric comparison on text as not met, rather than letting NaN decide', () => {
    const cond = { ref: inputRef('a1', 's1'), operator: 'gt', value: '10' };
    expect(isVisible(cond, answers({ s1: { value: 'many' } }), CATALOG)).toBe(false);
    expect(isVisible(cond, answers({ s1: { value: '11' } }), CATALOG)).toBe(true);
  });

  it('supports a list of accepted values', () => {
    const cond = { ref: inputRef('a1', 's1'), operator: 'in', value: 'ISO 14001, ISO 45001' };
    expect(isVisible(cond, answers({ s1: { value: 'iso 45001' } }), CATALOG)).toBe(true);
    expect(isVisible(cond, answers({ s1: { value: 'ISO 9001' } }), CATALOG)).toBe(false);
  });

  it('hides rather than shows when the trigger cannot be read', () => {
    // Asking for work on the strength of a value nobody could find is worse
    // than not asking.
    const cond = { ref: inputRef('a1', 'deleted'), operator: 'eq', value: 'x' };
    expect(isVisible(cond, answers(), CATALOG)).toBe(false);
  });

  it('can key off whether an option was selected', () => {
    const cond = { ref: optionRef('a1', 'selected'), operator: 'eq', value: '1' };
    expect(isVisible(cond, answers({}, true), CATALOG)).toBe(true);
    expect(isVisible(cond, answers({}, false), CATALOG)).toBe(false);
  });
});

describe('an author can read what they built', () => {
  it('describes a condition in plain English', () => {
    expect(describeCondition(null, CATALOG)).toBe('Always shown');
    expect(describeCondition(
      { ref: inputRef('a1', 's1'), operator: 'eq', value: 'Yes' }, CATALOG
    )).toBe('Shown when Do you have a policy? → Policy name is “Yes”');
  });

  it('reports a condition aimed at something deleted', () => {
    expect(validateCondition({ ref: inputRef('a1', 'gone'), operator: 'answered' }, CATALOG))
      .toContain('The sub-answer this points at no longer exists');
  });

  it('requires a value for the operators that compare against one', () => {
    expect(validateCondition({ ref: inputRef('a1', 's1'), operator: 'eq', value: '' }, CATALOG)
      .join(' ')).toMatch(/needs a value/);
    // `answered` does not, and must not be reported as incomplete.
    expect(validateCondition(emptyCondition(), CATALOG)).toEqual([]);
  });

  it('requires a number where it compares numerically', () => {
    expect(validateCondition({ ref: inputRef('a1', 's2'), operator: 'gt', value: 'lots' }, CATALOG)
      .join(' ')).toMatch(/needs a number/);
  });

  it('offers only operators it can evaluate', () => {
    expect(OPERATORS.map((o) => o.value)).toEqual(['answered', 'eq', 'neq', 'gt', 'lt', 'in']);
  });
});

/**
 * The distinction the whole feature turns on.
 *
 * "You did not answer question 4" and "question 4 did not apply to you" are
 * different statements, and a completeness check that confuses them tells a
 * respondent they missed something that was never on their screen.
 */
describe('a hidden follow-up is not an unanswered one', () => {
  const question = {
    answers: [{
      key: 'a1',
      subAnswers: [
        { key: 's1', subAnswerLabel: 'Policy name' },
        {
          key: 's2',
          subAnswerLabel: 'Employees covered',
          dependsOn: { ref: inputRef('a1', 's1'), operator: 'answered' },
        },
      ],
    }],
  };

  it('drops the hidden one from what is being asked for', () => {
    const nothingTyped = setSelected(emptyAnswer(), 'a1', true);
    const shown = visibleSubAnswers(question.answers[0].subAnswers, { answers: nothingTyped });
    expect(shown.map((s) => s.key)).toEqual(['s1']);
  });

  it('includes it once its trigger is answered', () => {
    let a = setSelected(emptyAnswer(), 'a1', true);
    a = setSubValue(a, 'a1', 's1', 'Code of conduct');
    const shown = visibleSubAnswers(question.answers[0].subAnswers, { answers: a });
    expect(shown.map((s) => s.key)).toEqual(['s1', 's2']);
  });

  it('is the same function the completeness check uses', () => {
    // If the renderer and the check disagreed, a respondent would be blocked by
    // a question they could not see.
    const a = setSelected(emptyAnswer(), 'a1', true);
    expect(isAnswered(a, { hasOptions: true, question })).toBe(true);
  });
});
