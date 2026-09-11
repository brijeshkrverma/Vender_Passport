import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Audit from '../../backend/modules/audits/audit.model.js';

/**
 * Regression: nextStatus() used to return the string 'In Progress' for every
 * stage from 5 onward. 'In Progress' is not in the audit status enum, so
 * Mongoose rejected the save and NO audit could ever move past 'Execution' —
 * six of the twelve lifecycle stages were unreachable through the API.
 */

const LIFECYCLE = [
  'Planning', 'Scoping', 'Risk Assessment', 'Questionnaire', 'Auditor Assigned',
  'Execution', 'Evidence Review', 'Findings', 'Corrective Actions',
  'Verification', 'Report', 'Closed',
];

function nextStatus(stageIdx) {
  return LIFECYCLE[Math.min(stageIdx, LIFECYCLE.length - 1)];
}

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
});
