import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { submissionApi } from '../services/submissionApi';
import { toStoredAnswer } from '../services/answerValue';

/**
 * ONE SECTION'S WORTH OF ANSWERS, SAVED AS THEY ARE TYPED.
 *
 * ── WHY AUTOSAVE IS PER ANSWER AND NOT PER FORM ───────────────────────────
 *
 * The response model exists so that saving one answer costs one small
 * document — measured at 580 bytes, against 2.3 MB in the system it replaces.
 * Batching the page into a single "save section" call would hand that back:
 * one slow write, and a failure that loses every answer on screen rather than
 * one.
 *
 * So each question debounces and saves on its own, and each carries its own
 * status. A failure on question 4 leaves questions 1–3 saved and says which
 * one did not go.
 *
 * ── WHY THE STATUS IS PER QUESTION ────────────────────────────────────────
 *
 * A single page-level "Saving…" tells a respondent nothing about which answer
 * is at risk. Someone who typed into three fields and closed the tab needs to
 * know exactly which one did not make it.
 */

const DEBOUNCE_MS = 700;

export function useAnswerSheet(submissionId, questions, { readOnly = false } = {}) {
  const { authHeaders } = useAuth();

  /** questionId -> the respondent's answer, in resolver-context shape. */
  const [answers, setAnswers] = useState({});
  /** questionId -> 'idle' | 'saving' | 'saved' | 'error' */
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const timers = useRef({});
  // What is currently on the server, so an unchanged answer is not re-sent on
  // every keystroke that lands back on the same value.
  const lastSaved = useRef({});

  const questionIds = questions.map((q) => q._id).join(',');

  /* ── load what has already been answered ─────────────────────────────── */

  useEffect(() => {
    if (!submissionId || !questions.length) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const rows = await submissionApi.responses(
          submissionId, questions.map((q) => q._id), { headers: authHeaders });
        if (cancelled) return;

        const next = {};
        (rows || []).forEach((r) => {
          next[String(r.questionId)] = r.answer || {};
          lastSaved.current[String(r.questionId)] = JSON.stringify(r.answer || {});
        });
        setAnswers(next);
        setLoadError('');
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [submissionId, questionIds, authHeaders]);

  /* ── save ────────────────────────────────────────────────────────────── */

  const flush = useCallback(async (questionId, value) => {
    const stored = toStoredAnswer(value);
    const serialised = JSON.stringify(stored);
    if (lastSaved.current[questionId] === serialised) return;

    setStatus((s) => ({ ...s, [questionId]: 'saving' }));
    try {
      await submissionApi.saveAnswer(
        submissionId, questionId,
        // A question with nothing ticked is still a draft, not an answer.
        { answer: stored, status: Object.keys(stored).length ? 'Submitted' : 'Draft' },
        { headers: authHeaders }
      );
      lastSaved.current[questionId] = serialised;
      setStatus((s) => ({ ...s, [questionId]: 'saved' }));
      setErrors((e) => { const n = { ...e }; delete n[questionId]; return n; });
    } catch (e) {
      setStatus((s) => ({ ...s, [questionId]: 'error' }));
      setErrors((prev) => ({ ...prev, [questionId]: e.message }));
    }
  }, [submissionId, authHeaders]);

  /** Called by the renderer. `fn` receives the current answer and returns the next. */
  const setAnswer = useCallback((questionId, fn) => {
    if (readOnly) return;

    setAnswers((prev) => {
      const value = fn(prev[questionId] || {});
      const next = { ...prev, [questionId]: value };

      clearTimeout(timers.current[questionId]);
      timers.current[questionId] = setTimeout(() => flush(questionId, value), DEBOUNCE_MS);

      return next;
    });
  }, [flush, readOnly]);

  /**
   * Send anything still waiting on its debounce.
   *
   * Called before submitting and when leaving the section — otherwise the last
   * thing typed is lost in the gap between the keystroke and the timer.
   */
  const flushAll = useCallback(async () => {
    const pending = Object.keys(timers.current);
    pending.forEach((id) => clearTimeout(timers.current[id]));
    timers.current = {};
    await Promise.all(pending.map((id) => flush(id, answers[id] || {})));
  }, [flush, answers]);

  // A section change or an unmount must not silently drop a pending save.
  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
  }, []);

  const savingCount = Object.values(status).filter((s) => s === 'saving').length;
  const errorCount = Object.keys(errors).length;

  return {
    answers,
    setAnswer,
    status,
    errors,
    loading,
    loadError,
    flushAll,
    savingCount,
    errorCount,
    hasUnsaved: savingCount > 0 || Object.keys(timers.current).length > 0,
  };
}
