import { useApi, fmtDate, daysLeft, statusColor } from '../hooks/useApi';

export default function ExpiryAlerts() {
  const { data: response, loading, error } = useApi('/api/certificates/expiring?days=90');
  const certs = response?.data || response || [];

  const grouped = certs.reduce((acc, c) => {
    const left = daysLeft(c.expiryDate || c.expiry);
    const bucket = left < 0 ? 'Expired' : left <= 7 ? '7 Days' : left <= 30 ? '30 Days' : '90 Days';
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: 'Expired', value: grouped['Expired'] || 0, color: 'badge-danger' },
    { label: '≤ 7 Days', value: grouped['7 Days'] || 0, color: 'badge-danger' },
    { label: '≤ 30 Days', value: grouped['30 Days'] || 0, color: 'badge-warning' },
    { label: '≤ 90 Days', value: grouped['90 Days'] || 0, color: 'badge-info' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Expiry Alerts</h1>
        <p className="page-sub">Certificates and licenses expiring in the next 90 days</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl font-display font-semibold">{s.value}</div>
            <div className={`badge ${s.color} mt-2`}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-400">Loading expiry alerts...</div>
        ) : error ? (
          <div className="p-16 text-center text-sm text-danger">Failed to load alerts</div>
        ) : certs.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-sm">No expiring certificates</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-paper/50 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Certificate</th>
                <th className="text-left px-4 py-3 font-medium">Holder</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Expiry Date</th>
                <th className="text-left px-4 py-3 font-medium">Days Left</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => {
                const left = daysLeft(c.expiryDate || c.expiry);
                return (
                  <tr key={c.id || c._id} className="border-b border-border/50 hover:bg-paper">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.holder}</td>
                    <td className="px-4 py-3 text-gray-500">{c.type}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(c.expiryDate || c.expiry)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${left < 0 ? 'badge-danger' : left <= 7 ? 'badge-danger' : left <= 30 ? 'badge-warning' : 'badge-info'}`}>
                        {left < 0 ? 'Expired' : `${left}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${statusColor(c.status)}`}>{c.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
