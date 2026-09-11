/**
 * SERVER-SIDE RECOMPUTE — test.
 *
 * Sabse zaroori baat jo sabit karni hai: agar browser galat value bhejta hai
 * (readonly field devtools se badal kar), to server usse maanta NAHI —
 * formula dobara chalakar apni value likhta hai.
 *
 * CHALANA: node Backend/scoring/recompute-grid-formulas.test.js
 */

const { recomputeAnswerGrids } = require('./recompute-grid-formulas');

let pass = 0, fail = 0;
const failures = [];
function check(name, expected, actual) {
  if (String(expected) === String(actual)) { pass += 1; return; }
  fail += 1;
  failures.push(`${name}: expected ${expected}, mila ${actual}`);
}
function ok(name, cond) { if (cond) pass += 1; else { fail += 1; failures.push(name); } }

const C = (row, col) => ({ cell: { row, col } });
const OP = (op) => ({ op });

/** Ek answer banata hai jisme grid + formula ho. R3C1 = R1C1 / R2C1 * 100 */
function makeAnswer(v11, v21, sentR31) {
  return [{
    answerLabel: 'Information available',
    ansValue: 'Information available',
    subanswar: [{
      subAnswerTypes: 'Grid',
      gridFormulas: [{
        target: { row: 3, col: 1 },
        expr: [C(1, 1), OP('/'), C(2, 1), OP('*'), { num: 100 }],
      }],
      grid: {
        gridValue: [
          { '00': { val: 'header' } },
          { 11: { val: String(v11) } },
          { 21: { val: String(v21) } },
          { 31: { val: String(sentR31) } },
        ],
      },
    }],
  }];
}
const readR31 = (ans) => ans[0].subanswar[0].grid.gridValue[3]['31'].val;

// ===========================================================================
// 1. Browser ne SAHI value bheji — waisi hi rehni chahiye
// ===========================================================================
{
  const out = recomputeAnswerGrids(makeAnswer(25, 100, 25));
  check('sahi value waisi hi rahi', '25', readR31(out.answer));
  check('koi cell badla nahi', 0, out.changed);
}

// ===========================================================================
// 2. Browser ne GALAT value bheji (tampering) — server theek karega
// ===========================================================================
{
  const out = recomputeAnswerGrids(makeAnswer(25, 100, 999));
  check('tampered value theek hui', '25', readR31(out.answer));
  check('changed count', 1, out.changed);
  ok('server ne badla hua cell report kiya', out.changed > 0);
}

// ===========================================================================
// 3. Divide by zero — blank, aur crash nahi
// ===========================================================================
{
  const out = recomputeAnswerGrids(makeAnswer(25, 0, 50));
  check('divide by zero -> blank', '', readR31(out.answer));
  ok('warning aayi', out.warnings.length > 0);
}

// ===========================================================================
// 4. Jis grid pe formula nahi hai, usse haath nahi lagna chahiye
// ===========================================================================
{
  const ans = makeAnswer(25, 100, 999);
  delete ans[0].subanswar[0].gridFormulas;
  const out = recomputeAnswerGrids(ans);
  check('bina formula wala grid waisa hi', '999', readR31(out.answer));
  check('changed 0', 0, out.changed);
}

// ===========================================================================
// 4b. Sub-answer reference — "Consent to operate (KL)" wala asli case
//     R7C1 = (R5C1 / S0) * 100     S0 = grid ke BAHAR ka input
// ===========================================================================
{
  const answer = [{
    answerLabel: 'Information available:',
    subanswar: [
      { subAnswerTypes: 'CheckBox', subAnswerLabel: 'Consent to operate (KL)', numericTypeVal: '1000' },
      { subAnswerTypes: 'CheckBox', subAnswerLabel: 'Water withdrawal', textTypeVal: 'borewell' },
      { subAnswerTypes: 'CheckBox', subAnswerLabel: 'Recycled water', textTypeVal: 'ETP' },
      {
        subAnswerTypes: 'Grid',
        gridFormulas: [{
          target: { row: 7, col: 1 },
          expr: [OP('('), C(5, 1), OP('/'), { sub: { index: 0 } }, OP(')'), OP('*'), { num: 100 }],
        }],
        grid: {
          gridValue: [
            { '00': { val: 'Water usage' } },
            { 11: { val: '' } }, { 21: { val: '' } }, { 31: { val: '' } },
            { 41: { val: '' } }, { 51: { val: '250' } }, { 61: { val: '' } },
            { 71: { val: '9999' } },   // browser ne galat bheja
          ],
        },
      },
    ],
  }];
  const out = recomputeAnswerGrids(answer);
  const r71 = out.answer[0].subanswar[3].grid.gridValue[7]['71'].val;
  check('sub-answer se calc: (250 / 1000) * 100', '25', r71);
  check('tampered value theek hui', 1, out.changed);

  // consent khali -> blank, crash nahi
  const a2 = JSON.parse(JSON.stringify(answer));
  a2[0].subanswar[0].numericTypeVal = '';
  const out2 = recomputeAnswerGrids(a2);
  check('consent khali -> blank', '', out2.answer[0].subanswar[3].grid.gridValue[7]['71'].val);
}

// ===========================================================================
// 5. Input mutate nahi hona chahiye
// ===========================================================================
{
  const ans = makeAnswer(25, 100, 999);
  const before = JSON.stringify(ans);
  recomputeAnswerGrids(ans);
  check('input mutate nahi hua', before, JSON.stringify(ans));
}

// ===========================================================================
// 6. Ajeeb input pe crash na ho
// ===========================================================================
{
  ok('null safe', recomputeAnswerGrids(null).answer === null);
  ok('khali array safe', recomputeAnswerGrids([]).answer.length === 0);
  ok('subanswar bina safe', recomputeAnswerGrids([{ answerLabel: 'x' }]).changed === 0);
  ok('grid bina safe', recomputeAnswerGrids([{ subanswar: [{ subAnswerTypes: 'Grid', gridFormulas: [{ target: { row: 1, col: 1 }, expr: [{ num: 5 }] }] }] }]).changed === 0);
}

// ---------------------------------------------------------------------------
console.log('');
console.log('  Server-side grid formula recompute test');
console.log(`  pass: ${pass}   fail: ${fail}`);
if (failures.length) {
  console.log('');
  failures.slice(0, 20).forEach((f) => console.log(`    ✖ ${f}`));
  console.log('');
  process.exit(1);
}
console.log('');
console.log('  ✅ Browser ka bheja galat value server maanta nahi —');
console.log('     formula dobara chalakar apni value likhta hai.');
console.log('');
