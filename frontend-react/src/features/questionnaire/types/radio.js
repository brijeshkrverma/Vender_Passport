/**
 * A single choice from a list.
 *
 * The only type used at the top level — all 322 imported questions are this —
 * and 38 sub-answers as well. `hasOptions` is what makes the answer list appear:
 * before the contract, that was decided by comparing the type's name.
 */
export default {
  id: 'RadioButton',
  label: 'RadioButton',
  hint: 'One choice from a list',

  capabilities: {
    hasOptions: true,
    allowsSubAnswer: true,
    allowsScore: true,
    allowsInputMode: true,
  },

  createConfig: () => null,
  toStored: () => ({}),
  fromStored: () => null,
  validate: (config, { options = [] } = {}) => (
    // A choice question with nothing to choose from cannot be answered. The
    // original let this save; the failure surfaced to the respondent.
    options.length === 0 ? ['This needs at least one option'] : []
  ),

  refs: (config, { answerKey, subKey, inputMode } = {}) => (
    inputMode ? [{ kind: 'input', answerKey, subKey }] : []
  ),
};
