/**
 * trend-rule.js ke tests.
 *
 * Khaas dhyan un teen galtiyon pe hai jo purane assessorStaticValidations()
 * me measure ki gayi thi — boundary gap, truthy guard, aur saal ka chup-chaap
 * badal jaana. Har ek ke liye alag test hai.
 */
'use strict';

const {
  validateBands, pickBand, validateTrendRule, evaluateTrendRule,
} = require('./trend-rule');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ok   ' + name); }
  else { fail += 1; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); }
}
function eq(name, got, want) {
  const same = (typeof want === 'number' && typeof got === 'number')
    ? Math.abs(got - want) < 1e-9 : got === want;
  ok(name, same, 'expected ' + JSON.stringify(want) + ' got ' + JSON.stringify(got));
}

/** Grid banane ka helper — rows[r][`${r}${c}`] = {val}. */
function grid(rows) {
  return rows.map(function (cells, r) {
    const row = {};
    cells.forEach(function (v, c) { row[String(r) + String(c)] = { val: v }; });
    return row;
  });
}

const BANDS = [
  { from: null, to: -5, option: 'Decreasing trend', marks: 20 },
  { from: -5, to: 5, option: 'Flat trend', marks: 10 },
  { from: 5, to: null, option: 'Increasing trend', marks: 0 },
];

console.log('\nBAND VALIDATION');
eq('poora table pass hota hai', validateBands(BANDS).length, 0);
ok('khaali table reject', validateBands([]).length > 0);

const gap = JSON.parse(JSON.stringify(BANDS)); gap[0].to = -6;
ok('GAP pakda jaata hai', validateBands(gap).some(function (e) { return e.indexOf('Gap') === 0; }));

const over = JSON.parse(JSON.stringify(BANDS)); over[0].to = 0;
ok('OVERLAP pakda jaata hai', validateBands(over).some(function (e) { return e.indexOf('Overlap') === 0; }));

const openLow = JSON.parse(JSON.stringify(BANDS)); openLow[0].from = -100;
ok('neeche khula chhod dena reject', validateBands(openLow).length > 0);

const noOpt = JSON.parse(JSON.stringify(BANDS)); noOpt[1].option = '';
ok('bina option wala band reject', validateBands(noOpt).length > 0);

const badRange = [{ from: 10, to: 5, option: 'X', marks: 1 }];
ok('from >= to reject', validateBands(badRange).length > 0);

console.log('\nBOUNDARY — purane code ka sabse bada bug');
// Purana: inc = pct > 5, flat = pct > -5 && pct < 5, dec = pct < -5
// yaani bilkul 5 ya -5 pe teeno false -> koi option select nahi hota tha.
eq('bilkul -5 pe band milta hai', pickBand(BANDS, -5).option, 'Flat trend');
eq('bilkul 5 pe band milta hai', pickBand(BANDS, 5).option, 'Increasing trend');
eq('-5 se thoda neeche', pickBand(BANDS, -5.01).option, 'Decreasing trend');
eq('5 se thoda neeche', pickBand(BANDS, 4.99).option, 'Flat trend');
eq('bahut neeche', pickBand(BANDS, -80).option, 'Decreasing trend');
eq('bahut upar', pickBand(BANDS, 300).option, 'Increasing trend');
eq('khaali value pe koi band nahi', pickBand(BANDS, null), null);
eq('zero pe flat', pickBand(BANDS, 0).option, 'Flat trend');

console.log('\nRULE SHAPE VALIDATION');
const RULE = {
  numerator: { row: 1, cols: [1, 2, 3] },
  denominator: { questionId: 'q-revenue', row: 1, cols: [1, 2, 3] },
  bands: BANDS,
};
eq('theek rule pass', validateTrendRule(RULE).length, 0);
ok('bina denominator question ke reject',
  validateTrendRule(Object.assign({}, RULE, { denominator: { row: 1, cols: [1, 2, 3] } })).length > 0);
ok('ek hi saal chuna to reject',
  validateTrendRule(Object.assign({}, RULE, { numerator: { row: 1, cols: [1] } })).length > 0);
ok('saal ki ginti alag ho to reject',
  validateTrendRule(Object.assign({}, RULE, { numerator: { row: 1, cols: [1, 2] } })).length > 0);
ok('khaali rule reject', validateTrendRule(null).length > 0);

console.log('\nEVALUATION');
// emissions row 1: 4200, 4560, 4930   |   revenue row 1: 520, 560, 610
const emis = grid([['label', 'FY24', 'FY25', 'FY26'], ['Scope 1', 4200, 4560, 4930]]);
const rev = grid([['label', 'FY24', 'FY25', 'FY26'], ['Revenue', 520, 560, 610]]);

let r = evaluateTrendRule(RULE, emis, rev);
eq('teen saal ki intensity nikli', r.intensities.length, 3);
eq('pehle saal ki intensity', Math.round(r.baseline * 1000) / 1000, 8.077);
eq('aakhri saal ki intensity', Math.round(r.latest * 1000) / 1000, 8.082);
ok('% change lagbhag zero', Math.abs(r.pctChange) < 1);
eq('flat band chuna gaya', r.option, 'Flat trend');
eq('flat ke marks', r.marks, 10);
ok('skip nahi hua', r.skipped === false);

console.log('\nemissions kam karo -> decreasing');
const emisDown = grid([['label', 'FY24', 'FY25', 'FY26'], ['Scope 1', 4200, 4000, 3600]]);
r = evaluateTrendRule(RULE, emisDown, rev);
eq('decreasing chuna gaya', r.option, 'Decreasing trend');
eq('decreasing ke marks', r.marks, 20);

console.log('\nemissions badhao -> increasing');
const emisUp = grid([['label', 'FY24', 'FY25', 'FY26'], ['Scope 1', 4200, 5000, 6200]]);
r = evaluateTrendRule(RULE, emisUp, rev);
eq('increasing chuna gaya', r.option, 'Increasing trend');
eq('increasing ke marks', r.marks, 0);

console.log('\nZERO ek asli jawab hai — "data nahi hai" nahi');
// Purana code `if (intensityY1 || intensityY2)` likhta tha, to intensity 0
// (sabse achha result) skip ho jaata tha.
const emisZero = grid([['label', 'FY24', 'FY25', 'FY26'], ['Scope 1', 4200, 2000, 0]]);
r = evaluateTrendRule(RULE, emisZero, rev);
eq('aakhri intensity zero hai', r.latest, 0);
eq('-100% change', Math.round(r.pctChange), -100);
eq('decreasing mila, skip nahi hua', r.option, 'Decreasing trend');

console.log('\nADHOORA DATA — rule chalta hi nahi, andaza nahi lagata');
const emisGap = grid([['label', 'FY24', 'FY25', 'FY26'], ['Scope 1', '', 4560, 4930]]);
r = evaluateTrendRule(RULE, emisGap, rev);
ok('skip hua', r.skipped === true);
eq('koi option nahi chuna', r.option, null);
eq('koi marks nahi', r.marks, null);
ok('warning di gayi', r.warnings.length > 0);
// Purana code yahan `cell(col1) || cell(col2)` karke chup-chaap FY25 utha leta
// tha aur galat saalon ki tulna kar deta tha.
ok('agle saal se replace NAHI kiya', r.baseline === null);

console.log('\nDENOMINATOR ZERO');
const revZero = grid([['label', 'FY24', 'FY25', 'FY26'], ['Revenue', 0, 560, 610]]);
r = evaluateTrendRule(RULE, emis, revZero);
ok('skip hua', r.skipped === true);
ok('zero-divide ki warning', r.warnings.some(function (w) { return w.indexOf('zero') >= 0; }));
ok('NaN/Infinity nahi bana', r.pctChange === null);

console.log('\nKOI BAND NAHI LAGTA');
const narrow = [{ from: -1, to: 1, option: 'Flat', marks: 5 }];
r = evaluateTrendRule(Object.assign({}, RULE, { bands: narrow }), emisUp, rev);
eq('option null', r.option, null);
ok('warning di', r.warnings.some(function (w) { return w.indexOf('band nahi lagta') >= 0; }));
ok('phir bhi pctChange nikala', typeof r.pctChange === 'number');

console.log('\nDO SAAL BHI CHALTE HAIN (teen zaroori nahi)');
const two = {
  numerator: { row: 1, cols: [1, 3] },
  denominator: { questionId: 'q', row: 1, cols: [1, 3] },
  bands: BANDS,
};
eq('do saal ka rule valid', validateTrendRule(two).length, 0);
r = evaluateTrendRule(two, emisDown, rev);
ok('do saal pe bhi chala', r.skipped === false);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
