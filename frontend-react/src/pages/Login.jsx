import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const sealSVG = (size) => (
  <svg width={size} height={size} viewBox="0 0 60 60" style={{ color: '#B8863B' }}>
    <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="30" cy="30" r="21" fill="none" stroke="currentColor" strokeWidth="1" />
    <path d="M19 30.5 26 37 41 21" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendOk, setBackendOk] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/health')
      .then((r) => { if (mounted) setBackendOk(r.ok); })
      .catch(() => { if (mounted) setBackendOk(false); });
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.error || 'Login failed. Please try again.');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 15% 20%, rgba(184,134,59,.10), transparent 45%), radial-gradient(circle at 85% 80%, rgba(46,95,130,.12), transparent 50%), #0F1B2D',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: '#fff',
          borderRadius: '16px',
          padding: '44px 40px 36px',
          boxShadow: '0 12px 40px rgba(15,27,45,.16)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ marginBottom: '12px' }}>{sealSVG(52)}</div>
          <div className="font-display" style={{ fontSize: '21px', fontWeight: 600, color: '#1C2430' }}>
            Vendor Passport
          </div>
          <div style={{ fontSize: '11px', color: '#6C7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
            Audit &middot; Compliance &middot; Certification
          </div>
        </div>

        <h1 className="font-display" style={{ fontSize: '26px', fontWeight: 500, color: '#1C2430', marginBottom: '6px' }}>
          Sign in to your workspace
        </h1>

        <div style={{ fontSize: '13.5px', color: '#6C7280', lineHeight: 1.55, marginBottom: '24px' }}>
          One platform to manage audits, compliance, certifications, risk and secure document exchange.
        </div>

        {error && (
          <div style={{ padding: '8px 12px', marginBottom: '14px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B0362A', fontSize: '12.5px' }}>
            {error}
          </div>
        )}

        {backendOk === false && (
          <div style={{ padding: '8px 12px', marginBottom: '14px', borderRadius: '6px', background: '#FEF9EE', border: '1px solid #F4D9A8', color: '#8A5B12', fontSize: '12.5px' }}>
            Server is unreachable. Check that the backend is running before signing in.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1C2430', marginBottom: '5px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              placeholder="you@company.com"
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #DAD5C4',
                borderRadius: '8px',
                background: '#FAF9F6',
                color: '#1C2430',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1C2430', marginBottom: '5px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #DAD5C4',
                borderRadius: '8px',
                background: '#FAF9F6',
                color: '#1C2430',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* No role picker here by design: your role comes from your account,
              not from a choice made at sign-in. The chips that used to sit here
              were never sent to the server, so they silently did nothing. */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 0',
              background: loading ? '#4B5563' : '#0F1B2D',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14.5px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .12s',
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.background = '#1E3355'; }}
            onMouseLeave={(e) => { if (!loading) e.target.style.background = loading ? '#4B5563' : '#0F1B2D'; }}
          >
            {loading ? 'Signing in...' : 'Sign in \u2192'}
          </button>
        </form>

        <div style={{ fontSize: '12px', color: '#9CA0A8', textAlign: 'center', marginTop: '22px' }}>
          Vendor Passport &middot; Audit &amp; Compliance Platform
        </div>
      </div>
    </div>
  );
}
