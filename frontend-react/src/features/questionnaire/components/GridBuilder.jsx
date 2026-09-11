import { useState } from 'react';
import { inputClass } from './Field';
import CollapsibleSection from './CollapsibleSection';
import AssessorOptionEditor from './AssessorOptionEditor';
import GridFormulaDialog from './GridFormulaDialog';
import { GRID_CELL_TYPES } from '../config/questionTypes';
import * as grid from '../services/gridModel';
import { formulaToText, computedRefKeys } from '../services/gridFormula';
import { cellRef, refKey } from '../services/valueRef';

/**
 * GRID BUILDER.
 *
 * There was no equivalent in the Angular authoring screen:
 * `subAnswerType: 'Grid'` could be chosen, but the table itself had to be
 * written into MongoDB by hand, because the stored shape keys every cell by
 * concatenated coordinates (`"11"` = row 1, column 1) and renumbers on every
 * insert. 99 stored sub-answers use it.
 *
 * The editor works on a normal `{ columns, rows }` model; `gridModel` converts
 * at the boundary, so nothing about the stored format changes.
 *
 * Column 0 is the row-label column and is always present — in the stored data
 * it is the only cell of the header row that is a bare string rather than a
 * `{ val, type }` pair.
 */

/** Sentinel in the cell-type dropdown — not a type, a marking toggle. */
const CALC_OPTION = '__calc__';

export default function GridBuilder({
  value, path, errorFor, onChange, onTouch,
  onUpdateGrid, onSetFormulas, onSetTrendRule,
  onAddOption, onRemoveOption, onAddSubOption, onRemoveSubOption,
  trendRule = null, assessorOptions = [], catalog, answerKey, subKey,
}) {
  const [showStored, setShowStored] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const dotted = path.join('.');

  if (!value) return null;

  const apply = (fn) => onUpdateGrid(path, fn);

  const formulas = value.formulas || [];
  const computed = computedRefKeys(formulas);

  /**
   * Formula coordinates address the *stored* grid, where row 0 is the header
   * and column 0 is the label column. The editor's own rows and columns exclude
   * both, so an editor position maps to stored `(ri + 1, ci + 1)`.
   */
  const isComputedCell = (ri, ci) => computed.includes(refKey(cellRef(answerKey, subKey, ri + 1, ci + 1)));

  const marked = grid.calcCellCount(value);

  return (
    <div>
      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="mb-3 overflow-x-auto rounded-[6px] border border-[#e6e9ec] bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#f6f8fa]">
              <th className="w-[210px] border-b border-r border-[#e6e9ec] p-2 text-left align-top">
                <input
                  type="text"
                  placeholder="Row header"
                  className={`${inputClass} bg-white`}
                  value={value.rowHeaderLabel || ''}
                  onChange={(e) => apply((g) => ({ ...g, rowHeaderLabel: e.target.value }))}
                />
                <div className="mt-1 text-[10px] text-[#9aa0a6]">Column 0 · row labels</div>
              </th>

              {value.columns.map((column, ci) => (
                <th key={column.key} className="min-w-[200px] border-b border-r border-[#e6e9ec] p-2 text-left align-top">
                  <input
                    type="text"
                    placeholder={`Column ${ci + 1} heading`}
                    className={`${inputClass} bg-white`}
                    value={column.label}
                    onChange={(e) => apply((g) => grid.updateColumn(g, column.key, { label: e.target.value }))}
                    onBlur={() => onTouch(`${dotted}.columns.${ci}.label`)}
                    style={errorFor(`${dotted}.columns.${ci}.label`) ? { borderColor: '#ff0000' } : undefined}
                  />
                  <div className="mt-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => apply((g) => grid.moveColumn(g, ci, ci - 1))}
                      disabled={ci === 0}
                      title="Move left"
                      className="h-[28px] w-[24px] rounded-[4px] border border-[#dde1e5] text-[11px] text-[#41474d] disabled:opacity-30"
                    >
                      &#8592;
                    </button>
                    <button
                      type="button"
                      onClick={() => apply((g) => grid.moveColumn(g, ci, ci + 1))}
                      disabled={ci === value.columns.length - 1}
                      title="Move right"
                      className="h-[28px] w-[24px] rounded-[4px] border border-[#dde1e5] text-[11px] text-[#41474d] disabled:opacity-30"
                    >
                      &#8594;
                    </button>
                    <button
                      type="button"
                      onClick={() => apply((g) => grid.removeColumn(g, column.key))}
                      disabled={value.columns.length <= 1}
                      title="Remove column"
                      className="h-[28px] w-[24px] rounded-[4px] bg-[#dc3545] text-[13px] leading-none text-white disabled:opacity-30"
                    >
                      &minus;
                    </button>
                    <span className="ml-auto text-[10px] text-[#9aa0a6]">C{ci + 1}</span>
                  </div>
                </th>
              ))}

              <th className="w-[52px] border-b border-[#e6e9ec] p-2 align-top" />
            </tr>
          </thead>

          <tbody>
            {value.rows.map((row, ri) => (
              <tr key={row.key} className="align-top">
                <td className="border-b border-r border-[#e6e9ec] p-2">
                  <input
                    type="text"
                    placeholder={`Row ${ri + 1} label`}
                    className={inputClass}
                    value={row.label || ''}
                    onChange={(e) => apply((g) => grid.updateRow(g, row.key, { label: e.target.value }))}
                  />
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-[#9aa0a6]">R{ri + 1}</span>
                    <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[#9aa0a6]">
                      <input
                        type="checkbox"
                        checked={!!row.disabled}
                        onChange={(e) => apply((g) => grid.updateRow(g, row.key, { disabled: e.target.checked }))}
                        className="h-[12px] w-[12px] accent-[#002850]"
                      />
                      read-only
                    </label>
                  </div>
                </td>

                {value.columns.map((column, ci) => {
                  const isCalc = grid.isCellCalc(row, column.key);
                  const isComputed = isComputedCell(ri, ci);

                  return (
                    <td key={column.key} className="border-b border-r border-[#e6e9ec] p-2">
                      {/* Author fills a default / prompt value; the respondent
                          overwrites it. A computed cell is filled by a formula,
                          so it is read-only for both. */}
                      <input
                        type={column.type === 'number' ? 'number' : 'text'}
                        placeholder={
                          isComputed ? 'calculated'
                            : column.type === 'dropdown' ? 'Comma-separated choices'
                              : 'Default value'
                        }
                        className={`${inputClass} ${isComputed ? 'bg-[#fbf3e4]' : ''}`}
                        value={row.cells?.[column.key] ?? ''}
                        readOnly={isComputed}
                        onChange={(e) => apply((g) => grid.setCell(g, row.key, column.key, e.target.value))}
                      />

                      <div className="mt-1 flex items-center gap-1">
                        {/*
                          The type dropdown doubles as the formula-marking
                          control, exactly as the source tool did: pick
                          "+ Add Calc" and the dropdown snaps back to the real
                          type, having only toggled the flag.
                        */}
                        <select
                          value={column.type}
                          onChange={(e) => {
                            if (e.target.value === CALC_OPTION) {
                              apply((g) => grid.setCellCalc(g, row.key, column.key, !isCalc));
                              return;   // value prop restores the real type
                            }
                            apply((g) => grid.updateColumn(g, column.key, { type: e.target.value }));
                          }}
                          className="h-[26px] flex-1 rounded-[4px] border border-[#dde1e5] bg-white px-1 text-[11px] text-[#41474d]"
                        >
                          {GRID_CELL_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                          <option value={CALC_OPTION}>
                            {isCalc ? '✓ In calculation — remove' : '+ Add Calc'}
                          </option>
                        </select>

                        {isCalc && (
                          <span
                            title="Available to the formula builder"
                            className="rounded-[3px] bg-[#e3edf7] px-[5px] py-[2px] font-mono text-[10px] font-semibold text-[#002850]"
                          >
                            fx R{ri + 1}C{ci + 1}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}

                <td className="border-b border-[#e6e9ec] p-2">
                  <button
                    type="button"
                    onClick={() => apply((g) => grid.removeRow(g, row.key))}
                    disabled={value.rows.length <= 1}
                    aria-label={`Remove row ${ri + 1}`}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[6px] bg-[#dc3545] text-[20px] leading-none text-white disabled:opacity-30"
                  >
                    &minus;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => apply(grid.addRow)}
          className="rounded-[6px] bg-[#002850] px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-[#013a6f]"
        >
          + Add Row
        </button>
        <button
          type="button"
          onClick={() => apply((g) => grid.addColumn(g, ''))}
          className="rounded-[6px] border border-[#002850] px-4 py-[7px] text-[13px] font-semibold text-[#002850] transition-colors hover:bg-[#002850] hover:text-white"
        >
          + Add Column
        </button>

        <button
          type="button"
          onClick={() => setFormulaOpen(true)}
          className="rounded-[6px] border border-[#b8863b] bg-[#fbf3e4] px-4 py-[7px] text-[13px] font-semibold text-[#8c6526] transition-colors hover:bg-[#f6e6c8]"
        >
          fx Formulas{formulas.length ? ` (${formulas.length})` : ''}
        </button>

        <button
          type="button"
          onClick={() => setShowStored((v) => !v)}
          className="rounded-[6px] border border-[#ced4da] bg-white px-4 py-[7px] text-[13px] font-semibold text-[#41474d] transition-colors hover:bg-[#f3f5f7]"
        >
          {showStored ? 'Hide' : 'Show'} stored shape
        </button>

        <span className="text-[11px] text-[#9aa0a6]">
          {marked === 0
            ? 'Mark cells with “+ Add Calc” to use them in a formula'
            : `${marked} cell${marked > 1 ? 's' : ''} marked for calculation`}
        </span>
      </div>

      {trendRule && (
        <div className="mb-3 rounded-[6px] border border-[#cfe3d6] bg-[#f2faf5] p-3 text-[12px] text-[#1f7a4d]">
          <b>Assessor validation is on</b> — a trend rule selects the assessor&apos;s option from
          the year-on-year change across {trendRule.numerator?.cols?.length ?? 0} years
          ({trendRule.bands?.length ?? 0} bands
          {trendRule.allowOverride ? ', assessor may override' : ''}).
        </div>
      )}

      {formulas.length > 0 && (
        <div className="mb-3 rounded-[6px] border border-[#f0e2c4] bg-[#fdf9f0] p-3">
          <div className="mb-1 text-[12px] font-semibold text-[#8c6526]">
            Applied formulas ({formulas.length})
          </div>
          {formulas.map((f, i) => (
            <code key={i} className="mr-3 inline-block text-[12px] text-[#41474d]">
              {formulaToText(f, catalog)}
            </code>
          ))}
        </div>
      )}

      {errorFor(`${dotted}.formulas`) && (
        <div className="mb-2 text-[12px] text-[#ff0000]">{errorFor(`${dotted}.formulas`)}</div>
      )}
      {errorFor(`${dotted}.rows`) && (
        <div className="mb-2 text-[12px] text-[#ff0000]">{errorFor(`${dotted}.rows`)}</div>
      )}

      {showStored && (
        <pre className="mb-3 max-h-[220px] overflow-auto rounded-[6px] border border-[#e6e9ec] bg-[#fafbfc] p-3 text-[11px] text-[#41474d]">
          {JSON.stringify(grid.toStoredGrid(value, 0), null, 2)}
        </pre>
      )}

      {formulaOpen && (
        <GridFormulaDialog
          gridValue={grid.toStoredGrid(value, 0)['0']}
          formulas={formulas}
          trendRule={trendRule}
          answerKey={answerKey}
          subKey={subKey}
          catalog={catalog}
          assessorOptions={assessorOptions}
          // Labels in stored coordinates: index 0 is the header row / label
          // column, so the trend editor's row and column pickers read the same
          // way the formula tokens do.
          rowLabels={['Header', ...value.rows.map((r, i) => r.label || `Row ${i + 1}`)]}
          colLabels={[value.rowHeaderLabel || 'Label', ...value.columns.map((c, i) => c.label || `Col ${i + 1}`)]}
          onClose={() => setFormulaOpen(false)}
          onSave={({ formulas: nextFormulas, trendRule: nextTrend }) => {
            onSetFormulas(path, nextFormulas);
            onSetTrendRule?.(nextTrend);
            setFormulaOpen(false);
          }}
        />
      )}

      {/* ── Per-row marking ───────────────────────────────────────────── */}
      <CollapsibleSection
        title="Row marking"
        subtitle="Assessor options per row"
        count={value.rows.reduce((n, r) => n + (r.assessorOptions?.length || 0), 0)}
      >
        {value.rows.map((row, ri) => (
          <div key={row.key} className="mb-4 rounded-[6px] border border-[#e6e9ec] p-3">
            <div className="mb-2 text-[12px] font-semibold text-[#002850]">
              R{ri + 1} · {row.label || <span className="font-normal text-[#9aa0a6]">untitled row</span>}
            </div>
            <AssessorOptionEditor
              options={row.assessorOptions || []}
              optionType={row.assessorOptionType || ''}
              guidance={row.assessorGuidance || ''}
              path={[...path, 'rows', ri, 'assessorOptions']}
              typePath={[...path, 'rows', ri, 'assessorOptionType']}
              guidancePath={[...path, 'rows', ri, 'assessorGuidance']}
              errorFor={errorFor}
              onChange={onChange}
              onTouch={onTouch}
              onAddOption={onAddOption}
              onRemoveOption={onRemoveOption}
              onAddSubOption={onAddSubOption}
              onRemoveSubOption={onRemoveSubOption}
            />
          </div>
        ))}
      </CollapsibleSection>
    </div>
  );
}
