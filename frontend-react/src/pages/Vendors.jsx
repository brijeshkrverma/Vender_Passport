import { useState, useCallback } from 'react';
import { statusColor } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import { useCrud } from '../hooks/useCrud';
import EntityFormModal from '../components/EntityFormModal';
import Pagination from '../components/Pagination';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';

const VENDOR_FIELDS = [
  { name: 'name', label: 'Vendor name', required: true, span: 2, placeholder: 'SecureCore Systems' },
  { name: 'contact', label: 'Primary contact', placeholder: 'Amanda Reyes' },
  { name: 'email', label: 'Contact email', type: 'email', placeholder: 'amanda@securecore.com' },
  {
    name: 'riskTier', label: 'Risk tier', type: 'select',
    options: ['Critical', 'High', 'Medium', 'Low'], placeholder: 'Medium',
  },
  {
    name: 'onboardingStatus', label: 'Onboarding status', type: 'select',
    options: ['Invited', 'Onboarding', 'Active', 'Suspended', 'Offboarded'], placeholder: 'Invited',
  },
  { name: 'contractRef', label: 'Contract reference', placeholder: 'MSA-2026-014' },
  { name: 'complianceScore', label: 'Compliance score (0–100)', type: 'number' },
];

const riskTierColor = (tier) => {
  const map = {
    'Critical': 'badge-danger',
    'High': 'badge-warning',
    'Medium': 'badge-info',
    'Low': 'badge-success',
  };
  return map[tier] || 'badge-neutral';
};

export default function Vendors() {
  const { data: vendors, loading, error, pagination, page, setPage, refetch } = usePaginatedApi('/api/vendors');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [creating, setCreating] = useState(false);
  const close = useCallback(() => setCreating(false), []);
  const crud = useCrud('/api/vendors', { onDone: async () => { await refetch(); close(); } });

  // "+ Create" in the top bar deep-links here with ?new=1.
  useCreateFromUrl(useCallback(() => setCreating(true), []));

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Vendor Management</h1>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Vendor Management</h1>
          <p className="text-sm text-gray-500">Third-party vendor risk management</p>
        </div>
        <button
          onClick={() => { crud.clearError(); setCreating(true); }}
          className="text-xs font-semibold bg-seal text-white rounded-lg px-4 py-2 hover:bg-seal-dark"
        >
          + Add Vendor
        </button>
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      {crud.error && !creating && (
        <div role="alert" className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{crud.error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {!vendors || vendors.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-surface border border-border rounded-lg">
              <div className="text-2xl mb-2">💼</div>
              <p className="text-sm">No vendors onboarded</p>
              <p className="text-[11px] mt-1">Add vendors to start managing third-party risk</p>
            </div>
          ) : (
            vendors.map((v, i) => (
              <div
                key={v.id || i}
                onClick={() => setSelectedVendor(v)}
                className={`bg-surface border rounded-lg p-4 cursor-pointer transition-shadow hover:shadow-sm ${
                  selectedVendor?.id === v.id ? 'border-seal/50 shadow-sm' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">{v.name}</h3>
                    {v.contact && <p className="text-[11px] text-gray-400 mt-0.5">{v.contact}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] ${riskTierColor(v.riskTier || v.risk_tier)}`}>
                      {v.riskTier || v.risk_tier || 'Unrated'}
                    </span>
                    <span className={`badge text-[10px] ${statusColor(v.onboardingStatus || v.onboarding_status)}`}>
                      {v.onboardingStatus || v.onboarding_status || 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-seal transition-all"
                      style={{ width: `${Math.min(100, v.complianceScore || v.compliance_score || 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {v.complianceScore || v.compliance_score || 0}%
                  </span>
                </div>
              </div>
))
          )}
          <Pagination
            page={page}
            totalPages={pagination?.totalPages || 1}
            total={pagination?.total || 0}
            limit={pagination?.limit || 20}
            onPageChange={setPage}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-lg p-5 sticky top-4">
            {selectedVendor ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-ink-900">{selectedVendor.name} — Scorecard</h3>

                {selectedVendor.certifications && selectedVendor.certifications.length > 0 ? (
                  <div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Certifications</div>
                    <div className="space-y-1.5">
                      {selectedVendor.certifications.map((cert, j) => (
                        <div key={j} className="flex items-center justify-between text-xs">
                          <span className="text-ink-900">{cert.name || cert.title}</span>
                          <span className={`badge text-[10px] ${statusColor(cert.status)}`}>{cert.status || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No certifications on file</p>
                )}

                {selectedVendor.findings && selectedVendor.findings.length > 0 ? (
                  <div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Findings</div>
                    <div className="space-y-1.5">
                      {selectedVendor.findings.map((f, j) => (
                        <div key={j} className="flex items-center justify-between text-xs">
                          <span className="text-ink-900 truncate max-w-[160px]">{f.title || f.name}</span>
                          <span className={`badge text-[10px] ${statusColor(f.severity)}`}>{f.severity || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No open findings</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-xl mb-2">🏌</div>
                <p className="text-xs">Select a vendor to view scorecard</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <EntityFormModal
        open={creating}
        onClose={close}
        title="Add a vendor"
        intro="Adds the vendor to your register. To invite many at once, use Vendor Onboarding."
        fields={VENDOR_FIELDS}
        initial={{ riskTier: 'Medium', onboardingStatus: 'Invited' }}
        submitLabel="Add vendor"
        saving={crud.saving}
        error={crud.error}
        onSubmit={(payload) => crud.create(payload)}
      />
    </div>
  );
}
