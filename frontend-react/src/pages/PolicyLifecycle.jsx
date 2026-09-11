import { useApi, fmtDate, statusColor } from '../hooks/useApi';

export default function PolicyLifecycle() {
  const { data: response, loading, error } = useApi('/api/documents?type=Policy');
  const docs = response?.data || response || [];

  const stages = ['Draft', 'Under Review', 'Approved', 'Expired', 'Revoked'];
  const byStage = stages.reduce((acc, stage) => {
    acc[stage] = docs.filter((d) => d.status === stage || (stage === 'Under Review' && d.status === 'Pending Review'));
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Policy Lifecycle</h1>
        <p className="page-sub">Track policies from draft to review, approval and retirement</p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-sm text-gray-400">Loading policies...</div>
      ) : error ? (
        <div className="p-16 text-center text-sm text-danger">Failed to load policies</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stages.map((stage) => (
            <div key={stage} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-600">{stage}</span>
                <span className="badge badge-info">{byStage[stage].length}</span>
              </div>
              <div className="space-y-2">
                {byStage[stage].map((d) => (
                  <div key={d.id || d._id} className="bg-paper border border-border rounded p-2">
                    <div className="text-[11px] font-medium truncate">{d.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{d.version ? `v${d.version}` : 'v1.0'} • {fmtDate(d.updatedAt)}</div>
                    <div className="mt-1"><span className={`badge ${statusColor(d.status)}`}>{d.status}</span></div>
                  </div>
                ))}
                {byStage[stage].length === 0 && (
                  <div className="text-[10px] text-gray-400 italic">No policies</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
