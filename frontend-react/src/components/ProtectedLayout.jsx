import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Layout from './Layout';
import { useAuth, canAccessPage } from '../context/AuthContext';

export default function ProtectedLayout({ onAssistantToggle }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canAccessPage(user.role, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout onAssistantToggle={onAssistantToggle}>
      <Outlet />
    </Layout>
  );
}
