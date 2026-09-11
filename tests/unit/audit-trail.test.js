import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import AuditLog from '../../backend/modules/auditlogs/auditlog.model.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODULES = join(ROOT, 'backend/modules');

/**
 * An audit platform whose own records can be edited or removed without trace
 * has no evidentiary value. These tests pin the two properties that give the
 * trail its weight: it is written, and it cannot be rewritten.
 */
describe('audit log immutability', () => {
  it('rejects saving changes to an existing entry', async () => {
    const entry = new AuditLog({
      orgId: 'ORG-101', action: 'create', entity: 'Finding', entityId: 'f1',
    });
    entry.isNew = false;
    await expect(entry.save()).rejects.toThrow(/append-only/i);
  });

  it('blocks every query-level mutation and delete path', () => {
    const blocked = [
      'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne',
      'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove',
    ];
    for (const op of blocked) {
      const hooks = AuditLog.schema.s.hooks._pres.get(op) || [];
      expect(hooks.length, `${op} has no guard`).toBeGreaterThan(0);
    }
  });

  it('is not a capped collection (capped silently discards the oldest history)', () => {
    expect(AuditLog.schema.options.capped).toBeFalsy();
  });

  it('records who acted, not just what changed', () => {
    ['actorId', 'actorName', 'actorRole', 'timestamp'].forEach(path => {
      expect(AuditLog.schema.path(path), `missing ${path}`).toBeDefined();
    });
  });
});

describe('audit trail coverage', () => {
  const auditedModules = [
    'audits', 'findings', 'capa', 'evidence', 'risks', 'controls',
    'documents', 'certificates', 'organizations', 'vendors', 'frameworks', 'comments',
  ];

  it.each(auditedModules)('%s router records mutations', (moduleName) => {
    const dir = join(MODULES, moduleName);
    const routeFile = readdirSync(dir).find(f => f.endsWith('.routes.js'));
    const source = readFileSync(join(dir, routeFile), 'utf8');
    expect(source).toMatch(/router\.use\(auditTrail\('/);
  });

  it('redacts secrets before they reach the trail', () => {
    const source = readFileSync(join(ROOT, 'backend/shared/auditTrail.js'), 'utf8');
    ['password', 'refreshToken'].forEach(k => expect(source).toContain(k));
    expect(source).toMatch(/\[redacted\]/);
  });

  it('is registered as an API route', () => {
    expect(existsSync(join(MODULES, 'auditlogs/auditlog.routes.js'))).toBe(true);
    const server = readFileSync(join(ROOT, 'server.js'), 'utf8');
    expect(server).toMatch(/auditlogs/);
  });
});
