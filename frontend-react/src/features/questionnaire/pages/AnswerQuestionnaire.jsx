import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/ConfirmDialog';

import { questionnaireApi } from '../services/questionnaireApi';
import { submissionApi } from '../services/submissionApi';
import { useAnswerSheet } from '../hooks/useAnswerSheet';
import { useQuestionnaireMeta } from '../hooks/useQuestionnaireMeta';
import QuestionRenderer from '../components/render/QuestionRenderer';
import MultiSelect from '../components/MultiSelect';
import { computedRefKeys } from '../services/gridFormula';
import { isAnswered } from '../services/answerValue';
import { getAnswerType } from '../config/questionTypes';

/**
 * THE RESPONDENT'S SCREEN.
 *
 * ── ONE SECTION AT A TIME ─────────────────────────────────────────────────
 *
 * Questions are fetched per section, and only that section's answers are
 * loaded with them. A questionnaire runs to 322 questions; asking for all of
 * them and all of their answers is the shape that made the old system slow, and
 * it would undo the response model on the read side just as batching the saves
 * would undo it on the write side.
 *
 * Note the `include=answers` on the fetch: the list projection drops the answer
 * tree because a list never shows it, but this screen cannot render a question
 * without it. Those are genuinely different reads, which is why the projection
 * is opt-out rather than removed.
 *
 * ── SAVED AS THEY TYPE ────────────────────────────────────────────────────
 *
 * There is no page-level Save. Each answer debounces and writes its own small
 * document, and carries its own status — see `useAnswerSheet`.
 */

const SAVE_LABEL = {
  saving: { text: 'Saving…', className: 'text-[#9aa0a6]' },
  saved: { text: 'Saved', className: 'text-[#1f7a4d]' },
  error: { text: 'Not saved', className: 'text-[#b0362a]' },
};

export default function AnswerQuestionnaire() {
  const { authHeaders, user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { optionsFor } = useQuestionnaireMeta();

  const [financialYear, setFinancialYear] = useState('');
  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const years = optionsFor('financialYear');
  const readOnly = !!submission?.applicantSubmittedAt;

  /**
   * Default to the year we are actually in.
   *
   * Not the last option in the list: the year window runs from two years back
   * to two years ahead, so the last entry is a future year nobody has authored
   * questions for — which lands the respondent on an empty questionnaire and
   * tells them nothing about why.
   */
  useEffect(() => {
    if (financialYear || !years.length) return;
    const thisYear = String(new Date().getFullYear());
    const match = years.find((y) => y.value === thisYear);
    setFinancialYear((match || years[years.length - 1]).value);
  }, [years, financialYear]);

  /* ── start or resume ─────────────────────────────────────────────────── */

  useEffect(() => {
    if (!financialYear) return undefined;
    let cancelled = false;

    (async () => {
      setError('');
      try {
        const s = await submissionApi.start(financialYear, { headers: authHeaders });
        if (!cancelled) setSubmission(s);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();

    return () => { cancelled = true; };
  }, [financialYear, authHeaders]);

  /* ── which sections exist this year ──────────────────────────────────── */

  useEffect(() => {
    if (!financialYear) return undefined;
    let cancelled = false;

    (async () => {
      try {
        // A light read: metadata only, no answer trees.
        const rows = await questionnaireApi.list(
          { financialYear, limit: 200 }, { headers: authHeaders });
        if (cancelled) return;

        const found = [...new Set((rows || []).map((r) => r.section).filter(Boolean))].sort();
        const list = found.length ? found : ['All questions'];
        setSections(list);
        setActiveSection((cur) => (list.includes(cur) ? cur : list[0]));
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();

    return () => { cancelled = true; };
  }, [financialYear, authHeaders]);

  /* ── this section's questions ────────────────────────────────────────── */

  useEffect(() => {
    if (!financialYear || !activeSection) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const rows = await questionnaireApi.list({
          financialYear,
          section: activeSection === 'All questions' ? '' : activeSection,
          // The renderer needs the option tree; the list screen does not.
          include: 'answers',
          limit: 100,
        }, { headers: authHeaders });
        if (!cancelled) setQuestions(rows || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();

    return () => { cancelled = true; };
  }, [financialYear, activeSection, authHeaders]);

  const sheet = useAnswerSheet(submission?._id, questions, { readOnly });

  /** Cells a formula fills, so the renderer can lock them. */
  const computedKeys = useMemo(() => {
    const formulas = questions.flatMap((q) => (q.answers || []).flatMap(
      (a) => (a.subAnswers || []).flatMap((s) => s.gridFormulas || [])));
    return new Set(computedRefKeys(formulas));
  }, [questions]);

  const answeredHere = questions.filter((q) => isAnswered(
    sheet.answers[q._id] || {},
    { hasOptions: getAnswerType(q.answerType).hasOptions }
  )).length;

  async function goToSection(name) {
    // Send anything still on its debounce before the questions change under it.
    await sheet.flushAll();
    setActiveSection(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    await sheet.flushAll();

    if (sheet.errorCount > 0) {
      toast('Some answers did not save', 'Fix those before submitting.', 'error');
      return;
    }

    const ok = await confirm({
      title: 'Submit this questionnaire?',
      message: 'You will not be able to change your answers afterwards unless an assessor returns it to you.',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const updated = await submissionApi.submit(submission._id, { headers: authHeaders });
      setSubmission(updated);
      toast('Questionnaire submitted', 'It is now with the assessor.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast('Could not submit', e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const progress = submission?.totals?.questions
    ? Math.round((submission.totals.answered / submission.totals.questions) * 100)
    : 0;

  return (
    <div className="pb-24">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-semibold leading-tight text-[#002850]">
            Assessment Questionnaire
          </h1>
          <p className="mt-1 text-[13px] text-[#7c7d7e]">
            {user?.orgName ? `${user.orgName} · ` : ''}
            {readOnly ? 'Submitted — read only' : 'Your answers are saved as you type'}
          </p>
        </div>

        <div className="w-[200px]">
          <label className="mb-[6px] block text-[12px] text-[#7c7d7e]">Financial Year</label>
          <MultiSelect
            options={years}
            value={financialYear}
            onChange={setFinancialYear}
            placeholder="Select year"
            searchable={false}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-[13px] text-[#842029]">
          {error}
        </div>
      )}

      {readOnly && (
        <div className="mb-4 rounded-[8px] border border-[#cfe3d6] bg-[#f2faf5] px-4 py-3 text-[13px] text-[#1f7a4d]">
          <b>Submitted.</b> An assessor is reviewing your answers. If something needs changing,
          they can return the questionnaire to you.
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* ── Sections ──────────────────────────────────────────────── */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="lg:sticky lg:top-4">
            <div className="rounded-[10px] border border-[#e6e9ec] bg-white p-3">
              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9aa0a6]">
                Sections
              </div>
              {sections.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => goToSection(name)}
                  className={`mb-[2px] block w-full rounded-[6px] px-3 py-[8px] text-left text-[13px] transition-colors ${
                    name === activeSection
                      ? 'bg-[#f0f4f8] font-semibold text-[#002850]'
                      : 'text-[#41474d] hover:bg-[#f7f9fb]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {submission?.totals?.questions > 0 && (
              <div className="mt-3 rounded-[10px] border border-[#e6e9ec] bg-white p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9aa0a6]">
                  Progress
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-[26px] font-semibold leading-none text-[#002850]">
                    {submission.totals.answered}
                  </span>
                  <span className="text-[13px] text-[#9aa0a6]">/ {submission.totals.questions}</span>
                </div>
                <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[#eef1f4]">
                  <div className="h-full rounded-full bg-[#1f7a4d]" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Questions ─────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-9">
          {sheet.loadError && (
            <div className="mb-4 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-[13px] text-[#842029]">
              Could not load your saved answers: {sheet.loadError}
            </div>
          )}

          {sheet.loading && (
            <p className="py-10 text-center text-[13px] text-[#9aa0a6]">Loading…</p>
          )}

          {!sheet.loading && questions.length === 0 && (
            <p className="rounded-[10px] border border-[#e6e9ec] bg-white py-12 text-center text-[13px] text-[#7c7d7e]">
              No questions in this section.
            </p>
          )}

          {!sheet.loading && questions.map((question, i) => {
            const state = sheet.status[question._id];
            const label = SAVE_LABEL[state];

            return (
              <div key={question._id} className="mb-4 rounded-[10px] border border-[#e6e9ec] bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa0a6]">
                    Question {i + 1} of {questions.length}
                    {question.maxMark > 0 && ` · ${question.maxMark} marks`}
                  </span>
                  {label && (
                    <span className={`text-[11px] ${label.className}`}>{label.text}</span>
                  )}
                </div>

                <QuestionRenderer
                  question={question}
                  answer={sheet.answers[question._id] || {}}
                  onChange={(fn) => sheet.setAnswer(question._id, fn)}
                  disabled={readOnly}
                  computedKeys={computedKeys}
                />

                {sheet.errors[question._id] && (
                  <div className="mt-3 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-[12px] text-[#842029]">
                    {sheet.errors[question._id]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────────────── */}
      {!readOnly && questions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#e0e5ea] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
            <span className="text-[12px] text-[#7c7d7e]">
              {sheet.errorCount > 0 ? (
                <b className="text-[#b0362a]">
                  {sheet.errorCount} answer{sheet.errorCount > 1 ? 's' : ''} did not save
                </b>
              ) : sheet.savingCount > 0 ? 'Saving…'
                : `${answeredHere} of ${questions.length} answered in this section`}
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="rounded-[6px] bg-[#002850] px-7 py-[9px] text-[13px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#013a6f] disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Submit questionnaire'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
