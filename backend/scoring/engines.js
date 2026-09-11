/**
 * The names of the scoring engines a question may use.
 *
 * The implementations live in
 * `frontend-react/src/features/questionnaire/services/markEngines.js`, which is
 * an ES module; this file is CommonJS and Node 20 cannot `require()` one. So
 * the route validates the envelope — is this a real engine, and is its config
 * an object — while the engine's own `validate()` checks the config's contents
 * in the authoring screen.
 *
 * `tests/unit/scoring-parity.test.js` asserts this list matches the registry,
 * so an engine cannot be added on one side only. That is the same guard the
 * frontend/backend role lists use, and for the same reason: two copies of a
 * list drift, and the drift is only visible as a bug.
 *
 * When the server-side scoring pass is built, the registry moves to a shared
 * ES module and both sides import it; at that point this list and the parity
 * test go away.
 */
const ENGINE_IDS = [
  'optionSum',
  'fixed',
  'passthrough',
  'numericBand',
  'gridLookup',
  'gridCompleteness',
];

module.exports = { ENGINE_IDS };
