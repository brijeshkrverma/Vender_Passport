import { useApi, fmtDate, statusColor } from '../hooks/useApi';

export default function Auditors() {
  const { data: response, loading, error } = useApi('/api/users?role=Auditor');
  const users = response?.data || response || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Auditors</h1>
        <p className="page-sub">Internal and external auditor directory</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-400">Loading auditors...</div>
        ) : error ? (
          <div className="p-16 text-center text-sm text-danger">Failed to load auditors</div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <div className="text-2xl mb-2">🔎</div>
            <p className="text-sm">No auditors found</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-paper/50 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Organization</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id || u._id} className="border-b border-border/50 hover:bg-paper">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{u.orgName || u.orgId}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusColor(u.status)}`}>{u.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(u.lastLogin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
