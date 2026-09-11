import { useMemo, useState } from 'react';
import Field, { inputClass, labelClass } from './Field';
import MultiSelect from './MultiSelect';
import RefPicker from './RefPicker';
import { ENGINES, ENGINE_IDS, validateRule, evaluateRule, describeRule } from '../services/markEngines';
import { refKey, labelRef, areaToRefs } from '../services/valueRef';

/**
 * SCORING RULE EDITOR.
 *
 * This is where the 40 hardcoded `if (questionId === '682d…')` branches go.
 * Each one described how a single question's marks were worked out; the engine
 * registry gives that description a place to live as data.
 *
 * Every value a rule reads is chosen through `RefPicker` — the same control the
 * formula builder and the trend rule use. An author who has learned one has
 * learned all three, and a value reachable in one is reachable in all of them.
 */

/* ── config controls ───────────────────────────────────────────────────── */

function NumberInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number" className={inputClass} placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}

function BandTable({ value = [], onChange }) {
  const set = (i, field, v) => onChange(value.map((b, j) => (j === i ? { ...b, [field]: v } : b)));

  return (
    <div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-[#7c7d7e]">
            <th className="py-1 text-left font-medium">From</th>
            <th className="py-1 text-left font-medium">To</th>
            <th className="py-1 text-left font-medium">Marks</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {value.map((b, i) => (
            <tr key={i} className="border-t border-[#eceff1]">
              {['min', 'max', 'marks'].map((field) => (
                <td key={field} className="py-1 pr-2">
                  <input
                    type="number"
                    placeholder={field === 'min' ? '−∞' : field === 'max' ? '+∞' : ''}
                    className="w-[80px] rounded-[5px] border border-[#ced4da] px-2 py-[5px]"
                    value={b[field] ?? ''}
                    onChange={(e) => set(i, field, e.target.value === '' ? null : Number(e.target.value))}
                  />
                </td>
              ))}
              <td className="py-1">
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                  aria-label="Remove band"
                  className="rounded-[4px] bg-[#dc3545] px-2 py-[4px] text-[13px] leading-none text-white">&minus;</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => onChange([...value, { min: null, max: null, marks: 0 }])}
        className="mt-2 rounded-[6px] border border-[#002850] px-3 py-[5px] text-[12px] font-semibold text-[#002850] hover:bg-[#002850] hover:text-white">
        + Add band
      </button>
      <p className="mt-1 text-[11px] text-[#9aa0a6]">
        Both ends are included. Leave a box empty for “no limit”. Overlapping bands are rejected —
        otherwise the score would depend on the order they happen to be listed in.
      </p>
    </div>
  );
}

function LookupTable({ value = [], onChange }) {
  const set = (i, field, v) => onChange(value.map((r, j) => (j === i ? { ...r, [field]: v } : r)));

  return (
    <div>
      {value.map((r, i) => (
        <div key={i} className="mb-2 flex gap-2">
          <input type="text" placeholder="Cell text, e.g. Software based"
            className={`${inputClass} flex-1`}
            value={r.keyEquals ?? ''} onChange={(e) => set(i, 'keyEquals', e.target.value)} />
          <input type="number" placeholder="Marks"
            className="w-[90px] rounded-[6px] border border-[#ced4da] px-2 py-[7px] text-[14px]"
            value={r.marks ?? ''}
            onChange={(e) => set(i, 'marks', e.target.value === '' ? null : Number(e.target.value))} />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label="Remove value"
            className="rounded-[6px] bg-[#dc3545] px-3 text-[16px] leading-none text-white">&minus;</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { keyEquals: '', marks: 0 }])}
        className="rounded-[6px] border border-[#002850] px-3 py-[5px] text-[12px] font-semibold text-[#002850] hover:bg-[#002850] hover:text-white">
        + Add value
      </button>
    </div>
  );
}

/** Repeatable list of values, each chosen through the shared picker. */
function RefList({ value = [], onChange, catalog, gridSources }) {
  return (
    <div>
      {value.map((ref, i) => (
        <div key={i} className="mb-2 flex items-start gap-2">
          <div className="flex-1">
            <RefPicker
              value={ref}
              onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))}
              catalog={catalog}
              gridSources={gridSources}
              allowConst
            />
          </div>
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label="Remove input"
            className="rounded-[6px] bg-[#dc3545] px-3 py-[7px] text-[16px] leading-none text-white">&minus;</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, null])}
        className="rounded-[6px] border border-[#002850] px-3 py-[5px] text-[12px] font-semibold text-[#002850] hover:bg-[#002850] hover:text-white">
        + Add input
      </button>
    </div>
  );
}

/**
 * A rectangular region of one grid.
 *
 * Not a Ref — a Ref names one value and this names many. Keeping them distinct
 * means "resolve this reference" has one meaning, and the UI can say plainly
 * whether it wants a value or a region.
 */
function AreaPicker({ value = {}, onChange, catalog }) {
  const grids = useMemo(() => {
    const out = [];
    (catalog?.answers || []).forEach((answer) => {
      (answer.subs || []).forEach((sub) => {
        if (sub.config?.rows) {
          out.push({
            value: `${answer.key}|${sub.key}`,
            label: `${answer.label} → ${sub.label}`,
            answerKey: answer.key,
            subKey: sub.key,
            rows: (sub.config.rows || []).length,
            cols: (sub.config.columns || []).length,
          });
        }
      });
    });
    return out;
  }, [catalog]);

  const chosen = grids.find((g) => g.answerKey === value.answerKey && g.subKey === value.subKey);

  const toggle = (field, n) => {
    const list = value[field] || [];
    onChange({
      ...value,
      [field]: (list.includes(n) ? list.filter((x) => x !== n) : [...list, n]).sort((a, b) => a - b),
    });
  };

  const Chip = ({ on, onClick, children }) => (
    <button type="button" onClick={onClick}
      className={`rounded-[6px] border px-3 py-[5px] text-[12px] ${
        on ? 'border-[#002850] bg-[#e3edf7] font-semibold text-[#002850]'
           : 'border-[#ced4da] bg-white text-[#41474d]'}`}>
      {children}
    </button>
  );

  if (!grids.length) {
    return (
      <p className="text-[12px] text-[#b4650b]">
        This question has no grid yet. Add a sub-answer of type Grid and it will appear here.
      </p>
    );
  }

  return (
    <div>
      <MultiSelect
        options={grids.map((g) => ({ value: g.value, label: g.label }))}
        value={chosen?.value || ''}
        onChange={(v) => {
          const g = grids.find((x) => x.value === v);
          if (g) onChange({ answerKey: g.answerKey, subKey: g.subKey, rows: [], cols: [] });
        }}
        placeholder="Choose a grid"
      />

      {chosen && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-[#9aa0a6]">Rows</span>
            {Array.from({ length: chosen.rows }, (_, i) => i + 1).map((r) => (
              <Chip key={r} on={(value.rows || []).includes(r)} onClick={() => toggle('rows', r)}>R{r}</Chip>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-[#9aa0a6]">Columns</span>
            {Array.from({ length: chosen.cols }, (_, i) => i + 1).map((c) => (
              <Chip key={c} on={(value.cols || []).includes(c)} onClick={() => toggle('cols', c)}>C{c}</Chip>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── main ──────────────────────────────────────────────────────────────── */

export default function ScoringRuleEditor({ rule, onChange, catalog, maxMark, gridSources = [] }) {
  const [sample, setSample] = useState({});

  const engine = rule?.engine ? ENGINES[rule.engine] : null;
  const errors = validateRule(rule, catalog);

  const setConfig = (name, value) =>
    onChange({ ...rule, config: { ...(rule?.config || {}), [name]: value } });

  /** Every value this rule reads, so the author can supply a sample for each. */
  const sampleableRefs = useMemo(() => {
    const c = rule?.config || {};
    const refs = [
      ...(Array.isArray(c.inputs) ? c.inputs : []),
      ...(c.input ? [c.input] : []),
      ...(c.keyCell ? [c.keyCell] : []),
      ...(c.area ? areaToRefs(c.area) : []),
    ].filter(Boolean);
    // Dedupe by identity, which is exactly what refKey is for.
    const seen = new Set();
    return refs.filter((r) => (seen.has(refKey(r)) ? false : seen.add(refKey(r))));
  }, [rule]);

  /**
   * Live result against the sample values.
   *
   * The previous system's rules could only be checked by submitting a real
   * questionnaire and reading the total, which is why so many of them were
   * quietly wrong.
   */
  const preview = useMemo(() => {
    if (!rule?.engine || errors.length) return null;

    // Rebuild the normalised resolver context from the flat sample map.
    const refCtx = { self: { maxMark }, answers: {}, questions: {} };
    sampleableRefs.forEach((ref) => {
      const v = sample[refKey(ref)];
      if (ref.kind === 'input') {
        const a = refCtx.answers[ref.answerKey] || (refCtx.answers[ref.answerKey] = { selected: true, subs: {} });
        a.subs[ref.subKey] = { value: v };
      } else if (ref.kind === 'cell') {
        const a = refCtx.answers[ref.answerKey] || (refCtx.answers[ref.answerKey] = { selected: true, subs: {} });
        const sub = a.subs[ref.subKey] || (a.subs[ref.subKey] = { grid: [] });
        sub.grid[ref.row] = sub.grid[ref.row] || {};
        sub.grid[ref.row][`${ref.row}${ref.col}`] = { val: v };
      } else if (ref.kind === 'question') {
        refCtx.questions[ref.questionId] = { mark: v };
      }
    });

    return evaluateRule(rule, { catalog, maxMark, refCtx, selectedOptions: [] });
  }, [rule, errors.length, sample, sampleableRefs, catalog, maxMark]);

  return (
    <div>
      <Field
        label="Scoring engine"
        hint="Leave empty to add up the selected options, which is the default"
      >
        <MultiSelect
          options={ENGINE_IDS.map((id) => ({ value: id, label: ENGINES[id].label }))}
          value={rule?.engine || ''}
          onChange={(v) => onChange(v ? { engine: v, config: {} } : null)}
          placeholder="Default — add up selected options"
          searchable={false}
        />
      </Field>

      {engine && (
        <>
          <p className="mb-3 text-[12px] text-[#7c7d7e]">{engine.hint}</p>

          {engine.fields.map((f) => {
            // A field that only applies in one mode is hidden in the others,
            // rather than sitting there inert and inviting a wrong answer.
            if (f.showWhen && rule.config?.[Object.keys(f.showWhen)[0]] !== Object.values(f.showWhen)[0]) {
              return null;
            }
            const value = rule.config?.[f.name];
            const set = (v) => setConfig(f.name, v);

            return (
              <Field key={f.name} label={f.label} required={f.required}>
                {f.control === 'number' && <NumberInput value={value} onChange={set} />}
                {f.control === 'bandTable' && <BandTable value={value || []} onChange={set} />}
                {f.control === 'lookupTable' && <LookupTable value={value || []} onChange={set} />}
                {f.control === 'area' && <AreaPicker value={value || {}} onChange={set} catalog={catalog} />}
                {f.control === 'ref' && (
                  <RefPicker value={value} onChange={set} catalog={catalog} gridSources={gridSources} {...(f.refOptions || {})} />
                )}
                {f.control === 'refList' && <RefList value={value || []} onChange={set} catalog={catalog} gridSources={gridSources} />}
                {f.control === 'select' && (
                  <MultiSelect
                    options={(f.options || []).map((o) => ({ value: o, label: o }))}
                    value={value || f.options?.[0] || ''}
                    onChange={set}
                    searchable={false}
                  />
                )}
              </Field>
            );
          })}

          {errors.length > 0 ? (
            <div className="mb-3 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-[12px] text-[#842029]">
              {errors.map((e) => <div key={e}>{e}</div>)}
            </div>
          ) : (
            <div className="mb-3 rounded-[6px] bg-[#f4f8fc] px-3 py-2 text-[12px] text-[#002850]">
              {describeRule(rule, catalog)}
            </div>
          )}

          {errors.length === 0 && (
            <div className="rounded-[6px] border border-[#e6e9ec] p-3">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-[#9aa0a6]">
                Try it — enter sample values
              </div>

              {sampleableRefs.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-3">
                  {sampleableRefs.map((ref) => (
                    <div key={refKey(ref)}>
                      <label className={labelClass}>{labelRef(ref, catalog)}</label>
                      <input
                        type="number" placeholder="0"
                        className="w-[170px] rounded-[6px] border border-[#ced4da] px-2 py-[6px] text-[13px]"
                        value={sample[refKey(ref)] ?? ''}
                        onChange={(e) => setSample((s) => ({ ...s, [refKey(ref)]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-2 text-[11px] text-[#9aa0a6]">
                  This engine reads nothing from the respondent, so its result is always the same.
                </p>
              )}

              {preview && (
                <div>
                  <div className="text-[13px] text-[#41474d]">
                    Result: <b className="text-[#002850]">{preview.marks}</b>
                    {maxMark > 0 && <span className="text-[#9aa0a6]"> / {maxMark}</span>}
                  </div>
                  {/* The trace is the point — a score nobody can explain is a
                      score nobody can defend when a vendor disputes it. */}
                  {preview.trace.map((t, i) => (
                    <div key={i} className="mt-1 text-[11px] text-[#7c7d7e]">
                      • {t.detail} → <b>{t.marks}</b>
                    </div>
                  ))}
                  {preview.warnings?.map((w) => (
                    <div key={w} className="mt-1 text-[11px] text-[#b4650b]">⚠ {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
