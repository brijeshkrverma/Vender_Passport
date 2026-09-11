const Certificate = require('./modules/certificates/cert.model');
const Audit = require('./modules/audits/audit.model');
const Finding = require('./modules/findings/finding.model');
const Risk = require('./modules/risks/risk.model');
const Document = require('./modules/documents/doc.model');
const Organization = require('./modules/organizations/org.model');
const { orgFilter } = require('./shared/scope');

const INTENT_PATTERNS = [
  { domain: 'certificates', keywords: ['certificate', 'certification', 'cert', 'iso', 'soc', 'pci', 'expir', 'renew', 'license', 'attestation', 'accredit'] },
  { domain: 'audits', keywords: ['audit', 'assessment', 'surveillance', 'readiness', 'planning', 'scoping', 'lifecycle', 'auditor'] },
  { domain: 'findings', keywords: ['finding', 'non-conform', 'nonconform', 'cap', 'corrective', 'remediation', 'penetration test', 'overdue'] },
  { domain: 'risks', keywords: ['risk', 'threat', 'vulnerability', 'likelihood', 'impact', 'mitigation', 'residual risk'] },
  { domain: 'documents', keywords: ['document', 'doc', 'policy', 'procedure', 'evidence', 'artifact', 'attach', 'upload', 'file'] },
  { domain: 'organizations', keywords: ['organization', 'vendor', 'supplier', 'partner', 'org', 'company', 'entity', 'third party', 'third-party'] },
  { domain: 'general_summary', keywords: ['summary', 'overview', 'dashboard', 'status', 'how many'] },
];

const QUESTION_REGEX = /\b(what is|what are|what does|whats|define|explain)\b/i;

const DEFINITIONS = {
  audits: 'An <strong>audit</strong> is a systematic, independent examination of records, processes, or systems against defined criteria. In this platform audits progress through a lifecycle from Planning through Execution to Closed.',
  findings: 'An <strong>audit finding</strong> is a gap, non-conformity, or observation identified during an audit. Findings are tracked with severity, owner, and due date until remediated and closed.',
  certificates: 'A <strong>certificate</strong> is a formal attestation that an organization or system meets a standard such as ISO 27001, SOC 2, or PCI DSS. Certificates carry an expiry date and verification status.',
  risks: 'A <strong>risk</strong> is the potential for an event to impact objectives, expressed through likelihood, impact, and inherent versus residual levels. Risks are categorized and mitigated through controls.',
  documents: 'A <strong>document</strong> is a controlled record such as a policy, procedure, certificate copy, or audit evidence, tracked with version, owner, expiry, and approval status.',
  organizations: 'An <strong>organization</strong> record represents an entity you work with — your own organization, a supplier, vendor, partner, or client — tracked with compliance, risk, audit, certificate, and document counts.',
  general_summary: 'Here is a snapshot of your compliance posture.',
};

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function daysLeft(d) {
  if (!d) return null;
  return Math.round((new Date(d) - new Date()) / 86400000);
}

function statusCounts(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key] || 'Unknown';
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.entries(counts).map(([s, n]) => `${esc(s)}: ${n}`).join(', ') || 'none';
}

function classifyIntent(message) {
  const lower = String(message || '').toLowerCase();
  for (const pattern of INTENT_PATTERNS) {
    for (const kw of pattern.keywords) {
      if (lower.includes(kw)) return pattern.domain;
    }
  }
  return 'general_summary';
}

async function handleCertificates(message, orgId, orgName) {
  const certs = await Certificate.find(orgFilter(orgId)).sort({ expiry: 1 }).limit(25).lean();
  const total = certs.length;
  const statusLine = statusCounts(certs, 'status');
  let html = `<strong>Certificates</strong> — ${total} tracked for ${esc(orgName)} (${statusLine}).`;

  const attention = certs.filter(c => c.status === 'Expiring Soon' || c.status === 'Expired' || daysLeft(c.expiry) <= 90);
  if (attention.length) {
    html += '<br/><br/><strong>Action needed:</strong><ul>' +
      attention.slice(0, 8).map(c => `<li>${esc(c.name)} — <em>${esc(c.status)}</em>${daysLeft(c.expiry) !== null ? ` (${daysLeft(c.expiry)} days left)` : ''}</li>`).join('') +
      '</ul>';
  } else {
    html += '<br/><br/>No certificates are expiring soon or expired.';
  }

  return { html, refs: certs.slice(0, 5).map(c => String(c._id)), total };
}

async function handleAudits(message, orgId, orgName) {
  const audits = await Audit.find(orgFilter(orgId)).sort({ due: 1 }).limit(20).lean();
  const total = audits.length;
  const statusLine = statusCounts(audits, 'status');
  let html = `<strong>Audits</strong> — ${total} for ${esc(orgName)} (${statusLine}).`;

  const open = audits.filter(a => a.status !== 'Closed');
  if (open.length) {
    html += '<br/><br/><strong>Active audits:</strong><ul>' +
      open.slice(0, 10).map(a => `<li>${esc(a.title)} — <em>${esc(a.status)}</em>${a.type ? ` (${esc(a.type)})` : ''}${a.due ? `, due ${fmtDate(a.due)}` : ''}</li>`).join('') +
      '</ul>';
  } else {
    html += '<br/><br/>No open audits.';
  }

  return { html, refs: audits.slice(0, 5).map(a => String(a._id)), total };
}

async function handleFindings(message, orgId, orgName) {
  const findings = await Finding.find(orgFilter(orgId)).sort({ due: 1 }).limit(20).lean();
  const total = findings.length;
  const statusLine = statusCounts(findings, 'status');
  let html = `<strong>Findings</strong> — ${total} for ${esc(orgName)} (${statusLine}).`;

  const open = findings.filter(f => ['Open', 'Overdue', 'Acknowledged', 'In Progress', 'Reopened'].includes(f.status));
  const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  open.sort((a, b) => (rank[a.severity] ?? 4) - (rank[b.severity] ?? 4));
  if (open.length) {
    html += '<br/><br/><strong>Open findings:</strong><ul>' +
      open.slice(0, 10).map(f => `<li>${esc(f.title)} — <em>${esc(f.severity)}</em>, <em>${esc(f.status)}</em>${f.owner ? ` (${esc(f.owner)})` : ''}${f.due ? `, due ${fmtDate(f.due)}` : ''}</li>`).join('') +
      '</ul>';
  } else {
    html += '<br/><br/>No open findings.';
  }

  return { html, refs: findings.slice(0, 5).map(f => String(f._id)), total };
}

async function handleRisks(message, orgId, orgName) {
  const risks = await Risk.find(orgFilter(orgId)).sort({ residual: 1 }).limit(20).lean();
  const total = risks.length;
  const statusLine = statusCounts(risks, 'residual');
  let html = `<strong>Risks</strong> — ${total} for ${esc(orgName)} (residual: ${statusLine}).`;

  const high = risks.filter(r => ['High', 'Critical'].includes(r.residual));
  if (high.length) {
    html += '<br/><br/><strong>High / critical residual risk:</strong><ul>' +
      high.slice(0, 8).map(r => `<li>${esc(r.title)} — <em>${esc(r.residual)}</em>${r.category ? ` (${esc(r.category)})` : ''}${r.owner ? `, owner ${esc(r.owner)}` : ''}</li>`).join('') +
      '</ul>';
  } else {
    html += '<br/><br/>No high or critical residual risks.';
  }

  return { html, refs: risks.slice(0, 5).map(r => String(r._id)), total };
}

async function handleDocuments(message, orgId, orgName) {
  const docs = await Document.find(orgFilter(orgId)).sort({ createdAt: -1 }).limit(20).lean();
  const total = docs.length;
  const statusLine = statusCounts(docs, 'type');
  let html = `<strong>Documents</strong> — ${total} for ${esc(orgName)} (${statusLine}).`;

  if (docs.length) {
    html += '<br/><br/><strong>Recent documents:</strong><ul>' +
      docs.slice(0, 10).map(d => `<li>${esc(d.name)} — <em>${esc(d.type)}</em>, v${esc(d.version || '1.0')} (${esc(d.status)})</li>`).join('') +
      '</ul>';
  } else {
    html += '<br/><br/>No documents on record.';
  }

  return { html, refs: docs.slice(0, 5).map(d => String(d._id)), total };
}

async function handleOrganizations(message, orgId, orgName) {
  const orgs = await Organization.find(orgFilter(orgId)).lean();
  const total = orgs.length;
  const own = orgs.find(o => o.type === 'Own Organization') || orgs[0];

  let html;
  if (own) {
    html = `<strong>${esc(own.name)}</strong> (${esc(own.type)}${own.industry ? `, ${esc(own.industry)}` : ''}) — compliance ${own.compliance ?? '—'}%, risk ${own.risk ?? '—'}, ${own.activeAudits ?? 0} active audits, ${own.certs ?? 0} certificates, ${own.docs ?? 0} documents.`;

    const related = orgs.filter(o => o.type !== 'Own Organization');
    if (related.length) {
      html += '<br/><br/><strong>Related entities:</strong><ul>' +
        related.slice(0, 8).map(o => `<li>${esc(o.name)} — <em>${esc(o.type)}</em></li>`).join('') +
        '</ul>';
    } else {
      html += '<br/><br/>No supplier, vendor, or partner entity records are tracked under this tenant yet.';
    }
  } else {
    html = 'No organization records found for this tenant.';
  }

  return { html, refs: orgs.slice(0, 5).map(o => String(o._id)), total };
}

async function handleGeneral(orgId, orgName) {
  const ACTIVE_STATUSES = ['Planning', 'Scoping', 'Risk Assessment', 'Questionnaire', 'Auditor Assigned', 'Execution', 'Evidence Review', 'Findings', 'Corrective Actions', 'Verification', 'Report'];
  const OPEN_FINDING_STATUSES = ['Open', 'Overdue', 'Acknowledged', 'In Progress', 'Reopened'];
  const HIGH_RISKS = ['High', 'Critical'];
  const ATTENTION_CERTS = ['Expiring Soon', 'Expired'];

  const [audits, findings, risks, certs, docs, org] = await Promise.all([
    Audit.find(orgFilter(orgId)).lean(),
    Finding.find(orgFilter(orgId)).lean(),
    Risk.find(orgFilter(orgId)).lean(),
    Certificate.find(orgFilter(orgId)).lean(),
    Document.find(orgFilter(orgId)).lean(),
    Organization.findOne(orgFilter(orgId)).lean(),
  ]);

  const total = audits.length + findings.length + risks.length + certs.length + docs.length;
  const auditsActive = audits.filter(a => ACTIVE_STATUSES.includes(a.status)).length;
  const findingsOpen = findings.filter(f => OPEN_FINDING_STATUSES.includes(f.status)).length;
  const risksHigh = risks.filter(r => HIGH_RISKS.includes(r.residual)).length;
  const certsAttention = certs.filter(c => ATTENTION_CERTS.includes(c.status)).length;

  const html = `<strong>${esc(orgName)} — Compliance Overview</strong><br/>` +
    `Compliance score: <strong>${org?.compliance ?? '—'}%</strong>, risk score: <strong>${org?.risk ?? '—'}</strong>.<br/><br/>` +
    `<strong>${audits.length}</strong> audits (${auditsActive} active) &middot; <strong>${findings.length}</strong> findings (${findingsOpen} open) &middot; ` +
    `<strong>${risks.length}</strong> risks (${risksHigh} high residual) &middot; <strong>${certs.length}</strong> certificates (${certsAttention} expiring/expired) &middot; <strong>${docs.length}</strong> documents.`;

  return { html, refs: [], total };
}

async function processQuery(message, user, models, conversation) {
  const orgId = user?.scopeOrgId !== undefined ? user.scopeOrgId : user?.orgId;
  const orgName = user?.orgName || 'your organization';
  const intent = classifyIntent(message);
  const scopeNote = `Scoped to ${orgName}`;

  try {
    let result;
    switch (intent) {
      case 'certificates': result = await handleCertificates(message, orgId, orgName); break;
      case 'audits': result = await handleAudits(message, orgId, orgName); break;
      case 'findings': result = await handleFindings(message, orgId, orgName); break;
      case 'risks': result = await handleRisks(message, orgId, orgName); break;
      case 'documents': result = await handleDocuments(message, orgId, orgName); break;
      case 'organizations': result = await handleOrganizations(message, orgId, orgName); break;
      default: result = await handleGeneral(orgId, orgName); break;
    }

    let text = result.html;
    if (QUESTION_REGEX.test(message) && DEFINITIONS[intent]) {
      text = `<p style="margin:0 0 8px">${DEFINITIONS[intent]}</p>` + text;
    }

    return { text, referencedIds: result.refs, intent, scopeNote, totalRecords: result.total };
  } catch (err) {
    return {
      text: `I ran into a problem while looking up your ${intent.replace(/_/g, ' ')} data. Please try again in a moment.`,
      referencedIds: [],
      intent,
      scopeNote,
      totalRecords: 0,
    };
  }
}

module.exports = { processQuery, classifyIntent };
