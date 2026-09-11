import { SampleDataBanner } from '../components/DataStateNotice';
const MOCK_CLIENTS = [
  { id: 1, name: 'FinSecure Bank', engagement: 'IS Audit', compliance: 94, risk: 'Low', deadline: '2025-06-30' },
  { id: 2, name: 'MediCore Health', engagement: 'SOC 2 Type II', compliance: 78, risk: 'Medium', deadline: '2025-05-15' },
  { id: 3, name: 'TechNova Ltd', engagement: 'ISO 27001', compliance: 91, risk: 'Low', deadline: '2025-07-20' },
  { id: 4, name: 'PayMatrix', engagement: 'PCI DSS', compliance: 62, risk: 'High', deadline: '2025-04-30' },
  { id: 5, name: 'CloudStack Inc', engagement: 'GDPR Readiness', compliance: 85, risk: 'Low', deadline: '2025-08-01' },
  { id: 6, name: 'DataTrust Corp', engagement: 'Internal Audit', compliance: 71, risk: 'Medium', deadline: '2025-06-15' },
];

const RISK_COLORS = {
  'High': 'badge-danger',
  'Medium': 'badge-warning',
  'Low': 'badge-success',
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

function daysLeft(d) {
  const diff = Math.round((new Date(d) - new Date()) / 86400000);
  return diff;
}

function complianceBar(pct) {
  const c = Math.max(0, Math.min(100, pct || 0));
  const color = c >= 80 ? 'bg-success' : c >= 60 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${c}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-500">{c}%</span>
    </div>
  );
}

export default function ClientPortfolio() {
  const activeClients = MOCK_CLIENTS.length;
  const avgCompliance = Math.round(MOCK_CLIENTS.reduce((s, c) => s + c.compliance, 0) / MOCK_CLIENTS.length);
  const highRisk = MOCK_CLIENTS.filter(c => c.risk === 'High').length;
  const underEngagement = MOCK_CLIENTS.filter(c => {
    const d = daysLeft(c.deadline);
    return d > 0 && d <= 60;
  }).length;

  return (
    <div className="space-y-4">
      <SampleDataBanner feature="Client Portfolio" />
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Client Portfolio</h1>
        <p className="text-sm text-gray-500">Multi-client view for your CA practice</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Clients" value={activeClients} icon="◒" color="bg-info-bg text-info" />
        <StatCard label="Avg Compliance" value={`${avgCompliance}%`} icon="⬡" color="bg-success-bg text-success" />
        <StatCard label="High Risk" value={highRisk} icon="▲" color="bg-danger-bg text-danger" />
        <StatCard label="Active Engagement" value={underEngagement} icon="◷" color="bg-warning-bg text-warning" />
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-paper/50 text-gray-500">
              <th className="text-left px-4 py-3 font-medium">Client Name</th>
              <th className="text-left px-4 py-3 font-medium">Engagement Type</th>
              <th className="text-left px-4 py-3 font-medium">Compliance</th>
              <th className="text-left px-4 py-3 font-medium">Risk Score</th>
              <th className="text-left px-4 py-3 font-medium">Next Deadline</th>
              <th className="text-left px-4 py-3 font-medium">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CLIENTS.map((client) => {
              const left = daysLeft(client.deadline);
              const dayColor = left < 0 ? 'text-danger' : left <= 30 ? 'text-danger font-semibold' : left <= 60 ? 'text-warning font-semibold' : 'text-gray-500';
              return (
                <tr key={client.id} className="border-b border-border/50 hover:bg-paper transition-colors">
                  <td className="px-4 py-3 text-ink-900 font-medium">{client.name}</td>
                  <td className="px-4 py-3 text-gray-500">{client.engagement}</td>
                  <td className="px-4 py-3">{complianceBar(client.compliance)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${RISK_COLORS[client.risk]}`}>{client.risk}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(client.deadline)}</td>
                  <td className={`px-4 py-3 ${dayColor}`}>
                    {left < 0 ? 'Overdue' : `${left}d`}
                  </td>
                </tr>
              );
            })}
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
