/**
 * STATIC LOGIC KA POORA AUDIT -> Markdown
 *
 * Kya nikalti hai:
 *   · har question jispe koi hardcoded logic laga hua hai
 *   · us logic ka type (trend / band / grid lookup / option injection …)
 *   · aaj wo covered hai ya nahi
 *   · dynamic banane ka tareeka
 *
 * Chalane ka tareeka:
 *   node Backend/scripts/audit-static-logic.js CII_CESD_ECO_EDGE.questionnaires.json
 *
 * Kuch likhti nahi — sirf padhkar STATIC_LOGIC_AUDIT.md banati hai.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DATA = process.argv[2] || 'CII_CESD_ECO_EDGE.questionnaires.json';
const OUT = 'STATIC_LOGIC_AUDIT.md';

const FORM = 'src/app/dashboard/questionnaire/questionnaire-form/questionnaire-form.component.ts';
const UTIL = 'src/app/services/utility/utility.service.ts';
const MARKSVC = 'Backend/controllers/MarkService.js';
const STATICMARK = 'Backend/controllers/StaticMark.js';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const oid = (d) => String((d && d._id && d._id.$oid) || (d && d._id) || '');
const clean = (s) => String(s || '').replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;|&amp;/g, ' ').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ *
 * 1. Questionnaire data
 * ------------------------------------------------------------------ */
const docs = JSON.parse(read(DATA));
const byId = {};
docs.forEach((d) => { byId[oid(d)] = d; });

function gridsOf(q) {
  const out = [];
  (q.answer || []).forEach((opt, oi) => (opt.subanswar || []).forEach((s, si) => {
    if (String(s && s.subAnswerTypes) !== 'Grid') return;
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
    out.push({
      oi, si, rowCount: rows.length, colCount,
      headers: Array.from({ length: colCount }, (_, c) => at(0, c)),
      rowLabels: rows.map((_, r) => at(r, 0)),
      hasFormula: Array.isArray(s.gridFormulas) && s.gridFormulas.length > 0,
      formulaCount: (s.gridFormulas || []).length,
      hasTrendRule: !!s.trendRule,
    });
  }));
  return out;
}

/* ------------------------------------------------------------------ *
 * 2. assessorStaticValidations() ke branches
 * ------------------------------------------------------------------ */
function assessorBranches() {
  const L = read(FORM).split('\n');
  const start = L.findIndex((l) => /assessorStaticValidations\s*\(questionId/.test(l));
  const marks = [];
  for (let i = start; i < L.length; i += 1) {
    const m = L[i].match(/questionId\s*===?\s*'([0-9a-f]{24})'/);
    if (m && /(else\s+if|^\s*if)\s*\(/.test(L[i])) marks.push({ i, id: m[1] });
    if (/^ {2}\}$/.test(L[i]) && i > start + 10 && marks.length > 3) { marks.push({ i, id: null }); break; }
  }
  const out = [];
  for (let k = 0; k < marks.length - 1; k += 1) {
    const a = marks[k].i; const b = marks[k + 1].i;
    const body = L.slice(a, b).join('\n');
    const trend = (body.match(/"option":\s*"[^"]*Increasing trend"/g) || []).length;
    out.push({
      id: marks[k].id, from: a + 1, to: b, lines: b - a, trend,
      readsGrid: /gridValue/.test(body),
      readsNumeric: /numericTypeVal/.test(body),
      injectsOptions: /"marks":\s*-?\d+/.test(body),
      setsSubscore: /subscore/.test(body),
      divides: /safeDivide|\/\s*\w+Year/.test(body),
      bands: /\?\s*\d+\s*:|if\s*\(\s*\w+\s*[<>]=?\s*\d/.test(body),
    });
  }
  return out;
}

/** Ek branch ka archetype + dynamic banane ka tareeka. */
function classify(b) {
  if (b.trend > 0) {
    return {
      type: 'Year-on-year trend',
      formula: 'intensity(saal) = numerator ÷ denominator; % change = (aakhri − pehla) ÷ pehla × 100; band se assessor option',
      how: 'Trend rule builder — ban chuka hai',
      status: 'COVERED',
    };
  }
  if (b.readsGrid && b.bands) {
    return {
      type: 'Grid cell → band',
      formula: 'Grid ke ek ya do cells padhkar threshold se marks',
      how: 'Grid formula se value nikaalo, phir usi band table pe chala do — trend rule wala hi band editor',
      status: 'PARTIAL',
    };
  }
  if (b.readsNumeric && b.bands) {
    return {
      type: 'Number → band',
      formula: 'Ek numeric input, band table se marks',
      how: 'Band editor ko numeric sub-answer pe bhi allow karna hai (abhi sirf grid pe hai)',
      status: 'NOT COVERED',
    };
  }
  if (b.readsNumeric && b.setsSubscore && !b.bands) {
    return {
      type: 'Passthrough',
      formula: 'Jo number applicant ne bhara, wahi mark ban jaata hai',
      how: 'Ek line ka rule — "marks = is field ki value". Sabse aasan.',
      status: 'NOT COVERED',
    };
  }
  if (b.injectsOptions && !b.readsGrid && !b.readsNumeric) {
    return {
      type: 'Sirf option list',
      formula: 'Koi hisaab nahi — bas assessor ke options code se bhare ja rahe hain',
      how: 'Kuch banane ki zaroorat NAHI. Ye options Assessor Option screen se author karo aur code hata do.',
      status: 'NO ENGINE NEEDED',
    };
  }
  return {
    type: 'Mila-jula',
    formula: 'Ek se zyada cheezein — alag se padhna hoga',
    how: 'Pehle is branch ko padhkar tay karo ki asli me kya kar raha hai',
    status: 'NEEDS REVIEW',
  };
}

/* ------------------------------------------------------------------ *
 * 3. Doosri jagah ke hardcoded IDs
 * ------------------------------------------------------------------ */
function idsIn(file) {
  try {
    return [...new Set((read(file).match(/'[0-9a-f]{24}'/g) || []).map((s) => s.slice(1, -1)))];
  } catch (e) { return []; }
}

/* ------------------------------------------------------------------ *
 * 4. Markdown
 * ------------------------------------------------------------------ */
function main() {
  const branches = assessorBranches();
  const utilIds = idsIn(UTIL);
  const markIds = idsIn(MARKSVC);
  const staticIds = idsIn(STATICMARK);

  const allGridQs = docs.filter((q) => gridsOf(q).length > 0);
  const gridSubCount = docs.reduce((a, q) => a + gridsOf(q).length, 0);
  const withFormula = docs.filter((q) => gridsOf(q).some((g) => g.hasFormula));
  const withTrend = docs.filter((q) => gridsOf(q).some((g) => g.hasTrendRule));

  const cls = branches.map((b) => ({ b, c: classify(b) }));
  const covered = cls.filter((x) => x.c.status === 'COVERED');
  const partial = cls.filter((x) => x.c.status === 'PARTIAL');
  const notCovered = cls.filter((x) => x.c.status === 'NOT COVERED');
  const noEngine = cls.filter((x) => x.c.status === 'NO ENGINE NEEDED');
  const review = cls.filter((x) => x.c.status === 'NEEDS REVIEW');

  const trendBlocks = branches.reduce((a, b) => a + b.trend, 0);

  const L = [];
  const w = (s) => L.push(s === undefined ? '' : s);

  w('# Static Logic Audit — kya cover hua, kya nahi');
  w('');
  w('Ye file **script se bani hai**, haath se nahi — isliye numbers code aur data se');
  w('seedhe nikle hain, andaze se nahi.');
  w('');
  w('```');
  w('node Backend/scripts/audit-static-logic.js ' + DATA);
  w('```');
  w('');
  /* --- kaunse grids me trend / calculated rows lagti hain --- */
  let trendableGrids = 0; const trendableQ = new Set();
  let calcGrids = 0; let calcRows = 0;
  docs.forEach((q) => gridsOf(q).forEach((g) => {
    const isY = (s) => /(19|20)\d{2}/.test(s) || /\bFY\b/i.test(s);
    const years = g.headers.filter((h, i) => i > 0 && isY(h)).length;
    if (years >= 3) { trendableGrids += 1; trendableQ.add(oid(q)); }
    const hits = g.rowLabels.filter((r, i) => i > 0 && /total|%|percent|intensity|average|per /i.test(r));
    if (hits.length) { calcGrids += 1; calcRows += hits.length; }
  }));

  const doableNow = covered.length + noEngine.length;

  w('---');
  w('');
  w('## 0. ABHI kya dynamically ho sakta hai');
  w('');
  w('Ye sabse seedha sawal hai: **jo feature aaj bane hue hain aur jinka Admin screen');
  w('maujood hai, unse kitna kaam ho sakta hai — aaj, bina aur code likhe.**');
  w('');
  w('### ✅ Aaj ho sakta hai');
  w('');
  w('| Kaam | Kitna | Screen kahan |');
  w('| --- | ---: | --- |');
  w('| **Grid formulas** — total, %, intensity wali rows apne aap bharna | **' + calcGrids
    + ' grids, ' + calcRows + ' rows** | Grid cell → `+ Add Calc`, phir **Add formula** |');
  w('| **Trend rules** — assessor ka option data se chunna | **' + covered.length
    + ' questions** (' + trendBlocks + ' blocks) | **Add formula → Assessor validation** |');
  w('| **Option-only branches** — jinme koi hisaab hai hi nahi | **' + noEngine.length
    + ' branches** | **Assessor Option** screen |');
  w('');
  w('**Kul ' + doableNow + ' assessor validation branches out of ' + branches.length
    + ' aaj hi dynamic ho sakte hain**, aur ' + calcGrids + ' grids me formula lag sakta hai.');
  w('');
  w('Iske alawa **' + trendableQ.size + ' aur questions** aise hain jinke grid me 3+ saal ke');
  w('columns hain — yaani un pe bhi trend rule lag *sakta* hai, chahe aaj code me unke liye');
  w('koi hardcoded logic na ho. Ye admin ka faisla hai, majboori nahi.');
  w('');
  w('### ❌ Aaj nahi ho sakta');
  w('');
  w('| Kaam | Kitna | Kya rok raha hai |');
  w('| --- | ---: | --- |');
  w('| Number → band (grid ke bahar) | **' + notCovered.length
    + ' branches** | Band editor sirf grid formula popup ke andar hai |');
  w('| Grid cell → band | **' + partial.length
    + ' branches** | Pehle formula se value nikalni padegi, phir band lagana |');
  w('| Fixed / passthrough / gridLookup scoring | **0 screen se** | Engines bane hain aur test bhi hain, **par unka Admin screen nahi hai** |');
  w('| Samajh me na aane wale branches | **' + review.length + '** | Pehle padhna padega |');
  w('');
  w('> **Sabse badi rukavat scoring rules hai.** `fixed`, `numericBand`, `gridLookup`,');
  w('> `passthrough` — chaaron engines bane hain, backend save pe validate bhi karta hai.');
  w('> Par inhe question pe lagane ka **koi screen nahi hai**, isliye aaj inse ek bhi question');
  w('> dynamic nahi kiya ja sakta — sirf database me seedhe daalkar.');
  w('');
  w('---');
  w('');
  w('## 1. Ek nazar me');
  w('');
  w('| Cheez | Ginti |');
  w('| --- | ---: |');
  w('| Kul questions | ' + docs.length + ' |');
  w('| Jinme grid hai | ' + allGridQs.length + ' questions, ' + gridSubCount + ' grids |');
  w('| **Grid jinme formula laga hua hai** | **' + withFormula.length + '** |');
  w('| Assessor validation branches (code me) | ' + branches.length + ' |');
  w('| — inme trend blocks | ' + trendBlocks + ' |');
  w('| **Trend rule ban chuka hai** (authored) | **' + withTrend.length + '** |');
  w('| `utility.service.ts` me hardcoded question IDs | ' + utilIds.length + ' |');
  w('| `MarkService.js` me hardcoded IDs | ' + markIds.length + ' |');
  w('| `StaticMark.js` me hardcoded IDs | ' + staticIds.length + ' |');
  w('');
  w('### Coverage — assessor validations');
  w('');
  w('| Halat | Branches | Matlab |');
  w('| --- | ---: | --- |');
  w('| ✅ Covered | ' + covered.length + ' | Trend rule builder se ban sakte hain, aaj |');
  w('| 🟡 Partial | ' + partial.length + ' | Band editor hai, par input grid formula se nikaalna padega |');
  w('| ❌ Not covered | ' + notCovered.length + ' | Naya UI chahiye — band editor numeric input pe |');
  w('| ⚪ Engine ki zaroorat nahi | ' + noEngine.length + ' | Ye data hai, logic nahi — UI se author karo |');
  w('| 🔍 Padhna baaki | ' + review.length + ' | Mila-jula, alag se dekhna hoga |');
  w('');
  w('> **Sabse zaroori baat:** ' + withFormula.length + ' grids me formula laga hai out of '
    + gridSubCount + '. Yaani grid autocomplete ka feature **ban chuka hai par abhi kisi question pe '
    + 'lagaya nahi gaya**. Ye kaam ka nahi, authoring ka baaki hissa hai.');
  w('');
  w('---');
  w('');
  w('## 2. Assessor validations — ek-ek branch');
  w('');

  const order = ['COVERED', 'PARTIAL', 'NOT COVERED', 'NO ENGINE NEEDED', 'NEEDS REVIEW'];
  const icon = {
    COVERED: '✅', PARTIAL: '🟡', 'NOT COVERED': '❌',
    'NO ENGINE NEEDED': '⚪', 'NEEDS REVIEW': '🔍',
  };
  order.forEach((st) => {
    const grp = cls.filter((x) => x.c.status === st);
    if (!grp.length) return;
    w('### ' + icon[st] + ' ' + st + ' — ' + grp.length + ' branch' + (grp.length > 1 ? 'es' : ''));
    w('');
    grp.forEach(({ b, c }) => {
      const q = byId[b.id];
      w('#### `' + b.id + '`' + (b.trend ? '  ·  ' + b.trend + ' trend blocks' : ''));
      w('');
      if (q) {
        w('- **Question**: ' + clean(q.question).slice(0, 150));
        w('- **Category**: ' + q.category + '  ·  order ' + (q.questionOrderNo || q.position)
          + '  ·  roles: ' + (q.type || []).join(', '));
        const gs = gridsOf(q);
        if (gs.length) {
          const g = gs[0];
          w('- **Grid**: ' + g.rowCount + ' rows × ' + g.colCount + ' cols');
          w('  - columns: `' + g.headers.map((h) => h || '—').join('` · `') + '`');
          w('  - rows: `' + g.rowLabels.slice(1, 9).filter(Boolean).join('` · `') + '`');
        } else {
          w('- **Grid**: nahi hai');
        }
      } else {
        w('- ⚠ **Ye question is data me nahi hai** — shayad purane financial year ka hai.');
      }
      w('- **Code**: `questionnaire-form.component.ts` lines ' + b.from + '–' + b.to
        + ' (' + b.lines + ' lines)');
      w('- **Logic ka type**: ' + c.type);
      w('- **Aaj kya formula laga hai**: ' + c.formula);
      w('- **Dynamic kaise banega**: ' + c.how);
      w('');
    });
  });

  w('---');
  w('');
  w('## 3. Grid autocomplete — kaunse grids me formula chahiye');
  w('');
  w('Neeche wo grids hain jinki row ya column ke naam me "total", "%" ya "intensity"');
  w('jaisa kuch hai — yaani jo lagbhag pakka doosre cells se nikalte hain. Ye ginti');
  w('**suggestion hai, faisla nahi** — asli list admin hi tay karega.');
  w('');
  const candidates = [];
  docs.forEach((q) => {
    gridsOf(q).forEach((g) => {
      const hits = g.rowLabels
        .map((r, i) => ({ r, i }))
        .filter((x) => x.i > 0 && /total|%|percent|intensity|per\s|average/i.test(x.r));
      if (hits.length) candidates.push({ q, g, hits });
    });
  });
  w('**' + candidates.length + ' grids** me aisi rows mili, kul **'
    + candidates.reduce((a, c) => a + c.hits.length, 0) + ' rows**.');
  w('');
  w('| Question | Category | Grid | Jo rows calculated lagti hain | Formula laga? |');
  w('| --- | --- | --- | --- | :---: |');
  candidates.slice(0, 60).forEach((c) => {
    w('| ' + clean(c.q.question).slice(0, 58) + ' | ' + c.q.category + ' | '
      + c.g.rowCount + '×' + c.g.colCount + ' | '
      + c.hits.slice(0, 3).map((h) => '`' + h.r.slice(0, 30) + '`').join(', ')
      + (c.hits.length > 3 ? ' +' + (c.hits.length - 3) : '')
      + ' | ' + (c.g.hasFormula ? '✅ ' + c.g.formulaCount : '❌') + ' |');
  });
  if (candidates.length > 60) w('');
  if (candidates.length > 60) w('_…aur ' + (candidates.length - 60) + ' aur._');
  w('');
  w('### Kaise dynamic banega');
  w('');
  w('Grid me cell pe **+ Add Calc** chuno, phir **Add formula** popup me formula bana lo —');
  w('`R1C1 + R2C1` jaisa. Ye feature **ban chuka hai aur chal raha hai**; sirf har question pe');
  w('lagana baaki hai. Ek grid me kai formulas ho sakte hain, aur ek formula ka nateeja');
  w('doosre question ke field me bhi ja sakta hai.');
  w('');
  w('---');
  w('');
  w('## 4. Scoring rules — assessor validation se alag');
  w('');
  w('Ye wo logic hai jo **marks** nikalta hai (assessor ka option nahi chunta).');
  w('Teen alag files me phaila hua hai:');
  w('');
  w('| File | Hardcoded question IDs | Kya karta hai |');
  w('| --- | ---: | --- |');
  w('| `utility.service.ts` | ' + utilIds.length + ' | Frontend ka scoring — per-question exceptions |');
  w('| `MarkService.js` | ' + markIds.length + ' | Backend ka wahi scoring, dobara likha hua |');
  w('| `StaticMark.js` | ' + staticIds.length + ' | Per-company fixed scorecards (FY2024) |');
  w('');
  const inData = utilIds.filter((i) => byId[i]);
  w('`utility.service.ts` ke ' + utilIds.length + ' IDs me se **' + inData.length
    + ' aaj ke data me hain**, baaki ' + (utilIds.length - inData.length)
    + ' purane financial year ke lagte hain (unhe migrate karne ki shayad zaroorat hi na ho —');
  w('pehle ye confirm karna behtar hai).');
  w('');
  w('### Aaj ke data me maujood questions jinpe hardcoded scoring hai');
  w('');
  w('| Question ID | Question | Category |');
  w('| --- | --- | --- |');
  inData.forEach((id) => {
    const q = byId[id];
    w('| `' + id.slice(-8) + '` | ' + clean(q.question).slice(0, 70) + ' | ' + q.category + ' |');
  });
  w('');
  w('### Inhe dynamic banane ke chaar tareeke');
  w('');
  w('| Aaj code me | Dynamic roop | Ban chuka? |');
  w('| --- | --- | :---: |');
  w('| `obtendMark = 50` — fixed | `scoringRule: { engine: "fixed", config: { marks: 50 } }` | ✅ |');
  w('| number → band table | `engine: "numericBand"` | ✅ |');
  w('| grid cell ka text → marks | `engine: "gridLookup"` | ✅ |');
  w('| user ka number hi mark hai | `engine: "passthrough"` | ✅ |');
  w('');
  w('Chaaron engines `Backend/scoring/rule-engines.js` me hain aur test bhi hain.');
  w('**Jo baaki hai wo ek Admin screen hai** jahan se ye rules question pe lagaye ja sakein —');
  w('abhi inhe daalne ka koi UI nahi hai.');
  w('');
  w('---');
  w('');
  w('## 5. Ab kya karna hai — kram se');
  w('');
  w('1. **Grid formulas lagao** — feature taiyar hai, ' + gridSubCount
    + ' grids me se abhi ' + withFormula.length + ' pe laga hai. Sabse zyada faayda, sabse kam risk.');
  w('2. **Trend rules lagao** — ' + trendBlocks + ' blocks, ' + covered.length
    + ' questions. Builder taiyar hai; `generate-trend-rules.js` se ready config mil jaata hai.');
  w('3. **Option-only branches hatao** — ' + noEngine.length
    + ' branches me koi hisaab hai hi nahi, sirf option list hai. Unhe Assessor Option screen se');
  w('   author karke code se hata dena chahiye. Ye sabse aasan safai hai.');
  w('4. **Band editor ko numeric input pe bhi lao** — isse ' + notCovered.length
    + ' aur branches cover ho jayenge.');
  w('5. **Scoring rules ke liye Admin screen** — engines taiyar hain, UI nahi.');
  w('6. **' + review.length + ' branches padho** — inme kya ho raha hai ye pehle samajhna hoga.');
  w('');
  w('---');
  w('');
  w('## 6. Ek cheez jo dhyan me rakhni hai');
  w('');
  w('Purana trend code `>5` / `−5..5` / `<−5` use karta hai. Iska matlab hai ki **bilkul');
  w('`5%` ya `−5%`** pe teeno conditions false hoti hain — koi option select nahi hota aur');
  w('applicant ko chup-chaap **zero marks** milte hain.');
  w('');
  w('Naya band editor gap banne hi nahi deta, to wahan bhi option milega. Yaani jis');
  w('applicant ka change theek 5% ya −5% hai, **uska mark badlega**. Ye theek hona hai —');
  w('par client ko bataye bina production pe nahi jaana chahiye.');

  fs.writeFileSync(path.join(ROOT, OUT), L.join('\n'), 'utf8');
  console.log(OUT + ' ban gayi — ' + L.length + ' lines');
  console.log('');
  console.log('  questions        : ' + docs.length);
  console.log('  grids            : ' + gridSubCount + ' (' + allGridQs.length + ' questions)');
  console.log('  formula laga     : ' + withFormula.length);
  console.log('  branches         : ' + branches.length + '  (trend blocks: ' + trendBlocks + ')');
  console.log('  covered          : ' + covered.length);
  console.log('  partial          : ' + partial.length);
  console.log('  not covered      : ' + notCovered.length);
  console.log('  engine not needed: ' + noEngine.length);
  console.log('  needs review     : ' + review.length);
}

main();
