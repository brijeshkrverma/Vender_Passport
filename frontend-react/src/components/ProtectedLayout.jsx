import { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Layout from './Layout';
import OnboardingWizard from './OnboardingWizard';
import AssistantFAB from './AssistantFAB';
import AssistantPanel from './AssistantPanel';
import { useAuth, canAccessPage } from '../context/AuthContext';

/**
 * The signed-in shell — and the only place the floating overlays belong.
 *
 * ── WHY THE WIZARD AND THE ASSISTANT LIVE HERE ────────────────────────────
 *
 * They used to be rendered in `App.jsx`, as siblings of `<Routes>`. That put
 * them on *every* URL the router could match, `/login` and `/register`
 * included: a "Welcome to Vendor Passport" dialog and an "Ask Passport" button
 * on the sign-in screen, the latter opening a panel that read "Answering for
 * Organization · undefined" and whose every question would have come back 401.
 *
 * Gating them on `isAuthenticated` up there was not enough. Somebody who is
 * already signed in and goes back to `/login` — to switch accounts, say — is
 * authenticated, so both still appeared on the login form.
 *
 * Here, they cannot. This component returns a redirect before rendering
 * anything when there is no user, and it is mounted only under the protected
 * route subtree, which `/login` and `/register` are not part of. The question
 * "are we allowed to show this?" is answered once, by routing, instead of by a
 * condition each overlay has to remember to repeat.
 */
export default function ProtectedLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canAccessPage(user.role, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Layout onAssistantToggle={() => setAssistantOpen((v) => !v)}>
        <Outlet />
      </Layout>

      <OnboardingWizard />
      <AssistantFAB onToggle={() => setAssistantOpen((v) => !v)} />
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </>
  );
}
