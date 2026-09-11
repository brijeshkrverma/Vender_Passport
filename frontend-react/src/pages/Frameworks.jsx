import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const TABS = ['Standards', 'Frameworks', 'Regulations', 'Reporting', 'Professional'];

export default function Frameworks() {
  const { user } = useAuth();
  const { data: frameworks, loading, error } = useApi('/api/frameworks');
  const [activeTab, setActiveTab] = useState('Standards');

  const filtered = useMemo(() => {
    if (!frameworks) return [];
    return frameworks.filter((f) => f.category === activeTab);
  }, [frameworks, activeTab]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Framework Taxonomy</h1>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Framework Taxonomy</h1>
        <p className="text-sm text-gray-500">Browse compliance frameworks by category</p>
      </div>

      {error && (
        <div className="bg-danger-bg text-danger text-xs px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="flex items-center gap-1 flex-wrap border-b border-border pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs px-4 py-2 rounded-t-md font-medium transition-colors ${
              activeTab === tab
                ? 'bg-surface border border-border border-b-transparent text-ink-900 -mb-px'
                : 'text-gray-500 hover:text-ink-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-surface border border-border rounded-lg">
          <div className="text-2xl mb-2">&#128218;</div>
          <p className="text-sm">No {activeTab.toLowerCase()} frameworks found</p>
          <p className="text-[11px] mt-1">Frameworks in this category will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f, i) => (
            <div key={f.id || i} className="bg-surface border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-ink-900">{f.name || f.title}</h3>
                <span className={`badge text-[10px] ${f.certifiable ? 'badge-success' : 'badge-neutral'}`}>
                  {f.certifiable ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 mb-1">
                {f.domain && <span className="badge badge-neutral mr-1">{f.domain}</span>}
                {f.version && <span className="text-gray-300">v{f.version}</span>}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{f.description || 'No description available'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
