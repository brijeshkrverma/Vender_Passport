import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { statusColor, fmtDate } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import Pagination from '../components/Pagination';

const DOC_TYPES = [
  'Policy', 'Certificate', 'Audit Evidence', 'Contract', 'Training Record',
  'Procedure', 'Compliance Document', 'Other',
];

const DOC_STATUSES = ['Draft', 'Approved', 'Verified', 'Under Review', 'Expired', 'Revoked'];

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadFile(id, authHeaders, filename) {
  const res = await fetch(`/api/documents/${id}/download`, { headers: { Authorization: authHeaders.Authorization } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function UploadModal({ onClose, authHeaders, onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('Other');
  const [version, setVersion] = useState('1.0');
  const [status, setStatus] = useState('Draft');
  const [expiry, setExpiry] = useState('');
  const [relatedAuditId, setRelatedAuditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!file) { setError('Please choose a file to upload'); return; }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (name.trim()) fd.append('name', name.trim());
      fd.append('type', type);
      fd.append('version', version || '1.0');
      fd.append('status', status);
      if (expiry) fd.append('expiry', expiry);
      if (relatedAuditId.trim()) fd.append('relatedAuditId', relatedAuditId.trim());
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: authHeaders.Authorization },
        body: fd,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || `HTTP ${res.status}`);
      }
      onUploaded();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-ink-900 mb-4">Upload Document</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">File *</label>
            <input type="file" onChange={e => {
              setFile(e.target.files[0] || null);
              if (!name) setName(e.target.files[0]?.name || '');
            }}
              className="w-full mt-1 text-xs text-gray-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-seal file:text-white file:text-xs file:font-medium hover:file:bg-seal-dark"
            />
            {file && <p className="text-[10px] text-gray-400 mt-1">{file.name} · {formatBytes(file.size)}</p>}
          </div>

          <div>
            <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              placeholder="Document name (defaults to file name)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              >
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              >
                {DOC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Version</label>
              <input value={version} onChange={e => setVersion(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Expiry</label>
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Related Audit ID (optional)</label>
            <input value={relatedAuditId} onChange={e => setRelatedAuditId(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              placeholder="e.g. AUD-2026-014"
            />
          </div>

          {error && <div className="text-xs text-danger">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg hover:bg-paper">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-xs bg-seal text-white rounded-lg hover:bg-seal-dark disabled:opacity-50"
          >{saving ? 'Uploading...' : 'Upload'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Documents() {
  const { user, authHeaders } = useAuth();
  const [typeFilter, setTypeFilter] = useState('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const params = useMemo(() => typeFilter === 'All' ? {} : { type: typeFilter }, [typeFilter]);
  const { data: documents, loading, error, pagination, page, setPage, refetch } = usePaginatedApi('/api/documents', params);

  const types = useMemo(() => {
    if (!documents) return [];
    const typs = [...new Set(documents.map((d) => d.type).filter(Boolean))];
    return ['All', ...typs.sort()];
  }, [documents]);

  const filtered = !documents ? [] : documents;

  const handleDownload = async (d) => {
    try {
      await downloadFile(d._id || d.id, authHeaders, d.name);
    } catch {
      alert('Download failed — file not found on server');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Document Library</h1>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Document Library</h1>
          <p className="text-sm text-gray-500">Central repository for all compliance documents</p>
        </div>
        <button onClick={() => setUploadOpen(true)}
          className="px-4 py-2 text-xs bg-seal text-white rounded-lg hover:bg-seal-dark font-medium"
        >+ Upload Document</button>
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">Type:</label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
        >
          {types.map((t) => (
            <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-paper/50 text-gray-500">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Version</th>
              <th className="text-left px-4 py-3 font-medium">Uploaded By</th>
              <th className="text-left px-4 py-3 font-medium">Uploaded</th>
              <th className="text-left px-4 py-3 font-medium">Expiry</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">File</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-400">
                  <div className="text-2xl mb-2">&#128196;</div>
                  <p className="text-sm">No documents found</p>
                  <p className="text-[11px] mt-1">Upload documents to populate the library</p>
                </td>
              </tr>
            ) : (
              filtered.map((d, i) => (
                <tr key={d.id || i} className="border-b border-border/50 hover:bg-paper transition-colors">
                  <td className="px-4 py-3 text-ink-900 font-medium">{d.name || d.title}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-neutral">{d.type || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.version || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{d.uploadedBy || d.uploaded_by || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(d.uploadedDate || d.uploaded_date || d.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(d.expiryDate || d.expiry_date || d.expiry)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColor(d.status)}`}>{d.status || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {d.filePath ? (
                      <button onClick={() => handleDownload(d)}
                        className="text-seal hover:text-seal-dark font-medium">Download{d.fileSize ? ` · ${formatBytes(d.fileSize)}` : ''}</button>
                    ) : '—'}
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

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          authHeaders={authHeaders}
          onUploaded={refetch}
        />
      )}
    </div>
  );
}
