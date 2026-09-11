import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Stepper from '../components/Stepper';
import { useAuth } from '../context/AuthContext';

const STEPS = ['Type & Title', 'Framework', 'Scope & Risk', 'Assign Auditor', 'Dates', 'Review'];
const TYPES = ['Financial Audit','Internal Audit','Operational Audit','Compliance Audit','IT Audit','Cybersecurity Audit','Information Security Audit','Quality Audit','Environmental Audit','Health & Safety Audit','ESG/Sustainability Audit','Supplier/Vendor Audit','Fraud Audit','Forensic Audit','Custom Audit'];
const PARTIES = ['first-party','second-party','third-party'];
const RISK_LEVELS = ['Low','Medium','High','Critical'];

export default function CreateAudit({ open, onClose }) {
  const { user, authHeaders } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title:'', type:'', party:'first-party', frameworkId:'', scope:'', riskLevel:'Medium', lead:'', start:'', due:'' });
  const [frameworks, setFrameworks] = useState([]);
  const [loadingFrameworks, setLoadingFrameworks] = useState(true);
  const [auditors, setAuditors] = useState([]);
  const [loadingAuditors, setLoadingAuditors] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoadingAuditors(true);
    fetch('/api/audits/assignable-auditors', { headers: authHeaders })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(res => {
        const list = res.data || res;
        setAuditors(Array.isArray(list) ? list : []);
      })
      .catch(() => setAuditors([]))
      .finally(() => setLoadingAuditors(false));
  }, [open, authHeaders]);

  useEffect(() => {
    if (!open) return;
    setLoadingFrameworks(true);
    fetch('/api/frameworks', { headers: authHeaders })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(res => {
        const list = res.data || res;
        setFrameworks(Array.isArray(list) ? list : []);
      })
      .catch(() => setFrameworks([]))
      .finally(() => setLoadingFrameworks(false));
  }, [open, authHeaders]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function finish(step) {
    if (step === -1) return onClose();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/audits', { method:'POST', headers:authHeaders, body:JSON.stringify(form) });
      const body = await res.json().catch(() => ({}));
      // Previously the status was ignored: a 400 or 403 still closed the modal
      // and navigated away, so a failed create looked exactly like a successful
      // one and the user never learned why nothing appeared in the list.
      if (!res.ok) {
        const fieldErrors = Array.isArray(body.errors)
          ? body.errors.map(e => `${e.field}: ${e.message}`).join(' · ')
          : '';
        setError(fieldErrors || body.message || body.error || `Could not create audit (HTTP ${res.status})`);
        return;
      }
      onClose();
      navigate('/audits');
    } catch (e) {
      setError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Audit">
      {error && (
        <div role="alert" className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
      {saving && <div className="mb-3 text-xs text-gray-500">Creating audit…</div>}
      <Stepper steps={STEPS} onFinish={finish} finishLabel="Create Audit">
        {/* Step 1: Type & Title */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Select type</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {TYPES.map(t => (
              <button key={t} onClick={() => setForm({...form, type:t})}
                className={`text-xs px-3 py-2 rounded border font-semibold text-left ${form.type===t?'border-seal bg-seal-bg text-seal-dark':'border-border hover:bg-paper'}`}>{t}</button>
            ))}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Party</div>
          <div className="flex gap-2 mb-4">
            {PARTIES.map(p => (
              <button key={p} onClick={() => setForm({...form, party:p})}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold ${form.party===p?'bg-ink-900 text-white':'bg-gray-100 text-gray-500'}`}>{p.replace('-',' ')}</button>
            ))}
          </div>
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">Title</label>
          <input value={form.title} onChange={e => setForm({...form, title:e.target.value})}
            className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seal/30" placeholder="e.g. Annual ISO 27001 Surveillance Audit" />
        </div>
        {/* Step 2: Framework */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">Select framework</div>
          {loadingFrameworks ? (
            <div className="text-sm text-gray-400 py-8 text-center">Loading frameworks...</div>
          ) : frameworks.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 text-center text-xs">No frameworks available. Create one in Framework Taxonomy first.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {frameworks.map(f => (
                <button key={f._id} onClick={() => setForm({...form, frameworkId:f.name})}
                  className={`text-xs px-3 py-2 rounded border font-semibold ${form.frameworkId===f.name?'border-seal bg-seal-bg text-seal-dark':'border-border hover:bg-paper'}`}>{f.name}</button>
              ))}
            </div>
          )}
        </div>
        {/* Step 3: Scope & Risk */}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">Scope</label>
            <textarea value={form.scope} onChange={e => setForm({...form, scope:e.target.value})} rows={3}
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seal/30" placeholder="Describe boundaries, systems, locations..." />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">Risk Level</label>
            <div className="flex gap-2">
              {RISK_LEVELS.map(r => (
                <button key={r} onClick={() => setForm({...form, riskLevel:r})}
                  className={`flex-1 text-center py-2 rounded border text-xs font-semibold ${form.riskLevel===r?'border-seal bg-seal-bg text-seal-dark':'border-border'}`}>{r}</button>
              ))}
            </div>
          </div>
        </div>
        {/* Step 4: Assign Auditor */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-2">Lead Auditor</label>
          {/* Picked, not typed: a free-text lead produced audits naming people
              who did not exist, and the assign step rejects such names anyway. */}
          <select
            value={form.lead}
            onChange={e => setForm({ ...form, lead: e.target.value })}
            disabled={auditors.length === 0}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-seal/30 disabled:opacity-60"
          >
            <option value="">
              {loadingAuditors
                ? 'Loading auditors…'
                : auditors.length ? 'Select a lead auditor…' : 'No eligible auditors in your organization'}
            </option>
            {auditors.map(u => (
              <option key={u.id || u._id || u.name} value={u.name}>{u.name} — {u.role}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-2">
            {auditors.length === 0 && !loadingAuditors
              ? 'Add an Auditor, Audit Manager or CA / Consultant under Users first — or leave this blank and assign later.'
              : 'Optional. You can add more auditors after creation.'}
          </p>
        </div>
        {/* Step 5: Dates */}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">Start Date</label>
            <input type="date" value={form.start} onChange={e => setForm({...form, start:e.target.value})}
              className="border border-border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">Due Date</label>
            <input type="date" value={form.due} onChange={e => setForm({...form, due:e.target.value})}
              className="border border-border rounded px-3 py-2 text-sm" />
          </div>
        </div>
        {/* Step 6: Review */}
        <div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-gray-400">Title</dt><dd className="font-medium">{form.title || '\u2014'}</dd>
            <dt className="text-gray-400">Type</dt><dd>{form.type||'\u2014'}</dd>
            <dt className="text-gray-400">Party</dt><dd>{form.party.replace('-',' ')}</dd>
            <dt className="text-gray-400">Framework</dt><dd>{form.frameworkId||'\u2014'}</dd>
            <dt className="text-gray-400">Risk</dt><dd className={`badge ${form.riskLevel==='Critical'?'badge-danger':form.riskLevel==='High'?'badge-warning':'badge-info'}`}>{form.riskLevel}</dd>
            <dt className="text-gray-400">Lead</dt><dd>{form.lead||'\u2014'}</dd>
            <dt className="text-gray-400">Start</dt><dd>{form.start||'\u2014'}</dd>
            <dt className="text-gray-400">Due</dt><dd>{form.due||'\u2014'}</dd>
          </dl>
        </div>
      </Stepper>
    </Modal>
  );
}
