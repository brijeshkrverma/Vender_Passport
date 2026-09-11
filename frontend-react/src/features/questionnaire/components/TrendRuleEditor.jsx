import { useMemo } from 'react';
import {
  validateTrendRule, validateBands, evaluateTrendRule, defaultBands, bandRangeText,
} from '../services/trendRule';
import { cellRef, refKey, labelRef } from '../services/valueRef';
import RefPicker from './RefPicker';

/**
 * ASSESSOR VALIDATION — trend rule.
 *
 * The other tab fills a value. This one awards no value at all: it reads the
 * figures and decides which assessor option gets selected, replacing a
 * judgement the assessor makes by hand today — and which, before this, was
 * written into the program ten times over as copy-pasted branches.
 *
 * ── BOTH SIDES ARE JUST LISTS OF VALUES ───────────────────────────────────
 *
 * The numerator used to be "a row of this grid plus some columns" and the
 * denominator "a question, an option, a sub-answer, a row and some columns" —
 * two shapes for one idea, and a hand-written rule that their year counts had
 * to match.
 *
 * Now each is a list of value references, one per year. The year-count rule is
 * `length === length`, the two sides are edited by the same control, and a
 * numerator no longer has to be a grid row: anything the picker offers works.
 */

const Step = ({ n, title, hint, children }) => (
  <div className="mb-4 flex gap-3 rounded-[8px] border border-[#e6e9ec] p-4">
    <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#002850] text-[12px] font-semibold text-white">
      {n}
    </div>
    <div className="min-w-0 flex-1">
      <h4 className="text-[14px] font-semibold text-[#002850]">{title}</h4>
      {hint && <p className="mb-2 mt-1 text-[12px] leading-[1.6] text-[#7c7d7e]">{hint}</p>}
      {children}
    </div>
  </div>
);

const fmt = (n) => {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return (Math.round(v * 100) / 100).toLocaleString('en-IN');
};

/** One side of the comparison: an ordered list of values, one per year. */
function YearList({ label, refs = [], onChange, catalog, gridSources }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-[#9aa0a6]">{label}</div>
      {refs.map((ref, i) => (
        <div key={refKey(ref) + i} className="mb-2 flex items-start gap-2">
          <span className="mt-[9px] w-[52px] flex-shrink-0 text-[11px] text-[#7c7d7e]">
            Year {i + 1}
          </span>
          <div className="flex-1">
            <RefPicker
              value={ref}
              onChange={(v) => onChange(refs.map((x, j) => (j === i ? v : x)))}
              catalog={catalog}
              // The denominator is normally in another question — intensity is
              // emissions per unit of revenue — so those cells have to be on
              // offer here or the rule cannot be built at all.
              gridSources={gridSources}
            />
          </div>
          <button type="button" onClick={() => onChange(refs.filter((_, j) => j !== i))}
            aria-label="Remove year"
            className="mt-[3px] rounded-[6px] bg-[#dc3545] px-3 py-[7px] text-[16px] leading-none text-white">
            &minus;
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...refs, null])}
        className="rounded-[6px] border border-[#002850] px-3 py-[5px] text-[12px] font-semibold text-[#002850] hover:bg-[#002850] hover:text-white">
        + Add year
      </button>
    </div>
  );
}

export default function TrendRuleEditor({
  trend, onChange, catalog, answerKey, subKey, gridValue = [], assessorOptions = [],
}) {
  /**
   * A live preview needs figures. The grid the author is looking at already has
   * whatever they typed into it, so it doubles as the sample data — no separate
   * "enter test values" step for the common case.
   */
  const refCtx = useMemo(() => {
    const subs = {};
    if (answerKey && subKey) subs[subKey] = { grid: gridValue };
    return { self: {}, questions: {}, answers: { [answerKey]: { selected: true, subs } } };
  }, [answerKey, subKey, gridValue]);

  const preview = useMemo(
    () => (trend ? evaluateTrendRule(trend, refCtx, catalog) : null),
    [trend, refCtx, catalog]
  );

  const ruleErrors = useMemo(() => {
    if (!trend) return [];
    const errs = validateTrendRule(trend, catalog);
    // A band pointing at an option this sub-answer does not have can never fire.
    if (assessorOptions.length) {
      (trend.bands || []).forEach((b, i) => {
        if (b.option && !assessorOptions.includes(b.option)) {
          errs.push(`Band ${i + 1}'s option "${b.option}" does not exist on this question.`);
        }
      });
    }
    return [...new Set(errs)];
  }, [trend, catalog, assessorOptions]);

  const bandErrors = trend ? validateBands(trend.bands || []) : [];
  const patch = (changes) => onChange({ ...trend, ...changes });

  /* ── not built yet ─────────────────────────────────────────────────── */

  if (!trend) {
    const ready = assessorOptions.length > 0;

    return (
      <div className="mx-auto max-w-[720px] py-4">
        <h4 className="text-[16px] font-semibold text-[#002850]">
          Let a rule choose the assessor&apos;s option
        </h4>
        <p className="mt-2 text-[13px] leading-[1.7] text-[#41474d]">
          Today an assessor reads three years of figures, works out the intensity per year, compares
          the first year with the last, and decides whether the trend went up, stayed flat or came
          down. That judgement is currently written into the program.
        </p>
        <p className="mt-1 text-[13px] text-[#41474d]">
          Build it here instead — and change it later without a developer.
        </p>

        <div className={`mt-4 flex gap-3 rounded-[6px] border p-3 ${ready ? 'border-[#c9e5d5] bg-[#f2faf5]' : 'border-[#f0d7d3] bg-[#fdf6f5]'}`}>
          <span className={`text-[15px] leading-none ${ready ? 'text-[#1f7a4d]' : 'text-[#b0362a]'}`}>
            {ready ? '✓' : '✕'}
          </span>
          <div className="min-w-0 flex-1">
            <b className="text-[13px] text-[#002850]">Assessor options to choose between</b>
            <div className="mt-1 text-[12px] leading-[1.6] text-[#41474d]">
              {ready ? (
                <>{assessorOptions.length} option{assessorOptions.length > 1 ? 's' : ''}: {assessorOptions.join(' · ')}</>
              ) : (
                <>
                  This sub-answer has none yet. Close this popup, open <b>Assessor marking</b> on the
                  sub-answer and add them — for example “Decreasing trend”, “Flat trend”,
                  “Increasing trend” with their marks. The rule picks one of them; without them there
                  is nothing to pick.
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            // Seed both sides with the same number of years from this grid, so
            // the author edits rather than starts from nothing. The engine
            // pairs them by position, so the counts must match from the outset.
            const years = [1, 2, 3];
            onChange({
              numerator: years.map((c) => cellRef(answerKey, subKey, 1, c)),
              denominator: years.map(() => null),
              targetRow: null,
              bands: defaultBands(assessorOptions),
              allowOverride: false,
            });
          }}
          className="mt-4 rounded-[6px] bg-[#002850] px-5 py-[10px] text-[13px] font-semibold text-white transition-colors hover:bg-[#013a6f] disabled:opacity-40"
        >
          + Build the trend rule
        </button>
      </div>
    );
  }

  /* ── built ─────────────────────────────────────────────────────────── */

  return (
    <div>
      <Step
        n={1}
        title="What is being measured?"
        hint="One value per year — usually the emissions or consumption figure for each year in the grid."
      >
        <YearList
          gridSources={gridSources}
          label="Numerator"
          refs={trend.numerator || []}
          onChange={(refs) => patch({ numerator: refs })}
          catalog={catalog}
        />
      </Step>

      <Step
        n={2}
        title="Divided by what?"
        hint="Intensity means “per unit of business” — emissions divided by revenue, for the same years. That figure usually lives in another question."
      >
        <YearList
          gridSources={gridSources}
          label="Denominator"
          refs={trend.denominator || []}
          onChange={(refs) => patch({ denominator: refs })}
          catalog={catalog}
        />
        {(trend.numerator || []).length !== (trend.denominator || []).length && (
          <p className="mt-2 text-[12px] text-[#b0362a]">
            Both sides must list the same number of years — they are paired in order.
          </p>
        )}
      </Step>

      <Step n={3} title="What the rule works out">
        <div className="mb-3 rounded-[6px] bg-[#f4f8fc] p-3 text-[12px] leading-[1.8] text-[#41474d]">
          <div><span className="font-semibold text-[#002850]">intensity (each year)</span> = numerator ÷ denominator</div>
          <div><span className="font-semibold text-[#002850]">change</span> = (last year − first year) ÷ first year × 100</div>
        </div>

        {preview && (
          <div className="rounded-[6px] border border-[#e6e9ec] p-3">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-[#9aa0a6]">
              With the figures entered right now
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[#7c7d7e]">
                    <th className="py-1 text-left font-medium" />
                    {preview.intensities.map((it, i) => (
                      <th key={i} className="py-1 text-right font-medium">Year {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['numerator', 'denominator', 'value'].map((row) => (
                    <tr key={row} className={`border-t border-[#eceff1] ${row === 'value' ? 'font-semibold text-[#002850]' : ''}`}>
                      <td className="py-1 pr-3">{row === 'value' ? 'intensity' : row}</td>
                      {preview.intensities.map((it, i) => (
                        <td key={i} className="py-1 text-right">{fmt(it[row])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!preview.skipped ? (
              <div className="mt-2 text-[13px] text-[#41474d]">
                change = <b>{fmt(preview.pctChange)}%</b>
                {preview.option ? (
                  <> → selects <b className="text-[#1f7a4d]">{preview.option}</b> → {preview.marks} marks</>
                ) : (
                  <span className="text-[#b4650b]"> → no band matches this yet</span>
                )}
              </div>
            ) : (
              <div className="mt-2 rounded-[6px] bg-[#f4f8fc] px-3 py-2 text-[12px] text-[#2e5f82]">
                The rule is skipped — it will not award marks until the data is there.
              </div>
            )}

            {preview.warnings.map((w) => (
              <div key={w} className="mt-1 text-[11px] text-[#b4650b]">{w}</div>
            ))}
          </div>
        )}
      </Step>

      <Step
        n={4}
        title="Which result selects which option"
        hint="Leave a box empty for “no limit”. The lower edge is included, the upper edge is not — so the bands meet exactly, with nothing falling between them."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[#7c7d7e]">
                <th className="py-1 text-left font-medium">From %</th>
                <th className="py-1 text-left font-medium">To %</th>
                <th className="py-1 text-left font-medium">Selects this assessor option</th>
                <th className="py-1 text-left font-medium">Marks</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(trend.bands || []).map((b, i) => {
                const setBand = (field, value) => patch({
                  bands: trend.bands.map((x, j) => (j === i
                    ? { ...x, [field]: field === 'option' ? value : (value === '' ? null : Number(value)) }
                    : x)),
                });
                return (
                  <tr key={i} className="border-t border-[#eceff1] align-top">
                    {['from', 'to'].map((f) => (
                      <td key={f} className="py-1 pr-2">
                        <input type="number" placeholder={f === 'from' ? '−∞' : '+∞'}
                          value={b[f] === null || b[f] === undefined ? '' : b[f]}
                          onChange={(e) => setBand(f, e.target.value)}
                          className="w-[80px] rounded-[5px] border border-[#ced4da] px-2 py-[5px]" />
                      </td>
                    ))}
                    <td className="py-1 pr-2">
                      <select value={b.option || ''} onChange={(e) => setBand('option', e.target.value)}
                        className="w-full min-w-[180px] rounded-[5px] border border-[#ced4da] px-2 py-[5px]">
                        <option value="">— choose —</option>
                        {assessorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <div className="mt-[2px] text-[11px] text-[#9aa0a6]">{bandRangeText(b)}</div>
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" value={b.marks ?? ''}
                        onChange={(e) => setBand('marks', e.target.value)}
                        className="w-[70px] rounded-[5px] border border-[#ced4da] px-2 py-[5px]" />
                    </td>
                    <td className="py-1">
                      <button type="button" onClick={() => patch({ bands: trend.bands.filter((_, j) => j !== i) })}
                        aria-label="Remove band"
                        className="rounded-[4px] bg-[#dc3545] px-2 py-[4px] text-[13px] leading-none text-white">&minus;</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button type="button"
          onClick={() => patch({ bands: [...(trend.bands || []), { from: 0, to: null, option: assessorOptions[0] || '', marks: 0 }] })}
          className="mt-2 rounded-[6px] border border-[#002850] px-4 py-[6px] text-[12px] font-semibold text-[#002850] transition-colors hover:bg-[#002850] hover:text-white">
          + Add band
        </button>

        {bandErrors.length > 0 ? (
          <div className="mt-2 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-[12px] text-[#842029]">
            {bandErrors.map((e) => <div key={e}>{e}</div>)}
          </div>
        ) : (trend.bands || []).length > 0 && (
          <div className="mt-2 text-[12px] text-[#1f7a4d]">
            ✓ Every possible result falls into exactly one band.
          </div>
        )}
      </Step>

      <Step n={5} title="Can the assessor disagree?">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#41474d]">
          <input type="checkbox" checked={!!trend.allowOverride}
            onChange={(e) => patch({ allowOverride: e.target.checked })}
            className="h-[14px] w-[14px] accent-[#002850]" />
          Allow the assessor to override the option this rule selects
        </label>
        <p className="mt-1 text-[12px] text-[#7c7d7e]">
          When it is allowed, an overridden choice is recorded separately from a normal one, so a
          reviewer can tell them apart.
        </p>
      </Step>

      {ruleErrors.length > 0 && (
        <div className="mb-3 rounded-[6px] border border-[#f5c2c7] bg-[#f8d7da] px-3 py-2 text-[12px] text-[#842029]">
          {ruleErrors.map((e) => <div key={e}>{e}</div>)}
        </div>
      )}

      <button type="button" onClick={() => onChange(null)}
        className="rounded-[6px] border border-[#dc3545] px-4 py-[7px] text-[12px] font-semibold text-[#dc3545] transition-colors hover:bg-[#dc3545] hover:text-white">
        Remove this rule — let the assessor decide by hand
      </button>
    </div>
  );
}

export { validateTrendRule };
