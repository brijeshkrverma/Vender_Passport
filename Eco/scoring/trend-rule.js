/**
 * TREND RULE — assessor validation ko static se dynamic banane wala engine.
 *
 * KYA PROBLEM SOLVE KARTA HAI
 *   `assessorStaticValidations()` me ek hi algorithm 10 baar copy-paste hai.
 *   Har copy me sirf DO cheezein alag hain: kaunsi grid row padhni hai, aur
 *   denominator kis question se aata hai. Baaki sab — intensity nikalna,
 *   % change nikalna, band se option chunna — bilkul same hai.
 *
 *   Isliye wo 10 blocks ek "rule" ban jaate hain jo Admin screen se banta hai:
 *
 *       intensity(saal)  = numerator(saal) / denominator(saal)
 *       pctChange        = (intensity(aakhri) - intensity(pehla))
 *                          / intensity(pehla) * 100
 *       band(pctChange)  -> kaunsa assessorOption select hoga
 *
 * PURANE CODE KI JO GALTIYAN YAHAN JAAN-BOOJHKAR NAHI HAIN
 *   1. Boundary gap — purana code `> 5` / `< 5` / `< -5` use karta tha, to
 *      bilkul 5 ya -5 pe koi bhi condition sachi nahi hoti thi aur company ko
 *      chup-chaap ZERO marks milte the. Yahan band ka lower edge inclusive aur
 *      upper edge exclusive hai, aur validateBands() gap/overlap dono pakadta
 *      hai — to aisa band table save hi nahi ho sakta.
 *   2. Truthy guard — purana code `if (intensityY1 || intensityY2)` likhta tha,
 *      yaani intensity 0 (sabse achha result) ko "data hi nahi hai" maan leta
 *      tha. Yahan har jagah null/'' ka explicit check hai.
 *   3. Saal ka chup-chaap badalna — purana code `cell(col12) || cell(col13)`
 *      karta tha, to ek saal khaali hone pe agle saal ka value utha leta tha
 *      aur kis-kis saal ki tulna ho rahi hai wo badal jaata tha. Yahan agar
 *      koi zaroori saal khaali hai to rule chalta hi nahi — warning deta hai.
 */

'use strict';

/** Grid row `r`, column `c` ka key — grid-formula.js jaisa hi. */
function cellKey(row, col) {
  return String(row) + String(col);
}

/** Ek cell ka numeric value; khaali / non-numeric ho to null. */
function readCell(grid, row, col) {
  if (!Array.isArray(grid)) return null;
  const r = grid[row];
  if (!r) return null;
  const cell = r[cellKey(row, col)];
  if (cell === undefined || cell === null) return null;
  const raw = typeof cell === 'object' ? cell.val : cell;
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

/**
 * Bands theek hain ya nahi.
 *
 * Lower edge INCLUSIVE, upper edge EXCLUSIVE. `null` ka matlab "koi seema nahi".
 * Poori number line cover honi chahiye — na gap, na overlap.
 */
function validateBands(bands) {
  const errors = [];
  if (!Array.isArray(bands) || !bands.length) {
    return ['Kam se kam ek band chahiye.'];
  }

  bands.forEach(function (b, i) {
    if (!b || typeof b !== 'object') { errors.push('Band ' + (i + 1) + ' theek nahi hai.'); return; }
    if (b.from !== null && b.from !== undefined && isNaN(Number(b.from)))
      errors.push('Band ' + (i + 1) + ' ka "from" number nahi hai.');
    if (b.to !== null && b.to !== undefined && isNaN(Number(b.to)))
      errors.push('Band ' + (i + 1) + ' ka "to" number nahi hai.');
    if (b.from !== null && b.from !== undefined && b.to !== null && b.to !== undefined
        && Number(b.from) >= Number(b.to))
      errors.push('Band ' + (i + 1) + ': "from" ko "to" se chhota hona chahiye.');
    if (!String(b.option || '').trim())
      errors.push('Band ' + (i + 1) + ' kaunsa assessor option select karega, ye nahi bataya.');
    if (b.marks === undefined || b.marks === null || isNaN(Number(b.marks)))
      errors.push('Band ' + (i + 1) + ' ke marks nahi diye.');
  });
  if (errors.length) return errors;

  const norm = bands.map(function (b) {
    return {
      from: (b.from === null || b.from === undefined) ? null : Number(b.from),
      to: (b.to === null || b.to === undefined) ? null : Number(b.to),
      option: b.option,
    };
  });
  const sorted = norm.slice().sort(function (a, b) {
    return (a.from === null ? -Infinity : a.from) - (b.from === null ? -Infinity : b.from);
  });

  if (sorted[0].from !== null)
    errors.push(sorted[0].from + ' se neeche wale results kisi band me nahi aate.');
  if (sorted[sorted.length - 1].to !== null)
    errors.push(sorted[sorted.length - 1].to + ' se upar wale results kisi band me nahi aate.');

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const cur = sorted[i];
    const nxt = sorted[i + 1];
    if (cur.to === null) {
      errors.push('"' + cur.option + '" ki upar koi seema nahi hai, phir bhi uske baad aur band hain.');
      continue;
    }
    if (nxt.from === null) continue;
    if (cur.to < nxt.from)
      errors.push('Gap: ' + cur.to + ' se ' + nxt.from + ' ke beech ka result kisi band me nahi aata — '
        + 'aisi company ko chup-chaap zero marks milenge.');
    if (cur.to > nxt.from)
      errors.push('Overlap: ' + nxt.from + ' se ' + cur.to + ' dono "' + cur.option
        + '" aur "' + nxt.option + '" me aata hai.');
  }
  return errors;
}

/** Kaunsa band is value pe lagta hai. Koi na mile to null. */
function pickBand(bands, value) {
  if (value === null || value === undefined || value === '') return null;
  const v = Number(value);
  if (isNaN(v)) return null;
  for (let i = 0; i < bands.length; i += 1) {
    const b = bands[i];
    const lo = (b.from === null || b.from === undefined) || v >= Number(b.from);
    const hi = (b.to === null || b.to === undefined) || v < Number(b.to);
    if (lo && hi) return b;
  }
  return null;
}

/**
 * Rule ka shape theek hai ya nahi — save karne se PEHLE.
 *
 * @param rule {{
 *   numerator:   { row:number, cols:number[] },
 *   denominator: { questionId:string, row:number, cols:number[] },
 *   bands: Array<{from,to,option,marks}>
 * }}
 */
function validateTrendRule(rule) {
  const errors = [];
  if (!rule || typeof rule !== 'object') return ['Rule khaali hai.'];

  const num = rule.numerator;
  const den = rule.denominator;

  if (!num || typeof num.row !== 'number' || num.row < 0)
    errors.push('Numerator ki row nahi chuni gayi.');

  // targetRow optional hai — na ho to option usi row pe lagta hai jo padhi gayi.
  // Par purane code me kai jagah ye alag hai (jaise energy: row 7 padhta hai,
  // option row 1 pe lagata hai), isliye ise alag se rakhna zaroori hai.
  if (rule.targetRow !== undefined && rule.targetRow !== null
      && (typeof rule.targetRow !== 'number' || rule.targetRow < 0))
    errors.push('Option kis row pe dikhana hai, wo theek nahi hai.');
  if (!num || !Array.isArray(num.cols) || num.cols.length < 2)
    errors.push('Numerator ke kam se kam do saal chahiye (pehla aur aakhri).');

  if (!den || !String(den.questionId || '').trim())
    errors.push('Denominator ka question nahi chuna gaya.');
  if (!den || typeof den.row !== 'number' || den.row < 0)
    errors.push('Denominator ki row nahi chuni gayi.');
  if (!den || !Array.isArray(den.cols) || den.cols.length < 2)
    errors.push('Denominator ke kam se kam do saal chahiye.');

  if (num && den && Array.isArray(num.cols) && Array.isArray(den.cols)
      && num.cols.length !== den.cols.length)
    errors.push('Numerator aur denominator ke saal ki ginti alag hai ('
      + num.cols.length + ' vs ' + den.cols.length + ') — dono barabar hone chahiye.');

  errors.push.apply(errors, validateBands(rule.bands || []));
  return errors;
}

/**
 * Rule chalao.
 *
 * @param rule       validateTrendRule() pass kiya hua rule
 * @param numGrid    is question ka grid (rows array)
 * @param denGrid    denominator question ka grid
 * @returns {{
 *   intensities: Array<{col:number, numerator:number|null, denominator:number|null, value:number|null}>,
 *   baseline:number|null, latest:number|null, pctChange:number|null,
 *   band:object|null, marks:number|null, option:string|null,
 *   warnings:string[], skipped:boolean
 * }}
 */
function evaluateTrendRule(rule, numGrid, denGrid) {
  const warnings = [];
  const out = {
    intensities: [], baseline: null, latest: null, pctChange: null,
    band: null, marks: null, option: null, warnings: warnings, skipped: true,
  };
  if (!rule || !rule.numerator || !rule.denominator) {
    warnings.push('Rule adhoora hai.');
    return out;
  }

  const nCols = rule.numerator.cols || [];
  const dCols = rule.denominator.cols || [];

  for (let i = 0; i < nCols.length; i += 1) {
    const n = readCell(numGrid, rule.numerator.row, nCols[i]);
    const d = readCell(denGrid, rule.denominator.row, dCols[i]);
    let v = null;
    if (n === null || d === null) {
      // KHAALI aur ZERO alag cheezein hain — 0 ek asli jawab hai.
      if (n === null) warnings.push('Saal ' + (i + 1) + ': numerator khaali hai.');
      if (d === null) warnings.push('Saal ' + (i + 1) + ': denominator khaali hai.');
    } else if (d === 0) {
      warnings.push('Saal ' + (i + 1) + ': denominator zero hai — intensity nikali nahi ja sakti.');
    } else {
      v = n / d;
    }
    out.intensities.push({ col: nCols[i], numerator: n, denominator: d, value: v });
  }

  if (!out.intensities.length) { warnings.push('Koi saal nahi chuna gaya.'); return out; }

  const first = out.intensities[0].value;
  const last = out.intensities[out.intensities.length - 1].value;

  // Purana code yahan `||` fallback laga kar chup-chaap doosra saal utha leta
  // tha. Hum aisa nahi karte — adhoore data pe rule chalta hi nahi.
  if (first === null || last === null) {
    warnings.push('Pehle aur aakhri saal, dono ka data chahiye — rule skip kiya gaya.');
    return out;
  }
  if (first === 0) {
    warnings.push('Pehle saal ki intensity zero hai — % change nikala nahi ja sakta.');
    return out;
  }

  out.baseline = first;
  out.latest = last;
  out.pctChange = ((last - first) / first) * 100;
  out.skipped = false;

  const band = pickBand(rule.bands || [], out.pctChange);
  if (!band) {
    warnings.push('Is result (' + out.pctChange.toFixed(2) + '%) pe koi band nahi lagta.');
    return out;
  }
  out.band = band;
  out.option = band.option;
  out.marks = Number(band.marks);
  return out;
}

module.exports = {
  cellKey,
  readCell,
  validateBands,
  pickBand,
  validateTrendRule,
  evaluateTrendRule,
};
