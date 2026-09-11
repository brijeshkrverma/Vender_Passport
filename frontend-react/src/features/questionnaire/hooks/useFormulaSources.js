import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { questionnaireApi } from '../services/questionnaireApi';
import { guessYearCols } from '../services/trendRule';

/**
 * What the grid formula builder needs from other questions.
 *
 *   crossTargets — numeric fields a formula's result can be written into
 *   gridSources  — grids a trend rule can divide by (revenue, production)
 *
 * ONE request, resolved on the server.
 *
 * The first version of this was two hooks, each fetching every question and
 * walking the answer trees in the browser. That is the same mistake that made
 * the system this replaces slow: 322 documents and 1.6 MB downloaded on every
 * load of the authoring form, to end up with a few KB of labels. The server
 * does the walk now and returns only the labels.
 *
 * `scanned` is reported separately from `error` because "no grids found" has
 * two different causes — the list never arrived, or it arrived with no grids in
 * it — and the author cannot tell them apart from an empty dropdown. One means
 * refresh the page; the other means go and author a revenue question.
 */
export function useFormulaSources({ enabled = true, excludeId, financialYear } = {}) {
  const { authHeaders } = useAuth();
  const [data, setData] = useState({ crossTargets: [], gridSources: [], scanned: -1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await questionnaireApi.formulaSources(
          { exclude: excludeId, financialYear },
          { headers: authHeaders }
        );
        if (cancelled) return;
        setData({
          crossTargets: res?.crossTargets || [],
          // Which columns look like years is a presentation guess, not a fact
          // about the data, so it stays on the client — the server sends the
          // labels and this reads them.
          gridSources: (res?.gridSources || []).map((g) => ({
            ...g, yearCols: guessYearCols(g.colLabels || []),
          })),
          scanned: res?.scanned ?? 0,
        });
      } catch (e) {
        // A missing source list never blocks authoring — it only removes the
        // cross-question option and the trend tab.
        if (!cancelled) { setError(e.message); setData((d) => ({ ...d, scanned: -1 })); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authHeaders, enabled, excludeId, financialYear]);

  const diagnosis = (() => {
    if (error) {
      return `The question list did not load (${error}). Try refreshing — a denominator `
        + 'cannot be chosen until it arrives.';
    }
    if (data.scanned === -1) return 'The question list has not arrived yet. Reopen this in a moment.';
    if (data.scanned === 0) {
      return 'The server returned 0 questions. Either this database has no other question yet, '
        + 'or the list endpoint is returning nothing.';
    }
    return `${data.scanned} questions were read, but none has a Grid sub-answer. `
      + 'The denominator (revenue / production) must live in some question\'s grid.';
  })();

  return {
    crossTargets: data.crossTargets,
    gridSources: data.gridSources,
    scanned: data.scanned,
    loading,
    error,
    diagnosis,
  };
}
