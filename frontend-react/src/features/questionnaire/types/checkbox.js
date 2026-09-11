/**
 * A tick-box follow-up. The most common sub-answer type — 569 of 1186.
 *
 * Like Text it has no configuration of its own: the label is the question and
 * the answer is whether it was ticked. Marks come from the assessor options
 * hanging off it, which every type shares.
 */
export default {
  id: 'CheckBox',
  label: 'CheckBox',
  hint: 'A single tick box',

  capabilities: {
    hasOptions: false,
    allowsSubAnswer: true,
    allowsScore: true,
    allowsInputMode: true,
  },

  createConfig: () => null,
  toStored: () => ({}),
  fromStored: () => null,
  validate: () => [],

  refs: (config, { inputMode, answerKey, subKey } = {}) => (
    inputMode ? [{ kind: 'input', answerKey, subKey }] : []
  ),
};
