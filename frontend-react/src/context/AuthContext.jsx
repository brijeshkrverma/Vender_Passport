import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('vp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('vp_token'));

  const login = useCallback(async (email, password, role) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || data.error || 'Login failed';
        return { success: false, error: msg };
      }
      const userData = data.data.user || data.user;
      setUser(userData);
      setToken(data.data.accessToken || data.accessToken);
      localStorage.setItem('vp_user', JSON.stringify(userData));
      localStorage.setItem('vp_token', data.data.accessToken || data.accessToken);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Cannot reach the server. Please check your connection and try again.' };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || data.error || 'Registration failed';
        return { success: false, error: msg };
      }
      setUser(data.data.user || data.user);
      setToken(data.data.accessToken || data.accessToken);
      localStorage.setItem('vp_user', JSON.stringify(data.data.user || data.user));
      localStorage.setItem('vp_token', data.data.accessToken || data.accessToken);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Cannot reach the server. Please check your connection and try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('vp_user');
    localStorage.removeItem('vp_token');
  }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, authHeaders, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const ADMIN_ONLY = ['users','settings','audit-cost','sla-dashboard','report-scheduler','api-integrations','audit-trail','perm-matrix'];
const AUDITOR_HIDDEN = [...ADMIN_ONLY,'risk-scheduler','sampling-engine','maturity-model','gap-analysis','traceability','issues','exceptions','client-portfolio','org-compare','org-hierarchy','vendor-scorecard','vendor-onboard','esg','capa','gantt','calendar','role-dashboard','q-scoring','audit-program','organizations'];
const VENDOR_HIDDEN = [...ADMIN_ONLY,'assessor-queue','risks','risk-heatmap','findings','mgmt-response','audits','audit-detail','audit-universe','auditor-workspace','working-papers','questionnaire','question-bank','controls','control-testing','gap-analysis','regulatory-changes','maturity-model','self-assessment','ccm-dashboard'];
const EXTERNAL_HIDDEN = [...ADMIN_ONLY,...AUDITOR_HIDDEN,'assessor-queue','questionnaire-bank','audits','findings','risks','controls','capa'];
const EMPLOYEE_HIDDEN = [...ADMIN_ONLY,...AUDITOR_HIDDEN,'questionnaire-bank','audits','findings','risks','controls'];

const ROLE_ROUTES = {
  'Super Admin': { allowedAll: true },
  'Organization Admin': { allowedAll: true },
  'Compliance Manager': { allowedAll: true },
  'Audit Manager': { hidden: AUDITOR_HIDDEN.slice(0, 10) },
  'Auditor': { hidden: AUDITOR_HIDDEN },
  'Reviewer': { hidden: [...ADMIN_ONLY, 'users'] },
  'Risk Manager': { allowed: ['risks','risk-heatmap','dashboard','risk-scheduler','reports','organizations','certificates','documents','evidence','my-workspace','notifications','settings'] },
  'Document Manager': { allowed: ['documents','evidence','exchange','doc-versions','policy-lifecycle','certificates','dashboard','my-workspace','notifications','settings','reports'] },
  'Vendor Manager': { hidden: VENDOR_HIDDEN },
  'Employee': { hidden: EMPLOYEE_HIDDEN },
  'External Company User': { hidden: EXTERNAL_HIDDEN },
  // 'capa' is deliberately absent: /api/capa is restricted to Super Admin,
  // Organization Admin, Compliance Manager and Reviewer, so showing the nav item
  // here only produced a 403 after the click.
  'CA / Consultant': { allowed: ['dashboard','client-portfolio','organizations','audits','findings','risks','certificates','documents','evidence','reports','calendar','my-workspace','notifications','exchange','framework-taxonomy','regulatory-changes'] },
};

/**
 * Which roles each backend API module accepts, mirroring the `restrictTo(...)`
 * lists in backend/modules/<module>/*.routes.js.
 *
 * The nav lists above are a product decision ("what is useful to this role");
 * this map is the security decision ("what will the server actually answer").
 * Showing an item the API rejects produced a 403 after the click — CA /
 * Consultant → CAPA, Risk Manager → Settings, Reviewer → Organizations were all
 * broken this way. Nav visibility is now the INTERSECTION of the two.
 *
 * Keep in sync with the backend; tests/unit/rbac-parity.test.js asserts it.
 */
const ALL = null; // null = every authenticated role

export const API_MODULE_ROLES = {
  users:         ['Super Admin', 'Organization Admin'],
  settings:      ['Super Admin', 'Organization Admin', 'Compliance Manager'],
  ccm:           ['Super Admin', 'Organization Admin', 'Compliance Manager'],
  auditlogs:     ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager'],
  organizations: ['Super Admin', 'Organization Admin', 'Compliance Manager', 'CA / Consultant'],
  capa:          ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Reviewer'],
  risks:         ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Risk Manager', 'CA / Consultant'],
  vendors:       ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Vendor Manager', 'CA / Consultant'],
  reports:       ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Risk Manager', 'CA / Consultant'],
  audits:        ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant'],
  findings:      ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant'],
  controls:      ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'Risk Manager', 'CA / Consultant'],
  questionnaires: ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant'],
  // Answering reaches further than authoring: an applicant is not an author.
  questionnaireSubmissions: ['Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'CA / Consultant', 'Vendor Manager', 'External Company User'],
  evidence: ALL, documents: ALL, certificates: ALL, frameworks: ALL, notifications: ALL,
};

/** Nav item id → the API module its page actually calls. */
export const NAV_ITEM_MODULE = {
  users: 'users', settings: 'settings', 'ccm': 'ccm', 'audit-trail': 'auditlogs',
  organizations: 'organizations', 'org-compare': 'organizations', 'org-hierarchy': 'organizations',
  'client-portfolio': 'organizations', auditors: 'users',
  audits: 'audits', 'audit-universe': 'audits', 'auditor-workspace': 'audits',
  'working-papers': 'audits', 'audit-program': 'audits',
  findings: 'findings', 'mgmt-response': 'findings',
  capa: 'capa',
  risks: 'risks', 'risk-heatmap': 'risks', 'risk-scheduler': 'risks',
  controls: 'controls', 'control-testing': 'controls',
  certificates: 'certificates', 'expiry-alerts': 'certificates',
  documents: 'documents', 'doc-versions': 'documents', 'policy-lifecycle': 'documents',
  exchange: 'documents',
  evidence: 'evidence',
  vendors: 'vendors', 'vendor-onboard': 'vendors',
  'framework-taxonomy': 'frameworks', 'framework-diff': 'frameworks',
  questionnaire: 'questionnaires', 'question-bank': 'questionnaires', 'q-scoring': 'questionnaires',
  'questionnaire-create': 'questionnaires', 'questionnaire-edit': 'questionnaires',
  'questionnaire-list': 'questionnaires',
  // The answering screen is the one questionnaire page a vendor may reach.
  'answer-questionnaire': 'questionnaireSubmissions',
  'assessor-queue': 'questionnaireSubmissions', assess: 'questionnaireSubmissions',
  'self-assessment': 'questionnaires', 'maturity-model': 'questionnaires',
  reports: 'reports', 'report-scheduler': 'reports', 'audit-cost': 'reports',
  'sla-dashboard': 'reports',
};

/** Would the backend accept this role for the API behind this nav item? */
export function isApiAllowedForRole(role, itemId) {
  const moduleName = NAV_ITEM_MODULE[itemId];
  if (!moduleName) return true;            // no API behind it (stub / local page)
  const roles = API_MODULE_ROLES[moduleName];
  if (roles === ALL || roles === undefined) return true;
  return roles.includes(role);
}

export function isNavVisibleForRole(role, itemId) {
  const config = ROLE_ROUTES[role];
  if (!config) return false;
  // The server has the final say — never advertise a page it will refuse.
  if (!isApiAllowedForRole(role, itemId)) return false;
  if (config.allowedAll) return true;
  if (config.allowed) return config.allowed.includes(itemId);
  if (config.hidden) return !config.hidden.includes(itemId);
  return true;
}

export function canAccessPage(role, path) {
  const id = path.replace(/^\//, '').split('/')[0];
  return isNavVisibleForRole(role, id);
}
