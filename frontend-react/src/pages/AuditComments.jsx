import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const MOCK_COMMENTS = {
  'default': [
    { author:'Rohit Kapoor', role:'Auditor', text:'Flagged during surveillance audit \u2014 pen test was due 4 months ago', time:'3d ago' },
    { author:'Priya Sharma', role:'Compliance Manager', text:'Vendor security team notified, scheduling test for next week', time:'1d ago' },
  ]
};

export default function CommentThread({ findingId, orgId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(MOCK_COMMENTS.default);
  const [text, setText] = useState('');

  function addComment() {
    if (!text.trim()) return;
    // TODO: POST /api/comments when API is available
    setComments([...comments, { author:user?.name||'You', role:user?.role||'', text:text.trim(), time:'Just now' }]);
    setText('');
  }

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-3">Discussion</div>
      {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet</p>}
      {comments.map((c, i) => (
        <div key={i} className="py-2 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full bg-ink-600 text-white flex items-center justify-center text-[9px] font-semibold">{c.author.split(' ').map(s=>s[0]).join('')}</div>
            <span className="text-xs font-semibold">{c.author}</span>
            <span className="text-[10px] text-gray-400">{c.role} \u00b7 {c.time}</span>
          </div>
          <div className="text-xs ml-7">{c.text}</div>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key==='Enter') addComment(); }}
          className="flex-1 border border-border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-seal/30" placeholder="Add a comment..." />
        <button onClick={addComment} className="bg-seal text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-seal-dark">Post</button>
      </div>
    </div>
  );
}
