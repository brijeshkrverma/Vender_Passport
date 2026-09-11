/**
 * TREND RULE — turns an assessor's judgement call into a configurable rule.
 *
 * WHAT IT REPLACES
 *   The source system had one algorithm copy-pasted ten times. Every copy
 *   differed in exactly two places — which grid row to read, and which question
 *   supplies the denominator. Everything else was identical:
 *
 *       intensity(year) = numerator(year) / denominator(year)
 *       pctChange       = (intensity(last) - intensity(first)) / intensity(first) * 100
 *       band(pctChange) -> which assessorOption gets selected
 *
 *   So those ten blocks collapse into one rule the admin builds on screen.
 *
 * THREE BUGS FROM THE ORIGINAL, DELIBERATELY NOT REPRODUCED
 *
 *   1. Boundary gap. The old conditions were `> 5` / `< 5` / `< -5`, so a result
 *      of exactly 5 or -5 matched nothing and the company silently scored zero.
 *      Here a band's lower edge is inclusive and its upper edge exclusive, and
 *      `validateBands` rejects any table with a gap or an overlap — so a band
 *      set that can drop a result cannot be saved in the first place.
 *
 *   2. Truthy guard. The old code wrote `if (intensityY1 || intensityY2)`,
 *      which treats an intensity of 0 — the best possible result — as "no data".
 *      Every check here is an explicit null/'' test.
 *
 *   3. Silent year substitution. The old code wrote `cell(col12) || cell(col13)`,
 *      so an empty year quietly borrowed the next year's figure and the
 *      comparison silently changed which years it was about. Here a missing
 *      required year skips the rule and says so.
 *
 * NOT THE SAME LAYER AS A GRID FORMULA
 *   A formula fills a cell. A trend rule awards no cell value at all — it
 *   decides which assessor option is selected. That is why it lives beside the
 *   formulas rather than being one of them.
 */

/**
 * ── THE TWO SIDES ARE Ref LISTS ───────────────────────────────────────────
 *
 * `numerator` and `denominator` are each a list of value references, one per
 * year being compared.
 *
 * They used to be `{ row, cols[] }` on this side and
 * `{ questionId, optionIndex, subIndex, row, cols[] }` on the other — two
 * different shapes for the same idea, plus a hand-written rule that their year
 * counts had to match. As Ref lists that rule is just `length === length`, the
 * cross-question half stops being special, and a numerator no longer has to be
 * a grid row: any value the picker offers works.
 */

import { resolveNumber, validateRef, labelRef } from './valueRef.js';

const isNil = (v) => v === null || v === undefined;

/**
 * Are the bands sound?
 *
 * Lower edge inclusive, upper edge exclusive, `null` meaning unbounded. The
 * whole number line must be covered — no gap, no overlap.
 */
export function validateBands(bands) {
  const errors = [];
  if (!Array.isArray(bands) || !bands.length) return ['Add at least one band.'];

  bands.forEach((b, i) => {
    const n = i + 1;
    if (!b || typeof b !== 'object') { errors.push(`Band ${n} is malformed.`); return; }
    if (!isNil(b.from) && b.from !== '' && Number.isNaN(Number(b.from))) errors.push(`Band ${n}: "from" is not a number.`);
    if (!isNil(b.to) && b.to !== '' && Number.isNaN(Number(b.to))) errors.push(`Band ${n}: "to" is not a number.`);
    if (!isNil(b.from) && !isNil(b.to) && b.from !== '' && b.to !== '' && Number(b.from) >= Number(b.to)) {
      errors.push(`Band ${n}: "from" must be lower than "to".`);
    }
    if (!String(b.option || '').trim()) errors.push(`Band ${n}: no assessor option chosen.`);
    if (isNil(b.marks) || b.marks === '' || Number.isNaN(Number(b.marks))) errors.push(`Band ${n}: marks are missing.`);
  });
  if (errors.length) return errors;

  const norm = bands.map((b) => ({
    from: (isNil(b.from) || b.from === '') ? null : Number(b.from),
    to: (isNil(b.to) || b.to === '') ? null : Number(b.to),
    option: b.option,
  }));
  const sorted = norm.slice().sort(
    (a, b) => (a.from === null ? -Infinity : a.from) - (b.from === null ? -Infinity : b.from));

  if (sorted[0].from !== null) {
    errors.push(`Results below ${sorted[0].from}% fall into no band.`);
  }
  if (sorted[sorted.length - 1].to !== null) {
    errors.push(`Results above ${sorted[sorted.length - 1].to}% fall into no band.`);
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    if (cur.to === null) {
      errors.push(`"${cur.option}" has no upper limit, yet more bands follow it.`);
      continue;
    }
    if (next.from === null) continue;
    if (cur.to < next.from) {
      errors.push(
        `Gap: a result between ${cur.to}% and ${next.from}% falls into no band — `
        + 'such a company would silently score zero.');
    }
    if (cur.to > next.from) {
      errors.push(`Overlap: ${next.from}% to ${cur.to}% matches both "${cur.option}" and "${next.option}".`);
    }
  }
  return errors;
}

/** Which band applies. Lower edge inclusive, upper exclusive. */
export function pickBand(bands, value) {
  if (isNil(value) || value === '') return null;
  const v = Number(value);
  if (Number.isNaN(v)) return null;

  for (const b of bands || []) {
    const lo = isNil(b.from) || b.from === '' || v >= Number(b.from);
    const hi = isNil(b.to) || b.to === '' || v < Number(b.to);
    if (lo && hi) return b;
  }
  return null;
}

/**
 * Is the rule well-formed — checked before it can be saved.
 *
 * rule = {
 *   numerator:   Ref[],   one per year
 *   denominator: Ref[],   one per year, same length
 *   targetRow?, bands[], allowOverride
 * }
 */
export function validateTrendRule(rule, catalog) {
  const errors = [];
  if (!rule || typeof rule !== 'object') return ['The rule is empty.'];

  const num = rule.numerator || [];
  const den = rule.denominator || [];

  /*
   * `targetRow` is optional — without it the option appears on the row that was
   * measured. It exists because several of the original hardcoded rules read
   * one row and showed the result on another (energy reads row 7, shows on
   * row 1), and collapsing the two would have changed behaviour.
   */
  if (!isNil(rule.targetRow) && (typeof rule.targetRow !== 'number' || rule.targetRow < 0)) {
    errors.push('The row the option is shown on is not valid.');
  }

  if (num.length < 2) errors.push('The numerator needs at least two years (a first and a last).');
  if (den.length < 2) errors.push('The denominator needs at least two years.');

  // The engine pairs the two sides by position, so a mismatch would compare
  // 2022 against 2023 without saying so.
  if (num.length && den.length && num.length !== den.length) {
    errors.push(
      `Numerator and denominator compare a different number of years `
      + `(${num.length} vs ${den.length}) — they must match.`);
  }

  num.forEach((ref, i) => validateRef(ref, catalog)
    .forEach((m) => errors.push(`Numerator year ${i + 1}: ${m}`)));
  den.forEach((ref, i) => validateRef(ref, catalog)
    .forEach((m) => errors.push(`Denominator year ${i + 1}: ${m}`)));

  errors.push(...validateBands(rule.bands || []));
  return [...new Set(errors)];
}

/**
 * Run the rule.
 *
 * Returns the per-year working as well as the verdict, because an assessor
 * being told "option B, 10 marks" with no visible arithmetic cannot check it.
 */
export function evaluateTrendRule(rule, refCtx, catalog) {
  const warnings = [];
  const out = {
    intensities: [], baseline: null, latest: null, pctChange: null,
    band: null, marks: null, option: null, warnings, skipped: true,
  };

  if (!rule?.numerator?.length || !rule?.denominator?.length) {
    warnings.push('The rule is incomplete.');
    return out;
  }

  const num = rule.numerator;
  const den = rule.denominator;

  for (let i = 0; i < num.length; i += 1) {
    const n = resolveNumber(num[i], refCtx, catalog);
    const d = resolveNumber(den[i], refCtx, catalog);
    let value = null;

    if (n === null || d === null) {
      // Empty and zero are different things — 0 is a real answer.
      if (n === null) warnings.push(`Year ${i + 1}: the numerator is empty.`);
      if (d === null) warnings.push(`Year ${i + 1}: the denominator is empty.`);
    } else if (d === 0) {
      warnings.push(`Year ${i + 1}: the denominator is zero — intensity cannot be worked out.`);
    } else {
      value = n / d;
    }

    out.intensities.push({
      label: labelRef(num[i], catalog),
      numerator: n, denominator: d, value,
    });
  }

  if (!out.intensities.length) { warnings.push('No years selected.'); return out; }

  const first = out.intensities[0].value;
  const last = out.intensities[out.intensities.length - 1].value;

  // The original fell back to another year here. Incomplete data skips the rule
  // instead — a wrong comparison is worse than no comparison.
  if (first === null || last === null) {
    warnings.push('Both the first and the last year are needed — the rule was skipped.');
    return out;
  }
  if (first === 0) {
    warnings.push('The first year\'s intensity is zero — a percentage change cannot be worked out.');
    return out;
  }

  out.baseline = first;
  out.latest = last;
  out.pctChange = ((last - first) / first) * 100;
  out.skipped = false;

  const band = pickBand(rule.bands || [], out.pctChange);
  if (!band) {
    warnings.push(`No band covers this result (${out.pctChange.toFixed(2)}%).`);
    return out;
  }
  out.band = band;
  out.option = band.option;
  out.marks = Number(band.marks);
  return out;
}

/* ── Authoring helpers ─────────────────────────────────────────────────── */

/**
 * Which columns of a grid look like years.
 *
 * "Skip column 0" is not enough: the real revenue grid reads
 * "Information | Unit | FY 2021 | FY 2022 | FY 2023", so column 1 is a unit,
 * not a year. Read the header instead, and fall back to every column if the
 * headers say nothing useful.
 */
export function guessYearCols(headerValues) {
  const looksLikeYear = (s) =>
    /(^|\D)(19|20)\d{2}(\D|$)/.test(s) || /\bFY\b|\byear\b/i.test(s);

  const hits = (headerValues || [])
    .map((label, i) => ({ label: String(label || ''), i }))
    .filter(({ label, i }) => i > 0 && looksLikeYear(label))
    .map(({ i }) => i);

  if (hits.length >= 2) return hits;
  return (headerValues || []).map((_, i) => i).filter((i) => i > 0);
}

/** The three-band shape the original hardcoded, now editable. */
export function defaultBands(assessorOptions = []) {
  const pick = (i) => assessorOptions[Math.min(i, assessorOptions.length - 1)] || '';
  return [
    { from: null, to: -5, option: pick(0), marks: 20 },
    { from: -5, to: 5, option: pick(1), marks: 10 },
    { from: 5, to: null, option: pick(2), marks: 0 },
  ];
}

/** Plain-English description of a band's range, for the author. */
export function bandRangeText(b) {
  const hasFrom = !isNil(b.from) && b.from !== '';
  const hasTo = !isNil(b.to) && b.to !== '';
  if (!hasFrom) return hasTo ? `below ${b.to}%` : 'any change';
  if (!hasTo) return `${b.from}% or more`;
  return `${b.from}% up to ${b.to}%`;
}
