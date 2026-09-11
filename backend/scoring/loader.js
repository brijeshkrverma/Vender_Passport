const path = require('path');
const { pathToFileURL } = require('url');

/**
 * LOADS THE SCORING ENGINES INTO THE SERVER.
 *
 * ── THE PROBLEM ───────────────────────────────────────────────────────────
 *
 * The engines are ES modules, written that way because the authoring screen
 * imports them directly — an author's live preview and the real score have to
 * come from the same code, or the preview is a guess.
 *
 * The server is CommonJS, and CommonJS cannot `require()` an ES module.
 *
 * ── WHY THIS AND NOT THE OBVIOUS ALTERNATIVES ─────────────────────────────
 *
 *   Port the engines to CJS      Two copies of the scoring logic. They would
 *                                drift, and the drift would show up as a score
 *                                that differs between what the author was shown
 *                                and what the vendor was given — the single
 *                                worst failure this system can have.
 *
 *   Convert the whole backend    A large change to twenty modules to solve a
 *   to ESM                       problem in one of them.
 *
 *   Add a build step             A compiled copy is still a second copy, plus a
 *                                build that can be stale.
 *
 * CommonJS cannot `require()` an ES module, but it *can* `await import()` one.
 * So the engines are loaded once, asynchronously, and cached. One copy, no
 * build step, and `tests/unit/mark-engines.test.js` already guards the one
 * thing still duplicated — the list of engine names the route validates against.
 *
 * ── WHY THE IMPORT IS A FILE URL ──────────────────────────────────────────
 *
 * `import()` of a bare Windows path fails: `D:\...` parses as a URL scheme.
 * `pathToFileURL` is the portable form.
 */

const FEATURE_DIR = path.join(
  __dirname, '..', '..', 'frontend-react', 'src', 'features', 'questionnaire');

const MODULES = {
  markEngines: 'services/markEngines.js',
  gridFormula: 'services/gridFormula.js',
  trendRule: 'services/trendRule.js',
  valueRef: 'services/valueRef.js',
  answerValue: 'services/answerValue.js',
  questionTypes: 'config/questionTypes.js',
};

let cache = null;
let loading = null;

/**
 * Resolve every engine module once.
 *
 * The in-flight promise is cached as well as the result, so a burst of requests
 * at startup does not import the same modules several times over.
 */
function loadEngines() {
  if (cache) return Promise.resolve(cache);
  if (loading) return loading;

  loading = (async () => {
    const entries = await Promise.all(
      Object.entries(MODULES).map(async ([name, rel]) => {
        const url = pathToFileURL(path.join(FEATURE_DIR, rel)).href;
        return [name, await import(url)];
      })
    );
    cache = Object.fromEntries(entries);
    return cache;
  })();

  return loading;
}

/** Warm the cache at boot so the first scored submission is not the one that pays. */
async function warmUp() {
  try {
    const engines = await loadEngines();
    return { ok: true, engines: engines.markEngines.ENGINE_IDS.length };
  } catch (e) {
    // Not fatal: everything except scoring works without these, and a server
    // that refuses to start over it would take the whole product down.
    return { ok: false, error: e.message };
  }
}

module.exports = { loadEngines, warmUp, FEATURE_DIR };
