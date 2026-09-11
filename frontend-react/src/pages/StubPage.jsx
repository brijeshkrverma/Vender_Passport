const STUB_INFO = {
  'Audit Program': { api: '/api/audits', desc: 'Define audit objectives, procedures, and control mappings for each engagement.' },
  'Auditor Workspace': { api: '/api/audits', desc: 'Three-panel question navigation and response capture interface.' },
  'Question Bank': { api: '/api/questionnaires', desc: 'Reusable question library across frameworks.' },
  'Scoring Engine': { api: '/api/questionnaire-submissions/:id/score', desc: 'Rule-driven scoring with a shown working.' },
  'Sampling Engine': { api: '/api/sampling', desc: 'Statistical sampling with AQL tables and confidence levels.' },
  'Self Assessment': { api: '/api/questionnaire-submissions', desc: 'Simplified auditee-facing questionnaire for readiness checks.' },
  'Management Response': { api: '/api/findings', desc: 'Management acknowledgment and response to audit findings.' },
  'Risk Heatmap': { api: '/api/risks', desc: '5×5 interactive risk matrix with likelihood vs impact.' },
  'Control Testing': { api: '/api/controls', desc: 'Test procedures with objectives, sample sizes, and exceptions.' },
  'Traceability Chain': { api: '/api/controls', desc: 'End-to-end traceability from requirement → control → test → finding.' },
  'Issue Escalation': { api: '/api/findings', desc: 'Escalation workflow with severity-based routing.' },
  'Exceptions & Waivers': { api: '/api/findings', desc: 'Track approved exceptions to control requirements.' },
  'Framework Taxonomy': { api: '/api/frameworks', desc: '16 frameworks across Standards, Regulations, and Professional categories.' },
  'Framework Version Diff': { api: '/api/frameworks', desc: 'Compare standard versions — see what changed in ISO 27001:2022 vs 2013.' },
  'Document Exchange': { api: '/api/documents', desc: 'Securely share documents with vendors and partners.' },
  'ESG & BRSR': { api: '/api/evidence', desc: 'Environmental, Social, Governance metrics with BRSR Core reporting.' },
  'Report Scheduler': { api: '/api/reports', desc: 'Schedule recurring reports — PDF, Excel, email delivery.' },
  'Risk-Based Scheduler': { api: '/api/risks', desc: 'Auto-generate audit calendar based on risk scores.' },
  'SLA Dashboard': { api: '/api/ccm', desc: 'Service level monitoring for audit and compliance workflows.' },
  'Audit Cost': { api: '/api/audits', desc: 'Track audit costs — internal hours, external fees, travel.' },
  'Org Comparison': { api: '/api/organizations', desc: 'Side-by-side compliance and risk comparison across organizations.' },
  'Org Hierarchy': { api: '/api/organizations', desc: 'Parent-child org relationships for enterprise structures.' },
  'Auditors': { api: '/api/users', desc: 'Internal and external auditor directory with expertise and workload.' },
  'Three Lines Model': { api: '/api/organizations', desc: 'IIA Three Lines of Defense governance framework.' },
  'Competency Matrix': { api: '/api/users', desc: 'Auditor competency tracking — certifications, training, experience.' },
  'Doc Versions': { api: '/api/documents', desc: 'Full version history with diff tracking for policies and procedures.' },
  'Policy Lifecycle': { api: '/api/documents', desc: 'Policy creation → review → approval → attestation workflow.' },
  'Permission Matrix': { api: '/api/users', desc: 'Role-to-permission mapping across all 12 roles and 16 permissions.' },
  'Notifications': { api: '/api/notifications', desc: 'In-app and email notifications for expiring certs, overdue findings.' },
  'Expiry Alerts': { api: '/api/certificates', desc: '90/30/7 day certificate expiry alerts with renewal workflow.' },
  'Audit Trail': { api: '/api/findings', desc: 'Immutable audit log — every change tracked with who, what, when.' },
  'Webhooks': { api: '/api/integrations', desc: 'Real-time webhooks for audit events — Slack, email, ERP systems.' },
  'My Passport': { api: '/api/certificates', desc: 'Shareable verified vendor profile — certificates, compliance score, audits.' },
  'My Tasks & Deadlines': { api: '/api/audits', desc: 'Personal task dashboard — upcoming deadlines across your assigned audits.' },
  'Role Dashboard': { api: '/api/users', desc: 'Role-specific KPI dashboard showing metrics relevant to each role.' },
};

export default function StubPage({ title, api }) {
  const info = STUB_INFO[title] || { api, desc: 'This feature is coming soon.' };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">{info.desc}</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-warning-bg text-warning flex items-center justify-center text-sm font-semibold">!!</div>
          <div>
            <div className="text-sm font-semibold">In Development</div>
            <div className="text-xs text-[#6C7280]">This module is not built yet.</div>
          </div>
        </div>

        <div className="text-sm text-[#6C7280]">
          The page you're viewing is a placeholder. It will be connected to a live backend before release.
        </div>

        {info.api && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[11px] uppercase tracking-wider text-[#9CA0A8] font-semibold mb-2">Planned integration</div>
            <div className="text-sm font-mono text-[#6C7280]">{info.api}</div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-[11px] uppercase tracking-wider text-[#9CA0A8] font-semibold mb-2">What will be here</div>
          <p className="text-sm text-[#6C7280]">{info.desc}</p>
        </div>
      </div>
    </div>
  );
}
