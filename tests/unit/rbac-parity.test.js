import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * The sidebar must never advertise a page the API will refuse. Nav visibility
 * is derived from API_MODULE_ROLES in AuthContext.jsx, which mirrors the
 * restrictTo(...) list of each backend router. This test fails the moment the
 * two drift — which is how "CA / Consultant sees CAPA, then gets a 403"
 * shipped in the first place.
 */

/**
 * Pull the role list out of a router's top-level restrictTo(...) call.
 *
 * Matches restrictTo wherever it sits in the router.use(...) argument list —
 * middleware order varies between modules (some insert tenantIsolation before
 * it), and the parity check must not depend on that.
 */
/** The roles `requireAdmin` stands for, read from the middleware itself. */
function adminRoles() {
  const source = readFileSync(join(ROOT, 'backend/middleware/rbac.js'), 'utf8');
  const fn = /function requireAdmin[\s\S]*?requireRole\(([^)]*)\)/.exec(source);
  return [...fn[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
}

function backendRoles(routeFile) {
  // Path includes the directory: `questionnaireSubmissions` is served out of
  // the `questionnaires` folder, so the module name is not the folder name.
  const source = readFileSync(join(ROOT, 'backend/modules', routeFile), 'utf8');

  // `requireAdmin` is a named shorthand for a restrictTo list; `/api/users`
  // uses it instead of spelling the two roles out.
  if (/router\.use\([^;]*requireAdmin/s.test(source)) return adminRoles();

  /*
   * Accept the guard wherever it is applied.
   *
   * Most routers put it in `router.use(...)`. `reports` passes it per route as
   * `restrictTo(...reportRoles)`, spreading a const declared above — there are
   * no string literals at the call site at all, which is why this used to read
   * as "no guard found".
   */
  const call = /restrictTo\(([^)]*)\)/.exec(source);
  if (!call) return null;

  const spread = /^\s*\.\.\.(\w+)\s*$/.exec(call[1]);
  const listSource = spread
    ? (new RegExp(`${spread[1]}\\s*=\\s*\\[([^\\]]*)\\]`).exec(source) || [, ''])[1]
    : call[1];

  const roles = [...listSource.matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
  return roles.length ? roles : null;
}

/**
 * A guard in `router.use(...)` covers every route, including the one added next
 * year. A guard repeated on each route is one someone can forget — so if a
 * router chose that style, every route in it has to carry it.
 */
function unguardedRoutes(routeFile) {
  const source = readFileSync(join(ROOT, 'backend/modules', routeFile), 'utf8');
  if (/router\.use\([^;]*(restrictTo|requireAdmin)/s.test(source)) return [];
  return source
    .split('\n')
    .filter((l) => /^\s*router\.(get|post|put|patch|delete)\(/.test(l))
    .filter((l) => !/restrictTo|requireAdmin|requireAuditor/.test(l))
    .map((l) => l.trim());
}

/** Pull one entry out of the frontend API_MODULE_ROLES map. */
function frontendRoles(moduleName) {
  const source = readFileSync(join(ROOT, 'frontend-react/src/context/AuthContext.jsx'), 'utf8');
  const map = source.slice(
    source.indexOf('export const API_MODULE_ROLES'),
    source.indexOf('export const NAV_ITEM_MODULE')
  );
  const line = new RegExp(`\\b${moduleName}:\\s*(ALL|\\[[^\\]]*\\])`).exec(map);
  if (!line) return undefined;
  if (line[1] === 'ALL') return 'ALL';
  return [...line[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
}

/**
 * Every module the nav map claims to know about, and the router that decides it.
 *
 * The list was left unfinished — an unterminated array, which made this whole
 * file a syntax error, which meant it never ran at all. A guard that does not
 * run is worse than no guard: `capa` and `organizations` were both fixed after
 * shipping a 403-on-click, and nothing was watching for the next one.
 */
const MODULES = [
  ['capa', 'capa/capa.routes.js'],
  ['risks', 'risks/risk.routes.js'],
  ['vendors', 'vendors/vendor.routes.js'],
  ['organizations', 'organizations/org.routes.js'],
  ['settings', 'settings/settings.routes.js'],
  ['audits', 'audits/audit.routes.js'],
  ['findings', 'findings/finding.routes.js'],
  ['controls', 'controls/control.routes.js'],
  ['ccm', 'ccm/ccm.routes.js'],
  ['auditlogs', 'auditlogs/auditlog.routes.js'],
  ['reports', 'reports/report.routes.js'],
  // The questionnaire pair. Answering reaches further than authoring, so these
  // two lists are deliberately different and both have to be checked.
  ['questionnaires', 'questionnaires/questionnaire.routes.js'],
  ['questionnaireSubmissions', 'questionnaires/submission.routes.js'],
  ['users', 'users/user.routes.js'],
];

/** Modules the nav map marks `ALL` — every authenticated role may use them. */
const OPEN_MODULES = [
  ['evidence', 'evidence/evidence.routes.js'],
  ['documents', 'documents/doc.routes.js'],
  ['certificates', 'certificates/cert.routes.js'],
  ['frameworks', 'frameworks/framework.routes.js'],
  ['notifications', 'notifications/notification.routes.js'],
];

/** Every role the platform has, from the backend's single source. */
function allRoles() {
  const source = readFileSync(join(ROOT, 'backend/shared/roles.js'), 'utf8');
  const block = /const ALL_ROLES = \[([\s\S]*?)\]/.exec(source);
  return [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
}

describe('frontend nav permissions mirror backend RBAC', () => {
  it.each(MODULES)('%s', (moduleName, routeFile) => {
    const backend = backendRoles(routeFile);
    const frontend = frontendRoles(moduleName);
    expect(backend, `no restrictTo found in ${routeFile}`).not.toBeNull();
    expect(frontend, `${moduleName} missing from API_MODULE_ROLES`).toBeDefined();
    expect(frontend).toEqual(backend);
  });

  /**
   * `ALL` in the nav map is a claim about the server: anyone signed in may use
   * this module. If the router actually restricts it, the nav shows the item to
   * roles that will be refused — the same 403-on-click as a mismatched list,
   * just written a different way.
   */
  it.each(OPEN_MODULES)('%s is marked ALL and really is open to every role', (moduleName, routeFile) => {
    expect(frontendRoles(moduleName), `${moduleName} is not ALL in API_MODULE_ROLES`).toBe('ALL');
    const backend = backendRoles(routeFile);
    if (backend === null) return;            // no restrictTo at all: genuinely open
    expect(backend).toEqual(allRoles());
  });

  it.each([...MODULES, ...OPEN_MODULES])('%s guards every one of its routes', (_name, routeFile) => {
    const unguarded = unguardedRoutes(routeFile);
    expect(unguarded, `${routeFile} applies its role guard per route, and these have none:\n${unguarded.join('\n')}`)
      .toEqual([]);
  });

  /**
   * A role's `allowed` list is a claim that these pages are useful to it. An
   * entry the API refuses is not a useful page — it is a 403 waiting for
   * someone to remove the intersection that currently hides it.
   *
   * Four of these were sitting in the file (Risk Manager → organizations,
   * settings; Document Manager → settings, reports), invisible because
   * `isNavVisibleForRole` intersects the two lists. They read as intent, which
   * is exactly how one gets "restored" into a menu that then fails on click.
   */
  it('no role is offered a page its API would refuse', () => {
    const source = readFileSync(join(ROOT, 'frontend-react/src/context/AuthContext.jsx'), 'utf8');

    const apiBlock = source.slice(
      source.indexOf('export const API_MODULE_ROLES'), source.indexOf('export const NAV_ITEM_MODULE'));
    const navBlock = source.slice(
      source.indexOf('export const NAV_ITEM_MODULE'), source.indexOf('export function isApiAllowedForRole'));
    const routesBlock = source.slice(
      source.indexOf('const ROLE_ROUTES'), source.indexOf('export const API_MODULE_ROLES'));

    const apiRoles = {};
    for (const m of apiBlock.matchAll(/^\s{2}(\w+):\s*(ALL|\[[^\]]*\])/gm)) {
      apiRoles[m[1]] = m[2] === 'ALL' ? 'ALL' : [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    }

    const navModule = {};
    for (const m of navBlock.matchAll(/'?([\w-]+)'?:\s*'(\w+)'/g)) navModule[m[1]] = m[2];

    const dead = [];
    for (const m of routesBlock.matchAll(/'([^']+)':\s*\{([^}]*)\}/g)) {
      const role = m[1];
      const allowed = /allowed:\s*\[([^\]]*)\]/.exec(m[2]);
      if (!allowed) continue;
      for (const item of [...allowed[1].matchAll(/'([^']+)'/g)].map((x) => x[1])) {
        const mod = navModule[item];
        const roles = mod && apiRoles[mod];
        if (roles && roles !== 'ALL' && !roles.includes(role)) {
          dead.push(`${role} → ${item} (/api/${mod} refuses it)`);
        }
      }
    }

    expect(dead, `these nav entries would 403 on click:\n${dead.join('\n')}`).toEqual([]);
  });

  it('checks every module the nav map declares', () => {
    const source = readFileSync(join(ROOT, 'frontend-react/src/context/AuthContext.jsx'), 'utf8');
    const map = source.slice(
      source.indexOf('export const API_MODULE_ROLES'),
      source.indexOf('export const NAV_ITEM_MODULE')
    );
    const declared = [...map.matchAll(/^\s{2}(\w+):/gm)].map(m => m[1]);
    const covered = new Set([...MODULES, ...OPEN_MODULES].map(([name]) => name));
    const missing = declared.filter(name => !covered.has(name));
    expect(missing, `these modules are in API_MODULE_ROLES but not checked here: ${missing.join(', ')}`)
      .toEqual([]);
  });

  it('does not advertise CAPA to CA / Consultant', () => {
    const source = readFileSync(join(ROOT, 'frontend-react/src/context/AuthContext.jsx'), 'utf8');
    const caEntry = /'CA \/ Consultant':\s*\{\s*allowed:\s*\[([^\]]*)\]/.exec(source);
    expect(caEntry).not.toBeNull();
    expect(caEntry[1]).not.toMatch(/'capa'/);
  });

  it('gates nav on the API permission, not only the product list', () => {
    const source = readFileSync(join(ROOT, 'frontend-react/src/context/AuthContext.jsx'), 'utf8');
    const fn = source.slice(source.indexOf('export function isNavVisibleForRole'));
    expect(fn).toMatch(/isApiAllowedForRole\(role, itemId\)/);
  });
});
