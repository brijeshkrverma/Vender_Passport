import { useEffect } from 'react';
import GridInput from './GridInput';
import { getAnswerType } from '../../config/questionTypes';
import {
  isSelected, subValue, subGrid, setSelected, setSubValue, setGridCell, seedGrid,
} from '../../services/answerValue';
import { isVisible } from '../../services/visibility';

/**
 * ONE QUESTION, AS THE RESPONDENT SEES IT.
 *
 * ── IT RENDERS THE STORED SHAPE, NOT THE EDITOR'S ─────────────────────────
 *
 * The input here is the document `toPayload` produces — the same one the
 * applicant screen will fetch from the API. That is what makes the authoring
 * preview worth having: it exercises the serializer and this renderer together,
 * so an author sees what a respondent will actually get rather than a
 * best-effort mock of it. A preview built from the editor's own state could
 * agree with the author and still be wrong about the saved question.
 *
 * ── DRIVEN BY THE TYPE REGISTRY ───────────────────────────────────────────
 *
 * Which controls appear is decided by the answer type's capability flags, not
 * by a switch on its name. Six `if (type === 'Grid')` branches is how the
 * previous system ended up with a `Button` type that could be stored but never
 * rendered.
 */

const inputBase = 'w-full rounded-[6px] border border-[#ced4da] bg-white px-3 py-[8px] '
  + 'text-[14px] outline-none transition-colors focus:border-[#86b7fe] '
  + 'disabled:bg-[#f1f3f5] disabled:text-[#9aa0a6]';

/** One nested follow-up row, whose own type decides its control. */
function SubAnswer({
  sub, index, answerKey, answer, disabled, computedKeys, onChange,
}) {
  const subKey = sub.key;
  const rows = subGrid(answer, answerKey, subKey);
  const storedRows = sub[String(index)];

  // A grid starts from the author's table — headers, row labels and any default
  // values — rather than from nothing.
  useEffect(() => {
    if (sub.subAnswerTypes === 'Grid' && Array.isArray(storedRows) && !rows) {
      onChange((a) => seedGrid(a, answerKey, subKey, storedRows));
    }
  }, [sub.subAnswerTypes, storedRows, rows, answerKey, subKey, onChange]);

  const mode = sub.isTypeNumericText === true ? 'numeric'
    : sub.isUploadText === true ? 'upload'
      : sub.isTypeText === true ? 'text' : '';

  const locked = disabled || sub.isDisabled;
  const value = subValue(answer, answerKey, subKey);
  const set = (v) => onChange((a) => setSubValue(a, answerKey, subKey, v));

  return (
    <div className="mb-3">
      {sub.subAnswerLabel && (
        <label className="mb-[6px] block text-[13px] text-[#41474d]">{sub.subAnswerLabel}</label>
      )}

      {sub.subAnswerTypes === 'Grid' && (
        <GridInput
          rows={rows || storedRows || []}
          answerKey={answerKey}
          subKey={subKey}
          computedKeys={computedKeys}
          disabled={locked}
          onCellChange={(r, c, v) => onChange((a) => setGridCell(a, answerKey, subKey, r, c, v))}
        />
      )}

      {mode === 'numeric' && (
        <input type="number" className={inputBase} disabled={locked}
          value={value} onChange={(e) => set(e.target.value)} placeholder="Enter a number" />
      )}

      {mode === 'text' && (
        <textarea rows={2} className={`${inputBase} resize-y`} disabled={locked}
          value={value} onChange={(e) => set(e.target.value)} placeholder="Enter your answer" />
      )}

      {mode === 'upload' && (
        <div className="flex items-center gap-2">
          <input
            type="file" disabled={locked}
            onChange={(e) => set(e.target.files?.[0]?.name || '')}
            className="text-[13px] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[#002850] file:px-3 file:py-[6px] file:text-[12px] file:font-semibold file:text-white"
          />
          {value && <span className="text-[12px] text-[#1f7a4d]">{value}</span>}
        </div>
      )}

      {sub.subAnswerTypes === 'CheckBox' && (
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#41474d]">
          <input
            type="checkbox" disabled={locked}
            checked={value === 'yes'}
            onChange={(e) => set(e.target.checked ? 'yes' : '')}
            className="h-[15px] w-[15px] accent-[#002850]"
          />
          {sub.subAnswerLabel || 'Yes'}
        </label>
      )}
    </div>
  );
}

export default function QuestionRenderer({
  question,
  answer = {},
  onChange,
  disabled = false,
  computedKeys = new Set(),
  // Only needed to name a condition's target in an error; a renderer without
  // one still evaluates conditions correctly.
  catalog = null,
}) {
  if (!question) return null;

  const type = getAnswerType(question.answerType);
  const options = question.answers || [];

  return (
    <div>
      {/* The author's wording, exactly as stored. */}
      <div
        className="text-[15px] font-medium leading-[1.6] text-[#0f1b2d] [&_p]:m-0"
        dangerouslySetInnerHTML={{ __html: question.question || '' }}
      />

      {question.description && (
        <p className="mt-1 text-[13px] leading-[1.6] text-[#7c7d7e]">{question.description}</p>
      )}

      {question.tooltip && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[12px] font-semibold text-[#002850]">
            Guidance
          </summary>
          <div
            className="mt-1 rounded-[6px] bg-[#f4f8fc] p-3 text-[12px] leading-[1.7] text-[#41474d]"
            dangerouslySetInnerHTML={{ __html: question.tooltip }}
          />
        </details>
      )}

      <div className="mt-4">
        {options.length === 0 && !type.hasOptions && (
          <p className="text-[13px] text-[#9aa0a6]">
            This question has no options — it is answered by its inputs.
          </p>
        )}

        {options.map((option) => {
          const chosen = isSelected(answer, option.key);
          const showSubs = option.subAnswer === 'yes' && (option.subAnswers || []).length > 0;

          return (
            <div key={option.key} className="mb-2">
              {type.hasOptions ? (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-[8px] border p-3 transition-colors ${
                    chosen ? 'border-[#002850] bg-[#f4f8fc]' : 'border-[#e0e5ea] bg-white hover:border-[#c2cdd8]'
                  } ${disabled ? 'cursor-default opacity-70' : ''}`}
                >
                  <input
                    // `captures: 'single'` is the registry's word for a radio —
                    // the renderer never compares the type's name.
                    type={type.captures === 'single' ? 'radio' : 'checkbox'}
                    name={`q-${question._id || 'preview'}`}
                    checked={chosen}
                    disabled={disabled}
                    onChange={(e) => onChange((a) => setSelected(
                      a, option.key, e.target.checked, { single: type.captures === 'single' }))}
                    className="mt-[3px] h-[15px] w-[15px] accent-[#002850]"
                  />
                  <span className="flex-1 text-[14px] text-[#0f1b2d]">
                    {option.displayLabel || option.answerLabel || 'Untitled option'}
                  </span>
                </label>
              ) : (
                option.answerLabel && (
                  <div className="mb-2 text-[13px] font-medium text-[#41474d]">
                    {option.displayLabel || option.answerLabel}
                  </div>
                )
              )}

              {/* Follow-ups appear only once their option is chosen — showing
                  them upfront asks for work that may not apply. */}
              {showSubs && (!type.hasOptions || chosen) && (
                <div className="mt-2 rounded-[8px] border-l-[3px] border-[#c9d6e2] bg-[#fafbfc] p-3 pl-4">
                  {option.subAnswers.map((sub, index) => {
                    /*
                     * A follow-up whose condition is not met is not rendered.
                     *
                     * It is also not counted:  and the completeness
                     * check use the same , because a hidden question
                     * counted as unanswered would tell a respondent they had
                     * missed something they were never shown.
                     */
                    if (!isVisible(sub.dependsOn, { answers: answer }, catalog)) return null;
                    return (
                    <SubAnswer
                      key={sub.key || index}
                      sub={sub}
                      index={index}
                      answerKey={option.key}
                      answer={answer}
                      disabled={disabled}
                      computedKeys={computedKeys}
                      onChange={onChange}
                    />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
