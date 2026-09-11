export default function SlidePanel({ open, onClose, title, subtitle, children }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div className={`assistant-panel fixed top-0 right-0 h-full w-[430px] max-w-[94vw] bg-surface shadow-2xl z-50 transform transition-transform duration-200 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm" style={{ fontWeight: 700 }}>{title || 'Ask Passport'}</div>
            {subtitle && <div className="text-[10px] text-gray-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
