import { useEffect } from 'react';

export default function Drawer({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {open && <div className="fixed inset-0 bg-[rgba(15,20,30,.42)]" style={{zIndex:90}} onClick={onClose} />}
      <div className="fixed top-0 right-0 h-full bg-surface overflow-y-auto flex flex-col" 
        style={{width:460, maxWidth:'92vw', zIndex:95, boxShadow:'0 12px 40px rgba(15,27,45,.16)', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .22s ease' }}
        role="dialog" aria-modal="true">
        <div className="sticky top-0 bg-surface z-[2]" style={{padding:'20px 22px', borderBottom:'1px solid #E5E1D3', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
          <div>
            {subtitle && <div className="font-mono text-[#9CA0A8] text-[11px]">{subtitle}</div>}
            <h3 className="font-semibold text-base mt-0.5">{title || 'Detail'}</h3>
          </div>
          <button onClick={onClose} className="flex-shrink-0" style={{width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',color:'#6C7280'}}
            onMouseEnter={e=>{e.currentTarget.style.background='#F6F4EE'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{padding:'20px 22px 40px'}}>{children}</div>
      </div>
    </>
  );
}
