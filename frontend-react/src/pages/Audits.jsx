import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { statusColor, partyColor, fmtDate } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import Pagination from '../components/Pagination';

const STAGE_WIDTHS = { 'Planning': 'w-1/4', 'Fieldwork': 'w-2/4', 'Reporting': 'w-3/4', 'Closed': 'w-full' };

export default function Audits() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All');
  const params = useMemo(() => activeFilter === 'All' ? {} : { status: activeFilter }, [activeFilter]);
  const { data: audits, loading, error, pagination, page, setPage, refetch } = usePaginatedApi('/api/audits', params);

  const counts = audits ? {
    All: audits.length,
    Planning: audits.filter(a => a.status === 'Planning').length,
    'In Progress': audits.filter(a => a.status === 'In Progress').length,
    Closed: audits.filter(a => a.status === 'Closed').length,
  } : {};

  const filters = [
    { label: 'All', value: 'All', count: counts.All || 0 },
    { label: 'Planning', value: 'Planning', count: counts.Planning || 0 },
    { label: 'In Progress', value: 'In Progress', count: counts['In Progress'] || 0 },
    { label: 'Closed', value: 'Closed', count: counts.Closed || 0 },
  ];

  const load = useCallback(() => { refetch(); }, [refetch]);

  const filtered = !audits ? [] : audits;

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Audits</h1>
          <p className="page-sub">Manage and track all audits across your organization</p>
        </div>
        <div className="text-center py-[50px] text-[#6C7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Audits</h1>
        <p className="page-sub">Manage and track all audits across your organization</p>
      </div>

      <div className="pill-tab" style={{marginBottom:16}}>
        {filters.map(f => (
          <button key={f.value} onClick={() => {setActiveFilter(f.value); load();}} className={`${activeFilter===f.value ? 'active' : ''}`}>{f.label} ({f.count})</button>
        ))}
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-table-header text-[#9CA0A8] bg-table-header">
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Title</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Type</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Party</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Progress</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Due Date</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-[50px] text-[#6C7280]">
                  <p className="text-[12.5px]">No records found</p>
                </td>
              </tr>
            ) : (
              filtered.map((a, i) => (
                <tr
                  key={a.id || i}
                  className="cursor-pointer hover:bg-[#FBFAF3]"
                  role="link"
                  tabIndex={0}
                  title="Open audit detail"
                  // Was console.log — the row looked clickable but went nowhere,
                  // leaving /audits/:id reachable only by typing the URL.
                  onClick={() => navigate(`/audits/${a.id || a._id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/audits/${a.id || a._id}`); }}
                >
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border font-medium">{a.title || a.name}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{a.type || '—'}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className={`badge ${partyColor(a.party || a.party_type)}`}>{a.party || a.party_type || '—'}</span>
                  </td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                        <div className={`h-full bg-seal rounded-full ${STAGE_WIDTHS[a.stage] || 'w-0'}`} />
                      </div>
                      <span className="text-[#9CA0A8] text-[10px]">{a.stage || '—'}</span>
                    </div>
                  </td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{fmtDate(a.dueDate || a.due_date)}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className={`badge ${statusColor(a.status)}`}>{a.status || '—'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={pagination?.totalPages || 1}
          total={pagination?.total || 0}
          limit={pagination?.limit || 20}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
