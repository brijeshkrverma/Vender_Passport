/**
 * MARK ENGINES — how a question's marks are worked out.
 *
 * ── WHY THIS IS A CLOSED REGISTRY AND NOT AN EXPRESSION LANGUAGE ──────────
 *
 * The system this replaces had 40 per-question scoring rules written as
 * branches in the scoring service, keyed on the question's id:
 *
 *     if (answer.questionId === '682d863f2a6c6172273cedb4') { ... }
 *
 * Reading all 40 showed that only five contained real logic. The other 35 were
 * plain data that someone hardcoded because there was nowhere to put it:
 *
 *     27  "the mark is always N"                  -> engine 'fixed'
 *      4  "this grid option is worth 40"          -> the option's own marks
 *      1  "this option scores 0"                  -> the option's own score
 *      2  "do not add the fallback score"         -> a flag
 *      1  "this option means not-applicable"      -> marksNotApplicable
 *
 * That is the whole argument for the shape of this file. The need was never a
 * language; it was somewhere to keep data. A closed set of engines covers the
 * real cases, and a new pattern means adding one entry here — which is a code
 * change that gets reviewed, rather than an expression that arrives from the
 * database and gets executed.
 *
 * ── EVERY ENGINE RETURNS A TRACE ──────────────────────────────────────────
 *
 * `{ marks, trace, warnings }`, never a bare number. On an audit platform a
 * disputed score has to be answerable: a vendor told "40" is entitled to see
 * which input produced it. The old engine returned only the number, which is
 * why nobody could explain a score after the fact.
 *
 * ── PURE ──────────────────────────────────────────────────────────────────
 *
 * No I/O, no dates, no randomness. The authoring screen runs it for a live
 * preview and the server runs it for the real score — one implementation, so
 * the preview cannot disagree with the result.
 */

import {
  resolveRef, resolveNumber, labelRef, validateRef,
  areaToRefs, validateArea, areaSize, collectRefs,
} from './valueRef.js';

/* ── helpers ───────────────────────────────────────────────────────────── */

export function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function hasValue(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

/**
 * Read a value a rule points at.
 *
 * Rules address their inputs with a `Ref` — the same type formulas and trend
 * rules use. The earlier version stored a dotted string
 * (`answers[0].subAnswers[1].numericTypeVal`) and parsed it, which meant a rule
 * kept pointing at a field after it was renamed and only a wrong score revealed
 * it. A Ref names its target by stable key and is validated at author time.
 */
function readRef(ref, ctx) {
  if (!ref) return null;
  return resolveNumber(ref, ctx.refCtx || {}, ctx.catalog);
}

/**
 * Read a grid cell out of a sub-answer.
 *
 * Grid rows are keyed by concatenated coordinates and a cell is `{ val, type }`
 * — the storage shape, which is why this needs its own reader rather than
 * going through `readPath`.
 */
const step = (engine, detail, marks) => ({ engine, detail, marks });

/* ── engines ───────────────────────────────────────────────────────────── */

export const ENGINES = {
  /**
   * The default: add up the scores of what was selected.
   *
   * Present as a named engine rather than as "no rule" so an author can state
   * the intent explicitly. `evaluateRule` still treats a missing rule as this,
   * so nothing has to be back-filled onto existing questions.
   */
  optionSum: {
    label: 'Add up selected options',
    hint: 'The default — each selected option contributes its own marks',
    fields: [],
    describe: () => 'Selected options are added up',
    validate: () => [],
    evaluate(config, ctx) {
      const selected = (ctx.selectedOptions || []);
      const marks = selected.reduce((sum, o) => sum + num(o.marks ?? o.score), 0);
      return {
        marks,
        trace: selected.map((o) => step('optionSum', `“${o.option || o.answerLabel || '?'}” selected`, num(o.marks ?? o.score))),
      };
    },
  },

  /**
   * A constant. Covers the 27 rules that were `obtendMark = <number>`.
   */
  fixed: {
    label: 'Fixed marks',
    hint: 'Always the same number, whatever was answered',
    fields: [{ name: 'marks', label: 'Marks', control: 'number', required: true }],
    describe: (c) => `Always ${num(c.marks)} marks`,
    validate(c) {
      const e = [];
      if (c.marks === undefined || c.marks === null || c.marks === '') e.push('Marks is required');
      else if (!Number.isFinite(Number(c.marks))) e.push('Marks must be a number');
      else if (Number(c.marks) < 0) e.push('Marks cannot be negative');
      return e;
    },
    evaluate(c) {
      return { marks: num(c.marks), trace: [step('fixed', `Fixed value`, num(c.marks))] };
    },
  },

  /**
   * The respondent's own number becomes the mark, optionally clamped.
   */
  passthrough: {
    label: 'The answer itself is the mark',
    hint: 'A numeric answer becomes the score directly',
    fields: [
      { name: 'input', label: 'Which value', control: 'ref', required: true },
      { name: 'min', label: 'Floor (optional)', control: 'number' },
      { name: 'max', label: 'Cap (optional)', control: 'number' },
    ],
    describe: (c, catalog) => `${c.input ? labelRef(c.input, catalog) : '(no value chosen)'} becomes the marks`,
    validate(c, catalog) {
      const e = [];
      if (!c.input) e.push('Choose which value supplies the marks');
      else e.push(...validateRef(c.input, catalog));
      if (c.min != null && c.min !== '' && !Number.isFinite(Number(c.min))) e.push('Floor must be a number');
      if (c.max != null && c.max !== '' && !Number.isFinite(Number(c.max))) e.push('Cap must be a number');
      if (c.min != null && c.max != null && c.min !== '' && c.max !== '' && Number(c.min) > Number(c.max)) {
        e.push('Floor cannot be above the cap');
      }
      return e;
    },
    evaluate(c, ctx) {
      const raw = readRef(c.input, ctx);
      let m = num(raw);
      const clamps = [];
      if (c.min != null && c.min !== '' && m < Number(c.min)) { m = Number(c.min); clamps.push(`raised to floor ${c.min}`); }
      if (c.max != null && c.max !== '' && m > Number(c.max)) { m = Number(c.max); clamps.push(`capped at ${c.max}`); }
      return {
        marks: m,
        trace: [step('passthrough',
          `${labelRef(c.input, ctx.catalog)} = ${raw === null ? '(empty)' : raw}`
          + `${clamps.length ? ` — ${clamps.join(', ')}` : ''}`, m)],
      };
    },
  },

  /**
   * A number falls into a band, and the band carries the marks.
   *
   * Each input is banded on its own and the results are then aggregated, which
   * is what the original three rules did (`mark + mark1 + mark2`).
   *
   * Bands are inclusive at both ends here — unlike the trend rule's bands,
   * which are half-open. They are different things: a trend band partitions a
   * continuous percentage change and must not leave a gap, while these bands
   * describe discrete counts ("1–15 days", "16–20 days") where an inclusive
   * upper edge is how a person reads them. `validate` rejects overlaps, so the
   * ambiguity that half-open ranges prevent is caught directly instead.
   */
  numericBand: {
    label: 'Number → band table',
    hint: 'e.g. 1–15 days scores 50, 16–20 scores 25',
    fields: [
      { name: 'inputs', label: 'Inputs', control: 'refList', required: true },
      { name: 'bands', label: 'Bands', control: 'bandTable', required: true },
      { name: 'aggregate', label: 'Combine with', control: 'select', options: ['sum', 'max', 'min', 'avg'] },
    ],
    describe: (c) =>
      `${(c.inputs || []).length} input, ${(c.bands || []).length} bands, ${c.aggregate || 'sum'}`,
    validate(c, catalog) {
      const e = [];
      if (!Array.isArray(c.inputs) || !c.inputs.length) e.push('Add at least one input');
      else c.inputs.forEach((ref, k) => {
        if (!ref) { e.push(`Input ${k + 1}: choose which value it reads`); return; }
        validateRef(ref, catalog).forEach((msg) => e.push(`Input ${k + 1}: ${msg}`));
      });

      if (!Array.isArray(c.bands) || !c.bands.length) e.push('Add at least one band');
      else {
        c.bands.forEach((b, k) => {
          if (!b || b.marks === undefined || !Number.isFinite(Number(b.marks))) {
            e.push(`Band ${k + 1}: marks must be a number`);
          }
          if (b?.min != null && b?.max != null && Number(b.min) > Number(b.max)) {
            e.push(`Band ${k + 1}: from is above to`);
          }
        });
        // Two bands covering one value makes the score depend on band order,
        // which is invisible to the author.
        for (let i = 0; i < c.bands.length; i += 1) {
          for (let j = i + 1; j < c.bands.length; j += 1) {
            const a = c.bands[i]; const b = c.bands[j];
            const aMin = a.min == null ? -Infinity : Number(a.min);
            const aMax = a.max == null ? Infinity : Number(a.max);
            const bMin = b.min == null ? -Infinity : Number(b.min);
            const bMax = b.max == null ? Infinity : Number(b.max);
            if (aMin <= bMax && bMin <= aMax) e.push(`Bands ${i + 1} and ${j + 1} overlap`);
          }
        }
      }
      if (c.aggregate && !['sum', 'max', 'min', 'avg'].includes(c.aggregate)) e.push('Unknown combine mode');
      return e;
    },
    evaluate(c, ctx) {
      const trace = [];
      const per = (c.inputs || []).map((ref) => {
        const v = num(readRef(ref, ctx));
        const name = labelRef(ref, ctx.catalog);
        const band = (c.bands || []).find((b) => {
          const lo = b.min == null ? -Infinity : Number(b.min);
          const hi = b.max == null ? Infinity : Number(b.max);
          return v >= lo && v <= hi;
        });
        const m = band ? num(band.marks) : 0;
        trace.push(step('numericBand',
          band
            ? `${name} = ${v} falls in ${band.min ?? '−∞'}–${band.max ?? '+∞'}`
            : `${name} = ${v} matches no band`,
          m));
        return m;
      });

      const agg = c.aggregate || 'sum';
      let marks = 0;
      if (per.length) {
        if (agg === 'sum') marks = per.reduce((a, b) => a + b, 0);
        else if (agg === 'max') marks = Math.max(...per);
        else if (agg === 'min') marks = Math.min(...per);
        else marks = per.reduce((a, b) => a + b, 0) / per.length;
      }
      if (per.length > 1) trace.push(step('numericBand', `Combined with ${agg}`, marks));
      return { marks, trace };
    },
  },

  /**
   * One grid cell decides, optionally gated on other cells being filled.
   */
  gridLookup: {
    label: 'Grid cell → marks',
    hint: 'One cell decides the score, e.g. “Software based” scores 100',
    fields: [
      { name: 'keyCell', label: 'Deciding cell', control: 'ref', required: true, refOptions: { allowConst: false, allowQuestions: false } },
      { name: 'rules', label: 'Values', control: 'lookupTable', required: true },
      { name: 'fallbackMarks', label: 'Marks if nothing matches', control: 'number' },
    ],
    describe: (c, catalog) => `${c.keyCell ? labelRef(c.keyCell, catalog) : '(no cell chosen)'}, ${(c.rules || []).length} values`,
    validate(c, catalog) {
      const e = [];
      if (!c.keyCell) e.push('Choose the deciding cell');
      else {
        e.push(...validateRef(c.keyCell, catalog));
        if (c.keyCell.kind !== 'cell') e.push('The deciding value must be a grid cell');
      }
      if (!Array.isArray(c.rules) || !c.rules.length) e.push('Add at least one value');
      else {
        const seen = new Set();
        c.rules.forEach((r, k) => {
          if (!hasValue(r?.keyEquals)) e.push(`Value ${k + 1}: text is required`);
          if (!Number.isFinite(Number(r?.marks))) e.push(`Value ${k + 1}: marks must be a number`);
          const key = String(r?.keyEquals).trim().toLowerCase();
          if (seen.has(key)) e.push(`Value ${k + 1}: “${r.keyEquals}” is listed twice`);
          seen.add(key);
        });
      }
      return e;
    },
    evaluate(c, ctx) {
      // The deciding cell is compared as text, so it is read raw rather than
      // through `resolveNumber` — "Software based" is not a number.
      const resolved = resolveRef(c.keyCell, ctx.refCtx || {}, ctx.catalog);
      const key = String(resolved.missing ? '' : resolved.value).trim();
      const hit = (c.rules || []).find(
        (r) => String(r.keyEquals).trim().toLowerCase() === key.toLowerCase());

      const fallback = num(c.fallbackMarks);
      if (!hit) {
        return {
          marks: fallback,
          trace: [step('gridLookup', `${resolved.label} reads “${key || '(empty)'}” — no value matches`, fallback)],
        };
      }

      const need = hit.requiresAnyValueIn;
      if (Array.isArray(need) && need.length) {
        const any = need.some((ref) => !resolveRef(ref, ctx.refCtx || {}, ctx.catalog).missing);
        if (!any) {
          return {
            marks: fallback,
            trace: [step('gridLookup',
              `${resolved.label} reads “${key}” but none of the required cells are filled`, fallback)],
          };
        }
      }
      return {
        marks: num(hit.marks),
        trace: [step('gridLookup', `${resolved.label} reads “${key}”`, num(hit.marks))],
      };
    },
  },

  /**
   * How much of the grid was filled in.
   *
   * This is the most common pattern in the corpus: "Information available" plus
   * a table the respondent fills (three years of revenue, energy, and so on).
   * The real question is whether the data was given at all, not what any one
   * cell says — which is why `gridLookup` does not fit: it needs a text key to
   * match, and it checks that *some* cell is filled where this needs *all*.
   */
  gridCompleteness: {
    label: 'How much of the grid is filled → marks',
    hint: 'For “did they supply the data?” questions',
    fields: [
      { name: 'area', label: 'Which cells', control: 'area', required: true },
      { name: 'mode', label: 'Mode', control: 'select', options: ['all', 'proportional', 'atLeast'] },
      { name: 'marks', label: 'Marks when complete', control: 'number', required: true },
      { name: 'minFilled', label: 'Minimum cells', control: 'number', showWhen: { mode: 'atLeast' } },
    ],
    describe: (c) => `${areaSize(c.area)} cells, ${c.mode || 'all'}`,
    validate(c, catalog) {
      const e = [...validateArea(c.area, catalog)];

      if (c.marks === undefined || c.marks === null || c.marks === '') e.push('Marks is required');
      else if (!Number.isFinite(Number(c.marks))) e.push('Marks must be a number');
      else if (Number(c.marks) < 0) e.push('Marks cannot be negative');

      const mode = c.mode || 'all';
      if (!['all', 'proportional', 'atLeast'].includes(mode)) e.push('Unknown mode');
      if (mode === 'atLeast') {
        const total = areaSize(c.area);
        if (!Number.isFinite(Number(c.minFilled)) || Number(c.minFilled) < 1) {
          e.push('Minimum cells must be at least 1');
        } else if (Number(c.minFilled) > total) {
          e.push(`Minimum is ${c.minFilled} but the selected area only has ${total} cells`);
        }
      }
      return e;
    },
    evaluate(c, ctx) {
      // The area expands into the same cell Refs the dependency graph sees, so
      // there is one notion of "which cells does this rule touch".
      const refs = areaToRefs(c.area);
      const missing = [];
      let filled = 0;

      refs.forEach((ref) => {
        const out = resolveRef(ref, ctx.refCtx || {}, ctx.catalog);
        if (out.missing) missing.push(`R${ref.row}C${ref.col}`);
        else filled += 1;
      });

      const total = refs.length;
      const full = num(c.marks);
      const mode = c.mode || 'all';

      let marks = 0;
      if (mode === 'all') marks = total > 0 && filled === total ? full : 0;
      else if (mode === 'proportional') marks = total > 0 ? Math.round((filled / total) * full * 100) / 100 : 0;
      else marks = filled >= num(c.minFilled) ? full : 0;

      const detail = `${filled} of ${total} cells filled (${mode})`
        + (missing.length ? ` — empty: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}` : '');

      return { marks, trace: [step('gridCompleteness', detail, marks)] };
    },
  },
};

export const ENGINE_IDS = Object.keys(ENGINES);

export function getEngine(id) {
  return ENGINES[id] || null;
}

/* ── public API ────────────────────────────────────────────────────────── */

/**
 * Validate a rule's config. Run before saving, on both sides — a rule that
 * saves in a broken state produces a silently wrong score, which is the worst
 * possible failure on a scoring system.
 */
export function validateRule(rule, catalog) {
  if (!rule || !rule.engine) return [];
  const engine = getEngine(rule.engine);
  if (!engine) return [`No engine named “${rule.engine}”. Available: ${ENGINE_IDS.join(', ')}`];
  return engine.validate(rule.config || {}, catalog);
}

/**
 * Every value this rule reads, as Refs.
 *
 * The dependency graph and the cycle check consume this. It works for any
 * engine without each one declaring its own extractor, because areas expand to
 * Refs and everything else already is one.
 */
export function ruleDependencies(rule) {
  if (!rule?.config) return [];
  const direct = collectRefs(rule.config);
  const fromAreas = rule.config.area ? areaToRefs(rule.config.area) : [];
  return [...direct, ...fromAreas];
}

/**
 * Run a rule.
 *
 * `null` means no rule applies and the caller should score normally — which is
 * different from a rule that ran and produced 0, and the two must never be
 * confused.
 *
 * @param ctx { answer, subAnswers, selectedOptions, maxMark }
 */
export function evaluateRule(rule, ctx = {}) {
  if (!rule || !rule.engine) return null;

  const engine = getEngine(rule.engine);
  if (!engine) {
    return { marks: 0, trace: [], warnings: [`Unknown engine “${rule.engine}” — scored as 0`] };
  }

  const errors = engine.validate(rule.config || {}, ctx.catalog);
  if (errors.length) {
    return { marks: 0, trace: [], warnings: [`Rule config is invalid: ${errors.join('; ')}`] };
  }

  const out = engine.evaluate(rule.config || {}, ctx);
  const warnings = [];
  let marks = num(out.marks);

  if (marks < 0) { warnings.push('Rule produced a negative score — clamped to 0'); marks = 0; }

  // A rule that can exceed the question's own maximum breaks the scorecard's
  // denominator, so it is capped and the author is told rather than the total
  // quietly going over 100%.
  const max = num(ctx.maxMark);
  if (max > 0 && marks > max) {
    warnings.push(`Rule produced ${marks}, above this question's ${max} — capped`);
    marks = max;
  }

  return { marks, trace: out.trace || [], warnings };
}

/** One-line summary for the authoring screen. */
export function describeRule(rule, catalog) {
  const engine = getEngine(rule?.engine);
  if (!engine) return '';
  return `${engine.label} — ${engine.describe(rule.config || {}, catalog)}`;
}
