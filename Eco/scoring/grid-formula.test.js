/**
 * GRID FORMULA ENGINE — tests.
 *
 * Khaas dhyan un paanch cheezon pe hai jo grid formulas me sabse aasani se
 * toot ti hain: divide-by-zero, evaluation order, circular reference,
 * operator precedence, aur input mutation.
 *
 * CHALANA: node Backend/scoring/grid-formula.test.js
 */

const {
  validateFormulas, evaluateFormulas, orderFormulas, formulaToText, computedCellKeys,
} = require('./grid-formula.js');

let pass = 0, fail = 0;
const failures = [];
function check(name, expected, actual) {
  const e = JSON.stringify(expected), a = JSON.stringify(actual);
  if (e === a) { pass += 1; return; }
  fail += 1;
  failures.push(`${name}: expected ${e}, mila ${a}`);
}
function ok(name, cond) {
  if (cond) pass += 1;
  else { fail += 1; failures.push(name); }
}

const C = (row, col) => ({ cell: { row, col } });
const OP = (op) => ({ op });

/** Grid banane ka helper: rows × cols, values object se. */
function grid(rows, cols, values) {
  const g = [];
  for (let r = 0; r < rows; r += 1) {
    const row = {};
    for (let c = 0; c < cols; c += 1) {
      const v = values && values[`${r}${c}`];
      row[`${r}${c}`] = { val: v === undefined ? '' : String(v), type: 'number' };
    }
    g.push(row);
  }
  return g;
}
const cellOf = (g, r, c) => g[r][`${r}${c}`].val;

// ===========================================================================
// 1. Basic — R4C4 = R1C1 + R2C4  (user ka apna example)
// ===========================================================================
{
  const f = [{ target: { row: 4, col: 4 }, expr: [C(1, 1), OP('+'), C(2, 4)] }];
  check('validate: basic sahi hai', [], validateFormulas(f, { rows: 5, cols: 5 }));
  const out = evaluateFormulas(grid(5, 5, { 11: 10, 24: 15 }), f);
  check('R4C4 = 10 + 15', '25', cellOf(out.gridValue, 4, 4));
  check('formula ka text', 'R4C4 = R1C1 + R2C4', formulaToText(f[0]));
  check('computed cells', ['44'], computedCellKeys(f));
}

// ===========================================================================
// 2. Operator precedence — `a + b * c` math ke hisaab se, left-to-right nahi
//    2 + 3 * 4 = 14 (math), 20 nahi (calculator style)
// ===========================================================================
{
  const f = [{ target: { row: 3, col: 3 }, expr: [C(0, 0), OP('+'), C(0, 1), OP('*'), C(0, 2)] }];
  const out = evaluateFormulas(grid(4, 4, { '00': 2, '01': 3, '02': 4 }), f);
  check('precedence: 2 + 3 * 4 = 14', '14', cellOf(out.gridValue, 3, 3));
}
{
  // brackets se override
  const f = [{ target: { row: 3, col: 3 }, expr: [OP('('), C(0, 0), OP('+'), C(0, 1), OP(')'), OP('*'), C(0, 2)] }];
  const out = evaluateFormulas(grid(4, 4, { '00': 2, '01': 3, '02': 4 }), f);
  check('brackets: (2 + 3) * 4 = 20', '20', cellOf(out.gridValue, 3, 3));
}

// ===========================================================================
// 3. Divide by zero / khali cell — blank aana chahiye, Infinity ya NaN nahi
// ===========================================================================
{
  const f = [{ target: { row: 3, col: 1 }, expr: [C(1, 1), OP('/'), C(2, 1), OP('*'), { num: 100 }] }];
  const out = evaluateFormulas(grid(4, 4, { 11: 50, 21: 0 }), f);
  check('divide by zero -> blank', '', cellOf(out.gridValue, 3, 1));
  ok('divide by zero pe warning aayi', out.warnings.length === 1 && /khali ya 0/.test(out.warnings[0]));

  const out2 = evaluateFormulas(grid(4, 4, { 11: 50 }), f);  // R2C1 khali
  check('khali divisor -> blank', '', cellOf(out2.gridValue, 3, 1));
}

// ===========================================================================
// 4. Evaluation order — chained dependency
//    R3C3 = R2C2 + 1  aur  R2C2 = R1C1 + 1  -> R2C2 pehle chalna chahiye
// ===========================================================================
{
  const f = [
    { target: { row: 3, col: 3 }, expr: [C(2, 2), OP('+'), { num: 1 }] },   // baad me aana chahiye
    { target: { row: 2, col: 2 }, expr: [C(1, 1), OP('+'), { num: 1 }] },   // pehle
  ];
  check('validate: chain sahi hai', [], validateFormulas(f, { rows: 4, cols: 4 }));
  const out = evaluateFormulas(grid(4, 4, { 11: 5 }), f);
  check('R2C2 = 5 + 1', '6', cellOf(out.gridValue, 2, 2));
  check('R3C3 = 6 + 1 (order sahi laga)', '7', cellOf(out.gridValue, 3, 3));
}

// ===========================================================================
// 5. Circular reference — save hi nahi hona chahiye, aur chalne pe hang nahi
// ===========================================================================
{
  const f = [
    { target: { row: 1, col: 1 }, expr: [C(2, 2), OP('+'), { num: 1 }] },
    { target: { row: 2, col: 2 }, expr: [C(1, 1), OP('+'), { num: 1 }] },
  ];
  const errs = validateFormulas(f, { rows: 4, cols: 4 });
  ok('circular reference pakda gaya', errs.some((e) => /circular/i.test(e)));
  const out = evaluateFormulas(grid(4, 4, {}), f);   // hang nahi hona chahiye
  ok('circular pe engine chalta raha', out.warnings.some((w) => /circular/i.test(w)));
}
{
  const f = [{ target: { row: 1, col: 1 }, expr: [C(1, 1), OP('+'), { num: 1 }] }];
  ok('self-reference pakda gaya', validateFormulas(f, { rows: 4, cols: 4 }).some((e) => /khud ko reference/.test(e)));
}

// ===========================================================================
// 6. Galat shape — save se pehle pakda jaye
// ===========================================================================
{
  const bad = [
    ['operator pe khatam', [{ target: { row: 1, col: 1 }, expr: [C(0, 0), OP('+')] }], /operator pe khatam/],
    ['operator missing', [{ target: { row: 1, col: 1 }, expr: [C(0, 0), C(0, 1)] }], /operator missing/],
    ['khali formula', [{ target: { row: 1, col: 1 }, expr: [] }], /khali hai/],
    ['bracket adhoora', [{ target: { row: 1, col: 1 }, expr: [OP('('), C(0, 0), OP('+'), C(0, 1)] }], /brackets pure nahi/],
    ['grid ke bahar', [{ target: { row: 9, col: 9 }, expr: [C(0, 0), OP('+'), { num: 1 }] }], /grid ke bahar/],
    ['ek cell pe do formula', [
      { target: { row: 1, col: 1 }, expr: [C(0, 0), OP('+'), { num: 1 }] },
      { target: { row: 1, col: 1 }, expr: [C(0, 1), OP('+'), { num: 2 }] },
    ], /pehle se ek formula/],
  ];
  bad.forEach(([name, f, re]) => {
    ok(`guard: ${name}`, validateFormulas(f, { rows: 4, cols: 4 }).some((e) => re.test(e)));
  });
}

// ===========================================================================
// 7. Asli hardcoded formula ka reproduction
//    questionnaire-form.component.ts:1115
//      (question10[6]["64"] / question10[7]["74"]) * 100
//    yaani R6C4 / R7C4 * 100
// ===========================================================================
{
  const f = [{ target: { row: 8, col: 4 }, expr: [C(6, 4), OP('/'), C(7, 4), OP('*'), { num: 100 }] }];
  check('validate: asli formula sahi hai', [], validateFormulas(f, { rows: 9, cols: 5 }));

  const cases = [[25, 100, '25'], [50, 200, '25'], [1, 3, '33.33'], [0, 100, '0'], [10, 0, '']];
  cases.forEach(([a, b, expected]) => {
    const out = evaluateFormulas(grid(9, 5, { 64: a, 74: b }), f);
    check(`asli formula ${a}/${b}*100`, expected, cellOf(out.gridValue, 8, 4));
  });
}

// ===========================================================================
// 7b. SUB-ANSWER REFERENCE — grid ke bahar wale input
//
// Asli case: "Please indicate the total water use data"
//   sub[0] "Consent to operate (KL)"   -> numeric input (grid ke BAHAR)
//   sub[3] Grid, row7 = "Water Utilization percentage"
//   R7C1 = (R5C1 / S0) * 100     // consumed / consent-to-operate
// ===========================================================================
const S = (index) => ({ sub: { index } });

function waterSubs(consentKL) {
  return [
    { subAnswerTypes: 'CheckBox', subAnswerLabel: 'Consent to operate (KL)', numericTypeVal: consentKL },
    { subAnswerTypes: 'CheckBox', subAnswerLabel: 'Water withdrawal', textTypeVal: 'borewell' },
    { subAnswerTypes: 'CheckBox', subAnswerLabel: 'Recycled water', textTypeVal: 'ETP' },
    { subAnswerTypes: 'Grid' },
  ];
}
{
  const f = [{ target: { row: 7, col: 1 }, expr: [OP('('), C(5, 1), OP('/'), S(0), OP(')'), OP('*'), { num: 100 }] }];
  const meta = { rows: 8, cols: 4, subCount: 4 };

  check('validate: sub reference sahi hai', [], validateFormulas(f, meta));
  check('formula text me S0 dikhta hai', 'R7C1 = ( R5C1 / S0 ) * 100', formulaToText(f[0]));

  // consumed=250, consent=1000  ->  25%
  let out = evaluateFormulas(grid(8, 4, { 51: 250 }), f, waterSubs(1000));
  check('R7C1 = (250 / 1000) * 100', '25', cellOf(out.gridValue, 7, 1));

  // consent khali -> divide by zero -> blank
  out = evaluateFormulas(grid(8, 4, { 51: 250 }), f, waterSubs(''));
  check('consent khali -> blank', '', cellOf(out.gridValue, 7, 1));
  ok('consent khali pe warning', out.warnings.length > 0);

  // subanswar diya hi nahi -> crash nahi, blank
  out = evaluateFormulas(grid(8, 4, { 51: 250 }), f);
  check('subanswar bina -> blank', '', cellOf(out.gridValue, 7, 1));

  // text wala sub bhi padha ja sake (numericTypeVal na ho to textTypeVal)
  const f2 = [{ target: { row: 7, col: 2 }, expr: [S(1)] }];
  out = evaluateFormulas(grid(8, 4, {}), f2, [
    {}, { textTypeVal: '42' }, {}, {},
  ]);
  check('textTypeVal se value padhi', '42', cellOf(out.gridValue, 7, 2));

  // galat sub index pakda jaye
  const bad = [{ target: { row: 7, col: 1 }, expr: [S(9)] }];
  ok('galat sub index pakda gaya', validateFormulas(bad, meta).some((e) => /koi sub-answer nahi/.test(e)));

  // grid cell + sub dono ek saath, aur chained dependency
  const f3 = [
    { target: { row: 5, col: 1 }, expr: [C(1, 1), OP('+'), C(2, 1)] },          // consumed = withdrawal + recycled
    { target: { row: 7, col: 1 }, expr: [OP('('), C(5, 1), OP('/'), S(0), OP(')'), OP('*'), { num: 100 }] },
  ];
  out = evaluateFormulas(grid(8, 4, { 11: 300, 21: 200 }), f3, waterSubs(1000));
  check('chain: R5C1 = 300 + 200', '500', cellOf(out.gridValue, 5, 1));
  check('chain: R7C1 = (500/1000)*100', '50', cellOf(out.gridValue, 7, 1));
}

// ===========================================================================
// 7c. CROSS-QUESTION TARGET
//
// Asli case (aaj questionnaire-form.component.ts:1101 pe hardcoded):
//   energy grid: R6C4 = Total Energy from Renewable, R7C4 = Total Energy Consumed
//   Renewable % = (R6C4 / R7C4) * 100
//   -> nateeja DOOSRE question ("type of renewable energy sources") ke
//      opt0.sub0 "Renewable Energy % of total energy consumption" me jaata hai
// ===========================================================================
{
  const TQ = { questionId: '6a76abba03c3b2c50d2cd580', optionIndex: 0, subIndex: 0, field: 'numericTypeVal' };
  const f = [
    // pehle in-grid totals (jaise asli energy question me hain)
    { target: { row: 6, col: 4 }, expr: [C(4, 4), OP('+'), C(5, 4)] },
    { target: { row: 7, col: 4 }, expr: [C(3, 4), OP('+'), C(6, 4)] },
    // phir cross-question
    { targetQuestion: TQ, expr: [OP('('), C(6, 4), OP('/'), C(7, 4), OP(')'), OP('*'), { num: 100 }] },
  ];
  const meta = { rows: 8, cols: 5, subCount: 2 };

  check('validate: cross-question sahi hai', [], validateFormulas(f, meta));
  ok('text me target question dikhta hai', /Q\(…d580\)\.opt0\.sub0 =/.test(formulaToText(f[2])));

  // non-renew 150 (R3C4), renew elec 30 + fuel 20 -> R6C4=50, R7C4=200 -> 25%
  let out = evaluateFormulas(grid(8, 5, { 34: 150, 44: 30, 54: 20 }), f);
  check('R6C4 = 30 + 20', '50', cellOf(out.gridValue, 6, 4));
  check('R7C4 = 150 + 50', '200', cellOf(out.gridValue, 7, 4));
  check('cross-question results', 1, out.crossQuestion.length);
  check('Renewable % = (50/200)*100', '25', out.crossQuestion[0].value);
  check('target sahi gaya', TQ.questionId, out.crossQuestion[0].target.questionId);
  ok('cross-question ORDER ke baad chala (computed cells use hue)', out.crossQuestion[0].value === '25');

  // total 0 -> divide by zero -> blank, crash nahi
  out = evaluateFormulas(grid(8, 5, {}), f);
  check('sab khali -> blank', '', out.crossQuestion[0].value);
  ok('warning aayi', out.warnings.some((w) => /Q\(…d580\)/.test(w)));

  // guards
  const badTQ = [
    ['questionId bina', [{ targetQuestion: { subIndex: 0 }, expr: [{ num: 1 }] }], /target question ka id nahi/],
    ['subIndex bina', [{ targetQuestion: { questionId: 'x' }, expr: [{ num: 1 }] }], /sub-answer index nahi/],
    ['ek hi target pe do formula', [
      { targetQuestion: TQ, expr: [{ num: 1 }] },
      { targetQuestion: TQ, expr: [{ num: 2 }] },
    ], /pehle se ek formula hai/],
    ['operator pe khatam', [{ targetQuestion: TQ, expr: [C(1, 1), OP('+')] }], /operator pe khatam/],
  ];
  badTQ.forEach(([name, ff, re]) => {
    ok('guard: ' + name, validateFormulas(ff, meta).some((e) => re.test(e)));
  });

  // cross-question formula grid me kuch nahi likhta
  const before = JSON.stringify(grid(8, 5, { 34: 150, 44: 30, 54: 20 }));
  const only = [{ targetQuestion: TQ, expr: [C(4, 4), OP('+'), C(5, 4)] }];
  const o2 = evaluateFormulas(JSON.parse(before), only);
  check('grid unchanged', before, JSON.stringify(o2.gridValue));
  check('computed khali', 0, Object.keys(o2.computed).length);
  check('cross value', '50', o2.crossQuestion[0].value);
}

// ===========================================================================
// 8. Purity — input grid mutate nahi hona chahiye
// ===========================================================================
{
  const g = grid(4, 4, { 11: 10, 24: 15 });
  const before = JSON.stringify(g);
  evaluateFormulas(g, [{ target: { row: 3, col: 3 }, expr: [C(1, 1), OP('+'), C(2, 4)] }]);
  check('input grid mutate nahi hua', before, JSON.stringify(g));
}

// ===========================================================================
// 9. Khali formula list — kuch na toote
// ===========================================================================
{
  const g = grid(3, 3, { 11: 5 });
  const out = evaluateFormulas(g, []);
  check('koi formula nahi -> grid waisa hi', '5', cellOf(out.gridValue, 1, 1));
  check('validate: khali list theek hai', [], validateFormulas([], { rows: 3, cols: 3 }));
}

// ---------------------------------------------------------------------------
console.log('');
console.log('  Grid formula engine test');
console.log(`  pass: ${pass}   fail: ${fail}`);
if (failures.length) {
  console.log('');
  failures.slice(0, 25).forEach((f) => console.log(`    ✖ ${f}`));
  console.log('');
  process.exit(1);
}
console.log('');
console.log('  ✅ Divide-by-zero, evaluation order, circular reference,');
console.log('     precedence aur purity — sab handle ho rahe hain.');
console.log('');
