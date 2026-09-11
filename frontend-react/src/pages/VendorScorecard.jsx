import { useParams, useNavigate } from 'react-router-dom';
import { useApi, statusColor, sevColor, fmtDate } from '../hooks/useApi';
import { DonutChart } from '../components/Charts';

function riskTierColor(tier) {
  const map = { 'Critical': 'badge-danger', 'High': 'badge-warning', 'Medium': 'badge-info', 'Low': 'badge-success' };
  return map[tier] || 'badge-neutral';
}

function TimelineDot({ color }) {
  return (
    <div className={`w-3 h-3 rounded-full border-2 border-surface flex-shrink-0 ${color}`} />
  );
}

export default function VendorScorecard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: vendor, loading: vLoading } = useApi(`/api/vendors/${id}`);
  const { data: certs } = useApi(`/api/vendors/${id}/certificates`);
  const { data: findings } = useApi(`/api/vendors/${id}/findings`);
  const { data: assessments } = useApi(`/api/vendors/${id}/assessments`);

  if (vLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Vendor Scorecard</h1>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <div className="text-center py-16 text-gray-400 bg-surface border border-border rounded-lg">
          <p className="text-sm">Vendor not found</p>
          <button onClick={() => navigate('/vendors')} className="text-xs text-seal mt-2 hover:underline">Back to Vendors</button>
        </div>
      </div>
    );
  }

  const score = vendor.complianceScore || vendor.compliance_score || 0;
  const scoreData = [
    { label: 'Score', value: score, color: score >= 80 ? '#1F7A4D' : score >= 50 ? '#B4650B' : '#B0362A' },
    { label: 'Remaining', value: 100 - score, color: '#E5E1D3' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <button onClick={() => navigate('/vendors')} className="text-xs text-gray-400 hover:text-seal transition-colors mb-2 inline-block">
          &larr; Back to Vendors
        </button>
        <h1 className="text-2xl font-display font-semibold text-ink-900">{vendor.name}</h1>
        <p className="text-sm text-gray-500">{vendor.contact || vendor.email || ''}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Certificates</h3>
            {certs && certs.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-paper/50 text-gray-500">
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Issuer</th>
                    <th className="text-left px-3 py-2 font-medium">Expiry</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((c, i) => (
                    <tr key={c.id || i} className="border-b border-border/50 hover:bg-paper transition-colors">
                      <td className="px-3 py-2.5 text-ink-900 font-medium">{c.name || c.title}</td>
                      <td className="px-3 py-2.5 text-gray-500">{c.issuer || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500">{fmtDate(c.expiryDate || c.expiry_date)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge ${statusColor(c.status)}`}>{c.status || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">No certificates on file</p>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Recent Findings</h3>
            {findings && findings.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-paper/50 text-gray-500">
                    <th className="text-left px-3 py-2 font-medium">Title</th>
                    <th className="text-left px-3 py-2 font-medium">Severity</th>
                    <th className="text-left px-3 py-2 font-medium">Due Date</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f, i) => (
                    <tr key={f.id || i} className="border-b border-border/50 hover:bg-paper transition-colors">
                      <td className="px-3 py-2.5 text-ink-900 font-medium">{f.title || f.name}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge ${sevColor(f.severity)}`}>{f.severity || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{fmtDate(f.dueDate || f.due_date)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge ${statusColor(f.status)}`}>{f.status || 'Open'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">No open findings</p>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Assessment History</h3>
            {assessments && assessments.length > 0 ? (
              <div className="relative pl-6">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                {assessments.map((a, i) => (
                  <div key={a.id || i} className="relative pb-5 last:pb-0">
                    <div className="absolute left-[-20px] top-0.5">
                      <TimelineDot color={
                        a.result === 'Passed' ? 'bg-success' :
                        a.result === 'Failed' ? 'bg-danger' :
                        a.status === 'In Progress' ? 'bg-info' : 'bg-gray-300'
                      } />
                    </div>
                    <div className="text-xs text-ink-900 font-medium">{a.title || a.name || `Assessment ${i + 1}`}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-400">{fmtDate(a.date || a.created_at)}</span>
                      <span className={`badge text-[10px] ${statusColor(a.result || a.status)}`}>{a.result || a.status || '—'}</span>
                      {a.score != null && (
                        <span className="text-[10px] text-gray-400">{a.score}% score</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">No assessment history</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-lg p-5 sticky top-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-seal-bg text-seal flex items-center justify-center text-lg font-display font-semibold">
                {vendor.name?.charAt(0) || 'V'}
              </div>
              <div>
                <div className="text-sm font-semibold text-ink-900">{vendor.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`badge ${riskTierColor(vendor.riskTier || vendor.risk_tier)}`}>
                    {vendor.riskTier || vendor.risk_tier || 'Unrated'}
                  </span>
                  <span className="badge badge-neutral text-[10px]">
                    {vendor.type || vendor.vendor_type || 'Vendor'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <div className="flex justify-center">
                <DonutChart data={scoreData} size={120} stroke={14} />
              </div>
              <div className="text-2xl font-display font-semibold text-ink-900 mt-1">{score}%</div>
              <div className="text-[10px] text-gray-400">Compliance Score</div>
            </div>

            <div className="pt-3 border-t border-border">
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Stats</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-paper rounded-lg p-2 text-center">
                  <div className="font-semibold text-ink-900">{findings?.length || 0}</div>
                  <div className="text-[10px] text-gray-400">Findings</div>
                </div>
                <div className="bg-paper rounded-lg p-2 text-center">
                  <div className="font-semibold text-ink-900">{certs?.length || 0}</div>
                  <div className="text-[10px] text-gray-400">Certificates</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
