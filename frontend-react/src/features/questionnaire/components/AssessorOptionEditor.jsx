import Field, { inputClass, labelClass } from './Field';
import MultiSelect from './MultiSelect';
import { ASSESSOR_OPTION_TYPES } from '../config/questionTypes';

/**
 * ASSESSOR MARKING SCHEME.
 *
 * This is the half of the questionnaire the Angular create screen never had.
 * `assessorOption` is present on roughly a third of stored answers and carries
 * the marks the assessor actually awards — but because it could not be
 * authored, the marks were being written straight into the database, and the
 * scoring service compensated with per-question `if (questionId === '682d…')`
 * branches.
 *
 * Two levels, matching the stored shape: an option, and sub-options beneath it
 * (used for "a. policy available / b. web link available / c. none" ladders).
 *
 * Fully path-driven, so the same editor serves an answer, a sub-answer and a
 * grid row without knowing which it is.
 */
export default function AssessorOptionEditor({
  options = [],
  optionType,
  guidance,
  path,               // path to the assessorOptions array
  typePath,           // path to the assessorOptionType field
  guidancePath,       // path to the assessorGuidence field
  errorFor,
  onChange,
  onTouch,
  onAddOption,
  onRemoveOption,
  onAddSubOption,
  onRemoveSubOption,
}) {
  const dotted = path.join('.');
  const typeDotted = typePath.join('.');

  return (
    <div>
      <div className="grid grid-cols-12 gap-x-4">
        <div className="col-span-12 md:col-span-6">
          <Field label="Assessor Option Type" error={errorFor(typeDotted)}>
            <MultiSelect
              options={ASSESSOR_OPTION_TYPES}
              value={optionType || ''}
              onChange={(v) => onChange(typePath, v)}
              onBlur={() => onTouch(typeDotted)}
              placeholder="Select"
              invalid={!!errorFor(typeDotted)}
              searchable={false}
            />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-6">
          <Field label="Assessor Guidance">
            <input
              type="text"
              placeholder="Guidance shown to the assessor"
              className={inputClass}
              value={guidance || ''}
              onChange={(e) => onChange(guidancePath, e.target.value)}
            />
          </Field>
        </div>
      </div>

      {options.length === 0 && (
        <p className="mb-3 text-[12px] text-[#9aa0a6]">
          No assessor options. Without them the option&apos;s own Score is used as-is.
        </p>
      )}

      {options.map((option, i) => {
        const at = `${dotted}.${i}`;
        return (
          <div key={option.key} className="mb-3 rounded-[6px] border border-[#e6e9ec] bg-white p-3">
            <div className="grid grid-cols-12 gap-x-3">
              <div className="col-span-12 md:col-span-6">
                <Field label="Option" error={errorFor(`${at}.option`)}>
                  <input
                    type="text"
                    placeholder="What the assessor sees"
                    className={inputClass}
                    value={option.option}
                    onChange={(e) => onChange([...path, i, 'option'], e.target.value)}
                    onBlur={() => onTouch(`${at}.option`)}
                  />
                </Field>
              </div>

              <div className="col-span-6 md:col-span-2">
                <Field label="Marks" error={errorFor(`${at}.marks`)}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className={inputClass}
                    value={option.marks}
                    onChange={(e) => onChange([...path, i, 'marks'], e.target.value)}
                    onBlur={() => onTouch(`${at}.marks`)}
                    disabled={option.marksNotApplicable}
                  />
                </Field>
              </div>

              <div className="col-span-6 md:col-span-3">
                <label className={labelClass}>Not applicable</label>
                {/* Picking this zeroes the whole question's max mark at scoring
                    time — it is how "this does not apply to this vendor" is
                    expressed without penalising them. */}
                <label className="mb-3 flex h-[38px] cursor-pointer items-center gap-2 rounded-[6px] border border-[#ced4da] bg-white px-3 text-[13px] text-[#41474d]">
                  <input
                    type="checkbox"
                    checked={!!option.marksNotApplicable}
                    onChange={(e) => onChange([...path, i, 'marksNotApplicable'], e.target.checked)}
                    className="h-[14px] w-[14px] accent-[#002850]"
                  />
                  Marks not applicable
                </label>
              </div>

              <div className="col-span-12 md:col-span-1">
                <label className={labelClass}>&nbsp;</label>
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onRemoveOption(path, i)}
                    aria-label="Remove assessor option"
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[6px] bg-[#dc3545] text-[20px] leading-none text-white transition-colors hover:bg-[#bb2d3b]"
                  >
                    &minus;
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-options — the second marking level */}
            <div className="mt-1 rounded-[6px] bg-[#0000ff08] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#002850]">
                  Sub Options {option.subOptions?.length ? `(${option.subOptions.length})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => onAddSubOption([...path, i, 'subOptions'])}
                  className="rounded-[5px] border border-[#002850] px-3 py-[4px] text-[12px] font-semibold text-[#002850] transition-colors hover:bg-[#002850] hover:text-white"
                >
                  + Sub Option
                </button>
              </div>

              {(option.subOptions || []).length === 0 && (
                <p className="text-[11px] text-[#9aa0a6]">
                  Optional. When present, the option&apos;s own Marks are ignored and the
                  ticked sub-options are summed instead.
                </p>
              )}

              {(option.subOptions || []).map((sub, j) => {
                const st = `${at}.subOptions.${j}`;
                return (
                  <div key={sub.key} className="grid grid-cols-12 gap-x-3">
                    <div className="col-span-12 md:col-span-7">
                      <Field label="Option" error={errorFor(`${st}.option`)}>
                        <input
                          type="text"
                          placeholder="Sub option text"
                          className={inputClass}
                          value={sub.option}
                          onChange={(e) => onChange([...path, i, 'subOptions', j, 'option'], e.target.value)}
                          onBlur={() => onTouch(`${st}.option`)}
                        />
                      </Field>
                    </div>
                    <div className="col-span-8 md:col-span-3">
                      <Field label="Marks" error={errorFor(`${st}.marks`)}>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className={inputClass}
                          value={sub.marks}
                          onChange={(e) => onChange([...path, i, 'subOptions', j, 'marks'], e.target.value)}
                          onBlur={() => onTouch(`${st}.marks`)}
                        />
                      </Field>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className={labelClass}>&nbsp;</label>
                      <div className="mb-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onRemoveSubOption([...path, i, 'subOptions'], j)}
                          aria-label="Remove sub option"
                          className="flex h-[38px] w-[38px] items-center justify-center rounded-[6px] bg-[#dc3545] text-[20px] leading-none text-white transition-colors hover:bg-[#bb2d3b]"
                        >
                          &minus;
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onAddOption(path)}
        className="rounded-[6px] bg-[#002850] px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-[#013a6f]"
      >
        + Add Assessor Option
      </button>
    </div>
  );
}
