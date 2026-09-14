import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assertCanVerify } from '../../backend/shared/verificationPolicy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Independence is the property an audit platform exists to guarantee: the
 * person who produces a record must not be the person who attests to it, and
 * nobody may appoint themselves to audit their own work.
 */

const pending = (overrides = {}) => ({
  uploadedBy: 'user-uploader',
  verificationStatus: 'Pending',
  ...overrides,
});

describe('evidence verification policy', () => {
  it('refuses to let the uploader verify their own evidence', () => {
    expect(() => assertCanVerify(pending(), 'user-uploader'))
      .toThrowError(expect.objectContaining({ statusCode: 403 }));
  });

  it('allows an independent reviewer to verify', () => {
    expect(() => assertCanVerify(pending(), 'user-reviewer')).not.toThrow();
  });

  it('allows an independent reviewer to reject', () => {
    expect(() => assertCanVerify(pending(), 'user-reviewer', 'Rejected')).not.toThrow();
  });

  it('refuses an unidentified verifier rather than storing undefined', () => {
    // Regression: the controller passed req.user.sub, which does not exist,
    // so verifiedBy was silently written as undefined on every verification.
    expect(() => assertCanVerify(pending(), undefined))
      .toThrowError(expect.objectContaining({ statusCode: 403 }));
  });

  it('rejects an unknown decision value', () => {
    expect(() => assertCanVerify(pending(), 'user-reviewer', 'Approved'))
      .toThrowError(expect.objectContaining({ statusCode: 400 }));
  });

  it('refuses to re-verify evidence that is already verified', () => {
    expect(() => assertCanVerify(pending({ verificationStatus: 'Verified' }), 'user-reviewer'))
      .toThrowError(expect.objectContaining({ statusCode: 400 }));
  });

  it('compares identifiers by value, not by reference', () => {
    // uploadedBy arrives as an ObjectId-like value, verifierId as a string.
    const objectIdLike = { toString: () => 'user-uploader' };
    expect(() => assertCanVerify(pending({ uploadedBy: objectIdLike }), 'user-uploader'))
      .toThrowError(expect.objectContaining({ statusCode: 403 }));
  });
});

describe('evidence service uses the policy', () => {
  const source = readFileSync(join(ROOT, 'backend/modules/evidence/evidence.service.js'), 'utf8');

  it('delegates to assertCanVerify instead of re-implementing the rules', () => {
    expect(source).toMatch(/assertCanVerify\(evidence, userId, decision\)/);
  });

  it('records the reviewer identity and time', () => {
    expect(source).toMatch(/evidence\.verifiedBy = userId/);
    expect(source).toMatch(/evidence\.verifiedAt = new Date\(\)/);
  });
});

describe('evidence verification is a restricted control activity', () => {
  const routes = readFileSync(join(ROOT, 'backend/modules/evidence/evidence.routes.js'), 'utf8');
  const verifyRoute = routes.slice(routes.indexOf("'/:id/verify'"), routes.indexOf('Evidence Linking Routes'));

  it.each(['Employee', 'External Company User', 'Vendor Manager', 'Auditor'])(
    'does not let %s attest to evidence', (role) => {
      expect(verifyRoute).not.toContain(`'${role}'`);
    }
  );

  it('lets reviewer-class roles attest', () => {
    expect(verifyRoute).toContain("'Reviewer'");
    expect(verifyRoute).toContain('restrictTo(');
  });
});

describe('approving an assessment is a second pair of eyes', () => {
  const source = readFileSync(
    join(ROOT, 'backend/modules/questionnaires/submission.service.js'), 'utf8');
  const approve = source.slice(source.indexOf('async approve('), source.indexOf('async returnToApplicant('));

  it('refuses the person who carried out the assessment', () => {
    expect(approve).toMatch(/submission\.assessedBy.*===.*actor\.userId/s);
    expect(approve).toMatch(/cannot also approve it/);
  });

  it('records who assessed, so the rule has something to compare', () => {
    expect(source).toMatch(/fresh\.assessedBy = actor\.userId/);
  });

  it('records who approved, and when', () => {
    expect(approve).toMatch(/fresh\.approvedBy = actor\.userId/);
    expect(approve).toMatch(/fresh\.adminApprovedAt = new Date\(\)/);
  });

  it('refuses an approval that cannot be attributed to anyone', () => {
    expect(approve).toMatch(/if \(!actor\.userId\)/);
  });

  it('only reaches Approved from a completed assessment', () => {
    expect(approve).toMatch(/status !== 'Assessed'/);
  });

  it.each(['Auditor', 'Reviewer', 'Vendor Manager', 'External Company User'])(
    'does not let %s grant the final approval', (role) => {
      const list = source.slice(source.indexOf('const APPROVER_ROLES'), source.indexOf('function forRespondent'));
      expect(list).not.toContain(`'${role}'`);
    }
  );
});

describe('an applicant never reads the authoring document', () => {
  const source = readFileSync(
    join(ROOT, 'backend/modules/questionnaires/submission.service.js'), 'utf8');
  const projection = source.slice(source.indexOf('function forRespondent'), source.indexOf('class SubmissionService'));

  it.each(['scoringRule', 'assessorOption', 'assessorGuidence', 'subScore', 'trendRule'])(
    'does not hand %s to the respondent', (field) => {
      expect(projection).not.toMatch(new RegExp(`\\b${field}:`));
    }
  );

  it('still gives the renderer what it cannot work without', () => {
    // Visibility conditions and the cells a formula fills — without these the
    // sheet renders follow-ups that should be hidden and lets people type into
    // computed cells.
    expect(projection).toMatch(/dependsOn: s\.dependsOn/);
    expect(projection).toMatch(/gridFormulas: s\.gridFormulas/);
  });

  it('the answering screen goes through the submission, not /api/questionnaires', () => {
    const screen = readFileSync(
      join(ROOT, 'frontend-react/src/features/questionnaire/pages/AnswerQuestionnaire.jsx'), 'utf8');
    expect(screen).toMatch(/submissionApi\.questions\(/);
    expect(screen).not.toMatch(/questionnaireApi\.list\(/);
  });
});

describe('an audit does not close over findings nobody picked up', () => {
  const source = readFileSync(join(ROOT, 'backend/modules/audits/audit.service.js'), 'utf8');
  const advance = source.slice(source.indexOf('async advanceStage('), source.indexOf('async retreatStage('));

  it('checks for unacknowledged findings on the last transition only', () => {
    expect(advance).toMatch(/stageIdx \+ 1 === LIFECYCLE\.length - 1/);
    expect(advance).toMatch(/\$in: \['Open', 'Reopened'\]/);
  });

  it('names how many are outstanding rather than refusing blankly', () => {
    expect(advance).toMatch(/\$\{unacknowledged\}/);
  });
});

describe('auditor assignment', () => {
  const source = readFileSync(join(ROOT, 'backend/modules/audits/audit.service.js'), 'utf8');
  const assign = source.slice(source.indexOf('async assignAuditor'), source.indexOf('async unassignAuditor'));

  it('resolves the auditor to a real active user instead of trusting free text', () => {
    expect(assign).toMatch(/User\.findOne\(/);
    expect(assign).toMatch(/status: 'Active'/);
  });

  it('rejects a real user whose role does not perform audit work', () => {
    expect(assign).toMatch(/ASSIGNABLE_AUDITOR_ROLES\.includes\(auditor\.role\)/);
  });

  it('offers the picker from the audits router, not the admin-only users API', () => {
    // /api/users is guarded by requireAdmin, so an Audit Manager or Compliance
    // Manager — the roles that actually staff audits — got a 403 and an empty
    // picker, leaving them to type a name the server would then reject.
    const routes = readFileSync(join(ROOT, 'backend/modules/audits/audit.routes.js'), 'utf8');
    expect(routes).toMatch(/router\.get\('\/assignable-auditors'/);

    // Express matches in order: the literal path must precede '/:id'.
    expect(routes.indexOf("'/assignable-auditors'")).toBeLessThan(routes.indexOf("router.get('/:id'"));

    for (const page of ['AuditDetail.jsx', 'CreateAudit.jsx']) {
      const src = readFileSync(join(ROOT, 'frontend-react/src/pages', page), 'utf8');
      expect(src, `${page} still reads the admin-only users API`).not.toMatch(/api\/users\?role=Auditor/);
      expect(src, `${page} does not load the picker`).toMatch(/assignable-auditors/);
    }
  });

  it('picks the auditor from a select rather than a free-text box', () => {
    for (const page of ['AuditDetail.jsx', 'CreateAudit.jsx']) {
      const src = readFileSync(join(ROOT, 'frontend-react/src/pages', page), 'utf8');
      expect(src, `${page} should not use a datalist`).not.toMatch(/<datalist/);
    }
  });

  it('blocks self-appointment', () => {
    expect(assign).toMatch(/cannot assign yourself/i);
  });

  it('blocks an auditor who belongs to the organization under audit', () => {
    expect(assign).toMatch(/targetOrgId/);
    expect(assign).toMatch(/cannot be a member of the organization under audit/i);
  });
});
