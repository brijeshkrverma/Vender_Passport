/**
 * Migration — split multi-type questionnaire documents into one document per applicant type.
 *
 *   { type: ["OEM", "Upstream"] }  ->  { type: ["OEM"] } + { type: ["Upstream"] }
 *
 * Follows the same pattern as the existing FY-rollover migrations in this folder
 * (scripts/migrate-root-question-id.js, scripts/migrate-state.js).
 *
 * ---------------------------------------------------------------------------
 * REFERENCE INTEGRITY — read this before running
 * ---------------------------------------------------------------------------
 * applicantquestionnaires.answers[].questionId stores a questionnaires._id.
 * ApiController resolves it with:
 *
 *     Questionnaire.findOne({ $or: [{ rootQuestionId: qid }, { _id: qid }] })
 *
 * so every split child carries rootQuestionId = (original.rootQuestionId || original._id).
 * That keeps every saved applicant answer resolvable even after the original
 * document is removed. Originals that have no rootQuestionId yet are backfilled
 * first (identical to scripts/migrate-root-question-id.js, which is behaviour
 * preserving because it sets rootQuestionId = _id).
 *
 * ---------------------------------------------------------------------------
 * STRATEGIES
 * ---------------------------------------------------------------------------
 *   replace    (default) every type gets a brand new _id, original is deleted
 *              after all children are written and verified.
 *   keep-first the original document is updated in place to type:[firstType]
 *              (its _id survives), remaining types get new documents. Safest
 *              option for reference integrity — nothing is ever deleted.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 * ---------------------------------------------------------------------------
 *   node scripts/split-questionnaire-by-type.js --dry-run
 *   node scripts/split-questionnaire-by-type.js --execute
 *   node scripts/split-questionnaire-by-type.js --execute --strategy=keep-first
 *   node scripts/split-questionnaire-by-type.js --execute --assignmentYear=2025
 *   node scripts/split-questionnaire-by-type.js --rollback=logs/migrations/<file>.json
 *
 * Options:
 *   --dry-run                 analyse only, write nothing (default when no mode given)
 *   --execute                 perform the migration
 *   --rollback=<journal>      undo a previous --execute using its journal file
 *   --strategy=replace|keep-first
 *   --mongo-url=<url>         defaults to MONGO_URL env or the app.js connection string
 *   --assignmentYear=<val>    scope by assignmentYear prefix (e.g. 2025)
 *   --financialYear=<val>     scope by financialYear field
 *   --category=<val>          scope by category
 *   --limit=<n>               process at most n source documents
 *   --batch-size=<n>          documents per batch (default 50)
 *   --no-provenance           do not write sourceQuestionId on children
 *   --json                    print the machine-readable report instead of the text one
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { BSON, ObjectId } = require('mongodb');

const DEFAULT_MONGO_URL =
  process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

const COLLECTION = 'questionnaires';
const JOURNAL_DIR = path.join(__dirname, '..', 'logs', 'migrations');
const STRATEGIES = ['replace', 'keep-first'];

/** True deep clone that preserves BSON types (ObjectId, Date, Decimal128, ...). */
const deepClone = (doc) => BSON.deserialize(BSON.serialize(doc));

/** Stable byte-level comparison of two documents, ignoring `_id`. */
function contentEquals(a, b) {
  const strip = (d) => {
    const { _id, ...rest } = d;
    return Object.keys(rest)
      .sort()
      .reduce((acc, k) => ((acc[k] = rest[k]), acc), {});
  };
  return BSON.serialize(strip(a)).equals(BSON.serialize(strip(b)));
}

/**
 * Distinct, non-empty type values in their original order and original casing.
 * Casing is deliberately NOT normalised — the app queries both "DownStream"
 * and "Downstream" spellings and rewriting them would break those queries.
 */
function normaliseTypes(rawType) {
  if (!Array.isArray(rawType)) return [];
  const seen = new Set();
  const out = [];
  for (const t of rawType) {
    if (typeof t !== 'string') continue;
    const v = t.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/** Scope filter shared by the analyse and execute passes. */
function buildFilter(opts) {
  const filter = { 'type.1': { $exists: true } }; // array length >= 2
  if (opts.assignmentYear) filter.assignmentYear = { $regex: `^${opts.assignmentYear}` };
  if (opts.financialYear) filter.financialYear = opts.financialYear;
  if (opts.category) filter.category = opts.category;
  return filter;
}

/**
 * Duplicate detection key.
 *
 * Primary key is (rootQuestionId, assignmentYear, type:[t]). rootQuestionId is
 * the project's own stable question identity (see models/Questionnaire.js and
 * scripts/migrate-root-question-id.js), so it identifies "the same logical
 * question" without any fuzzy text matching.
 *
 * A content key is checked as well, to catch siblings that were created by some
 * earlier hand-run script that did not set rootQuestionId.
 */
function duplicateQueries(original, rootId, typeValue) {
  const primary = {
    _id: { $ne: original._id },
    rootQuestionId: rootId,
    type: [typeValue],
  };
  if (original.assignmentYear !== undefined) primary.assignmentYear = original.assignmentYear;

  const content = {
    _id: { $ne: original._id },
    type: [typeValue],
    question: original.question === undefined ? null : original.question,
    category: original.category === undefined ? null : original.category,
    section: original.section === undefined ? null : original.section,
    subSection: original.subSection === undefined ? null : original.subSection,
    assignmentYear: original.assignmentYear === undefined ? null : original.assignmentYear,
    questionOrderNo: original.questionOrderNo === undefined ? null : original.questionOrderNo,
  };

  return { primary, content };
}

/** Build one child document for a single type value. */
function buildChild(original, typeValue, rootId, opts) {
  const child = deepClone(original);
  delete child._id; // a fresh _id is assigned by the driver on insert
  child.type = [typeValue];
  child.rootQuestionId = rootId;
  if (opts.provenance !== false) {
    child.sourceQuestionId = original.sourceQuestionId || original._id;
  }
  // created_at / updated_at are intentionally NOT touched — every other field
  // is carried over byte-for-byte from the original.
  return child;
}

async function supportsTransactions(db) {
  try {
    const hello = await db.admin().command({ hello: 1 });
    return Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch (_e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// DRY RUN
// ---------------------------------------------------------------------------

async function analyse(db, opts = {}) {
  const coll = db.collection(COLLECTION);
  const filter = buildFilter(opts);

  const report = {
    mode: 'dry-run',
    strategy: opts.strategy || 'replace',
    scope: {
      assignmentYear: opts.assignmentYear || null,
      financialYear: opts.financialYear || null,
      category: opts.category || null,
      limit: opts.limit || null,
    },
    totalScanned: await coll.countDocuments({}),
    singleTypeSkipped: 0,
    invalidTypeSkipped: 0,
    multiTypeFound: 0,
    effectivelySingleSkipped: 0,
    newDocumentsRequired: 0,
    alreadyExisting: 0,
    documentsToCreate: 0,
    originalsToRemove: 0,
    missingRootQuestionId: await coll.countDocuments({ rootQuestionId: { $exists: false } }),
    typeBreakdown: {},
    samples: [],
    warnings: [],
  };

  report.singleTypeSkipped = await coll.countDocuments({
    type: { $exists: true, $type: 'array' },
    'type.1': { $exists: false },
    'type.0': { $exists: true },
  });
  report.invalidTypeSkipped = await coll.countDocuments({
    $or: [{ type: { $exists: false } }, { type: { $size: 0 } }, { type: { $not: { $type: 'array' } } }],
  });

  let cursor = coll.find(filter).sort({ _id: 1 });
  if (opts.limit) cursor = cursor.limit(opts.limit);

  for await (const doc of cursor) {
    report.multiTypeFound += 1;
    const types = normaliseTypes(doc.type);

    if (types.length !== doc.type.length) {
      report.warnings.push(
        `${doc._id}: type array contains blank/duplicate entries — ${JSON.stringify(doc.type)} -> ${JSON.stringify(types)}`
      );
    }
    if (types.length <= 1) {
      report.effectivelySingleSkipped += 1;
      continue;
    }

    const rootId = doc.rootQuestionId || doc._id;
    const perDoc = { _id: String(doc._id), question: doc.question, types, willCreate: [], existing: [] };

    for (const t of types) {
      report.newDocumentsRequired += 1;
      report.typeBreakdown[t] = (report.typeBreakdown[t] || 0) + 1;

      const { primary, content } = duplicateQueries(doc, rootId, t);
      const hit = (await coll.findOne(primary)) || (await coll.findOne(content));
      if (hit) {
        report.alreadyExisting += 1;
        perDoc.existing.push({ type: t, _id: String(hit._id) });
      } else {
        report.documentsToCreate += 1;
        perDoc.willCreate.push(t);
      }
    }

    // With keep-first the original is reused for types[0], so one fewer insert.
    if (report.strategy === 'keep-first' && perDoc.willCreate.includes(types[0])) {
      report.documentsToCreate -= 1;
    }
    if (report.strategy === 'replace' && perDoc.willCreate.length === types.length) {
      report.originalsToRemove += 1;
    }
    if (report.strategy === 'keep-first') report.originalsToRemove = 0;

    if (report.samples.length < 10) report.samples.push(perDoc);
  }

  report.projectedCollectionSize =
    report.totalScanned - report.originalsToRemove + report.documentsToCreate;

  return report;
}

// ---------------------------------------------------------------------------
// EXECUTE
// ---------------------------------------------------------------------------

async function migrate(db, opts = {}) {
  const coll = db.collection(COLLECTION);
  const strategy = opts.strategy || 'replace';
  if (!STRATEGIES.includes(strategy)) {
    throw new Error(`Unknown strategy "${strategy}". Use one of: ${STRATEGIES.join(', ')}`);
  }

  const startedAt = new Date();
  const client = db.client || mongoose.connection.getClient();
  const useTxn = opts.useTransactions !== false && (await supportsTransactions(db));

  const report = {
    mode: 'execute',
    strategy,
    transactional: useTxn,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    totalScanned: await coll.countDocuments({}),
    multiTypeFound: 0,
    singleTypeSkipped: 0,
    effectivelySingleSkipped: 0,
    rootQuestionIdBackfilled: 0,
    documentsCreated: 0,
    skippedAlreadyExisting: 0,
    originalsRemoved: 0,
    originalsUpdatedInPlace: 0,
    failed: 0,
    errors: [],
    journalFile: null,
  };

  report.singleTypeSkipped = await coll.countDocuments({
    type: { $exists: true, $type: 'array' },
    'type.1': { $exists: false },
  });

  // --- Step 0: make sure every in-scope document has a stable rootQuestionId.
  // Same operation as scripts/migrate-root-question-id.js — behaviour preserving.
  const backfillTargets = await coll
    .find({ ...buildFilter(opts), rootQuestionId: { $exists: false } }, { projection: { _id: 1 } })
    .toArray();
  const backfilledIds = backfillTargets.map((d) => d._id);
  if (backfilledIds.length) {
    await coll.updateMany({ _id: { $in: backfilledIds } }, [{ $set: { rootQuestionId: '$_id' } }]);
  }
  report.rootQuestionIdBackfilled = backfilledIds.length;

  // Baseline for the reference-integrity check run afterwards by verify().
  const preRefs = await orphanedAnswerReferences(db);
  report.preMigrationUnresolvableRefs = preRefs.count;
  report.answerReferencesChecked = preRefs.checked;

  const journal = {
    migration: 'split-questionnaire-by-type',
    version: 1,
    strategy,
    startedAt: startedAt.toISOString(),
    scope: {
      assignmentYear: opts.assignmentYear || null,
      financialYear: opts.financialYear || null,
      category: opts.category || null,
    },
    rootQuestionIdBackfilled: report.rootQuestionIdBackfilled,
    backfilledIds,
    preMigrationUnresolvableRefs: report.preMigrationUnresolvableRefs,
    entries: [],
  };

  fs.mkdirSync(JOURNAL_DIR, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const journalFile = path.join(JOURNAL_DIR, `split-questionnaire-by-type-${stamp}.json`);
  report.journalFile = journalFile;
  const flushJournal = () =>
    fs.writeFileSync(journalFile, BSON.EJSON.stringify(journal, undefined, 2, { relaxed: false }));
  flushJournal();

  // Snapshot ids first so inserts made during the run are never re-processed.
  let idCursor = coll.find(buildFilter(opts), { projection: { _id: 1 } }).sort({ _id: 1 });
  if (opts.limit) idCursor = idCursor.limit(opts.limit);
  const sourceIds = (await idCursor.toArray()).map((d) => d._id);

  const batchSize = opts.batchSize || 50;

  for (let i = 0; i < sourceIds.length; i += batchSize) {
    const batch = sourceIds.slice(i, i + batchSize);

    for (const id of batch) {
      const original = await coll.findOne({ _id: id });
      if (!original) continue;

      report.multiTypeFound += 1;
      const types = normaliseTypes(original.type);
      if (types.length <= 1) {
        report.effectivelySingleSkipped += 1;
        continue;
      }

      const rootId = original.rootQuestionId || original._id;
      const entry = {
        originalId: original._id,
        originalTypes: original.type,
        originalDoc: null, // filled in only when the original is deleted
        createdIds: [],
        skippedTypes: [],
        deleted: false,
        updatedInPlace: false,
      };

      const session = useTxn ? client.startSession() : null;
      try {
        const run = async () => {
          const sessOpt = session ? { session } : {};
          const created = [];
          const typesToInsert = [];

          for (const t of types) {
            const { primary, content } = duplicateQueries(original, rootId, t);
            const hit =
              (await coll.findOne(primary, sessOpt)) || (await coll.findOne(content, sessOpt));
            if (hit) {
              report.skippedAlreadyExisting += 1;
              entry.skippedTypes.push(t);
            } else {
              typesToInsert.push(t);
            }
          }

          // keep-first reuses the original document for the first type.
          const inPlaceType = strategy === 'keep-first' ? types[0] : null;
          const insertTypes = typesToInsert.filter((t) => t !== inPlaceType);

          for (const t of insertTypes) {
            const child = buildChild(original, t, rootId, opts);
            const res = await coll.insertOne(child, sessOpt);
            created.push(res.insertedId);

            // Verify the child round-trips identically apart from _id and type.
            const written = await coll.findOne({ _id: res.insertedId }, sessOpt);
            const expected = { ...deepClone(original), type: [t], rootQuestionId: rootId };
            if (opts.provenance !== false) {
              expected.sourceQuestionId = original.sourceQuestionId || original._id;
            }
            delete expected._id;
            if (!contentEquals(written, expected)) {
              throw new Error(
                `verification failed for child ${res.insertedId} (type ${t}) of ${original._id}`
              );
            }
          }

          entry.createdIds = created;

          if (strategy === 'keep-first') {
            if (typesToInsert.includes(inPlaceType)) {
              await coll.updateOne(
                { _id: original._id },
                { $set: { type: [inPlaceType], rootQuestionId: rootId } },
                sessOpt
              );
              entry.updatedInPlace = true;
            }
          } else {
            // Only remove the original once every type is represented by a
            // verified, separate document.
            const survivors = await coll.countDocuments(
              { _id: { $ne: original._id }, rootQuestionId: rootId, type: { $size: 1 } },
              sessOpt
            );
            const distinctTypes = await coll.distinct(
              'type',
              { _id: { $ne: original._id }, rootQuestionId: rootId, type: { $size: 1 } },
              sessOpt
            );
            const covered = types.every((t) => distinctTypes.flat().includes(t));
            if (!covered || survivors < types.length) {
              throw new Error(
                `refusing to delete ${original._id}: only ${survivors} verified sibling(s) for ${types.length} type(s)`
              );
            }
            entry.originalDoc = deepClone(original);
            await coll.deleteOne({ _id: original._id }, sessOpt);
            entry.deleted = true;
          }
        };

        if (session) {
          await session.withTransaction(run);
        } else {
          await run();
        }

        report.documentsCreated += entry.createdIds.length;
        if (entry.deleted) report.originalsRemoved += 1;
        if (entry.updatedInPlace) report.originalsUpdatedInPlace += 1;
        journal.entries.push(entry);
      } catch (err) {
        report.failed += 1;
        report.errors.push({ originalId: String(original._id), message: err.message });

        // Compensate: remove any child we inserted, leave the original alone.
        if (!useTxn && entry.createdIds.length) {
          try {
            await coll.deleteMany({ _id: { $in: entry.createdIds } });
          } catch (cleanupErr) {
            report.errors.push({
              originalId: String(original._id),
              message: `cleanup failed, orphan ids ${entry.createdIds.join(', ')}: ${cleanupErr.message}`,
            });
          }
        }
      } finally {
        if (session) await session.endSession();
      }
    }

    flushJournal();
  }

  report.finishedAt = new Date().toISOString();
  journal.finishedAt = report.finishedAt;
  journal.report = report;
  flushJournal();

  return report;
}

// ---------------------------------------------------------------------------
// ROLLBACK
// ---------------------------------------------------------------------------

async function rollback(db, journalFile, opts = {}) {
  const coll = db.collection(COLLECTION);
  const raw = fs.readFileSync(journalFile, 'utf8');
  const journal = BSON.EJSON.parse(raw, { relaxed: false });

  const report = {
    mode: 'rollback',
    journalFile,
    entries: journal.entries.length,
    childrenDeleted: 0,
    originalsRestored: 0,
    typesRestored: 0,
    rootQuestionIdBackfillUndone: 0,
    failed: 0,
    errors: [],
  };

  // Reverse order so the collection walks back through the same states.
  for (const entry of [...journal.entries].reverse()) {
    try {
      if (entry.createdIds?.length) {
        const res = await coll.deleteMany({ _id: { $in: entry.createdIds.map((x) => new ObjectId(x)) } });
        report.childrenDeleted += res.deletedCount;
      }
      if (entry.deleted && entry.originalDoc) {
        await coll.replaceOne({ _id: entry.originalDoc._id }, entry.originalDoc, { upsert: true });
        report.originalsRestored += 1;
      }
      if (entry.updatedInPlace) {
        await coll.updateOne({ _id: new ObjectId(entry.originalId) }, { $set: { type: entry.originalTypes } });
        report.typesRestored += 1;
      }
    } catch (err) {
      report.failed += 1;
      report.errors.push({ originalId: String(entry.originalId), message: err.message });
    }
  }

  // rootQuestionId is an additive, behaviour-preserving field (the same one
  // scripts/migrate-root-question-id.js writes across the whole collection), so
  // it is kept by default. Pass undoBackfill only if you want a byte-exact
  // pre-migration state.
  if (opts.undoBackfill && journal.backfilledIds?.length) {
    try {
      const ids = journal.backfilledIds.map((x) => (x instanceof ObjectId ? x : new ObjectId(String(x))));
      const res = await coll.updateMany({ _id: { $in: ids } }, { $unset: { rootQuestionId: '' } });
      report.rootQuestionIdBackfillUndone = res.modifiedCount;
    } catch (err) {
      report.failed += 1;
      report.errors.push({ originalId: 'backfill', message: err.message });
    }
  }

  return report;
}

// ---------------------------------------------------------------------------
// Post-migration verification
// ---------------------------------------------------------------------------

async function verify(db, opts = {}) {
  const coll = db.collection(COLLECTION);
  const scope = {};
  if (opts.assignmentYear) scope.assignmentYear = { $regex: `^${opts.assignmentYear}` };

  const remainingMultiType = await coll.countDocuments({ ...scope, 'type.1': { $exists: true } });

  // Documents that predate the rootQuestionId migration and were never touched
  // by this split are reported for information only — they are not defects
  // introduced here. A split child missing rootQuestionId IS a defect.
  const missingRoot = await coll.countDocuments({ ...scope, rootQuestionId: { $exists: false } });
  const childrenMissingRoot = await coll.countDocuments({
    ...scope,
    sourceQuestionId: { $exists: true },
    rootQuestionId: { $exists: false },
  });

  // Duplicate detection only makes sense for documents that carry the identity
  // field; grouping the others would collapse them all under a single null key.
  const dupes = await coll
    .aggregate([
      { $match: { ...scope, type: { $size: 1 }, rootQuestionId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: {
            root: '$rootQuestionId',
            type: { $arrayElemAt: ['$type', 0] },
            year: '$assignmentYear',
          },
          n: { $sum: 1 },
          ids: { $push: '$_id' },
        },
      },
      { $match: { n: { $gt: 1 } } },
      { $limit: 50 },
    ])
    .toArray();

  // Every saved applicant answer must still resolve to a question. Databases
  // routinely already contain some dangling questionId values from questions
  // deleted long before this migration, so the pass/fail test is "no MORE
  // dangling references than before", not "zero". The pre-migration count is
  // captured by migrate() into the journal; verify() reads it back.
  const orphanedRefs = await orphanedAnswerReferences(db);
  const baseline =
    opts.expectedUnresolvable !== undefined
      ? opts.expectedUnresolvable
      : readBaselineFromLatestJournal();

  return {
    mode: 'verify',
    total: await coll.countDocuments(scope),
    remainingMultiType,
    missingRootQuestionId: missingRoot,
    splitChildrenMissingRootQuestionId: childrenMissingRoot,
    duplicateGroups: dupes.length,
    duplicateSamples: dupes.slice(0, 10).map((d) => ({
      rootQuestionId: String(d._id.root),
      type: d._id.type,
      count: d.n,
      ids: d.ids.map(String),
    })),
    answerReferencesChecked: orphanedRefs.checked,
    unresolvableAnswerReferences: orphanedRefs.count,
    unresolvableBaseline: baseline,
    referencesBrokenByMigration: baseline === null ? null : orphanedRefs.count - baseline,
    unresolvableSamples: orphanedRefs.samples,
    ok:
      remainingMultiType === 0 &&
      childrenMissingRoot === 0 &&
      dupes.length === 0 &&
      (baseline === null || orphanedRefs.count <= baseline),
  };
}

/** Newest execute-journal's pre-migration dangling-reference count, or null. */
function readBaselineFromLatestJournal() {
  try {
    const files = fs
      .readdirSync(JOURNAL_DIR)
      .filter((f) => f.startsWith('split-questionnaire-by-type-') && f.endsWith('.json'))
      .sort();
    if (!files.length) return null;
    const j = BSON.EJSON.parse(fs.readFileSync(path.join(JOURNAL_DIR, files[files.length - 1]), 'utf8'), {
      relaxed: false,
    });
    // relaxed:false round-trips plain numbers as Int32/Double wrappers, so coerce.
    const n = Number(j.preMigrationUnresolvableRefs);
    return Number.isFinite(n) ? n : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Walks applicantquestionnaires.answers[].questionId and checks each one still
 * resolves through the same $or lookup ApiController uses. This is the check
 * that proves the migration did not break saved applicant/assessor answers.
 */
async function orphanedAnswerReferences(db) {
  const questions = db.collection(COLLECTION);

  if (!(await db.listCollections({ name: 'applicantquestionnaires' }).hasNext())) {
    return { count: 0, samples: [], checked: 0, note: 'applicantquestionnaires collection not present' };
  }

  const referenced = (await db.collection('applicantquestionnaires').distinct('answers.questionId'))
    .filter(Boolean)
    .map(String);
  if (!referenced.length) return { count: 0, samples: [], checked: 0 };

  const asObjectIds = [];
  for (const r of referenced) {
    try {
      asObjectIds.push(new ObjectId(r));
    } catch (_e) {
      /* keep the raw string form only */
    }
  }

  // One pass over the collection instead of one findOne per reference.
  const resolved = new Set();
  const cursor = questions.find(
    {
      $or: [
        { _id: { $in: asObjectIds } },
        { rootQuestionId: { $in: asObjectIds } },
        { _id: { $in: referenced } },
        { rootQuestionId: { $in: referenced } },
      ],
    },
    { projection: { _id: 1, rootQuestionId: 1 } }
  );
  for await (const q of cursor) {
    resolved.add(String(q._id));
    if (q.rootQuestionId) resolved.add(String(q.rootQuestionId));
  }

  const unresolved = referenced.filter((r) => !resolved.has(r));
  return { count: unresolved.length, samples: unresolved.slice(0, 10), checked: referenced.length };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printReport(r) {
  const line = (k, v) => console.log(`  ${String(k).padEnd(34)} ${v}`);
  console.log('');
  if (r.mode === 'dry-run') {
    console.log('Migration DRY RUN — split-questionnaire-by-type');
    console.log('');
    line('Strategy', r.strategy);
    line('Total scanned', r.totalScanned);
    line('Multi-type found', r.multiTypeFound);
    line('Single-type skipped', r.singleTypeSkipped);
    line('Invalid/empty type skipped', r.invalidTypeSkipped);
    line('Effectively single skipped', r.effectivelySingleSkipped);
    line('New documents required', r.newDocumentsRequired);
    line('Already existing (duplicates)', r.alreadyExisting);
    line('Documents to create', r.documentsToCreate);
    line('Originals to remove', r.originalsToRemove);
    line('Missing rootQuestionId (backfill)', r.missingRootQuestionId);
    line('Projected collection size', r.projectedCollectionSize);
    console.log('');
    console.log('  Per-type document counts:');
    Object.entries(r.typeBreakdown).forEach(([t, n]) => line(`    ${t}`, n));
    if (r.warnings.length) {
      console.log('');
      console.log(`  Warnings (${r.warnings.length}):`);
      r.warnings.slice(0, 20).forEach((w) => console.log(`    - ${w}`));
    }
    console.log('');
    console.log('  Nothing was written. Re-run with --execute to apply.');
  } else if (r.mode === 'execute') {
    console.log('Migration Started');
    console.log('');
    line('Strategy', r.strategy);
    line('Transactional', r.transactional);
    line('Total scanned', r.totalScanned);
    line('Multi-type found', r.multiTypeFound);
    line('Single-type skipped', r.singleTypeSkipped);
    line('rootQuestionId backfilled', r.rootQuestionIdBackfilled);
    line('Created', r.documentsCreated);
    line('Skipped (already existing)', r.skippedAlreadyExisting);
    line('Originals removed', r.originalsRemoved);
    line('Originals updated in place', r.originalsUpdatedInPlace);
    line('Failed', r.failed);
    console.log('');
    line('Answer refs checked', r.answerReferencesChecked);
    line('Dangling refs BEFORE migration', r.preMigrationUnresolvableRefs);
    console.log('  (run --verify next; it must not exceed the number above)');
    console.log('');
    line('Journal (rollback file)', r.journalFile);
    if (r.errors.length) {
      console.log('');
      console.log(`  Errors (${r.errors.length}):`);
      r.errors.slice(0, 20).forEach((e) => console.log(`    - ${e.originalId}: ${e.message}`));
    }
    console.log('');
    console.log(r.failed === 0 ? 'Migration Completed Successfully' : 'Migration Completed WITH ERRORS');
  } else {
    console.log(JSON.stringify(r, null, 2));
  }
  console.log('');
}

function parseArgs(argv) {
  const opts = { provenance: true };
  for (const a of argv) {
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--execute') opts.execute = true;
    else if (a === '--verify') opts.verify = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--no-provenance') opts.provenance = false;
    else if (a === '--no-transactions') opts.useTransactions = false;
    else if (a === '--undo-backfill') opts.undoBackfill = true;
    else if (a.startsWith('--rollback=')) opts.rollbackFile = a.split('=')[1];
    else if (a.startsWith('--strategy=')) opts.strategy = a.split('=')[1];
    else if (a.startsWith('--mongo-url=')) opts.mongoUrl = a.split('=')[1];
    else if (a.startsWith('--assignmentYear=')) opts.assignmentYear = a.split('=')[1];
    else if (a.startsWith('--financialYear=')) opts.financialYear = a.split('=')[1];
    else if (a.startsWith('--category=')) opts.category = a.split('=')[1];
    else if (a.startsWith('--limit=')) opts.limit = Number(a.split('=')[1]);
    else if (a.startsWith('--batch-size=')) opts.batchSize = Number(a.split('=')[1]);
    else if (a.startsWith('--expected-unresolvable='))
      opts.expectedUnresolvable = Number(a.split('=')[1]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const url = opts.mongoUrl || DEFAULT_MONGO_URL;

  await mongoose.connect(url);
  const db = mongoose.connection.db;
  console.log(`Connected to ${db.databaseName}`);

  try {
    let report;
    if (opts.rollbackFile) {
      report = await rollback(db, opts.rollbackFile, opts);
    } else if (opts.verify) {
      report = await verify(db, opts);
    } else if (opts.execute) {
      console.log('');
      console.log('  !! BACKUP REQUIRED !!');
      console.log('  Take a mongodump of the questionnaires collection before running this');
      console.log('  on production, e.g.:');
      console.log(`    mongodump --uri="${url}" --collection=questionnaires --out=./backup-$(date +%F)`);
      console.log('  A rollback journal is also written under Backend/logs/migrations/.');
      console.log('');
      report = await migrate(db, opts);
    } else {
      report = await analyse(db, opts);
    }

    if (opts.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report);

    process.exitCode = report.failed ? 1 : 0;
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = {
  analyse,
  migrate,
  rollback,
  verify,
  orphanedAnswerReferences,
  normaliseTypes,
  buildFilter,
  COLLECTION,
  JOURNAL_DIR,
  STRATEGIES,
};

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
