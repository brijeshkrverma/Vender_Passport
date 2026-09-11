// Step 1 migration — rootQuestionId (stable question identity)
//
// For every existing question, rootQuestionId = _id. This makes the new field
// behaviour-preserving: scoring/validation that reads rootQuestionId behaves
// exactly as the old code that read _id.
//
// Usage (from Backend/): node scripts/migrate-root-question-id.js
// Run on a restored backup FIRST, then on production.

const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

async function run() {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;
  const questionnaires = db.collection('questionnaires');

  const missing = await questionnaires.countDocuments({ rootQuestionId: { $exists: false } });
  console.log(`Documents without rootQuestionId: ${missing}`);

  const result = await questionnaires.updateMany(
    { rootQuestionId: { $exists: false } },
    [{ $set: { rootQuestionId: '$_id' } }]
  );
  console.log(`Backfilled rootQuestionId on ${result.modifiedCount} document(s).`);

  const stillMissing = await questionnaires.countDocuments({ rootQuestionId: { $exists: false } });
  const mismatched = await questionnaires.countDocuments({ $expr: { $ne: ['$rootQuestionId', '$_id'] } });
  console.log(`After migration — missing: ${stillMissing} (must be 0), mismatched (root != _id): ${mismatched} (must be 0)`);

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
