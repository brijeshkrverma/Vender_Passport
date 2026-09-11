const LEVELS = [
  { id: 1, name: 'Initial', desc: 'Ad hoc, chaotic' },
  { id: 2, name: 'Managed', desc: 'Reactive, project-level' },
  { id: 3, name: 'Defined', desc: 'Proactive, org-wide' },
  { id: 4, name: 'Quantitatively Managed', desc: 'Measured & controlled' },
  { id: 5, name: 'Optimizing', desc: 'Continuous improvement' },
];

const DOMAINS = [
  {
    name: 'IT Security',
    current: 3,
    target: 4,
    gap: 'Need quantitative metrics for security operations. Currently defined processes exist but lack a measurement framework and real-time monitoring dashboards.',
  },
  {
    name: 'Quality',
    current: 2,
    target: 3,
    gap: 'Quality processes are managed at the project level but not standardized across teams. Documentation templates and cross-functional training required.',
  },
  {
    name: 'Compliance',
    current: 4,
    target: 5,
    gap: 'Strong quantitative compliance monitoring is in place. Need continuous optimization through predictive analytics and automated regulatory change detection.',
  },
];

const LEVEL_COLORS = [
  'bg-gray-300',
  'bg-info',
  'bg-seal',
  'bg-violet',
  'bg-success',
];

export default function MaturityModel() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Maturity Model</h1>
        <p className="text-sm text-gray-500">COBIT-style maturity assessment across key domains</p>
      </div>

      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-4">Maturity Levels</h2>
        <div className="grid grid-cols-5 gap-2 mb-8">
          {LEVELS.map((level) => (
            <div key={level.id} className="text-center">
              <div className={`h-2 rounded-full mb-2 ${LEVEL_COLORS[level.id - 1]}`} />
              <div className="text-[10px] font-semibold text-ink-900">{level.id} — {level.name}</div>
              <div className="text-[9px] text-gray-400 leading-tight mt-0.5">{level.desc}</div>
            </div>
          ))}
        </div>

        <h2 className="text-sm font-semibold text-ink-900 mb-4">Domain Assessment</h2>
        <div className="space-y-6">
          {DOMAINS.map((domain) => (
            <div key={domain.name} className="bg-paper/50 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink-900">{domain.name}</h3>
                <div className="flex items-center gap-4 text-[10px]">
                  <span>Current: <span className="font-semibold text-ink-900">{domain.current}</span></span>
                  <span>Target: <span className="font-semibold text-seal">{domain.target}</span></span>
                  <span className="text-gray-400">Gap: +{domain.target - domain.current}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 mb-3">
                {LEVELS.map((level) => {
                  let segmentColor = 'bg-gray-200';
                  if (level.id <= domain.current) segmentColor = LEVEL_COLORS[domain.current - 1];
                  else if (level.id <= domain.target) segmentColor = LEVEL_COLORS[level.id - 1] + '/30';
                  return (
                    <div
                      key={level.id}
                      className={`h-4 flex-1 rounded transition-colors ${segmentColor}`}
                      title={`Level ${level.id}: ${level.name}`}
                    >
                      {level.id === domain.current && (
                        <div className="h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full border-2 border-ink-900" />
                        </div>
                      )}
                      {level.id === domain.target && level.id !== domain.current && (
                        <div className="h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full border-2 border-seal" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[9px] text-gray-400 mb-2">
                <span>Level 1</span>
                <span>Level 5</span>
              </div>

              <div className="mt-3 p-3 bg-surface rounded border border-border">
                <p className="text-xs text-gray-600 leading-relaxed">{domain.gap}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
