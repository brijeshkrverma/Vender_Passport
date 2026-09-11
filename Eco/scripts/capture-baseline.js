// Step 0 — fixture baseline (score snapshot for regression).
//
// Dumps, for a sample of applicants, the stored per-question marks and category
// totals. After every score-neutral step (1–5) re-run and diff against
// fixtures/baseline-<date>.json — the diff must be empty.
//
// Usage (from Backend/): node scripts/capture-baseline.js [output.json]
//   default output: ../fixtures/baseline-<today>.json
//
// The baseline intentionally captures only the fields that must NOT change
// across Steps 1–5 (question identity, stored marks, selection value). Fields
// added by migrations (rootQuestionId, displayLabel, state) are not included,
// so the diff stays empty as long as no score/answer changes.

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

const toDate = new Date().toISOString().slice(0, 10);
const OUT = process.argv[2] || path.join(__dirname, '..', '..', 'fixtures', `baseline-${toDate}.json`);

function extractAnswers(answers) {
  const perQuestion = [];
  const perCategoryMap = {};
  let total = 0;

  (answers || []).forEach((ans) => {
    if (!ans || typeof ans !== 'object') return;
    const category = ans.category || 'UNKNOWN';
    const obtend = Number(ans.obtendMark) || 0;
    const max = Number(ans.maxMark) || 0;

    const selectedOptionCount = (ans.answer || []).filter((o) => o && o.ansValue != null).length;

    perQuestion.push({
      questionId: String(ans.questionId || ''),
      obtainedMark: obtend,
      maxMark: max,
      selectedOptions: selectedOptionCount,
    });

    const cat = perCategoryMap[category] || { category, obtained: 0, max: 0 };
    cat.obtained += obtend;
    cat.max += max;
    perCategoryMap[category] = cat;
    total += obtend;
  });

  return {
    perQuestion: perQuestion.sort((a, b) => String(a.questionId).localeCompare(String(b.questionId))),
    perCategory: Object.values(perCategoryMap).sort((a, b) => a.category.localeCompare(b.category)),
    total,
  };
}

async function run() {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;

  const docs = await db
    .collection('applicantquestionnaires')
    .find({})
    .sort({ financialYear: 1, applicant_id: 1 })
    .toArray();

  const baseline = docs.map((d) => ({
    applicant_id: String(d.applicant_id),
    financialYear: d.financialYear || '',
    appli_submmited_status: d.appli_submmited_status || '',
    admin_approval: d.admin_approval || '',
    isPublishedScoreCard: d.isPublishedScoreCard || false,
    ...extractAnswers(d.answers),
  }));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`Captured baseline for ${docs.length} applicant(s) -> ${OUT}`);
  console.log(`Total marks across sample: ${baseline.reduce((s, b) => s + b.total, 0)}`);

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
