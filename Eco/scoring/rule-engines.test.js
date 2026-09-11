/**
 * RULE ENGINE — golden-master test.
 *
 * MAQSAD
 *   Sabit karna ki naya configurable engine un 5 hardcoded rules ka behaviour
 *   BILKUL waisa hi deta hai jaisa aaj utility.service.ts / MarkService.js dete
 *   hain. Iske bina rules ko data me le jaana andaza hoga, migration nahi.
 *
 *   Har rule ke liye purani logic yahan hu-ba-hu dobara likhi gayi hai (ORIGINAL
 *   section) aur engine ke output se compare ki gayi hai — sirf ek-do value pe
 *   nahi, poori range pe.
 *
 * CHALANA
 *   node Backend/scoring/rule-engines.test.js
 *   exit 0 = sab pass, exit 1 = koi fail
 */

const { evaluateRule, validateRule } = require('./rule-engines');

let pass = 0, fail = 0;
const failures = [];

function check(name, expected, actual) {
  if (expected === actual) { pass += 1; return; }
  fail += 1;
  failures.push(`${name}: expected ${expected}, mila ${actual}`);
}

function answerWithNumerics(values) {
  return { answer: [{ subanswar: values.map((v) => ({ numericTypeVal: v })) }] };
}

// ===========================================================================
// RULE 1 — 682d81292a6c6172273ceb9f
// ORIGINAL (utility.service.ts:702-711):
//   if (Number(sub.numericTypeVal) == 0)      subScore = 50
//   else if (Number(sub.numericTypeVal) > 0)  subScore = 0
// ===========================================================================
function original_682d8129(v) {
  const n = Number(v);
  if (n === 0) return 50;
  if (n > 0) return 0;
  return 0;
}
const rule_682d8129 = {
  engine: 'numericBand',
  config: {
    inputs: [{ path: 'answer[0].subanswar[0].numericTypeVal' }],
    bands: [
      { min: null, max: 0, marks: 50 },
      { min: 0.000001, max: null, marks: 0 },
    ],
    aggregate: 'sum',
  },
};
for (const v of [0, 1, 5, 15, 20, 30, 40, 100, '0', '12', '', null]) {
  const ctx = { answer: answerWithNumerics([v]).answer[0], maxMark: 100 };
  ctx.answer = answerWithNumerics([v]);
  const got = evaluateRule(rule_682d8129, { answer: ctx.answer, maxMark: 100 }).marks;
  check(`682d8129 (v=${JSON.stringify(v)})`, original_682d8129(v === '' || v === null ? 0 : v), got);
}

// ===========================================================================
// RULE 2 — 682d863f2a6c6172273cedb4  (2 numeric inputs)
// ORIGINAL (utility.service.ts:742-782):
//   >30 -> 0 ; 21-30 -> 15 ; 16-20 -> 25 ; 1-15 -> 50 ; per input, phir sum
// ===========================================================================
function band_863f(n) {
  let m = 0;
  if (n > 30) m += 0;
  if (n > 20 && n <= 30) m += 15;
  if (n > 15 && n <= 20) m += 25;
  if (n >= 1 && n <= 15) m += 50;
  return m;
}
function original_682d863f(a, b) { return band_863f(Number(a)) + band_863f(Number(b)); }
const rule_682d863f = {
  engine: 'numericBand',
  config: {
    inputs: [
      { path: 'answer[0].subanswar[0].numericTypeVal' },
      { path: 'answer[0].subanswar[1].numericTypeVal' },
    ],
    bands: [
      { min: 1, max: 15, marks: 50 },
      { min: 15.000001, max: 20, marks: 25 },
      { min: 20.000001, max: 30, marks: 15 },
      { min: 30.000001, max: null, marks: 0 },
    ],
    aggregate: 'sum',
  },
};
for (const a of [0, 1, 10, 15, 16, 20, 21, 30, 31, 50]) {
  for (const b of [0, 5, 15, 18, 25, 40]) {
    const got = evaluateRule(rule_682d863f, { answer: answerWithNumerics([a, b]), maxMark: 100 }).marks;
    check(`682d863f (${a},${b})`, original_682d863f(a, b), got);
  }
}

// ===========================================================================
// RULE 3 — 682d876c2a6c6172273cee6f  (3 numeric inputs)
// ORIGINAL (utility.service.ts:786-851):
//   >=40 -> 40 ; 20-39 -> 20 ; 5-19 -> 10 ; <5 -> 0 ; per input, phir sum
// ===========================================================================
function band_876c(n) {
  let m = 0;
  if (n >= 40) m += 40;
  if (n >= 20 && n <= 39) m += 20;
  if (n >= 5 && n <= 19) m += 10;
  if (n < 5) m += 0;
  return m;
}
function original_682d876c(a, b, c) { return band_876c(Number(a)) + band_876c(Number(b)) + band_876c(Number(c)); }
const rule_682d876c = {
  engine: 'numericBand',
  config: {
    inputs: [
      { path: 'answer[0].subanswar[0].numericTypeVal' },
      { path: 'answer[0].subanswar[1].numericTypeVal' },
      { path: 'answer[0].subanswar[2].numericTypeVal' },
    ],
    bands: [
      { min: null, max: 4.999999, marks: 0 },
      { min: 5, max: 19, marks: 10 },
      { min: 20, max: 39, marks: 20 },
      { min: 40, max: null, marks: 40 },
    ],
    aggregate: 'sum',
  },
};
for (const a of [0, 4, 5, 19, 20, 39, 40, 100]) {
  for (const b of [0, 10, 25, 45]) {
    for (const c of [0, 7, 50]) {
      const got = evaluateRule(rule_682d876c, { answer: answerWithNumerics([a, b, c]), maxMark: 200 }).marks;
      check(`682d876c (${a},${b},${c})`, original_682d876c(a, b, c), got);
    }
  }
}

// ===========================================================================
// RULE 4 — 682c2cfd485482741b9ce8c3  (grid cell lookup)
// ORIGINAL (utility.service.ts:578-604):
//   grid[1]['10'] == 'Inventory sheets' && (11|12|13 me koi value) -> 80
//   grid[1]['10'] == 'Software based'   && (11|12|13 me koi value) -> 100
// ===========================================================================
function original_682c2cfd(key, v11, v12, v13) {
  const k = String(key || '').trim();
  const any = !!(v11 || v12 || v13);
  if (k === 'Inventory sheets' && any) return 80;
  if (k === 'Software based' && any) return 100;
  return 0;
}
const rule_682c2cfd = {
  engine: 'gridLookup',
  config: {
    subIndex: 0,
    keyCell: { row: 1, col: 0 },
    rules: [
      { keyEquals: 'Inventory sheets', requiresAnyValueIn: [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }], marks: 80 },
      { keyEquals: 'Software based', requiresAnyValueIn: [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }], marks: 100 },
    ],
    fallbackMarks: 0,
  },
};
function gridAnswer(key, v11, v12, v13) {
  return {
    subanswar: [{
      subAnswerTypes: 'Grid',
      grid: {
        gridValue: [
          { '00': { val: 'header' } },
          { 10: { val: key }, 11: { val: v11 }, 12: { val: v12 }, 13: { val: v13 } },
        ],
      },
    }],
  };
}
const gridCases = [
  ['Inventory sheets', '5', '', ''],
  ['Inventory sheets', '', '', ''],
  ['Software based', '', '3', ''],
  ['Software based', '', '', ''],
  ['Something else', '9', '', ''],
  ['', '', '', ''],
];
for (const [k, a, b, c] of gridCases) {
  const ans = gridAnswer(k, a, b, c);
  const got = evaluateRule(rule_682c2cfd, { answer: ans, subanswar: ans.subanswar, maxMark: 100 }).marks;
  check(`682c2cfd ("${k}", ${a}|${b}|${c})`, original_682c2cfd(k, a, b, c), got);
}

// ===========================================================================
// RULE 5 — 682c46b1485482741b9ce9de  (passthrough)
// ORIGINAL (utility.service.ts:718-722):
//   obtendMark = Number(item.subanswar[0]['numericTypeVal'])
// ===========================================================================
function original_682c46b1(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
const rule_682c46b1 = { engine: 'passthrough', config: { path: 'answer[0].subanswar[0].numericTypeVal' } };
for (const v of [0, 1, 37, 100, '45', '']) {
  const got = evaluateRule(rule_682c46b1, { answer: answerWithNumerics([v]), maxMark: 1000 }).marks;
  check(`682c46b1 (v=${JSON.stringify(v)})`, original_682c46b1(v === '' ? 0 : v), got);
}

// ===========================================================================
// RULE 6 — fixed (StaticMark ke 27 overrides)
// ===========================================================================
for (const m of [0, 20, 50, 100]) {
  const got = evaluateRule({ engine: 'fixed', config: { marks: m } }, { maxMark: 100 }).marks;
  check(`fixed (${m})`, m, got);
}

// ===========================================================================
// RULE 7 — gridCompleteness, asli Q1 ke shape pe
// Question: "total revenue and output ... past three consecutive years"
// (682c268b485482741b9ce8b7) — 7 rows, col0 = label, col1..3 = teen financial year.
// Data rows 1-6 hain (row0 header hai).
// ===========================================================================
function q1Grid(fill) {
  // fill[r][c] = value for row r (1..6), col c (1..3)
  const rows = [{ '00': { val: '' }, '01': { val: 'FY 2022–23' }, '02': { val: 'FY 2023–24' }, '03': { val: 'FY 2024–25' } }];
  for (let r = 1; r <= 6; r += 1) {
    const row = {};
    row[`${r}0`] = { val: `Row ${r} label`, type: 'text' };
    for (let c = 1; c <= 3; c += 1) {
      row[`${r}${c}`] = { val: (fill[r] && fill[r][c] !== undefined) ? fill[r][c] : '', type: 'number' };
    }
    rows.push(row);
  }
  return [{ subAnswerTypes: 'Grid', grid: { gridValue: rows } }];
}
const ALL_ROWS = [1, 2, 3, 4, 5, 6], ALL_COLS = [1, 2, 3];
function fillAll(v) { const f = {}; ALL_ROWS.forEach((r) => { f[r] = {}; ALL_COLS.forEach((c) => { f[r][c] = v; }); }); return f; }

// mode 'all' — sab bhare to 100, ek bhi khali to 0
const ruleAll = { engine: 'gridCompleteness', config: { subIndex: 0, rows: ALL_ROWS, cols: ALL_COLS, mode: 'all', marks: 100 } };
{
  const full = fillAll('10');
  check('Q1 all: poora bhara', 100, evaluateRule(ruleAll, { subanswar: q1Grid(full), maxMark: 100 }).marks);

  const oneMissing = fillAll('10'); oneMissing[3][2] = '';
  check('Q1 all: ek cell khali', 0, evaluateRule(ruleAll, { subanswar: q1Grid(oneMissing), maxMark: 100 }).marks);

  check('Q1 all: bilkul khali', 0, evaluateRule(ruleAll, { subanswar: q1Grid({}), maxMark: 100 }).marks);

  // 0 ek valid jawab hai — khali nahi maana jaana chahiye
  const zeros = fillAll('0');
  check('Q1 all: sab 0 bhara (0 valid hai)', 100, evaluateRule(ruleAll, { subanswar: q1Grid(zeros), maxMark: 100 }).marks);
}

// mode 'proportional' — jitna bhara utne marks
const ruleProp = { engine: 'gridCompleteness', config: { subIndex: 0, rows: ALL_ROWS, cols: ALL_COLS, mode: 'proportional', marks: 100 } };
{
  const half = {}; [1, 2, 3].forEach((r) => { half[r] = { 1: '5', 2: '5', 3: '5' }; });
  check('Q1 proportional: 9/18 bhara', 50, evaluateRule(ruleProp, { subanswar: q1Grid(half), maxMark: 100 }).marks);
  check('Q1 proportional: poora bhara', 100, evaluateRule(ruleProp, { subanswar: q1Grid(fillAll('1')), maxMark: 100 }).marks);
  check('Q1 proportional: khali', 0, evaluateRule(ruleProp, { subanswar: q1Grid({}), maxMark: 100 }).marks);
}

// mode 'atLeast' — sirf revenue wali row zaroori
const ruleAtLeast = { engine: 'gridCompleteness', config: { subIndex: 0, rows: [1], cols: ALL_COLS, mode: 'atLeast', marks: 100, minFilled: 3 } };
{
  const onlyRev = { 1: { 1: '100', 2: '200', 3: '300' } };
  check('Q1 atLeast: teeno saal ka revenue', 100, evaluateRule(ruleAtLeast, { subanswar: q1Grid(onlyRev), maxMark: 100 }).marks);
  const twoYears = { 1: { 1: '100', 2: '200' } };
  check('Q1 atLeast: sirf 2 saal', 0, evaluateRule(ruleAtLeast, { subanswar: q1Grid(twoYears), maxMark: 100 }).marks);
}

// breakdown me kaunse cell khali the wo dikhna chahiye
{
  const oneMissing = fillAll('10'); oneMissing[2][3] = '';
  const r = evaluateRule(ruleAll, { subanswar: q1Grid(oneMissing), maxMark: 100 });
  const inp = r.applied[0].input;
  if (inp.filled === 17 && inp.total === 18 && inp.missing.indexOf('r2c3') >= 0) pass += 1;
  else { fail += 1; failures.push(`Q1 breakdown galat: ${JSON.stringify(inp)}`); }
}

// ===========================================================================
// GUARD RAILS — galat config save na ho paye
// ===========================================================================
const badConfigs = [
  ['unknown engine', { engine: 'nonsense', config: {} }],
  ['band bina marks', { engine: 'numericBand', config: { inputs: [{ path: 'a' }], bands: [{ min: 1, max: 5 }] } }],
  ['overlapping bands', { engine: 'numericBand', config: { inputs: [{ path: 'a' }], bands: [{ min: 1, max: 10, marks: 5 }, { min: 5, max: 20, marks: 9 }] } }],
  ['input bina path', { engine: 'numericBand', config: { inputs: [{}], bands: [{ min: 1, max: 5, marks: 5 }] } }],
  ['gridLookup bina keyCell', { engine: 'gridLookup', config: { rules: [{ keyEquals: 'x', marks: 5 }] } }],
  ['duplicate grid key', { engine: 'gridLookup', config: { keyCell: { row: 1, col: 0 }, rules: [{ keyEquals: 'x', marks: 5 }, { keyEquals: 'X', marks: 9 }] } }],
  ['passthrough bina path', { engine: 'passthrough', config: {} }],
  ['gridCompleteness bina rows', { engine: 'gridCompleteness', config: { cols: [1], marks: 100 } }],
  ['gridCompleteness bina marks', { engine: 'gridCompleteness', config: { rows: [1], cols: [1] } }],
  ['minFilled grid se bada', { engine: 'gridCompleteness', config: { rows: [1], cols: [1, 2], mode: 'atLeast', minFilled: 9, marks: 100 } }],
];
for (const [name, rule] of badConfigs) {
  const errs = validateRule(rule);
  if (errs.length > 0) pass += 1;
  else { fail += 1; failures.push(`guard "${name}": galat config pass ho gaya`); }
}

// valid config pe koi error nahi aana chahiye
for (const [name, rule] of [['682d876c', rule_682d876c], ['682c2cfd', rule_682c2cfd], ['682c46b1', rule_682c46b1]]) {
  const errs = validateRule(rule);
  if (errs.length === 0) pass += 1;
  else { fail += 1; failures.push(`valid config "${name}" reject ho gaya: ${errs.join('; ')}`); }
}

// rule ka score maxMark se upar na jaye
const capped = evaluateRule({ engine: 'fixed', config: { marks: 500 } }, { maxMark: 100 });
if (capped.marks === 100 && capped.warnings.length > 0) pass += 1;
else { fail += 1; failures.push('maxMark cap nahi laga'); }

// ---------------------------------------------------------------------------
console.log('');
console.log(`  Rule engine golden-master test`);
console.log(`  pass: ${pass}   fail: ${fail}`);
if (failures.length) {
  console.log('');
  failures.slice(0, 25).forEach((f) => console.log(`    ✖ ${f}`));
  console.log('');
  process.exit(1);
}
console.log('');
console.log('  ✅ Naya configurable engine purane hardcoded rules ka behaviour');
console.log('     bilkul reproduce karta hai.');
console.log('');
