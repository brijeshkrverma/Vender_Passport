import { useState, useMemo } from 'react';
import {
  formulaToText, validateFormulas, evaluateFormulas, computedRefKeys, isRef,
} from '../services/gridFormula';
import { validateTrendRule } from '../services/trendRule';
import { cellRef, refKey, labelRef, resolveRef, isWritable } from '../services/valueRef';
import RefPicker from './RefPicker';
import TrendRuleEditor from './TrendRuleEditor';

/**
 * GRID FORMULA BUILDER — popup.
 *
 * HOW IT WORKS (and why this way round)
 *   The author picks the target cell FIRST, then builds the expression:
 *
 *     click R4C4   ->  "R4C4 = "
 *     click R1C1   ->  "R4C4 = R1C1"
 *     click +      ->  "R4C4 = R1C1 +"
 *     click R2C4   ->  "R4C4 = R1C1 + R2C4"
 *     Save
 *
 *   That is the spreadsheet order. The reverse — build the expression and press
 *   "=" at the end — hides which cell is being filled until the last click, so
 *   one wrong pick means starting over.
 *
 *   Only cells marked with "+ Add Calc" are clickable. Without that filter
 *   every cell in an 8×5 table is a target, and the label column and header row
 *   — which are never calculated — are the easiest things to hit by accident.
 *
 * ── CLICKING A CELL PRODUCES A Ref ────────────────────────────────────────
 *
 * The grid is still the fast way to build a formula over this table, but what
 * a click yields is now an ordinary value reference, identical to what the
 * picker beside it produces. So a formula can mix a cell from this grid, a
 * sibling numeric input, and another question's mark, without the three being
 * three different kinds of thing — and the cross-question target stops needing
 * a field of its own.
 */
export default function GridFormulaDialog({
  gridValue = [],
  formulas: initialFormulas = [],
  trendRule: initialTrendRule = null,
  answerKey,
  subKey,
  catalog,
  assessorOptions = [],
  onSave,
  onClose,
}) {
  /**
   * Two tabs, because the popup does two different jobs:
   *   'cell'  — the result lands in a value somewhere
   *   'trend' — the result is no mark at all; it decides which assessor option
   *             gets selected
   */
  const [mode, setMode] = useState('cell');
  const [trend, setTrend] = useState(
    () => (initialTrendRule ? JSON.parse(JSON.stringify(initialTrendRule)) : null));
  const [formulas, setFormulas] = useState(() => JSON.parse(JSON.stringify(initialFormulas)));

  const [target, setTarget] = useState(null);
  const [expr, setExpr] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [sample, setSample] = useState({});

  const rows = gridValue.map((_, i) => i);
  const cols = useMemo(() => {
    const n = gridValue.reduce((max, row, r) => Math.max(
      max,
      Object.keys(row || {}).filter((k) => k.indexOf(String(r)) === 0).length
    ), 0);
    return Array.from({ length: n }, (_, i) => i);
  }, [gridValue]);

  /* ── reading the grid ────────────────────────────────────────────── */

  const rawCell = (r, c) => gridValue[r]?.[`${r}${c}`];
  const refAt = (r, c) => cellRef(answerKey, subKey, r, c);

  const cellValue = (r, c) => {
    const cell = rawCell(r, c);
    if (cell === undefined || cell === null) return '';
    const v = typeof cell === 'object' ? cell.val : cell;
    return v === undefined || v === null ? '' : String(v);
  };

  /** Only cells explicitly marked in the grid may take part. */
  const isCalcCell = (r, c) => {
    const cell = rawCell(r, c);
    return !!(cell && typeof cell === 'object' && cell.isCalc === true);
  };

  const isLabelCell = (r, c) => r === 0 || c === 0;
  const calcCellCount = rows.reduce(
    (n, r) => n + cols.filter((c) => isCalcCell(r, c)).length, 0);

  const computed = computedRefKeys(formulas);
  const isComputed = (r, c) => computed.includes(refKey(refAt(r, c)));
  const isTarget = (r, c) => !!target && refKey(target) === refKey(refAt(r, c));
  const isUsed = (r, c) => expr.some((t) => isRef(t) && refKey(t) === refKey(refAt(r, c)));

  const building = target !== null;

  /** Does the expression want a value next, or an operator? */
  const expectsValue = (() => {
    if (!expr.length) return true;
    const last = expr[expr.length - 1];
    return !!last.op && last.op !== ')';
  })();

  const draft = { target, expr };
  const currentText = building ? formulaToText(draft, catalog).replace(/\s+$/, '') : '';

  const currentErrors = building && expr.length
    ? validateFormulas(formulas.concat([draft]), catalog)
    : [];
  const allErrors = validateFormulas(formulas, catalog);
  const trendErrors = trend ? validateTrendRule(trend, catalog) : [];

  /* ── building ────────────────────────────────────────────────────── */

  function pushValue(ref) {
    if (!building) {
      // First pick is the target — but only if something can be written there.
      if (!isWritable(ref)) return;
      setTarget(ref);
      setExpr([]);
      return;
    }
    if (refKey(ref) === refKey(target)) return;   // never itself
    if (!expectsValue) return;
    setExpr((e) => [...e, ref]);
  }

  function onCellClick(r, c) {
    if (!isCalcCell(r, c)) return;
    if (!building && isComputed(r, c)) return;    // already driven by a formula
    pushValue(refAt(r, c));
  }

  function addOp(op) {
    if (!building) return;
    if (op === '(' || op === ')') { setExpr((e) => [...e, { op }]); return; }
    if (expectsValue) return;
    setExpr((e) => [...e, { op }]);
  }

  function addNumber(n) {
    if (!building || !expectsValue) return;
    setExpr((e) => [...e, { kind: 'const', value: Number(n) }]);
  }

  function cancelBuilding() { setTarget(null); setExpr([]); }

  function saveFormula() {
    if (!building || !expr.length || currentErrors.length) return;
    setFormulas((f) => [...f, draft]);
    cancelBuilding();
  }

  const removeFormula = (i) => setFormulas((f) => f.filter((_, idx) => idx !== i));

  /* ── preview ─────────────────────────────────────────────────────── */

  /** Every value the saved formulas read, so the author can supply samples. */
  const sampleableRefs = useMemo(() => {
    const seen = new Set();
    return formulas
      .flatMap((f) => (f.expr || []).filter(isRef))
      .filter((r) => r.kind !== 'const')
      .filter((r) => (seen.has(refKey(r)) ? false : seen.add(refKey(r))));
  }, [formulas]);

  const livePreview = useMemo(() => {
    if (!showPreview) return null;

    // Rebuild a resolver context from the flat sample map.
    const refCtx = { self: {}, questions: {}, answers: {} };
    sampleableRefs.forEach((ref) => {
      const v = sample[refKey(ref)];
      if (ref.kind === 'cell') {
        const a = refCtx.answers[ref.answerKey] || (refCtx.answers[ref.answerKey] = { selected: true, subs: {} });
        const sub = a.subs[ref.subKey] || (a.subs[ref.subKey] = { grid: [] });
        sub.grid[ref.row] = sub.grid[ref.row] || {};
        sub.grid[ref.row][`${ref.row}${ref.col}`] = { val: v };
      } else if (ref.kind === 'input') {
        const a = refCtx.answers[ref.answerKey] || (refCtx.answers[ref.answerKey] = { selected: true, subs: {} });
        a.subs[ref.subKey] = { value: v };
      } else if (ref.kind === 'question') {
        refCtx.questions[ref.questionId] = { [ref.field || 'mark']: v };
      }
    });

    return evaluateFormulas(refCtx, formulas, catalog);
  }, [showPreview, sample, sampleableRefs, formulas, catalog]);

  const previewValue = (r, c) => {
    const out = livePreview?.results?.find((x) => refKey(x.target) === refKey(refAt(r, c)));
    if (out) return out.value ?? '';
    const raw = resolveRef(refAt(r, c), livePreview?.ctx || {}, catalog);
    return raw.missing ? '' : raw.value;
  };

  /* ── render ──────────────────────────────────────────────────────── */

  const cellClass = (r, c) => {
    if (isTarget(r, c)) return 'border-[#002850] bg-[#e3edf7] text-[#002850]';
    if (isUsed(r, c)) return 'border-[#1f7a4d] bg-[#e6f4ec] text-[#1f7a4d]';
    if (isComputed(r, c)) return 'border-[#b8863b] bg-[#fbf3e4] text-[#8c6526]';
    if (isCalcCell(r, c)) return 'border-[#ced4da] bg-white text-[#41474d] hover:border-[#002850]';
    return 'border-[#eceff1] bg-[#fafbfc] text-[#b0b5ba]';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-4 w-full max-w-[1180px] rounded-[10px] bg-white shadow-lg">

        <div className="flex items-start justify-between border-b border-[#e6e9ec] px-5 py-4">
          <div>
            <h3 className="text-[17px] font-semibold text-[#002850]">
              {mode === 'trend' ? 'Assessor validation — trend rule' : 'Grid formula'}
            </h3>
            <p className="mt-1 text-[12px] text-[#7c7d7e]">
              {mode === 'trend'
                ? 'A rule reads the figures and selects the assessor’s option by itself, instead of the assessor judging it by hand.'
                : 'A value is calculated automatically from other values. The applicant cannot edit it.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="rounded-[6px] px-2 py-1 text-[20px] leading-none text-[#7c7d7e] hover:bg-[#f1f3f5]">
            &times;
          </button>
        </div>

        <div className="flex gap-2 border-b border-[#e6e9ec] px-5 pt-3">
          {[
            { id: 'cell', title: 'Fill a value', sub: 'Calculate one value from others', badge: formulas.length || '' },
            { id: 'trend', title: 'Assessor validation', sub: 'Pick the assessor’s option from a trend', badge: trend ? 'on' : '' },
          ].map((t) => (
            <button key={t.id} type="button" onClick={() => setMode(t.id)}
              className={`flex items-center gap-2 rounded-t-[8px] border border-b-0 px-4 py-2 text-left transition-colors ${
                mode === t.id ? 'border-[#e6e9ec] bg-white text-[#002850]'
                  : 'border-transparent bg-[#f4f6f8] text-[#7c7d7e] hover:text-[#41474d]'}`}>
              <span className="block">
                <b className="block text-[13px]">{t.title}</b>
                <small className="block text-[11px] font-normal opacity-80">{t.sub}</small>
              </span>
              {t.badge !== '' && (
                <span className="rounded-[10px] bg-[#e3edf7] px-[7px] py-[1px] text-[11px] font-semibold text-[#002850]">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {mode === 'trend' ? (
          <div className="px-5 py-4">
            <TrendRuleEditor
              trend={trend}
              onChange={setTrend}
              catalog={catalog}
              answerKey={answerKey}
              subKey={subKey}
              gridValue={gridValue}
              assessorOptions={assessorOptions}
            />
          </div>
        ) : (
        <>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e6e9ec] bg-[#fafbfc] px-5 py-3 text-[12px]">
          <span className={`rounded-[20px] px-3 py-[3px] ${!building ? 'bg-[#002850] text-white' : 'bg-white text-[#7c7d7e]'}`}>
            1. Pick the value that should be calculated
          </span>
          <span className="text-[#c6cdd9]">&rarr;</span>
          <span className={`rounded-[20px] px-3 py-[3px] ${building ? 'bg-[#002850] text-white' : 'bg-white text-[#7c7d7e]'}`}>
            2. Build the formula from cells, inputs and operators
          </span>
          <span className="text-[#c6cdd9]">&rarr;</span>
          <span className="rounded-[20px] bg-white px-3 py-[3px] text-[#7c7d7e]">3. Save</span>
        </div>

        {calcCellCount === 0 && (
          <div className="m-5 rounded-[6px] border border-[#ffe0a6] bg-[#fff8e8] px-4 py-3 text-[13px] leading-[1.6] text-[#7a5b12]">
            <strong>Mark cells first.</strong> In the grid, open the type dropdown of any cell you
            want to use and choose <code className="rounded bg-white px-1">+ Add Calc</code>.
            Only marked cells are clickable here — the picker on the right still reaches everything else.
          </div>
        )}

        <div className="grid grid-cols-12 gap-5 p-5">
          <div className="col-span-12 lg:col-span-8">
            <div className="overflow-x-auto">
              <table className="border-collapse">
                <tbody>
                  {rows.map((r) => (
                    <tr key={r}>
                      {cols.map((c) => (
                        <td key={c} className="p-[3px]">
                          <button
                            type="button"
                            disabled={!isCalcCell(r, c)}
                            onClick={() => onCellClick(r, c)}
                            className={`flex h-[54px] w-[112px] flex-col justify-center rounded-[6px] border px-2 text-left transition-colors ${cellClass(r, c)} ${isLabelCell(r, c) ? 'italic' : ''} disabled:cursor-default`}
                          >
                            <span className="text-[10px] opacity-70">R{r}C{c}</span>
                            <span className="truncate text-[12px] font-medium">{cellValue(r, c) || '—'}</span>
                            {isComputed(r, c) && <span className="text-[10px] font-semibold">fx</span>}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#7c7d7e]">
              <span className="flex items-center gap-1"><i className="inline-block h-[10px] w-[10px] rounded-[2px] bg-[#e3edf7] ring-1 ring-[#002850]" /> target</span>
              <span className="flex items-center gap-1"><i className="inline-block h-[10px] w-[10px] rounded-[2px] bg-[#e6f4ec] ring-1 ring-[#1f7a4d]" /> used</span>
              <span className="flex items-center gap-1"><i className="inline-block h-[10px] w-[10px] rounded-[2px] bg-[#fbf3e4] ring-1 ring-[#b8863b]" /> has a formula</span>
              <span className="flex items-center gap-1"><i className="inline-block h-[10px] w-[10px] rounded-[2px] bg-[#fafbfc] ring-1 ring-[#eceff1]" /> not marked</span>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className={`rounded-[6px] border p-3 ${building ? 'border-[#002850] bg-[#f4f8fc]' : 'border-[#e6e9ec] bg-[#fafbfc]'}`}>
              {building ? (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-[#9aa0a6]">Building</div>
                  <div className="mt-1 break-words font-mono text-[13px] text-[#002850]">
                    {currentText}
                    {expectsValue && <span className="animate-pulse">_</span>}
                  </div>
                  <div className="mt-1 text-[11px] text-[#7c7d7e]">
                    {expectsValue ? 'Now pick a value or a number' : 'Now pick an operator'}
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-[#7c7d7e]">
                  Click a marked cell, or use the picker below — that value will be calculated.
                </div>
              )}
            </div>

            {/*
              The same picker every other mechanism uses. A formula can now
              target or read anything the author can name, not only a cell of
              this one grid — which is what made the cross-question case a
              separate field before.
            */}
            <div className="mt-3">
              <div className="mb-1 text-[12px] font-semibold text-[#002850]">
                {building ? 'Or add any other value' : 'Or calculate something else'}
              </div>
              <RefPicker
                value={null}
                onChange={(ref) => { if (ref) pushValue(ref); }}
                catalog={catalog}
                allowConst={building}
                placeholder={building ? 'Add a value to the formula' : 'Choose what to calculate'}
              />
            </div>

            <div className={`mt-3 space-y-2 ${building ? '' : 'opacity-40'}`}>
              <div className="grid grid-cols-4 gap-2">
                {['+', '-', '*', '/'].map((op) => (
                  <button key={op} type="button" disabled={!building || expectsValue} onClick={() => addOp(op)}
                    className="rounded-[6px] border border-[#002850] py-[7px] text-[14px] font-semibold text-[#002850] transition-colors hover:bg-[#002850] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#002850]">
                    {op}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button type="button" disabled={!building} onClick={() => addOp('(')}
                  className="rounded-[6px] border border-[#ced4da] py-[7px] text-[14px] text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-30">(</button>
                <button type="button" disabled={!building} onClick={() => addOp(')')}
                  className="rounded-[6px] border border-[#ced4da] py-[7px] text-[14px] text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-30">)</button>
                <button type="button" disabled={!building || !expectsValue} onClick={() => addNumber('100')}
                  className="rounded-[6px] border border-[#ced4da] py-[7px] text-[13px] text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-30">100</button>
                <button type="button" disabled={!building || !expectsValue} onClick={() => addNumber('1')}
                  className="rounded-[6px] border border-[#ced4da] py-[7px] text-[13px] text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-30">1</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!building || !expr.length} onClick={() => setExpr((e) => e.slice(0, -1))}
                  className="rounded-[6px] border border-[#ced4da] py-[7px] text-[13px] text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-30">&#8592; Back</button>
                <button type="button" disabled={!building} onClick={cancelBuilding}
                  className="rounded-[6px] border border-[#ced4da] py-[7px] text-[13px] text-[#41474d] hover:bg-[#f3f5f7] disabled:opacity-30">Discard</button>
              </div>
            </div>

            {currentErrors.length > 0 && (
              <div className="mt-3 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-[12px] text-[#842029]">
                {currentErrors.map((e) => <div key={e}>{e}</div>)}
              </div>
            )}

            <button type="button" disabled={!building || !expr.length || currentErrors.length > 0}
              onClick={saveFormula}
              className="mt-3 w-full rounded-[6px] bg-[#002850] py-[9px] text-[13px] font-semibold text-white transition-colors hover:bg-[#013a6f] disabled:opacity-40">
              Save formula
            </button>

            {formulas.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-[12px] font-semibold text-[#002850]">
                  Applied formulas ({formulas.length})
                </div>
                {formulas.map((f, i) => (
                  <div key={refKey(f.target) + i} className="mb-1 flex items-center gap-2 rounded-[6px] border border-[#e6e9ec] px-3 py-[6px]">
                    <code className="flex-1 break-words text-[12px] text-[#41474d]">{formulaToText(f, catalog)}</code>
                    <button type="button" onClick={() => removeFormula(i)} aria-label="Remove formula"
                      className="rounded-[4px] bg-[#dc3545] px-2 text-[14px] leading-[22px] text-white">&minus;</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {formulas.length > 0 && (
          <div className="border-t border-[#e6e9ec] px-5 py-4">
            <button type="button" onClick={() => setShowPreview((v) => !v)}
              className="text-[13px] font-semibold text-[#002850]">
              {showPreview ? '▾' : '▸'} Test it — enter sample values
            </button>

            {showPreview && (
              <div className="mt-3">
                <div className="mb-3 flex flex-wrap gap-3">
                  {sampleableRefs.map((ref) => (
                    <div key={refKey(ref)}>
                      <label className="mb-1 block text-[11px] text-[#7c7d7e]">{labelRef(ref, catalog)}</label>
                      <input type="number" placeholder="0"
                        value={sample[refKey(ref)] ?? ''}
                        onChange={(e) => setSample((s) => ({ ...s, [refKey(ref)]: e.target.value }))}
                        className="w-[170px] rounded-[6px] border border-[#ced4da] px-2 py-[6px] text-[13px]" />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  {(livePreview?.results || []).map((r) => (
                    <div key={refKey(r.target)} className="text-[13px] text-[#41474d]">
                      {labelRef(r.target, catalog)} = <b className="text-[#8c6526]">{r.value ?? '—'}</b>
                    </div>
                  ))}
                </div>

                {livePreview?.warnings?.length > 0 && (
                  <div className="mt-2 text-[11px] text-[#b4650b]">{livePreview.warnings.join(' · ')}</div>
                )}
              </div>
            )}
          </div>
        )}
        </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[#e6e9ec] px-5 py-4">
          <span className="text-[12px] text-[#b0362a]">{allErrors[0] || trendErrors[0] || ''}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-[6px] border border-[#ced4da] bg-white px-5 py-[9px] text-[13px] font-semibold text-[#41474d] hover:bg-[#f3f5f7]">
              Cancel
            </button>
            {/* Both tabs must be sound before either is committed — the popup
                saves as a whole. */}
            <button type="button"
              disabled={allErrors.length > 0 || trendErrors.length > 0}
              onClick={() => onSave({ formulas, trendRule: trend })}
              className="rounded-[6px] bg-[#002850] px-6 py-[9px] text-[13px] font-semibold text-white hover:bg-[#013a6f] disabled:opacity-40">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
