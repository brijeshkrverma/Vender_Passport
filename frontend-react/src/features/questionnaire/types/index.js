/**
 * THE TYPE CONTRACT.
 *
 * ── WHAT A TYPE HAS TO PROVIDE ────────────────────────────────────────────
 *
 *   id, label, hint          what it is called
 *   capabilities             what it can carry — options, follow-ups, marks
 *   createConfig()           a fresh, usable configuration
 *   toStored(config, ctx)    config -> the stored document's shape
 *   fromStored(stored, ctx)  and back
 *   validate(config, ctx)    what is wrong with it, in the author's words
 *   refs(config, ctx)        the value references this instance exposes
 *
 * The UI half — the authoring editor and the respondent renderer — lives in
 * `./ui`, keyed by the same id. Split because everything above is pure: the
 * serializer, the validator and the reference resolver all import this file and
 * none of them may import React.
 *
 * ── WHY IT IS DEFINED AT THE SUB-ANSWER LEVEL ─────────────────────────────
 *
 * Measured across the 322 imported questions:
 *
 *   top-level answerType     RadioButton  322      — no variation at all
 *   sub-answer type          CheckBox 569 · Text 402 · Grid 177
 *                            · RadioButton 38 · Button 4
 *
 * The variety is entirely one level down. A registry written for the top level
 * — which is what existed before — was describing a field that never varies,
 * while the level that does vary was handled by seven hardcoded
 * `subAnswerTypes === 'Grid'` checks spread across the serializer, the
 * validator, the form reducer and a component.
 *
 * The same contract still applies at the top level. It has one implementation
 * there today; a client who needs a matrix or a ranking question gets it
 * without a second mechanism.
 *
 * ── ADDING A TYPE ─────────────────────────────────────────────────────────
 *
 * One file here, one entry in `./ui`, and nothing else changes. That is the
 * whole point: before this, a type that needed its own configuration — as Grid
 * does — had to be special-cased in four files, and missing one produced a type
 * that saved but did not load.
 */

import text from './text';
import checkbox from './checkbox';
import radio from './radio';
import grid from './grid';
import button from './button';

export const TYPES = [radio, checkbox, text, grid, button];

const BY_ID = new Map(TYPES.map((t) => [t.id, t]));

/**
 * A type that behaves, for something the registry has never heard of.
 *
 * Returning `undefined` would make every call site responsible for the case,
 * and the one that forgot would throw while rendering a stored question. A
 * question authored against a type that was later removed stays readable.
 */
const UNKNOWN = {
  id: '',
  label: 'Unknown',
  hint: '',
  unknown: true,
  capabilities: { hasOptions: false, allowsSubAnswer: true, allowsScore: true, allowsInputMode: true },
  createConfig: () => null,
  toStored: () => ({}),
  fromStored: () => null,
  validate: (config, ctx) => [`“${ctx?.typeId || 'this type'}” is not a type this system knows`],
  refs: () => [],
};

export function getType(id) {
  return BY_ID.get(id) || { ...UNKNOWN, id: id || '', label: id || 'Unknown' };
}

export const TYPE_IDS = TYPES.map((t) => t.id);

/** Options for a type picker. */
export const typeOptions = () => TYPES.map((t) => ({ value: t.id, label: t.label }));

/* ── capability helpers ────────────────────────────────────────────────── */

const cap = (id, name) => !!getType(id).capabilities?.[name];

export const typeHasOptions = (id) => cap(id, 'hasOptions');
export const typeAllowsSubAnswer = (id) => cap(id, 'allowsSubAnswer');
export const typeAllowsScore = (id) => cap(id, 'allowsScore');
export const typeAllowsInputMode = (id) => cap(id, 'allowsInputMode');

/** Does this type keep a configuration of its own? Grid does; Text does not. */
export const typeHasConfig = (id) => getType(id).createConfig() !== null;

/**
 * Input mode — text, numeric or upload — is orthogonal to the type.
 *
 * Stored as three mutually-exclusive booleans and modelled here as one choice,
 * so the impossible "text and numeric at once" cannot be authored. Measured
 * usage: none 738, text 332, numeric 116.
 */
export const INPUT_MODES = [
  { value: '', label: 'None — label only' },
  { value: 'text', label: 'Text input' },
  { value: 'numeric', label: 'Numeric input' },
  { value: 'upload', label: 'Upload' },
];

/** How the assessor marks an option group. */
export const ASSESSOR_OPTION_TYPES = [
  { value: '', label: 'None' },
  { value: 'radio', label: 'Radio — assessor picks one' },
  { value: 'checkbox', label: 'Checkbox — assessor ticks many' },
];
