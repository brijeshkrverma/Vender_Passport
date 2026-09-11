/**
 * Frontend scoring loader — Angular ke bina FE ka scoring code chalane ke liye.
 *
 * KYA KARTA HAI
 *   `src/app/services/utility/utility.service.ts` me se scoring wale 5 members
 *   nikaalta hai, TypeScript se JavaScript me transpile karta hai, aur ek plain
 *   object return karta hai jispe wahi functions call kiye ja sakte hain.
 *
 * KYUN ZAROORI HAI
 *   FE aur BE ka scoring alag-alag likha hua hai aur drift kar chuka hai. Unhe
 *   compare karne ke liye dono ko *chalana* padta hai — sirf code padhna kaafi
 *   nahi. FE ka code TypeScript + Angular service hai, isliye ye loader chahiye.
 *
 * YE KAISE SAFE HAI
 *   - Source file ko sirf PADHTA hai, kabhi likhta nahi
 *   - Angular ka kuch load nahi hota
 *   - Nikale gaye functions sirf `this.calculateOptionMarks` par depend karte hain
 *     (verify kiya gaya — koi injected service use nahi hoti), isliye inhe class
 *     se alag karke chalana behaviour-identical hai
 *
 * ISTEMAAL
 *   const { loadFrontendScoring } = require('./lib/fe-scoring-loader');
 *   const fe = loadFrontendScoring();
 *   const out = fe.filterQuestionaireMarksForAssessor([{ answers }]);
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const UTILITY_TS = path.join(
  __dirname, '..', '..', '..',
  'src', 'app', 'services', 'utility', 'utility.service.ts'
);

/** Shared rule engine — FE aur BE dono isi ko use karte hain. */
const RULE_ENGINE_PATH = path.join(
  __dirname, '..', '..', '..',
  'src', 'app', 'shared', 'scoring', 'rule-engines.js'
);

/** Jo members nikaalne hain — inhi par FE ka scoring khada hai. */
const MEMBERS = [
  'calculateOptionMarks',
  'filterQuestionaireMarks',
  'filterQuestionaireMarksForAssessor',
  'filterQuestionaireMarksForAssessorYear2024',
  'filterQuestionaireMarksOnlyForAssessor',
];

/**
 * Ek member ka start line dhoondhta hai. Line numbers hardcode nahi kiye —
 * naam se dhoondte hain, taaki file badalne par bhi kaam karta rahe.
 */
function findMemberStart(lines, name) {
  const re = new RegExp(`^\\s{2}${name}\\s*[(=]`);
  for (let i = 0; i < lines.length; i += 1) {
    if (re.test(lines[i])) return i;
  }
  return -1;
}

/**
 * Start line se brace-match karke member ka end line nikaalta hai.
 * String literals, template literals aur comments ko skip karta hai taaki
 * unke andar ke braces count na hon.
 */
function findMemberEnd(lines, startIdx) {
  let depth = 0;
  let started = false;
  let inBlockComment = false;

  for (let i = startIdx; i < lines.length; i += 1) {
    const line = lines[i];
    let inStr = null;      // ', " ya `
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
      if (ch === '/' && next === '/') break;               // line comment
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

/** Source se saare scoring members ka raw TypeScript nikaalta hai. */
function extractMembers() {
  if (!fs.existsSync(UTILITY_TS)) {
    throw new Error(`Frontend scoring file nahi mili: ${UTILITY_TS}`);
  }
  const lines = fs.readFileSync(UTILITY_TS, 'utf8').split(/\r?\n/);

  const blocks = [];
  const found = [];
  const missing = [];

  for (const name of MEMBERS) {
    const start = findMemberStart(lines, name);
    if (start === -1) { missing.push(name); continue; }
    const end = findMemberEnd(lines, start);
    if (end === -1) { missing.push(`${name} (end nahi mila)`); continue; }
    blocks.push(lines.slice(start, end + 1).join('\n'));
    found.push({ name, startLine: start + 1, endLine: end + 1, lines: end - start + 1 });
  }

  if (missing.length) {
    throw new Error(
      `utility.service.ts me ye members nahi mile: ${missing.join(', ')}. ` +
      `Shayad function ka naam badal gaya hai — fe-scoring-loader.js ka MEMBERS array update karo.`
    );
  }
  return { blocks, found };
}

/**
 * FE ka scoring load karke ek chalane-layak object deta hai.
 * @returns {{ filterQuestionaireMarks: Function,
 *             filterQuestionaireMarksForAssessor: Function,
 *             filterQuestionaireMarksForAssessorYear2024: Function,
 *             filterQuestionaireMarksOnlyForAssessor: Function,
 *             calculateOptionMarks: Function,
 *             _meta: object }}
 */
function loadFrontendScoring({ silent = true } = {}) {
  const { blocks, found } = extractMembers();

  // Nikale gaye functions ab `evaluateRule` use karte hain (admin-configured
  // scoring rules ka hook). Wo utility.service.ts ke top pe import hota hai, par
  // hum sirf class members nikaal rahe hain — isliye usse yahan scope me dena
  // padta hai, warna ReferenceError aayega.
  //
  // Ye WAHI module hai jo backend use karta hai, isliye is loader se chalne wala
  // FE aur asli BE ek hi rule engine pe chalte hain — comparison imaandaar rehta hai.
  const tsSource =
    `const { evaluateRule } = require(${JSON.stringify(RULE_ENGINE_PATH)});\n` +
    `class FeScoring {\n${blocks.join('\n\n')}\n}\nmodule.exports = FeScoring;\n`;

  const js = ts.transpileModule(tsSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      removeComments: false,
      useDefineForClassFields: false,
    },
  }).outputText;

  const moduleShim = { exports: {} };
  // eslint-disable-next-line no-new-func
  const factory = new Function('module', 'exports', 'require', 'console', js);

  // FE code me kai console.warn/log hain — unhe chup karana hai warna output
  // hazaaron lines ka ho jayega.
  const quietConsole = silent
    ? { log() {}, warn() {}, error() {}, info() {}, debug() {} }
    : console;

  factory(moduleShim, moduleShim.exports, require, quietConsole);

  const FeScoring = moduleShim.exports;
  const instance = new FeScoring();

  const api = {};
  for (const { name } of found) {
    api[name] = typeof instance[name] === 'function'
      ? instance[name].bind(instance)
      : instance[name];
  }
  api._meta = { source: UTILITY_TS, members: found };
  return api;
}

module.exports = { loadFrontendScoring, MEMBERS, UTILITY_TS };
