// Seeds a small, self-contained test set into the LOCAL dev database so the
// FY-rollover Steps 1-5 can be verified (migrations, lock guard, swap scope).
// Usage (from Backend/): node scripts/seed-fy-test-data.js
// WARNING: only run against an empty/local dev DB — it does not clear anything.
const mongoose = require('mongoose');
const Questionnaire = require('../models/Questionnaire');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

const mk = (over) => {
  const q = new Questionnaire({
    type: ['OEM'],
    category: 'General',
    question: `<p>Q ${over.question}</p>`,
    description: `desc ${over.question}`,
    isMarks: true,
    maxMark: 100,
    position: over.position,
    assignmentYear: over.assignmentYear,
    answer: [
      { answerLabel: `optA-${over.question}`, sortOrder: 1, score: 100 },
      { answerLabel: `optB-${over.question}`, sortOrder: 2, score: 0 },
    ],
    ...over,
  });
  q.rootQuestionId = q._id;
  return q;
};

async function run() {
  await mongoose.connect(MONGO_URL);
  await Questionnaire.deleteMany({ testSeed: true });
  const docs = [
    // FY 2024 (locked by migration)
    mk({ question: '2024-A', assignmentYear: '2024-04-01', position: 0, testSeed: true }),
    mk({ question: '2024-B', assignmentYear: '2024-04-01', position: 1, testSeed: true }),
    // FY 2025 (locked by migration)
    mk({ question: '2025-A', assignmentYear: '2025-04-01', position: 0, testSeed: true }),
    mk({ question: '2025-B', assignmentYear: '2025-04-01', position: 1, testSeed: true }),
    // FY 2026 (stays DRAFT)
    mk({ question: '2026-A', assignmentYear: '2026-04-01', position: 0, testSeed: true }),
    mk({ question: '2026-B', assignmentYear: '2026-04-01', position: 1, testSeed: true }),
  ];
  const saved = await Questionnaire.insertMany(docs);
  console.log(`Seeded ${saved.length} questions.`);
  saved.forEach((s) => console.log(`  ${s.assignmentYear}  ${s.question}  _id=${s._id}  root=${s.rootQuestionId}  state=${s.state}`));
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
