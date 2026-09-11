/**
 * AUDIT QUESTION SCORE — "is question ka mark galat hai" ka jawab.
 *
 * KYA KARTA HAI
 *   Ek applicant ke ek question ka score step-by-step kholta hai:
 *     - question ka text, category, maxMark
 *     - applicant ne kya bhara, assessor/admin ne kya select kiya
 *     - kaunse assessorOption selected hain aur unke marks kya hain
 *     - teeno modes (applicant / assessorOnly / final) me kya score bana
 *     - FE aur BE alag jawab de rahe hain ya nahi
 *     - is question par koi HARDCODED special rule laga hua hai ya nahi
 *       (source files me questionId dhoondh kar batata hai)
 *
 * KYUN
 *   Aaj client kahe "ye mark galat hai" to jawab dene ke liye ek 550-line
 *   function padhna padta hai. Ye script wahi kaam seconds me karti hai.
 *
 * SAFE HAI
 *   Sirf find(). Koi DB write nahi. Koi file bhi nahi likhta (jab tak --out
 *   na do).
 *
 * ISTEMAAL (Backend/ se)
 *   node scripts/audit-question-score.js <applicantId> <questionId>
 *   node scripts/audit-question-score.js <applicantId> <questionId> --fy=2025
 *   node scripts/audit-question-score.js <applicantId> --list
 *   MONGO_URL="mongodb://host/db" node scripts/audit-question-score.js <a> <q>
 *
 * OPTIONS
 *   --list        us applicant ke saare questions aur unke scores dikhao
 *                 (questionId dena zaroori nahi)
 *   --fy=<year>   financial year
 *   --raw         raw JSON bhi print karo
 *   --out=<path>  report file me likho
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const beEngine = require('../controllers/MarkService.js');
const { loadFrontendScoring } = require('./lib/fe-scoring-loader');
const { MODES, runMode, summarise, clone } = require('./lib/scoring-modes');
const { buildApplicantFilter } = require('./lib/id-filter');

const DEFAULT_MONGO_URL =
  process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

/** Jin files me per-question hardcoded rules milte hain. */
const RULE_FILES = [
  'src/app/services/utility/utility.service.ts',
  'src/app/dashboard/section-wise-classification/custom-section-wise-marks.service.ts',
  'src/app/services/utility/question-serial.service.ts',
  'src/app/dashboard/dashboard-components/linking-dashboard-data.service.ts',
  'Backend/controllers/MarkService.js',
  'Backend/controllers/StaticMark.js',
  'Backend/controllers/MarkCalculator.js',
  'Backend/controllers/ApiController.js',
];

function parseArgs(argv) {
  const o = { positional: [] };
  for (const a of argv) {
    if (a === '--list') o.list = true;
    else if (a === '--raw') o.raw = true;
    else if (a.startsWith('--fy=')) o.fy = a.split('=')[1];
    else if (a.startsWith('--out=')) o.out = a.split('=')[1];
    else if (a.startsWith('--mongo-url=')) o.mongoUrl = a.split('=')[1];
    else if (!a.startsWith('--')) o.positional.push(a);
  }
  return o;
}

/** Source files me questionId dhoondh kar batata hai ki special rule kahan hai. */
function findHardcodedRules(questionId) {
  const root = path.join(__dirname, '..', '..');
  const hits = [];
  for (const rel of RULE_FILES) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    lines.forEach((l, i) => {
      if (l.includes(questionId)) {
        hits.push({ file: rel, line: i + 1, code: l.trim().slice(0, 120) });
      }
    });
  }
  return hits;
}

const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

function printOptions(label, options, indent = '    ') {
  if (!Array.isArray(options) || !options.length) return;
  console.log(`${indent}${label}:`);
  options.forEach((opt, i) => {
    const sel = opt?.isSelected ? '[x]' : '[ ]';
    const na = opt?.marksnotapplicable ? '  (marks N/A)' : '';
    console.log(`${indent}  ${sel} ${strip(opt?.option).slice(0, 70).padEnd(70)} marks=${opt?.marks ?? '-'}${na}`);
    (opt?.subOption || []).forEach((s) => {
      const ss = s?.isSelected ? '[x]' : '[ ]';
      console.log(`${indent}      ${ss} ${strip(s?.option).slice(0, 64).padEnd(64)} marks=${s?.marks ?? '-'}`);
    });
  });
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  const [applicantId, questionId] = opts.positional;

  if (!applicantId) {
    console.error('Usage: node scripts/audit-question-score.js <applicantId> <questionId>');
    console.error('       node scripts/audit-question-score.js <applicantId> --list');
    process.exit(1);
  }
  if (!questionId && !opts.list) {
    console.error('questionId do, ya --list use karo.');
    process.exit(1);
  }

  const url = opts.mongoUrl || DEFAULT_MONGO_URL;
  const fe = loadFrontendScoring();

  await mongoose.connect(url);
  const db = mongoose.connection.db;

  const filter = buildApplicantFilter({ applicant: applicantId, fy: opts.fy });
  const doc = await db.collection('applicantquestionnaires').findOne(filter);

  if (!doc) {
    console.error(`Applicant ${applicantId}${opts.fy ? ` (FY${opts.fy})` : ''} ka questionnaire nahi mila.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const out = [];
  const say = (s = '') => { console.log(s); out.push(s); };

  // ---- Saare mode ke scores ek baar nikaal lo ----
  const modeResults = {};
  for (const mode of MODES) {
    const be = runMode(beEngine, doc.answers, mode, doc.financialYear);
    const feR = runMode(fe, doc.answers, mode, doc.financialYear);
    modeResults[mode] = {
      be: be.ok ? summarise(be.result) : null,
      fe: feR.ok ? summarise(feR.result) : null,
      beError: be.ok ? null : be.error,
      feError: feR.ok ? null : feR.error,
      fn: be.fn,
    };
  }

  // ---- --list mode ----
  if (opts.list) {
    say(`Applicant ${applicantId}  FY${doc.financialYear || '?'}  —  ${doc.answers?.length || 0} questions`);
    say('');
    say('  questionId                 category          final  assessorOnly  applicant  max   FE≠BE');
    say('  ' + '-'.repeat(92));
    const byQ = {};
    for (const mode of MODES) {
      (modeResults[mode].be?.perQuestion || []).forEach((q) => {
        byQ[q.questionId] = byQ[q.questionId] || { category: q.category, maxMark: q.maxMark };
        byQ[q.questionId][mode] = q.obtainedMark;
      });
      (modeResults[mode].fe?.perQuestion || []).forEach((q) => {
        byQ[q.questionId] = byQ[q.questionId] || { category: q.category, maxMark: q.maxMark };
        byQ[q.questionId][`fe_${mode}`] = q.obtainedMark;
      });
    }
    Object.entries(byQ).forEach(([qid, v]) => {
      const drift = MODES.some((m) => v[m] !== v[`fe_${m}`]) ? ' ⚠' : '';
      say(
        `  ${qid.padEnd(26)} ${String(v.category).slice(0, 16).padEnd(17)} ` +
        `${String(v.final ?? '-').padStart(5)}  ${String(v.assessorOnly ?? '-').padStart(12)}  ` +
        `${String(v.applicant ?? '-').padStart(9)}  ${String(v.maxMark ?? '-').padStart(4)}${drift}`
      );
    });
    say('');
    say('  ⚠ = is question pe FE aur BE alag score dete hain');
    if (opts.out) fs.writeFileSync(path.resolve(opts.out), out.join('\n') + '\n');
    await mongoose.disconnect();
    return;
  }

  // ---- Single question audit ----
  const ans = (doc.answers || []).find((a) => String(a.questionId) === String(questionId));
  if (!ans) {
    console.error(`Question ${questionId} is applicant ke answers me nahi hai.`);
    console.error('--list se saare questions dekho.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const master = await db.collection('questionnaires').findOne({
    $or: [{ rootQuestionId: ans.questionId }, { _id: ans.questionId }],
  });

  say('='.repeat(96));
  say(`AUDIT  —  applicant ${applicantId}  |  question ${questionId}`);
  say('='.repeat(96));
  say('');
  say(`Question   : ${strip(ans.question || master?.question).slice(0, 200)}`);
  say(`Category   : ${ans.category || master?.category || '-'}`);
  say(`Section    : ${ans.section || master?.section || '-'} / ${ans.subSection || master?.subSection || '-'}`);
  say(`maxMark    : ${ans.maxMark ?? master?.maxMark ?? '-'}   isMarks: ${ans.isMarks ?? master?.isMarks ?? '-'}`);
  say(`FY         : ${doc.financialYear || '?'}   type: ${JSON.stringify(master?.type || '-')}`);
  say(`Master doc : ${master ? master._id : 'NAHI MILA (question delete ho chuka hai?)'}`);

  // ---- Scores ----
  say('');
  say('-'.repeat(96));
  say('SCORES');
  say('-'.repeat(96));
  say('');
  say('  mode            engine function                                   BE       FE     match');
  say('  ' + '-'.repeat(88));
  for (const mode of MODES) {
    const r = modeResults[mode];
    const beQ = r.be?.perQuestion.find((q) => q.questionId === String(questionId));
    const feQ = r.fe?.perQuestion.find((q) => q.questionId === String(questionId));
    const b = beQ ? beQ.obtainedMark : (r.beError ? 'ERR' : '-');
    const f = feQ ? feQ.obtainedMark : (r.feError ? 'ERR' : '-');
    const match = String(b) === String(f) ? 'yes' : 'NO  ⚠';
    say(`  ${mode.padEnd(15)} ${r.fn.padEnd(44)} ${String(b).padStart(6)}  ${String(f).padStart(6)}   ${match}`);
  }

  // ---- Kis response se score bana ----
  const usedResp = (ans.adminResp?.length ? 'adminResp' : (ans.assessorResp?.length ? 'assessorResp' : 'answer'));
  say('');
  say('-'.repeat(96));
  say(`SCORE KIS DATA SE BANA  —  "${usedResp}"`);
  say('-'.repeat(96));
  say('');
  say('  (engine adminResp ko sabse pehle, phir assessorResp, phir applicant ke answer ko dekhta hai)');

  const respArr = ans.adminResp?.length ? ans.adminResp : (ans.assessorResp?.length ? ans.assessorResp : ans.answer);
  (respArr || []).forEach((item, i) => {
    const picked = item?.ansValue && item?.ansValue === item?.answerLabel;
    say('');
    say(`  Option ${i + 1}${picked ? '   <-- SELECTED' : ''}`);
    say(`    answerLabel : ${strip(item?.answerLabel).slice(0, 80)}`);
    say(`    ansValue    : ${strip(item?.ansValue).slice(0, 80) || '(khali)'}`);
    say(`    score       : ${item?.score ?? '-'}`);
    printOptions('assessorOption (question level)', item?.assessorOption);

    (item?.subanswar || []).forEach((sub, si) => {
      const bits = [];
      if (sub?.subAnswerTypes) bits.push(sub.subAnswerTypes);
      if (sub?.ansValue) bits.push(`ansValue=${strip(sub.ansValue).slice(0, 30)}`);
      if (sub?.numericTypeVal !== undefined && sub?.numericTypeVal !== null && sub?.numericTypeVal !== '')
        bits.push(`numeric=${sub.numericTypeVal}`);
      if (sub?.textTypeVal) bits.push(`text=${strip(sub.textTypeVal).slice(0, 24)}`);
      bits.push(`subscore=${sub?.subscore ?? '-'}`);
      say(`    sub ${si + 1}: ${strip(sub?.subAnswerLabel).slice(0, 52).padEnd(52)} ${bits.join('  ')}`);
      printOptions('assessorOption (sub level)', sub?.assessorOption, '      ');
      if (sub?.subAnswerTypes === 'Grid') {
        const rows = sub?.grid?.gridValue || sub?.[String(si)] || [];
        say(`        Grid: ${Array.isArray(rows) ? rows.length : 0} rows`);
      }
    });
  });

  // ---- Hardcoded rules ----
  const rules = findHardcodedRules(String(questionId));
  say('');
  say('-'.repeat(96));
  say('IS QUESTION PAR HARDCODED RULES');
  say('-'.repeat(96));
  say('');
  if (!rules.length) {
    say('  Koi hardcoded rule nahi mila — ye question normal engine se score hota hai.');
  } else {
    say(`  ${rules.length} jagah is questionId ka naam liya gaya hai:`);
    say('');
    rules.forEach((r) => say(`    ${r.file}:${r.line}\n        ${r.code}`));
    say('');
    say('  ⚠ Iska matlab is question ka score normal rules se nahi, in special');
    say('    code paths se bhi prabhavit hota hai. Mark galat hone ka sabse likely');
    say('    kaaran yahi hai.');
  }

  if (opts.raw) {
    say('');
    say('-'.repeat(96));
    say('RAW ANSWER JSON');
    say('-'.repeat(96));
    say(JSON.stringify(clone(ans), null, 2));
  }

  say('');
  if (opts.out) {
    const p = path.resolve(opts.out);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, out.join('\n') + '\n');
    console.log(`Report likhi gayi: ${p}`);
  }

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
