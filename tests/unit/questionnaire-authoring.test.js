import { describe, it, expect } from 'vitest';

import {
  toStoredGrid, fromStoredGrid, setCellCalc, calcCellCount,
  addColumn, addRow, removeColumn, setCell,
} from '../../frontend-react/src/features/questionnaire/services/gridModel.js';
import {
  cellRef, inputRef, refKey, validateRef, labelRef, resolveRef,
} from '../../frontend-react/src/features/questionnaire/services/valueRef.js';
import {
  toPayload, toForm,
} from '../../frontend-react/src/features/questionnaire/services/questionnaireSerializer.js';
import {
  validateQuestionnaire, summariseScores,
} from '../../frontend-react/src/features/questionnaire/services/questionnaireValidator.js';
import {
  emptyQuestionnaire, emptyGrid,
} from '../../frontend-react/src/features/questionnaire/config/questionnaireSchema.js';
import {
  validateBands, validateTrendRule, evaluateTrendRule, pickBand,
  guessYearCols, defaultBands,
} from '../../frontend-react/src/features/questionnaire/services/trendRule.js';

/**
 * The authoring model and the stored model are different shapes on purpose:
 * the stored grid keys every cell by concatenated coordinates ("11" = row 1,
 * column 1) and spells sub-answers "subanswar". These tests pin the translation
 * so a question authored in the new screen is byte-compatible with the existing
 * corpus, and an existing question survives a load/save round trip.
 */

/** A real stored grid, trimmed from the production dump. */
const STORED_GRID_SUB = {
  0: [
    {
      '00': 'Name of the Policy',
      '01': { val: 'Available (Y/N)', type: 'text' },
      '02': { val: 'Web Link', type: 'text' },
    },
    {
      10: { val: 'Code of conduct', type: 'text' },
      11: { val: '', type: 'dropdown' },
      12: { val: '', type: 'text' },
      assessorOption: [
        {
          assessorOptionType: 'checkbox',
          assessorGuidence: '',
          option: 'Code of Conduct',
          isSelected: false,
          marksnotapplicable: false,
          marks: 20,
          subOption: [
            { option: 'a. Relevant policy available', isSelected: false, marksnotapplicable: false, marks: 15 },
            { option: 'b. Web link available', isSelected: false, marksnotapplicable: false, marks: 5 },
          ],
        },
      ],
    },
  ],
  subAnswerLabel: null,
  subscore: 20,
  subAnswerTypes: 'Grid',
  gridFormulas: [
    { target: { row: 2, col: 1 }, expr: [{ cell: { row: 1, col: 1 } }, { op: '*' }, { num: 2 }] },
  ],
};

describe('grid model — stored shape translation', () => {
  it('reads a stored grid into columns and rows', () => {
    const grid = fromStoredGrid(STORED_GRID_SUB, 0);

    expect(grid.rowHeaderLabel).toBe('Name of the Policy');
    expect(grid.columns.map((c) => c.label)).toEqual(['Available (Y/N)', 'Web Link']);
    // The editor type comes from the data cell, not the header cell.
    expect(grid.columns[0].type).toBe('dropdown');
    expect(grid.rows).toHaveLength(1);
    expect(grid.rows[0].label).toBe('Code of conduct');
  });

  it('carries assessor options and their sub-options through', () => {
    const grid = fromStoredGrid(STORED_GRID_SUB, 0);
    const option = grid.rows[0].assessorOptions[0];

    expect(option.option).toBe('Code of Conduct');
    expect(option.marks).toBe('20');
    expect(option.subOptions.map((s) => s.marks)).toEqual(['15', '5']);
  });

  it('round-trips back to the stored coordinate keys', () => {
    const stored = toStoredGrid(fromStoredGrid(STORED_GRID_SUB, 0), 0);
    const [header, row] = stored['0'];

    expect(header['00']).toBe('Name of the Policy');
    expect(header['01'].val).toBe('Available (Y/N)');
    expect(row['10'].val).toBe('Code of conduct');
    expect(row['11'].type).toBe('dropdown');
    expect(row.assessorOption[0].marks).toBe(20);
    expect(row.assessorOption[0].subOption).toHaveLength(2);
  });

  it('renumbers every cell when a column is inserted before the others', () => {
    // This is the operation that made hand-editing the stored shape unsafe:
    // a new column changes the key of every cell to its right.
    let grid = fromStoredGrid(STORED_GRID_SUB, 0);
    grid = addColumn(grid, 'Owner');
    const [header, row] = toStoredGrid(grid, 0)['0'];

    expect(Object.keys(header).sort()).toEqual(['00', '01', '02', '03']);
    expect(header['03'].val).toBe('Owner');
    expect(row['13'].val).toBe('');
  });

  it('keeps rows and cells consistent as the table grows', () => {
    let grid = emptyGrid();
    grid = addColumn(grid, 'Third');
    grid = addRow(grid);

    expect(grid.columns).toHaveLength(3);
    grid.rows.forEach((r) => expect(Object.keys(r.cells)).toHaveLength(3));

    grid = setCell(grid, grid.rows[1].key, grid.columns[2].key, '42');
    expect(grid.rows[1].cells[grid.columns[2].key]).toBe('42');
  });

  it('refuses to remove the last data column', () => {
    let grid = emptyGrid();
    grid = removeColumn(grid, grid.columns[0].key);
    grid = removeColumn(grid, grid.columns[0].key);
    expect(grid.columns).toHaveLength(1);
  });
});

describe('formula cell marking', () => {
  it('only marked cells reach the formula builder', () => {
    let g = emptyGrid();
    expect(calcCellCount(g)).toBe(0);

    g = setCellCalc(g, g.rows[0].key, g.columns[0].key, true);
    expect(calcCellCount(g)).toBe(1);

    g = setCellCalc(g, g.rows[0].key, g.columns[0].key, false);
    expect(calcCellCount(g)).toBe(0);
  });

  it('carries the mark through the stored shape', () => {
    let g = emptyGrid();
    g = setCellCalc(g, g.rows[0].key, g.columns[1].key, true);

    const stored = toStoredGrid(g, 0);
    expect(stored['0'][1]['12'].isCalc).toBe(true);
    expect(stored['0'][1]['11'].isCalc).toBe(false);

    const back = fromStoredGrid(stored, 0);
    expect(back.rows[0].calc[back.columns[1].key]).toBe(true);
    expect(back.rows[0].calc[back.columns[0].key]).toBeUndefined();
  });

  it('keeps the mark on the cell when a column is inserted', () => {
    // The mark lives on the cell rather than in a side list, so renumbering
    // cannot detach it from the value it belongs to.
    let g = emptyGrid();
    g = setCellCalc(g, g.rows[0].key, g.columns[1].key, true);
    g = addColumn(g, 'Extra');

    const stored = toStoredGrid(g, 0);
    expect(stored['0'][1]['12'].isCalc).toBe(true);
    expect(stored['0'][1]['13'].isCalc).toBe(false);
  });
});

describe('serializer — form to stored document', () => {
  const authored = () => ({
    ...emptyQuestionnaire(),
    type: ['OEM'],
    assessmentYear: '2026-05-20',
    category: 'Decarbonization',
    questionOrderNo: '3',
    maxMark: '100',
    question: '<p>Water use?</p>',
    answerType: 'RadioButton',
    answers: [{
      key: 'a1',
      answerLabel: 'Information available',
      displayLabel: 'Yes, we track it',
      sortOrder: '1',
      score: '100',
      assessorOptionType: 'radio',
      assessorGuidance: 'Check the meter readings',
      assessorOptions: [
        { key: 'o1', option: 'Verified', marks: '100', marksNotApplicable: false, subOptions: [] },
        { key: 'o2', option: 'Not applicable', marks: '', marksNotApplicable: true, subOptions: [] },
      ],
      hasSubAnswers: true,
      subAnswerType: 'Grid',
      subAnswers: [{
        key: 's1',
        subAnswerLabel: 'Consent to operate',
        subScore: '20',
        gridLabel: '',
        subAnswerType: 'Grid',
        inputMode: 'numeric',
        isDisabled: false,
        flag: 'emission1',
        assessorOptionType: '',
        assessorGuidance: '',
        assessorOptions: [],
        config: emptyGrid(),
      }],
    }],
  });

  it('writes the legacy field names the stored corpus uses', () => {
    const payload = toPayload(authored());
    const answer = payload.answers[0];

    expect(answer.subAnswer).toBe('yes');
    expect(answer.assessorOption[0].assessorGuidence).toBe('');
    expect(answer.assessorOption[1].marksnotapplicable).toBe(true);
    expect(answer.subAnswers[0].subAnswerTypes).toBe('Grid');
  });

  it('expands one input mode into the three exclusive booleans', () => {
    const sub = toPayload(authored()).answers[0].subAnswers[0];

    expect(sub.isTypeNumericText).toBe(true);
    expect(sub.isTypeText).toBe('');
    expect(sub.isUploadText).toBe('');
  });

  it('collapses the three booleans back to one mode on read', () => {
    const back = toForm(toPayload(authored()));
    expect(back.answers[0].subAnswers[0].inputMode).toBe('numeric');
  });

  it('survives a full round trip without losing authored values', () => {
    const original = authored();
    const back = toForm(toPayload(original));

    expect(back.type).toEqual(['OEM']);
    expect(back.answers[0].displayLabel).toBe('Yes, we track it');
    expect(back.answers[0].assessorOptionType).toBe('radio');
    expect(back.answers[0].assessorOptions[0].marks).toBe('100');
    expect(back.answers[0].assessorOptions[1].marksNotApplicable).toBe(true);
    expect(back.answers[0].subAnswers[0].flag).toBe('emission1');
    expect(back.answers[0].subAnswers[0].config).not.toBeNull();
  });

  it('reads a legacy document that spells sub-answers "subanswar"', () => {
    const legacy = {
      type: 'OEM',                       // string, not array
      assignmentYear: '2026-05-20',      // old field name
      question: '<p>Legacy</p>',
      answerType: 'RadioButton',
      answer: [{                         // `answer`, not `answers`
        answerLabel: 'Yes',
        subAnswer: 'yes',
        subAnswerType: 'Text',
        subanswar: [{ subAnswerLabel: 'Detail', subscore: 5, isTypeText: true }],
      }],
    };
    const form = toForm(legacy);

    expect(form.type).toEqual(['OEM']);
    expect(form.assessmentYear).toBe('2026-05-20');
    expect(form.answers[0].subAnswers[0].subAnswerLabel).toBe('Detail');
    expect(form.answers[0].subAnswers[0].subScore).toBe('5');
    expect(form.answers[0].subAnswers[0].inputMode).toBe('text');
  });

  it('drops sub-answers when the author switched the block off', () => {
    const form = authored();
    form.answers[0].hasSubAnswers = false;
    expect(toPayload(form).answers[0].subAnswers).toEqual([]);
  });
});

describe('validation', () => {
  const base = () => ({
    ...emptyQuestionnaire(),
    type: ['OEM'],
    assessmentYear: '2026-05-20',
    category: 'General',
    questionOrderNo: '1',
    question: '<p>Q</p>',
  });

  it('treats an empty rich-text editor as blank despite its tags', () => {
    const errors = validateQuestionnaire({ ...base(), question: '<p><br></p>' });
    expect(errors.question).toBe('Question is required');
  });

  it('rejects an option-based question with no options', () => {
    const errors = validateQuestionnaire({ ...base(), answerType: 'RadioButton' });
    expect(errors.answers).toMatch(/needs at least one answer option/);
  });

  it('flags a formula that reads outside the table', () => {
    // The whole question is validated here, so the catalog is derived from the
    // form itself — which is what lets a reference be checked against the very
    // grid it claims to read.
    const grid = { ...emptyGrid() };
    grid.formulas = [{
      target: cellRef('a', 's', 1, 1),
      expr: [cellRef('a', 's', 9, 9), { op: '*' }, { kind: 'const', value: 2 }],
    }];
    const errors = validateQuestionnaire({
      ...base(), answerType: 'RadioButton',
      answers: [{
        key: 'a', answerLabel: 'Yes', hasSubAnswers: true, subAnswerType: 'Grid',
        subAnswers: [{ key: 's', subAnswerLabel: 'x', subAnswerType: 'Grid', config: grid }],
      }],
    });
    // The type reports what is wrong with its own configuration, under one key.
    expect(errors['answers.0.subAnswers.0.config']).toMatch(/is outside/);
  });

  it('requires an assessor option type once options exist', () => {
    const errors = validateQuestionnaire({
      ...base(), answerType: 'RadioButton',
      answers: [{
        key: 'a', answerLabel: 'Yes', assessorOptionType: '',
        assessorOptions: [{ key: 'o', option: 'Verified', marks: '10', subOptions: [] }],
      }],
    });
    expect(errors['answers.0.assessorOptionType']).toMatch(/how the assessor marks/);
  });
});

describe('score summary', () => {
  it('counts sub-options as alternatives, not as a sum', () => {
    // A radio ladder awards one rung. Summing them overstates what the question
    // can actually award, which is what made "max marks" meaningless.
    const scores = summariseScores({
      ...emptyQuestionnaire(),
      maxMark: '100',
      answers: [{
        key: 'a', score: '0',
        assessorOptions: [{
          key: 'o', option: 'Policy', marks: '20',
          subOptions: [
            { key: 's1', option: 'a', marks: '15' },
            { key: 's2', option: 'b', marks: '5' },
          ],
        }],
      }],
    });

    expect(scores.assessorTotal).toBe(15);
    expect(scores.exceedsMax).toBe(false);
  });

  it('reports when the marking scheme can exceed max marks', () => {
    const scores = summariseScores({
      ...emptyQuestionnaire(),
      maxMark: '50',
      answers: [{ key: 'a', score: '80', assessorOptions: [], subAnswers: [] }],
    });
    expect(scores.exceedsMax).toBe(true);
  });
});

/**
 * TREND RULE — the assessor-validation half of the formula popup.
 *
 * These tests pin the three behaviours the original hardcoded version got
 * wrong, because each one silently produced a wrong mark rather than an error.
 */
describe('trend rule — bands', () => {
  const OPTIONS = ['Decreasing', 'Flat', 'Increasing'];

  it('accepts a band table that covers the whole number line', () => {
    expect(validateBands(defaultBands(OPTIONS))).toEqual([]);
  });

  it('rejects a gap — the original silently scored zero there', () => {
    // `> 5` / `< 5` / `< -5` left exactly 5 and -5 matching nothing at all.
    const errors = validateBands([
      { from: null, to: -5, option: 'a', marks: 20 },
      { from: 5, to: null, option: 'b', marks: 0 },
    ]);
    expect(errors.join(' ')).toMatch(/Gap: a result between -5% and 5%/);
    expect(errors.join(' ')).toMatch(/silently score zero/);
  });

  it('rejects an overlap', () => {
    const errors = validateBands([
      { from: null, to: 10, option: 'a', marks: 20 },
      { from: 5, to: null, option: 'b', marks: 0 },
    ]);
    expect(errors.join(' ')).toMatch(/Overlap: 5% to 10%/);
  });

  it('rejects an uncovered tail on either end', () => {
    expect(validateBands([{ from: 0, to: null, option: 'a', marks: 1 }]).join(' '))
      .toMatch(/below 0%/);
    expect(validateBands([{ from: null, to: 0, option: 'a', marks: 1 }]).join(' '))
      .toMatch(/above 0%/);
  });

  it('treats the lower edge as inclusive and the upper as exclusive', () => {
    const bands = defaultBands(OPTIONS);
    expect(pickBand(bands, -5).option).toBe('Flat');       // lower edge included
    expect(pickBand(bands, 5).option).toBe('Increasing');  // upper edge excluded
    expect(pickBand(bands, -5.01).option).toBe('Decreasing');
  });

  it('requires an option and marks on every band', () => {
    const errors = validateBands([{ from: null, to: null, option: '', marks: null }]);
    expect(errors.join(' ')).toMatch(/no assessor option chosen/);
    expect(errors.join(' ')).toMatch(/marks are missing/);
  });
});

describe('trend rule — year column detection', () => {
  it('picks the year columns out of a mixed header', () => {
    // The real revenue grid reads "Information | Unit | FY 2021 | FY 2022 |
    // FY 2023", so "skip column 0" would wrongly include the unit column.
    expect(guessYearCols(['Information', 'Unit', 'FY 2021', 'FY 2022', 'FY 2023']))
      .toEqual([2, 3, 4]);
  });

  it('falls back to every column when the headers say nothing useful', () => {
    expect(guessYearCols(['Metric', 'A', 'B'])).toEqual([1, 2]);
  });
});

/**
 * A trend rule divides by a figure in a different question — emissions per unit
 * of revenue. The engine and the stored shape supported that as soon as
 * `questionId` became an optional field on a reference, but for a while the
 * picker did not offer those cells, so the only way to build one was to write
 * the JSON by hand. These pin the pieces that make it reachable.
 */
describe('cross-question references', () => {
  const CROSS_CATALOG = {
    answers: [],
    questions: [{ id: 'Q-REV', label: 'Revenue by year' }],
    maxMark: 100,
  };

  it('is a distinct identity from the same cell in this question', () => {
    // Without this the dependency graph would treat two different values as one.
    expect(refKey(cellRef('rev', 'rg', 1, 1)))
      .not.toBe(refKey(cellRef('rev', 'rg', 1, 1, 'Q-REV')));
  });

  it('omits questionId entirely when it is not given', () => {
    // A local reference must serialise identically to before, or every stored
    // rule would look changed.
    expect(cellRef('a', 's', 1, 1)).toEqual({ kind: 'cell', answerKey: 'a', subKey: 's', row: 1, col: 1 });
    expect(inputRef('a', 's')).toEqual({ kind: 'input', answerKey: 'a', subKey: 's' });
  });

  it('is validated for shape, not against the wrong catalog', () => {
    // Its target lives in a document this catalog does not describe. Checking it
    // here would report a working reference as broken, and the author would
    // delete a rule that was fine.
    expect(validateRef(cellRef('rev', 'rg', 1, 1, 'Q-REV'), CROSS_CATALOG)).toEqual([]);
    expect(validateRef({ kind: 'cell', questionId: 'Q-REV', row: 1, col: 1 }, CROSS_CATALOG))
      .toEqual(['That reference is incomplete']);
  });

  it('names the other question so a trace cannot be misread as local', () => {
    expect(labelRef(cellRef('rev', 'rg', 1, 1, 'Q-REV'), CROSS_CATALOG))
      .toBe('Revenue by year → R1C1');
  });

  it('resolves against that question’s answers, not this one’s', () => {
    const ctx = {
      answers: { rev: { subs: { rg: { grid: [{}, { 11: { val: 'local' } }] } } } },
      questions: { 'Q-REV': { answers: { rev: { subs: { rg: { grid: [{}, { 11: { val: '250' } }] } } } } } },
    };
    expect(resolveRef(cellRef('rev', 'rg', 1, 1, 'Q-REV'), ctx, CROSS_CATALOG).value).toBe('250');
    expect(resolveRef(cellRef('rev', 'rg', 1, 1), ctx, CROSS_CATALOG).value).toBe('local');
  });

  it('reports missing rather than falling back to this question', () => {
    // Silently reading the local cell would produce a plausible wrong intensity.
    const ctx = { answers: { rev: { subs: { rg: { grid: [{}, { 11: { val: '9' } }] } } } }, questions: {} };
    expect(resolveRef(cellRef('rev', 'rg', 1, 1, 'Q-REV'), ctx, CROSS_CATALOG).missing).toBe(true);
  });
});

/**
 * Stored data outranks the flag that describes it.
 *
 * The real corpus contains four answers whose `subAnswer` flag reads 'no' while
 * `subanswar` is populated. Trusting the flag dropped those follow-ups on read —
 * and a dropped follow-up is indistinguishable from a question that never had
 * one, so nothing would have reported it.
 */
describe('a flag never overrules the data it describes', () => {
  const legacy = {
    question: '<p>Q</p>',
    answerType: 'RadioButton',
    answer: [{
      answerLabel: 'Yes',
      subAnswer: 'no',                                   // says there are none
      subanswar: [{ subAnswerLabel: 'Detail', subAnswerTypes: 'Button' }],  // but there is
    }],
  };

  it('keeps a sub-answer the flag says should not exist', () => {
    const form = toForm(legacy);
    expect(form.answers[0].subAnswers).toHaveLength(1);
    expect(form.answers[0].hasSubAnswers).toBe(true);
  });

  it('carries it through a full round trip', () => {
    const back = toForm(toPayload(toForm(legacy)));
    expect(back.answers[0].subAnswers).toHaveLength(1);
    expect(back.answers[0].subAnswers[0].subAnswerLabel).toBe('Detail');
  });

  it('still lets an author turn follow-ups off', () => {
    // The fix is about reading, not authoring: an author who sets the toggle to
    // No must still get an empty list stored.
    const form = toForm(legacy);
    form.answers[0].hasSubAnswers = false;
    expect(toPayload(form).answers[0].subAnswers).toEqual([]);
  });
});
