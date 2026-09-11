import Field, { inputClass, labelClass } from './Field';
import MultiSelect from './MultiSelect';
import CollapsibleSection from './CollapsibleSection';
import AssessorOptionEditor from './AssessorOptionEditor';
import ConditionEditor from './ConditionEditor';
import { describeCondition } from '../services/visibility';
import { getType, typeOptions, INPUT_MODES } from '../types';
import { getTypeEditor } from '../types/ui';

/**
 * One nested sub-answer.
 *
 * Reads only `path` and `value`, so it has no idea how deep it sits. That is
 * what makes a third level of nesting a routing change rather than a new
 * component.
 *
 * Note that the type lives *here*, not on the parent answer. The stored data
 * has both — `subAnswerType` on the answer and `subAnswerTypes` on each row —
 * and they disagree in practice: rows carry Grid, Text and CheckBox under a
 * single parent marked "CheckBox". The row-level value is the one the renderer
 * and the scoring pass actually read, so it is the one the author edits; the
 * parent's value is written from the first row for backwards compatibility.
 */
export default function SubAnswerCard({
  value, path, errorFor, onChange, onTouch, onRemove,
  onSetSubAnswerType, onUpdateGrid, onSetFormulas,
  onAddOption, onRemoveOption, onAddSubOption, onRemoveSubOption,
  catalog, answerKey,
}) {
  const dotted = path.join('.');
  const err = (name) => errorFor(`${dotted}.${name}`);

  const field = (name) => ({
    value: value[name] ?? '',
    onChange: (e) => onChange([...path, name], e.target.value),
    onBlur: () => onTouch(`${dotted}.${name}`),
  });

  // What the type needs configuring, and who draws it — the card no longer
  // knows what a grid is.
  const type = getType(value.subAnswerType);
  const TypeEditor = getTypeEditor(value.subAnswerType);

  return (
    <div className="mb-3 rounded-[8px] border border-[#e0e5ea] bg-white p-3">
      <div className="grid grid-cols-12 gap-x-4">
        <div className="col-span-12 md:col-span-8">
          <Field label="Answer Label" error={err('subAnswerLabel')} anchor={`${dotted}.subAnswerLabel`}>
            <input type="text" placeholder="Enter label" className={inputClass} {...field('subAnswerLabel')} />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Field label="Sub Answer Type" error={err('subAnswerType')} anchor={`${dotted}.subAnswerType`}>
            <MultiSelect
              options={typeOptions()}
              value={value.subAnswerType || ''}
              onChange={(v) => onSetSubAnswerType(path, v)}
              onBlur={() => onTouch(`${dotted}.subAnswerType`)}
              placeholder="Select type"
              invalid={!!err('subAnswerType')}
            />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-3">
          <Field label="Score" error={err('subScore')} anchor={`${dotted}.subScore`}>
            <input type="text" inputMode="numeric" placeholder="Enter score" className={inputClass} {...field('subScore')} />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-3">
          <Field label="Grid label" error={err('gridLabel')}>
            <input type="text" placeholder="Enter label" className={inputClass} {...field('gridLabel')} />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-3">
          {/* One choice, expanded on save into the three mutually-exclusive
              booleans the stored document uses. */}
          <Field label="Input Mode" error={err('inputMode')}>
            <MultiSelect
              options={INPUT_MODES}
              value={value.inputMode || ''}
              onChange={(v) => onChange([...path, 'inputMode'], v)}
              placeholder="None"
              searchable={false}
            />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-3">
          <Field label="Weight" error={err('weight')} hint="Relative to its siblings">
            <input type="text" inputMode="numeric" placeholder="1" className={inputClass} {...field('weight')} />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-3">
          <label className={labelClass}>Options</label>
          <div className="mb-3 flex h-[38px] items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-[#41474d]">
              <input
                type="checkbox"
                checked={!!value.isDisabled}
                onChange={(e) => onChange([...path, 'isDisabled'], e.target.checked)}
                className="h-[14px] w-[14px] accent-[#002850]"
              />
              Read-only
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-[#41474d]">
              <input
                type="checkbox"
                checked={!!value.evidenceRequired}
                onChange={(e) => onChange([...path, 'evidenceRequired'], e.target.checked)}
                className="h-[14px] w-[14px] accent-[#002850]"
              />
              Evidence
            </label>
          </div>
        </div>
      </div>

      {TypeEditor && (
        <CollapsibleSection
          title={type.label}
          subtitle={type.describeConfig ? type.describeConfig(value.config) : ''}
          defaultOpen
          hasError={!!err('config')}
        >
          {err('config') && <div className="mb-2 text-[12px] text-[#ff0000]">{err('config')}</div>}
          <TypeEditor
            value={value.config}
            path={[...path, 'config']}
            errorFor={errorFor}
            onChange={onChange}
            onTouch={onTouch}
            onUpdateGrid={onUpdateGrid}
            onSetFormulas={onSetFormulas}
            onSetTrendRule={(rule) => onChange([...path, 'trendRule'], rule)}
            onAddOption={onAddOption}
            onRemoveOption={onRemoveOption}
            onAddSubOption={onAddSubOption}
            onRemoveSubOption={onRemoveSubOption}
            answerKey={answerKey}
            subKey={value.key}
            catalog={catalog}
            trendRule={value.trendRule || null}
            // The rule selects one of THIS sub-answer's assessor options, so
            // the list comes from beside it rather than from the question.
            assessorOptions={(value.assessorOptions || [])
              .map((o) => o.option)
              .filter(Boolean)}
          />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Assessor marking"
        subtitle="How this row is scored"
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

      <CollapsibleSection
        title="When to show this"
        subtitle={describeCondition(value.dependsOn, catalog)}
        hasError={!!err('dependsOn')}
      >
        <ConditionEditor
          value={value.dependsOn}
          onChange={(c) => onChange([...path, 'dependsOn'], c)}
          catalog={catalog}
          error={err('dependsOn')}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Advanced" subtitle="Rule tag">
        <Field
          label="Flag"
          hint="Free-form tag a scoring rule can key off (stored values include “emission1”)"
        >
          <input type="text" placeholder="e.g. emission1" className={inputClass} {...field('flag')} />
        </Field>
      </CollapsibleSection>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove sub answer"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[6px] bg-[#dc3545] text-[20px] leading-none text-white transition-colors hover:bg-[#bb2d3b]"
        >
          &minus;
        </button>
      </div>
    </div>
  );
}
