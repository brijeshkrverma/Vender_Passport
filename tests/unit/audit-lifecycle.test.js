import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mongoose from 'mongoose';
import Audit from '../../backend/modules/audits/audit.model.js';
import lifecycle from '../../backend/modules/audits/lifecycle.js';

/**
 * Regression: nextStatus() used to return the string 'In Progress' for every
 * stage from 5 onward. 'In Progress' is not in the audit status enum, so
 * Mongoose rejected the save and NO audit could ever move past 'Execution' —
 * six of the twelve lifecycle stages were unreachable through the API.
 *
 * The list is no longer written out here. It is read from the module every
 * server-side caller now shares, so this file tests the real thing rather than
 * a sixth copy of it.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { LIFECYCLE, statusForStage: nextStatus, ACTIVE_STATUSES, CLOSED } = lifecycle;

function buildAudit(stageIdx) {
  return new Audit({
    title: 'Lifecycle regression audit',
    type: 'Compliance Audit',
    orgId: 'ORG-TEST',
    stageIdx,
    status: nextStatus(stageIdx),
  });
}

describe('audit lifecycle', () => {
  it('produces a schema-valid status for every stage index', () => {
    for (let stageIdx = 0; stageIdx < LIFECYCLE.length; stageIdx++) {
      const err = buildAudit(stageIdx).validateSync();
      expect(err?.errors?.status, `stageIdx ${stageIdx} produced an invalid status`).toBeUndefined();
    }
  });

  it('maps each stage index to its own lifecycle label', () => {
    LIFECYCLE.forEach((label, idx) => {
      expect(nextStatus(idx)).toBe(label);
    });
  });

  it('never emits the out-of-enum "In Progress" value', () => {
    const produced = LIFECYCLE.map((_, idx) => nextStatus(idx));
    expect(produced).not.toContain('In Progress');
  });

  it('clamps a stage index beyond the end instead of returning undefined', () => {
    // Seed data contains stageIdx values such as 25.
    expect(nextStatus(25)).toBe('Closed');
    expect(buildAudit(25).validateSync()?.errors?.status).toBeUndefined();
  });

  it('keeps every lifecycle label inside the model enum', () => {
    const enumValues = mongoose.model('Audit').schema.path('status').enumValues;
    LIFECYCLE.forEach(label => expect(enumValues).toContain(label));
  });

  it('treats every stage but the last as active', () => {
    expect(ACTIVE_STATUSES).toEqual(LIFECYCLE.slice(0, -1));
    expect(ACTIVE_STATUSES).not.toContain(CLOSED);
  });
});

/**
 * The stepper and the progress column render this list in the browser. They are
 * ES modules and `lifecycle.js` is CommonJS, so they cannot import it and keep
 * their own copies instead — the same arrangement as `backend/scoring/engines.js`.
 *
 * Two copies of an ordered list drift, and the drift here is not cosmetic:
 * `stageIdx` is an index into it, so a frontend list that disagrees about the
 * order labels every audit with the wrong stage. These tests are what make the
 * copies safe.
 */
describe('the screens agree with the server about the lifecycle', () => {
  /** Pull an array literal out of a source file by its variable name. */
  function arrayLiteral(relPath, varName) {
    const source = readFileSync(join(ROOT, relPath), 'utf8');
    const match = new RegExp(`${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(source);
    if (!match) return null;
    return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  }

  it.each([
    ['frontend-react/src/pages/AuditDetail.jsx', 'LIFECYCLE_STAGES'],
    ['frontend-react/src/pages/Audits.jsx', 'LIFECYCLE_STAGES'],
  ])('%s — %s matches backend/modules/audits/lifecycle.js', (file, varName) => {
    const found = arrayLiteral(file, varName);
    expect(found, `${varName} not found in ${file}`).not.toBeNull();
    expect(found).toEqual(LIFECYCLE);
  });
});
