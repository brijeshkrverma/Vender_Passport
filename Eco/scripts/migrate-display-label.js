// Step 2 migration — displayLabel (separate option text from option identity)
//
// Freezes answerLabel / subAnswerLabel as opaque identity keys and adds
// displayLabel / subDisplayLabel holding the same text. Behaviour-preserving
// because the two fields start out identical.
//
// Backfills:
//   1. questionnaires -> answer[].displayLabel, answer[].subanswar[].subDisplayLabel
//   2. applicantquestionnaires -> answers[].answer[], answers[].assessorResp[],
//      answers[].adminResp[] and their subanswar (embedded copies of the options)
//
// Usage (from Backend/): node scripts/migrate-display-label.js
// Run on a restored backup FIRST, then on production.

const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

function backfillOption(opt) {
  if (!opt || typeof opt !== 'object') return false;
  let touched = false;
  if (opt.displayLabel === undefined && opt.answerLabel !== undefined) {
    opt.displayLabel = opt.answerLabel;
    touched = true;
  }
  if (Array.isArray(opt.subanswar)) {
    opt.subanswar.forEach((sub) => {
      if (sub && typeof sub === 'object' && sub.subDisplayLabel === undefined && sub.subAnswerLabel !== undefined) {
        sub.subDisplayLabel = sub.subAnswerLabel;
        touched = true;
      }
    });
  }
  return touched;
}

async function backfillCollection(db, name, paths) {
  const col = db.collection(name);
  const cursor = col.find({});
  const ops = [];
  let touchedDocs = 0;

  for await (const doc of cursor) {
    let touched = false;
    for (const p of paths) {
      const bucket = doc[p];
      if (!Array.isArray(bucket)) continue;
      for (const ans of bucket) {
        if (!ans || typeof ans !== 'object') continue;
        if (Array.isArray(ans.answer)) {
          ans.answer.forEach((o) => { if (backfillOption(o)) touched = true; });
        }
        if (Array.isArray(ans.assessorResp)) {
          ans.assessorResp.forEach((o) => { if (backfillOption(o)) touched = true; });
        }
        if (Array.isArray(ans.adminResp)) {
          ans.adminResp.forEach((o) => { if (backfillOption(o)) touched = true; });
        }
        // top-level arrays used by some legacy docs
        if (Array.isArray(ans) === false && backfillOption(ans)) touched = true;
      }
    }
    if (touched) {
      touchedDocs++;
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { answers: doc.answers, assessorResp: doc.assessorResp, adminResp: doc.adminResp } } } });
      if (ops.length >= 500) {
        await col.bulkWrite(ops);
        ops.length = 0;
      }
    }
  }
  if (ops.length) await col.bulkWrite(ops);
  console.log(`${name}: backfilled ${touchedDocs} document(s).`);
}

async function run() {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;

  // 1) Question master
  const qCursor = db.collection('questionnaires').find({});
  const qOps = [];
  let qTouched = 0;
  for await (const q of qCursor) {
    let touched = false;
    (q.answer || []).forEach((a) => { if (backfillOption(a)) touched = true; });
    if (touched) {
      qTouched++;
      qOps.push({ updateOne: { filter: { _id: q._id }, update: { $set: { answer: q.answer } } } });
      if (qOps.length >= 500) { await db.collection('questionnaires').bulkWrite(qOps); qOps.length = 0; }
    }
  }
  if (qOps.length) await db.collection('questionnaires').bulkWrite(qOps);
  console.log(`questionnaires: backfilled ${qTouched} document(s).`);

  // 2) Applicant responses (embedded option copies)
  await backfillCollection(db, 'applicantquestionnaires', ['answers']);

  const qMissing = await db.collection('questionnaires').countDocuments({ answer: { $elemMatch: { displayLabel: { $exists: false } } } });
  console.log(`Verification — questionnaires with answer.displayLabel missing: ${qMissing} (must be 0)`);

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
