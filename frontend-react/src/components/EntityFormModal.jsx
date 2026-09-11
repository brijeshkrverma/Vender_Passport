import { useState, useEffect } from 'react';
import Modal from './Modal';

/**
 * Schema-driven create/edit form.
 *
 * Every entity page needs the same dialog — labelled fields, required-field
 * checks, a server error banner, a disabled button while saving. Describing the
 * fields as data keeps those behaviours identical everywhere instead of each
 * page growing its own half-complete version.
 *
 * A field is: { name, label, type, options?, required?, placeholder?, help?, span? }
 * type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'email' | 'password'
 */

const input = {
  width: '100%', padding: '9px 11px', fontSize: '13px',
  border: '1px solid #DAD5C4', borderRadius: '7px',
  background: '#FCFBF8', color: '#1C2430', outline: 'none',
};

const label = {
  display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.05em',
  textTransform: 'uppercase', color: '#9CA0A8', marginBottom: '5px',
};

function Field({ field, value, onChange }) {
  const common = {
    style: input,
    value: value ?? '',
    onChange: (e) => onChange(field.name, e.target.value),
    onFocus: (e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; },
    onBlur: (e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; },
    id: `f-${field.name}`,
  };

  return (
    <div style={{ marginBottom: '14px', gridColumn: field.span === 2 ? '1 / -1' : 'auto' }}>
      <label style={label} htmlFor={`f-${field.name}`}>
        {field.label}{field.required && <span style={{ color: '#B0362A' }}> *</span>}
      </label>

      {field.type === 'textarea' && <textarea {...common} rows={field.rows || 3} placeholder={field.placeholder} />}

      {field.type === 'select' && (
        <select {...common}>
          <option value="">{field.placeholder || 'Select…'}</option>
          {(field.options || []).map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const text = typeof o === 'string' ? o : o.label;
            return <option key={val} value={val}>{text}</option>;
          })}
        </select>
      )}

      {!['textarea', 'select'].includes(field.type) && (
        <input {...common} type={field.type || 'text'} placeholder={field.placeholder} />
      )}

      {field.help && (
        <div style={{ fontSize: '11px', color: '#6C7280', marginTop: '4px', lineHeight: 1.45 }}>{field.help}</div>
      )}
    </div>
  );
}

export default function EntityFormModal({
  open, onClose, title, fields, initial, onSubmit,
  saving, error, submitLabel = 'Save', intro,
}) {
  const [values, setValues] = useState(initial || {});
  const [missing, setMissing] = useState([]);

  // Reload when the dialog opens on a different record.
  useEffect(() => { if (open) { setValues(initial || {}); setMissing([]); } }, [open, initial]);

  const set = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setMissing((m) => m.filter((x) => x !== name));
  };

  const submit = (e) => {
    e.preventDefault();
    const blank = fields
      .filter((f) => f.required && String(values[f.name] ?? '').trim() === '')
      .map((f) => f.name);
    if (blank.length) { setMissing(blank); return; }

    // Drop empty optional values so the server applies its own defaults
    // instead of receiving "" and failing enum validation.
    const payload = {};
    for (const f of fields) {
      const v = values[f.name];
      if (v === undefined || v === null || String(v).trim() === '') continue;
      payload[f.name] = f.type === 'number' ? Number(v) : v;
    }
    onSubmit(payload);
  };

  const missingLabels = fields.filter((f) => missing.includes(f.name)).map((f) => f.label);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="text-xs font-semibold border border-border rounded-lg px-4 py-2 hover:bg-paper">
            Cancel
          </button>
          <button type="submit" form="entity-form" disabled={saving}
            className="text-xs font-semibold bg-seal text-white rounded-lg px-5 py-2 hover:bg-seal-dark disabled:opacity-60">
            {saving ? 'Saving…' : submitLabel}
          </button>
        </>
      }
    >
      {intro && <p className="text-xs text-gray-500 mb-4 leading-relaxed">{intro}</p>}

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {missingLabels.length > 0 && (
        <div role="alert" className="mb-4 rounded-lg border border-warning/40 bg-warning-bg/30 px-3 py-2 text-xs text-ink-900">
          Required: {missingLabels.join(', ')}
        </div>
      )}

      <form id="entity-form" onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {fields.map((f) => (
            <Field key={f.name} field={f} value={values[f.name]} onChange={set} />
          ))}
        </div>
      </form>
    </Modal>
  );
}
