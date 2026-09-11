import { useNavigate } from 'react-router-dom';
import { useApi, statusColor, fmtDate } from '../hooks/useApi';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR = 2026;

const BAR_COLORS = {
  'Planning': 'bg-info',
  'In Progress': 'bg-seal',
  'Closed': 'bg-success',
  'Overdue': 'bg-danger',
};

export default function Gantt() {
  const navigate = useNavigate();
  const { data: audits, loading } = useApi('/api/audits');

  const bars = (audits || []).map(a => {
    const start = a.startDate || a.start_date ? new Date(a.startDate || a.start_date) : new Date(YEAR, 0, 1);
    const end = a.endDate || a.end_date || a.dueDate || a.due_date
      ? new Date(a.endDate || a.end_date || a.dueDate || a.due_date)
      : new Date(YEAR, 11, 31);
    const barStart = Math.max(0, (start - new Date(YEAR, 0, 1)) / (1000 * 60 * 60 * 24));
    const barWidth = Math.max(4, (end - start) / (1000 * 60 * 60 * 24));
    const color = BAR_COLORS[a.status] || 'bg-gray-400';
    return { ...a, barStart, barWidth, color, start, end };
  }).sort((a, b) => a.barStart - b.barStart);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Audit Timeline</h1>
        <p className="text-sm text-gray-500">Gantt view of all audits across {YEAR}</p>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            <div className="flex border-b border-border bg-paper/30">
              <div className="w-44 flex-shrink-0 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase border-r border-border">
                Audit
              </div>
              {MONTHS.map(m => (
                <div key={m} className="flex-1 text-center py-2 text-[10px] font-semibold text-gray-400 uppercase border-r border-border/50">
                  {m}
                </div>
              ))}
            </div>

            <div className="divide-y divide-border/50">
              {loading ? (
                <div className="px-4 py-16 text-center text-gray-400 text-xs">Loading...</div>
              ) : bars.length === 0 ? (
                <div className="px-4 py-16 text-center text-gray-400">
                  <p className="text-sm">No audits found</p>
                </div>
              ) : (
                bars.map((a, i) => {
                  const leftPct = (a.barStart / 365) * 100;
                  const widthPct = Math.min(100 - leftPct, (a.barWidth / 365) * 100);
                  return (
                    <div key={a.id || i} className="flex items-center hover:bg-paper/30 transition-colors">
                      <div className="w-44 flex-shrink-0 px-4 py-3 text-xs text-ink-900 font-medium border-r border-border truncate">
                        {a.title || a.name}
                      </div>
                      <div className="flex-1 relative h-10">
                        <div
                          onClick={() => navigate(`/audits/${a.id}`)}
                          className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full cursor-pointer transition-opacity hover:opacity-80 flex items-center px-2 ${a.color}`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '48px' }}
                        >
                          <span className="text-[10px] text-white font-medium truncate">
                            {a.title || a.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-info" /> <span className="text-gray-500">Planning</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-seal" /> <span className="text-gray-500">In Progress</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> <span className="text-gray-500">Closed</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger" /> <span className="text-gray-500">Overdue</span></div>
      </div>
    </div>
  );
}
