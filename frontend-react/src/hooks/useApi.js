import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useApi(url, options = {}) {
  const { authHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const fetchData = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const currentOptions = optionsRef.current || {};
      const mergedHeaders = { ...authHeaders, ...(currentOptions.headers || {}) };
      const finalOptions = { ...currentOptions, headers: mergedHeaders };
      const res = await fetch(url, finalOptions);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data || json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export const statusColor = (s) => {
  const map = {
    'Active': 'badge-success', 'In Progress': 'badge-info', 'Planning': 'badge-info',
    'Closed': 'badge-neutral', 'Resolved': 'badge-success', 'Approved': 'badge-success',
    'Expired': 'badge-danger', 'Expiring Soon': 'badge-warning', 'Overdue': 'badge-danger',
    'Open': 'badge-neutral', 'Critical': 'badge-danger', 'High': 'badge-warning',
    'Medium': 'badge-info', 'Low': 'badge-success', 'Reopened': 'badge-warning',
  };
  return map[s] || 'badge-neutral';
};

export const sevColor = (sev) => {
  const map = { 'Critical': 'badge-danger', 'High': 'badge-warning', 'Medium': 'badge-info', 'Low': 'badge-success' };
  return map[sev] || 'badge-neutral';
};

export const partyColor = (p) => {
  const map = { 'first-party': 'badge-info', 'second-party': 'badge-violet', 'third-party': 'bg-seal-bg text-seal-dark border border-seal/30 rounded-full px-2 py-0.5 text-[10px] font-semibold' };
  return map[p] || 'badge-neutral';
};

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const daysLeft = (date) => Math.round((new Date(date) - new Date()) / 86400000);
