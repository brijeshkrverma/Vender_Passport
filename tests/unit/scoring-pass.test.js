import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Run a snippet in a real CommonJS Node process.
 *
 * The claim under test is precisely "the CommonJS server can load these ES
 * modules". Vitest is not that environment — it installs its own resolver, and
 * asserting the loader inside it would be testing Vitest. So these go through
 * an actual `node` process, which is where the server runs.
 */
const inNode = (snippet) => execFileSync(
  process.execPath, ['-e', snippet], { cwd: ROOT, encoding: 'utf8' }
).trim();

/**
 * The engines are ES modules because the authoring screen imports them
 * directly — an author's live preview and the real score have to come from the
 * same code. The server is CommonJS. These tests hold the bridge in place,
 * because the alternative everyone reaches for is a second copy of the scoring
 * logic, and two copies of a scoring rule drift into two different answers to
 * "what did this vendor score".
 */
describe('loading ES-module engines into a CommonJS server', () => {
  it('resolves every module the scoring pass needs', () => {
    const out = inNode(`
      require('./backend/scoring/loader').loadEngines().then((e) => {
        console.log([
          typeof e.markEngines.evaluateRule,
          typeof e.gridFormula.evaluateFormulas,
          typeof e.trendRule.evaluateTrendRule,
          typeof e.valueRef.buildCatalog,
          typeof e.valueRef.orderRules,
        ].join(','));
      });
    `);
    expect(out).toBe('function,function,function,function,function');
  });

  it('actually runs a rule under Node, not just imports it', () => {
    const out = inNode(`
      require('./backend/scoring/loader').loadEngines().then((e) => {
        const r = e.markEngines.evaluateRule({ engine: 'fixed', config: { marks: 40 } }, { maxMark: 100 });
        console.log(r.marks + '|' + r.trace.length);
      });
    `);
    expect(out).toBe('40|1');
  });

  it('imports once however many callers ask', () => {
    const out = inNode(`
      const { loadEngines } = require('./backend/scoring/loader');
      Promise.all([loadEngines(), loadEngines()]).then(([a, b]) => console.log(a === b));
    `);
    expect(out).toBe('true');
  });

  it('reports a failure instead of taking the server down with it', () => {
    // Everything except scoring works without these; refusing to boot over it
    // would turn one broken feature into an outage.
    const out = inNode(`
      require('./backend/scoring/loader').warmUp().then((r) => console.log(r.ok + '|' + r.engines));
    `);
    expect(out).toBe('true|6');
    expect(read('server.js')).toMatch(/Scoring engines unavailable/);
  });

  it('imports by file URL, which is what makes it work on Windows', () => {
    // `import('D:\\...')` parses the drive letter as a URL scheme and fails.
    expect(read('backend/scoring/loader.js')).toMatch(/pathToFileURL/);
  });
});

/**
 * Ordering inside the pass. These read the source because the guarantees are
 * about sequence and effect, which a single call's return value cannot show.
 */
describe('the scoring pass', () => {
  const service = read('backend/modules/questionnaires/scoring.service.js');

  it('fills formula cells before it scores', () => {
    // A mark rule may read a computed cell. The other order scores the blank.
    const formulasAt = service.indexOf('evaluateFormulas');
    const marksAt = service.indexOf('evaluateRule');
    expect(formulasAt).toBeGreaterThan(-1);
    expect(formulasAt).toBeLessThan(marksAt);
  });

  it('scores in dependency order and reports cycles', () => {
    // A rule may read another question's mark, so the order questions come back
    // in is not the order they can be scored in.
    expect(service).toMatch(/orderRules/);
    expect(service).toMatch(/depend on each other and were not scored/);
  });

  it('leaves a mark an assessor set by hand', () => {
    // A rule quietly replacing a human decision is worse than a rule that never
    // ran — the assessor would have no way to tell it happened.
    expect(service).toMatch(/response\.overridden/);
    expect(service).toMatch(/assessor override/);
  });

  it('loads the submission once rather than fetching each dependency', () => {
    // Fetching on demand would be an N+1 against the collection this whole
    // model exists to keep small.
    const perQuestionFinds = service.match(/await Question\.find/g) || [];
    expect(perQuestionFinds.length).toBe(1);
  });

  it('supports a dry run that writes nothing', () => {
    // So the effect of changing a rule can be seen before it touches a score
    // somebody has already been given.
    expect(service).toMatch(/dryRun/);
    expect(service).toMatch(/if \(!dryRun\)/);
  });

  it('rebuilds the submission totals after writing marks', () => {
    expect(service).toMatch(/recomputeTotals/);
  });

  it('stores the working, it does not recompute it on demand', () => {
    // A rule edited next month must not change the explanation attached to a
    // score awarded last month.
    expect(service).toMatch(/scoreTrace/);
    expect(service).toMatch(/scoredAt/);
    expect(read('backend/modules/questionnaires/response.model.js'))
      .toMatch(/scoreTrace/);
  });
});
