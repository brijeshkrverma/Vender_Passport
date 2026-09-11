/**
 * SCORING RULE ENGINES — admin-configurable scoring logic.
 *
 * MAQSAD
 *   Aaj jo scoring rules code me `if (questionId == '682d...')` ke roop me likhe
 *   hain, unhe question document pe DATA ki tarah rakhna, taaki admin bina
 *   developer ke koi bhi rule kisi bhi question pe laga sake.
 *
 * YE MODULE PURE HAI
 *   Koi DB, koi HTTP, koi Date.now(), koi mutation. Sirf input se output.
 *   Isliye frontend (live preview) aur backend (asli scoring) dono isse import
 *   kar sakte hain — do copies banane ki zaroorat nahi.
 *
 * DESIGN KYUN AISA HAI — maujooda 40 rules ka catalogue
 *   Code me 40 unique questions pe rules mile. Unhe padhne par pata chala ki
 *   sirf 5 me asli LOGIC hai; baaki 35 me sirf DATA hai jo kisi ne code me
 *   hardcode kar diya, jabki wo option config me set ho sakta tha:
 *
 *     - 27 rules  : `obtendMark = <number>`         -> engine 'fixed'
 *     -  4 rules  : grid option ke marks 40 kar do  -> option ka `marks` field
 *     -  1 rule   : option ka score 0 kar do        -> option ka `score` field
 *     -  2 rules  : fallback score mat jodo         -> flag
 *     -  1 rule   : option select ho to 0           -> option pe `marksnotapplicable`
 *
 *   Asli logic sirf yahan tha:
 *     -  3 rules  : numeric input -> band table     -> engine 'numericBand'
 *     -  1 rule   : grid cell dekhkar marks         -> engine 'gridLookup'
 *     -  1 rule   : user ka numeric input hi score  -> engine 'passthrough'
 *
 *   Isliye engines ki list CHHOTI aur BAND hai. `eval` ya arbitrary expression
 *   jaan-boojhkar nahi rakha — wo ek data problem ko sandboxing problem bana
 *   deta hai, aur in 40 me se ek bhi rule ko uski zaroorat nahi thi.
 *   Naya pattern aaye to yahan ek naya engine jodna hai — wo ek reviewable
 *   code change hai, aur yahi iska maqsad hai.
 *
 * EK ENGINE JODNE KA TAREEKA
 *   1. ENGINES me ek entry: { validate(config), evaluate(config, ctx) }
 *   2. Admin UI me uska config form
 *   3. Test: purane behaviour se match karta hai ya nahi
 */

/** Safe number — null/undefined/''/NaN sab 0. */
function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Kya value "bhari hui" hai (grid cell / text input ke liye). */
function hasValue(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

/**
 * Dotted path se value nikalta hai, array index ke saath.
 * e.g. 'answer[0].subanswar[1].numericTypeVal'
 * Rule config me admin yahi likhta hai (UI use dropdown se banata hai).
 */
function readPath(root, path) {
  if (!path || typeof path !== 'string') return undefined;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = root;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Grid cell padhta hai. Grid ka data shape irregular hai — rows string keys se
 * index hote hain ("00", "10", "23") aur cell `{ val, type }` object hota hai.
 * Yahi wajah hai ki iske liye alag engine chahiye; generic path kaam nahi karta.
 */
function readGridCell(sub, row, col) {
  const rows = sub && (sub.grid && Array.isArray(sub.grid.gridValue) ? sub.grid.gridValue : null);
  if (!rows) return undefined;
  const r = rows[row];
  if (!r) return undefined;
  const cell = r[String(row) + String(col)] !== undefined
    ? r[String(row) + String(col)]
    : r[String(col)];
  if (cell === undefined || cell === null) return undefined;
  return typeof cell === 'object' ? cell.val : cell;
}

// ---------------------------------------------------------------------------
// ENGINES
// ---------------------------------------------------------------------------

const ENGINES = {
  /**
   * Fixed mark. Question ka score hamesha ek hi value.
   * Covers: StaticMark.js ke 27 per-question overrides.
   * config: { marks: number }
   */
  fixed: {
    label: 'Fixed marks',
    describe: (c) => `Hamesha ${num(c.marks)} marks`,
    validate(c) {
      const e = [];
      if (c.marks === undefined || c.marks === null || c.marks === '') e.push('marks zaroori hai');
      else if (!Number.isFinite(Number(c.marks))) e.push('marks number hona chahiye');
      else if (Number(c.marks) < 0) e.push('marks negative nahi ho sakta');
      return e;
    },
    evaluate(c) {
      return { marks: num(c.marks), applied: [{ rule: 'fixed', input: null, marks: num(c.marks) }] };
    },
  },

  /**
   * Numeric input -> band table.
   * Covers: 682d8129 (1 input), 682d863f (2 inputs), 682d876c (3 inputs).
   * config: {
   *   inputs: [{ path }],
   *   bands:  [{ min, max, marks }],   // min/max null = unbounded, dono inclusive
   *   aggregate: 'sum' | 'max' | 'min' | 'avg'
   * }
   * Har input alag se band table se guzarta hai, phir aggregate hota hai —
   * yahi maujooda rules ka behaviour hai (mark + mark1 + mark2).
   */
  numericBand: {
    label: 'Numeric input → band table',
    describe: (c) =>
      `${(c.inputs || []).length} numeric input, ${(c.bands || []).length} band, ${c.aggregate || 'sum'}`,
    validate(c) {
      const e = [];
      if (!Array.isArray(c.inputs) || c.inputs.length === 0) e.push('kam se kam ek input chahiye');
      else c.inputs.forEach((i, k) => { if (!i || !i.path) e.push(`input ${k + 1}: path zaroori hai`); });
      if (!Array.isArray(c.bands) || c.bands.length === 0) e.push('kam se kam ek band chahiye');
      else {
        c.bands.forEach((b, k) => {
          if (!b || b.marks === undefined || !Number.isFinite(Number(b.marks))) e.push(`band ${k + 1}: marks number hona chahiye`);
          if (b && b.min !== null && b.min !== undefined && b.max !== null && b.max !== undefined && Number(b.min) > Number(b.max)) {
            e.push(`band ${k + 1}: min, max se bada hai`);
          }
        });
        // overlap check — do band ek hi value ko cover karein to score ambiguous hai
        for (let i = 0; i < c.bands.length; i += 1) {
          for (let j = i + 1; j < c.bands.length; j += 1) {
            const a = c.bands[i], b = c.bands[j];
            const aMin = a.min === null || a.min === undefined ? -Infinity : Number(a.min);
            const aMax = a.max === null || a.max === undefined ? Infinity : Number(a.max);
            const bMin = b.min === null || b.min === undefined ? -Infinity : Number(b.min);
            const bMax = b.max === null || b.max === undefined ? Infinity : Number(b.max);
            if (aMin <= bMax && bMin <= aMax) e.push(`band ${i + 1} aur ${j + 1} overlap karte hain`);
          }
        }
      }
      if (c.aggregate && ['sum', 'max', 'min', 'avg'].indexOf(c.aggregate) < 0) e.push('aggregate galat hai');
      return e;
    },
    evaluate(c, ctx) {
      const applied = [];
      const perInput = (c.inputs || []).map((inp) => {
        const raw = readPath(ctx.answer, inp.path);
        const v = num(raw);
        const band = (c.bands || []).find((b) => {
          const lo = b.min === null || b.min === undefined ? -Infinity : Number(b.min);
          const hi = b.max === null || b.max === undefined ? Infinity : Number(b.max);
          return v >= lo && v <= hi;
        });
        const m = band ? num(band.marks) : 0;
        applied.push({ rule: 'numericBand', input: { path: inp.path, value: raw, parsed: v }, marks: m });
        return m;
      });
      let marks = 0;
      const agg = c.aggregate || 'sum';
      if (perInput.length) {
        if (agg === 'sum') marks = perInput.reduce((a, b) => a + b, 0);
        else if (agg === 'max') marks = Math.max.apply(null, perInput);
        else if (agg === 'min') marks = Math.min.apply(null, perInput);
        else if (agg === 'avg') marks = perInput.reduce((a, b) => a + b, 0) / perInput.length;
      }
      return { marks, applied };
    },
  },

  /**
   * Grid cell ki value dekhkar marks.
   * Covers: 682c2cfd — row1/col10 == 'Inventory sheets' -> 80, 'Software based' -> 100,
   *         bashart ki col11/12/13 me se koi bhara ho.
   * config: {
   *   subIndex, keyCell: {row,col},
   *   rules: [{ keyEquals, requiresAnyValueIn: [{row,col}], marks }],
   *   fallbackMarks
   * }
   */
  gridLookup: {
    label: 'Grid cell → marks',
    describe: (c) => `Grid cell (${(c.keyCell || {}).row},${(c.keyCell || {}).col}) pe ${(c.rules || []).length} rule`,
    validate(c) {
      const e = [];
      if (!c.keyCell || c.keyCell.row === undefined || c.keyCell.col === undefined) e.push('keyCell me row aur col zaroori hain');
      if (!Array.isArray(c.rules) || c.rules.length === 0) e.push('kam se kam ek rule chahiye');
      else c.rules.forEach((r, k) => {
        if (!r || !hasValue(r.keyEquals)) e.push(`rule ${k + 1}: keyEquals zaroori hai`);
        if (!r || !Number.isFinite(Number(r.marks))) e.push(`rule ${k + 1}: marks number hona chahiye`);
      });
      const seen = {};
      (c.rules || []).forEach((r, k) => {
        const key = String(r && r.keyEquals).trim().toLowerCase();
        if (seen[key]) e.push(`rule ${k + 1}: "${r.keyEquals}" do baar hai`);
        seen[key] = true;
      });
      return e;
    },
    evaluate(c, ctx) {
      const sub = (ctx.subanswar || [])[num(c.subIndex)];
      const keyRaw = readGridCell(sub, num(c.keyCell && c.keyCell.row), num(c.keyCell && c.keyCell.col));
      const key = String(keyRaw === undefined ? '' : keyRaw).trim();
      const hit = (c.rules || []).find((r) => String(r.keyEquals).trim().toLowerCase() === key.toLowerCase());
      if (!hit) {
        return { marks: num(c.fallbackMarks), applied: [{ rule: 'gridLookup', input: { key }, marks: num(c.fallbackMarks) }] };
      }
      const need = hit.requiresAnyValueIn;
      if (Array.isArray(need) && need.length) {
        const any = need.some((cell) => hasValue(readGridCell(sub, num(cell.row), num(cell.col))));
        if (!any) {
          return { marks: num(c.fallbackMarks), applied: [{ rule: 'gridLookup', input: { key, reason: 'required cells khali hain' }, marks: num(c.fallbackMarks) }] };
        }
      }
      return { marks: num(hit.marks), applied: [{ rule: 'gridLookup', input: { key }, marks: num(hit.marks) }] };
    },
  },

  /**
   * Grid kitna bhara hua hai, uske hisaab se marks.
   *
   * KYUN CHAHIYE
   *   Is questionnaire ka sabse aam pattern hai: "Information available" +
   *   ek grid jisme applicant ko data bharna hota hai (3 saal ka revenue,
   *   energy consumption, waqera). Un questions ka asli sawaal ye hai ki
   *   "data diya ya nahi", kisi cell me kya likha hai wo nahi.
   *
   *   `gridLookup` us kaam ka nahi hai — usko ek text key chahiye jise match
   *   kare, aur wo "koi ek cell bhara ho" dekhta hai. Yahan "saare bhare hon"
   *   chahiye. Isliye ye alag engine hai.
   *
   * config: {
   *   subIndex,                 // kaunsa sub-answer (grid)
   *   rows: [1,2,3],            // kaunsi rows dekhni hain
   *   cols: [1,2,3],            // kaunse columns (jaise 3 financial years)
   *   mode: 'all' | 'proportional' | 'atLeast',
   *   marks,                    // poore bhare hone pe kitne marks
   *   minFilled                 // 'atLeast' mode ke liye
   * }
   *
   *   all          -> saare cells bhare to poore marks, warna 0
   *   proportional -> jitna bhara utne marks (aadha bhara = aadhe marks)
   *   atLeast      -> kam se kam N cells bhare to poore marks
   */
  gridCompleteness: {
    label: 'Grid kitna bhara hai → marks',
    describe: (c) => `${(c.rows || []).length} row × ${(c.cols || []).length} column, mode: ${c.mode || 'all'}`,
    validate(c) {
      const e = [];
      if (!Array.isArray(c.rows) || c.rows.length === 0) e.push('kam se kam ek row chuno');
      if (!Array.isArray(c.cols) || c.cols.length === 0) e.push('kam se kam ek column chuno');
      if (c.marks === undefined || c.marks === null || c.marks === '') e.push('marks zaroori hai');
      else if (!Number.isFinite(Number(c.marks))) e.push('marks number hona chahiye');
      else if (Number(c.marks) < 0) e.push('marks negative nahi ho sakta');
      const mode = c.mode || 'all';
      if (['all', 'proportional', 'atLeast'].indexOf(mode) < 0) e.push('mode galat hai');
      if (mode === 'atLeast') {
        const total = (c.rows || []).length * (c.cols || []).length;
        if (!Number.isFinite(Number(c.minFilled)) || Number(c.minFilled) < 1) e.push('minFilled kam se kam 1 hona chahiye');
        else if (Number(c.minFilled) > total) e.push(`minFilled ${c.minFilled} hai par grid me sirf ${total} cell hain`);
      }
      return e;
    },
    evaluate(c, ctx) {
      const sub = (ctx.subanswar || [])[num(c.subIndex)];
      const rows = c.rows || [];
      const cols = c.cols || [];
      let filled = 0;
      const total = rows.length * cols.length;
      const missing = [];
      rows.forEach((r) => {
        cols.forEach((cl) => {
          if (hasValue(readGridCell(sub, num(r), num(cl)))) filled += 1;
          else missing.push(`r${r}c${cl}`);
        });
      });

      const full = num(c.marks);
      const mode = c.mode || 'all';
      let marks = 0;
      if (mode === 'all') marks = filled === total && total > 0 ? full : 0;
      else if (mode === 'proportional') marks = total > 0 ? Math.round((filled / total) * full * 100) / 100 : 0;
      else if (mode === 'atLeast') marks = filled >= num(c.minFilled) ? full : 0;

      return {
        marks,
        applied: [{
          rule: 'gridCompleteness',
          input: { filled, total, mode, missing: missing.slice(0, 8) },
          marks,
        }],
      };
    },
  },

  /**
   * User ka numeric input hi score ban jaata hai.
   * Covers: 682c46b1.
   * config: { path, min, max }
   */
  passthrough: {
    label: 'User ka numeric input hi score',
    describe: (c) => `${c.path || '(path nahi)'} ki value hi marks`,
    validate(c) {
      const e = [];
      if (!c.path) e.push('path zaroori hai');
      if (c.min !== undefined && c.min !== null && !Number.isFinite(Number(c.min))) e.push('min number hona chahiye');
      if (c.max !== undefined && c.max !== null && !Number.isFinite(Number(c.max))) e.push('max number hona chahiye');
      return e;
    },
    evaluate(c, ctx) {
      const raw = readPath(ctx.answer, c.path);
      let m = num(raw);
      if (c.min !== undefined && c.min !== null) m = Math.max(m, Number(c.min));
      if (c.max !== undefined && c.max !== null) m = Math.min(m, Number(c.max));
      return { marks: m, applied: [{ rule: 'passthrough', input: { path: c.path, value: raw }, marks: m }] };
    },
  },
};

/**
 * Rule ka config validate karta hai. Save se PEHLE chalana hai — client aur
 * server dono taraf. Galat rule save ho gaya to score chup-chaap galat aayega.
 * @returns {string[]} khali array = sab theek
 */
function validateRule(rule) {
  if (!rule || rule.engine === undefined || rule.engine === null || rule.engine === '') return [];
  if (rule.engine === 'default') return [];
  const eng = ENGINES[rule.engine];
  if (!eng) return [`"${rule.engine}" naam ka koi engine nahi hai. Available: ${Object.keys(ENGINES).join(', ')}`];
  return eng.validate(rule.config || {});
}

/**
 * Rule chalata hai.
 * @param {object} rule  { engine, config }
 * @param {object} ctx   { answer, subanswar, maxMark }
 * @returns {{marks:number, applied:Array, warnings:string[]}|null}
 *          null = koi rule nahi laga, normal scoring chalao
 */
function evaluateRule(rule, ctx) {
  if (!rule || !rule.engine || rule.engine === 'default') return null;
  const eng = ENGINES[rule.engine];
  if (!eng) return { marks: 0, applied: [], warnings: [`Unknown engine "${rule.engine}" — 0 maana gaya`] };

  const errs = eng.validate(rule.config || {});
  if (errs.length) return { marks: 0, applied: [], warnings: [`Rule config galat hai: ${errs.join('; ')}`] };

  const out = eng.evaluate(rule.config || {}, ctx || {});
  const warnings = [];
  let marks = num(out.marks);
  if (ctx && Number.isFinite(Number(ctx.maxMark)) && Number(ctx.maxMark) > 0 && marks > Number(ctx.maxMark)) {
    warnings.push(`Rule ne ${marks} diya jo maxMark ${ctx.maxMark} se zyada hai — cap lagaya gaya`);
    marks = Number(ctx.maxMark);
  }
  if (marks < 0) { warnings.push('Rule ne negative marks diya — 0 kar diya'); marks = 0; }
  return { marks, applied: out.applied || [], warnings };
}

/** Admin UI ke dropdown ke liye. */
function listEngines() {
  return Object.keys(ENGINES).map((k) => ({ engine: k, label: ENGINES[k].label }));
}

module.exports = { ENGINES, validateRule, evaluateRule, listEngines, readPath, readGridCell, num, hasValue };
