import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { MASTERS } from '../config/questionnaireSchema';
import { questionnaireApi } from '../services/questionnaireApi';

/**
 * DROPDOWN CATALOGUES — served by the API when it can, local config otherwise.
 *
 * The Angular screen hardcoded types, categories and order numbers inside the
 * component, so every new category was a code change and a redeploy. Here the
 * page always asks the API first; if the endpoint is missing or fails, it falls
 * back to `MASTERS` and keeps working.
 *
 * That fallback is what lets the admin-managed master screens land later
 * without this page changing at all: build `/api/questionnaires/meta`, and the
 * lists become dynamic on their own.
 */
export function useQuestionnaireMeta() {
  const { authHeaders } = useAuth();
  const [masters, setMasters] = useState(MASTERS);
  const [source, setSource] = useState('local');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await questionnaireApi.meta({ headers: authHeaders });
        if (cancelled || !data) return;
        // Merge, don't replace: a partial response should only override the
        // lists it actually supplies. Keys are taken from the local config so
        // adding a master list needs no change here.
        const next = { ...MASTERS };
        for (const key of Object.keys(MASTERS)) {
          if (data[key]?.length) next[key] = data[key];
        }
        setMasters(next);
        setSource('api');
      } catch {
        if (!cancelled) setSource('local');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authHeaders]);

  /** Options for a field, by its `source` key in the schema. */
  const optionsFor = (key) => masters[key] || [];

  return { masters, optionsFor, source, loading };
}
