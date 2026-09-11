import { useState } from 'react';
import { SampleDataBanner } from '../components/DataStateNotice';

// Working papers API not yet available — using mock data
const MOCK_PAPERS = [
  {
    id: 1, title: 'Access Control Review', auditRef: 'AUD-2025-001', type: 'Test of Design',
    preparedBy: 'Rahul M.', date: '2025-03-15', status: 'Approved', sampleSize: 25, exceptions: 0,
    procedures: [
      'Review user access list against HR records for all active employees',
      'Verify segregation of duties for admin and privileged accounts',
      'Test password policy enforcement on 25 randomly sampled accounts',
    ],
  },
  {
    id: 2, title: 'Change Management Testing', auditRef: 'AUD-2025-002', type: 'Test of Effectiveness',
    preparedBy: 'Priya S.', date: '2025-03-20', status: 'In Review', sampleSize: 40, exceptions: 2,
    procedures: [
      'Sample 40 change requests from Q1 2025 production deployments',
      'Verify CAB approval and authorization for each sampled change',
      'Validate post-implementation reviews were completed within SLA',
    ],
  },
  {
    id: 3, title: 'Vendor Due Diligence', auditRef: 'AUD-2025-003', type: 'Inquiry',
    preparedBy: 'Amit K.', date: '2025-04-01', status: 'Draft', sampleSize: 15, exceptions: 0,
    procedures: [
      'Send due diligence questionnaires to 15 critical vendors',
      'Review vendor SOC 2 Type II reports for the last 12 months',
      'Map vendor risk tier against contractual obligations and SLAs',
    ],
  },
  {
    id: 4, title: 'Backup & Recovery Test', auditRef: 'AUD-2025-004', type: 'Re-performance',
    preparedBy: 'Sneha D.', date: '2025-04-10', status: 'Approved', sampleSize: 10, exceptions: 1,
    procedures: [
      'Restore 10 randomly selected backups to isolated staging environment',
      'Verify RTO and RPO targets are met for all restored systems',
      'Validate data integrity of restored databases via checksum comparison',
    ],
  },
  {
    id: 5, title: 'Physical Security Walkthrough', auditRef: 'AUD-2025-005', type: 'Observation',
    preparedBy: 'Vikram J.', date: '2025-04-15', status: 'In Review', sampleSize: 1, exceptions: 3,
    procedures: [
      'Inspect data center access logs for the trailing 90 days',
      'Verify CCTV coverage and retention meets policy requirements',
      'Test biometric access controls at all entry and exit points',
      'Review visitor management process and badge reconciliation',
    ],
  },
];

const TYPE_COLORS = {
  'Test of Design': 'badge-info',
  'Test of Effectiveness': 'badge-violet',
  'Inquiry': 'badge-warning',
  'Re-performance': 'badge-info',
  'Observation': 'badge-neutral',
};

const STATUS_COLORS = {
  'Approved': 'badge-success',
  'In Review': 'badge-warning',
  'Draft': 'badge-neutral',
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

export default function WorkingPapers() {
  const [expanded, setExpanded] = useState(null);

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div className="space-y-4">
      <SampleDataBanner feature="Working Papers" />
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Working Papers</h1>
        <p className="text-sm text-gray-500">Audit documentation and test procedures for all engagements</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Papers" value={MOCK_PAPERS.length} icon="▦" color="bg-info-bg text-info" />
        <StatCard label="Approved" value={MOCK_PAPERS.filter(p => p.status === 'Approved').length} icon="✓" color="bg-success-bg text-success" />
        <StatCard label="In Review" value={MOCK_PAPERS.filter(p => p.status === 'In Review').length} icon="◷" color="bg-warning-bg text-warning" />
        <StatCard label="Total Exceptions" value={MOCK_PAPERS.reduce((s, p) => s + p.exceptions, 0)} icon="▲" color="bg-danger-bg text-danger" />
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-paper/50 text-gray-500">
              <th className="text-left px-4 py-3 font-medium w-8"></th>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Audit Ref</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Prepared By</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Sample Size</th>
              <th className="text-left px-4 py-3 font-medium">Exceptions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PAPERS.map((paper) => (
              <>
                <tr
                  key={paper.id}
                  className="border-b border-border/50 hover:bg-paper cursor-pointer transition-colors"
                  onClick={() => toggle(paper.id)}
                >
                  <td className="px-4 py-3 text-gray-400">
                    <span className={`inline-block transition-transform ${expanded === paper.id ? 'rotate-90' : ''}`}>▶</span>
                  </td>
                  <td className="px-4 py-3 text-ink-900 font-medium">{paper.title}</td>
                  <td className="px-4 py-3 text-seal font-mono text-[10px]">{paper.auditRef}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${TYPE_COLORS[paper.type] || 'badge-neutral'}`}>{paper.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{paper.preparedBy}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(paper.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[paper.status] || 'badge-neutral'}`}>{paper.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-center">{paper.sampleSize}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={paper.exceptions > 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>{paper.exceptions}</span>
                  </td>
                </tr>
                {expanded === paper.id && (
                  <tr key={`exp-${paper.id}`} className="bg-paper/30">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="animate-slide-up">
                        <h4 className="text-[11px] font-semibold text-ink-900 uppercase tracking-wider mb-3">Test Procedures</h4>
                        <ol className="space-y-2 pl-4">
                          {paper.procedures.map((proc, idx) => (
                            <li key={idx} className="text-xs text-gray-600 flex items-start gap-2 list-decimal">
                              <span>{proc}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${color}`}>{icon}</div>
      <div>
        <div className="text-xl font-display font-semibold text-ink-900">{value ?? '—'}</div>
        <div className="text-[10px] text-gray-500">{label}</div>
      </div>
    </div>
  );
}
