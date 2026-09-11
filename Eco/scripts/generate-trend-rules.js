/**
 * PURANE HARDCODED TREND BLOCKS -> AUTHORED RULES
 *
 * `assessorStaticValidations()` me 12 trend blocks hain, 5 questions me bante
 * hue. Ye script har block ke barabar ka `trendRule` banati hai, questionnaire
 * data se milakar verify karti hai, aur JSON nikaalti hai jise question ke
 * sub-answer pe daala ja sakta hai.
 *
 * CHALANE KA TAREEKA
 *   node Backend/scripts/generate-trend-rules.js CII_CESD_ECO_EDGE.questionnaires.json
 *
 * KUCH BHI LIKHTI NAHI HAI — sirf padhti hai aur JSON print karti hai.
 * Database me daalne se pehle output khud padhein.
 *
 * ⚠ JO CHEEZEIN KHUD SE THEEK NAHI KI GAYI
 *   Purane code ki do cheezein yahan JAISI KI TAISI rakhi gayi hain, kyunki
 *   inhe badalna kisi applicant ka score hila dega — ye faisla client ka hai,
 *   script ka nahi:
 *     · row 4 (PM2.5) pe "Decreasing" ko 10 marks milte hain, jabki uske
 *       upar wali rows me 20 milte hain aur neeche wali me 10. Beech ki row
 *       ka ye 10 copy-paste ki galti lagta hai, par saabit nahi hai.
 *     · option ka naam "3. Decreasing trend" hai (baaki jagah sirf
 *       "Decreasing trend"), aur water wale me "Decreasing trend " — aakhir
 *       me space ke saath. Ye labels waise hi rakhe hain, warna question ke
 *       assessorOption se match hi nahi karenge.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { validateTrendRule, evaluateTrendRule } = require('../scoring/trend-rule');

/* ---------------------------------------------------------------- *
 * Purane code se nikale hue parameters — ek-ek block padhkar.
 * `numRow`   : kis row ka data padha jaata hai
 * `targetRow`: option kis row pe dikhaya jaata hai (alag ho sakta hai)
 * ---------------------------------------------------------------- */
const DENOMINATOR_QUESTION = '682c268b485482741b9ce8b7';   // General — revenue/production

const BLOCKS = [
  // --- Air emissions: ek grid, saat pollutant rows ---
  { qid: '682c347f485482741b9ce913', numRow: 1, targetRow: 1, marks: [0, 10, 20],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend'], note: 'NOx' },
  { qid: '682c347f485482741b9ce913', numRow: 2, targetRow: 2, marks: [0, 10, 20],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend'], note: 'SOx' },
  { qid: '682c347f485482741b9ce913', numRow: 3, targetRow: 3, marks: [0, 10, 20],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend'], note: 'PM10' },
  { qid: '682c347f485482741b9ce913', numRow: 4, targetRow: 4, marks: [0, 10, 10],
    labels: ['Increasing trend', 'Flat trend', '3. Decreasing trend'], note: 'PM2.5',
    flag: 'Decreasing = 10 marks (upar wali rows me 20). Label bhi "3. " se shuru hota hai.' },
  { qid: '682c347f485482741b9ce913', numRow: 5, targetRow: 5, marks: [0, 5, 10],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend'], note: 'POP' },
  { qid: '682c347f485482741b9ce913', numRow: 6, targetRow: 6, marks: [0, 5, 10],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend'], note: 'VOC' },
  { qid: '682c347f485482741b9ce913', numRow: 7, targetRow: 7, marks: [0, 5, 10],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend'], note: 'HAP' },

  // --- Energy: row 7 padhta hai, option row 1 pe lagata hai ---
  { qid: '682c45b9485482741b9ce9cd', numRow: 7, targetRow: 1, marks: [0, 40, 80],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend'], note: 'Total energy',
    flag: 'Row 7 ka data, option row 1 pe.' },

  // --- Water: row 5 padhta hai, option row 3 pe ---
  { qid: '682c4abb485482741b9ce9f6', numRow: 5, targetRow: 3, marks: [0, 40, 80],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend '], note: 'Water utilisation',
    flag: 'Row 5 ka data, option row 3 pe. "Decreasing trend " ke aakhir me space hai.' },

  // --- Scope 1 emissions ---
  { qid: '682c2e9b485482741b9ce8d3', numRow: 1, targetRow: 1, marks: [0, 40, 80],
    labels: ['Increasing trend', 'Flat trend', 'Decreasing trend'], note: 'Scope 1' },
];

/* Do blocks jaan-boojhkar chhode gaye hain — inhe alag se dekhna hoga. */
const SKIPPED = [
  { qid: '682d7ae92a6c6172273cde2a', why:
      'Do blocks hain aur wo grid ke ratio se nahi, kisi aur tareeke se chalte hain — '
      + 'code me gridValue.at(N) padha hi nahi jaata. Inhe alag se padhkar banana hoga.' },
];

/* ---------------------------------------------------------------- */

function oid(d) { return String((d && d._id && d._id.$oid) || (d && d._id) || ''); }
function clean(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** Question ka pehla grid — rows, column headers, aur saal wale columns. */
function gridOf(q) {
  let found = null;
  (q.answer || []).forEach((opt, oi) => (opt.subanswar || []).forEach((s, si) => {
    if (String(s && s.subAnswerTypes) !== 'Grid' || found) return;
    const rows = Array.isArray(s[String(si)]) ? s[String(si)]
      : (Array.isArray(s.grid && s.grid.gridValue) ? s.grid.gridValue : []);
    if (!rows.length) return;
    const at = (r, c) => {
      const cell = rows[r] && rows[r][String(r) + String(c)];
      if (cell === undefined || cell === null) return '';
      const v = typeof cell === 'object' ? cell.val : cell;
      return v === undefined || v === null ? '' : String(v).trim();
    };
    const colCount = Object.keys(rows[0] || {})
      .filter((k) => /^\d+$/.test(k) && k[0] === '0').length;
    const colIdx = Array.from({ length: colCount }, (_, i) => i);
    const isYear = (s2) => /(^|\D)(19|20)\d{2}(\D|$)/.test(s2) || /\bFY\b/i.test(s2);
    const years = colIdx.filter((c) => c > 0 && isYear(at(0, c)));
    found = {
      optionIndex: oi, subIndex: si, rows, at,
      rowCount: rows.length, colCount,
      headers: colIdx.map((c) => at(0, c)),
      rowLabels: rows.map((_, r) => at(r, 0)),
      yearCols: years.length >= 2 ? years : colIdx.filter((c) => c > 0),
    };
  }));
  return found;
}

function main() {
  const file = process.argv[2] || 'CII_CESD_ECO_EDGE.questionnaires.json';
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.error('File nahi mili: ' + full);
    process.exit(1);
  }
  const docs = JSON.parse(fs.readFileSync(full, 'utf8'));
  const byId = {};
  docs.forEach((d) => { byId[oid(d)] = d; });

  const den = byId[DENOMINATOR_QUESTION];
  if (!den) {
    console.error('Denominator question ' + DENOMINATOR_QUESTION + ' data me nahi mila.');
    process.exit(1);
  }
  const denGrid = gridOf(den);

  console.log('DENOMINATOR');
  console.log('  ' + clean(den.question).slice(0, 78));
  console.log('  columns : ' + JSON.stringify(denGrid.headers));
  console.log('  yearCols: [' + denGrid.yearCols + ']');
  console.log('  row 1   : "' + denGrid.rowLabels[1] + '"');
  console.log('');

  const results = [];
  let okCount = 0;

  BLOCKS.forEach((b) => {
    const q = byId[b.qid];
    if (!q) { results.push({ b, error: 'question data me nahi mila' }); return; }
    const g = gridOf(q);
    if (!g) { results.push({ b, error: 'is question me grid nahi mila' }); return; }

    const rule = {
      numerator: { row: b.numRow, cols: g.yearCols.slice(0, 3) },
      denominator: {
        questionId: DENOMINATOR_QUESTION,
        optionIndex: denGrid.optionIndex,
        subIndex: denGrid.subIndex,
        row: 1,                              // "Total revenue (Rs.)"
        cols: denGrid.yearCols.slice(0, 3),
      },
      targetRow: b.targetRow === b.numRow ? null : b.targetRow,
      bands: [
        { from: null, to: -5, option: b.labels[2], marks: b.marks[2] },
        { from: -5, to: 5, option: b.labels[1], marks: b.marks[1] },
        { from: 5, to: null, option: b.labels[0], marks: b.marks[0] },
      ],
      allowOverride: false,
    };

    const errors = validateTrendRule(rule);
    if (!errors.length) okCount += 1;
    results.push({ b, q, g, rule, errors });
  });

  console.log('='.repeat(74));
  results.forEach((r) => {
    const b = r.b;
    console.log('\n' + b.qid + '  row ' + b.numRow + '  (' + b.note + ')');
    if (r.error) { console.log('  ERROR: ' + r.error); return; }
    console.log('  question : ' + clean(r.q.question).slice(0, 70));
    console.log('  reads    : row ' + b.numRow + ' "' + (r.g.rowLabels[b.numRow] || '?')
      + '"  cols [' + r.rule.numerator.cols + ']');
    console.log('  shows on : row ' + b.targetRow + ' "' + (r.g.rowLabels[b.targetRow] || '?') + '"');
    console.log('  bands    : <-5 -> "' + b.labels[2] + '" (' + b.marks[2] + ')   '
      + '-5..5 -> "' + b.labels[1] + '" (' + b.marks[1] + ')   '
      + '>=5 -> "' + b.labels[0] + '" (' + b.marks[0] + ')');
    console.log('  validate : ' + (r.errors.length ? 'FAIL — ' + r.errors.join(' | ') : 'PASS'));
    if (b.flag) console.log('  ⚠ DEKHEIN: ' + b.flag);
  });

  console.log('\n' + '='.repeat(74));
  console.log('BOUNDARY — purane code se ek farq jo JAAN-BOOJHKAR rakha gaya hai');
  console.log('  Purana: >5 increasing, -5..5 flat, <-5 decreasing');
  console.log('          bilkul 5 ya -5 pe TEENO false -> koi option nahi, 0 marks.');
  console.log('  Naya  : bands aapas me milte hain, -5 aur 5 flat/increasing me aate hain.');
  console.log('  Matlab: jis applicant ka change theek 5% ya -5% hai, uska mark BADLEGA.');
  console.log('          Ye theek hona hai, par client ko bataye bina production pe mat le jayein.');

  console.log('\n' + '='.repeat(74));
  console.log('CHHODE GAYE BLOCKS');
  SKIPPED.forEach((s) => console.log('  ' + s.qid + '\n    ' + s.why));

  console.log('\n' + '='.repeat(74));
  console.log(okCount + '/' + BLOCKS.length + ' rules validation pass karte hain.');
  console.log('\nJSON (har question ke liye, sub-answer pe trendRule ki tarah daalein):');
  const out = {};
  results.filter((r) => r.rule && !r.errors.length).forEach((r) => {
    out[r.b.qid] = out[r.b.qid] || [];
    out[r.b.qid].push({ row: r.b.numRow, note: r.b.note, trendRule: r.rule });
  });
  console.log(JSON.stringify(out, null, 2));
}

main();
