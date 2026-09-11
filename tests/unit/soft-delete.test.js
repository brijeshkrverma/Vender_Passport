import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { orgFilter, byIdQuery } from '../../backend/shared/scope.js';
import Audit from '../../backend/modules/audits/audit.model.js';
import Finding from '../../backend/modules/findings/finding.model.js';
import Evidence from '../../backend/modules/evidence/evidence.model.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODULES = join(ROOT, 'backend/modules');

/**
 * A deleted finding is itself evidence. Records are tombstoned, never removed,
 * and every read path has to exclude the tombstones.
 */
describe('soft-delete plugin', () => {
  it.each([['Audit', Audit], ['Finding', Finding], ['Evidence', Evidence]])(
    '%s carries deletedAt / deletedBy and a softDelete static', (_name, Model) => {
      expect(Model.schema.path('deletedAt')).toBeDefined();
      expect(Model.schema.path('deletedBy')).toBeDefined();
      expect(typeof Model.softDelete).toBe('function');
      expect(typeof Model.restore).toBe('function');
    }
  );

  it('defaults deletedAt to null so live records match the scope filter', () => {
    expect(new Audit({ title: 'x', type: 'IT Audit', orgId: 'ORG-1' }).deletedAt).toBeNull();
  });
});

describe('scope filters', () => {
  it('excludes tombstoned records when scoped to an organization', () => {
    expect(orgFilter('ORG-101')).toEqual({ orgId: 'ORG-101', deletedAt: null });
  });

  it('excludes tombstoned records even without an organization scope', () => {
    expect(orgFilter(undefined)).toEqual({ deletedAt: null });
  });

  it('excludes tombstoned records on by-id lookups', () => {
    expect(byIdQuery('ORG-101', 'abc')).toEqual({ _id: 'abc', orgId: 'ORG-101', deletedAt: null });
  });
});

describe('services no longer hard-delete', () => {
  const serviceFiles = [];
  for (const entry of readdirSync(MODULES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const f of readdirSync(join(MODULES, entry.name))) {
      if (f.endsWith('.service.js')) serviceFiles.push([entry.name, join(MODULES, entry.name, f)]);
    }
  }

  // Notifications are transient user dismissals, not audit records.
  const ALLOWED_HARD_DELETE = new Set(['notifications']);

  it.each(serviceFiles.filter(([m]) => !ALLOWED_HARD_DELETE.has(m)))(
    '%s does not call findOneAndDelete', (_moduleName, file) => {
      expect(readFileSync(file, 'utf8')).not.toMatch(/findOneAndDelete/);
    }
  );

  it('keeps the stored evidence file when the record is tombstoned', () => {
    const controller = readFileSync(join(MODULES, 'evidence/evidence.controller.js'), 'utf8');
    const deleteHandler = controller.slice(
      controller.indexOf('exports.delete'),
      controller.indexOf('exports.getByAudit')
    );
    expect(deleteHandler).not.toMatch(/deleteUploadedFile\(/);
  });
});

/**
 * A unique index on a tombstoning model has to exclude the tombstones.
 *
 * `softDelete` sets `deletedAt` and leaves the document in place, so a plain
 * unique index keeps holding the dead row's key. The user-visible effect is a
 * duplicate-key error on a perfectly reasonable action — clear an answer and
 * answer again, delete an organisation and re-create it with the same name —
 * that the user has no way to resolve, because the record blocking them is
 * invisible to every read path.
 *
 * The fix is `partialFilterExpression: { deletedAt: null }`, which keeps live
 * rows unique and drops tombstones out of the index.
 */
describe('unique indexes exclude tombstones', () => {
  const QUESTIONNAIRE_MODELS = [
    ['QuestionnaireResponse', '../../backend/modules/questionnaires/response.model.js'],
    ['QuestionnaireSubmission', '../../backend/modules/questionnaires/submission.model.js'],
    ['QuestionnaireQuestion', '../../backend/modules/questionnaires/questionnaire.model.js'],
  ];

  it.each(QUESTIONNAIRE_MODELS)('%s', async (_name, path) => {
    const { default: Model } = await import(path);

    // Only models that actually tombstone are subject to the rule.
    expect(Model.schema.path('deletedAt')).toBeDefined();

    const uniques = Model.schema.indexes().filter(([, options]) => options?.unique);
    for (const [fields, options] of uniques) {
      expect(
        options.partialFilterExpression,
        `unique index on ${Object.keys(fields).join('+')} would collide with tombstones`
      ).toEqual({ deletedAt: null });
    }
  });

  it('the response upsert key is unique per submission and question', () => {
    // Without this a double submit writes a second answer and the scorecard
    // counts the same question twice.
    return import('../../backend/modules/questionnaires/response.model.js').then(({ default: Response }) => {
      const unique = Response.schema.indexes().find(([, o]) => o?.unique);
      expect(unique[0]).toEqual({ orgId: 1, submissionId: 1, questionId: 1 });
    });
  });

  it('keeps per-keystroke autosave off the assessor queue index', () => {
    // `updatedAt` changes on every save, so an unfiltered index on it would
    // rewrite a B-tree entry on the hottest path in the system.
    return import('../../backend/modules/questionnaires/response.model.js').then(({ default: Response }) => {
      const queue = Response.schema.indexes().find(([fields]) => fields.updatedAt);
      expect(queue, 'assessor queue index is missing').toBeDefined();
      expect(queue[1].partialFilterExpression).toEqual({
        status: { $in: ['Submitted', 'Flagged'] },
      });
    });
  });
});
