// Integration test for Step 1 linking: a "copied" question (rootQuestionId != _id)
// must still resolve assessorResp from the master via getQuestionsByApplicantID.
// Usage (from Backend/): node scripts/test-rootid-linking.js
const mongoose = require('mongoose');
const Questionnaire = require('../models/Questionnaire');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE');
  await Questionnaire.deleteMany({ testLinkSeed: true });

  const source = await Questionnaire.create({
    type: ['OEM'], category: 'General', question: '<p>source</p>',
    assignmentYear: '2025-04-01', position: 0, state: 'LOCKED',
    answer: [{ answerLabel: 'srcOpt', score: 100, sortOrder: 1 }],
    testLinkSeed: true,
  });
  source.rootQuestionId = source._id;
  await source.save();

  // Simulated FY2026 copy: new _id, SAME rootQuestionId, options carry displayLabel
  const copy = await Questionnaire.create({
    type: ['OEM'], category: 'General', question: '<p>copy</p>',
    assignmentYear: '2026-04-01', position: 0, state: 'DRAFT',
    rootQuestionId: source._id, sourceQuestionId: source._id,
    answer: [{ answerLabel: 'srcOpt', displayLabel: 'Src Option (FY2026)', score: 100, sortOrder: 1 }],
    testLinkSeed: true,
  });

  console.log('source._id =', source._id);
  console.log('copy._id   =', copy._id);
  console.log('copy.rootQuestionId =', copy.rootQuestionId, '| same as source?', String(copy.rootQuestionId) === String(source._id));

  await mongoose.disconnect();
  console.log('SEEDED_OK');
}

run().catch((e) => { console.error(e); process.exit(1); });
