import { useState, useMemo, useCallback } from 'react';
import { statusColor } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import Pagination from '../components/Pagination';
import EntityFormModal from '../components/EntityFormModal';
import { useCrud } from '../hooks/useCrud';
import { useConfirm } from '../components/ConfirmDialog';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';

/**
 * The types the API will actually accept.
 *
 * These mirror the enum on the Organization model. The filter row previously
 * offered "Internal", which is not one of them: that pill could only ever return
 * an empty list, while "Own Organization" and "Supplier" — both real — could not
 * be filtered for at all.
 */
const TYPES = ['Own Organization', 'Supplier', 'Vendor', 'Partner', 'Client'];
const STATUSES = ['Active', 'Inactive', 'Suspended'];

const TYPE_COLORS = {
  'Own Organization': 'badge-success',
  Supplier: 'badge-warning',
  Vendor: 'badge-info',
  Partner: 'badge-violet',
  Client: 'badge-neutral',
};

const fields = [
  { name: 'name', label: 'Organization name', required: true, span: 2, placeholder: 'SecureCore Systems' },
  { name: 'type', label: 'Relationship', type: 'select', options: TYPES, required: true, placeholder: 'How you work with them' },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES, placeholder: 'Active' },
  { name: 'industry', label: 'Industry', placeholder: 'Cybersecurity' },
  { name: 'country', label: 'Country', placeholder: 'United States' },
  {
    name: 'contact', label: 'Primary contact', span: 2, placeholder: 'Amanda Reyes',
    help: 'The person audits and questionnaires are addressed to.',
  },
];

function ComplianceBar({ pct }) {
  const c = Math.max(0, Math.min(100, pct || 0));
  const color = c >= 80 ? 'bg-success' : c >= 50 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${c}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-500">{c}%</span>
    </div>
  );
}

export default function Organizations() {
  const confirm = useConfirm();
  const [typeFilter, setTypeFilter] = useState('All');
  const params = useMemo(() => (typeFilter === 'All' ? {} : { type: typeFilter }), [typeFilter]);
  const { data: orgs, loading, error, pagination, page, setPage, refetch } =
    usePaginatedApi('/api/organizations', params);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const close = useCallback(() => { setCreating(false); setEditing(null); }, []);
  const crud = useCrud('/api/organizations', { onDone: async () => { await refetch(); close(); } });

  useCreateFromUrl(useCallback(() => setCreating(true), []));

  async function handleDelete(o) {
    const ok = await confirm({
      title: `Remove ${o.name}?`,
      message: 'It will no longer appear in pickers or reports.',
      detail: 'The record is tombstoned, not erased — audits and findings that reference it stay intact.',
      confirmLabel: 'Remove organization',
      tone: 'danger',
    });
    if (ok) await crud.remove(o.id || o._id);
  }

  const header = (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="page-title">Organizations</h1>
        <p className="page-sub">Vendors, partners, and internal orgs in your network</p>
      </div>
      <button
        onClick={() => { crud.clearError(); setCreating(true); }}
        className="text-xs font-semibold bg-seal text-white rounded-lg px-4 py-2 hover:bg-seal-dark"
      >
        + Add Organization
      </button>
    </div>
  );

  const dialogs = (
    <>
      <EntityFormModal
        open={creating}
        onClose={close}
        title="Add an organization"
        intro="Everyone you audit, are audited by, or exchange documents with — this is who an audit or questionnaire can be pointed at."
        fields={fields}
        initial={{ status: 'Active' }}
        submitLabel="Create organization"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => crud.create(payload)}
      />

      <EntityFormModal
        open={!!editing}
        onClose={close}
        title={`Edit ${editing?.name || 'organization'}`}
        fields={fields}
        initial={editing ? {
          name: editing.name, type: editing.type, status: editing.status,
          industry: editing.industry, country: editing.country, contact: editing.contact,
        } : {}}
        submitLabel="Save changes"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => crud.update(editing.id || editing._id, payload)}
      />
    </>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="text-center py-[50px] text-[#6C7280]">Loading...</div>
        {dialogs}
      </div>
    );
  }

  const filtered = orgs || [];

  return (
    <div className="space-y-4">
      {header}

      <div className="flex gap-2 flex-wrap">
        {['All', ...TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={typeFilter === t ? 'filter-pill filter-pill-active' : 'filter-pill'}
          >
            {t}
          </button>
        ))}
      </div>

      {crud.error && !creating && !editing && (
        <div role="alert" className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{crud.error}</div>
      )}

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-[50px] text-[#6C7280]">
          <p className="text-[12.5px]">No records found</p>
          <p className="text-[11px] mt-1">Use “+ Add Organization” to add one</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((o, i) => (
              <div key={o.id || o._id || i} className="card p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">{o.name}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {o.industry || '—'}{o.country ? ` · ${o.country}` : ''}
                    </p>
                  </div>
                  <span className={`badge ${TYPE_COLORS[o.type] || 'badge-neutral'}`}>{o.type || '—'}</span>
                </div>

                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Compliance Score</div>
                <ComplianceBar pct={o.compliance ?? o.complianceScore} />

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {o.status && <span className={`badge ${statusColor(o.status)}`}>{o.status}</span>}
                  {o.contact && <span className="text-[10px] text-gray-400">{o.contact}</span>}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex justify-end gap-2">
                  <button
                    onClick={() => { crud.clearError(); setEditing(o); }}
                    className="text-[11px] font-semibold border border-border rounded-md px-2.5 py-1 hover:bg-paper"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(o)}
                    className="text-[11px] font-semibold border border-danger/30 text-danger rounded-md px-2.5 py-1 hover:bg-danger/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={pagination?.totalPages || 1}
            total={pagination?.total || 0}
            limit={pagination?.limit || 20}
            onPageChange={setPage}
          />
        </>
      )}

      {dialogs}
    </div>
  );
}
