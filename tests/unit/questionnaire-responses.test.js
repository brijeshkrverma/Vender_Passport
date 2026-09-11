import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import mongoose from 'mongoose';
import submissions from '../../backend/modules/questionnaires/submission.service.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/*
 * The models are read out of Mongoose's registry rather than imported.
 *
 * The service reaches them through CommonJS `require` while this file is an ES
 * module; importing them here as well compiles each schema twice and Mongoose
 * refuses the second registration. Taking them from the registry means there is
 * one instance, and it is the one the service actually uses.
 */
const Response = mongoose.models.QuestionnaireResponse;
const Submission = mongoose.models.QuestionnaireSubmission;

/**
 * The response model exists to undo a measured failure: the system it replaces
 * stored one document per applicant holding every answer — 110 documents
 * averaging 2.3 MB, the largest 3.97 MB against MongoDB's 16 MB ceiling.
 *
 * These tests pin the properties that keep it from happening again. They are
 * schema- and source-level because the unit suite runs without a database;
 * behaviour against a live server is verified separately.
 */

describe('response model — one answer per document', () => {
  it('carries no copy of the question', () => {
    // Every answer entry in the old shape repeated `question`, `description`,
    // `tooltip`, `category` and the rest. `tooltip` alone was 72 KB per
    // applicant — and editing it changed nothing anyone saw, because each
    // applicant was reading their own stale copy.
    const copied = ['question', 'description', 'tooltip', 'category', 'section',
      'subSection', 'answerType', 'standardAlignment', 'questionOrderNo'];
    for (const field of copied) {
      expect(Response.schema.path(field), `${field} must not be copied onto a response`)
        .toBeUndefined();
    }
    expect(Response.schema.path('questionId')).toBeDefined();
  });

  it('keeps maxMark, and only maxMark, denormalised', () => {
    // The one deliberate copy: a scorecard needs obtained-over-max across
    // hundreds of answers, and it freezes the denominator so raising a
    // question's marks next year cannot restate a published score.
    expect(Response.schema.path('maxMark')).toBeDefined();
    expect(Response.schema.path('marksNotApplicable')).toBeDefined();
  });

  it('records which version of the question was answered', () => {
    expect(Response.schema.path('questionVersion')).toBeDefined();
  });

  it('is anchored to its submission by id, not by three loose strings', () => {
    // (applicantId, financialYear, orgId) would orphan silently if a submission
    // were written as '2026' and its answers as '2026-27'.
    const path = Response.schema.path('submissionId');
    expect(path).toBeDefined();
    expect(path.isRequired).toBe(true);
  });

  it('cannot hold two live answers to the same question', () => {
    const unique = Response.schema.indexes().find(([, o]) => o?.unique);
    expect(unique[0]).toEqual({ orgId: 1, submissionId: 1, questionId: 1 });
    // Partial, because softDelete tombstones: without it, clearing an answer
    // would make re-answering fail with a duplicate key.
    expect(unique[1].partialFilterExpression).toEqual({ deletedAt: null });
  });
});

describe('submission model — the header only', () => {
  it('holds no answers', () => {
    expect(Submission.schema.path('answers')).toBeUndefined();
    expect(Submission.schema.path('responses')).toBeUndefined();
  });

  it('stores totals so a dashboard does not aggregate once per row', () => {
    expect(Submission.schema.path('totals.maxMark')).toBeDefined();
    expect(Submission.schema.path('totals.obtainedMark')).toBeDefined();
    expect(Submission.schema.path('totals.totalsComputedAt')).toBeDefined();
  });

  it('records the three submissions separately', () => {
    // They happen at different times and each locks a different set of fields.
    for (const f of ['applicantSubmittedAt', 'assessorSubmittedAt', 'adminApprovedAt']) {
      expect(Submission.schema.path(f)).toBeDefined();
    }
  });

  it('allows one submission per applicant per year per audit, excluding tombstones', () => {
    // `auditId` is part of the key, not a filter on it. A vendor's yearly
    // questionnaire and one raised inside an audit are different documents for
    // the same applicant and year; without it here the second would collide and
    // fail to start.
    const unique = Submission.schema.indexes().find(([, o]) => o?.unique);
    expect(unique[0]).toEqual({ orgId: 1, applicantId: 1, financialYear: 1, auditId: 1 });
    expect(unique[1].partialFilterExpression).toEqual({ deletedAt: null });
  });

  it('links to an audit without requiring one', () => {
    // Most questionnaires have no audit. Making it required would force a
    // sentinel value on every vendor's yearly assessment.
    const path = Submission.schema.path('auditId');
    expect(path).toBeDefined();
    expect(path.isRequired).toBeFalsy();
  });
});

/**
 * Ownership, not role, decides who may write an answer.
 *
 * A role list cannot express "your own and nobody else's", and without that
 * rule any authenticated user could write into another applicant's
 * questionnaire knowing only its id — which on an assessment platform is a
 * scoring problem, not just a privacy one.
 */
describe('who may act on a submission', () => {
  const owner = { userId: 'u-applicant', role: 'External Company User' };
  const stranger = { userId: 'u-other', role: 'External Company User' };
  const assessor = { userId: 'u-assessor', role: 'Auditor' };
  const submission = { applicantId: 'u-applicant' };

  it('lets an applicant act on their own', () => {
    expect(() => submissions.assertMayAct(owner, submission)).not.toThrow();
  });

  it('refuses another applicant', () => {
    expect(() => submissions.assertMayAct(stranger, submission))
      .toThrow(/only work on your own/i);
  });

  it('lets a reviewer act on anyone’s', () => {
    expect(() => submissions.assertMayAct(assessor, submission)).not.toThrow();
  });

  it('treats every assessing role as a reviewer, and applicants as not', () => {
    const { isReviewer } = submissions;
    ['Super Admin', 'Organization Admin', 'Compliance Manager',
      'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant']
      .forEach((role) => expect(isReviewer({ role }), role).toBe(true));

    ['External Company User', 'Vendor Manager', 'Employee']
      .forEach((role) => expect(isReviewer({ role }), role).toBe(false));
  });
});

/**
 * The write path runs once per answer the respondent touches, so what it does
 * per call is the thing that matters. These read the source because the effect
 * is architectural — it cannot be observed from one call's return value.
 */
describe('the save path stays small', () => {
  const service = read('backend/modules/questionnaires/response.service.js');

  it('upserts a single answer rather than rewriting a set', () => {
    expect(service).toMatch(/findOneAndUpdate\(/);
    expect(service).toMatch(/upsert: true/);
  });

  it('does not touch the submission counters on an ordinary save', () => {
    // Incrementing them here would add a second document write to every
    // keystroke-batch. They are rebuilt at state changes instead.
    const save = service.slice(service.indexOf('async save('), service.indexOf('async review('));
    expect(save).not.toMatch(/recomputeTotals/);
  });

  it('rebuilds the counters when a mark changes', () => {
    const review = service.slice(service.indexOf('async review('), service.indexOf('async clear('));
    expect(review).toMatch(/recomputeTotals/);
  });

  it('freezes the question’s max marks on first save', () => {
    expect(service).toMatch(/\$setOnInsert/);
    expect(service).toMatch(/maxMark:/);
  });

  it('refuses an answer to a question from another organisation', () => {
    // The same read that fetches maxMark is the one that proves the question
    // belongs here, so the check costs nothing extra.
    expect(service).toMatch(/Question\.findOne\(byIdQuery\(orgId, questionId\)\)/);
  });
});

describe('submission lifecycle', () => {
  const service = read('backend/modules/questionnaires/submission.service.js');

  it('will not accept a submit while answers are missing', () => {
    // A half-answered questionnaire marked "submitted" reads to an assessor as
    // a complete one with gaps, which is worse than an unfinished one.
    expect(service).toMatch(/still unanswered/);
  });

  it('excludes not-applicable questions from the denominator', () => {
    expect(service).toMatch(/\$cond: \['\$marksNotApplicable', 0, '\$maxMark'\]/);
  });

  it('reopens the applicant’s side when a questionnaire is returned', () => {
    const fn = service.slice(service.indexOf('async returnToApplicant('));
    expect(fn).toMatch(/applicantSubmittedAt = null/);
  });
});

/**
 * Scoring runs when the applicant submits, so an assessor opens a submission
 * with the rules already applied. The alternative — a button they press first —
 * means whoever forgets reviews a questionnaire that appears to have scored
 * nothing, with no way to tell that from a real zero.
 */
describe('submitting scores the questionnaire', () => {
  const service = read('backend/modules/questionnaires/submission.service.js');

  it('scores after the submission is saved, not before', () => {
    // The applicant has submitted; that fact must not depend on the scoring
    // engines being loadable.
    const savedAt = service.indexOf('fresh.status = \'Submitted\'');
    const scoredAt = service.indexOf('scoreSubmission');
    expect(savedAt).toBeLessThan(scoredAt);
  });

  it('records a scoring failure instead of failing the submit', () => {
    expect(service).toMatch(/scoringError = e\.message/);
    expect(read('backend/modules/questionnaires/submission.model.js')).toMatch(/scoringError/);
  });

  it('re-reads before returning, so the totals are not the pre-scoring ones', () => {
    // Returning the copy loaded earlier told the applicant they had scored zero
    // on a questionnaire that had just been scored.
    const tail = service.slice(service.indexOf('scoreSubmission'));
    expect(tail).toMatch(/return Submission\.findOne/);
  });

  it('requires the two services lazily, because they reference each other', () => {
    expect(service).toMatch(/require\('\.\/scoring\.service'\)/);
  });
});

describe('what an assessor reads', () => {
  const service = read('backend/modules/questionnaires/response.service.js');

  it('returns the question, the answer and the score together', () => {
    // Three separate fetches would be three round trips per section, arriving
    // out of order while the assessor is trying to read them side by side.
    const fn = service.slice(service.indexOf('async forReview('));
    expect(fn).toMatch(/Question\.find/);
    expect(fn).toMatch(/question,\s*\n\s*response:/);
  });

  it('can be narrowed to one section', () => {
    expect(service).toMatch(/if \(section\) filter\.section = section/);
  });
});
