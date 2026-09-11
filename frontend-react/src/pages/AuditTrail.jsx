import { useState } from 'react';
import { useApi, fmtDate } from '../hooks/useApi';
import { ApiErrorState, EmptyState } from '../components/DataStateNotice';

const ENTITIES = ['All', 'Audit', 'Finding', 'CAPA', 'Evidence', 'Risk', 'Control', 'Document', 'Certificate', 'User', 'Organization', 'Vendor', 'Framework', 'Comment'];
const ACTIONS = ['All', 'create', 'update', 'delete'];

const ACTION_STYLE = {
  create: 'badge-success',
  update: 'badge-info',
  delete: 'badge-danger',
};

function summarise(changes) {
  if (!changes || typeof changes !== 'object') return '—';
  const keys = Object.keys(changes).filter(k => k !== 'orgId');
  if (!keys.length) return '—';
  return keys.slice(0, 4).map(k => {
    const v = changes[k];
    const text = v === null || v === undefined ? '—'
      : typeof v === 'object' ? JSON.stringify(v).slice(0, 30)
      : String(v).slice(0, 30);
    return `${k}: ${text}`;
  }).join(' · ') + (keys.length > 4 ? ` +${keys.length - 4} more` : '');
}

export default function AuditTrail() {
  const [entity, setEntity] = useState('All');
  const [action, setAction] = useState('All');

  const qs = new URLSearchParams();
  if (entity !== 'All') qs.set('entity', entity);
  if (action !== 'All') qs.set('action', action);
  const query = qs.toString();

  const { data: entries, loading, error, refetch } = useApi(`/api/auditlogs${query ? `?${query}` : ''}`);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Audit Trail</h1>
        <p className="text-sm text-gray-500">
          Append-only record of every change. Entries cannot be edited or deleted, including by administrators.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
          <span className="block mb-1">Entity</span>
          <select value={entity} onChange={e => setEntity(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-xs text-ink bg-surface font-normal normal-case tracking-normal">
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
          <span className="block mb-1">Action</span>
          <select value={action} onChange={e => setAction(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-xs text-ink bg-surface font-normal normal-case tracking-normal">
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>

      {loading && (
        <div className="bg-surface border border-border rounded-lg p-16 text-center text-sm text-gray-400">Loading…</div>
      )}

      {!loading && error && (
        <ApiErrorState entity="the audit trail" onRetry={refetch}
          message={typeof error === 'string' ? error : undefined} />
      )}

      {!loading && !error && (!entries || entries.length === 0) && (
        <EmptyState
          title="No audit entries yet"
          hint="Entries appear as soon as someone creates, updates or deletes a record."
        />
      )}

      {!loading && !error && entries && entries.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-paper/60">
                  {['When', 'Who', 'Action', 'Entity', 'Record', 'Details'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-400 font-semibold border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id || i} className="hover:bg-[#FBFAF3]">
                    <td className="px-4 py-2.5 text-xs text-gray-500 border-b border-border whitespace-nowrap">{fmtDate(e.timestamp)}</td>
                    <td className="px-4 py-2.5 text-xs text-ink border-b border-border">
                      <div className="font-medium">{e.actorName || '—'}</div>
                      <div className="text-[10px] text-gray-400">{e.actorRole || ''}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs border-b border-border">
                      <span className={`badge ${ACTION_STYLE[e.action] || 'badge-neutral'}`}>{e.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink border-b border-border">{e.entity}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-gray-500 border-b border-border">{e.entityId || '—'}</td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500 border-b border-border max-w-md truncate" title={JSON.stringify(e.changes)}>
                      {summarise(e.changes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
