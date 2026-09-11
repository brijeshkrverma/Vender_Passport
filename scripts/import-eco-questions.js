/**
 * IMPORT QUESTIONS FROM AN ECO_EDGE DUMP.
 *
 * ── IT GOES THROUGH THE SERIALIZER, NOT AROUND IT ─────────────────────────
 *
 * Every document is mapped with `toForm` and then `toPayload` — the same pair
 * the authoring screen uses. That is the point: those functions already know
 * the legacy shape (`subanswar`, `answer` rather than `answers`,
 * `assignmentYear`, a bare-string `type`, grids hanging off a numeric key), and
 * `tests/unit/questionnaire-authoring.test.js` pins that knowledge.
 *
 * A bespoke mapper here would be a second, untested description of the same
 * shape — and the first thing it would get wrong is the part nobody thought to
 * check.
 *
 * ── RE-RUNNING IS SAFE, AND HAS TO BE ─────────────────────────────────────
 *
 * Documents are keyed on the source `_id`, so a second run updates rather than
 * duplicates. More importantly it *preserves the keys* already minted for
 * answers and sub-answers: every value reference in a formula, mark rule or
 * trend rule addresses those keys, so re-importing with fresh ones would
 * silently re-point every rule that had been authored on top of the imported
 * questions.
 *
 *   node scripts/import-eco-questions.js <file.json> --org ORG-101
 *   node scripts/import-eco-questions.js <file.json> --org ORG-101 --dry-run
 *   node scripts/import-eco-questions.js <file.json> --org ORG-101 --limit 20
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const mongoose = require('mongoose');
const env = require('../backend/config/env');
const Question = require('../backend/modules/questionnaires/questionnaire.model');

const FEATURE = path.join(__dirname, '..', 'frontend-react', 'src', 'features', 'questionnaire');

/** CommonJS cannot `require()` an ES module, but it can `await import()` one. */
async function loadSerializer() {
  const url = pathToFileURL(path.join(FEATURE, 'services', 'questionnaireSerializer.js')).href;
  const mod = await import(url);
  return { toForm: mod.toForm, toPayload: mod.toPayload };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

/** Mongo extended JSON wraps ids and longs; unwrap so plain reads work. */
function plainJson(value) {
  if (Array.isArray(value)) return value.map(plainJson);
  if (value && typeof value === 'object') {
    if (value.$oid) return String(value.$oid);
    if (value.$numberLong) return Number(value.$numberLong);
    if (value.$date) return value.$date;
    const out = {};
    Object.entries(value).forEach(([k, v]) => { out[k] = plainJson(v); });
    return out;
  }
  return value;
}

/**
 * The financial year a legacy question belongs to.
 *
 * The dumps carry both `financialYear` and `assignmentYear`, and only the
 * second is reliably populated. Defaulting to "now" would scatter the import
 * across whatever year it happened to be run in, so a question with neither is
 * reported and skipped instead.
 */
function financialYearOf(doc) {
  if (doc.financialYear) return String(doc.financialYear).slice(0, 4);
  if (doc.assignmentYear) return String(doc.assignmentYear).slice(0, 4);
  return null;
}

async function main() {
  const file = process.argv[2];
  const orgId = arg('org');
  const dryRun = process.argv.includes('--dry-run');
  const limit = Number(arg('limit', 0)) || 0;

  if (!file || !orgId) {
    console.error('Usage: node scripts/import-eco-questions.js <file.json> --org <ORG-ID> [--dry-run] [--limit N]');
    process.exit(1);
  }

  const { toForm, toPayload } = await loadSerializer();

  const raw = plainJson(JSON.parse(fs.readFileSync(file, 'utf8')));
  const docs = (Array.isArray(raw) ? raw : [raw]).slice(0, limit || undefined);
  console.log(`Read ${docs.length} question(s) from ${path.basename(file)}\n`);

  await mongoose.connect(env.MONGO_URI);

  const stats = { created: 0, updated: 0, skipped: 0 };
  const problems = [];
  const seenTypes = new Set();
  let gridCount = 0;
  let assessorCount = 0;

  for (const doc of docs) {
    const sourceId = doc._id ? String(doc._id) : null;
    const fy = financialYearOf(doc);

    if (!fy) {
      stats.skipped += 1;
      problems.push(`${sourceId || '(no id)'}: no financialYear or assignmentYear`);
      continue;
    }

    let payload;
    try {
      payload = toPayload(toForm(doc));
    } catch (e) {
      stats.skipped += 1;
      problems.push(`${sourceId}: ${e.message}`);
      continue;
    }

    payload.financialYear = fy;
    if (doc.answerType) seenTypes.add(doc.answerType);
    payload.answers.forEach((a) => {
      if ((a.assessorOption || []).length) assessorCount += 1;
      a.subAnswers.forEach((s) => { if (s.subAnswerTypes === 'Grid') gridCount += 1; });
    });

    if (dryRun) { stats.created += 1; continue; }

    // eslint-disable-next-line no-await-in-loop
    const existing = sourceId
      ? await Question.findOne({ orgId, sourceQuestionId: sourceId })
      : null;

    if (existing) {
      /*
       * Keep the keys already on the stored document. Value references address
       * answers and sub-answers by key, so replacing them on re-import would
       * re-point every rule authored on top of this question — silently, and
       * only visible as a wrong score.
       */
      payload.answers.forEach((a, i) => {
        const old = existing.answers[i];
        if (!old) return;
        a.key = old.key;
        a.subAnswers.forEach((s, j) => { if (old.subAnswers?.[j]) s.key = old.subAnswers[j].key; });
      });

      Object.assign(existing, payload);
      // eslint-disable-next-line no-await-in-loop
      await existing.save();
      stats.updated += 1;
    } else {
      // eslint-disable-next-line no-await-in-loop
      await Question.create({
        ...payload,
        orgId,
        sourceQuestionId: sourceId,
        status: 'Draft',
        version: 1,
        createdBy: 'eco-import',
      });
      stats.created += 1;
    }
  }

  console.log(`${dryRun ? 'Would import' : 'Imported'}: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);
  console.log(`Answer types seen : ${[...seenTypes].join(', ') || '(none)'}`);
  console.log(`Grid sub-answers  : ${gridCount}`);
  console.log(`Options with assessor marking: ${assessorCount}`);

  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    problems.slice(0, 15).forEach((p) => console.log(`  ${p}`));
    if (problems.length > 15) console.log(`  … and ${problems.length - 15} more`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
