import Field, { inputClass, labelClass } from './Field';
import MultiSelect from './MultiSelect';
import RefPicker from './RefPicker';
import { OPERATORS, emptyCondition, describeCondition } from '../services/visibility';

/**
 * WHEN SHOULD THIS BE SHOWN?
 *
 * A value reference and a comparison — the same picker that chooses a formula's
 * input chooses the trigger here, so an author who has built one has built the
 * other.
 *
 * The model this replaces expressed the same idea as `{ questionIndex, ... }`,
 * addressing a position. Reordering two options re-pointed the condition at a
 * different question, silently. It also never held a single instance across any
 * stored template, which is why it is being introduced rather than migrated.
 */
export default function ConditionEditor({ value, onChange, catalog, error }) {
  const spec = OPERATORS.find((o) => o.value === (value?.operator || 'answered'));

  if (!value?.ref) {
    return (
      <div>
        <p className="mb-2 text-[12px] text-[#7c7d7e]">
          Always shown. Add a condition to reveal this only when it applies.
        </p>
        <button
          type="button"
          onClick={() => onChange(emptyCondition())}
          className="rounded-[6px] border border-[#002850] px-4 py-[6px] text-[12px] font-semibold text-[#002850] transition-colors hover:bg-[#002850] hover:text-white"
        >
          + Add condition
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-x-3">
        <div className="col-span-12 md:col-span-5">
          <Field label="When this value" error={error}>
            <RefPicker
              value={value.ref}
              onChange={(ref) => onChange({ ...value, ref })}
              catalog={catalog}
              allowConst={false}
            />
          </Field>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Field label="Condition">
            <MultiSelect
              options={OPERATORS.map((o) => ({ value: o.value, label: o.label }))}
              value={value.operator || 'answered'}
              onChange={(operator) => onChange({ ...value, operator })}
              searchable={false}
            />
          </Field>
        </div>

        {spec?.needsValue && (
          <div className="col-span-12 md:col-span-3">
            <Field label="Value" hint={spec.hint}>
              <input
                type="text"
                className={inputClass}
                placeholder={spec.hint || 'Compare against'}
                value={value.value ?? ''}
                onChange={(e) => onChange({ ...value, value: e.target.value })}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Read back in plain English — a condition an author cannot read is one
          they cannot check. */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-[#41474d]">{describeCondition(value, catalog)}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[12px] font-semibold text-[#b0362a] hover:underline"
        >
          Always show
        </button>
      </div>
    </div>
  );
}
