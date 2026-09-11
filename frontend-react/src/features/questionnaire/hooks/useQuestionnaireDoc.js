import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { questionnaireApi } from '../services/questionnaireApi';

/**
 * Load one question for editing.
 *
 * Until this existed the loop was open: a question could be created and then
 * never seen again. That mattered for more than convenience — every stored
 * shape this project added (the coordinate-keyed grid, formula tokens, the
 * trend rule, scoring rules, the stable keys value references depend on) had
 * only ever been round-tripped in tests. Nothing had proved a saved question
 * comes back the way it went in.
 *
 * `?include=answers` is explicit because the list projection drops the answer
 * tree by default — editing is exactly the case that needs it.
 */
export function useQuestionnaireDoc(id) {
  const { authHeaders } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) { setDoc(null); setLoading(false); setError(''); return undefined; }

    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const data = await questionnaireApi.getById(id, { headers: authHeaders });
        if (!cancelled) setDoc(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, authHeaders]);

  return { doc, loading, error };
}

/**
 * Recently authored questions, for the header picker.
 *
 * A stopgap until the list screen exists — but a deliberate one: without any
 * way to reach an existing question, the edit path would only be reachable by
 * typing an id into the address bar, and nobody would ever exercise it.
 */
export function useRecentQuestions({ enabled = true, reloadKey } = {}) {
  const { authHeaders } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const data = await questionnaireApi.list({ limit: 25 }, { headers: authHeaders });
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : (data?.items || []);
        setItems(rows.map((q) => ({
          id: q._id || q.id,
          label: String(q.question || '').replace(/<[^>]*>/g, '').trim().slice(0, 70) || 'Untitled question',
          meta: [q.category, q.section].filter(Boolean).join(' · '),
        })));
      } catch {
        // The picker is a convenience; a failure here must not block authoring.
        if (!cancelled) setItems([]);
      }
    })();

    return () => { cancelled = true; };
  }, [authHeaders, enabled, reloadKey]);

  return items;
}
