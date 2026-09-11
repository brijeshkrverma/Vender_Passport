/**
 * Bring the database's indexes in line with the schemas.
 *
 * WHY THIS EXISTS
 *   Mongoose creates indexes a schema declares, but it never drops ones it no
 *   longer declares. So changing a compound index leaves the old one in place
 *   and still enforcing itself — which is not a subtle failure when the index
 *   is unique.
 *
 *   Adding `auditId` to the submissions key is exactly that case: the new index
 *   was created, the old `{orgId, applicantId, financialYear}` stayed, and it
 *   went on rejecting the second submission for an applicant in a year. The
 *   error surfaced as a duplicate key on a write that the schema plainly allows.
 *
 * WHY IT IS NOT RUN AT BOOT
 *   `syncIndexes()` drops and builds. On a large collection a build blocks
 *   writes, and doing that automatically on every restart — including a restart
 *   under load — is worse than the drift it fixes. The server only *detects*
 *   drift and warns; correcting it is a deliberate act.
 *
 *   Run:  node scripts/sync-indexes.js
 *         node scripts/sync-indexes.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../backend/config/env');

// Every model whose indexes this manages. A model missing here simply is not
// synced — it is not silently assumed to be correct.
const MODELS = [
  '../backend/modules/questionnaires/questionnaire.model',
  '../backend/modules/questionnaires/response.model',
  '../backend/modules/questionnaires/submission.model',
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  await mongoose.connect(env.MONGO_URI);
  console.log(`Connected${dryRun ? ' (dry run — nothing will change)' : ''}\n`);

  let changed = 0;

  for (const path of MODELS) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const Model = require(path);
    const name = Model.collection.collectionName;

    const declared = new Set(Model.schema.indexes().map(([key]) => Object.keys(key).join('_')));
    const live = await Model.collection.indexes();

    const stale = live.filter((i) => i.name !== '_id_'
      && !declared.has(Object.keys(i.key).join('_')));

    console.log(`${name}`);
    console.log(`  declared: ${declared.size}   live: ${live.length}   stale: ${stale.length}`);

    stale.forEach((i) => {
      console.log(`  ${dryRun ? 'would drop' : 'dropping  '} ${i.name} ${JSON.stringify(i.key)}${i.unique ? ' UNIQUE' : ''}`);
    });

    if (!dryRun && stale.length) {
      // `syncIndexes` drops what the schema no longer declares and builds what
      // it does — one call rather than a hand-written list that goes stale too.
      await Model.syncIndexes();
      changed += stale.length;
    } else if (!dryRun) {
      await Model.createIndexes();
    }
    console.log('');
  }

  console.log(dryRun
    ? 'Dry run complete.'
    : `Done. ${changed} stale index${changed === 1 ? '' : 'es'} removed.`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
