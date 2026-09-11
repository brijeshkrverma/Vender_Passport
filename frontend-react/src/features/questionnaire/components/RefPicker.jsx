import { useMemo, useState } from 'react';
import { inputClass } from './Field';
import MultiSelect from './MultiSelect';
import {
  inputRef, optionRef, cellRef, selfRef, questionRef, constRef,
  labelRef, validateRef, refKey,
} from '../services/valueRef';

/**
 * ONE PICKER FOR EVERY VALUE THE SYSTEM CAN READ.
 *
 * Formulas, mark rules and trend rules all name values, and each used to have
 * its own way of choosing one: a click-on-the-grid, a dropdown of parsed path
 * strings, and a pair of row/column pickers. Three UIs to learn, three sets of
 * rules about what was allowed, and no way for one mechanism's output to feed
 * another.
 *
 * Now they all render this. Whatever an author can reference in one place, they
 * can reference in all of them.
 *
 * The list is built from the catalog, so it can only offer things that exist —
 * which is what makes a dangling reference unrepresentable rather than merely
 * validated after the fact.
 */

/**
 * Cells and inputs belonging to OTHER questions.
 *
 * A trend rule cannot do its job without these: intensity is emissions divided
 * by revenue, and revenue is a different question. The engine and the stored
 * shape have supported it since `questionId` became an optional field on a
 * reference; until this, the only way to build one was to write the JSON by
 * hand.
 *
 * Kept in its own list, and behind its own scope, because it is large. Five
 * questions with 8×5 grids is two hundred entries — enough to bury the common
 * case, which is a cell in the question being edited.
 */
function buildCrossOptions(gridSources) {
  const out = [];

  (gridSources || []).forEach((source) => {
    if (!source.answerKey || !source.subKey) return;   // pre-key document

    (source.rowIdx || []).forEach((r) => {
      (source.colIdx || []).forEach((c) => {
        const ref = cellRef(source.answerKey, source.subKey, r, c, source.questionId);
        const rowLabel = source.rowLabels?.[r];
        const colLabel = source.colLabels?.[c];
        out.push({
          value: refKey(ref),
          ref,
          group: source.label,
          label: `R${r}C${c}${rowLabel && colLabel ? ` · ${rowLabel} / ${colLabel}` : ''}`,
        });
      });
    });
  });

  return out;
}

/** Flatten the catalog into one selectable list. */
function buildOptions(catalog, { allowCells, allowQuestions, allowConst }) {
  const out = [];

  out.push({ value: refKey(selfRef('maxMark')), ref: selfRef('maxMark'), group: 'This question', label: 'Max marks' });

  (catalog?.answers || []).forEach((answer) => {
    out.push({
      value: refKey(optionRef(answer.key, 'score')),
      ref: optionRef(answer.key, 'score'),
      group: 'Options',
      label: `${answer.label} — score`,
    });
    out.push({
      value: refKey(optionRef(answer.key, 'selected')),
      ref: optionRef(answer.key, 'selected'),
      group: 'Options',
      label: `${answer.label} — selected? (1 or 0)`,
    });

    (answer.subs || []).forEach((sub) => {
      // Only an input the respondent actually types can carry a number.
      if (sub.inputMode === 'numeric' || sub.inputMode === 'text') {
        out.push({
          value: refKey(inputRef(answer.key, sub.key)),
          ref: inputRef(answer.key, sub.key),
          group: 'Inputs',
          label: `${answer.label} → ${sub.label}`,
        });
      }

      if (allowCells && sub.config?.rows) {
        const rows = (sub.config.rows || []).length;
        const cols = (sub.config.columns || []).length;
        // Coordinates address the stored grid, so row 0 / column 0 are the
        // header and label lanes and are offered too — a formula may legitimately
        // read a row label.
        for (let r = 0; r <= rows; r += 1) {
          for (let c = 0; c <= cols; c += 1) {
            const ref = cellRef(answer.key, sub.key, r, c);
            out.push({
              value: refKey(ref),
              ref,
              group: `Grid — ${sub.label}`,
              label: `R${r}C${c}${r > 0 && sub.config.rows[r - 1]?.label ? ` · ${sub.config.rows[r - 1].label}` : ''}`,
            });
          }
        }
      }
    });
  });

  if (allowQuestions) {
    (catalog?.questions || []).forEach((q) => {
      out.push({
        value: refKey(questionRef(q.id, 'mark')),
        ref: questionRef(q.id, 'mark'),
        group: 'Other questions',
        label: `${q.label} — mark`,
      });
    });
  }

  if (allowConst) {
    out.push({ value: '__const__', ref: null, group: 'Other', label: 'A fixed number…' });
  }

  return out;
}

export default function RefPicker({
  value,
  onChange,
  catalog,
  gridSources = [],
  allowCells = true,
  allowQuestions = true,
  allowConst = false,
  placeholder = 'Choose a value',
}) {
  const own = useMemo(
    () => buildOptions(catalog, { allowCells, allowQuestions, allowConst }),
    [catalog, allowCells, allowQuestions, allowConst]
  );
  const cross = useMemo(
    () => (allowCells ? buildCrossOptions(gridSources) : []),
    [gridSources, allowCells]
  );

  /**
   * Which list is on offer.
   *
   * Two hundred cells from other questions would bury the handful in this one,
   * so they are a separate scope rather than more rows in the same dropdown.
   * The scope follows the current value, so reopening a rule that points
   * elsewhere shows where it points instead of appearing to have lost it.
   */
  const [scope, setScope] = useState(value?.questionId ? 'other' : 'own');
  const options = scope === 'other' ? cross : own;

  const isConst = value?.kind === 'const';
  const errors = value ? validateRef(value, catalog) : [];

  return (
    <div>
      {cross.length > 0 && (
        <div className="mb-2 flex gap-1">
          {[
            { id: 'own', label: 'This question' },
            { id: 'other', label: `Other questions (${cross.length})` },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className={`rounded-[5px] px-3 py-[3px] text-[11px] font-semibold transition-colors ${
                scope === s.id
                  ? 'bg-[#002850] text-white'
                  : 'bg-[#f0f3f6] text-[#41474d] hover:bg-[#e4e9ee]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <MultiSelect
        options={options.map((o) => ({ value: o.value, label: `${o.group} · ${o.label}` }))}
        value={isConst ? '__const__' : (value ? refKey(value) : '')}
        onChange={(v) => {
          if (v === '__const__') { onChange(constRef(0)); return; }
          onChange(options.find((o) => o.value === v)?.ref || null);
        }}
        placeholder={placeholder}
        invalid={errors.length > 0}
      />

      {isConst && (
        <input
          type="number"
          className={`${inputClass} mt-2`}
          placeholder="0"
          value={value.value ?? ''}
          onChange={(e) => onChange(constRef(e.target.value))}
        />
      )}

      {errors.length > 0 && (
        // A reference whose target was deleted or renamed says so here, at
        // author time — the alternative is a score that is quietly wrong.
        <div className="mt-1 text-[12px] text-[#ff0000]">{errors.join(' · ')}</div>
      )}

      {value && errors.length === 0 && !isConst && (
        <div className="mt-1 text-[11px] text-[#9aa0a6]">{labelRef(value, catalog)}</div>
      )}
    </div>
  );
}
