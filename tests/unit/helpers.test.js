import { describe, test, expect } from 'vitest';
import { esc } from '../../shared/esc.js';
import { classifyIntent } from '../../backend/assistantService.js';

/* ------------------------------------------------------------------ */
/*  Helpers for testing (source-of-truth lives in backend)            */
/* ------------------------------------------------------------------ */

function statusBadge(status) {
  const map = {
    'Active': 'success', 'Approved': 'success', 'Verified': 'success',
    'Resolved': 'success', 'Closed': 'success', 'Effective': 'success',
    'Done': 'success',
    'Expiring Soon': 'warning', 'In Progress': 'warning',
    'Pending Review': 'warning', 'Under Review': 'warning',
    'Partially Effective': 'warning', 'Scheduled': 'info',
    'Needs Improvement': 'warning',
    'Expired': 'danger', 'Overdue': 'danger', 'Open': 'neutral',
    'Critical': 'danger', 'High': 'danger', 'Medium': 'warning',
    'Low': 'success', 'Findings Open': 'warning',
    'On Leave': 'neutral', 'Revoked': 'danger',
  };
  const cls = map[status] || 'neutral';
  return `<span class="badge badge-${cls}"><span class="badge-dot"></span>${status}</span>`;
}

/* ================================================================== */
/*  esc() — HTML escaping                                              */
/* ================================================================== */

describe('esc()', () => {
  test('escapes HTML entities — & < > " \'', () => {
    expect(esc('a & b < c > d " e \' f')).toBe(
      'a &amp; b &lt; c &gt; d &quot; e &#39; f'
    );
  });

  test('handles empty string, null, undefined', () => {
    expect(esc('')).toBe('');
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(esc(0)).toBe('');
    expect(esc(false)).toBe('');
  });

  test('handles XSS payloads — script injection', () => {
    const payload = '<script>alert("xss")</script>';
    expect(esc(payload)).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  test('handles nested HTML tags', () => {
    expect(esc('<div onclick="alert(1)">click</div>')).toBe(
      '&lt;div onclick=&quot;alert(1)&quot;&gt;click&lt;/div&gt;'
    );
  });

  test('passes through safe strings unchanged', () => {
    expect(esc('hello world')).toBe('hello world');
    expect(esc('file-name_v2.pdf')).toBe('file-name_v2.pdf');
    expect(esc('user@example.com')).toBe('user@example.com');
  });

  test('double-escaping is idempotent when already escaped', () => {
    const already = '&amp; &lt; &gt;';
    const double = esc(already);
    expect(double).toBe('&amp;amp; &amp;lt; &amp;gt;');
  });
});

/* ================================================================== */
/*  statusBadge()                                                      */
/* ================================================================== */

describe('statusBadge()', () => {
  test('returns correct badge class for Active status', () => {
    const badge = statusBadge('Active');
    expect(badge).toContain('badge-success');
    expect(badge).toContain('Active');
  });

  test('returns correct badge for warning states', () => {
    expect(statusBadge('In Progress')).toContain('badge-warning');
    expect(statusBadge('Expiring Soon')).toContain('badge-warning');
    expect(statusBadge('Pending Review')).toContain('badge-warning');
  });

  test('returns correct badge for danger states', () => {
    expect(statusBadge('Expired')).toContain('badge-danger');
    expect(statusBadge('Critical')).toContain('badge-danger');
    expect(statusBadge('Overdue')).toContain('badge-danger');
  });

  test('returns neutral for unknown status', () => {
    const badge = statusBadge('SomeRandomStatus');
    expect(badge).toContain('badge-neutral');
    expect(badge).toContain('SomeRandomStatus');
  });

  test('returns neutral for Open and On Leave', () => {
    expect(statusBadge('Open')).toContain('badge-neutral');
    expect(statusBadge('On Leave')).toContain('badge-neutral');
  });

  test('returns success for Low severity', () => {
    expect(statusBadge('Low')).toContain('badge-success');
  });
});

/* ================================================================== */
/*  classifyIntent()                                                   */
/* ================================================================== */

describe('classifyIntent()', () => {
  test('detects certificate intent', () => {
    expect(classifyIntent('Show me all ISO certificates')).toBe('certificates');
    expect(classifyIntent('Which certs are expiring?')).toBe('certificates');
    expect(classifyIntent('Renew PCI attestation')).toBe('certificates');
  });

  test('detects audit intent', () => {
    expect(classifyIntent('List active audits')).toBe('audits');
    expect(classifyIntent('What is the audit planning status?')).toBe('audits');
    expect(classifyIntent('Show surveillance schedule')).toBe('audits');
  });

  test('detects findings intent', () => {
    expect(classifyIntent('How many overdue findings?')).toBe('findings');
    expect(classifyIntent('Show non-conformities')).toBe('findings');
    expect(classifyIntent('CAP status report')).toBe('findings');
  });

  test('detects risk intent', () => {
    expect(classifyIntent('Analyze risk likelihood and mitigation')).toBe('risks');
    expect(classifyIntent('Show vulnerabilities with high impact')).toBe('risks');
  });

  test('detects documents intent', () => {
    expect(classifyIntent('Upload evidence file')).toBe('documents');
    expect(classifyIntent('Show policies and procedures')).toBe('documents');
  });

  test('detects organizations intent', () => {
    expect(classifyIntent('List all vendors')).toBe('organizations');
    expect(classifyIntent('Show our third-party entities')).toBe('organizations');
  });

  test('falls back to general_summary for unrelated queries', () => {
    expect(classifyIntent('What time is it?')).toBe('general_summary');
    expect(classifyIntent('Hello!')).toBe('general_summary');
    expect(classifyIntent('')).toBe('general_summary');
  });

  test('falls back to general_summary for dashboard/overview queries', () => {
    expect(classifyIntent('Dashboard overview')).toBe('general_summary');
    expect(classifyIntent('Show me the current status')).toBe('general_summary');
    expect(classifyIntent('What is the overall dashboard status?')).toBe('general_summary');
  });
});

/* ================================================================== */
/*  scope helpers — orgFilter / byIdQuery (S2-3 Super Admin scoping)  */
/* ================================================================== */

import { orgFilter, byIdQuery, escapeRegex } from '../../backend/shared/scope.js';

// Both helpers now also exclude soft-deleted records: entities are tombstoned
// with `deletedAt` instead of being removed, so every read path must filter
// them out. See backend/shared/softDelete.js.
describe('orgFilter()', () => {
  test('returns org-scoped filter for a regular tenant user', () => {
    expect(orgFilter('ORG-101')).toEqual({ orgId: 'ORG-101', deletedAt: null });
  });

  test('drops the org scope for Super Admin but still hides deleted records', () => {
    expect(orgFilter(null)).toEqual({ deletedAt: null });
  });

  test('drops the org scope when orgId is undefined but still hides deleted records', () => {
    expect(orgFilter(undefined)).toEqual({ deletedAt: null });
  });
});

describe('byIdQuery()', () => {
  test('scopes lookup by orgId for regular users', () => {
    expect(byIdQuery('ORG-101', 'abc123')).toEqual({ _id: 'abc123', orgId: 'ORG-101', deletedAt: null });
  });

  test('looks up by id across orgs for Super Admin but skips deleted records', () => {
    expect(byIdQuery(null, 'abc123')).toEqual({ _id: 'abc123', deletedAt: null });
  });

  test('looks up by id when orgId is undefined but skips deleted records', () => {
    expect(byIdQuery(undefined, 'abc123')).toEqual({ _id: 'abc123', deletedAt: null });
  });
});

describe('escapeRegex()', () => {
  test('escapes special regex characters', () => {
    expect(escapeRegex('abc.def*ghi+jkl?mno^pqr$stu(vwx)yz[123]')).toBe('abc\\.def\\*ghi\\+jkl\\?mno\\^pqr\\$stu\\(vwx\\)yz\\[123\\]');
    expect(escapeRegex('a-b/c\\d')).toBe('a\\-b\\/c\\\\d');
  });

  test('handles empty or null string', () => {
    expect(escapeRegex('')).toBe('');
    expect(escapeRegex(null)).toBe('');
    expect(escapeRegex(undefined)).toBe('');
  });
});

