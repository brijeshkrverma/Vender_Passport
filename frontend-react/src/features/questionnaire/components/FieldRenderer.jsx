import Field, { inputClass } from './Field';
import MultiSelect from './MultiSelect';
import RichTextEditor from './RichTextEditor';
import { ANSWER_TYPES } from '../config/questionTypes';

/**
 * CONTROL REGISTRY — schema `control` string to component.
 *
 * The page never writes an <input> by hand: it maps over `BASIC_FIELDS` and
 * this table resolves each one. Adding a field to the questionnaire is a schema
 * entry; adding a new *kind* of field is one entry here.
 */
const CONTROLS = {
  text: ({ value, set, blur, field, invalid }) => (
    <input
      type="text"
      className={inputClass}
      placeholder={field.placeholder}
      value={value ?? ''}
      onChange={(e) => set(e.target.value)}
      onBlur={blur}
      style={invalid ? { borderColor: '#ff0000' } : undefined}
    />
  ),

  // A field holding "100" does not need to be 700px wide; `width: 'sm'` keeps
  // the input the size of the value it holds, which also makes the row scan.
  number: ({ value, set, blur, field, invalid }) => (
    <input
      type="number"
      className={`${inputClass} ${field.width === 'sm' ? 'max-w-[170px]' : ''}`}
      placeholder={field.placeholder}
      value={value ?? ''}
      onChange={(e) => set(e.target.value)}
      onBlur={blur}
      style={invalid ? { borderColor: '#ff0000' } : undefined}
    />
  ),

  date: ({ value, set, blur, invalid }) => (
    <input
      type="date"
      className={inputClass}
      value={value ?? ''}
      onChange={(e) => set(e.target.value)}
      onBlur={blur}
      style={invalid ? { borderColor: '#ff0000' } : undefined}
    />
  ),

  textarea: ({ value, set, blur, field, invalid }) => (
    <textarea
      rows={field.rows || 4}
      className={`${inputClass} resize-y`}
      placeholder={field.placeholder}
      value={value ?? ''}
      onChange={(e) => set(e.target.value)}
      onBlur={blur}
      style={invalid ? { borderColor: '#ff0000' } : undefined}
    />
  ),

  /**
   * Native <select>, matching the original screen's Question Order control —
   * which used a plain <select> while its neighbours used ng-select.
   */
  select: ({ value, set, blur, field, options, invalid }) => (
    <select
      className={inputClass}
      value={value ?? ''}
      onChange={(e) => set(e.target.value)}
      onBlur={blur}
      style={invalid ? { borderColor: '#ff0000' } : undefined}
    >
      <option value="">{field.placeholder || 'Select'}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),

  multiselect: ({ value, set, blur, field, options, invalid }) => (
    <MultiSelect
      multiple
      options={options}
      value={value || []}
      onChange={set}
      onBlur={blur}
      placeholder={field.placeholder}
      invalid={invalid}
    />
  ),

  /** Answer type comes from the type registry, not from the masters API. */
  answerType: ({ value, set, blur, field, invalid }) => (
    <MultiSelect
      options={ANSWER_TYPES.map((t) => ({ value: t.id, label: t.label }))}
      value={value || ''}
      onChange={set}
      onBlur={blur}
      placeholder={field.placeholder}
      invalid={invalid}
    />
  ),

  richtext: ({ value, set, blur, invalid }) => (
    <RichTextEditor value={value || ''} onChange={set} onBlur={blur} invalid={invalid} />
  ),
};

export default function FieldRenderer({ field, value, error, options = [], onChange, onTouch }) {
  const Control = CONTROLS[field.control];

  if (!Control) {
    return (
      <Field label={field.label} error={`No control registered for "${field.control}"`}>
        <div className={inputClass}>{String(value ?? '')}</div>
      </Field>
    );
  }

  return (
    <Field label={field.label} required={field.required} error={error} anchor={field.name}>
      <Control
        field={field}
        value={value}
        options={options}
        invalid={!!error}
        set={(v) => onChange(field.name, v)}
        blur={() => onTouch(field.name)}
      />
    </Field>
  );
}
