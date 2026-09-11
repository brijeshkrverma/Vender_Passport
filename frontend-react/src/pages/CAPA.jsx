import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi, sevColor, fmtDate } from '../hooks/useApi';
import { useCrud } from '../hooks/useCrud';
import EntityFormModal from '../components/EntityFormModal';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';
import { useConfirm } from '../components/ConfirmDialog';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * A CAPA answers a specific finding, so findingId is required by the API — the
 * finding picker is mandatory and lists the findings of this organization.
 */
function capaFields(findings) {
  return [
    { name: 'title', label: 'Title', required: true, span: 2, placeholder: 'Introduce quarterly access review' },
    {
      name: 'findingId', label: 'Finding', type: 'select', required: true, span: 2,
      options: (findings || []).map(f => ({ value: f.id || f._id, label: f.title })),
      placeholder: findings && findings.length ? 'Which finding does this address?' : 'No findings available — raise one first',
      help: 'A corrective action must trace back to a finding.',
    },
    { name: 'owner', label: 'Owner', placeholder: 'Who will do the work' },
    { name: 'due', label: 'Due date', type: 'date' },
    { name: 'severity', label: 'Severity', type: 'select', options: SEVERITIES, placeholder: 'Medium' },
    { name: 'rootCause', label: 'Root cause', type: 'textarea', span: 2 },
    { name: 'actionPlan', label: 'Action plan', type: 'textarea', span: 2 },
    {
      name: 'verificationCriteria', label: 'Verification criteria', type: 'textarea', span: 2,
      help: 'How the reviewer will decide this is genuinely fixed.',
    },
  ];
}

const COLUMNS = [
  { key: 'Open', label: 'Open' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Pending Verification', label: 'Pending Verification' },
  { key: 'Verified', label: 'Verified' },
  { key: 'Closed', label: 'Closed' },
];

export default function CAPA() {
  const { user, authHeaders } = useAuth();
  const confirm = useConfirm();
  const { data: capas, loading, error, refetch } = useApi('/api/capa');

  const { data: findings } = useApi('/api/findings');
  const [actionError, setActionError] = useState('');
  const [creating, setCreating] = useState(false);

  const closeForm = useCallback(() => setCreating(false), []);
  const crud = useCrud('/api/capa', {
    onDone: async () => { await refetch(); setCreating(false); },
  });

  // "+ Create" in the top bar deep-links here with ?new=1.
  useCreateFromUrl(useCallback(() => setCreating(true), []));

  /**
   * Advance a CAPA one step. Confirmed first: a CAPA status change is a
   * compliance record, there is no undo in the UI, and a single stray click on
   * a card used to move it silently — including into "Verified".
   */
  const advanceCAPA = useCallback(async (id, title, nextStatus) => {
    const ok = await confirm({
      title: `Move to “${nextStatus}”?`,
      message: title || 'this CAPA',
      detail: 'This is recorded in the audit trail and cannot be undone from here.',
      confirmLabel: `Move to ${nextStatus}`,
    });
    if (!ok) return;

    setActionError('');
    try {
      const res = await fetch(`/api/capa/${id}/advance`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) { refetch(); return; }
      const body = await res.json().catch(() => ({}));
      setActionError(body.message || body.error || `Could not update CAPA (HTTP ${res.status})`);
    } catch (err) {
      setActionError('Cannot reach the server. Check your connection and try again.');
    }
  }, [authHeaders, refetch, confirm]);

  const groupByStatus = useCallback(() => {
    const groups = {};
    COLUMNS.forEach((col) => (groups[col.key] = []));
    if (!capas) return groups;
    capas.forEach((c) => {
      const status = c.status || 'Open';
      if (groups[status]) {
        groups[status].push(c);
      } else {
        groups['Open'].push(c);
      }
    });
    return groups;
  }, [capas]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">CAPA Board</h1>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const grouped = groupByStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">CAPA Board</h1>
          <p className="text-sm text-gray-500">Corrective and Preventive Actions — click a card to advance</p>
        </div>
        <button
          onClick={() => { crud.clearError(); setCreating(true); }}
          className="text-xs font-semibold bg-seal text-white rounded-lg px-4 py-2 hover:bg-seal-dark"
        >
          + New CAPA
        </button>
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}
      {actionError && (
        <div role="alert" className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{actionError}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const items = grouped[col.key] || [];
          return (
            <div key={col.key} className="bg-paper/50 border border-border rounded-lg p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-ink-900">{col.label}</h3>
                <span className="badge badge-neutral text-[10px]">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-[11px] text-gray-400 text-center py-8">No items</p>
                ) : (
                  items.map((item, i) => (
                    <button
                      key={item.id || i}
                      onClick={() => {
                        const idx = COLUMNS.findIndex(c => c.key === col.key);
                        const next = COLUMNS[idx + 1];
                        if (next) advanceCAPA(item.id, item.title || item.name, next.label);
                      }}
                      className={`w-full text-left bg-surface border border-border rounded-md p-3 hover:shadow-sm transition-shadow ${
                        col.key !== 'Closed' ? 'cursor-pointer hover:border-seal/30' : 'cursor-default'
                      }`}
                    >
                      <div className="text-xs font-medium text-ink-900 mb-1">{item.title || item.name}</div>
                      {item.findingRef && (
                        <div className="text-[10px] text-gray-400 mb-1">Ref: {item.findingRef}</div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {item.owner && (
                          <span className="text-[10px] text-gray-500">{item.owner}</span>
                        )}
                        {item.severity && (
                          <span className={`badge text-[10px] ${sevColor(item.severity)}`}>{item.severity}</span>
                        )}
                        {item.dueDate && (
                          <span className="text-[10px] text-gray-400">{fmtDate(item.dueDate)}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EntityFormModal
        open={creating}
        onClose={closeForm}
        title="New corrective action"
        intro="A CAPA records what went wrong, what will be done about it, and how anyone will know it worked."
        fields={capaFields(Array.isArray(findings) ? findings : [])}
        initial={{ severity: 'Medium' }}
        submitLabel="Create CAPA"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => crud.create(payload)}
      />
    </div>
  );
}
