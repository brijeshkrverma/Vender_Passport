/**
 * Dashboard builder loader.
 *
 * KYA KARTA HAI
 *   `linking-dashboard-data.service.ts` me se do cheezein nikaalta hai —
 *   `clonedData` ka initial shape, aur `filterQuestionaireMarksForAssessor`
 *   function — aur unhe Angular ke bina chalane layak bana deta hai.
 *
 * YE ITNA ZAROORI KYUN HAI
 *   Us file ka `filterQuestionaireMarksForAssessor` naam se scoring function
 *   lagta hai, lekin actually wo poora sourcing/VCP dashboard banata hai:
 *   ~566 lines, aur usme `this.clonedData` par 113 assignments hain
 *   (certificate marks, scope1/2/3 emissions, compare charts, VCP names,
 *   women percentage). Uska caller (line ~587) return value PHENK deta hai
 *   aur `this.clonedData` return karta hai — yaani function ka poora maqsad
 *   side effect hai.
 *
 *   Ye values DB me kahin store nahi hoti, runtime pe banti hain. Isliye koi
 *   bhi DB-padhne wali baseline script inhe capture nahi kar sakti, aur is
 *   function ko "consolidate" ya "pure" karne ka risk kisi score-baseline se
 *   pakda nahi jayega. Ye loader us gap ko bharta hai.
 *
 * SAFE HAI
 *   Source file sirf padhta hai. Angular load nahi hota. Verify kiya gaya ki
 *   ye function sirf `this.clonedData` par depend karta hai — koi injected
 *   service use nahi hoti.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SERVICE_TS = path.join(
  __dirname, '..', '..', '..',
  'src', 'app', 'dashboard', 'dashboard-components', 'linking-dashboard-data.service.ts'
);

const CLONED_DATA_RE = /^\s{2}clonedData\s*:/;
const FN_RE = /^\s{2}filterQuestionaireMarksForAssessor\s*\(/;

/**
 * Brace-match karke ek block ka end nikaalta hai (strings/comments skip karte hue).
 *
 * SIRF `{` `}` count karta hai, `[` `]` nahi — kyunki method signature me
 * `(data: any[]): any[]` hota hai aur brackets ko count karne se block usi
 * line pe "khatam" ho jata tha.
 */
function findBlockEnd(lines, startIdx) {
  let depth = 0;
  let started = false;
  let inBlockComment = false;

  for (let i = startIdx; i < lines.length; i += 1) {
    const line = lines[i];
    let inStr = null;
    let escaped = false;

    for (let c = 0; c < line.length; c += 1) {
      const ch = line[c];
      const next = line[c + 1];

      if (inBlockComment) {
        if (ch === '*' && next === '/') { inBlockComment = false; c += 1; }
        continue;
      }
      if (inStr) {
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '/' && next === '/') break;
      if (ch === '/' && next === '*') { inBlockComment = true; c += 1; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }

      if (ch === '{') { depth += 1; started = true; }
      else if (ch === '}') {
        depth -= 1;
        if (started && depth === 0) return i;
      }
    }
  }
  return -1;
}

function findLine(lines, re) {
  for (let i = 0; i < lines.length; i += 1) if (re.test(lines[i])) return i;
  return -1;
}

/**
 * Dashboard builder load karta hai.
 * @returns {{ build: (data:any[]) => object, _meta: object }}
 *          `build(data)` ek FRESH instance pe function chalata hai aur uska
 *          clonedData return karta hai (accumulate nahi hota).
 */
function loadDashboardBuilder({ silent = true } = {}) {
  if (!fs.existsSync(SERVICE_TS)) {
    throw new Error(`Dashboard service nahi mili: ${SERVICE_TS}`);
  }
  const lines = fs.readFileSync(SERVICE_TS, 'utf8').split(/\r?\n/);

  const cdStart = findLine(lines, CLONED_DATA_RE);
  if (cdStart === -1) throw new Error('clonedData declaration nahi mili');
  const cdEnd = findBlockEnd(lines, cdStart);
  if (cdEnd === -1) throw new Error('clonedData ka end nahi mila');

  const fnStart = findLine(lines, FN_RE);
  if (fnStart === -1) throw new Error('filterQuestionaireMarksForAssessor nahi mila');
  let fnEnd = findBlockEnd(lines, fnStart);
  if (fnEnd === -1) fnEnd = lines.length - 1; // file ke end tak chalta hai

  // clonedData ki declaration line ko semicolon se band karna zaroori hai
  const clonedBlock = lines.slice(cdStart, cdEnd + 1).join('\n').replace(/;?\s*$/, ';');
  const fnBlock = lines.slice(fnStart, fnEnd + 1).join('\n');

  const tsSource =
    `class DashboardBuilder {\n${clonedBlock}\n\n${fnBlock}\n}\nmodule.exports = DashboardBuilder;\n`;

  const js = ts.transpileModule(tsSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      useDefineForClassFields: false,
    },
  }).outputText;

  const moduleShim = { exports: {} };
  const quiet = silent
    ? { log() {}, warn() {}, error() {}, info() {}, debug() {} }
    : console;
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', 'console', js)(
    moduleShim, moduleShim.exports, require, quiet
  );

  const DashboardBuilder = moduleShim.exports;

  return {
    /** Fresh instance pe chalata hai taaki state carry na ho. */
    build(data) {
      const inst = new DashboardBuilder();
      inst.filterQuestionaireMarksForAssessor(data);
      return inst.clonedData;
    },
    _meta: {
      source: SERVICE_TS,
      clonedData: { startLine: cdStart + 1, endLine: cdEnd + 1, lines: cdEnd - cdStart + 1 },
      fn: { startLine: fnStart + 1, endLine: fnEnd + 1, lines: fnEnd - fnStart + 1 },
    },
  };
}

module.exports = { loadDashboardBuilder, SERVICE_TS };
