import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SEARCH_SOURCES = [
  { label:'Audits', path:'/audits', fields:['title'] },
  { label:'Organizations', path:'/organizations', fields:['name'] },
  { label:'Certificates', path:'/certificates', fields:['name','holder'] },
  { label:'Findings', path:'/findings', fields:['title'] },
  { label:'Documents', path:'/documents', fields:['name'] },
  { label:'Risks', path:'/risks', fields:['title'] },
  { label:'Controls', path:'/controls', fields:['name'] },
];

export default function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const { authHeaders } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  async function search(val) {
    setQ(val);
    if (val.length < 1) { setResults([]); setOpen(false); return; }
    setOpen(true);
    const all = [];
    for (const src of SEARCH_SOURCES) {
      try {
        const res = await fetch(`/api/${src.path.split('/')[1]}?search=${encodeURIComponent(val)}`, { headers: authHeaders });
        const data = await res.json();
        if (data.data?.length) all.push(...data.data.map(item => ({
          label: item.title || item.name,
          sub: src.label,
          path: src.path,
          id: item._id,
        })).slice(0, 3));
      } catch {}
    }
    setResults(all.slice(0, 8));
  }

  return (
    <div ref={ref} className="relative" style={{ width: '340px' }}>
      <input
        type="search"
        value={q}
        onChange={e => search(e.target.value)}
        placeholder="Search audits, organizations, certificates, documents…"
        className="text-nav border border-border-2 rounded-pill bg-paper w-full focus:outline-none focus:ring-2 focus:ring-seal/30"
        style={{ padding: '8px 12px 8px 34px' }}
      />
      <svg
        className="absolute text-[#9CA0A8] pointer-events-none"
        style={{ left: '11px', top: '9px' }}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 max-h-[360px] overflow-y-auto z-50" style={{ top: '38px', background: '#fff', border: '1px solid #E5E1D3', borderRadius: '10px', boxShadow: '0 12px 40px rgba(15,27,45,.16)' }}>
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => { setOpen(false); setQ(''); navigate(r.path); }}
              className={`text-crumb w-full text-left flex justify-between items-center hover:bg-paper ${
                i < results.length - 1 ? 'border-b border-border' : ''
              }`}
              style={{ padding: '9px 14px', gap: '8px' }}
            >
              <span>{r.label}</span>
              <span className="text-[10px] text-[#6C7280]">{r.sub}</span>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
