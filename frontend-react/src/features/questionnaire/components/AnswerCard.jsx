import Field, { inputClass, labelClass } from './Field';
import MultiSelect from './MultiSelect';
import CollapsibleSection from './CollapsibleSection';
import AssessorOptionEditor from './AssessorOptionEditor';
import SubAnswerCard from './SubAnswerCard';
import { SUB_ANSWER_TYPES } from '../config/questionTypes';

/** Two equal-width bordered radio boxes, matching the original Yes/No control. */
function YesNoRadio({ name, value, onChange }) {
  const option = (label, on, checked) => (
    <label
      key={label}
      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-[6px] border bg-white px-3 py-[6px] text-[14px] transition-colors ${
        checked ? 'border-[#002850] text-[#002850]' : 'border-[#ced4da] text-[#6e6e6e]'
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={() => onChange(on)}
        className="h-[15px] w-[15px] accent-[#002850]"
      />
      {label}
    </label>
  );

  return (
    <div className="flex items-center gap-[18px]">
      {option('Yes', true, value === true)}
      {option('No', false, value === false)}
    </div>
  );
}

/**
 * Sibling sub-answers a grid formula may read as `S0`, `S1`…
 *
 * Several questions pair a grid with checkboxes that reveal a number input, and
 * the grid's calculation needs that number — water-utilisation % divides a grid
 * row by "Consent to operate (KL)", which is a sibling input, not a cell. The
 * grid itself is excluded: it is the thing being calculated, not an input to it.
 */
function siblingInputs(subAnswers, exceptIndex) {
  return (subAnswers || [])
    .map((s, index) => ({ index, sub: s }))
    .filter(({ index, sub }) => index !== exceptIndex && sub.subAnswerType !== 'Grid')
    .map(({ index, sub }) => ({
      index,
      label: sub.subAnswerLabel || `Sub-answer ${index + 1}`,
      type: sub.inputMode || sub.subAnswerType || '',
    }));
}

/**
 * One answer option, its marking scheme, and its nested sub-answer block.
 *
 * Every edit is reported as a full path, so the parent never has to know which
 * card fired — it just forwards the path to the reducer.
 */
export default function AnswerCard({
  value, index, total, path, errorFor, onChange, onTouch,
  onRemove, onToggleSubAnswers, onAddSubAnswer, onRemoveSubAnswer,
  onSetSubAnswerType, onUpdateGrid, onSetFormulas, onMove,
  onAddOption, onRemoveOption, onAddSubOption, onRemoveSubOption,
  allowsSubAnswers, catalog,
  collapsed, onToggleCollapse,
}) {
  const dotted = path.join('.');
  const err = (name) => errorFor(`${dotted}.${name}`);

  /**
   * Does anything inside this card need attention?
   *
   * A collapsed card must never hide a problem, so the header carries the state
   * of everything beneath it.
   */
  const hasError = !!(err('answerLabel') || err('score') || err('sortOrder')
    || err('subAnswerType') || err('subAnswers') || err('assessorOptionType')
    || (value.subAnswers || []).some((_, j) =>
      errorFor(`${dotted}.subAnswers.${j}.subAnswerType`)
      || errorFor(`${dotted}.subAnswers.${j}.subAnswerLabel`)
      || errorFor(`${dotted}.subAnswers.${j}.config`)
      ));

  /** One line describing the card, so a collapsed one still says what it is. */
  const summary = [
    value.score !== '' && value.score != null ? `${value.score} marks` : null,
    (value.assessorOptions || []).length ? `${value.assessorOptions.length} assessor options` : null,
    value.hasSubAnswers ? `${(value.subAnswers || []).length} sub-answers` : null,
  ].filter(Boolean).join(' · ');

  const field = (name) => ({
    value: value[name] ?? '',
    onChange: (e) => onChange([...path, name], e.target.value),
    onBlur: () => onTouch(`${dotted}.${name}`),
  });

  const iconBtn = 'flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-[13px] '
    + 'text-[#6b7684] transition-colors hover:bg-[#e6ebf0] hover:text-[#002850] disabled:opacity-25 '
    + 'disabled:hover:bg-transparent';

  return (
    <div className={`my-3 overflow-hidden rounded-[8px] border-l-[3px] bg-white ring-1 ${
      hasError ? 'border-l-[#b0362a] ring-[#f0d7d3]' : 'border-l-[#002850] ring-[#e6e9ec]'
    }`}>
      {/* ── Card header ────────────────────────────────────────────────
          Identity, live summary, reorder and collapse. Without it a
          questionnaire with six options was six identical boxes. */}
      <div className={`flex items-center gap-2 px-3 py-[9px] ${hasError ? 'bg-[#fdf6f5]' : 'bg-[#f4f7fa]'}`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className={`text-[10px] leading-none text-[#6b7684] transition-transform ${collapsed ? '' : 'rotate-90'}`}>
            &#9654;
          </span>
          <span className="flex h-[20px] min-w-[20px] items-center justify-center rounded-[5px] bg-[#002850] px-[6px] text-[11px] font-semibold text-white">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#002850]">
              {value.answerLabel || <span className="font-normal italic text-[#9aa0a6]">Untitled answer</span>}
            </span>
            {summary && <span className="block truncate text-[11px] text-[#9aa0a6]">{summary}</span>}
          </span>
          {hasError && (
            <span className="rounded-[10px] bg-[#fbeae7] px-[7px] py-[1px] text-[10px] font-semibold text-[#b0362a]">
              needs attention
            </span>
          )}
        </button>

        <div className="flex flex-shrink-0 items-center gap-[2px]">
          <button type="button" className={iconBtn} title="Move up"
            disabled={index === 0} onClick={() => onMove(index, index - 1)}>&#9650;</button>
          <button type="button" className={iconBtn} title="Move down"
            disabled={index === total - 1} onClick={() => onMove(index, index + 1)}>&#9660;</button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove this answer"
            aria-label={`Remove answer ${index + 1}`}
            className="ml-1 flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-[16px] leading-none text-[#b0362a] transition-colors hover:bg-[#fbeae7]"
          >
            &times;
          </button>
        </div>
      </div>

      {collapsed ? null : (
      <div className="p-4">
      <div className="grid grid-cols-12 gap-x-4">
        <div className="col-span-12">
          <Field label="Answer Label" error={err('answerLabel')} anchor={`${dotted}.answerLabel`}>
            <input type="text" placeholder="Enter label" className={inputClass} {...field('answerLabel')} />
          </Field>
        </div>

        <div className="col-span-12">
          {/* Stored on every answer but never authorable before: lets the
              respondent see friendlier wording than the internal label the
              scoring rules match on. */}
          <Field label="Display Label" hint="Optional — shown to the respondent instead of Answer Label">
            <input type="text" placeholder="Leave blank to use Answer Label" className={inputClass} {...field('displayLabel')} />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-6">
          <Field label="Sort Order" error={err('sortOrder')} anchor={`${dotted}.sortOrder`}>
            <input type="text" inputMode="numeric" placeholder="Enter order" className={inputClass} {...field('sortOrder')} />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-6">
          <Field label="Score" error={err('score')} anchor={`${dotted}.score`}>
            <input type="text" inputMode="numeric" placeholder="Enter score" className={inputClass} {...field('score')} />
          </Field>
        </div>

        {allowsSubAnswers && (
          <div className="col-span-12 md:col-span-6">
            <Field label="Sub Answer">
              <YesNoRadio
                name={`sub-answer-${value.key}`}
                value={!!value.hasSubAnswers}
                onChange={(on) => onToggleSubAnswers(index, on)}
              />
            </Field>
          </div>
        )}
      </div>

      <CollapsibleSection
        title="Assessor marking"
        subtitle="Marks the assessor awards for this option"
        count={(value.assessorOptions || []).length}
        hasError={!!err('assessorOptionType')}
      >
        <AssessorOptionEditor
          options={value.assessorOptions || []}
          optionType={value.assessorOptionType}
          guidance={value.assessorGuidance}
          path={[...path, 'assessorOptions']}
          typePath={[...path, 'assessorOptionType']}
          guidancePath={[...path, 'assessorGuidance']}
          errorFor={errorFor}
          onChange={onChange}
          onTouch={onTouch}
          onAddOption={onAddOption}
          onRemoveOption={onRemoveOption}
          onAddSubOption={onAddSubOption}
          onRemoveSubOption={onRemoveSubOption}
        />
      </CollapsibleSection>

      {allowsSubAnswers && value.hasSubAnswers && (
        <div className="my-4 rounded-[8px] bg-[#0000ff08] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <Field
                label="Sub Answer Type"
                error={err('subAnswerType')}
                anchor={`${dotted}.subAnswerType`}
                hint="Default for new rows — each row can override it"
              >
                <MultiSelect
                  options={SUB_ANSWER_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                  value={value.subAnswerType}
                  onChange={(v) => onChange([...path, 'subAnswerType'], v)}
                  onBlur={() => onTouch(`${dotted}.subAnswerType`)}
                  placeholder="Select type"
                  invalid={!!err('subAnswerType')}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => onAddSubAnswer(index, value.subAnswerType)}
              className="mt-1 rounded-[6px] bg-[#002850] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#013a6f]"
            >
              + Add Answer
            </button>
          </div>

          {errorFor(`${dotted}.subAnswers`) && (
            <div className="mb-3 text-[12px] text-[#ff0000]">{errorFor(`${dotted}.subAnswers`)}</div>
          )}

          {(value.subAnswers || []).map((sub, subIndex) => (
            <SubAnswerCard
              key={sub.key}
              value={sub}
              path={[...path, 'subAnswers', subIndex]}
              errorFor={errorFor}
              onChange={onChange}
              onTouch={onTouch}
              onRemove={() => onRemoveSubAnswer(index, subIndex)}
              onSetSubAnswerType={onSetSubAnswerType}
              onUpdateGrid={onUpdateGrid}
              onSetFormulas={onSetFormulas}
              onAddOption={onAddOption}
              onRemoveOption={onRemoveOption}
              onAddSubOption={onAddSubOption}
              onRemoveSubOption={onRemoveSubOption}
              catalog={catalog}
              answerKey={value.key}
            />
          ))}
        </div>
      )}

      </div>
      )}
    </div>
  );
}

export { labelClass };
