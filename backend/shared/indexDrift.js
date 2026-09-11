/**
 * Which live indexes no longer match a schema.
 *
 * Mongoose creates the indexes a schema declares and never drops the ones it
 * stops declaring. A changed compound index therefore leaves its predecessor in
 * place, still enforcing itself — and when that predecessor is unique, the
 * symptom is a duplicate-key error on a write the current schema plainly
 * allows.
 *
 * Read-only on purpose. Dropping and rebuilding blocks writes on a large
 * collection, so the server reports drift and `scripts/sync-indexes.js`
 * corrects it as a deliberate act.
 */

const MODELS = [
  '../modules/questionnaires/questionnaire.model',
  '../modules/questionnaires/response.model',
  '../modules/questionnaires/submission.model',
];

/** @returns {Promise<Array<{collection, name, key, unique}>>} */
async function checkIndexDrift() {
  const drift = [];

  for (const path of MODELS) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const Model = require(path);

    // Compare on the key shape rather than the generated name: the name encodes
    // direction too, so an index rebuilt with the same fields would look new.
    const declared = new Set(Model.schema.indexes().map(([key]) => Object.keys(key).join('_')));

    // eslint-disable-next-line no-await-in-loop
    const live = await Model.collection.indexes();

    live.forEach((i) => {
      if (i.name === '_id_') return;
      if (declared.has(Object.keys(i.key).join('_'))) return;
      drift.push({
        collection: Model.collection.collectionName,
        name: i.name,
        key: i.key,
        unique: !!i.unique,
      });
    });
  }

  return drift;
}

module.exports = { checkIndexDrift, MODELS };
