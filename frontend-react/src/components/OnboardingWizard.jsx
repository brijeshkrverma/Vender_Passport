import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';

/**
 * FIRST-RUN SETUP — once per person, and only for the people who can do it.
 *
 * ── WHY IT KEPT COMING BACK ───────────────────────────────────────────────
 *
 * It is mounted at the app root, beside `<Routes>`, so it floats over every
 * page — that part is correct for a modal. What was wrong was when it opened:
 *
 *   sessionStorage   "already done" was forgotten the moment the tab closed,
 *                    so it returned on every new session, forever.
 *   one shared key   not tied to a user, so signing in as somebody else either
 *                    skipped their setup or replayed yours.
 *   useState(() =>)  the flag was read once, at mount. Mounting on the login
 *                    screen meant `isAuthenticated` was still false, so it
 *                    latched shut; mounting already signed in meant it opened.
 *                    Same build, opposite behaviour, depending on how you got
 *                    there.
 *   every role       an Employee was asked to "add your company" and "invite a
 *                    vendor" — neither of which their account can do.
 *
 * Now: `localStorage`, keyed by user id, decided in an effect that watches the
 * signed-in user, and only offered to the roles whose API calls would succeed.
 *
 * ── AND IT NOW ACTUALLY SAVES ─────────────────────────────────────────────
 *
 * It used to collect a company name, a file and a vendor, then throw all three
 * away — `finish()` set a flag and showed "You're all set". The certificate
 * step went further and reported `ISO_27001_Certificate.pdf selected` whatever
 * you picked. A setup wizard that saves nothing teaches people their input does
 * not matter, which is worse than having no wizard.
 *
 * The two steps that had real endpoints behind them now use them. The
 * certificate step is gone rather than faked: uploading belongs on the
 * Documents screen, which does it properly.
 */

/** Roles whose accounts can complete both steps (`/api/settings` ∩ `/api/vendors`). */
const SETUP_ROLES = ['Super Admin', 'Organization Admin', 'Compliance Manager'];

const doneKey = (user) => `vp_onboarding_done:${user?.id || user?._id || user?.email || 'anon'}`;

export default function OnboardingWizard() {
  const { isAuthenticated, user, authHeaders } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');

  const STEPS = ['Add your company', 'Invite a vendor'];

  /*
   * Decide in an effect, not in an initializer: the component outlives signing
   * in and out, so "should this be open?" has to be re-asked when the user
   * changes — not answered once, whenever it happened to mount.
   */
  useEffect(() => {
    if (!isAuthenticated || !user) { setOpen(false); return; }
    if (!SETUP_ROLES.includes(user.role)) { setOpen(false); return; }

    let dismissed = false;
    try { dismissed = !!localStorage.getItem(doneKey(user)); } catch { dismissed = true; }
    setOpen(!dismissed);
    setStep(0);
    setOrgName(user.orgName || '');
  }, [isAuthenticated, user]);

  /** Remember for this person, permanently. */
  function markDone() {
    try { localStorage.setItem(doneKey(user), '1'); } catch { /* private mode */ }
    setOpen(false);
    setStep(0);
    setError('');
  }

  const skip = () => {
    markDone();
    toast('Setup skipped', 'You can do this anytime from Settings and Vendors.', 'info');
  };

  async function save(path, body) {
    const res = await fetch(path, {
      method: path === '/api/settings' ? 'PUT' : 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(
        Array.isArray(b.errors) && b.errors.length
          ? b.errors.map((e) => `${e.field}: ${e.message}`).join(' · ')
          : b.message || b.error || `Request failed (HTTP ${res.status})`
      );
    }
  }

  async function handleNext() {
    setError('');
    if (step === 0) {
      if (!orgName.trim()) { setError('Organization name is required.'); return; }
      setSaving(true);
      try {
        await save('/api/settings', { orgName: orgName.trim(), industry: industry.trim() || undefined });
        setStep(1);
      } catch (e) { setError(e.message); } finally { setSaving(false); }
      return;
    }

    // Last step — the vendor is optional, so an empty form still finishes.
    if (!vendorName.trim()) { markDone(); toast("You're all set"); return; }

    setSaving(true);
    try {
      await save('/api/vendors', {
        name: vendorName.trim(),
        ...(vendorEmail.trim() ? { email: vendorEmail.trim() } : {}),
        onboardingStatus: 'Invited',
      });
      markDone();
      toast("You're all set", `${vendorName.trim()} added to your vendors.`, 'success');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  const handleBack = () => { setError(''); if (step > 0) setStep(step - 1); };

  if (!open) return null;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13.5px',
    border: '1px solid #DAD5C4',
    borderRadius: '6px',
    background: '#FCFBF8',
    color: '#1C2430',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#1C2430',
    marginBottom: '5px',
  };

  const stepContent = [
    <div key="step1">
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>Organization Name</label>
        <input
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Industry</label>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          style={inputStyle}
          placeholder="Information Technology"
          onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div style={{ fontSize: '12px', color: '#6C7280', marginTop: '10px' }}>
        Saved to your organization settings.
      </div>
    </div>,

    <div key="step2">
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>Vendor Name</label>
        <input
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          style={inputStyle}
          placeholder="Acme Corp"
          onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Contact Email</label>
        <input
          type="email"
          value={vendorEmail}
          onChange={(e) => setVendorEmail(e.target.value)}
          style={inputStyle}
          placeholder="contact@acme.com"
          onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      {/* No claim about an invitation email: nothing sends one yet. The vendor
          is created with onboardingStatus "Invited" and appears under Vendors. */}
      <div style={{ fontSize: '12px', color: '#6C7280', marginTop: '6px' }}>
        Optional &mdash; leave blank to finish. They are added under <b>Vendors</b> as “Invited”.
      </div>
      <div style={{ fontSize: '11.5px', color: '#9CA0A8', marginTop: '8px' }}>
        Certificates and documents are uploaded from the <b>Documents</b> screen.
      </div>
    </div>,
  ];

  return (
    <Modal
      open={open}
      onClose={skip}
      title={'Welcome to Vendor Passport \uD83D\uDC4B'}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button
            onClick={skip}
            disabled={saving}
            className="border border-border px-4 py-2 rounded text-sm text-gray-500 hover:bg-paper disabled:opacity-50"
            style={{ fontSize: '13px' }}
          >
            Skip setup
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && (
              <button
                onClick={handleBack}
                disabled={saving}
                className="border border-border px-4 py-2 rounded text-sm text-gray-500 hover:bg-paper disabled:opacity-50"
                style={{ fontSize: '13px' }}
              >
                &larr; Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={saving}
              className="bg-seal text-white px-5 py-2 rounded text-sm font-semibold hover:bg-seal-dark disabled:opacity-50"
              style={{ fontSize: '13px' }}
            >
              {saving ? 'Saving\u2026' : step === STEPS.length - 1 ? 'Finish' : 'Next \u2192'}
            </button>
          </div>
        </div>
      }
    >
      <div>
        <div className="flex" style={{ gap: '6px', marginBottom: '22px' }}>
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 text-center">
              <div className="h-1" style={{ borderRadius: '3px', marginBottom: '7px', background: i <= step ? '#B8863B' : '#DAD5C4' }} />
              <div className="font-semibold" style={{ fontSize: '10.5px', color: i <= step ? '#1C2430' : '#9CA0A8' }}>{s}</div>
            </div>
          ))}
        </div>

        {error && (
          <div role="alert" style={{
            marginBottom: '14px', padding: '8px 12px', borderRadius: '6px',
            background: '#FBEAE7', border: '1px solid rgba(176,54,42,.3)',
            color: '#B0362A', fontSize: '12.5px',
          }}>
            {error}
          </div>
        )}

        {stepContent[step]}
      </div>
    </Modal>
  );
}
