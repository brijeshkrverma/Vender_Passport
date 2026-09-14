import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

// Must stay a subset of SELF_SIGNUP_ROLES in backend/shared/roles.js.
// 'Super Admin' is never offered — it bypasses tenant isolation.
const ROLES = ['Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Vendor Manager', 'External Company User', 'CA / Consultant'];

const sealSVG = (size) => (
  <svg width={size} height={size} viewBox="0 0 60 60" style={{ color: '#B8863B' }}>
    <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="30" cy="30" r="21" fill="none" stroke="currentColor" strokeWidth="1" />
    <path d="M19 30.5 26 37 41 21" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '13.5px',
  border: '1px solid #DAD5C4',
  borderRadius: '6px',
  background: '#FCFBF8',
  color: '#1C2430',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#1C2430',
  marginBottom: '5px',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('Compliance Manager');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password || !orgName.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    const result = await register({
      email: email.trim(),
      password,
      name: fullName.trim(),
      role,
      orgName: orgName.trim(),
    });
    setSubmitting(false);
    // Surface the server's actual reason (duplicate email, existing org name,
    // rejected role) instead of a generic message that hides the cause.
    if (result.success) {
      // Sign-up lands straight on the dashboard, which on its own gives no sign
      // that an organization was created — and that, not the account, is the
      // part that surprises people later.
      toast(
        `Welcome, ${fullName.trim().split(' ')[0]}`,
        `${orgName.trim()} has been created and you are signed in as ${role}.`,
        'success',
      );
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = '#B8863B';
    e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)';
  };
  const handleBlur = (e) => {
    e.target.style.borderColor = '#DAD5C4';
    e.target.style.boxShadow = 'none';
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
          Create your account
        </h1>

        <div style={{ fontSize: '13.5px', color: '#6C7280', lineHeight: 1.55, marginBottom: '24px' }}>
          Get started with Vendor Passport &mdash; free for vendors, always.
        </div>

        {error && (
          <div style={{ padding: '8px 12px', marginBottom: '14px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B0362A', fontSize: '12.5px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Priya Sharma"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="you@company.com"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Min 8 characters"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Your organization"
            />
            <div style={{ fontSize: '11.5px', color: '#6C7280', marginTop: '5px', lineHeight: 1.45 }}>
              This creates a new organization. To join one that already exists, ask its
              administrator to invite you.
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...labelStyle, marginBottom: '8px' }}>Role</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {ROLES.map((r) => {
                const isActive = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      border: isActive ? '1px solid #0F1B2D' : '1px solid #DAD5C4',
                      background: isActive ? '#0F1B2D' : 'transparent',
                      color: isActive ? '#fff' : '#6C7280',
                      cursor: 'pointer',
                      transition: 'all .12s',
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '13.5px',
              fontWeight: 600,
              background: '#0F1B2D',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'background .12s',
            }}
            onMouseEnter={(e) => { if (!submitting) e.target.style.background = '#1E3355'; }}
            onMouseLeave={(e) => { if (!submitting) e.target.style.background = '#0F1B2D'; }}
          >
            {submitting ? 'Creating account...' : 'Create Account \u2192'}
          </button>
        </form>

        <div style={{ fontSize: '13.5px', color: '#6C7280', textAlign: 'center', marginTop: '20px' }}>
          Already have an account?{' '}
          <span
            onClick={() => navigate('/login')}
            style={{ color: '#B8863B', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            Sign in
          </span>
        </div>

        <div style={{ fontSize: '12px', color: '#9CA0A8', textAlign: 'center', marginTop: '22px' }}>
          Vendor Passport &middot; Audit &amp; Compliance Platform
        </div>
      </div>
    </div>
  );
}
