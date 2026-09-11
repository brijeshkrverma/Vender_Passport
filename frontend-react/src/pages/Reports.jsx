import { useAuth } from '../context/AuthContext';

const REPORTS = [
  { id: 1, name: 'Compliance Posture Summary', icon: '\u25C8', description: 'High-level overview of compliance posture across all frameworks' },
  { id: 2, name: 'Vendor Risk Assessment', icon: '\u25B3', description: 'Detailed risk assessment report for all onboarded vendors' },
  { id: 3, name: 'Audit Trail Report', icon: '\u25C6', description: 'Chronological audit trail with findings, actions, and timelines' },
  { id: 4, name: 'Certificate Expiry Forecast', icon: '\u25D7', description: 'Upcoming certificate expirations with renewal recommendations' },
  { id: 5, name: 'Control Effectiveness Matrix', icon: '\u25A3', description: 'Control-by-control effectiveness scoring and gap analysis' },
  { id: 6, name: 'Risk Register Export', icon: '\u25B7', description: 'Full risk register export with inherent and residual scores' },
  { id: 7, name: 'Regulatory Readiness Dashboard', icon: '\u25A0', description: 'Readiness assessment for upcoming regulatory requirements' },
];

export default function Reports() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Reports</h1>
        <p className="text-sm text-gray-500">Generate and download compliance reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <div key={r.id} className="bg-surface border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-seal/10 flex items-center justify-center text-seal text-lg flex-shrink-0">
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink-900">{r.name}</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4 line-clamp-2">{r.description}</p>
                <div className="flex items-center gap-2">
                  <button className="text-xs px-3 py-1.5 rounded-md bg-seal text-white font-medium hover:bg-seal/90 transition-colors">
                    Generate
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded-md border border-border text-gray-500 font-medium hover:bg-paper transition-colors">
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
