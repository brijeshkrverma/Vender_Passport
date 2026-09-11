import { useState, useMemo, useCallback } from 'react';
import { statusColor } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import { useCrud } from '../hooks/useCrud';
import EntityFormModal from '../components/EntityFormModal';
import Pagination from '../components/Pagination';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';

const LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORIES = ['Information Security', 'Vendor Risk', 'Regulatory', 'Financial',
  'Operational', 'Cybersecurity', 'ESG', 'Strategic', 'Compliance'];
const SCALE = ['1', '2', '3', '4', '5'];

const RISK_FIELDS = [
  { name: 'title', label: 'Risk', required: true, span: 2, placeholder: 'Unpatched internet-facing servers' },
  { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, placeholder: 'Operational' },
  { name: 'owner', label: 'Owner', placeholder: 'Who owns this risk' },
  { name: 'inherent', label: 'Inherent rating', type: 'select', options: LEVELS, placeholder: 'Medium' },
  { name: 'residual', label: 'Residual rating', type: 'select', options: LEVELS, placeholder: 'Medium' },
  { name: 'likelihood', label: 'Likelihood (1–5)', type: 'select', options: SCALE },
  { name: 'impact', label: 'Impact (1–5)', type: 'select', options: SCALE },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Mitigated', 'Accepted', 'Closed'], placeholder: 'Active' },
];

export default function Risks() {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const params = useMemo(() => categoryFilter === 'All' ? {} : { category: categoryFilter }, [categoryFilter]);
  const { data: risks, loading, error, pagination, page, setPage, refetch } = usePaginatedApi('/api/risks', params);

  const [creating, setCreating] = useState(false);
  const close = useCallback(() => setCreating(false), []);
  const crud = useCrud('/api/risks', { onDone: async () => { await refetch(); close(); } });

  // "+ Create" in the top bar deep-links here with ?new=1.
  useCreateFromUrl(useCallback(() => setCreating(true), []));

  // likelihood/impact are numbers in the API but rendered as selects.
  const submit = (payload) => crud.create({
    ...payload,
    ...(payload.likelihood ? { likelihood: Number(payload.likelihood) } : {}),
    ...(payload.impact ? { impact: Number(payload.impact) } : {}),
  });

  const categories = useMemo(() => {
    if (!risks) return [];
    const cats = [...new Set(risks.map(r => r.category).filter(Boolean))];
    return ['All', ...cats.sort()];
  }, [risks]);

  const filtered = !risks ? [] : risks;

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Risk Register</h1>
          <p className="page-sub">Identify, assess, and manage organizational risks</p>
        </div>
        <div className="text-center py-[50px] text-[#6C7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Risk Register</h1>
          <p className="page-sub">Identify, assess, and manage organizational risks</p>
        </div>
        <button
          onClick={() => { crud.clearError(); setCreating(true); }}
          className="text-xs font-semibold bg-seal text-white rounded-lg px-4 py-2 hover:bg-seal-dark"
        >
          + New Risk
        </button>
      </div>

      {crud.error && !creating && (
        <div role="alert" className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{crud.error}</div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">Category:</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-table-header text-[#9CA0A8] bg-table-header">
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Title</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Category</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Inherent</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Residual</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Owner</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Controls</th>
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
              filtered.map((r, i) => (
                <tr key={r.id || i} className="cursor-pointer hover:bg-[#FBFAF3]">
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border font-medium">{r.title || r.name}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className="badge badge-neutral">{r.category || '—'}</span>
                  </td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className={`badge ${statusColor(r.inherentRisk || r.inherent_risk)}`}>{r.inherentRisk || r.inherent_risk || '—'}</span>
                  </td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className={`badge ${statusColor(r.residualRisk || r.residual_risk)}`}>{r.residualRisk || r.residual_risk || '—'}</span>
                  </td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{r.owner || '—'}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border text-center">
                    {r.controls || r.controlCount || r.control_count || '—'}
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

      <EntityFormModal
        open={creating}
        onClose={close}
        title="Add a risk"
        intro="Inherent is the risk before controls; residual is what remains after them."
        fields={RISK_FIELDS}
        initial={{ category: 'Operational', inherent: 'Medium', residual: 'Medium', status: 'Active' }}
        submitLabel="Add risk"
        saving={crud.saving}
        error={crud.error}
        onSubmit={submit}
      />
    </div>
  );
}
