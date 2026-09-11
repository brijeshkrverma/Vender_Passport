/**
 * STEP A1 — applicant copies ka `maxMark` master questionnaire se sync karna.
 *
 * PROBLEM
 *   Har applicant ke `applicantquestionnaires.answers[]` me question ka ek snapshot
 *   hota hai, jisme `maxMark` bhi copy hota hai. Kuch answers me wo copy master se
 *   alag ho gaya hai — khaas kar `null` ya `0`, jabki master me 100 hai.
 *
 *   `maxMark` scoring ka DENOMINATOR hai ("out of kitne"). Uska 0/null hona do
 *   cheezein todta hai:
 *     1. Scorecard pe question "0 out of 0" dikhta hai — jaise wo counta hi na ho
 *     2. utility.service.ts:363 ka clamp `obtendMark > maxMark` par score ko
 *        maxMark tak gira deta hai. maxMark null ho to score bhi null (=0) ho jaata hai
 *
 * KYA KARTA HAI
 *   Sirf wahan sudhaar karta hai jahan copy master se KAM hai (null ya 0), yaani
 *   jahan denominator galti se gir gaya hai. Copy ko master ki value pe le aata hai.
 *
 * KYA JAAN-BOOJHKAR NAHI KARTA  ← zaroori
 *   - Jahan MASTER khud null hai (copy me 100 hai): master ka sahi maxMark kya ho,
 *     ye product decision hai. Yahan copy master se ZYADA hai, kam nahi.
 *   - Jahan copy master se ZYADA hai (jaise 101 vs 100): score ghatane wala change
 *     hai, alag decision chahiye.
 *   Dono cases report me "SKIPPED" ke neeche aate hain — chhupaye nahi jaate.
 *
 * SAFE HAI
 *   --dry-run (default) kuch nahi likhta.
 *   --execute likhne se PEHLE har badalne wale answer ka pre-image ek JSON file me
 *   likhta hai, taaki --rollback=<file> se bilkul waisa hi wapas laya ja sake.
 *
 * ISTEMAAL (Backend/ se)
 *   node scripts/migrate-answer-maxmark-sync.js                    # dry-run
 *   node scripts/migrate-answer-maxmark-sync.js --execute
 *   node scripts/migrate-answer-maxmark-sync.js --rollback=fixtures/maxmark-preimage-<date>.json
 *   MONGO_URL="mongodb://host:27017/db" node scripts/migrate-answer-maxmark-sync.js
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DEFAULT_MONGO_URL =
  process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

function parseArgs(argv) {
  const o = { mode: 'dry-run' };
  for (const a of argv) {
    if (a === '--execute') o.mode = 'execute';
    else if (a.startsWith('--rollback=')) { o.mode = 'rollback'; o.rollbackFile = a.split('=')[1]; }
    else if (a.startsWith('--out=')) o.out = a.split('=')[1];
    else if (a.startsWith('--mongo-url=')) o.mongoUrl = a.split('=')[1];
  }
  return o;
}

/** null/undefined/'' ko null maano, warna Number. */
function norm(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function rollback(db, file) {
  const payload = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!Array.isArray(payload.changes) || !payload.changes.length) {
    console.error('Rollback file me koi change nahi hai.');
    process.exit(1);
  }
  const AQ = db.collection('applicantquestionnaires');
  let n = 0;
  for (const c of payload.changes) {
    const r = await AQ.updateOne(
      { _id: new mongoose.Types.ObjectId(c.docId) },
      { $set: { [`answers.${c.answerIndex}.maxMark`]: c.before } }
    );
    n += r.modifiedCount;
  }
  console.log(`\n  Rollback poora — ${n} answers wapas purani value pe.\n`);
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  const url = opts.mongoUrl || DEFAULT_MONGO_URL;

  await mongoose.connect(url);
  const db = mongoose.connection.db;
  console.log(`Connected to ${db.databaseName}  |  mode: ${opts.mode}`);

  if (opts.mode === 'rollback') {
    await rollback(db, opts.rollbackFile);
    await mongoose.disconnect();
    return;
  }

  const masters = new Map(
    (await db.collection('questionnaires').find({}, { projection: { maxMark: 1 } }).toArray())
      .map((q) => [String(q._id), norm(q.maxMark)])
  );

  const docs = await db.collection('applicantquestionnaires').find({}).toArray();
  if (docs.length === 0) {
    console.error('\n  ✖ RUKO — ek bhi applicantquestionnaire document nahi mila.');
    console.error(`    Database: ${db.databaseName} | URL: ${url}`);
    console.error('    MONGO_URL galat DB pe point kar raha ho sakta hai.\n');
    process.exit(1);
  }

  const changes = [];
  const skipped = [];

  for (const d of docs) {
    if (!Array.isArray(d.answers)) continue;
    d.answers.forEach((a, i) => {
      const qid = String(a.questionId);
      if (!masters.has(qid)) return;
      const master = masters.get(qid);
      const copy = norm(a.maxMark);
      if (master === copy) return;

      const row = {
        docId: String(d._id),
        applicantId: String(d.applicant_id),
        financialYear: d.financialYear || '',
        questionId: qid,
        answerIndex: i,
        before: a.maxMark,
        after: master,
      };

      if (master === null) { skipped.push({ ...row, why: 'master khud null hai — product decision chahiye' }); return; }
      if (copy !== null && copy > master) { skipped.push({ ...row, why: 'copy master se ZYADA hai — score girega, alag decision chahiye' }); return; }
      changes.push(row);
    });
  }

  // ---- report ----
  const byQ = {};
  changes.forEach((c) => {
    byQ[c.questionId] = byQ[c.questionId] || { n: 0, before: new Set(), after: c.after, apps: new Set() };
    byQ[c.questionId].n += 1;
    byQ[c.questionId].before.add(JSON.stringify(c.before));
    byQ[c.questionId].apps.add(c.applicantId);
  });

  console.log('');
  console.log(`  Badlenge : ${changes.length} answers, ${Object.keys(byQ).length} questions, ${new Set(changes.map((c) => c.applicantId)).size} applicants`);
  console.log(`  Skipped  : ${skipped.length}`);
  console.log('');
  Object.entries(byQ)
    .sort((a, b) => b[1].n - a[1].n)
    .forEach(([q, v]) =>
      console.log(`    ${q}  maxMark ${[...v.before].join('/')} -> ${v.after}   x${v.n} answers (${v.apps.size} applicants)`)
    );

  if (skipped.length) {
    console.log('');
    console.log('  SKIPPED (jaan-boojhkar chhoda gaya):');
    skipped.forEach((s) =>
      console.log(`    ${s.questionId}  ${JSON.stringify(s.before)} -> ${JSON.stringify(s.after)}  — ${s.why}`)
    );
  }

  if (opts.mode === 'dry-run') {
    console.log('');
    console.log('  DRY RUN — kuch nahi likha gaya. Apply karne ke liye --execute lagao.');
    console.log('');
    await mongoose.disconnect();
    return;
  }

  if (!changes.length) {
    console.log('\n  Kuch badalne ko nahi hai.\n');
    await mongoose.disconnect();
    return;
  }

  // ---- pre-image, phir write ----
  const stamp = new Date().toISOString();
  const outPath = path.resolve(
    opts.out || path.join(__dirname, '..', '..', 'fixtures', `maxmark-preimage-${stamp.slice(0, 10)}.json`)
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ meta: { script: 'migrate-answer-maxmark-sync', capturedAt: stamp, database: db.databaseName }, changes, skipped }, null, 2) + '\n');
  console.log(`\n  Pre-image likha gaya: ${outPath}`);

  const AQ = db.collection('applicantquestionnaires');
  let modified = 0;
  for (const c of changes) {
    const r = await AQ.updateOne(
      { _id: new mongoose.Types.ObjectId(c.docId) },
      { $set: { [`answers.${c.answerIndex}.maxMark`]: c.after } }
    );
    modified += r.modifiedCount;
  }

  console.log(`  Applied — ${modified} answers update hue.`);
  console.log(`  Rollback: node scripts/migrate-answer-maxmark-sync.js --rollback=${path.relative(path.join(__dirname, '..'), outPath).replace(/\\/g, '/')}`);
  console.log('');
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
