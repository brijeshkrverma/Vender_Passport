/**
 * TRANSPORT — every questionnaire HTTP call lives here.
 *
 * Components never call `fetch` directly. That keeps auth headers, error
 * unwrapping and the base path in one place, and it means a page can be tested
 * by swapping this module rather than by stubbing the global fetch.
 */

export const QUESTIONNAIRE_BASE = '/api/questionnaires';

/** Unwrap whatever error shape the API returned into one readable line. */
async function readError(res) {
  const body = await res.json().catch(() => ({}));
  if (Array.isArray(body.errors) && body.errors.length) {
    return body.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join(' · ');
  }
  if (res.status === 403) return body.message || 'Your role is not allowed to do this.';
  if (res.status === 404) return 'Questionnaire API not found on the server.';
  return body.message || body.error || `Request failed (HTTP ${res.status})`;
}

async function request(method, path, { headers = {}, body } = {}) {
  let res;
  try {
    res = await fetch(`${QUESTIONNAIRE_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  if (!res.ok) throw new Error(await readError(res));
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  return json?.data ?? json;
}

export const questionnaireApi = {
  list: (query = {}, opts) => {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request('GET', qs ? `?${qs}` : '', opts);
  },
  getById: (id, opts) => request('GET', `/${id}`, opts),
  create: (payload, opts) => request('POST', '', { ...opts, body: payload }),
  update: (id, payload, opts) => request('PUT', `/${id}`, { ...opts, body: payload }),
  remove: (id, opts) => request('DELETE', `/${id}`, opts),
  /** Dropdown catalogues. Optional — the UI falls back to local config. */
  meta: (opts) => request('GET', '/meta', opts),

  /**
   * Cross-question targets and denominator grids for the formula builder,
   * resolved server-side. Deriving these in the browser meant downloading every
   * question's answer tree to end up with a few KB of labels.
   */
  formulaSources: (query = {}, opts) => {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request('GET', `/formula-sources${qs ? `?${qs}` : ''}`, opts);
  },

  /** Draft -> Published. After this, an edit produces a new version. */
  publish: (id, opts) => request('POST', `/${id}/publish`, opts),
  archive: (id, opts) => request('POST', `/${id}/archive`, opts),

  /** Every version, newest first — how an assessor reads the wording answered. */
  versions: (id, opts) => request('GET', `/${id}/versions`, opts),

  reorder: (fromId, toId, opts) =>
    request('POST', '/reorder', { ...opts, body: { fromId, toId } }),
};
