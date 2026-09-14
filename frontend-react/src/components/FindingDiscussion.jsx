import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { statusColor, sevColor, fmtDate } from '../hooks/useApi';

export default function FindingDiscussion({ finding, onClose }) {
  const { user, authHeaders } = useAuth();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!finding) return;
    setLoading(true);
    fetch(`/api/comments/by-finding/${finding._id || finding.id}`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(json => { setComments(json?.data ?? []); })
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [finding]);

  async function addComment(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ findingId: finding._id || finding.id, body: body.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setComments([...comments, json?.data ?? json]);
        setBody('');
      }
    } catch (e) {}
    setSending(false);
  }

  async function deleteComment(id) {
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) setComments(comments.filter((c) => (c._id || c.id) !== id));
    } catch (e) {}
  }

  if (!finding) return null;

  return (
    <Modal open={!!finding} onClose={onClose} title={finding.title || 'Finding Discussion'}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${sevColor(finding.severity)}`}>{finding.severity || '—'}</span>
          <span className={`badge ${statusColor(finding.status)}`}>{finding.status || 'Open'}</span>
          {finding.criteria && <span className="badge badge-neutral">{finding.criteria}</span>}
        </div>

        {(finding.description || finding.cause || finding.action) && (
          <div className="text-xs text-gray-600 space-y-1.5">
            {finding.description && <p>{finding.description}</p>}
            {finding.cause && <p><span className="text-gray-400 font-medium">Cause:</span> {finding.cause}</p>}
            {finding.action && <p><span className="text-gray-400 font-medium">Action:</span> {finding.action}</p>}
          </div>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
            Discussion ({comments.length})
          </div>
          <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-xs text-gray-400 py-4 text-center">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No comments yet — start the discussion</p>
            ) : (
              comments.map((c) => (
                <div key={c._id || c.id} className="flex items-start gap-2.5 bg-paper border border-border rounded-lg p-3">
                  <div className="w-7 h-7 rounded-full bg-seal-bg text-seal-dark flex items-center justify-center text-xs font-bold shrink-0">
                    {(c.author || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink-900">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{fmtDate(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                  </div>
                  {(c.authorId === user?.id || user?.role === 'Super Admin') && (
                    <button onClick={() => deleteComment(c._id || c.id)} className="text-gray-300 hover:text-danger text-xs" title="Delete" aria-label="Delete comment">
                      &times;
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <form onSubmit={addComment} className="flex gap-2 pt-1 border-t border-border">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Add a comment..."
            className="flex-1 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seal/30 resize-none"
          />
          <button type="submit" disabled={sending || !body.trim()}
            className="bg-seal text-white px-4 py-2 rounded text-sm font-semibold hover:bg-seal-dark disabled:opacity-50 self-end">
            Post
          </button>
        </form>
      </div>
    </Modal>
  );
}
