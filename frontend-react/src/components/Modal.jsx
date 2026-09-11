import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    const esc = e => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-5" style={{zIndex:95}}>
      <div className="fixed inset-0 bg-[rgba(15,20,30,.42)]" onClick={onClose} />
      <div className="relative bg-surface w-[640px] max-w-full max-h-[88vh] overflow-y-auto flex flex-col" 
        style={{borderRadius:16, boxShadow:'0 12px 40px rgba(15,27,45,.16)'}} role="dialog" aria-modal="true">
        <div className="sticky top-0 bg-surface z-[2] flex items-center justify-between" style={{padding:'20px 24px', borderBottom:'1px solid #E5E1D3'}}>
          <h3 className="font-semibold text-[15px] m-0">{title}</h3>
          <button onClick={onClose} className="flex-shrink-0" style={{width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'#6C7280'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#F6F4EE'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{padding:'22px 24px'}}>{children}</div>
        {footer && <div className="sticky bottom-0 bg-surface flex items-center justify-between" style={{padding:'16px 24px', borderTop:'1px solid #E5E1D3'}}>{footer}</div>}
      </div>
    </div>
  );
}
