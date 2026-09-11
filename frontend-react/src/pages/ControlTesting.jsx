import { useApi, fmtDate, statusColor } from '../hooks/useApi';

export default function ControlTesting() {
  const { data: response, loading, error } = useApi('/api/controls');
  const controls = response?.data || response || [];

  const effectivenessColor = (e) => {
    const map = {
      'Effective': 'badge-success',
      'Partially Effective': 'badge-warning',
      'Needs Improvement': 'badge-warning',
      'Ineffective': 'badge-danger',
    };
    return map[e] || 'badge-neutral';
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Control Testing</h1>
        <p className="page-sub">Design and operating effectiveness tracking for security controls</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-400">Loading controls...</div>
        ) : error ? (
          <div className="p-16 text-center text-sm text-danger">Failed to load controls</div>
        ) : controls.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-sm">No controls found</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-paper/50 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Control</th>
                <th className="text-left px-4 py-3 font-medium">Family</th>
                <th className="text-left px-4 py-3 font-medium">Standard</th>
                <th className="text-left px-4 py-3 font-medium">Owner</th>
                <th className="text-left px-4 py-3 font-medium">Effectiveness</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((c) => (
                <tr key={c.id || c._id} className="border-b border-border/50 hover:bg-paper">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.family || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.standard || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.owner || '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${effectivenessColor(c.effectiveness)}`}>{c.effectiveness}</span></td>
                  <td className="px-4 py-3"><span className={`badge ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
