/**
 * Answering, and reviewing what was answered.
 *
 * Every call is scoped by submission, because a response only means anything
 * inside one: this applicant's answer to this question, in this year.
 */

export const SUBMISSION_BASE = '/api/questionnaire-submissions';

async function readError(res) {
  const body = await res.json().catch(() => ({}));
  if (Array.isArray(body.errors) && body.errors.length) {
    return body.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join(' · ');
  }
  if (res.status === 403) return body.message || 'You are not allowed to do this.';
  return body.message || body.error || `Request failed (HTTP ${res.status})`;
}

async function request(method, path, { headers = {}, body } = {}) {
  let res;
  try {
    res = await fetch(`${SUBMISSION_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Your answers are not saved.');
  }
  if (!res.ok) throw new Error(await readError(res));
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  return json?.data ?? json;
}

export const submissionApi = {
  /**
   * Idempotent — the answering screen calls this on every load.
   *
   * `auditId` separates a questionnaire raised inside an audit from the
   * applicant's own yearly one; without it the two would collide on the unique
   * key and the second would fail to start. `applicantId` is only accepted from
   * a reviewer opening someone else's — the server enforces that.
   */
  start: (financialYear, { auditId, applicantId, ...opts } = {}) =>
    request('POST', '', {
      ...opts,
      body: {
        financialYear,
        ...(auditId ? { auditId } : {}),
        ...(applicantId ? { applicantId } : {}),
      },
    }),

  list: (query = {}, opts) => {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request('GET', qs ? `?${qs}` : '', opts);
  },

  getById: (id, opts) => request('GET', `/${id}`, opts),

  /** Only the answers for the questions on screen — see `questionIds`. */
  responses: (id, questionIds, opts) => {
    const qs = questionIds?.length ? `?questionIds=${questionIds.join(',')}` : '';
    return request('GET', `/${id}/responses${qs}`, opts);
  },

  /** The hot path. One small document per call. */
  saveAnswer: (id, questionId, payload, opts) =>
    request('PUT', `/${id}/responses/${questionId}`, { ...opts, body: payload }),

  review: (id, questionId, payload, opts) =>
    request('POST', `/${id}/responses/${questionId}/review`, { ...opts, body: payload }),

  /**
   * Question + answer + score together — one read per section.
   *
   * A review needs all three side by side; fetching them separately would be
   * three round trips per section, arriving out of order.
   */
  forReview: (id, section, opts) => request(
    'GET', `/${id}/review${section ? `?section=${encodeURIComponent(section)}` : ''}`, opts),

  /** Re-run the rules. `dryRun` computes without writing. */
  score: (id, { dryRun } = {}, opts) => request(
    'POST', `/${id}/score${dryRun ? '?dryRun=1' : ''}`, opts),

  /**
   * The questions, as the respondent may see them — no marks, no scoring rules.
   *
   * Not `questionnaireApi.list`: that router serves the authoring document and
   * is closed to applicants for exactly that reason.
   */
  questions: (id, section, opts) => request(
    'GET', `/${id}/questions${section ? `?section=${encodeURIComponent(section)}` : ''}`, opts),

  sections: (id, opts) => request('GET', `/${id}/sections`, opts),

  submit: (id, opts) => request('POST', `/${id}/submit`, opts),
  assess: (id, opts) => request('POST', `/${id}/assess`, opts),
  /** Final sign-off — admin roles only, and never the assessor themselves. */
  approve: (id, opts) => request('POST', `/${id}/approve`, opts),
  returnToApplicant: (id, opts) => request('POST', `/${id}/return`, opts),
};
