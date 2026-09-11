/**
 * A free-text follow-up. 402 of the 1186 stored sub-answers.
 *
 * It carries no configuration: what the respondent gets is decided by the
 * orthogonal input mode (text / numeric / upload), not by the type. That is
 * why `createConfig` returns null — the absence is the point, and
 * `typeHasConfig` reads it.
 */
export default {
  id: 'Text',
  label: 'Text',
  hint: 'A written answer',

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

  /**
   * A typed value is referenceable — a formula or a mark rule can read it.
   * Only when there is somewhere to type: a label-only row holds nothing.
   */
  refs: (config, { inputMode, answerKey, subKey } = {}) => (
    inputMode ? [{ kind: 'input', answerKey, subKey }] : []
  ),
};
