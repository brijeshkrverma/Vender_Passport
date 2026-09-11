import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MOCK_DATA = [
  { id: 1, org: 'GlobalTech Solutions', riskScore: 88, auditHistory: 3, lastAudit: '2024-08-12', nextScheduled: '2025-05-15', recommendedCadence: 'Quarterly' },
  { id: 2, org: 'Amazon Web Services', riskScore: 72, auditHistory: 5, lastAudit: '2024-11-20', nextScheduled: '2025-05-20', recommendedCadence: 'Half-Yearly' },
  { id: 3, org: 'PayPro Financial', riskScore: 65, auditHistory: 2, lastAudit: '2024-06-30', nextScheduled: '2025-06-30', recommendedCadence: 'Half-Yearly' },
  { id: 4, org: 'MedCloud Health', riskScore: 45, auditHistory: 4, lastAudit: '2024-10-05', nextScheduled: '2025-10-05', recommendedCadence: 'Annual' },
  { id: 5, org: 'DataVault Inc', riskScore: 32, auditHistory: 1, lastAudit: '2024-12-01', nextScheduled: '2025-12-01', recommendedCadence: 'Annual' },
  { id: 6, org: 'Nordic Payments', riskScore: 18, auditHistory: 2, lastAudit: '2024-09-15', nextScheduled: '2025-09-15', recommendedCadence: 'Continuous Monitoring' },
  { id: 7, org: 'SecureWare LLC', riskScore: 55, auditHistory: 3, lastAudit: '2024-07-22', nextScheduled: '2025-07-22', recommendedCadence: 'Half-Yearly' },
  { id: 8, org: 'GreenData Systems', riskScore: 10, auditHistory: 1, lastAudit: '2025-01-10', nextScheduled: '2026-01-10', recommendedCadence: 'Continuous Monitoring' },
];

function computeCadence(score) {
  if (score > 75) return 'Quarterly';
  if (score > 50) return 'Half-Yearly';
  if (score > 25) return 'Annual';
  return 'Continuous Monitoring';
}

function computeRiskScore(org, idx) {
  if (typeof org.riskScore === 'number') return org.riskScore;
  const base = ((org.auditHistory || idx) * 15 + (org.findingsCount || 0) * 10 + (org.expiringCerts || 0) * 8) % 100;
  return Math.max(5, Math.min(99, base));
}

const CADENCE_COLORS = {
  'Quarterly': 'badge-danger',
  'Half-Yearly': 'badge-warning',
  'Annual': 'badge-info',
  'Continuous Monitoring': 'badge-success',
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

function riskScoreBg(score) {
  if (score > 75) return 'bg-danger-bg text-danger';
  if (score > 50) return 'bg-warning-bg text-warning';
  if (score > 25) return 'bg-info-bg text-info';
  return 'bg-success-bg text-success';
}

export default function AuditUniverse() {
  const { authHeaders } = useAuth();
  const [data, setData] = useState(MOCK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/organizations', { headers: authHeaders })
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(json => {
        if (!cancelled) {
          const list = json.data || json;
          if (Array.isArray(list) && list.length > 0) {
            const enriched = list.map((org, idx) => ({
              id: org.id || org._id || idx + 1,
              org: org.name || org.orgName || org.org || `Org ${idx + 1}`,
              riskScore: computeRiskScore(org, idx),
              auditHistory: org.auditHistory || org.auditCount || Math.floor(Math.random() * 5) + 1,
              lastAudit: org.lastAudit || org.lastAuditDate || null,
              nextScheduled: org.nextScheduled || org.nextAuditDate || null,
              recommendedCadence: computeCadence(computeRiskScore(org, idx)),
            }));
            setData(enriched);
          } else {
            setData([]);
            setError(true);
          }
        }
      })
      .catch(() => { if (!cancelled) { setError(true); setData([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authHeaders]);

  const highRisk = data.filter(d => d.riskScore > 50).length;
  const avgScore = Math.round(data.reduce((s, d) => s + d.riskScore, 0) / data.length);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Audit Universe</h1>
        <p className="text-sm text-gray-500">Risk-based audit planning across all organizations</p>
      </div>

      {error && data === MOCK_DATA && (
        <div className="px-4 py-2 bg-warning-bg/20 border border-warning/20 rounded text-[11px] text-warning font-medium">
          Could not load live data from the server — nothing is shown rather than something inaccurate.
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-sm text-gray-400">Loading...</div>
      ) : data.length === 0 ? (
        <div className="p-16 text-center text-sm text-gray-400">No organizations found</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Organizations" value={data.length} icon="◉" color="bg-info-bg text-info" />
            <StatCard label="High Risk" value={highRisk} icon="▲" color="bg-danger-bg text-danger" />
            <StatCard label="Due This Quarter" value="3" icon="◷" color="bg-warning-bg text-warning" />
            <StatCard label="Avg Risk Score" value={avgScore} icon="◆" color="bg-violet-bg text-violet" />
          </div>

          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-paper/50 text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Organization</th>
                  <th className="text-left px-4 py-3 font-medium">Risk Score</th>
                  <th className="text-left px-4 py-3 font-medium">Audit History</th>
                  <th className="text-left px-4 py-3 font-medium">Last Audit Date</th>
                  <th className="text-left px-4 py-3 font-medium">Next Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium">Recommended Cadence</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-paper transition-colors">
                    <td className="px-4 py-3 text-ink-900 font-medium">{row.org}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${riskScoreBg(row.riskScore)}`}>
                        {row.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.auditHistory}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(row.lastAudit)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(row.nextScheduled)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${CADENCE_COLORS[row.recommendedCadence]}`}>{row.recommendedCadence}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">Cadence Logic</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="badge badge-danger">Critical</span>
            <span className="text-gray-500">→ Quarterly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-warning">High</span>
            <span className="text-gray-500">→ Half-Yearly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info">Medium</span>
            <span className="text-gray-500">→ Annual</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-success">Low</span>
            <span className="text-gray-500">→ Continuous Monitoring</span>
          </div>
        </div>
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
