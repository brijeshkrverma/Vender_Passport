import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import NotificationPanel from './NotificationPanel';
import { useConfirm } from './ConfirmDialog';


// `?new=1` makes the destination page open its create dialog straight away
// (see hooks/useCreateFromUrl.js). Without it these entries only dropped the
// user on a list page and left them to find the button.
const CREATE_ITEMS = [
  // Was a modal opened here instead of a navigation, which is why the Audits
  // page itself had no way to create one. Now it is the same pattern as the
  // rest: land on the list, and the list opens its own wizard.
  { label: 'New Audit', icon: 'audit', action: 'navigate', path: '/audits?new=1' },
  { label: 'New Finding', icon: 'finding', action: 'navigate', path: '/findings?new=1' },
  { label: 'New CAPA', icon: 'finding', action: 'navigate', path: '/capa?new=1' },
  { label: 'New Risk', icon: 'risk', action: 'navigate', path: '/risks?new=1' },
  { label: 'Add Certificate', icon: 'cert', action: 'navigate', path: '/certificates?new=1' },
  { label: 'Add Vendor', icon: 'org', action: 'navigate', path: '/vendors?new=1' },
  { label: 'Add User', icon: 'org', action: 'navigate', path: '/users?new=1' },
  { label: 'Upload Document', icon: 'doc', action: 'navigate', path: '/documents' },
  { label: 'Invite Vendors (bulk)', icon: 'org', action: 'navigate', path: '/bulk-invite' },
];

export default function Topbar({ title, onAssistantToggle, onHamburgerClick }) {
  const { user, authHeaders, logout } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef(null);
  const userRef = useRef(null);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unread = notifications.filter(n => n.unread).length;

  /**
   * Sign out behind a confirmation. Unsaved work in an open dialog would be
   * lost, and a mis-click on a menu item should not end the session.
   */
  async function handleSignOut() {
    setUserOpen(false);
    const ok = await confirm({
      title: 'Sign out?',
      message: `You will be signed out of ${user?.orgName || 'this workspace'} and returned to the login screen.`,
      confirmLabel: 'Sign out',
      tone: 'danger',
    });
    if (!ok) return;
    logout();
    navigate('/login', { replace: true });
  }
  
  useEffect(() => {
    if (!user) return;
    const token = authHeaders?.Authorization?.replace('Bearer ', '');
    if (!token) return;

    let cancelled = false;
    fetch('/api/notifications', { headers: authHeaders })
      .then(res => (res.ok ? res.json() : null))
      .then(json => { if (!cancelled) setNotifications(json?.data || []); })
      .catch(() => { if (!cancelled) setNotifications([]); });

    // EventSource cannot send headers, so the token travels as a query param;
    // the notifications router accepts it for this route only.
    const sse = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
    sse.onmessage = (e) => {
      try {
        const newNotif = JSON.parse(e.data);
        setNotifications(prev => [newNotif, ...prev]);
      } catch (err) {}
    };
    // Without a handler a failed stream logs an unhandled error on every retry.
    sse.onerror = () => sse.close();

    return () => { cancelled = true; sse.close(); };
  }, [user, authHeaders]);

  useEffect(() => {
    const handler = (e) => {
      if (createRef.current && !createRef.current.contains(e.target)) setCreateOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Escape closes the account menu without touching the session.
  useEffect(() => {
    if (!userOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setUserOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [userOpen]);

  function quickCreateIcon(name) {
    const icons = {
      audit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3h9a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7l4-4Z"/><path d="M9 3v4H5"/><path d="M8 13h8M8 17h5"/></svg>`,
      finding: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 2 20h20L12 2Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>`,
      doc: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 2h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/></svg>`,
      cert: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>`,
      exchange: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h13l-3-3M20 17H7l3 3"/></svg>`,
      org: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16"/><path d="M15 21V10a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v11"/></svg>`,
    };
    return icons[name] || '';
  }

  return (
    <header className="h-topbar bg-surface border-b border-border flex items-center justify-between sticky top-0 z-20" style={{ padding: '0 22px' }}>
      <div className="flex items-center gap-2 text-crumb text-[#6C7280]">
        {/* Hamburger */}
          <button
            className="md:hidden flex items-center justify-center"
            onClick={onHamburgerClick}
            style={{ width: '34px', height: '34px', borderRadius: '7px', border: '1px solid #DAD5C4', background: '#fff', cursor: 'pointer' }}
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="#1C2430" strokeWidth="1.6" strokeLinecap="round">
            <line x1="1" y1="1" x2="15" y2="1" />
            <line x1="1" y1="6" x2="15" y2="6" />
            <line x1="1" y1="11" x2="15" y2="11" />
          </svg>
        </button>
        <span>Vendor Passport</span>
        <span className="-mx-0.5">/</span>
        <span className="font-semibold text-ink">{title}</span>
      </div>

      <div className="flex items-center gap-3 relative">
        {/* + Create Button */}
        <div ref={createRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-seal btn-sm"
            onClick={() => setCreateOpen(!createOpen)}
          >
            + Create
          </button>
          {createOpen && (
            <div
              className="quick-create-menu dropdown"
              style={{
                position: 'absolute',
                top: '38px',
                right: 0,
                width: '220px',
                background: '#fff',
                border: '1px solid #E5E1D3',
                borderRadius: '10px',
                boxShadow: '0 12px 40px rgba(15,27,45,.16)',
                zIndex: 60,
                padding: '6px',
              }}
            >
              {CREATE_ITEMS.map((item, i) => (
                <div key={item.label}>
                  <button
                    className="quick-create-item"
                    onClick={() => {
                      setCreateOpen(false);
                      navigate(item.path);
                    }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '9px 14px',
                      fontSize: '13.5px', color: '#1C2430', background: 'transparent',
                      border: 'none', borderRadius: '6px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}
                    onMouseEnter={(e) => { e.target.style.background = '#F6F4EE'; }}
                    onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                  >
                    <span style={{opacity:0.65, display:'flex'}} dangerouslySetInnerHTML={{__html: quickCreateIcon(item.icon)}} />
                    {item.label}
                  </button>
                  {i < CREATE_ITEMS.length - 1 && (
                    <div style={{ height: '1px', background: '#E5E1D3', margin: '2px 6px' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <GlobalSearch />

        {/* Notification Bell */}
        <button
          className="w-[34px] h-[34px] rounded-[8px] text-[#6C7280] hover:bg-paper hover:text-ink flex items-center justify-center transition relative"
          onClick={() => setNotifsOpen(!notifsOpen)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unread > 0 && (
            <span className="w-[7px] h-[7px] rounded-full bg-danger border-[1.5px] border-surface absolute top-[6px] right-[6px]" />
          )}
        </button>

        {/* User chip \u2014 opens the account menu that holds Sign out */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setUserOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={userOpen}
            className="flex items-center rounded-pill border border-border-2 hover:bg-paper transition-colors"
            style={{ padding: '5px 10px 5px 5px', gap: '9px' }}
          >
            <div className="w-[26px] h-[26px] rounded-full bg-ink-3 text-white text-badge font-semibold flex items-center justify-center">
              {user?.name?.split(' ').map(s => s[0]).join('').toUpperCase() || 'U'}
            </div>
            <div className="text-left">
              <div className="text-crumb font-semibold">{user?.name || 'User'}</div>
              <div className="text-[10.5px] text-[#6C7280]">{user?.role || '\u2014'}</div>
            </div>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6C7280" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: userOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {userOpen && (
            <div
              role="menu"
              className="absolute right-0 bg-surface border border-border overflow-hidden"
              style={{ top: 'calc(100% + 8px)', minWidth: 214, borderRadius: 11, boxShadow: '0 12px 40px rgba(15,27,45,.16)', zIndex: 60 }}
            >
              <div style={{ padding: '11px 14px', borderBottom: '1px solid #E5E1D3' }}>
                <div className="text-[12.5px] font-semibold text-ink-900">{user?.name || 'User'}</div>
                <div className="text-[11px] text-[#6C7280]">{user?.email || ''}</div>
                <div className="text-[10.5px] text-[#9CA0A8] mt-0.5">{user?.orgName || ''}</div>
              </div>

              <button role="menuitem" onClick={() => { setUserOpen(false); navigate('/settings'); }}
                className="w-full text-left text-[12.5px] text-ink-900 hover:bg-paper flex items-center gap-2.5"
                style={{ padding: '9px 14px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
                </svg>
                Settings
              </button>

              <button role="menuitem" onClick={handleSignOut}
                className="w-full text-left text-[12.5px] hover:bg-danger/10 flex items-center gap-2.5"
                style={{ padding: '9px 14px', color: '#B0362A', borderTop: '1px solid #E5E1D3' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5M21 12H9" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>

        <NotificationPanel open={notifsOpen} onClose={() => setNotifsOpen(false)} notifications={notifications} setNotifications={setNotifications} />
      </div>
    </header>
  );
}
