const sealSVG = (
  <svg width="22" height="22" viewBox="0 0 60 60" fill="none" style={{ transform: 'rotate(-4deg)' }}>
    <circle cx="30" cy="30" r="27" stroke="#F2D9AE" strokeWidth="2" />
    <circle cx="30" cy="30" r="21" stroke="#F2D9AE" strokeWidth="1" />
    <path d="M19 30.5 26 37 41 21" stroke="#F2D9AE" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function AssistantFAB({ onToggle }) {
  return (
    <button
      onClick={onToggle}
      title="Ask Passport"
      className="assistant-fab"
      aria-label="Open assistant"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 85,
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: '#0F1B2D',
        border: '2px solid rgba(184,134,59,.30)',
        boxShadow: '0 12px 40px rgba(15,27,45,.16)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(15,27,45,.28)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(15,27,45,.16)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(.96)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.08)';
      }}
    >
      <div style={{ position: 'relative' }}>
        {sealSVG}
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#B8863B',
            border: '2px solid #fff',
            display: 'block',
          }}
        />
      </div>
    </button>
  );
}
