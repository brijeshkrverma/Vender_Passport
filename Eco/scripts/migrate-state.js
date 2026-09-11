// Step 3 migration — state field (DRAFT / LOCKED / SUPERSEDED)
//
// Existing FY 2024 and FY 2025 questions are locked (a certification may have
// been issued against them). Everything else is DRAFT.
//
// Usage (from Backend/): node scripts/migrate-state.js
// Run on a restored backup FIRST, then on production.

const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

async function run() {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;
  const questionnaires = db.collection('questionnaires');

  const lock2024 = await questionnaires.updateMany(
    { assignmentYear: { $regex: '^2024' }, state: { $in: [null, undefined, 'DRAFT'] } },
    { $set: { state: 'LOCKED' } }
  );
  const lock2025 = await questionnaires.updateMany(
    { assignmentYear: { $regex: '^2025' }, state: { $in: [null, undefined, 'DRAFT'] } },
    { $set: { state: 'LOCKED' } }
  );
  const draftRest = await questionnaires.updateMany(
    { state: { $exists: false } },
    { $set: { state: 'DRAFT' } }
  );

  console.log(`Locked FY2024 docs: ${lock2024.modifiedCount}`);
  console.log(`Locked FY2025 docs: ${lock2025.modifiedCount}`);
  console.log(`Defaulted remaining docs to DRAFT: ${draftRest.modifiedCount}`);

  const breakdown = await questionnaires.aggregate([
    { $group: { _id: '$state', count: { $sum: 1 } } },
  ]).toArray();
  console.log('State breakdown:', JSON.stringify(breakdown));

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
