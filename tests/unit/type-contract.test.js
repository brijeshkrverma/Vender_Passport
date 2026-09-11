import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  TYPES, TYPE_IDS, getType, typeHasConfig,
  typeHasOptions, typeAllowsSubAnswer, typeAllowsInputMode,
  INPUT_MODES,
} from '../../frontend-react/src/features/questionnaire/types/index.js';
import { refKey } from '../../frontend-react/src/features/questionnaire/services/valueRef.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FEATURE = join(ROOT, 'frontend-react/src/features/questionnaire');

/**
 * THE CONTRACT EXISTS SO A TYPE IS ONE FILE.
 *
 * Before it, a type that carried its own configuration — Grid — was
 * special-cased by name in seven places: the serializer twice, the validator,
 * the form reducer three times, and a component. A second such type would have
 * had to find all seven, and missing one produced a type that saved but did not
 * load.
 *
 * The measured shape of the corpus is why the contract sits at the sub-answer
 * level: all 322 imported questions are RadioButton at the top, while their
 * 1190 sub-answers span CheckBox, Text, Grid, RadioButton and Button.
 */

describe('every type honours the contract', () => {
  it.each(TYPES.map((t) => [t.id, t]))('%s', (id, type) => {
    expect(typeof type.label).toBe('string');
    expect(type.capabilities).toBeTypeOf('object');

    // The four functions every consumer calls without knowing which type it has.
    ['createConfig', 'toStored', 'fromStored', 'validate', 'refs']
      .forEach((fn) => expect(type[fn], `${id}.${fn}`).toBeTypeOf('function'));

    // None of them may throw on an empty instance: the form calls all of them
    // on a sub-answer the author has only just created.
    expect(() => type.createConfig()).not.toThrow();
    expect(() => type.toStored(type.createConfig(), { index: 0 })).not.toThrow();
    expect(() => type.fromStored({}, { index: 0 })).not.toThrow();
    expect(() => type.validate(type.createConfig(), {})).not.toThrow();
    expect(() => type.refs(type.createConfig(), { answerKey: 'a', subKey: 's' })).not.toThrow();

    expect(Array.isArray(type.validate(type.createConfig(), {}))).toBe(true);
    expect(Array.isArray(type.refs(type.createConfig(), {}))).toBe(true);
  });

  it('covers every type the imported corpus actually uses', () => {
    // Measured across 1190 stored sub-answers. Button is in that list only
    // because the four that exist were being silently dropped on read.
    ['CheckBox', 'Text', 'Grid', 'RadioButton', 'Button']
      .forEach((id) => expect(TYPE_IDS, `${id} is in the corpus`).toContain(id));
  });
});

describe('an unknown type still behaves', () => {
  const unknown = getType('Matrix');

  it('does not return undefined, whatever it is asked for', () => {
    // A question authored against a type that was later removed has to stay
    // readable. Returning undefined would make every call site responsible.
    expect(unknown).toBeTruthy();
    expect(unknown.unknown).toBe(true);
    expect(unknown.createConfig()).toBeNull();
    expect(unknown.refs(null, {})).toEqual([]);
  });

  it('says so rather than failing silently', () => {
    expect(getType('Matrix').validate(null, { typeId: 'Matrix' }).join(' '))
      .toMatch(/not a type this system knows/);
  });
});

describe('capabilities are read, never inferred from the name', () => {
  it('separates types that carry a configuration from those that do not', () => {
    // This is the distinction the seven hardcoded checks were making by hand.
    expect(typeHasConfig('Grid')).toBe(true);
    expect(typeHasConfig('Text')).toBe(false);
    expect(typeHasConfig('CheckBox')).toBe(false);
  });

  it('knows which types present a list of options', () => {
    expect(typeHasOptions('RadioButton')).toBe(true);
    expect(typeHasOptions('Grid')).toBe(true);
    expect(typeHasOptions('Text')).toBe(false);
  });

  it('knows Button captures nothing', () => {
    expect(typeAllowsSubAnswer('Button')).toBe(false);
    expect(typeAllowsInputMode('Button')).toBe(false);
  });
});

describe('input mode is orthogonal to type', () => {
  it('is one choice, so the impossible cannot be authored', () => {
    // Stored as three mutually-exclusive booleans; a single choice makes
    // "text and numeric at once" unrepresentable rather than merely invalid.
    expect(INPUT_MODES.map((m) => m.value)).toEqual(['', 'text', 'numeric', 'upload']);
  });

  it('decides whether a configuration-free type is referenceable', () => {
    // A label-only row holds nothing a formula could read.
    const text = getType('Text');
    expect(text.refs(null, { answerKey: 'a', subKey: 's' })).toEqual([]);
    expect(text.refs(null, { answerKey: 'a', subKey: 's', inputMode: 'numeric' }).map(refKey))
      .toEqual(['input:a/s']);
  });
});

describe('Grid — the type the contract was built for', () => {
  const grid = getType('Grid');

  it('arrives usable rather than empty', () => {
    // Choosing it used to leave a type selected with nothing to fill in.
    const config = grid.createConfig();
    expect(config.columns.length).toBeGreaterThan(0);
    expect(config.rows.length).toBeGreaterThan(0);
  });

  it('round-trips through the stored coordinate shape', () => {
    const stored = grid.toStored(grid.createConfig(), { index: 0 });
    expect(stored['0']).toBeInstanceOf(Array);

    const back = grid.fromStored(stored, { index: 0 });
    expect(back.columns.length).toBe(grid.createConfig().columns.length);
  });

  it('exposes every cell as a reference, in stored coordinates', () => {
    // R0/C0 are the header and label lanes; a formula may legitimately read a
    // row label, and the coordinates must mean the same thing everywhere.
    const refs = grid.refs(grid.createConfig(), { answerKey: 'a', subKey: 'g' });
    expect(refs.map(refKey)).toContain('cell:a/g/0,0');
    expect(refs.map(refKey)).toContain('cell:a/g/1,2');
  });

  it('reports a missing table in the author’s words', () => {
    expect(grid.validate(null, {}).join(' ')).toMatch(/no table has been built/);
  });
});

/**
 * The point of the contract is that adding a type touches one file. These read
 * the source, because the property is architectural — no single call can show
 * that nothing else knows the type's name.
 */
describe('nothing outside the type knows what a Grid is', () => {
  const shouldNotMentionGrid = [
    'services/questionnaireSerializer.js',
    'services/questionnaireValidator.js',
    'hooks/useQuestionnaireForm.js',
  ];

  it.each(shouldNotMentionGrid)('%s does not special-case it', (rel) => {
    const source = readFileSync(join(FEATURE, rel), 'utf8');
    // Comments may name it as an example; code may not compare against it.
    const code = source.split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/===\s*'Grid'/);
    expect(code).not.toMatch(/'Grid'\s*===/);
  });

  it('is one file per type, and one import for each', () => {
    // The invariant is one module per type — not that the filename matches the
    // id, which would forbid `radio.js` holding `RadioButton`.
    const files = readdirSync(join(FEATURE, 'types'))
      .filter((f) => f.endsWith('.js') && f !== 'index.js');

    expect(files).toHaveLength(TYPE_IDS.length);

    const registry = readFileSync(join(FEATURE, 'types/index.js'), 'utf8');
    files.forEach((f) => {
      expect(registry, `${f} is registered`).toMatch(new RegExp(`from '\\./${f.replace('.js', '')}'`));
    });
  });
});
