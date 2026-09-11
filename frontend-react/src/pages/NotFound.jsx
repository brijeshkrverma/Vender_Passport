import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-2xl font-display font-semibold mb-2">404 — Page Not Found</h1>
        <p className="text-sm text-gray-500 mb-6">
          The page you are looking for does not exist or you do not have access to it.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm">Go Back</button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary btn-sm">Dashboard</button>
        </div>
      </div>
    </div>
  );
}
