import { useState, useRef, useEffect } from 'react';
import SlidePanel from './SlidePanel';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

/**
 * The server's own limit, mirrored so the box can stop you before the round
 * trip rather than after it (`assistant.routes.js` → `validateQuery`).
 */
const MAX_CHARS = 2000;

/**
 * Turn a failed response into something the person can act on.
 *
 * Every failure used to produce the same sentence — "I couldn't answer that
 * right now. The assistant is still in beta." A rate limit, an expired session,
 * a message over the length limit and a missing API key are four different
 * problems with four different things to do about them, and that message
 * suggested waiting for all of them.
 */
function failureFor(status, body) {
  const serverSaid = body?.error || body?.message;
  switch (status) {
    case 400:
      return { text: serverSaid || 'That question could not be read. Try rephrasing it.', title: 'Not sent', tone: 'warning' };
    case 401:
      return { text: 'Your session has expired. Sign in again to keep asking.', title: 'Signed out', tone: 'error' };
    case 403:
      return { text: 'Your role is not allowed to use the assistant.', title: 'Not allowed', tone: 'error' };
    case 429:
      return { text: 'You have asked a lot of questions in the last minute. Wait about a minute and try again.', title: 'Slow down', tone: 'warning' };
    case 503:
      return { text: 'The assistant is not configured on this server (no API key). Everything else still works.', title: 'Assistant off', tone: 'warning' };
    default:
      return {
        text: serverSaid || 'Something went wrong answering that. Try again in a moment.',
        title: 'Assistant error', tone: 'error',
      };
  }
}

export default function AssistantPanel({ open, onClose }) {
  const { user, authHeaders } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const trimmed = input.trim();
  const tooLong = input.length > MAX_CHARS;
  const canSend = trimmed.length > 0 && !tooLong && !loading;

  const PROMPTS = [
    'Which certificates expire this month?',
    'Summarize open findings',
    'What is our compliance score?',
    'Which audits are in progress?',
  ];

  async function sendMessage(prefill) {
    const text = (prefill || input).trim();

    // Same three rules the server applies, checked here so an obviously
    // unsendable question does not cost a round trip or a rate-limit slot.
    if (!text || loading) return;
    if (text.length > MAX_CHARS) {
      toast('Too long', `Questions are limited to ${MAX_CHARS} characters.`, 'warning');
      return;
    }

    setMessages(m => [...m, { role: 'user', content: text, id: Date.now() }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/query', {
        method: 'POST', headers: authHeaders,
        // Only the message. `orgId`, `role` and `scope` are derived from the
        // session, and the server rejects the request outright if they appear
        // in the body — sending them would be an attempt to widen your scope.
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const f = failureFor(res.status, data);
        setMessages(m => [...m, { role: 'assistant', content: f.text, id: Date.now() + 1, failed: true }]);
        toast(f.title, f.text, f.tone);
        return;
      }

      const body = data.data || data;
      const msg = body.message || body;
      setMessages(m => [...m, { role: 'assistant', content: msg.content || 'No response', refs: body.metadata?.totalRecords, id: Date.now() + 1 }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Could not reach the server. Check your connection and try again.', id: Date.now() + 1, failed: true }]);
      toast('Query failed', 'Could not reach the assistant.', 'error');
    }
    setLoading(false);
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="Ask Passport" subtitle={`Answering for ${user?.orgName || 'Organization'} · ${user?.role}`}>
      <div className="flex-1 flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-3" style={{ padding: '16px 18px' }}>
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto mb-4 flex items-center justify-center rounded-full" style={{ width: '56px', height: '56px', background: '#FBF3E4' }}>
                <svg width="28" height="28" viewBox="0 0 60 60" style={{ color: '#B8863B' }}>
                  <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="30" cy="30" r="21" fill="none" stroke="currentColor" strokeWidth="1"/>
                  <path d="M19 30.5 26 37 41 21" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="font-display mb-1" style={{ fontSize: '17px', fontWeight: 600 }}>Ask Passport</h3>
              <p className="text-sm text-gray-500 mb-4">Ask about audits, certificates, findings, or compliance</p>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide" style={{ padding: '3px 10px', borderRadius: '12px', background: '#FBF3E4', border: '1px solid #DAD5C4', color: '#8C6526', marginBottom: '10px' }}>Beta</span>
              <div className="flex flex-wrap gap-2 justify-center">
                {PROMPTS.map(p => (
                  <button key={p} onClick={() => sendMessage(p)} className="transition" style={{ padding: '8px 14px', borderRadius: '18px', fontSize: '12px', fontWeight: 500, background: '#F6F4EE', border: '1px solid #DAD5C4', color: '#1C2430' }} onMouseEnter={e => { e.target.style.background = '#FBF3E4'; e.target.style.borderColor = '#B8863B'; e.target.style.color = '#8C6526'; }} onMouseLeave={e => { e.target.style.background = '#F6F4EE'; e.target.style.borderColor = '#DAD5C4'; e.target.style.color = '#1C2430'; }}>{p}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-2'}`}>
                {msg.role === 'assistant' && <div className="w-6 h-6 rounded-full bg-ink-900 flex-shrink-0 flex items-center justify-center" style={{ marginTop: '2px' }}><span className="text-[9px] text-seal">VP</span></div>}
                <div style={{ maxWidth: '82%', borderRadius: '14px', padding: '10px 13px', fontSize: '13px', lineHeight: 1.55, ...(msg.role === 'user' ? { borderBottomRightRadius: '4px', background: '#0F1B2D', color: '#fff' } : { borderBottomLeftRadius: '4px', background: '#fff', border: '1px solid #E5E1D3' }) }}>
                  <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                  {msg.refs > 0 && <div className="text-[10px] text-gray-400 mt-1">Answered from {msg.refs} records</div>}
                </div>
                {msg.role === 'user' && <div className="w-6 h-6 rounded-full bg-ink-600 flex-shrink-0 flex items-center justify-center" style={{ marginTop: '2px' }}><span className="text-[9px] text-white font-semibold">{user?.name?.split(' ').map(s=>s[0]).join('') || 'U'}</span></div>}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-ink-900 flex-shrink-0" />
              <div className="rounded-2xl px-4 py-3" style={{ borderBottomLeftRadius: '4px', background: '#fff', border: '1px solid #E5E1D3' }}>
                <div className="flex gap-1.5">
                  <span className="rounded-full animate-pulse" style={{ width: '7px', height: '7px', background: '#9CA0A8' }} />
                  <span className="rounded-full animate-pulse" style={{ width: '7px', height: '7px', background: '#9CA0A8', animationDelay: '0.15s' }} />
                  <span className="rounded-full animate-pulse" style={{ width: '7px', height: '7px', background: '#9CA0A8', animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border" style={{ padding: '12px 16px 16px' }}>
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              rows={1}
              maxLength={MAX_CHARS + 200}
              aria-label="Ask the assistant a question"
              aria-invalid={tooLong || undefined}
              placeholder="Ask about audits, certificates, findings..."
              className="flex-1 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-seal/30 bg-paper max-h-28"
              style={{ padding: '9px 14px', borderRadius: '18px', border: `1px solid ${tooLong ? '#B0362A' : '#DAD5C4'}` }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!canSend}
              title={tooLong ? `Over the ${MAX_CHARS}-character limit` : 'Send'}
              aria-label="Send question"
              className="rounded-full bg-seal text-white flex items-center justify-center disabled:opacity-40 hover:bg-seal-dark transition"
              style={{ width: '38px', height: '38px', flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 6 6 6-6 6"/></svg>
            </button>
          </div>

          {/* Only once it matters — a counter on an empty box is noise. */}
          {input.length > MAX_CHARS * 0.8 && (
            <div className="mt-1.5 text-right" style={{ fontSize: '11px', color: tooLong ? '#B0362A' : '#9CA0A8' }}>
              {input.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              {tooLong && ' — too long to send'}
            </div>
          )}
        </div>
      </div>
    </SlidePanel>
  );
}
