import { useState, useCallback } from 'react';
import { useApi, statusColor, fmtDate, daysLeft } from '../hooks/useApi';
import { useCrud } from '../hooks/useCrud';
import EntityFormModal from '../components/EntityFormModal';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';

const TABS = ['All', 'Active', 'Expiring Soon', 'Expired'];

// `expiry` is the one required field: a certificate with no expiry cannot drive
// the renewal alerts that are the point of tracking it.
const CERT_FIELDS = [
  { name: 'name', label: 'Certificate', required: true, span: 2, placeholder: 'ISO/IEC 27001:2022' },
  { name: 'number', label: 'Certificate number', placeholder: 'IS 712345' },
  { name: 'issuer', label: 'Issued by', placeholder: 'BSI' },
  { name: 'holder', label: 'Held by', placeholder: 'Organization named on the certificate' },
  { name: 'type', label: 'Type', placeholder: 'Management system' },
  { name: 'issue', label: 'Issue date', type: 'date' },
  { name: 'expiry', label: 'Expiry date', type: 'date', required: true },
  {
    name: 'status', label: 'Status', type: 'select',
    options: ['Active', 'Expiring Soon', 'Expired', 'Revoked'], placeholder: 'Active',
  },
];

function ExpiryBar({ expiryDate }) {
  if (!expiryDate) return <span className="text-gray-400">—</span>;
  const left = daysLeft(expiryDate);
  const pct = Math.max(0, Math.min(100, left > 365 ? 0 : Math.round(((365 - left) / 365) * 100)));
  const color = left < 0 ? 'bg-danger' : left <= 30 ? 'bg-warning' : left <= 90 ? 'bg-seal' : 'bg-success';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-semibold ${left < 0 ? 'text-danger' : left <= 30 ? 'text-warning' : 'text-gray-500'}`}>
        {left < 0 ? 'Expired' : `${left}d`}
      </span>
    </div>
  );
}

export default function Certificates() {
  const { data: certs, loading, error, refetch } = useApi('/api/certificates');
  const [tab, setTab] = useState('All');
  const [creating, setCreating] = useState(false);
  const close = useCallback(() => setCreating(false), []);
  const crud = useCrud('/api/certificates', { onDone: async () => { await refetch(); close(); } });

  // "+ Create" in the top bar deep-links here with ?new=1.
  useCreateFromUrl(useCallback(() => setCreating(true), []));

  const filtered = !certs ? [] : (() => {
    if (tab === 'All') return certs;
    if (tab === 'Expiring Soon') return certs.filter(c => {
      const left = daysLeft(c.expiryDate || c.expiry_date);
      return left > 0 && left <= 90;
    });
    if (tab === 'Expired') return certs.filter(c => daysLeft(c.expiryDate || c.expiry_date) < 0);
    return certs.filter(c => c.status === tab);
  })();

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Certificates</h1>
          <p className="page-sub">Track certifications across your vendor network</p>
        </div>
        <div className="text-center py-[50px] text-[#6C7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Certificates</h1>
          <p className="page-sub">Track certifications across your vendor network</p>
        </div>
        <button
          onClick={() => { crud.clearError(); setCreating(true); }}
          className="text-xs font-semibold bg-seal text-white rounded-lg px-4 py-2 hover:bg-seal-dark"
        >
          + Add Certificate
        </button>
      </div>

      {crud.error && !creating && (
        <div role="alert" className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{crud.error}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'filter-pill filter-pill-active' : 'filter-pill'}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-table-header text-[#9CA0A8] bg-table-header">
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Name</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Holder</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Issuer</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Issue Date</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Expiry Date</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Days Left</th>
              <th className="text-left px-[16px] py-[10px] border-b border-border font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-[50px] text-[#6C7280]">
                  <p className="text-[12.5px]">No records found</p>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.id || i} className="cursor-pointer hover:bg-[#FBFAF3]">
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border font-medium">{c.name || c.title}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{c.holder || c.organization || '—'}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{c.issuer || '—'}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{fmtDate(c.issueDate || c.issue_date)}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">{fmtDate(c.expiryDate || c.expiry_date)}</td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <ExpiryBar expiryDate={c.expiryDate || c.expiry_date} />
                  </td>
                  <td className="px-[16px] py-[12px] text-table-cell text-ink border-b border-border">
                    <span className={`badge ${statusColor(c.status)}`}>{c.status || '—'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EntityFormModal
        open={creating}
        onClose={close}
        title="Add a certificate"
        intro="The expiry date drives the renewal alerts, so it is required."
        fields={CERT_FIELDS}
        initial={{ status: 'Active' }}
        submitLabel="Add certificate"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => crud.create(payload)}
      />
    </div>
  );
}
