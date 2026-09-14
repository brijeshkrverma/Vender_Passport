import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import ProtectedLayout from './components/ProtectedLayout';
import { useKeyboard } from './hooks/useKeyboard';

import Dashboard from './pages/Dashboard';
import Audits from './pages/Audits';
import AuditDetail from './pages/AuditDetail';
import Findings from './pages/Findings';
import Organizations from './pages/Organizations';
import Certificates from './pages/Certificates';
import Risks from './pages/Risks';
import Controls from './pages/Controls';
import Frameworks from './pages/Frameworks';
import CAPA from './pages/CAPA';
import Documents from './pages/Documents';
import Evidence from './pages/Evidence';
import Vendors from './pages/Vendors';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Questionnaire from './pages/Questionnaire';
import QuestionnaireEditor from './features/questionnaire/pages/QuestionnaireEditor';
import QuestionnaireList from './features/questionnaire/pages/QuestionnaireList';
import AnswerQuestionnaire from './features/questionnaire/pages/AnswerQuestionnaire';
import AssessorQueue from './features/questionnaire/pages/AssessorQueue';
import AssessSubmission from './features/questionnaire/pages/AssessSubmission';
import CCM from './pages/CCM';
import AIDrafts from './pages/AIDrafts';
import Calendar from './pages/Calendar';
import Gantt from './pages/Gantt';
import BulkInvite from './pages/BulkInvite';
import VendorScorecard from './pages/VendorScorecard';
import AuditUniverse from './pages/AuditUniverse';
import WorkingPapers from './pages/WorkingPapers';
import GapAnalysis from './pages/GapAnalysis';
import RegulatoryChanges from './pages/RegulatoryChanges';
import MaturityModel from './pages/MaturityModel';
import ClientPortfolio from './pages/ClientPortfolio';
import StubPage from './pages/StubPage';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Notifications from './pages/Notifications';
import MyWorkspace from './pages/MyWorkspace';
import ExpiryAlerts from './pages/ExpiryAlerts';
import RiskHeatmap from './pages/RiskHeatmap';
import ControlTesting from './pages/ControlTesting';
import Auditors from './pages/Auditors';
import QuestionBank from './pages/QuestionBank';
import ReportScheduler from './pages/ReportScheduler';
import PolicyLifecycle from './pages/PolicyLifecycle';
import AuditorWorkspace from './pages/AuditorWorkspace';
import AuditTrail from './pages/AuditTrail';

export default function App() {
  useKeyboard();

  return (
    <ToastProvider>
      <ConfirmProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-workspace" element={<MyWorkspace />} />

          <Route path="/audits" element={<Audits />} />
          <Route path="/audits/:id" element={<AuditDetail />} />
          <Route path="/audit-universe" element={<AuditUniverse />} />
          <Route path="/auditor-workspace" element={<AuditorWorkspace />} />
          <Route path="/working-papers" element={<WorkingPapers />} />
          <Route path="/audit-program" element={<StubPage title="Audit Program" />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/questionnaire-list" element={<QuestionnaireList />} />
          <Route path="/answer-questionnaire" element={<AnswerQuestionnaire />} />
          <Route path="/assessor-queue" element={<AssessorQueue />} />
          <Route path="/assess/:id" element={<AssessSubmission />} />
          <Route path="/questionnaire-create" element={<QuestionnaireEditor />} />
          <Route path="/questionnaire-edit/:id" element={<QuestionnaireEditor />} />
          <Route path="/question-bank" element={<QuestionBank />} />
          <Route path="/q-scoring" element={<StubPage title="Scoring Engine" />} />
          <Route path="/sampling-engine" element={<StubPage title="Sampling Engine" />} />
          <Route path="/maturity-model" element={<MaturityModel />} />
          <Route path="/self-assessment" element={<StubPage title="Self Assessment" />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/mgmt-response" element={<StubPage title="Management Response" />} />
          <Route path="/ccm-dashboard" element={<CCM />} />

          <Route path="/risks" element={<Risks />} />
          <Route path="/risk-heatmap" element={<RiskHeatmap />} />
          <Route path="/control-testing" element={<ControlTesting />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/gap-analysis" element={<GapAnalysis />} />
          <Route path="/traceability" element={<StubPage title="Traceability Chain" />} />
          <Route path="/issues" element={<StubPage title="Issue Escalation" />} />
          <Route path="/exceptions" element={<StubPage title="Exceptions & Waivers" />} />
          <Route path="/regulatory-changes" element={<RegulatoryChanges />} />

          <Route path="/frameworks" element={<Frameworks />} />
          <Route path="/framework-taxonomy" element={<Frameworks />} />
          <Route path="/framework-diff" element={<StubPage title="Framework Version Diff" />} />

          <Route path="/certificates" element={<Certificates />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/exchange" element={<StubPage title="Document Exchange" />} />

          <Route path="/esg" element={<StubPage title="ESG & BRSR" />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/:id/scorecard" element={<VendorScorecard />} />
          <Route path="/bulk-invite" element={<BulkInvite />} />

          <Route path="/calendar" element={<Calendar />} />
          <Route path="/capa" element={<CAPA />} />
          <Route path="/gantt" element={<Gantt />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/report-scheduler" element={<ReportScheduler />} />
          <Route path="/risk-scheduler" element={<StubPage title="Risk-Based Scheduler" />} />
          <Route path="/sla-dashboard" element={<StubPage title="SLA Dashboard" />} />
          <Route path="/audit-cost" element={<StubPage title="Audit Cost" />} />

          <Route path="/ai-drafts" element={<AIDrafts />} />

          <Route path="/organizations" element={<Organizations />} />
          <Route path="/org-compare" element={<StubPage title="Org Comparison" />} />
          <Route path="/org-hierarchy" element={<StubPage title="Org Hierarchy" />} />
          <Route path="/client-portfolio" element={<ClientPortfolio />} />
          <Route path="/auditors" element={<Auditors />} />

          <Route path="/three-lines" element={<StubPage title="Three Lines Model" />} />

          <Route path="/competency" element={<StubPage title="Competency Matrix" />} />
          <Route path="/doc-versions" element={<StubPage title="Doc Versions" />} />
          <Route path="/policy-lifecycle" element={<PolicyLifecycle />} />
          <Route path="/perm-matrix" element={<StubPage title="Permission Matrix" />} />
          <Route path="/role-dashboard" element={<StubPage title="Role Dashboard" />} />

          <Route path="/notifications" element={<Notifications />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/expiry-alerts" element={<ExpiryAlerts />} />
          <Route path="/audit-trail" element={<AuditTrail />} />
          <Route path="/api-integrations" element={<StubPage title="Webhooks" />} />
          <Route path="/my-passport" element={<StubPage title="My Passport" />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      {/*
        * The onboarding wizard and the assistant used to be rendered here, as
        * siblings of <Routes> — which put them on /login and /register too.
        * They now live in ProtectedLayout, which routing already guarantees is
        * signed-in-only. See the note in that file.
        */}
      </ConfirmProvider>
    </ToastProvider>
  );
}
