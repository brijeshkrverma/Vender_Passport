import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { statusColor, useApi } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import { useCrud } from '../hooks/useCrud';
import EntityFormModal from '../components/EntityFormModal';
import Pagination from '../components/Pagination';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';

const EFFECTIVENESS = ['Effective', 'Partially Effective', 'Needs Improvement', 'Ineffective'];
const FREQUENCIES = ['Continuous', 'Monthly', 'Quarterly', 'Semi-annual', 'Annual', 'Ad hoc'];

function controlFields(frameworks) {
  return [
    { name: 'name', label: 'Control name', required: true, span: 2, placeholder: 'Quarterly user access review' },
    { name: 'family', label: 'Family', placeholder: 'Access Control' },
    { name: 'standard', label: 'Standard reference', placeholder: 'A.9.2.5' },
    {
      name: 'frameworkId', label: 'Framework', type: 'select',
      options: (frameworks || []).map(f => ({ value: f.name, label: f.name })),
    },
    { name: 'owner', label: 'Owner', placeholder: 'Control owner' },
    { name: 'effectiveness', label: 'Effectiveness', type: 'select', options: EFFECTIVENESS },
    { name: 'testFrequency', label: 'Test frequency', type: 'select', options: FREQUENCIES },
    { name: 'description', label: 'Description', type: 'textarea', span: 2 },
  ];
}

export default function Controls() {
  const { user } = useAuth();
  const [familyFilter, setFamilyFilter] = useState('All');
  const params = useMemo(() => familyFilter === 'All' ? {} : { family: familyFilter }, [familyFilter]);
  const { data: controls, loading, error, pagination, page, setPage, refetch } = usePaginatedApi('/api/controls', params);
  const { data: frameworks } = useApi('/api/frameworks');

  const [creating, setCreating] = useState(false);
  const close = useCallback(() => setCreating(false), []);
  const crud = useCrud('/api/controls', { onDone: async () => { await refetch(); close(); } });

  // "+ Create" in the top bar deep-links here with ?new=1.
  useCreateFromUrl(useCallback(() => setCreating(true), []));

  const families = useMemo(() => {
    if (!controls) return [];
    const fams = [...new Set(controls.map(c => c.family).filter(Boolean))];
    return ['All', ...fams.sort()];
  }, [controls]);

  const filtered = !controls ? [] : controls;

  const effectivenessColor = (score) => {
    if (score == null) return 'badge-neutral';
    if (score >= 90) return 'badge-success';
    if (score >= 70) return 'badge-info';
    if (score >= 50) return 'badge-warning';
    return 'badge-danger';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Control Library</h1>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Control Library</h1>
          <p className="text-sm text-gray-500">Browse and manage your security controls</p>
        </div>
        <button
          onClick={() => { crud.clearError(); setCreating(true); }}
          className="text-xs font-semibold bg-seal text-white rounded-lg px-4 py-2 hover:bg-seal-dark"
        >
          + New Control
        </button>
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      {crud.error && !creating && (
        <div role="alert" className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{crud.error}</div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">Family:</label>
        <select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
        >
          {families.map((f) => (
            <option key={f} value={f}>{f === 'All' ? 'All Families' : f}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-paper/50 text-gray-500">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Family</th>
              <th className="text-left px-4 py-3 font-medium">Standard</th>
              <th className="text-left px-4 py-3 font-medium">Owner</th>
              <th className="text-left px-4 py-3 font-medium">Effectiveness</th>
              <th className="text-left px-4 py-3 font-medium">Mapped Risks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-gray-400">
                  <div className="text-2xl mb-2">&#9881;</div>
                  <p className="text-sm">No controls found</p>
                  <p className="text-[11px] mt-1">Add controls to the library to get started</p>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.id || i} className="border-b border-border/50 hover:bg-paper transition-colors">
                  <td className="px-4 py-3 text-ink-900 font-medium">{c.name || c.title}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-neutral">{c.family || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.standard || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.owner || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${effectivenessColor(c.effectiveness)}`}>
                      {c.effectiveness != null ? `${c.effectiveness}%` : 'Not Rated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-center">{c.mappedRisks ?? c.mapped_risks ?? '—'}</td>
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
        title="Add a control"
        fields={controlFields(Array.isArray(frameworks) ? frameworks : [])}
        initial={{ effectiveness: 'Effective', testFrequency: 'Quarterly' }}
        submitLabel="Add control"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => crud.create(payload)}
      />
    </div>
  );
}
