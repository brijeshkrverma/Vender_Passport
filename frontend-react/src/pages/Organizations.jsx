import { useState, useMemo } from 'react';
import { statusColor } from '../hooks/useApi';
import { usePaginatedApi } from '../hooks/usePaginatedApi';
import Pagination from '../components/Pagination';

const TYPE_OPTIONS = ['All', 'Vendor', 'Partner', 'Internal', 'Client'];
const TYPE_COLORS = {
  'Vendor': 'badge-info',
  'Partner': 'badge-violet',
  'Internal': 'badge-success',
  'Client': 'badge-warning',
};

function ComplianceBar({ pct }) {
  const c = Math.max(0, Math.min(100, pct || 0));
  const color = c >= 80 ? 'bg-success' : c >= 50 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${c}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-500">{c}%</span>
    </div>
  );
}

export default function Organizations() {
  const [typeFilter, setTypeFilter] = useState('All');
  const params = useMemo(() => typeFilter === 'All' ? {} : { type: typeFilter }, [typeFilter]);
  const { data: orgs, loading, error, pagination, page, setPage } = usePaginatedApi('/api/organizations', params);

  const filtered = !orgs ? [] : orgs;

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Organizations</h1>
          <p className="page-sub">Vendors, partners, and internal orgs in your network</p>
        </div>
        <div className="text-center py-[50px] text-[#6C7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Organizations</h1>
        <p className="page-sub">Vendors, partners, and internal orgs in your network</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TYPE_OPTIONS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={typeFilter === t ? 'filter-pill filter-pill-active' : 'filter-pill'}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-[50px] text-[#6C7280]">
          <p className="text-[12.5px]">No records found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((o, i) => (
              <div key={o.id || i} className="card p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900">{o.name}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{o.industry || '—'}</p>
                  </div>
                  <span className={`badge ${TYPE_COLORS[o.type] || 'badge-neutral'}`}>{o.type || '—'}</span>
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Compliance Score</div>
                <ComplianceBar pct={o.complianceScore || o.compliance_score || o.compliance} />
                {(o.riskLevel || o.risk_level) && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Risk:</span>
                    <span className={`badge ${statusColor(o.riskLevel || o.risk_level)}`}>{o.riskLevel || o.risk_level}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={pagination?.totalPages || 1}
            total={pagination?.total || 0}
            limit={pagination?.limit || 20}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
