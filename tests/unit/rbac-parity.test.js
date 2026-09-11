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
function backendRoles(moduleName, routeFile) {
  const source = readFileSync(join(ROOT, 'backend/modules', moduleName, routeFile), 'utf8');
  const useLine = /router\.use\([^;]*restrictTo\(([^)]*)\)/s.exec(source);
  if (!useLine) return null;
  return [...useLine[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
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

const MODULES = [
  ['capa', 'capa.routes.js'],
  ['risks', 'risk.routes.js'],
  ['vendors', 'vendor.routes.js'],
  ['organizations', 'org.routes.js'],
  ['settings', 'settings.routes.js'],
  ['audits', 'audit.routes.js'],
  ['findings', 'finding.routes.js'],
  ['controls', 'control.routes.js'],

  
  

describe('frontend nav permissions mirror backend RBAC', () => {
  it.each(MODULES)('%s', (moduleName, routeFile) => {
    const backend = backendRoles(moduleName, routeFile);
    const frontend = frontendRoles(moduleName);
    expect(backend, `no restrictTo found in ${routeFile}`).not.toBeNull();
    expect(frontend, `${moduleName} missing from API_MODULE_ROLES`).toBeDefined();
    expect(frontend).toEqual(backend);
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
