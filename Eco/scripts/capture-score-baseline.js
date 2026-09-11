/**
 * SCORE BASELINE — aaj ke asli scores ka snapshot.
 *
 * KYA KARTA HAI
 *   Har applicant ke liye aaj ka scoring engine chalata hai — teeno modes me
 *   (applicant / assessorOnly / final) — aur per-question, per-category aur
 *   total score ek JSON fixture me likh deta hai.
 *
 * YE `capture-baseline.js` SE ALAG KYUN HAI  ← zaroori
 *   Purani script `applicantquestionnaires.answers[].obtendMark` DB se PADHTI
 *   hai. Wo field kabhi likhi hi nahi jaati — assessor save karne par sirf
 *   `assessorResp`, `isAssessorChecked` aur `assessorComment` store hote hain
 *   (ApiController.js:3026-3031). Poore backend me `obtendMark` ka koi
 *   $set/update/save nahi hai. DB me uski value `""` hoti hai, isliye purani
 *   script har question pe `obtainedMark: 0` deti hai aur uska diff hamesha
 *   khali rehta hai — chahe engine poori tarah toot jaye.
 *
 *   Ye script score PADHTI nahi, COMPUTE karti hai.
 *
 * SAFE HAI
 *   Sirf find() karta hai. Koi update/insert/delete/save/bulkWrite/drop nahi.
 *   Sirf ek JSON file likhta hai.
 *
 * ISTEMAAL (Backend/ se)
 *   node scripts/capture-score-baseline.js
 *   node scripts/capture-score-baseline.js --engine=fe
 *   node scripts/capture-score-baseline.js --out=fixtures/before.json
 *   MONGO_URL="mongodb://host:27017/db" node scripts/capture-score-baseline.js
 *
 * OPTIONS
 *   --engine=be|fe    kaunsa engine chalana hai (default: be — kyunki stored
 *                     data usi se bana hai, wahi authoritative hai)
 *   --out=<path>      output file (default: fixtures/score-baseline-<date>.json)
 *   --applicant=<id>  sirf ek applicant
 *   --fy=<year>       sirf ek financial year
 *   --mongo-url=<url>
 *   --quiet           sirf summary print karo
 *
 * OUTPUT
 *   fixtures/score-baseline-<date>.json — is shape me:
 *   {
 *     meta: { capturedAt, engine, mongoUrl, applicantCount, ... },
 *     applicants: [{ applicantId, financialYear, modes: {
 *        final: { total, maxTotal, perCategory[], perQuestion[] }, ... } }]
 *   }
 *
 * DIFF KAISE KARNA
 *   node scripts/diff-score-baseline.js fixtures/before.json fixtures/after.json
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const beEngine = require('../controllers/MarkService.js');
const { loadFrontendScoring } = require('./lib/fe-scoring-loader');
const { MODES, runMode, summarise } = require('./lib/scoring-modes');
const { buildApplicantFilter } = require('./lib/id-filter');

const DEFAULT_MONGO_URL =
  process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

/**
 * Khali dataset pe ruk jaana — warning nahi, ERROR.
 *
 * KYUN: 0 applicants pe ye script poori tarah normally chalti hai, "Applicants 0"
 * print karti hai, aur ek khali fixture likh deti hai. Us fixture ka diff HAMESHA
 * empty aata hai — chahe scoring engine poori tarah toot chuka ho. Yaani khali
 * dataset se aayi green diff, no-diff se bhi zyada khatarnak hai, kyunki uspe
 * bharosa kiya jaata hai. (Ye actually hua tha: local DB khali thi aur uske aadhar
 * pe "FE/BE drift kaaran nahi hai" maan liya gaya tha.)
 *
 * Isliye yahan fixture likhe BINA non-zero exit code ke saath marte hain.
 */
function abortEmptyDataset({ db, url, filter, reason }) {
  console.error('');
  console.error('  ✖ RUKO — baseline capture NAHI hui.');
  console.error('');
  console.error(`    ${reason}`);
  console.error('');
  console.error(`    Database : ${db.databaseName}`);
  console.error(`    URL      : ${url}`);
  console.error(`    Filter   : ${JSON.stringify(filter)}`);
  console.error('');
  console.error('    Khali dataset pe is script ka diff hamesha empty aata hai,');
  console.error('    isliye ye ERROR hai, warning nahi. Koi fixture file nahi likhi gayi.');
  console.error('');
  if (filter && Object.keys(filter).length > 0) {
    console.error('    Sambhavit wajah: --applicant / --fy filter se koi document match nahi hua.');
  }
  console.error('    Sambhavit wajah: MONGO_URL galat (ya khali) DB pe point kar raha hai.');
  console.error('      MONGO_URL="mongodb://<host>:27017/CII_CESD_ECO_EDGE" node scripts/capture-score-baseline.js');
  console.error('');
  process.exit(1);
}

function parseArgs(argv) {
  const o = { engine: 'be' };
  for (const a of argv) {
    if (a === '--quiet') o.quiet = true;
    else if (a.startsWith('--engine=')) o.engine = a.split('=')[1];
    else if (a.startsWith('--out=')) o.out = a.split('=')[1];
    else if (a.startsWith('--applicant=')) o.applicant = a.split('=')[1];
    else if (a.startsWith('--fy=')) o.fy = a.split('=')[1];
    else if (a.startsWith('--mongo-url=')) o.mongoUrl = a.split('=')[1];
  }
  return o;
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  const url = opts.mongoUrl || DEFAULT_MONGO_URL;

  if (!['be', 'fe'].includes(opts.engine)) {
    console.error(`--engine sirf "be" ya "fe" ho sakta hai (mila: ${opts.engine})`);
    process.exit(1);
  }

  const engine = opts.engine === 'fe' ? loadFrontendScoring() : beEngine;

  await mongoose.connect(url);
  const db = mongoose.connection.db;
  console.log(`Connected to ${db.databaseName}  |  engine: ${opts.engine.toUpperCase()}`);

  const filter = buildApplicantFilter({ applicant: opts.applicant, fy: opts.fy });

  const docs = await db
    .collection('applicantquestionnaires')
    .find(filter)
    .sort({ financialYear: 1, applicant_id: 1 })
    .toArray();

  if (docs.length === 0) {
    abortEmptyDataset({
      db,
      url,
      filter,
      reason: 'Ek bhi applicantquestionnaire document nahi mila.',
    });
  }

  const applicants = [];
  const errors = [];
  let answersSeen = 0;

  for (const d of docs) {
    if (!Array.isArray(d.answers) || !d.answers.length) continue;
    answersSeen += d.answers.length;

    const entry = {
      applicantId: String(d.applicant_id),
      financialYear: d.financialYear || '',
      appli_submmited_status: d.appli_submmited_status || '',
      assessor_submmited_status: d.assessor_submmited_status || '',
      admin_approval: d.admin_approval || '',
      isPublishedScoreCard: d.isPublishedScoreCard || false,
      answerCount: d.answers.length,
      modes: {},
    };

    for (const mode of MODES) {
      const r = runMode(engine, d.answers, mode, d.financialYear);
      if (!r.ok) {
        errors.push({ applicantId: entry.applicantId, mode, fn: r.fn, error: r.error });
        entry.modes[mode] = { error: r.error, fn: r.fn };
        continue;
      }
      entry.modes[mode] = { fn: r.fn, ...summarise(r.result) };
    }

    applicants.push(entry);
  }

  // Documents mil sakte hain par sabme `answers` khali ho — tab bhi summary
  // "Applicants 0" hi dikhati hai aur fixture khali rehti hai. Ye wahi failure
  // mode hai, isliye yahan bhi rukna zaroori hai.
  if (applicants.length === 0) {
    abortEmptyDataset({
      db,
      url,
      filter,
      reason:
        `${docs.length} document mile, lekin kisi me bhi answers nahi the — ` +
        'ek bhi applicant score nahi hua.',
    });
  }

  const capturedAt = new Date().toISOString();
  const outPath = path.resolve(
    opts.out || path.join(__dirname, '..', '..', 'fixtures', `score-baseline-${capturedAt.slice(0, 10)}.json`)
  );

  const payload = {
    meta: {
      script: 'capture-score-baseline',
      version: 1,
      capturedAt,
      engine: opts.engine,
      database: db.databaseName,
      scope: { applicant: opts.applicant || null, financialYear: opts.fy || null },
      applicantCount: applicants.length,
      answersSeen,
      errorCount: errors.length,
    },
    errors,
    applicants,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');

  // ---- summary ----
  console.log('');
  console.log('Score baseline captured');
  console.log('');
  const line = (k, v) => console.log(`  ${String(k).padEnd(32)} ${v}`);
  line('Applicants', applicants.length);
  line('Answers processed', answersSeen);
  line('Errors', errors.length);
  console.log('');
  for (const mode of MODES) {
    const totals = applicants
      .map((a) => a.modes[mode])
      .filter((m) => m && typeof m.total === 'number');
    const sum = totals.reduce((s, m) => s + m.total, 0);
    const nonZero = totals.filter((m) => m.total > 0).length;
    line(`${mode} — grand total`, sum.toFixed(2));
    line(`${mode} — applicants scoring > 0`, `${nonZero} / ${applicants.length}`);
  }
  console.log('');
  line('Output', outPath);

  if (errors.length && !opts.quiet) {
    console.log('');
    console.log(`  Errors (${errors.length}), pehle 10:`);
    errors.slice(0, 10).forEach((e) =>
      console.log(`    ${e.applicantId} [${e.mode}] ${e.fn}: ${e.error}`)
    );
  }

  // Sanity: agar sab totals 0 hain to kuch galat hai — chup mat raho
  const finalTotals = applicants.map((a) => a.modes.final?.total || 0);
  if (finalTotals.length && finalTotals.every((t) => t === 0)) {
    console.log('');
    console.log('  ⚠ WARNING: har applicant ka final score 0 hai.');
    console.log('    Iska matlab ho sakta hai ki data me assessor responses hi nahi hain,');
    console.log('    ya engine chal nahi paya. Baseline ko bharosemand maanne se pehle');
    console.log('    ek applicant pe audit-question-score.js chala kar dekho.');
  }

  console.log('');
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
