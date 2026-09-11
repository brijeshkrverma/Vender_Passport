import { useState, useEffect } from 'react';
import QuestionRenderer from './QuestionRenderer';
import { inputClass } from '../Field';

/**
 * ONE ANSWER, AS THE ASSESSOR SEES IT.
 *
 * Three things side by side, in the order an assessor actually reads them:
 *
 *   1. what the respondent answered
 *   2. what the rules made of it, and why
 *   3. the assessor's own decision
 *
 * ── THE WORKING IS SHOWN, NOT JUST THE NUMBER ─────────────────────────────
 *
 * The system this replaces gave the assessor a mark and nothing else, so the
 * only way to check it was to redo the arithmetic by hand — which is exactly
 * the work the rules were supposed to remove. A number nobody can check is a
 * number nobody can defend when a vendor disputes it.
 *
 * ── A PROPOSAL IS NOT A DECISION ──────────────────────────────────────────
 *
 * A trend rule's choice is shown as something to confirm, styled and worded as
 * a suggestion. Presenting it as already decided would make the assessor's
 * agreement invisible — and their agreement is the thing that makes the score
 * defensible.
 */
export default function ReviewCard({
  entry, index, total, readOnly, onSave, saving,
}) {
  const { question, response } = entry;

  const [mark, setMark] = useState('');
  const [comment, setComment] = useState('');
  const [dirty, setDirty] = useState(false);

  // Re-seed when the row changes, or when a re-score writes a new mark.
  useEffect(() => {
    setMark(response?.obtainedMark != null ? String(response.obtainedMark) : '');
    setComment(response?.assessorComment || response?.adminComment || '');
    setDirty(false);
  }, [response?._id, response?.obtainedMark, response?.assessorComment, response?.adminComment]);

  if (!response) {
    return (
      <div className="mb-4 rounded-[10px] border border-[#e6e9ec] bg-white p-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa0a6]">
          Question {index + 1} of {total}
        </div>
        <div
          className="text-[15px] text-[#0f1b2d] [&_p]:m-0"
          dangerouslySetInnerHTML={{ __html: question.question || '' }}
        />
        <p className="mt-3 text-[13px] text-[#b4650b]">Not answered.</p>
      </div>
    );
  }

  const auto = response.autoSelections || [];
  const trace = response.scoreTrace || [];
  const ruleMark = response.obtainedMark ?? 0;

  const save = (extra = {}) => onSave(question._id, {
    obtainedMark: mark === '' ? 0 : Number(mark),
    comment,
    // Any hand-set mark is an override: the scoring pass leaves those alone, so
    // a re-run cannot silently undo the assessor's decision.
    overridden: true,
    status: 'Reviewed',
    ...extra,
  });

  return (
    <div className="mb-4 overflow-hidden rounded-[10px] border border-[#e6e9ec] bg-white">
      <div className="flex items-center justify-between border-b border-[#f1f3f5] px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa0a6]">
          Question {index + 1} of {total}
          {question.maxMark > 0 && ` · out of ${question.maxMark}`}
        </span>
        <div className="flex items-center gap-2">
          {response.marksNotApplicable && (
            <span className="rounded-[10px] bg-[#eef1f4] px-[8px] py-[2px] text-[11px] text-[#41474d]">
              Not applicable
            </span>
          )}
          {response.overridden && (
            <span className="rounded-[10px] bg-[#fbf3e4] px-[8px] py-[2px] text-[11px] font-semibold text-[#8c6526]">
              Assessor set
            </span>
          )}
          <span className="font-display text-[20px] font-semibold leading-none text-[#002850]">
            {ruleMark}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12">
        {/* ── the answer ─────────────────────────────────────────────── */}
        <div className="col-span-12 border-b border-[#f1f3f5] p-5 lg:col-span-7 lg:border-b-0 lg:border-r">
          <QuestionRenderer question={question} answer={response.answer || {}} onChange={() => {}} disabled />
        </div>

        {/* ── the working, then the decision ─────────────────────────── */}
        <div className="col-span-12 bg-[#fafbfc] p-5 lg:col-span-5">
          <div className="mb-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9aa0a6]">
              How this was scored
            </div>
            {trace.length === 0 && (
              <p className="text-[12px] text-[#9aa0a6]">
                No rule ran — this is the sum of the selected options.
              </p>
            )}
            {trace.map((t, i) => (
              <div key={i} className="text-[12px] leading-[1.6] text-[#41474d]">
                • {t.detail} → <b>{t.marks}</b>
              </div>
            ))}
            {(response.scoreWarnings || []).map((w) => (
              <div key={w} className="mt-1 text-[11px] text-[#b4650b]">⚠ {w}</div>
            ))}
          </div>

          {auto.map((a, i) => (
            <div key={i} className="mb-3 rounded-[8px] border border-[#cfe3d6] bg-[#f2faf5] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#1f7a4d]">
                The figures suggest
              </div>
              <div className="mt-1 text-[13px] font-semibold text-[#002850]">
                {a.option} <span className="font-normal text-[#7c7d7e]">· {a.marks} marks</span>
              </div>
              <div className="mt-1 text-[11px] text-[#41474d]">
                change {a.pctChange}% —{' '}
                {(a.intensities || []).map((x, j) => (
                  <span key={j} className="mr-2 font-mono">
                    {x.numerator}/{x.denominator}={(x.value ?? 0).toFixed(3)}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-[#7c7d7e]">
                {a.allowOverride
                  ? 'A suggestion — set a different mark below if the evidence says otherwise.'
                  : 'This rule does not allow an override.'}
              </p>
            </div>
          ))}

          {!readOnly && (
            <>
              <label className="mb-[6px] block text-[12px] text-[#41474d]">Marks</label>
              <input
                type="number"
                className={`${inputClass} mb-3`}
                value={mark}
                onChange={(e) => { setMark(e.target.value); setDirty(true); }}
                max={question.maxMark || undefined}
                min={0}
              />

              <label className="mb-[6px] block text-[12px] text-[#41474d]">Comment</label>
              <textarea
                rows={2}
                className={`${inputClass} mb-3 resize-y`}
                placeholder="Why this mark"
                value={comment}
                onChange={(e) => { setComment(e.target.value); setDirty(true); }}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={() => save()}
                  className="rounded-[6px] bg-[#002850] px-4 py-[7px] text-[12px] font-semibold text-white transition-colors hover:bg-[#013a6f] disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSave(question._id, { status: 'Accepted', comment })}
                  className="rounded-[6px] border border-[#1f7a4d] px-4 py-[7px] text-[12px] font-semibold text-[#1f7a4d] transition-colors hover:bg-[#1f7a4d] hover:text-white"
                >
                  Accept as scored
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSave(question._id, { status: 'Flagged', comment })}
                  className="rounded-[6px] border border-[#b4650b] px-4 py-[7px] text-[12px] font-semibold text-[#b4650b] transition-colors hover:bg-[#b4650b] hover:text-white"
                >
                  Flag
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSave(question._id, {
                    // Not the same as scoring zero — it takes the question out
                    // of the denominator so the vendor is not penalised.
                    marksNotApplicable: !response.marksNotApplicable,
                    obtainedMark: 0,
                    overridden: true,
                    comment,
                  })}
                  className="rounded-[6px] border border-[#ced4da] px-4 py-[7px] text-[12px] font-semibold text-[#41474d] transition-colors hover:bg-[#f3f5f7]"
                >
                  {response.marksNotApplicable ? 'Mark applicable' : 'Not applicable'}
                </button>
              </div>
            </>
          )}

          {readOnly && comment && (
            <div className="rounded-[6px] border border-[#e6e9ec] bg-white p-3 text-[12px] text-[#41474d]">
              {comment}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
