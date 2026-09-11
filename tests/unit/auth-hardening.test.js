import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ALL_ROLES, SELF_SIGNUP_ROLES, canGrantRole } from '../../backend/shared/roles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Regression: POST /api/auth/register accepted an arbitrary `role` string and a
 * client-supplied `orgId`. Anyone could therefore sign up as 'Super Admin' in
 * an existing tenant — and because tenant isolation exempts Super Admin, read
 * and write every organisation's data.
 */
describe('self-signup role policy', () => {
  it('never allows Super Admin to be self-assigned', () => {
    expect(SELF_SIGNUP_ROLES).not.toContain('Super Admin');
  });

  it('only offers roles that actually exist', () => {
    SELF_SIGNUP_ROLES.forEach(role => expect(ALL_ROLES).toContain(role));
  });

  it('lets only a Super Admin grant Super Admin', () => {
    expect(canGrantRole('Super Admin', 'Super Admin')).toBe(true);
    expect(canGrantRole('Organization Admin', 'Super Admin')).toBe(false);
    expect(canGrantRole('Compliance Manager', 'Super Admin')).toBe(false);
    expect(canGrantRole('Auditor', 'Super Admin')).toBe(false);
  });

  it('lets admins grant ordinary roles but non-admins grant nothing', () => {
    expect(canGrantRole('Organization Admin', 'Auditor')).toBe(true);
    expect(canGrantRole('Super Admin', 'Auditor')).toBe(true);
    expect(canGrantRole('Audit Manager', 'Auditor')).toBe(false);
    expect(canGrantRole('Employee', 'Employee')).toBe(false);
  });
});

describe('register endpoint contract', () => {
  const source = readFileSync(join(ROOT, 'backend/modules/auth/auth.routes.js'), 'utf8');
  const registerSchema = source.slice(
    source.indexOf('const registerSchema'),
    source.indexOf('const loginSchema')
  );

  it('constrains role to the shared allow-list rather than a free string', () => {
    expect(registerSchema).toMatch(/role:\s*z\.enum\(SELF_SIGNUP_ROLES/);
    expect(registerSchema).not.toMatch(/role:\s*z\.string\(\)/);
  });

  it('does not accept orgId from the client', () => {
    expect(registerSchema).not.toMatch(/orgId/);
  });
});

describe('registration cannot join an existing organization', () => {
  const source = readFileSync(join(ROOT, 'backend/modules/auth/auth.service.js'), 'utf8');
  const resolveOrg = source.slice(
    source.indexOf('async resolveOrg'),
    source.indexOf('escapeRegex(str)')
  );

  it('rejects a name that already belongs to a tenant instead of joining it', () => {
    // Returning the existing org here would re-open the escalation: anyone
    // could type "GlobalTech Solutions" and land inside that tenant.
    expect(resolveOrg).toMatch(/if \(existing\)/);
    expect(resolveOrg).toMatch(/throw new ConflictError/);
    expect(resolveOrg).not.toMatch(/if \(existing\) return existing;/);
  });
});

describe('login', () => {
  const source = readFileSync(join(ROOT, 'backend/modules/auth/auth.service.js'), 'utf8');

  it('excludes soft-deleted accounts', () => {
    expect(source).toMatch(/User\.findOne\(\{ email, deletedAt: null \}\)/);
  });

  it('carries the user name in the token so the audit trail can name the actor', () => {
    expect(source).toMatch(/name: user\.name/);
  });
});

describe('authenticate middleware', () => {
  const source = readFileSync(join(ROOT, 'backend/middleware/auth.js'), 'utf8');

  it('copies the name off the token onto req.user', () => {
    // Regression: the token carried `name` but the middleware dropped it, so
    // every audit-trail entry recorded a raw user id instead of a person.
    expect(source).toMatch(/name: decoded\.name/);
  });
});

/**
 * EVERY MOUNTED ROUTER MUST REQUIRE AUTHENTICATION.
 *
 * `server.js` used to give unauthenticated requests a demo identity —
 * `Compliance Manager` of `ORG-101`. It never actually reached a handler,
 * because every router applies `authenticate` after it, but it made a real hole
 * one mistake away: mount a router without that guard and it would have been
 * publicly readable as an org admin, silently, because `req.user` was already
 * populated.
 *
 * The fallback is now opt-in and off by default. This is the part that keeps
 * holding: a new module that forgets `authenticate` fails here rather than in
 * production.
 */
describe('every API router is behind authentication', () => {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const server = readFileSync(join(ROOT, 'server.js'), 'utf8');

  /** The route modules `server.js` actually mounts. */
  const mounted = [...server.matchAll(/'\/api\/[\w-]+':\s*'\.\/(backend\/[\w./-]+)'/g)]
    .map((m) => `${m[1]}.js`);

  it('mounts the modules this test expects to find', () => {
    // If the mounting style changes, this test would silently check nothing.
    expect(mounted.length).toBeGreaterThan(15);
  });

  /**
   * The complete public API surface.
   *
   * Anything reachable without a token is listed here and nowhere else. A new
   * unauthenticated endpoint fails this test until somebody adds it to this
   * list, which is the point: the list is what a reviewer reads to know what is
   * exposed, and it cannot drift from the routes because the routes are checked
   * against it.
   */
  const PUBLIC = new Set([
    'auth POST /register',   // creating an account cannot require one
    'auth POST /login',
    'auth POST /refresh',    // trades a refresh cookie, not a bearer token
  ]);

  it.each(mounted)('%s leaves nothing unauthenticated', (rel) => {
    const source = readFileSync(join(ROOT, rel), 'utf8');
    const moduleName = rel.split('/')[2];

    // A router-level guard covers everything mounted under it.
    if (/router\.use\([^;]*authenticate/.test(source)) return;

    const routes = [...source.matchAll(
      /^router\.(get|post|put|delete|patch)\(\s*'([^']+)'([^\n]*)/gm)];

    expect(routes.length, `no routes found in ${rel} — the pattern may have changed`)
      .toBeGreaterThan(0);

    routes.forEach(([, verb, path, rest]) => {
      const id = `${moduleName} ${verb.toUpperCase()} ${path}`;
      if (PUBLIC.has(id)) return;
      expect(rest, `${id} is reachable without a token`).toMatch(/authenticate/);
    });
  });

  it('does not hand out an identity unless explicitly asked', () => {
    // Opt-in, not opt-out: forgetting to switch it on costs a demo, forgetting
    // to switch it off would expose everything.
    expect(server).toMatch(/if \(env\.ALLOW_DEMO_AUTH\)/);

    const envSource = readFileSync(join(ROOT, 'backend/config/env.js'), 'utf8');
    expect(envSource).toMatch(/ALLOW_DEMO_AUTH/);
    // No default — absent means off.
    expect(envSource).not.toMatch(/ALLOW_DEMO_AUTH[^\n]*default\(true\)/);
  });

  it('says so loudly when it is on', () => {
    expect(server).toMatch(/ALLOW_DEMO_AUTH is on/);
  });
});
