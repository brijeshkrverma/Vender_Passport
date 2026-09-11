import { useApi, statusColor, sevColor, fmtDate, daysLeft } from '../hooks/useApi';
import { BarChart, DonutChart } from '../components/Charts';

function Skeleton({ className = '', lines = 3 }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded mb-2" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, loading: l1 } = useApi('/api/reports/summary');
  const { data: recentAudits, loading: l2 } = useApi('/api/audits?limit=5');
  const { data: expiringCerts, loading: l3 } = useApi('/api/certificates/expiring?days=90');

  const isLoading = l1 || l2 || l3;

  const barData = [
    { label: 'Planning', value: summary?.byStatus?.Planning || 0, color: '#E5E1D3' },
    { label: 'In Progress', value: summary?.byStatus?.['In Progress'] || 0, color: '#2E5F82' },
    { label: 'Closed', value: summary?.byStatus?.Closed || 0, color: '#1F7A4D' },
  ];

  const donutData = [
    { label: 'Critical', value: summary?.bySeverity?.Critical || 0, color: '#B0362A' },
    { label: 'High', value: summary?.bySeverity?.High || 0, color: '#B4650B' },
    { label: 'Medium', value: summary?.bySeverity?.Medium || 0, color: '#2E5F82' },
    { label: 'Low', value: summary?.bySeverity?.Low || 0, color: '#1F7A4D' },
  ];

  const stats = [
    { label: 'Active Audits', value: summary?.activeAudits ?? 0, icon: '', iconBg: '#E8F1F6', iconColor: '#2E5F82', trend: '+12%' },
    { label: 'Open Findings', value: summary?.openFindings ?? 0, icon: '', iconBg: '#FCF0DA', iconColor: '#B4650B', trend: '-3%' },
    { label: 'Expiring Certs', value: summary?.expiringCerts ?? 0, icon: '', iconBg: '#FBEAE7', iconColor: '#B0362A', trend: '+8%' },
    { label: 'High Risks', value: summary?.highRisks ?? 0, icon: '', iconBg: '#EFEBF7', iconColor: '#5B4B8A', trend: '—' },
  ];

  if (isLoading) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">Compliance at a glance</p>
          </div>
          <div className="h-10 w-[120px] bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="stat-grid">
          {stats.map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-[30px] w-[30px] bg-gray-200 rounded" style={{ borderRadius: 8 }} />
              <div className="h-[26px] w-[60px] bg-gray-200 rounded mt-3" />
              <div className="h-[12px] w-[80px] bg-gray-200 rounded mt-2" />
              <div className="h-[11px] w-[50px] bg-gray-200 rounded mt-2" />
            </div>
          ))}
        </div>
        <div className="two-col">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900 mb-4">Audit Status Overview</h2>
            <Skeleton lines={4} />
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900 mb-4">Findings by Severity</h2>
            <Skeleton lines={4} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">Recent Audits</h2>
          <Skeleton lines={3} />
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">Certificates Expiring Soon</h2>
          <Skeleton lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Compliance at a glance</p>
        </div>
        <button className="btn btn-seal">+ New Audit</button>
      </div>

      <div className="stat-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-top">
              <div className="stat-icon" style={{ background: s.iconBg, color: s.iconColor, fontSize: 14, fontWeight: 700 }}>
                {i === 0 ? '◈' : i === 1 ? '▲' : i === 2 ? '⬢' : '◆'}
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-trend" style={{ color: s.trend.startsWith('+') ? '#1F7A4D' : s.trend.startsWith('-') ? '#B0362A' : '#6C7280' }}>
              {s.trend.startsWith('+') ? '↑' : s.trend.startsWith('-') ? '↓' : ''} {s.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">Audit Status Overview</h2>
          <BarChart data={barData} w={300} h={120} />
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">Findings by Severity</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <DonutChart data={donutData} size={120} stroke={14} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
              {donutData.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ color: '#6C7280' }}>{d.label}</span>
                  <span style={{ fontWeight: 600, color: '#1C2430' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <h2 className="text-sm font-semibold text-ink-900 mb-0 px-[16px] pt-[14px] pb-[10px]">Recent Audits</h2>
          {recentAudits && recentAudits.length > 0 ? (
            <div className="table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Audit', 'Type', 'Status'].map(h => (
                      <th key={h} className="text-[11px] uppercase tracking-[.05em] text-[#9CA0A8] font-semibold px-[16px] py-[10px] border-b border-border bg-[#FBFAF6]" style={{ textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentAudits.map((a, i) => (
                    <tr key={a.id || i} className="cursor-pointer hover:bg-[#FBFAF3]" onClick={() => console.log('Audit:', a)}>
                      <td className="px-[16px] py-[12px] text-[13px] border-b border-border" style={{ verticalAlign: 'middle', fontWeight: 500, color: '#1C2430' }}>{a.title || a.name}</td>
                      <td className="px-[16px] py-[12px] text-[13px] border-b border-border" style={{ verticalAlign: 'middle', color: '#1C2430' }}>{a.type || '—'}</td>
                      <td className="px-[16px] py-[12px] text-[13px] border-b border-border" style={{ verticalAlign: 'middle' }}>
                        <span className={`badge ${statusColor(a.status)}`}>{a.status || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-[50px] text-[#6C7280]"><p className="text-[12.5px]">No records found</p></div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="card overflow-hidden">
          <h2 className="text-sm font-semibold text-ink-900 mb-0 px-[16px] pt-[14px] pb-[10px]">Certificates Expiring Soon</h2>
          {expiringCerts && expiringCerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {expiringCerts.map((c, i) => {
                const left = daysLeft(c.expiryDate || c.expiry_date);
                const pct = Math.max(0, Math.min(100, Math.round(((90 - left) / 90) * 100)));
                const barColor = left < 0 ? '#B0362A' : left <= 30 ? '#B4650B' : left <= 90 ? '#B8863B' : '#1F7A4D';
                return (
                  <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E5E1D3' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1C2430' }}>{c.name || c.title}</div>
                      <div style={{ fontSize: 11, color: '#6C7280', marginTop: 2 }}>{c.holder || c.organization || '—'}</div>
                    </div>
                    <div style={{ flex: 1, height: 6, background: '#F1EFE6', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 10, background: barColor, width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: left < 0 ? '#B0362A' : left <= 30 ? '#B4650B' : '#6C7280', minWidth: 50, textAlign: 'right' }}>
                      {left < 0 ? 'Expired' : `${left}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-[50px] text-[#6C7280]"><p className="text-[12.5px]">No records found</p></div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: 20,
        background: '#0F1B2D',
        color: '#fff',
        borderRadius: 10,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 4L24 16h12l-10 8 4 12-10-8-10 8 4-12-10-8h12L20 4z" fill="#B8863B" />
          </svg>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600 }}>Invite your vendors</div>
            <div style={{ fontSize: 13, color: '#9CA0A8', marginTop: 4 }}>Streamline compliance by bringing your vendors onto the platform.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-outline" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Learn More</button>
          <button className="btn btn-seal">Invite Vendors</button>
        </div>
      </div>
    </div>
  );
}
