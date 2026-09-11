import { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useCrud } from '../hooks/useCrud';
import EntityFormModal from '../components/EntityFormModal';
import { statusColor, sevColor, fmtDate } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import Pagination from '../components/Pagination';
import FindingDiscussion from '../components/FindingDiscussion';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';
import { useConfirm } from '../components/ConfirmDialog';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Open', 'Acknowledged', 'In Progress', 'Resolved', 'Closed', 'Overdue', 'Reopened'];

/**
 * A finding cannot exist without the audit it came from — auditId is required
 * by the API, which is why the audit picker is the first field and is mandatory.
 */
function findingFields(audits, isEdit) {
  return [
    { name: 'title', label: 'Title', required: true, span: 2, placeholder: 'Access reviews not performed quarterly' },
    {
      name: 'auditId', label: 'Audit', type: 'select', required: !isEdit, span: 2,
      options: (audits || []).map(a => ({ value: a.id || a._id, label: a.title })),
      placeholder: audits && audits.length ? 'Select the audit this came from…' : 'No audits available — create one first',
      help: isEdit ? undefined : 'A finding must belong to an audit.',
    },
    { name: 'severity', label: 'Severity', type: 'select', options: SEVERITIES, placeholder: 'Medium' },
    { name: 'risk', label: 'Risk', type: 'select', options: SEVERITIES, placeholder: 'Medium' },
    { name: 'owner', label: 'Owner', placeholder: 'Who must act on this' },
    { name: 'due', label: 'Due date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, placeholder: 'Open' },
    { name: 'controlId', label: 'Control ref', placeholder: 'e.g. A.9.2.5' },
    { name: 'criteria', label: 'Criteria — what should happen', type: 'textarea', span: 2 },
    { name: 'condition', label: 'Condition — what actually happens', type: 'textarea', span: 2 },
    { name: 'cause', label: 'Cause', type: 'textarea', span: 2 },
    { name: 'consequence', label: 'Consequence', type: 'textarea', span: 2 },
    { name: 'recommendation', label: 'Recommendation', type: 'textarea', span: 2 },
  ];
}

export default function Findings() {
  const confirm = useConfirm();
  const { data: findings, loading, error, pagination, page, setPage, refetch } = usePaginatedApi('/api/findings');
  const { data: audits } = useApi('/api/audits');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const close = useCallback(() => { setCreating(false); setEditing(null); }, []);
  const crud = useCrud('/api/findings', { onDone: async () => { await refetch(); close(); } });

  // "+ Create" in the top bar deep-links here with ?new=1.
  useCreateFromUrl(useCallback(() => setCreating(true), []));

  const auditList = Array.isArray(audits) ? audits : [];

  async function handleDelete(finding) {
    const ok = await confirm({
      title: 'Remove this finding?',
      message: finding.title,
      detail: 'The finding is tombstoned, not erased — it stays in the audit trail.',
      confirmLabel: 'Remove finding',
      tone: 'danger',
    });
    if (ok) await crud.remove(finding.id);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Findings</h1>
          <p className="page-sub">Audit findings tracked across all engagements</p>
        </div>
        <div className="text-center py-[50px] text-[#6C7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Findings</h1>
          <p className="page-sub">Audit findings tracked across all engagements</p>
        </div>
        <button
          onClick={() => { crud.clearError(); setCreating(true); }}
          className="text-xs font-semibold bg-seal text-white rounded-lg px-4 py-2 hover:bg-seal-dark"
        >
          + New Finding
        </button>
      </div>

      {crud.error && !creating && !editing && (
        <div role="alert" className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{crud.error}</div>
      )}

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-table-header text-[#9CA0A8] bg-table-header">
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Title</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Criteria</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Severity</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Risk</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Owner</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Due Date</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Status</th>
              <th className="text-right px-[16px] py-[10px] border-b border-border font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!findings || findings.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-[50px] text-[#6C7280]">
                  <p className="text-[12.5px]">No records found</p>
                  <p className="text-[11px] mt-1">Use “+ New Finding” to raise one against an audit</p>
                </td>
              </tr>
            ) : (
              findings.map((f, i) => (
                <tr key={f.id || i} className="cursor-pointer hover:bg-[#FBFAF3]" onClick={() => setSelected(f)}>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border font-medium">{f.title || f.name}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border max-w-[200px] truncate">{f.criteria || '—'}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className={`badge ${sevColor(f.severity)}`}>{f.severity || '—'}</span>
                  </td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className={`badge ${statusColor(f.riskLevel || f.risk_level)}`}>{f.riskLevel || f.risk_level || '—'}</span>
                  </td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{f.owner || '—'}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{fmtDate(f.dueDate || f.due_date)}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className={`badge ${statusColor(f.status)}`}>{f.status || 'Open'}</span>
                  </td>
                  <td className="px-[16px] py-[12px] border-b border-border text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { crud.clearError(); setEditing(f); }}
                      className="text-[11px] font-semibold border border-border rounded-md px-2.5 py-1 hover:bg-paper">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(f)}
                      className="ml-2 text-[11px] font-semibold border border-danger/30 text-danger rounded-md px-2.5 py-1 hover:bg-danger/10">
                      Remove
                    </button>
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

      <FindingDiscussion finding={selected} onClose={() => setSelected(null)} />

      <EntityFormModal
        open={creating}
        onClose={close}
        title="Raise a finding"
        intro="Criteria / condition / cause / consequence is the standard structure auditors use to make a finding defensible. Only the title and audit are required."
        fields={findingFields(auditList, false)}
        initial={{ severity: 'Medium', risk: 'Medium', status: 'Open' }}
        submitLabel="Create finding"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => crud.create(payload)}
      />

      <EntityFormModal
        open={!!editing}
        onClose={close}
        title={`Edit ${editing?.title || 'finding'}`}
        fields={findingFields(auditList, true)}
        initial={editing ? {
          title: editing.title,
          auditId: editing.auditId,
          severity: editing.severity,
          risk: editing.risk,
          owner: editing.owner,
          due: editing.due ? String(editing.due).slice(0, 10) : '',
          status: editing.status,
          controlId: editing.controlId,
          criteria: editing.criteria,
          condition: editing.condition,
          cause: editing.cause,
          consequence: editing.consequence,
          recommendation: editing.recommendation,
        } : {}}
        submitLabel="Save changes"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => crud.update(editing.id, payload)}
      />
    </div>
  );
}
