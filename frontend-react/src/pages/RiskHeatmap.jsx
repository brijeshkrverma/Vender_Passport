import { useApi, sevColor } from '../hooks/useApi';

export default function RiskHeatmap() {
  const { data: heatmapResp, loading: hLoading, error: hError } = useApi('/api/risks/heatmap');
  const { data: risksResp, loading: rLoading } = useApi('/api/risks');
  const heatmap = heatmapResp?.data || heatmapResp || [];
  const risks = risksResp?.data || risksResp || [];
  const loading = hLoading || rLoading;

  const cell = (l, i) => heatmap.find((c) => c.likelihood === l && c.impact === i) || { count: 0, score: l * i };
  const maxCount = Math.max(1, ...heatmap.map((c) => c.count));

  const topRisks = [...risks].sort((a, b) => {
    const scoreA = (a.likelihood || 1) * (a.impact || 1);
    const scoreB = (b.likelihood || 1) * (b.impact || 1);
    return scoreB - scoreA;
  }).slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Risk Heatmap</h1>
        <p className="page-sub">5×5 likelihood vs impact matrix</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          {loading ? (
            <div className="p-16 text-center text-sm text-gray-400">Loading heatmap...</div>
          ) : hError ? (
            <div className="p-16 text-center text-sm text-danger">Failed to load heatmap</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-20 text-[10px] text-gray-500 text-right pr-2">Impact →</div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-1 text-center text-[10px] text-gray-500">{i}</div>
                ))}
              </div>
              {[5, 4, 3, 2, 1].map((likelihood) => (
                <div key={likelihood} className="flex items-center">
                  <div className="w-20 text-[10px] text-gray-500 text-right pr-2">L {likelihood}</div>
                  {[1, 2, 3, 4, 5].map((impact) => {
                    const c = cell(likelihood, impact);
                    const opacity = c.count / maxCount;
                    return (
                      <div
                        key={impact}
                        className="flex-1 aspect-square flex items-center justify-center rounded-md text-xs font-semibold border border-white"
                        style={{ background: `rgba(185, 28, 28, ${0.1 + opacity * 0.85})` }}
                        title={`Likelihood ${likelihood}, Impact ${impact}: ${c.count} risks`}
                      >
                        {c.count > 0 ? c.count : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">Top Risks</h2>
          {topRisks.length === 0 ? (
            <p className="text-xs text-gray-400">No risks found</p>
          ) : (
            <div className="space-y-3">
              {topRisks.map((r) => (
                <div key={r.id || r._id} className="pb-3 border-b border-border/50 last:border-0">
                  <div className="text-xs font-medium">{r.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${sevColor(r.inherent)}`}>{r.inherent}</span>
                    <span className="text-[10px] text-gray-500">L{r.likelihood || '-'} × I{r.impact || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
