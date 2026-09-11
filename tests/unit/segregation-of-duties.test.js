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
