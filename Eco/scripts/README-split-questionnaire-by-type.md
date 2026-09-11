# Migration — split questionnaire documents by applicant type

Turns one questionnaire document that covers several applicant types into one
independent document per type.

```js
// before
{ _id: ObjectId("66ab633ccecd59a0a4c1cce5"), type: ["OEM", "Upstream"], question: "...", answer: [...] }

// after
{ _id: ObjectId("<new>"), type: ["OEM"],      rootQuestionId: ObjectId("66ab63…"), question: "...", answer: [...] }
{ _id: ObjectId("<new>"), type: ["Upstream"], rootQuestionId: ObjectId("66ab63…"), question: "...", answer: [...] }
```

Documents that already hold a single type are left completely untouched.

## Files

| File | Purpose |
| --- | --- |
| `scripts/split-questionnaire-by-type.js` | Migration logic + CLI. Single source of truth. |
| `controllers/QuestionnaireMigrationController.js` | HTTP wrapper around the same functions. |
| `routes/api.routes.js` | Route registration (`/questionnaire-type-migration/*`). |
| `logs/migrations/*.json` | Rollback journals, written automatically on every execute. |

## Two ways to get one document per type

This migration fixes data **already in the collection**. New data arriving
through the JSON upload on `/dashboard/questionnaire-selector` is split at
import time instead, by `controllers/QuestionnaireImportController.js` (its
`splitByType` option, on by default). Both paths produce the same result and
share the same identity rule: the per-type copies get new `_id`s and a common
`rootQuestionId`.

The importer also detects a combined `type: ["OEM", "Upstream"]` document left
by an earlier non-split import and converts it in place rather than inserting
per-type copies next to it, so the two paths can be mixed safely.

## Why references do not break

`applicantquestionnaires.answers[].questionId` stores a `questionnaires._id`, and
`ApiController` resolves it with:

```js
Questionnaire.findOne({ $or: [{ rootQuestionId: qid }, { _id: qid }] })
```

So every split child is written with
`rootQuestionId = original.rootQuestionId || original._id`. Even after the
original document is deleted, every previously saved applicant/assessor answer
still resolves through the `rootQuestionId` branch.

Originals that predate the `rootQuestionId` field are backfilled first — the
same operation as `scripts/migrate-root-question-id.js`, which is behaviour
preserving because it sets `rootQuestionId = _id`.

## Strategies

| Strategy | Behaviour |
| --- | --- |
| `replace` (default) | Every type gets a brand new `_id`; the original is deleted **only after** all children exist and have been verified. Matches the requested spec. |
| `keep-first` | The original document is updated in place to `type: [firstType]` — its `_id` survives — and the remaining types get new documents. Nothing is ever deleted. Safest for reference integrity. |

## Running it

Backup first. The script prints the command and also writes a rollback journal,
but a real `mongodump` is still the primary safety net:

```bash
mongodump --uri="mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE" \
          --collection=questionnaires --out=./backup-$(date +%F)
```

Then, from `Backend/`:

```bash
# 1. see what would happen — writes nothing
npm run migrate:split-questionnaire-types:dry-run

# 2. apply
npm run migrate:split-questionnaire-types

# 3. confirm
npm run migrate:split-questionnaire-types:verify
```

Scope and tuning flags (append after `--` when using npm, or call node directly):

```bash
node scripts/split-questionnaire-by-type.js --dry-run --assignmentYear=2025
node scripts/split-questionnaire-by-type.js --execute --strategy=keep-first
node scripts/split-questionnaire-by-type.js --execute --limit=50 --batch-size=25
node scripts/split-questionnaire-by-type.js --execute --mongo-url="mongodb://host/db"
```

| Flag | Meaning |
| --- | --- |
| `--dry-run` | Analyse only (default when no mode is given). |
| `--execute` | Apply the migration. |
| `--verify` | Post-migration integrity report. |
| `--rollback=<journal>` | Undo a previous execute. |
| `--undo-backfill` | With `--rollback`, also remove the `rootQuestionId` backfill for a byte-exact restore. |
| `--strategy=replace\|keep-first` | See table above. |
| `--assignmentYear=` / `--financialYear=` / `--category=` | Limit the scope. |
| `--limit=` / `--batch-size=` | Throttle a large run. |
| `--no-provenance` | Do not write `sourceQuestionId` on children. |
| `--no-transactions` | Force the non-transactional path. |
| `--json` | Machine-readable report. |

## Rollback

```bash
node scripts/split-questionnaire-by-type.js \
  --rollback=logs/migrations/split-questionnaire-by-type-<timestamp>.json
```

The journal holds the full original document for everything that was deleted,
so rollback deletes the children and restores the originals exactly. Add
`--undo-backfill` to also strip the additive `rootQuestionId` field.

## Duplicate prevention (idempotency)

Before creating a child for type `t`, the script looks for an existing document
matching either:

1. `{ rootQuestionId, assignmentYear, type: [t] }` — the primary key, based on
   the project's own stable question identity; or
2. a content key `{ question, category, section, subSection, assignmentYear,
   questionOrderNo, type: [t] }` — catches siblings created by an earlier
   hand-run script that never set `rootQuestionId`.

If either matches, that type is skipped. The original is deleted only once every
type is covered by a verified sibling — so an interrupted run resumes cleanly
instead of duplicating or losing data.

## Transactions

If the deployment is a replica set or sharded cluster, each document is split
inside a transaction. On a standalone `mongod` (the current setup) transactions
are unavailable, so the script uses a safe ordered sequence instead:
insert children → read back and byte-compare each one → only then delete the
original. Any failure removes the just-inserted children and leaves the original
untouched, and the document is reported under `errors`.

## Application code affected

`Questionnaire` documents are counted in a few aggregations that had no
`rootQuestionId` awareness. Where a filter can match more than one type at once,
the split would have counted a question once per type. Those pipelines now
collapse siblings first:

- `ApiController.getQuestionsDetailsByApplicantID` — category counts and `totalCount`
- `ApiController.getAssessorQuestionsDetailsByApplicantID` — category counts and `totalCount`

The added stage is `{ $group: { _id: { $ifNull: ["$rootQuestionId", "$_id"] }, … } }`,
which is a no-op before the migration (every document has a distinct
`rootQuestionId`) and restores the pre-migration numbers after it.

Verified safe without changes, because the frontend sends a single type:

- `getQuestionnariesByCategoryName` (`type: { $in: this.type }`, one element)
- `getCategoryCount` (same)
- `swapQuestionnaire` (`type: [selectedApplicantType]`)
- the admin questionnaire list, which filters client-side on
  `q.type.includes(selectedApplicantType)`

## Behaviour change to be aware of

After the split, the OEM and Upstream copies of a question are separate
documents. Editing one in the admin master no longer changes the other — which
is the point of the migration, but admins used to a single shared row need to
know. Question ordering (`position`) also becomes independent per type.
