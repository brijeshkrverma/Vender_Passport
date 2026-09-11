import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi, statusColor, fmtDate } from '../hooks/useApi';

const LINK_TYPES = [
  { value: 'finding', label: 'Finding' },
  { value: 'control', label: 'Control' },
  { value: 'question', label: 'Question' },
];

const EVIDENCE_TYPES = [
  'Document', 'Image', 'PDF', 'Excel', 'Video', 'Email', 'Log',
  'Screenshot', 'System Record', 'API Data', 'Interview Note', 'Observation',
];

const CONFIDENTIALITY_LEVELS = ['public', 'internal', 'confidential', 'restricted'];

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadFile(id, authHeaders, filename) {
  const res = await fetch(`/api/evidence/${id}/download`, { headers: { Authorization: authHeaders.Authorization } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'evidence';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function UploadModal({ onClose, authHeaders, onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('Document');
  const [confidentiality, setConfidentiality] = useState('internal');
  const [expiry, setExpiry] = useState('');
  const [relatedAuditId, setRelatedAuditId] = useState('');
  const [version, setVersion] = useState('1.0');
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
      fd.append('confidentiality', confidentiality);
      fd.append('version', version || '1.0');
      if (expiry) fd.append('expiry', expiry);
      if (relatedAuditId.trim()) fd.append('relatedAuditId', relatedAuditId.trim());
      const res = await fetch('/api/evidence/upload', {
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
        <h3 className="text-sm font-semibold text-ink-900 mb-4">Upload Evidence</h3>

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
              placeholder="Evidence name (defaults to file name)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              >
                {EVIDENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Confidentiality</label>
              <select value={confidentiality} onChange={e => setConfidentiality(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              >
                {CONFIDENTIALITY_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Expiry</label>
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Version</label>
              <input value={version} onChange={e => setVersion(e.target.value)}
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

function LinkModal({ evidenceId, onClose, authHeaders, onLinked }) {
  const [targetType, setTargetType] = useState('finding');
  const [targetId, setTargetId] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: findings } = useApi(targetType === 'finding' ? '/api/findings' : null);
  const { data: controls } = useApi(targetType === 'control' ? '/api/controls' : null);
  // Questions come from the one question collection. This used to walk a
  // template's nested `questions` array from a second, older model whose
  // questions were invisible to the questionnaire anyone actually filled in.
  const { data: questions } = useApi(targetType === 'question' ? '/api/questionnaires?limit=200' : null);

  const targetOptions = useMemo(() => {
    if (targetType === 'finding' && findings) return findings.map(f => ({ id: f._id || f.id, title: f.title || f.name }));
    if (targetType === 'control' && controls) return controls.map(c => ({ id: c._id || c.id, title: c.name || c.title }));
    if (targetType === 'question') {
      return (questions || []).map(q => ({
        id: q._id || q.id,
        // Questions are stored as HTML; a picker needs the words, not the markup.
        title: String(q.question || '').replace(/<[^>]*>/g, '').trim().slice(0, 90) || 'Untitled question',
        template: [q.category, q.section].filter(Boolean).join(' · '),
      }));
    }
    return [];
  }, [targetType, findings, controls, questions]);

  useEffect(() => {
    setTargetId('');
    setTargetTitle('');
  }, [targetType]);

  const handleSelect = (id, title) => {
    setTargetId(id);
    setTargetTitle(title);
  };

  const handleSave = async () => {
    if (!targetId) { setError('Please select a target'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/evidence/${evidenceId}/links`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ targetType, targetId, targetTitle, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onLinked();
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
        <h3 className="text-sm font-semibold text-ink-900 mb-4">Link Evidence</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Target Type</label>
            <div className="flex gap-2 mt-1">
              {LINK_TYPES.map(t => (
                <button key={t.value} onClick={() => setTargetType(t.value)}
                  className={`px-3 py-1.5 text-xs rounded-full border ${
                    targetType === t.value
                      ? 'bg-seal text-white border-seal'
                      : 'border-border bg-surface text-ink-900 hover:bg-paper'
                  }`}
                >{t.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">
              {targetType === 'question' ? 'Question' : targetType === 'control' ? 'Control' : 'Finding'}
            </label>
            <div className="mt-1 max-h-40 overflow-y-auto border border-border rounded-lg">
              {targetOptions.length === 0 ? (
                <div className="p-3 text-xs text-gray-400 text-center">
                  {targetType === 'question' ? 'No questions available' : 'Loading...'}
                </div>
              ) : (
                targetOptions.map(o => (
                  <div key={o.id}
                    onClick={() => handleSelect(o.id, o.title)}
                    className={`px-3 py-2 text-xs cursor-pointer border-b border-border/50 last:border-b-0 ${
                      targetId === o.id ? 'bg-seal/10 text-seal-dark font-medium' : 'hover:bg-paper'
                    }`}
                  >
                    {o.title}
                    {o.template && <span className="text-gray-400 ml-1">({o.template})</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          {targetTitle && (
            <div>
              <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Selected</label>
              <div className="mt-1 px-3 py-2 bg-seal/5 border border-seal/20 rounded-lg text-xs text-ink-900">{targetTitle}</div>
            </div>
          )}

          <div>
            <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs border border-border rounded-lg bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
              rows={2} placeholder="Add notes about this link..."
            />
          </div>

          {error && <div className="text-xs text-danger">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg hover:bg-paper">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-xs bg-seal text-white rounded-lg hover:bg-seal-dark disabled:opacity-50"
          >{saving ? 'Linking...' : 'Link Evidence'}</button>
        </div>
      </div>
    </div>
  );
}

function LinkBadge({ targetType }) {
  const colors = { finding: 'badge-danger', control: 'badge-info', question: 'badge-violet' };
  return <span className={`badge text-[9px] ${colors[targetType] || 'badge-neutral'}`}>{targetType}</span>;
}

export default function Evidence() {
  const { authHeaders } = useAuth();
  const { data: evidence, loading, error, refetch } = useApi('/api/evidence');
  const [typeFilter, setTypeFilter] = useState('All');
  const [linkModalId, setLinkModalId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linksMap, setLinksMap] = useState({});

  const types = useMemo(() => {
    if (!evidence) return [];
    const typs = [...new Set(evidence.map((e) => e.type).filter(Boolean))];
    return ['All', ...typs.sort()];
  }, [evidence]);

  const filtered = !evidence ? [] : typeFilter === 'All' ? evidence : evidence.filter((e) => e.type === typeFilter);

  const fetchLinks = async (evidenceId) => {
    try {
      const res = await fetch(`/api/evidence/${evidenceId}/links`, { headers: authHeaders });
      if (!res.ok) return;
      const json = await res.json();
      setLinksMap(prev => ({ ...prev, [evidenceId]: json.data || [] }));
    } catch {}
  };

  useEffect(() => {
    if (!evidence) return;
    evidence.forEach(e => {
      const eid = e._id || e.id;
      if (!linksMap[eid]) fetchLinks(eid);
    });
  }, [evidence]);

  const handleLinked = () => {
    fetchLinks(linkModalId);
    refetch();
  };

  const handleUnlink = async (evidenceId, linkId) => {
    try {
      const res = await fetch(`/api/evidence/${evidenceId}/links/${linkId}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchLinks(evidenceId);
    } catch {}
  };

  const confidentialityColor = (level) => {
    const map = { 'Public': 'badge-success', 'Internal': 'badge-info', 'Confidential': 'badge-warning', 'Restricted': 'badge-danger' };
    return map[level] || 'badge-neutral';
  };

  const handleDownload = async (e) => {
    const eid = e._id || e.id;
    try {
      await downloadFile(eid, authHeaders, e.name || e.filePath);
    } catch {
      alert('Download failed — file not found on server');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Evidence Repository</h1>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Evidence Repository</h1>
          <p className="text-sm text-gray-500">Chain of custody for all compliance evidence</p>
        </div>
        <button onClick={() => setUploadOpen(true)}
          className="px-4 py-2 text-xs bg-seal text-white rounded-lg hover:bg-seal-dark font-medium"
        >+ Upload Evidence</button>
      </div>

      {error && <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>}

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">Type:</label>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
        >
          {types.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-surface border border-border rounded-lg">
          <div className="text-2xl mb-2">&#128274;</div>
          <p className="text-sm">No evidence items found</p>
          <p className="text-[11px] mt-1">Upload evidence to populate the repository</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e, i) => {
            const eid = e._id || e.id;
            const links = linksMap[eid] || [];
            return (
              <div key={eid || i} className="bg-surface border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-ink-900">{e.name || e.title}</h3>
                  <span className={`badge text-[10px] ${statusColor(e.status)}`}>{e.status || 'Pending'}</span>
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {e.type && <span className="badge badge-neutral text-[10px]">{e.type}</span>}
                  {e.confidentiality && <span className={`badge text-[10px] ${confidentialityColor(e.confidentiality)}`}>{e.confidentiality}</span>}
                </div>

                {e.fileSize !== undefined && e.fileSize !== null && (
                  <div className="text-[10px] text-gray-400 mb-2">{formatBytes(e.fileSize)}{e.mimeType ? ` · ${e.mimeType}` : ''}</div>
                )}

                {e.filePath && (
                  <button onClick={() => handleDownload(e)}
                    className="mb-3 inline-flex items-center gap-1 px-3 py-1.5 text-[10px] border border-seal/30 text-seal rounded-lg hover:bg-seal/5 font-medium">
                    &#8681; Download
                  </button>
                )}

                {/* Linked Targets */}
                {links.length > 0 && (
                  <div className="mb-3 space-y-1">
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Linked To</div>
                    {links.map(link => (
                      <div key={link._id} className="flex items-center justify-between gap-1 px-2 py-1 bg-paper rounded text-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <LinkBadge targetType={link.targetType} />
                          <span className="truncate text-ink-900">{link.targetTitle || link.targetId}</span>
                        </div>
                        <button onClick={() => handleUnlink(eid, link._id)}
                          className="text-gray-400 hover:text-danger flex-shrink-0">&#x2715;</button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setLinkModalId(eid)}
                  className="text-[10px] text-seal hover:text-seal-dark font-medium">
                  + Link to {links.length > 0 ? 'another' : 'finding / control / question'}
                </button>

                {e.chainOfCustody || e.chain_of_custody ? (
                  <div className="space-y-1.5 mt-2">
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Chain of Custody</div>
                    {(e.chainOfCustody || e.chain_of_custody || []).map((entry, j) => (
                      <div key={j} className="flex items-center gap-2 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-seal flex-shrink-0" />
                        <span className="text-gray-500">{entry.action || entry.event}:</span>
                        <span className="text-gray-400">{fmtDate(entry.date || entry.timestamp)}</span>
                        {entry.user && <span className="text-gray-300">by {entry.user}</span>}
                      </div>
                    ))}
                  </div>
                ) : e.custody ? (
                  <div className="text-[10px] text-gray-400 mt-2">{e.custody}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          authHeaders={authHeaders}
          onUploaded={refetch}
        />
      )}

      {linkModalId && (
        <LinkModal
          evidenceId={linkModalId}
          onClose={() => setLinkModalId(null)}
          authHeaders={authHeaders}
          onLinked={handleLinked}
        />
      )}
    </div>
  );
}
