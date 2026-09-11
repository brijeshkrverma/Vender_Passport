import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/**
 * Themed confirmation dialog.
 *
 * Destructive actions used to call window.confirm(), which renders the
 * browser's own grey OS dialog — wrong typeface, wrong colours, no way to mark
 * a destructive action as destructive, and no styling in dark mode. This uses
 * the app's own surface, seal accent and ink palette instead.
 *
 * Usage mirrors the native call so replacing it stays a one-liner:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Remove user?', message: '…', tone: 'danger' })) { … }
 */

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);
  const confirmBtn = useRef(null);

  const confirm = useCallback((options) => {
    // A string keeps the simplest call sites short.
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    setRequest({
      title: opts.title || 'Are you sure?',
      message: opts.message || '',
      detail: opts.detail || '',
      confirmLabel: opts.confirmLabel || 'Confirm',
      cancelLabel: opts.cancelLabel || 'Cancel',
      tone: opts.tone === 'danger' ? 'danger' : 'default',
    });
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const settle = useCallback((answer) => {
    setRequest(null);
    if (resolver.current) { resolver.current(answer); resolver.current = null; }
  }, []);

  // Escape cancels; the confirm button takes focus so Enter works too.
  useEffect(() => {
    if (!request) return;
    const onKey = (e) => { if (e.key === 'Escape') settle(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    confirmBtn.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [request, settle]);

  const isDanger = request?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {request && (
        <div className="fixed inset-0 flex items-center justify-center p-5" style={{ zIndex: 120 }}>
          <div className="fixed inset-0" style={{ background: 'rgba(15,20,30,.42)' }} onClick={() => settle(false)} />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative bg-surface w-[440px] max-w-full flex flex-col"
            style={{ borderRadius: 16, boxShadow: '0 12px 40px rgba(15,27,45,.16)' }}
          >
            <div style={{ padding: '24px 26px 18px' }}>
              <div style={{ display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDanger ? 'rgba(176,54,42,.10)' : 'rgba(184,134,59,.14)',
                    color: isDanger ? '#B0362A' : '#B8863B',
                  }}
                >
                  {isDanger ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2 2 20h20L12 2Z" /><path d="M12 9v5" /><circle cx="12" cy="17.2" r=".7" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><circle cx="12" cy="16.2" r=".7" fill="currentColor" />
                    </svg>
                  )}
                </span>

                <div style={{ minWidth: 0 }}>
                  <h3 id="confirm-title" className="font-semibold text-ink-900" style={{ fontSize: 15.5, margin: 0 }}>
                    {request.title}
                  </h3>
                  {request.message && (
                    <p style={{ fontSize: 13, lineHeight: 1.55, color: '#6C7280', margin: '7px 0 0' }}>
                      {request.message}
                    </p>
                  )}
                  {request.detail && (
                    <p style={{ fontSize: 11.5, lineHeight: 1.5, color: '#9CA0A8', margin: '8px 0 0' }}>
                      {request.detail}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-end gap-2"
              style={{ padding: '14px 26px 20px', borderTop: '1px solid #E5E1D3' }}
            >
              <button
                onClick={() => settle(false)}
                className="text-xs font-semibold border border-border rounded-lg px-4 py-2 hover:bg-paper"
              >
                {request.cancelLabel}
              </button>
              <button
                ref={confirmBtn}
                onClick={() => settle(true)}
                className="text-xs font-semibold text-white rounded-lg px-5 py-2"
                style={{ background: isDanger ? '#B0362A' : '#0F1B2D' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isDanger ? '#8F2B22' : '#1E3355'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isDanger ? '#B0362A' : '#0F1B2D'; }}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
