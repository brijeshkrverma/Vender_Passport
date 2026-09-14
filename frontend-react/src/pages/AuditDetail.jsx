import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, statusColor, fmtDate } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import AuditQuestionnaireTab from '../components/AuditQuestionnaireTab';

const TABS = ['Overview', 'Lifecycle', 'Evidence', 'Findings', 'Questionnaire'];
const LIFECYCLE_STAGES = [
  'Planning','Scoping','Risk Assessment','Questionnaire','Auditor Assigned',
  'Execution','Evidence Review','Findings','Corrective Actions',
  'Verification','Report','Closed'
];

/**
 * Evidence attached to this audit, and the means to attach more.
 *
 * The tab used to be read-only and told you to "upload evidence from the
 * Evidence Repository and link it to findings" — but nothing in the repository
 * could set `relatedAuditId`, so the instruction pointed at a screen that could
 * not carry it out. The field, its index and `GET /by-audit/:id` all already
 * existed; only the way to set it was missing.
 */
function EvidenceTab({ auditId, authHeaders }) {
  const [linkedEvidence, setLinkedEvidence] = useState([]);
  const [available, setAvailable] = useState([]);
  const [picked, setPicked] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [linkedRes, allRes] = await Promise.all([
        fetch(`/api/evidence/by-audit/${auditId}`, { headers: authHeaders }),
        fetch('/api/evidence', { headers: authHeaders }),
      ]);
      const linked = linkedRes.ok ? ((await linkedRes.json()).data || []) : [];
      const all = allRes.ok ? ((await allRes.json()).data || []) : [];
      setLinkedEvidence(linked);
      // Offer only what is not already attached to some audit.
      setAvailable(all.filter((e) => !e.relatedAuditId));
    } catch {
      setError('Could not load evidence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (auditId) load(); }, [auditId, authHeaders]);

  async function setAudit(evidenceId, value) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/evidence/${evidenceId}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ relatedAuditId: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || body.error || `Request failed (HTTP ${res.status})`);
      } else {
        setPicked('');
        await load();
      }
    } catch {
      setError('Cannot reach the server.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading evidence...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-lg p-4 flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="link-evidence" className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
            Attach existing evidence
          </label>
          <select
            id="link-evidence"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            disabled={available.length === 0 || busy}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-seal/30 disabled:opacity-60"
          >
            <option value="">
              {available.length ? 'Select evidence...' : 'Nothing unattached in the repository'}
            </option>
            {available.map((e) => (
              <option key={e._id || e.id} value={e._id || e.id}>
                {e.name}{e.type ? ` (${e.type})` : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setAudit(picked, auditId)}
          disabled={!picked || busy}
          className="bg-seal text-white px-4 py-2 rounded text-sm font-semibold hover:bg-seal-dark disabled:opacity-50"
        >
          Attach
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {linkedEvidence.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-2xl mb-2">&#128274;</div>
          <p className="text-sm">No evidence attached to this audit yet</p>
          <p className="text-[11px] mt-1">Use the picker above, or upload it first in the Evidence repository</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {linkedEvidence.map(e => (
            <div key={e._id || e.id} className="bg-surface border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold text-ink-900 mb-1">{e.name || e.title}</h4>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {e.type && <span className="badge badge-neutral text-[10px]">{e.type}</span>}
                <span className={`badge text-[10px] ${statusColor(e.status)}`}>{e.status || 'Pending'}</span>
              </div>
              {e.uploadedBy && <p className="text-[10px] text-gray-400">Uploaded by {e.uploadedBy}</p>}
              {e.expiry && <p className="text-[10px] text-gray-400">Expires {fmtDate(e.expiry)}</p>}
              <button
                onClick={() => setAudit(e._id || e.id, null)}
                disabled={busy}
                className="mt-3 text-[11px] font-semibold border border-border rounded-md px-2.5 py-1 hover:bg-paper disabled:opacity-50"
              >
                Detach
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FindingsTab({ auditId, authHeaders }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auditId) return;
    setLoading(true);
    fetch(`/api/findings?auditId=${auditId}`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(json => {
        setFindings(json?.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [auditId]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading findings...</div>;

  if (findings.length === 0) {
    return <div className="text-center py-12 text-gray-400">No findings for this audit</div>;
  }

  return (
    <div className="space-y-3">
      {findings.map(f => (
        <div key={f._id || f.id} className="bg-surface border border-border rounded-lg p-4 flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-ink-900">{f.title || f.name}</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">{f.criteria || ''}</p>
          </div>
          <span className={`badge ${statusColor(f.severity)}`}>{f.severity || '—'}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const { data: audit, loading, refetch } = useApi(`/api/audits/${id}`);
  const { authHeaders, user: me } = useAuth();
  const [newAuditor, setNewAuditor] = useState('');
  const [auditorOptions, setAuditorOptions] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Not /api/users — that router is admin-only, so an Audit Manager or
    // Compliance Manager got a 403 and this list silently stayed empty.
    fetch('/api/audits/assignable-auditors', { headers: authHeaders })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled) return;
        const list = json?.data ?? [];
        setAuditorOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => { if (!cancelled) setAuditorOptions([]); });
    return () => { cancelled = true; };
  }, [authHeaders]);

  const [actionError, setActionError] = useState('');

  // Offer only people the server would actually accept: exclude anyone already
  // on the audit, and the current user (self-appointment is rejected).
  const selectableAuditors = (auditorOptions || []).filter(
    (u) => !(audit?.auditors || []).includes(u.name) && u.name !== me?.name
  );

  /** Read the server's reason out of a failed response so it can be shown. */
  async function reasonFor(res) {
    const body = await res.json().catch(() => ({}));
    if (Array.isArray(body.errors) && body.errors.length) {
      return body.errors.map(e => `${e.field}: ${e.message}`).join(' · ');
    }
    return body.message || body.error || `Request failed (HTTP ${res.status})`;
  }

  async function assignAuditor(e) {
    e.preventDefault();
    if (!newAuditor.trim()) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await fetch(`/api/audits/${id}/assign-auditor`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ auditor: newAuditor.trim() })
      });
      if (res.ok) { setNewAuditor(''); refetch(); }
      else setActionError(await reasonFor(res));
    } catch (e) { setActionError('Cannot reach the server.'); }
    setBusy(false);
  }

  async function unassignAuditor(name) {
    setBusy(true);
    setActionError('');
    try {
      const res = await fetch(`/api/audits/${id}/unassign-auditor`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ auditor: name })
      });
      if (res.ok) refetch();
      else setActionError(await reasonFor(res));
    } catch (e) { setActionError('Cannot reach the server.'); }
    setBusy(false);
  }

  /**
   * Move the audit one lifecycle stage. These two calls previously went out
   * WITHOUT the Authorization header, so the server answered 401 and the code
   * reloaded the page anyway — the button appeared to do nothing at all.
   */
  async function changeStage(direction) {
    setBusy(true);
    setActionError('');
    try {
      const res = await fetch(`/api/audits/${id}/${direction}`, {
        method: 'POST', headers: authHeaders,
      });
      if (res.ok) refetch();
      else setActionError(await reasonFor(res));
    } catch (e) { setActionError('Cannot reach the server.'); }
    setBusy(false);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading audit...</div>;
  if (!audit) return <div className="text-center py-12 text-gray-400">Audit not found</div>;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/audits')} className="text-sm text-gray-400 hover:text-gray-600">&larr; Back to Audits</button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">{audit.title}</h1>
          <p className="text-sm text-gray-500">{audit.type} · {audit.frameworkId || 'N/A'} · Due {fmtDate(audit.due)}</p>
        </div>
        <div className="flex gap-2">
          <span className={`badge ${statusColor(audit.status)}`}>{audit.status}</span>
          {audit.party && <span className="badge badge-neutral uppercase text-[9px]">{audit.party.replace('-',' ')}</span>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab===t ? 'text-seal-dark border-seal' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-[1.5fr_1fr] gap-4">
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-lg p-5">
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Scope</h4>
              <p className="text-sm leading-relaxed">{audit.scope || 'No scope defined'}</p>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mt-4 mb-3">Progress</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-seal rounded-full" style={{width:`${Math.min(100, Math.round((Math.min(audit.stageIdx, 11)+1)/12*100))}%`}} />
                </div>
                <span className="text-xs font-mono text-gray-400">{Math.min(100, Math.round((Math.min(audit.stageIdx, 11)+1)/12*100))}%</span>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-5">
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Actions</h4>
              {actionError && (
                <div role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {actionError}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => changeStage('advance')} disabled={busy}
                  className="bg-seal text-white px-4 py-2 rounded text-sm font-semibold hover:bg-seal-dark disabled:opacity-50">
                  Advance Stage &rarr;
                </button>
                <button onClick={() => changeStage('retreat')} disabled={busy}
                  className="border border-border px-4 py-2 rounded text-sm text-gray-500 hover:bg-paper disabled:opacity-50">
                  &larr; Back
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-lg p-5">
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Details</h4>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-gray-400">Lead</dt><dd className="font-medium">{audit.lead || '—'}</dd>
                <dt className="text-gray-400">Start</dt><dd className="font-mono text-xs">{fmtDate(audit.start)}</dd>
                <dt className="text-gray-400">Due</dt><dd className="font-mono text-xs">{fmtDate(audit.due)}</dd>
                <dt className="text-gray-400">Risk</dt><dd><span className={`badge ${statusColor(audit.riskLevel)}`}>{audit.riskLevel}</span></dd>
              </dl>
            </div>

            <div className="bg-surface border border-border rounded-lg p-5">
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Audit Team</h4>
              {(audit.auditors || []).length === 0 ? (
                <p className="text-xs text-gray-400 mb-3">No auditors assigned yet</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(audit.auditors || []).map((name) => (
                    <span key={name} className="inline-flex items-center gap-1.5 text-xs font-medium bg-seal-bg text-seal-dark border border-seal/30 rounded-full px-2.5 py-1">
                      {name}
                      {name === audit.lead && <span className="text-[9px] uppercase tracking-wide text-seal-dark/70">· lead</span>}
                      <button onClick={() => unassignAuditor(name)} disabled={busy}
                        className="ml-0.5 text-seal-dark/60 hover:text-danger font-bold" title="Remove" aria-label={`Remove ${name}`}>&times;</button>
                    </span>
                  ))}
                </div>
              )}
              {/* A picker, not a text box: the server only accepts an active
                  user of this organization who holds an audit-capable role, so
                  a typed name was a guess that usually failed validation. */}
              <form onSubmit={assignAuditor} className="flex gap-2">
                <select
                  value={newAuditor}
                  onChange={(e) => setNewAuditor(e.target.value)}
                  disabled={selectableAuditors.length === 0}
                  className="flex-1 border border-border rounded px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-seal/30 disabled:opacity-60"
                >
                  <option value="">
                    {selectableAuditors.length ? 'Select an auditor…' : 'No eligible auditors available'}
                  </option>
                  {selectableAuditors.map((u) => (
                    <option key={u.id || u._id || u.name} value={u.name}>
                      {u.name} — {u.role}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={busy || !newAuditor}
                  className="bg-seal text-white px-4 py-2 rounded text-sm font-semibold hover:bg-seal-dark disabled:opacity-50">Assign</button>
              </form>
              <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                Only active Auditors, Audit Managers and CA / Consultants in your organization appear here.
                People already on this audit — and you yourself — are excluded, because nobody may staff
                themselves onto an audit they administer.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'Lifecycle' && (
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex overflow-x-auto gap-0 pb-4">
            {LIFECYCLE_STAGES.map((stage, i) => (
              <div key={stage} className="flex-shrink-0 w-[110px] text-center relative px-1">
                {i < LIFECYCLE_STAGES.length-1 && (
                  <div className={`absolute top-4 left-[58%] w-full h-0.5 ${i < audit.stageIdx ? 'bg-success' : 'bg-gray-200'}`} />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 relative z-10 text-xs font-bold border-2 ${
                  i < audit.stageIdx ? 'bg-success border-success text-white' :
                  i === audit.stageIdx ? 'bg-seal border-seal text-white shadow-[0_0_0_4px_rgba(184,134,59,.18)]' :
                  'bg-surface border-gray-200 text-gray-400'
                }`}>
                  {i < audit.stageIdx ? '\u2713' : i + 1}
                </div>
                <div className={`text-[10px] font-semibold leading-tight ${i <= audit.stageIdx ? 'text-ink-900' : 'text-gray-400'}`}>{stage}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Evidence' && <EvidenceTab auditId={id} authHeaders={authHeaders} />}
      {tab === 'Findings' && <FindingsTab auditId={id} authHeaders={authHeaders} />}
      {tab === 'Questionnaire' && <AuditQuestionnaireTab auditId={id} audit={audit} />}
    </div>
  );
}
