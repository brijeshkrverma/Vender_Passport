import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Create / update / delete against a REST resource.
 *
 * Every entity page previously rendered a read-only table: the backend exposed
 * full CRUD but the only way to add a finding, a CAPA or a user was Postman.
 * This hook is the shared write path so each page does not re-invent error
 * handling — and so a failure is always surfaced instead of swallowed.
 */
export function useCrud(baseUrl, { onDone } = {}) {
  const { authHeaders } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /** Turn any error shape the API returns into one readable line. */
  const readError = async (res) => {
    const body = await res.json().catch(() => ({}));
    if (Array.isArray(body.errors) && body.errors.length) {
      return body.errors.map((e) => `${e.field}: ${e.message}`).join(' · ');
    }
    if (res.status === 403) return body.message || 'Your role is not allowed to do this.';
    return body.message || body.error || `Request failed (HTTP ${res.status})`;
  };

  const send = useCallback(async (method, path, payload) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}${path || ''}`, {
        method,
        headers: authHeaders,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(await readError(res));
        return { ok: false };
      }
      const body = res.status === 204 ? null : await res.json().catch(() => null);
      if (onDone) await onDone();
      return { ok: true, data: body?.data ?? body };
    } catch (e) {
      setError('Cannot reach the server. Check your connection and try again.');
      return { ok: false };
    } finally {
      setSaving(false);
    }
  }, [baseUrl, authHeaders, onDone]);

  return {
    saving,
    error,
    clearError: () => setError(''),
    create: (payload) => send('POST', '', payload),
    update: (id, payload) => send('PUT', `/${id}`, payload),
    patch: (id, path, payload) => send('PATCH', `/${id}${path}`, payload),
    remove: (id) => send('DELETE', `/${id}`),
  };
}
