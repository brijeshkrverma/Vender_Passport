import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/** 10 rows a page by default — the same number every list screen uses. */
export function usePaginatedApi(baseUrl, params = {}, limit = 10) {
  const { authHeaders } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paramKey = JSON.stringify(params);

  useEffect(() => {
    setPage(1);
  }, [paramKey, limit]);

  const fetchData = useCallback(async () => {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('limit', String(limit));
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
    });
    const url = `${baseUrl}?${query.toString()}`;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data || []);
      setPagination(json.pagination || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, page, limit, paramKey, authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, pagination, loading, error, page, setPage, limit, refetch: fetchData };
}
