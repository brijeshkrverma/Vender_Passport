/**
 * FE vs BE SCORING COMPARISON — "mark galat aa raha hai" ka pehla jawab.
 *
 * KYA KARTA HAI
 *   Frontend ka scoring (src/app/services/utility/utility.service.ts) aur
 *   backend ka scoring (Backend/controllers/MarkService.js) — dono ko EXACTLY
 *   same input dekar chalata hai, aur batata hai ki kaunse applicant ke kaunse
 *   question pe dono alag jawab dete hain.
 *
 * KYUN
 *   Dono implementations ~98% same hain par drift kar chuke hain. Iska matlab
 *   ek hi applicant ka score is baat pe depend kar sakta hai ki wo kis screen
 *   se dekha ja raha hai. Client ki "kuch me mark galat aa rahe hain" wali
 *   complaint ka ye sabse likely kaaran hai — ye script use confirm ya reject
 *   karti hai.
 *
 *   FE ka code TypeScript hai; use chalane ke liye scripts/lib/fe-scoring-loader.js
 *   usse transpile karke load karta hai (Angular load nahi hota).
 *
 * SAFE HAI
 *   Sirf find(). Koi DB write nahi. Sirf ek JSON report likhta hai.
 *
 * ISTEMAAL (Backend/ se)
 *   node scripts/compare-fe-be-scoring.js
 *   node scripts/compare-fe-be-scoring.js --mode=final
 *   node scripts/compare-fe-be-scoring.js --applicant=<id> --verbose
 *   MONGO_URL="mongodb://host:27017/db" node scripts/compare-fe-be-scoring.js
 *
 * OPTIONS
 *   --mode=all|applicant|assessorOnly|final   (default: all)
 *   --applicant=<id>   sirf ek applicant
 *   --fy=<year>        sirf ek financial year
 *   --question=<id>    sirf ek question (client ke bataye question ke liye)
 *   --tolerance=<n>    itne se kam farq ignore karo (default 0.0001, floating point)
 *   --out=<path>       default: fixtures/fe-be-comparison-<date>.json
 *   --verbose          har mismatch print karo (default: pehle 40)
 *
 * OUTPUT PADHNA
 *   "questionMismatches" hi asli jawab hai — usme har row batati hai:
 *   applicantId, questionId, mode, feScore, beScore, difference
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
 * KYUN: 0 applicants pe ye script bina kisi shikayat ke chalti hai aur
 * "✅ FE aur BE bilkul same jawab dete hain" print kar deti hai — jabki usne
 * kuch compare kiya hi nahi. Wo "✅" khali DB ka artefact hai, clean code ka
 * nahi. (Ye actually hua tha, aur uske aadhar pe "FE/BE drift kaaran nahi hai"
 * maan liya gaya tha. Asli data pe wahi script 845 mismatch dikhati hai.)
 *
 * Isliye yahan report likhe BINA non-zero exit code ke saath marte hain.
 */
function abortEmptyDataset({ db, url, filter, reason }) {
  console.error('');
  console.error('  ✖ RUKO — comparison NAHI hui.');
  console.error('');
  console.error(`    ${reason}`);
  console.error('');
  console.error(`    Database : ${db.databaseName}`);
  console.error(`    URL      : ${url}`);
  console.error(`    Filter   : ${JSON.stringify(filter)}`);
  console.error('');
  console.error('    Khali dataset pe ye script "0 mismatches" ke saath pass ho jaati hai,');
  console.error('    isliye ye ERROR hai, warning nahi. Koi report file nahi likhi gayi.');
  console.error('');
  if (filter && Object.keys(filter).length > 0) {
    console.error('    Sambhavit wajah: --applicant / --fy filter se koi document match nahi hua.');
  }
  console.error('    Sambhavit wajah: MONGO_URL galat (ya khali) DB pe point kar raha hai.');
  console.error('      MONGO_URL="mongodb://<host>:27017/CII_CESD_ECO_EDGE" node scripts/compare-fe-be-scoring.js');
  console.error('');
  process.exit(1);
}

function parseArgs(argv) {
  const o = { mode: 'all', tolerance: 0.0001 };
  for (const a of argv) {
    if (a === '--verbose') o.verbose = true;
    else if (a === '--assert-no-drift') o.assertNoDrift = true;
    else if (a.startsWith('--mode=')) o.mode = a.split('=')[1];
    else if (a.startsWith('--applicant=')) o.applicant = a.split('=')[1];
    else if (a.startsWith('--fy=')) o.fy = a.split('=')[1];
    else if (a.startsWith('--question=')) o.question = a.split('=')[1];
    else if (a.startsWith('--tolerance=')) o.tolerance = Number(a.split('=')[1]);
    else if (a.startsWith('--out=')) o.out = a.split('=')[1];
    else if (a.startsWith('--mongo-url=')) o.mongoUrl = a.split('=')[1];
  }
  return o;
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  const url = opts.mongoUrl || DEFAULT_MONGO_URL;
  const modes = opts.mode === 'all' ? MODES : [opts.mode];

  for (const m of modes) {
    if (!MODES.includes(m)) {
      console.error(`--mode galat hai: ${m}. Allowed: all, ${MODES.join(', ')}`);
      process.exit(1);
    }
  }

  console.log('Frontend scoring load ho raha hai (TypeScript transpile)...');
  const fe = loadFrontendScoring();
  console.log(`  ${fe._meta.members.length} functions mile:`);
  fe._meta.members.forEach((m) =>
    console.log(`    ${m.name.padEnd(45)} lines ${m.startLine}-${m.endLine}`)
  );

  await mongoose.connect(url);
  const db = mongoose.connection.db;
  console.log(`\nConnected to ${db.databaseName}`);

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

  const questionMismatches = [];
  const totalMismatches = [];
  const crashes = [];
  let comparisons = 0;
  let questionsCompared = 0;

  for (const d of docs) {
    if (!Array.isArray(d.answers) || !d.answers.length) continue;

    for (const mode of modes) {
      comparisons += 1;
      const beR = runMode(beEngine, d.answers, mode, d.financialYear);
      const feR = runMode(fe, d.answers, mode, d.financialYear);

      // Ek taraf crash aur doosri taraf nahi — ye apne aap me ek finding hai
      if (!beR.ok || !feR.ok) {
        crashes.push({
          applicantId: String(d.applicant_id),
          financialYear: d.financialYear || '',
          mode,
          be: beR.ok ? 'ok' : `CRASH: ${beR.error}`,
          fe: feR.ok ? 'ok' : `CRASH: ${feR.error}`,
        });
        continue;
      }

      const beS = summarise(beR.result);
      const feS = summarise(feR.result);

      if (Math.abs(beS.total - feS.total) > opts.tolerance) {
        totalMismatches.push({
          applicantId: String(d.applicant_id),
          financialYear: d.financialYear || '',
          mode,
          feTotal: feS.total,
          beTotal: beS.total,
          difference: Number((feS.total - beS.total).toFixed(4)),
        });
      }

      // Per-question comparison
      const beByQ = new Map(beS.perQuestion.map((q) => [q.questionId, q]));
      for (const feq of feS.perQuestion) {
        if (opts.question && feq.questionId !== opts.question) continue;
        const beq = beByQ.get(feq.questionId);
        if (!beq) continue;
        questionsCompared += 1;

        const dScore = feq.obtainedMark - beq.obtainedMark;
        const dMax = feq.maxMark - beq.maxMark;
        if (Math.abs(dScore) > opts.tolerance || Math.abs(dMax) > opts.tolerance) {
          questionMismatches.push({
            applicantId: String(d.applicant_id),
            financialYear: d.financialYear || '',
            questionId: feq.questionId,
            category: feq.category,
            mode,
            feScore: feq.obtainedMark,
            beScore: beq.obtainedMark,
            difference: Number(dScore.toFixed(4)),
            feMaxMark: feq.maxMark,
            beMaxMark: beq.maxMark,
            maxMarkDifference: Number(dMax.toFixed(4)),
          });
        }
      }
    }
  }

  // Kaun se questions sabse zyada baar mismatch hue — yahi triage list hai
  const byQuestion = {};
  for (const m of questionMismatches) {
    if (!byQuestion[m.questionId]) {
      byQuestion[m.questionId] = {
        questionId: m.questionId,
        category: m.category,
        occurrences: 0,
        applicants: new Set(),
        modes: new Set(),
        sampleFe: m.feScore,
        sampleBe: m.beScore,
      };
    }
    const e = byQuestion[m.questionId];
    e.occurrences += 1;
    e.applicants.add(m.applicantId);
    e.modes.add(m.mode);
  }
  const questionSummary = Object.values(byQuestion)
    .map((e) => ({
      questionId: e.questionId,
      category: e.category,
      occurrences: e.occurrences,
      affectedApplicants: e.applicants.size,
      modes: [...e.modes],
      sampleFeScore: e.sampleFe,
      sampleBeScore: e.sampleBe,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  // Documents mil sakte hain par sabme `answers` khali ho (ya --question filter
  // se koi question match na kare) — tab bhi script "0 mismatches ✅" print kar
  // deti hai. Ye wahi failure mode hai, isliye yahan bhi rukna zaroori hai.
  if (questionsCompared === 0) {
    abortEmptyDataset({
      db,
      url,
      filter,
      reason:
        `${docs.length} document mile, lekin ek bhi question compare nahi hua — ` +
        'kisi doc me answers nahi the (ya --question/--mode filter ne sab hata diya).',
    });
  }

  const capturedAt = new Date().toISOString();
  const outPath = path.resolve(
    opts.out || path.join(__dirname, '..', '..', 'fixtures', `fe-be-comparison-${capturedAt.slice(0, 10)}.json`)
  );

  const payload = {
    meta: {
      script: 'compare-fe-be-scoring',
      version: 1,
      capturedAt,
      database: db.databaseName,
      modes,
      tolerance: opts.tolerance,
      scope: {
        applicant: opts.applicant || null,
        financialYear: opts.fy || null,
        question: opts.question || null,
      },
      applicantsChecked: docs.length,
      comparisons,
      questionsCompared,
      feSource: fe._meta.source,
    },
    summary: {
      questionMismatchCount: questionMismatches.length,
      distinctQuestionsAffected: questionSummary.length,
      totalMismatchCount: totalMismatches.length,
      crashCount: crashes.length,
    },
    questionSummary,
    totalMismatches,
    crashes,
    questionMismatches,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');

  // ---- report ----
  const line = (k, v) => console.log(`  ${String(k).padEnd(36)} ${v}`);
  console.log('');
  console.log('FE vs BE scoring comparison');
  console.log('');
  line('Applicants checked', docs.length);
  line('Comparisons (applicant × mode)', comparisons);
  line('Questions compared', questionsCompared);
  console.log('');
  line('Per-question mismatches', questionMismatches.length);
  line('Distinct questions affected', questionSummary.length);
  line('Applicant-total mismatches', totalMismatches.length);
  line('Crashes (ek engine chala, doosra nahi)', crashes.length);

  if (questionSummary.length) {
    console.log('');
    console.log('  Sabse zyada mismatch wale questions:');
    console.log('');
    console.log('    questionId                 category            times  applicants  FE      BE');
    console.log('    ' + '-'.repeat(80));
    questionSummary.slice(0, opts.verbose ? 200 : 25).forEach((q) => {
      console.log(
        `    ${q.questionId.padEnd(26)} ${String(q.category).slice(0, 18).padEnd(19)} ` +
        `${String(q.occurrences).padStart(5)}  ${String(q.affectedApplicants).padStart(10)}  ` +
        `${String(q.sampleFeScore).padStart(6)}  ${String(q.sampleBeScore).padStart(6)}`
      );
    });
  }

  if (totalMismatches.length) {
    console.log('');
    console.log('  Applicant totals jahan FE aur BE alag hain:');
    totalMismatches.slice(0, opts.verbose ? 200 : 15).forEach((t) =>
      console.log(
        `    ${t.applicantId}  FY${t.financialYear || '?'}  [${t.mode}]  ` +
        `FE=${t.feTotal}  BE=${t.beTotal}  diff=${t.difference}`
      )
    );
  }

  if (crashes.length) {
    console.log('');
    console.log('  Crashes:');
    crashes.slice(0, opts.verbose ? 200 : 15).forEach((c) =>
      console.log(`    ${c.applicantId} [${c.mode}]  BE: ${c.be}  |  FE: ${c.fe}`)
    );
  }

  console.log('');
  if (questionMismatches.length === 0 && totalMismatches.length === 0 && crashes.length === 0) {
    console.log('  ✅ Is data pe FE aur BE bilkul same jawab dete hain.');
    console.log('     Matlab client ki complaint ka kaaran drift NAHI hai —');
    console.log('     ab known bugs (STAGE-2 ka INPUT 3) aur data issues dekho.');
  } else {
    console.log('  ⚠ FE aur BE alag jawab dete hain. Upar wali list STAGE-2 me paste karo.');
  }
  console.log('');
  line('Output', outPath);
  console.log('');

  await mongoose.disconnect();

  // ---- regression gate ----
  // 2026-08-08 ko FE aur BE ko poori tarah match kara diya gaya tha (833 -> 0).
  // Us jeet ko bachaye rakhne ke liye ye flag hai: scoring ke abhi bhi 8 alag
  // implementations hain, to koi bhi ek-tarfa edit drift wapas le aayega. Ye
  // check `npm run test:scoring` se chalta hai aur drift lautne par FAIL karta hai.
  if (opts.assertNoDrift) {
    const drift = questionMismatches.length + totalMismatches.length + crashes.length;
    if (drift > 0) {
      console.error('  ✖ REGRESSION — FE aur BE dobara alag jawab de rahe hain.');
      console.error('');
      console.error(`    per-question mismatches : ${questionMismatches.length}`);
      console.error(`    applicant-total         : ${totalMismatches.length}`);
      console.error(`    crashes                 : ${crashes.length}`);
      console.error('');
      console.error('    Aksar wajah: scoring sirf ek jagah badla gaya. Dono jagah badlo —');
      console.error('      src/app/services/utility/utility.service.ts');
      console.error('      Backend/controllers/MarkService.js');
      console.error(`    Poora detail: ${outPath}`);
      console.error('');
      process.exit(1);
    }
    console.log('  ✅ Drift gate pass — FE aur BE bilkul same hain.');
    console.log('');
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
