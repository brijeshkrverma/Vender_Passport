import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

export default function CCM() {
  const { user } = useAuth();
  const { data: dashboard, loading, error } = useApi('/api/ccm/dashboard');

  const stats = dashboard?.stats || {
    controlsMonitored: 0,
    healthy: 0,
    atRisk: 0,
    critical: 0,
  };

  const metrics = dashboard?.metrics || [];
  const alerts = dashboard?.alerts || [];

  const barColor = (value) => {
    if (value >= 90) return 'bg-success';
    if (value >= 70) return 'bg-info';
    if (value >= 50) return 'bg-warning';
    return 'bg-danger';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">CCM Dashboard</h1>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">CCM Dashboard</h1>
        <p className="text-sm text-gray-500">Continuous Controls Monitoring — real-time control health</p>
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Controls Monitored" value={stats.controlsMonitored} color="bg-info-bg text-info" />
        <StatCard label="Healthy" value={stats.healthy} color="bg-success-bg text-success" />
        <StatCard label="At Risk" value={stats.atRisk} color="bg-warning-bg text-warning" />
        <StatCard label="Critical" value={stats.critical} color="bg-danger-bg text-danger" />
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-ink-900">Control Metrics</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-paper/50 text-gray-500">
              <th className="text-left px-5 py-2.5 font-medium">Metric</th>
              <th className="text-left px-5 py-2.5 font-medium">Status</th>
              <th className="text-left px-5 py-2.5 font-medium">Health</th>
            </tr>
          </thead>
          <tbody>
            {metrics.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-gray-400">
                  <div className="text-xl mb-1">&#9636;</div>
                  <p className="text-sm">No metrics available</p>
                </td>
              </tr>
            ) : (
              metrics.map((m, i) => (
                <tr key={m.id || i} className="border-b border-border/50 hover:bg-paper transition-colors">
                  <td className="px-5 py-3 text-ink-900 font-medium">{m.name || m.title || m.metric}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${m.healthy !== false ? 'badge-success' : 'badge-danger'}`}>
                      {m.healthy !== false ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className={`h-full rounded-full ${barColor(m.healthScore ?? m.health_score ?? m.value ?? 0)}`}
                          style={{ width: `${Math.min(100, m.healthScore ?? m.health_score ?? m.value ?? 0)}%` }}
                        />
                      </div>
                      <span className="text-gray-400">{m.healthScore ?? m.health_score ?? m.value ?? 0}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {alerts.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Active Alerts</h2>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={a.id || i}
                className={`flex items-start gap-3 p-3 rounded-md ${
                  (a.severity || a.level) === 'Critical' ? 'bg-danger-bg border border-danger/20' :
                  (a.severity || a.level) === 'High' ? 'bg-warning-bg border border-warning/20' :
                  'bg-paper border border-border'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                  (a.severity || a.level) === 'Critical' ? 'bg-danger' :
                  (a.severity || a.level) === 'High' ? 'bg-warning' :
                  'bg-info'
                }`} />
                <div>
                  <div className="text-xs font-medium text-ink-900">{a.message || a.title || a.name}</div>
                  {a.control && <div className="text-[10px] text-gray-400 mt-0.5">Control: {a.control}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${color}`}>&#9636;</div>
      <div>
        <div className="text-xl font-display font-semibold text-ink-900">{value ?? '—'}</div>
        <div className="text-[10px] text-gray-500">{label}</div>
      </div>
    </div>
  );
}
