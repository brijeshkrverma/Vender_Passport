import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, sub, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, sub, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/*
        * Stacked ABOVE the assistant button, not on top of it.
        *
        * This used to sit at bottom:22 / right:22 with z-index 200, and the
        * "Ask Passport" button sits at bottom:24 / right:24 with z-index 85 —
        * the same corner, with the toast winning. Every save, every error,
        * every "Settings saved" covered the button for the three seconds the
        * toast was up, and a click in that window hit the toast instead.
        *
        * 84px clears the 52px button plus its 24px offset. `pointer-events`
        * is off on the container so the empty stack never intercepts anything
        * either — only the toasts themselves are solid.
        */}
      <div
        style={{position:'fixed',bottom:84,right:22,zIndex:200,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}
        role="alert"
        aria-live="assertive"
      >
        {toasts.map(t => {
          const colors = {success:'#1F7A4D',warning:'#B4650B',error:'#B0362A',info:'#2E5F82'};
          const iconBg = colors[t.type] || '#1F7A4D';
          return (
            <div key={t.id} style={{background:'#0F1B2D',color:'#fff',padding:'13px 16px',borderRadius:9,boxShadow:'0 12px 40px rgba(15,27,45,.16)',fontSize:13,display:'flex',alignItems:'center',gap:10,minWidth:280,animation:'toastIn .18s ease',pointerEvents:'auto'}}>
              <span style={{width:22,height:22,borderRadius:'50%',background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M20 6 9 17l-5-5"/></svg>
              </span>
              <div>
                <div style={{fontWeight:600}}>{t.message}</div>
                {t.sub && <div style={{opacity:.75,fontSize:'11.5px',marginTop:1}}>{t.sub}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
