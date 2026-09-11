import { SampleDataBanner } from '../components/DataStateNotice';
const MOCK_REGULATIONS = [
  {
    name: 'DPDP Act 2023',
    effectiveDate: '2024-08-15',
    impact: 'High',
    summary: "India's Digital Personal Data Protection Act mandates consent management, data fiduciary obligations, and breach notification within 72 hours.",
    affectedControls: ['DP-01', 'DP-02', 'DP-05', 'BR-03'],
    status: 'Active',
  },
  {
    name: 'ISO 27001:2022',
    effectiveDate: '2025-10-31',
    impact: 'Medium',
    summary: 'Updated information security management standard with 93 controls across 4 themes. Transition deadline for certified organizations.',
    affectedControls: ['IS-04', 'IS-07', 'IS-11', 'CT-02', 'CT-06'],
    status: 'Draft',
  },
  {
    name: 'PCI DSS v4.0',
    effectiveDate: '2025-03-31',
    impact: 'High',
    summary: 'Major update introducing customized approach, targeted risk analysis, and new requirements for multi-factor authentication and e-commerce security.',
    affectedControls: ['PC-01', 'PC-03', 'PC-07', 'PC-09', 'NW-02'],
    status: 'Implemented',
  },
  {
    name: 'GDPR Updates',
    effectiveDate: '2024-12-01',
    impact: 'Medium',
    summary: 'EU General Data Protection Regulation amendments covering AI processing, data transfer mechanisms, and enhanced supervisory authority powers.',
    affectedControls: ['DP-03', 'DP-04', 'DP-08'],
    status: 'Active',
  },
];

const IMPACT_COLORS = {
  'High': 'badge-danger',
  'Medium': 'badge-warning',
  'Low': 'badge-success',
};

const STATUS_COLORS = {
  'Active': 'badge-info',
  'Draft': 'badge-neutral',
  'Implemented': 'badge-success',
};

const STATUS_ORDER = ['Active', 'Draft', 'Implemented'];

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

export default function RegulatoryChanges() {
  const sorted = [...MOCK_REGULATIONS].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));

  return (
    <div className="space-y-4">
      <SampleDataBanner feature="Regulatory Changes" />
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Regulatory Changes</h1>
        <p className="text-sm text-gray-500">Track and manage regulatory updates impacting your compliance posture</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Regulations" value={MOCK_REGULATIONS.filter(r => r.status === 'Active').length} icon="⚖" color="bg-info-bg text-info" />
        <StatCard label="High Impact" value={MOCK_REGULATIONS.filter(r => r.impact === 'High').length} icon="▲" color="bg-danger-bg text-danger" />
        <StatCard label="Implemented" value={MOCK_REGULATIONS.filter(r => r.status === 'Implemented').length} icon="✓" color="bg-success-bg text-success" />
        <StatCard label="Affected Controls" value={MOCK_REGULATIONS.reduce((s, r) => s + r.affectedControls.length, 0)} icon="⬡" color="bg-violet-bg text-violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sorted.map((reg) => (
          <div key={reg.name} className="bg-surface border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink-900">{reg.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`badge ${IMPACT_COLORS[reg.impact]}`}>{reg.impact} Impact</span>
                <span className={`badge ${STATUS_COLORS[reg.status]}`}>{reg.status}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed mb-4">{reg.summary}</p>

            <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
              <span>
                Effective: <span className="text-ink-900 font-medium">{fmtDate(reg.effectiveDate)}</span>
              </span>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Affected Controls</h4>
              <div className="flex gap-1.5 flex-wrap">
                {reg.affectedControls.map((ctrl) => (
                  <span key={ctrl} className="text-[10px] font-mono bg-paper border border-border px-2 py-0.5 rounded text-ink-700">{ctrl}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
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
