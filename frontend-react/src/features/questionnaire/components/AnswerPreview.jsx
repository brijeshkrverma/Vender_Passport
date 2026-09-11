import { useState, useMemo } from 'react';
import QuestionRenderer from './render/QuestionRenderer';
import { toPayload } from '../services/questionnaireSerializer';
import { evaluateFormulas, computedRefKeys } from '../services/gridFormula';
import { evaluateRule } from '../services/markEngines';
import { getAnswerType } from '../config/questionTypes';
import {
  emptyAnswer, isAnswered, selectedOptions, toStoredAnswer, hasAssessorMarking,
} from '../services/answerValue';

/**
 * ANSWER PREVIEW — the author's view of what they are building.
 *
 * ── WHY THE RENDERER'S FIRST CONSUMER IS THIS, NOT THE APPLICANT ──────────
 *
 * Until now an author could specify a question — options, follow-ups, a grid,
 * formulas, a marking scheme — and never see any of it. They were guessing, and
 * the only way to check was to publish and ask someone to fill it in.
 *
 * So the renderer is built here first. The same component will serve the
 * applicant; putting it behind the authoring form means every question gets
 * exercised by the person who wrote it, immediately, and any gap between what
 * they meant and what the stored document says shows up while they still have
 * it open.
 *
 * ── IT RUNS THE REAL PIPELINE ─────────────────────────────────────────────
 *
 *   form  →  toPayload  →  render  →  answer  →  formulas  →  marks
 *
 * Every step is the production one. Nothing here is a mock, so a preview that
 * looks right is evidence the saved question is right — which a hand-drawn
 * approximation could never be.
 */
export default function AnswerPreview({ form, catalog }) {
  const [answer, setAnswer] = useState(emptyAnswer);

  // The stored document, not the editor's state — see the note above.
  const question = useMemo(() => toPayload(form), [form]);

  /**
   * Formulas run on every keystroke, against the live answer.
   *
   * They can only do that because the answer's shape *is* the resolver's
   * context: there is nothing to convert between typing a number and a formula
   * reading it.
   */
  const { computed, warnings } = useMemo(() => {
    const formulas = (question.answers || []).flatMap(
      (a) => (a.subAnswers || []).flatMap((s) => s.gridFormulas || []));

    if (!formulas.length) return { computed: answer, warnings: [] };

    const out = evaluateFormulas({ answers: answer, self: { maxMark: question.maxMark } }, formulas, catalog);
    return { computed: out.ctx.answers, warnings: out.warnings };
  }, [answer, question, catalog]);

  const computedKeys = useMemo(() => {
    const formulas = (question.answers || []).flatMap(
      (a) => (a.subAnswers || []).flatMap((s) => s.gridFormulas || []));
    return new Set(computedRefKeys(formulas));
  }, [question]);

  /** What this answer would score, with the working shown. */
  const score = useMemo(() => {
    const refCtx = { answers: computed, self: { maxMark: question.maxMark }, questions: {} };
    const options = selectedOptions(question, computed);

    const rule = form.scoringRule?.engine
      ? form.scoringRule
      : { engine: 'optionSum', config: {} };

    return evaluateRule(rule, {
      catalog, refCtx, maxMark: question.maxMark, selectedOptions: options,
    });
  }, [computed, question, form.scoringRule, catalog]);

  const type = getAnswerType(question.answerType);
  const answered = isAnswered(computed, { hasOptions: type.hasOptions });

  const hasContent = !!String(question.question || '').replace(/<[^>]*>/g, '').trim();

  if (!hasContent) {
    return (
      <p className="py-6 text-center text-[13px] text-[#9aa0a6]">
        Write the question text and the preview will appear here.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-[#9aa0a6]">
          As the respondent sees it
        </span>
        {Object.keys(answer).length > 0 && (
          <button
            type="button"
            onClick={() => setAnswer(emptyAnswer())}
            className="text-[12px] font-semibold text-[#002850] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="rounded-[10px] border border-[#e0e5ea] bg-white p-5">
        <QuestionRenderer
          question={question}
          answer={computed}
          onChange={(fn) => setAnswer((a) => fn(a))}
          computedKeys={computedKeys}
        />
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 text-[11px] text-[#b4650b]">{warnings.join(' · ')}</div>
      )}

      {/* The score, and how it got there. A number on its own tells an author
          nothing about which rule produced it. */}
      <div className="mt-3 rounded-[8px] border border-[#e6e9ec] bg-[#fafbfc] p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wide text-[#9aa0a6]">Would score</span>
          <span className="text-[15px] font-semibold text-[#002850]">
            {answered ? score?.marks ?? 0 : '—'}
            {question.maxMark > 0 && (
              <span className="text-[12px] font-normal text-[#9aa0a6]"> / {question.maxMark}</span>
            )}
          </span>
        </div>

        {!answered && (
          <p className="mt-1 text-[11px] text-[#9aa0a6]">Answer it above to see the marks.</p>
        )}

        {/* Without this an author who has set up assessor options sees a figure
            that ignores them and reasonably concludes the preview is broken. */}
        {answered && hasAssessorMarking(question) && (
          <p className="mt-2 border-t border-[#eceff1] pt-2 text-[11px] leading-snug text-[#7c7d7e]">
            This is what the answer scores on its own. The assessor&rsquo;s marking options are
            awarded later, once they have reviewed the evidence.
          </p>
        )}

        {answered && score?.trace?.map((t, i) => (
          <div key={i} className="mt-1 text-[11px] text-[#7c7d7e]">• {t.detail} → <b>{t.marks}</b></div>
        ))}

        {answered && score?.warnings?.map((w) => (
          <div key={w} className="mt-1 text-[11px] text-[#b4650b]">⚠ {w}</div>
        ))}
      </div>

      {/* What would be stored. Unselected branches are dropped here, so an
          author can see that a mis-ticked option leaves nothing behind. */}
      {answered && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-[#9aa0a6]">
            What gets saved
          </summary>
          <pre className="mt-1 max-h-[180px] overflow-auto rounded-[6px] border border-[#e6e9ec] bg-white p-3 text-[10px] leading-[1.5] text-[#41474d]">
            {JSON.stringify(toStoredAnswer(computed), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
