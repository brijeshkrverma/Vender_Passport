/**
 * ANSWER TYPE REGISTRY — the single place a question type is defined.
 *
 * The Angular original hardcoded five types in a component array and then
 * re-checked those same five strings by name across the scoring service, the
 * render component and the assessor view. Adding a sixth type meant editing
 * every one of those places, and missing one produced a type that rendered but
 * never scored — which is exactly what happened to `Button`: it exists in the
 * stored data but never appeared in the authoring dropdown.
 *
 * Here a type declares its *capabilities* instead, and every consumer asks the
 * registry rather than comparing strings. Adding a type is one object.
 */

/**
 * capability flags
 *   hasOptions      — the author defines a list of answers (radio, checkbox…)
 *   allowsSubAnswer — an option can open a nested follow-up block
 *   allowsScore     — an option carries marks
 *   isGrid          — the block is a table; needs the grid builder
 *   captures        — what the respondent submits, for the renderer
 */
export const ANSWER_TYPES = [
  {
    id: 'RadioButton', label: 'RadioButton', hint: 'Single choice from a list',
    hasOptions: true, allowsSubAnswer: true, allowsScore: true, isGrid: false, captures: 'single',
  },
  {
    id: 'CheckBox', label: 'CheckBox', hint: 'Multiple choices from a list',
    hasOptions: true, allowsSubAnswer: true, allowsScore: true, isGrid: false, captures: 'multiple',
  },
  {
    id: 'Text', label: 'Text', hint: 'Free text answer',
    hasOptions: false, allowsSubAnswer: true, allowsScore: true, isGrid: false, captures: 'text',
  },
  {
    id: 'Upload', label: 'Upload', hint: 'Document or evidence upload',
    hasOptions: false, allowsSubAnswer: true, allowsScore: true, isGrid: false, captures: 'file',
  },
  {
    id: 'Grid', label: 'Grid', hint: 'Table of rows and columns',
    hasOptions: true, allowsSubAnswer: true, allowsScore: true, isGrid: true, captures: 'grid',
  },
  {
    // Present in stored sub-answers but absent from the Angular dropdown, so
    // those blocks could be read but never re-authored.
    id: 'Button', label: 'Button', hint: 'Action button (no stored value)',
    hasOptions: false, allowsSubAnswer: false, allowsScore: false, isGrid: false, captures: 'none',
  },
];

export const SUB_ANSWER_TYPES = ANSWER_TYPES;

const BY_ID = new Map(ANSWER_TYPES.map((t) => [t.id, t]));

/**
 * Look up a type. Returns a permissive fallback rather than undefined so a
 * question authored against a type that was later removed still renders.
 */
export function getAnswerType(id) {
  return BY_ID.get(id) || {
    id: id || '', label: id || 'Unknown', hint: '',
    hasOptions: true, allowsSubAnswer: true, allowsScore: true, isGrid: false,
    captures: 'text', unknown: true,
  };
}

export const typeAllowsOptions = (id) => getAnswerType(id).hasOptions;
export const typeAllowsSubAnswer = (id) => getAnswerType(id).allowsSubAnswer;
export const typeIsGrid = (id) => getAnswerType(id).isGrid;

/**
 * How the assessor marks an option group.
 *
 * `radio` = one option scores; `checkbox` = every ticked option adds up. This
 * drives the scoring pass, so it belongs next to the type registry rather than
 * being inferred from the option count at read time.
 */
export const ASSESSOR_OPTION_TYPES = [
  { value: '', label: 'None' },
  { value: 'radio', label: 'Radio — assessor picks one' },
  { value: 'checkbox', label: 'Checkbox — assessor ticks many' },
];

/**
 * Input mode of a sub-answer row.
 *
 * Stored as three separate booleans (`isTypeText`, `isTypeNumericText`,
 * `isUploadText`) that are mutually exclusive in every stored row. Modelled
 * here as one choice and expanded back to the three flags on save, so an
 * impossible combination cannot be authored.
 */
export const INPUT_MODES = [
  { value: '', label: 'None — label only' },
  { value: 'text', label: 'Text input' },
  { value: 'numeric', label: 'Numeric input' },
  { value: 'upload', label: 'Upload' },
];

/** Cell editors available inside a grid column. */
export const GRID_CELL_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
];
