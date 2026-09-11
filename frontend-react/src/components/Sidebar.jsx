import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isNavVisibleForRole, useAuth } from '../context/AuthContext';

function renderIcon(iconName) {
  const icons = {
    dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
    audit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3h9a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7l4-4Z"/><path d="M9 3v4H5"/><path d="M8 13h8M8 17h5"/></svg>`,
    question: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h7M7 17h4"/></svg>`,
    finding: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 2 20h20L12 2Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>`,
    risk: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    control: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>`,
    cert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>`,
    doc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 2h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/></svg>`,
    exchange: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h13l-3-3M20 17H7l3 3"/></svg>`,
    org: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16"/><path d="M15 21V10a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v11"/><path d="M8 8h0M8 12h0M8 16h0"/></svg>`,
    auditor: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/></svg>`,
    report: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V6a2 2 0 0 1 2-2h7l5 5v11a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2Z"/><path d="M8 13h4M8 17h8M13 4v5h5"/></svg>`,
    bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>`,
    settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></svg>`,
    users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>`,
    building: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16"/><path d="M15 21V10a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v11"/></svg>`,
    shield: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  };
  return icons[iconName] || null;
}

const NAV_SECTIONS = [
  {
    name: 'My Work',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', iconName: 'dashboard' },
      { id: 'my-tasks', label: 'My Workspace', path: '/my-workspace', iconName: null },
    ],
  },
  {
    name: 'Audit Lifecycle',
    items: [
      { id: 'audits', label: 'Audits', path: '/audits', iconName: 'audit', badge: 5 },
      { id: 'audit-universe', label: 'Audit Universe', path: '/audit-universe', iconName: 'audit' },
      { id: 'auditor-workspace', label: 'Auditor Workspace', path: '/auditor-workspace', iconName: 'audit' },
      { id: 'working-papers', label: 'Working Papers', path: '/working-papers', iconName: 'doc' },
      { id: 'audit-program', label: 'Audit Program', path: '/audit-program', iconName: 'audit' , soon: true},
      { id: 'questionnaire', label: 'Questionnaire', path: '/questionnaire', iconName: 'question' },
      { id: 'questionnaire-list', label: 'Questions', path: '/questionnaire-list', iconName: 'question' },
      { id: 'answer-questionnaire', label: 'Answer Questionnaire', path: '/answer-questionnaire', iconName: 'doc' },
      { id: 'assessor-queue', label: 'Assessment Queue', path: '/assessor-queue', iconName: 'auditor' },
      { id: 'questionnaire-create', label: 'Create Questionnaire', path: '/questionnaire-create', iconName: 'question' },
      { id: 'question-bank', label: 'Question Bank', path: '/question-bank', iconName: 'question' },
      { id: 'q-scoring', label: 'Q-Scoring', path: '/q-scoring', iconName: 'control' , soon: true},
      { id: 'sampling-engine', label: 'Sampling Engine', path: '/sampling-engine', iconName: 'risk' , soon: true},
      { id: 'maturity-model', label: 'Maturity Model', path: '/maturity-model', iconName: 'shield' },
      { id: 'self-assessment', label: 'Self Assessment', path: '/self-assessment', iconName: 'doc' , soon: true},
      { id: 'findings', label: 'Findings', path: '/findings', iconName: 'finding', badge: 4 },
      { id: 'mgmt-response', label: 'Management Response', path: '/mgmt-response', iconName: 'finding' , soon: true},
      { id: 'ccm', label: 'CCM', path: '/ccm-dashboard', iconName: 'clock' },
    ],
  },
  {
    name: 'GRC & Compliance',
    items: [
      { id: 'risks', label: 'Risks', path: '/risks', iconName: 'risk' },
      { id: 'risk-heatmap', label: 'Risk Heatmap', path: '/risk-heatmap', iconName: 'risk' },
      { id: 'control-testing', label: 'Control Testing', path: '/control-testing', iconName: 'control' },
      { id: 'controls', label: 'Controls', path: '/controls', iconName: 'control' },
      { id: 'gap-analysis', label: 'Gap Analysis', path: '/gap-analysis', iconName: 'exchange' },
      { id: 'traceability', label: 'Traceability', path: '/traceability', iconName: 'exchange' , soon: true},
      { id: 'issues', label: 'Issues', path: '/issues', iconName: 'finding' , soon: true},
      { id: 'exceptions', label: 'Exceptions', path: '/exceptions', iconName: 'finding' , soon: true},
      { id: 'regulatory-changes', label: 'Regulatory Changes', path: '/regulatory-changes', iconName: 'cert' },
    ],
  },
  {
    name: 'Compliance',
    items: [
      { id: 'framework-taxonomy', label: 'Framework Taxonomy', path: '/framework-taxonomy', iconName: 'cert' },
      { id: 'framework-diff', label: 'Framework Version Diff', path: '/framework-diff', iconName: 'exchange' , soon: true},
    ],
  },
  {
    name: 'Certificates & Evidence',
    items: [
      { id: 'certificates', label: 'Certificates', path: '/certificates', iconName: 'cert' },
      { id: 'documents', label: 'Documents', path: '/documents', iconName: 'doc' },
      { id: 'evidence', label: 'Evidence', path: '/evidence', iconName: 'doc' },
      { id: 'exchange', label: 'Exchange', path: '/exchange', iconName: 'exchange' , soon: true},
    ],
  },
  {
    name: 'ESG & Vendors',
    items: [
      { id: 'esg', label: 'ESG', path: '/esg', iconName: 'shield' , soon: true},
      { id: 'vendors', label: 'Vendor Scorecard', path: '/vendors', iconName: 'org' },
      { id: 'vendor-onboard', label: 'Vendor Onboarding', path: '/bulk-invite', iconName: 'org' },
    ],
  },
  {
    name: 'Planning & Analytics',
    items: [
      { id: 'calendar', label: 'Calendar', path: '/calendar', iconName: 'clock' },
      { id: 'capa', label: 'CAPA', path: '/capa', iconName: 'finding' },
      { id: 'gantt', label: 'Gantt', path: '/gantt', iconName: 'audit' },
      { id: 'reports', label: 'Reports', path: '/reports', iconName: 'report' },
      { id: 'report-scheduler', label: 'Report Scheduler', path: '/report-scheduler', iconName: 'report' },
      { id: 'risk-scheduler', label: 'Risk-Based Scheduler', path: '/risk-scheduler', iconName: 'risk' , soon: true},
      { id: 'sla-dashboard', label: 'SLA Dashboard', path: '/sla-dashboard', iconName: 'clock' , soon: true},
      { id: 'audit-cost', label: 'Audit Cost', path: '/audit-cost', iconName: 'report' , soon: true},
    ],
  },
  {
    name: 'AI & Automation',
    items: [
      { id: 'ai-drafts', label: 'AI Drafts', path: '/ai-drafts', iconName: 'shield' },
    ],
  },
  {
    name: 'Network',
    items: [
      { id: 'organizations', label: 'Organizations', path: '/organizations', iconName: 'org' },
      { id: 'org-compare', label: 'Org Comparison', path: '/org-compare', iconName: 'shield' , soon: true},
      { id: 'org-hierarchy', label: 'Org Hierarchy', path: '/org-hierarchy', iconName: 'org' , soon: true},
      { id: 'client-portfolio', label: 'Client Portfolio', path: '/client-portfolio', iconName: 'building' },
      { id: 'auditors', label: 'Auditors', path: '/auditors', iconName: 'auditor' },
    ],
  },
  {
    name: 'Governance',
    items: [
      { id: 'three-lines', label: 'Three Lines Model', path: '/three-lines', iconName: 'shield' , soon: true},
    ],
  },
  {
    name: 'Knowledge',
    items: [
      { id: 'competency', label: 'Competency', path: '/competency', iconName: 'auditor' , soon: true},
      { id: 'doc-versions', label: 'Doc Versions', path: '/doc-versions', iconName: 'doc' , soon: true},
      { id: 'policy-lifecycle', label: 'Policy Lifecycle', path: '/policy-lifecycle', iconName: 'doc' },
      { id: 'perm-matrix', label: 'Permission Matrix', path: '/perm-matrix', iconName: 'shield' , soon: true},
      { id: 'role-dashboard', label: 'Role Dashboard', path: '/role-dashboard', iconName: 'auditor' , soon: true},
    ],
  },
  {
    name: 'Administration',
    items: [
      { id: 'notifications', label: 'Notifications', path: '/notifications', iconName: 'bell', badge: 3 },
      { id: 'users', label: 'Users', path: '/users', iconName: 'auditor' },
      { id: 'settings', label: 'Settings', path: '/settings', iconName: 'settings' },
      { id: 'expiry-alerts', label: 'Expiry Alerts', path: '/expiry-alerts', iconName: 'clock', badge: 2 },
      { id: 'audit-trail', label: 'Audit Trail', path: '/audit-trail', iconName: 'finding' },
      { id: 'api-integrations', label: 'Webhooks', path: '/api-integrations', iconName: 'exchange' , soon: true},
      { id: 'my-passport', label: 'My Passport', path: '/my-passport', iconName: 'shield' , soon: true},
    ],
  },
];

export default function Sidebar({ onNavigate, mobileOpen, onMobileClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [hoveredSection, setHoveredSection] = useState(null);
  const [activeSection, setActiveSection] = useState('My Work');

  const filteredSections = useMemo(() => {
    if (!user?.role) return NAV_SECTIONS;
    return NAV_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item => isNavVisibleForRole(user.role, item.id)),
      }))
      .filter(section => section.items.length > 0);
  }, [user?.role]);

  function toggleSection(name) {
    setActiveSection(prev => prev === name ? null : name);
  }

  return (
    <>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={onMobileClose} />}
      <aside className={`bg-ink flex-shrink-0 flex flex-col h-screen ${mobileOpen ? 'fixed left-0 top-0 z-40' : 'hidden md:flex md:sticky md:top-0'}`} style={{ width: '230px' }} role="navigation">
      <div style={{ padding: '18px 18px 16px', gap: '10px' }} className="border-b border-white/10 flex items-center">
        <svg width="28" height="28" viewBox="0 0 60 60" className="text-seal">
          <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="30" cy="30" r="21" fill="none" stroke="currentColor" strokeWidth="1"/>
          <path d="M19 30.5 26 37 41 21" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-display text-white font-semibold" style={{ fontSize: '16.5px' }}>Vendor Passport</span>
      </div>

      <nav className="flex-1 overflow-y-auto" style={{ padding: '12px 10px' }}>
        {filteredSections.map((section) => (
          <div key={section.name} className="nav-section">
            <div
              className="nav-section-title"
              onClick={() => toggleSection(section.name)}
              style={{
                fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.09em',
                color: hoveredSection === section.name ? '#A5B0C0' : '#7C8698',
                fontWeight: 600, padding: '14px 10px 6px',
                transition: 'color 0.15s ease', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={() => setHoveredSection(section.name)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              <span>{section.name}</span>
              <span style={{fontSize:'9px', transition:'.15s', transform: activeSection===section.name?'rotate(0deg)':'rotate(-90deg)'}}>
                {activeSection===section.name ? '▼' : '▶'}
              </span>
            </div>
            {activeSection === section.name && section.items.map((item) => {
              const isActive = location.pathname === item.path;
              const iconSvg = renderIcon(item.iconName);
              return (
                <button
                  key={item.id}
                  onClick={() => { navigate(item.path); if (onNavigate) onNavigate(item.label); }}
                  className={`flex items-center gap-[10px] px-[10px] py-[8px] rounded-[7px] text-[13px] text-[#C6CDD9] font-medium w-full text-left transition-colors ${
                    isActive
                      ? 'bg-[rgba(184,134,59,.18)] text-[#F2D9AE]'
                      : 'hover:bg-[rgba(255,255,255,.06)] hover:text-white'
                  }`}
                  style={{ marginBottom: '1px' }}
                >
                  {iconSvg && (
                    <span className="flex-shrink-0" style={{ opacity: 0.85, display: 'flex', alignItems: 'center' }} dangerouslySetInnerHTML={{ __html: iconSvg }} />
                  )}
                  <span>{item.label}</span>
                  {/* Stub pages are labelled up front rather than letting the
                      click be the way a user discovers nothing is there. */}
                  {item.soon && (
                    <span
                      title="Not built yet — placeholder page"
                      style={{
                        marginLeft: 'auto', fontSize: '9px', fontWeight: 700,
                        letterSpacing: '.05em', textTransform: 'uppercase',
                        padding: '1px 5px', borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,.18)',
                        color: '#8D97A8', flexShrink: 0,
                      }}
                    >
                      Soon
                    </span>
                  )}
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className="badge-count"
                      style={{
                        marginLeft: 'auto',
                        background: isActive ? '#B8863B' : 'rgba(255,255,255,.12)',
                        color: '#fff',
                        fontSize: '10.5px',
                        padding: '1px 6px',
                        borderRadius: '9px',
                        minWidth: 'fit-content',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className="text-[11px] text-[#7C8698]"
        style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(255,255,255,.08)' }}
      >
        &copy; Vendor Passport &middot; v0.9 demo build
      </div>
    </aside>
    </>
  );
}
