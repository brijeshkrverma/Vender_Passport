import { describe, it, expect } from 'vitest';
import { requireRole, requireAdmin, requireAuditor, restrictTo } from '../../backend/middleware/rbac.js';
import { tenantIsolation } from '../../backend/middleware/tenant.js';

/** Minimal express-style harness: returns the error passed to next(), if any. */
function run(middleware, req) {
  let captured;
  middleware(req, {}, (err) => { captured = err; });
  return captured;
}

const asUser = (role, orgId = 'ORG-101') => ({ user: { role, orgId, userId: 'u1' }, method: 'GET', params: {}, query: {}, body: {} });

describe('requireRole', () => {
  it('allows a listed role', () => {
    expect(run(requireRole('Auditor'), asUser('Auditor'))).toBeUndefined();
  });

  it('rejects an unlisted role with 403', () => {
    const err = run(requireRole('Auditor'), asUser('Employee'));
    expect(err?.statusCode).toBe(403);
  });

  it('rejects an unauthenticated request', () => {
    const err = run(requireRole('Auditor'), { method: 'GET', params: {}, query: {}, body: {} });
    expect(err?.statusCode).toBe(403);
  });
});

describe('requireAdmin', () => {
  it.each(['Super Admin', 'Organization Admin'])('allows %s', (role) => {
    expect(run(requireAdmin, asUser(role))).toBeUndefined();
  });

  it.each(['Compliance Manager', 'Audit Manager', 'Auditor', 'Employee'])('rejects %s', (role) => {
    expect(run(requireAdmin, asUser(role))?.statusCode).toBe(403);
  });
});

describe('requireAuditor (audit create/delete)', () => {
  // Regression: 'Compliance Manager' was missing, so the product's primary
  // "+ Create → New Audit" flow returned 403 for the role it was designed for.
  it('allows Compliance Manager to open an engagement', () => {
    expect(run(requireAuditor, asUser('Compliance Manager'))).toBeUndefined();
  });

  it.each(['Super Admin', 'Organization Admin', 'Audit Manager', 'Auditor', 'CA / Consultant'])(
    'allows %s', (role) => {
      expect(run(requireAuditor, asUser(role))).toBeUndefined();
    }
  );

  it.each(['Employee', 'External Company User', 'Document Manager', 'Vendor Manager'])(
    'rejects %s', (role) => {
      expect(run(requireAuditor, asUser(role))?.statusCode).toBe(403);
    }
  );
});

describe('restrictTo', () => {
  it('permits a role in the list and blocks one outside it', () => {
    const guard = restrictTo('Super Admin', 'Reviewer');
    expect(run(guard, asUser('Reviewer'))).toBeUndefined();
    expect(run(guard, asUser('Auditor'))?.statusCode).toBe(403);
  });
});

describe('tenantIsolation', () => {
  it('blocks a cross-organization request', () => {
    const req = { ...asUser('Compliance Manager'), query: { orgId: 'ORG-999' } };
    expect(run(tenantIsolation, req)?.statusCode).toBe(403);
  });

  it('allows a request scoped to the caller own organization', () => {
    const req = { ...asUser('Compliance Manager'), query: { orgId: 'ORG-101' } };
    expect(run(tenantIsolation, req)).toBeUndefined();
  });

  it('overwrites a client-supplied orgId on create', () => {
    const req = { ...asUser('Auditor'), method: 'POST', body: { title: 'x' } };
    run(tenantIsolation, req);
    expect(req.body.orgId).toBe('ORG-101');
  });

  it('lets Super Admin cross organizations', () => {
    const req = { ...asUser('Super Admin'), query: { orgId: 'ORG-999' } };
    expect(run(tenantIsolation, req)).toBeUndefined();
  });
});
