import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';

export default function Settings() {
  const { user, authHeaders } = useAuth();
  const { toast } = useToast();
  const { data: savedSettings, loading } = useApi('/api/settings');

  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('Financial Services');
  const [contact, setContact] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [auditReminders, setAuditReminders] = useState(true);
  const [certExpiryAlerts, setCertExpiryAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!savedSettings) return;
    setOrgName(savedSettings.orgName || user?.orgName || '');
    setIndustry(savedSettings.industry || 'Financial Services');
    setContact(savedSettings.contactEmail || user?.email || '');
    setEmailNotifs(savedSettings.notifications?.emailNotifications ?? true);
    setAuditReminders(savedSettings.notifications?.auditReminders ?? true);
    setCertExpiryAlerts(savedSettings.notifications?.certExpiryAlerts ?? true);
    setTwoFactor(savedSettings.security?.twoFactor ?? false);
    setSessionTimeout(savedSettings.security?.sessionTimeout ?? true);
  }, [savedSettings, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        orgName,
        industry,
        contactEmail: contact,
        notifications: {
          emailNotifications: emailNotifs,
          auditReminders,
          certExpiryAlerts,
        },
        security: {
          twoFactor,
          sessionTimeout,
          // Sent as true rather than read from a switch: audit logging is not
          // optional, so there is nothing here for a user to have turned off.
          auditLog: true,
        },
      };
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast('Settings saved', 'Your preferences have been updated.');
    } catch (err) {
      toast('Save failed', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Settings</h1>
          <p className="text-sm text-gray-500">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage organization preferences and security configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary btn-sm"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink-900 pb-2 border-b border-border">Organization</h2>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-md border border-border bg-paper text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-md border border-border bg-paper text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
            >
              <option>Financial Services</option>
              <option>Healthcare</option>
              <option>Technology</option>
              <option>Manufacturing</option>
              <option>Government</option>
              <option>Education</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Email</label>
            <input
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-md border border-border bg-paper text-ink-900 focus:outline-none focus:ring-2 focus:ring-seal/30"
            />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink-900 pb-2 border-b border-border">Notifications</h2>
          <p className="text-[11px] text-gray-500 leading-relaxed -mt-1">
            In-app notifications (the bell) already work. Email delivery is not wired up yet —
            no scheduled job sends mail, so these three are saved as preferences only.
          </p>
          <Toggle label="Email Notifications" checked={emailNotifs} onChange={setEmailNotifs}
            note="Not active yet — no mail is sent." />
          <Toggle label="Audit Reminders" checked={auditReminders} onChange={setAuditReminders}
            note="Not active yet — no reminder job runs." />
          <Toggle label="Certificate Expiry Alerts" checked={certExpiryAlerts} onChange={setCertExpiryAlerts}
            note="Not active yet — expiry shows on the Expiry Alerts page instead." />
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink-900 pb-2 border-b border-border">Security</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Toggle label="Two-Factor Authentication" checked={twoFactor} onChange={setTwoFactor}
              note="Not active yet — sign-in is password + JWT only." />
            <Toggle label="Session Timeout" checked={sessionTimeout} onChange={setSessionTimeout}
              note={`Not active yet — sessions end when the token expires (JWT_EXPIRY, default 24h).`} />
            {/*
              * Always on, and deliberately not switchable: every mutating router
              * mounts `auditTrail(...)` unconditionally. An audit platform whose
              * audit log can be turned off from a settings page is not one.
              */}
            <Toggle label="Audit Logging" checked
              locked="Always on — every change is recorded and this cannot be disabled." />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A preference switch.
 *
 * `note` marks a switch that is stored but not yet acted on anywhere. It is
 * rendered disabled rather than removed, because the setting is a real intention
 * — but a live-looking "Two-Factor Authentication: On" that enforces nothing is
 * worse than no switch at all: on a compliance product it is a control someone
 * would report as in place.
 */
function Toggle({ label, checked, onChange, note, locked }) {
  const inert = !!note || !!locked;
  return (
    <div className="py-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs ${inert ? 'text-gray-400' : 'text-ink-900'}`}>{label}</span>
        <button
          type="button"
          disabled={inert}
          aria-label={label}
          onClick={() => !inert && onChange(!checked)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            checked ? 'bg-seal' : 'bg-gray-200'
          } ${inert ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      {(note || locked) && (
        <p className="text-[10.5px] text-gray-400 mt-0.5 pr-11 leading-snug">{note || locked}</p>
      )}
    </div>
  );
}
