/**
 * An action button. Stores nothing.
 *
 * Four exist in the corpus, and they are the reason this file is here rather
 * than the type being dropped: all four sit under answers whose `subAnswer`
 * flag reads "no", so the serializer used to discard them on read — silently,
 * because a dropped follow-up looks exactly like one that never existed.
 *
 * It is also the type that was stored but never offered in the old authoring
 * dropdown, which is how it stayed invisible.
 */
export default {
  id: 'Button',
  label: 'Button',
  hint: 'An action button — captures nothing',

  capabilities: {
    hasOptions: false,
    allowsSubAnswer: false,
    allowsScore: false,
    allowsInputMode: false,
  },

  createConfig: () => null,
  toStored: () => ({}),
  fromStored: () => null,
  validate: () => [],
  refs: () => [],
};
