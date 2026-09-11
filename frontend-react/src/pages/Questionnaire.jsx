import { Navigate } from 'react-router-dom';

/**
 * The old template-list screen.
 *
 * It read a second questionnaire model that has been removed — its questions
 * lived inside templates and were invisible to the questionnaire an applicant
 * actually filled in. The question list is now the one place questions are
 * managed, so this redirects there rather than showing an empty page or a
 * broken fetch.
 *
 * Kept as a redirect rather than deleted because the route is linked from the
 * sidebar and from saved bookmarks.
 */
export default function Questionnaire() {
  return <Navigate to="/questionnaire-list" replace />;
}
