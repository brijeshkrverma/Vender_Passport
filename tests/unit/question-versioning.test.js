import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import mongoose from 'mongoose';
import service from '../../backend/modules/questionnaires/questionnaire.service.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// Taken from the registry, not imported: the service reaches it through CJS
// while this file is an ES module, and two compilations of one schema throw.
const Question = mongoose.models.QuestionnaireQuestion;

/**
 * `questionVersion` on a response used to be a constant.
 *
 * The field existed, and the model claimed it was "the difference between 'this
 * score is defensible' and 'we cannot reconstruct what they were asked'". It
 * was not: `update()` rewrote the document in place and never touched
 * `version`, so every answer recorded version 1 against wording that could have
 * changed since. A record that documents a guarantee it does not provide is
 * worse than no record.
 */

describe('the four states a question can be in', () => {
  it('are all representable', () => {
    const path = Question.schema.path('status');
    expect(path.enumValues).toEqual(['Draft', 'Published', 'Superseded', 'Archived']);
  });

  it('start as Draft — nothing is live until someone publishes it', () => {
    expect(Question.schema.path('status').defaultValue).toBe('Draft');
  });

  it('link versions through a shared root', () => {
    expect(Question.schema.path('rootQuestionId')).toBeDefined();
    expect(Question.schema.path('version').defaultValue).toBe(1);
  });
});

/**
 * The behaviour is read from the source because it spans a database: the unit
 * suite has none, and the transitions are verified against a live server
 * separately. What these hold is the shape of the decision, which is where the
 * bug was.
 */
describe('editing depends on whether anyone could have answered', () => {
  const source = read('backend/modules/questionnaires/questionnaire.service.js');
  const update = source.slice(source.indexOf('async update('), source.indexOf('async publish('));

  it('changes a Draft in place', () => {
    // Nothing has been answered, so there is nothing to preserve. Versioning a
    // draft would leave an author with a history of their own typing.
    expect(update).toMatch(/status !== 'Published'/);
    expect(update).toMatch(/current\.save\(\)/);
  });

  it('creates the next version of a Published one', () => {
    expect(update).toMatch(/version: current\.version \+ 1/);
    expect(update).toMatch(/rootQuestionId: root/);
  });

  it('writes the new version before superseding the old', () => {
    // If the insert fails, the old version is still live and answerable.
    // Superseding first would leave the year with a hole in it.
    expect(update.indexOf('Question.create')).toBeLessThan(update.indexOf("status = 'Superseded'"));
  });

  it('refuses while a questionnaire is open', () => {
    expect(update).toMatch(/assertNoOpenSubmissions/);
  });
});

/**
 * You do not change the exam while people are sitting it.
 *
 * The alternative — allowing it — means a respondent who answered v1 sees v2
 * appear unanswered, and a questionnaire they had finished silently becomes
 * incomplete with nothing on screen to say why.
 */
describe('the question set is frozen during a cycle', () => {
  const source = read('backend/modules/questionnaires/questionnaire.service.js');

  it('is a hard stop, not a warning', () => {
    const guard = source.slice(source.indexOf('async assertNoOpenSubmissions('));
    expect(guard).toMatch(/throw new ValidationError/);
    expect(guard).toMatch(/applicantSubmittedAt: null/);
  });

  it('guards archiving too, not only editing', () => {
    const archive = source.slice(source.indexOf('async archive('), source.indexOf('async versions('));
    expect(archive).toMatch(/assertNoOpenSubmissions/);
  });

  it('says what to do about it', () => {
    // "Refused" without a next step is a dead end for whoever hit it.
    expect(source).toMatch(/Wait until they are submitted, or return them first/);
  });
});

/**
 * One definition of which questions a respondent is given.
 *
 * When the list and the completeness check disagreed, a superseded version
 * inflated the expected count and made submitting impossible — and the error
 * named a question the respondent had never been shown.
 */
describe('“answerable” means one thing', () => {
  it('excludes superseded and archived versions', () => {
    expect(service.ANSWERABLE).toEqual({ $nin: ['Superseded', 'Archived'] });
  });

  it('is the same constant the submit check counts with', () => {
    const submission = read('backend/modules/questionnaires/submission.service.js');
    expect(submission).toMatch(/const \{ ANSWERABLE \} = require\('\.\/questionnaire\.service'\)/);
    expect(submission).toMatch(/status: ANSWERABLE/);
  });

  it('is what the list filters by when no status is asked for', () => {
    const source = read('backend/modules/questionnaires/questionnaire.service.js');
    expect(source).toMatch(/else filter\.status = ANSWERABLE;/);
  });
});

describe('history stays readable', () => {
  const source = read('backend/modules/questionnaires/questionnaire.service.js');

  it('a superseded version can still be fetched by id', () => {
    // An answer names the exact document it was given. If that read were
    // filtered out, the response's `questionVersion` would point at nothing.
    const getById = source.slice(source.indexOf('async getById('), source.indexOf('async create('));
    expect(getById).not.toMatch(/Superseded/);
  });

  it('every version of a question is reachable from any of them', () => {
    const versions = source.slice(source.indexOf('async versions('));
    expect(versions).toMatch(/rootQuestionId \|\| doc\._id/);
    expect(versions).toMatch(/sort\(\{ version: -1 \}\)/);
  });
});
