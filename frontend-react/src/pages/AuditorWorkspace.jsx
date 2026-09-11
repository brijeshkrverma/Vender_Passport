import { useAuth } from '../context/AuthContext';
import { useApi, fmtDate, statusColor } from '../hooks/useApi';

export default function AuditorWorkspace() {
  const { user } = useAuth();
  const { data: response, loading, error } = useApi('/api/audits');
  const audits = response?.data || response || [];
  const assigned = audits.filter((a) =>
    a.lead === user?.name || a.auditors?.includes(user?.name) || a.lead === user?.email
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Auditor Workspace</h1>
        <p className="page-sub">Your assigned audits and fieldwork tasks</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-display font-semibold">{assigned.length}</div>
          <div className="text-[11px] text-gray-500 mt-1">Assigned Audits</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display font-semibold">{assigned.filter((a) => a.status === 'In Progress').length}</div>
          <div className="text-[11px] text-gray-500 mt-1">In Progress</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-display font-semibold">{assigned.filter((a) => a.status === 'Closed').length}</div>
          <div className="text-[11px] text-gray-500 mt-1">Closed</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-400">Loading assignments...</div>
        ) : error ? (
          <div className="p-16 text-center text-sm text-danger">Failed to load audits</div>
        ) : assigned.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <div className="text-2xl mb-2">📋</div>
            <p className="text-sm">No audits assigned</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-paper/50 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Audit</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Stage</th>
                <th className="text-left px-4 py-3 font-medium">Due</th>
                <th className="text-left px-4 py-3 font-medium">Lead</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((a) => (
                <tr key={a.id || a._id} className="border-b border-border/50 hover:bg-paper">
                  <td className="px-4 py-3 font-medium">{a.title}</td>
                  <td className="px-4 py-3 text-gray-500">{a.type}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusColor(a.status)}`}>{a.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{a.stage || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(a.due)}</td>
                  <td className="px-4 py-3 text-gray-500">{a.lead || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
