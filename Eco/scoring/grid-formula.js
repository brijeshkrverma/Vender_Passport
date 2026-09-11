/**
 * GRID FORMULA ENGINE — admin-configurable cell calculations.
 *
 * KYA KARTA HAI
 *   Grid ke ek cell ki value doosre cells se apne aap nikal aati hai.
 *   Jaise: R4C4 = R1C1 + R2C4, ya R3C1 = R2C1 / R1C1 * 100.
 *
 * KYUN CHAHIYE — ye pehle se ho raha hai, bas hardcoded
 *   `questionnaire-form.component.ts:1101` pe abhi ye likha hai:
 *
 *     if (i == 9 && this.selectedCategotyData == 'Decarbonization') {
 *       let valueOf64Index = question10[6]["64"]['val'];
 *       let valueOf74Index = question10[7]["74"]['val'];
 *       let calc = (Number(valueOf64Index) / Number(valueOf74Index)) * 100;
 *       ...patchValue(calc.toFixed(2))
 *     }
 *
 *   Ye question ke POSITION pe tika hai (`i == 9`, `answers.at(10)`) — beech me
 *   ek question add karo to formula galat cell padhne lagega. Us file me aise
 *   37 hardcoded cell references hain.
 *
 * SCORING SE ALAG HAI — dhyan rahe
 *   Ye grid me DIKHNE WALI value banata hai (applicant ke liye auto-fill).
 *   `rule-engines.js` MARKS nikalta hai. Do alag layer hain, jaan-boojhkar alag
 *   rakhe gaye hain. Dono saath kaam karte hain: formula cell bharega, scoring
 *   rule us bhare hue cell ko padh lega.
 *
 * EK HI COPY
 *   Frontend (admin builder + applicant form) aur backend (save pe dobara
 *   verify) dono yahi file use karte hain.
 *
 * FORMULA KA SHAPE
 *   {
 *     target: { row: 4, col: 4 },
 *     expr: [ {cell:{row:1,col:1}}, {op:'+'}, {cell:{row:2,col:4}} ]
 *   }
 *
 *   Cell ko `{row, col}` ke roop me rakha gaya hai, `"44"` string ke roop me
 *   nahi — kyunki 10+ rows/cols pe `"111"` ambiguous ho jaata hai (R1C11 ya
 *   R11C1?). Grid ka apna storage key wahi purana format use karta hai, wo
 *   `cellKey()` se banta hai.
 *
 * EXPRESSION KE TOKENS
 *   { cell: { row, col } }   grid ka ek cell
 *   { sub:  { index } }      grid ke BAHAR ka sub-answer input        ← neeche dekho
 *   { op: '+' | '-' | '*' | '/' | '(' | ')' }
 *   { num: 100 }
 *
 * SUB-ANSWER REFERENCE — kyun chahiye
 *   Kai questions me grid ke saath-saath checkbox hote hain jinpe click karne se
 *   ek text/number input khulta hai, aur us input ki value grid ke calculation me
 *   lagti hai.
 *
 *   Jaise "Please indicate the total water use data":
 *     sub[0]  "Consent to operate (KL)"        -> numeric input
 *     sub[1]  "Water withdrawal (Specify source)"
 *     sub[2]  "Recycled water (specify source)"
 *     sub[3]  Grid (8 rows) — row 7 = "Water Utilization percentage"
 *
 *   Row 7 ka formula banane ke liye sub[0] ki value chahiye, jo grid ke andar hai
 *   hi nahi. Isliye `{sub:{index}}` token hai — wo `subanswar[index]` se value
 *   padhta hai (`numericTypeVal`, na mile to `textTypeVal`).
 */

/** Grid ka storage key — jaisa questionnaire data me pehle se hai. */
function cellKey(row, col) {
  return String(row) + String(col);
}

/** Cell padhna. Grid rows string keys se index hote hain, cell `{val,type}` hota hai. */
function readCell(gridValue, row, col) {
  if (!Array.isArray(gridValue)) return undefined;
  const r = gridValue[row];
  if (!r) return undefined;
  const cell = r[cellKey(row, col)] !== undefined ? r[cellKey(row, col)] : r[String(col)];
  if (cell === undefined || cell === null) return undefined;
  return typeof cell === 'object' ? cell.val : cell;
}

function toNumber(v) {
  if (v === null || v === undefined || String(v).trim() === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const OPS = ['+', '-', '*', '/'];
const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 };

/** Cell ka padhne-layak naam — UI aur error messages me. */
function cellLabel(c) {
  return `R${c.row}C${c.col}`;
}

/** Sub-answer ka short naam — `S0`, `S1`. UI asli label dikha sakta hai. */
function subLabel(s) {
  return `S${s.index}`;
}

/**
 * Cross-question target ka naam — `Q(…5580).opt0.sub0`.
 *
 * KYUN CHAHIYE
 *   Kuch calculations ka nateeja isi grid me nahi, KISI AUR QUESTION ke field me
 *   jaata hai. Jaise energy question ka:
 *     Renewable % = (Total Energy from Renewable / Total Energy Consumed) * 100
 *   aur wo value "type of renewable energy sources" question ke
 *   "Renewable Energy % of total energy consumption" field me bharni hoti hai.
 *
 *   Aaj ye `questionnaire-form.component.ts:1101` pe hardcoded hai — question ke
 *   POSITION pe (`i == 9`, `answers.at(10)`), isliye beech me ek question add
 *   karte hi galat jagah likhne lagta hai.
 */
function targetQuestionLabel(t) {
  const q = String(t.questionId || '');
  return `Q(…${q.slice(-4)}).opt${t.optionIndex || 0}.sub${t.subIndex}`;
}

/**
 * Sub-answer input ki value.
 * Checkbox pe click karne se jo input khulta hai wo `numericTypeVal` ya
 * `textTypeVal` me store hota hai — jo mile wahi lete hain.
 */
function readSub(subanswar, index) {
  if (!Array.isArray(subanswar)) return undefined;
  const s = subanswar[index];
  if (!s) return undefined;
  if (s.numericTypeVal !== undefined && s.numericTypeVal !== null && String(s.numericTypeVal) !== '') {
    return s.numericTypeVal;
  }
  return s.textTypeVal;
}

/** Ek token ka text roop. */
function tokenText(t) {
  if (t.op) return t.op;
  if (t.cell) return cellLabel(t.cell);
  if (t.sub) return subLabel(t.sub);
  if (t.num !== undefined) return String(t.num);
  return '?';
}

/** Formula ka target — grid ka cell, ya kisi doosre question ka field. */
function targetText(f) {
  if (f.targetQuestion) return targetQuestionLabel(f.targetQuestion);
  if (f.target) return cellLabel(f.target);
  return '?';
}

/** Formula ko text me — `R4C4 = R1C1 + S0`. */
function formulaToText(f) {
  if (!f || (!f.target && !f.targetQuestion)) return '';
  const rhs = (f.expr || []).map(tokenText).join(' ');
  return `${targetText(f)} = ${rhs}`;
}

/**
 * Shunting-yard: infix tokens -> RPN.
 * Standard math precedence use karte hain (* aur / pehle), calculator wali
 * left-to-right nahi — kyunki admin `a + b * c` likhe to usse wahi matlab
 * expect hota hai jo Excel me hota hai.
 */
function toRPN(tokens) {
  const out = [];
  const ops = [];
  for (const t of tokens) {
    if (t.op === '(') ops.push(t);
    else if (t.op === ')') {
      while (ops.length && ops[ops.length - 1].op !== '(') out.push(ops.pop());
      ops.pop();
    } else if (t.op) {
      while (
        ops.length &&
        ops[ops.length - 1].op !== '(' &&
        PRECEDENCE[ops[ops.length - 1].op] >= PRECEDENCE[t.op]
      ) out.push(ops.pop());
      ops.push(t);
    } else out.push(t);
  }
  while (ops.length) out.push(ops.pop());
  return out;
}

/** RPN evaluate. Div-by-zero pe null deta hai (khali cell), 0 nahi. */
function evalRPN(rpn, getCell, getSub) {
  const st = [];
  for (const t of rpn) {
    if (t.op) {
      const b = st.pop();
      const a = st.pop();
      if (a === null || b === null || a === undefined || b === undefined) { st.push(null); continue; }
      if (t.op === '+') st.push(a + b);
      else if (t.op === '-') st.push(a - b);
      else if (t.op === '*') st.push(a * b);
      else if (t.op === '/') st.push(b === 0 ? null : a / b);
      else st.push(null);
    } else if (t.cell) st.push(toNumber(getCell(t.cell.row, t.cell.col)));
    else if (t.sub) st.push(toNumber(getSub ? getSub(t.sub.index) : undefined));
    else if (t.num !== undefined) st.push(Number(t.num));
    else st.push(null);
  }
  const v = st.pop();
  return v === undefined ? null : v;
}

/**
 * Formulas ko dependency order me lagata hai (topological sort).
 * Zaroori hai: agar R4C4 = R3C3 + 1 aur R3C3 = R1C1 + 1, to R3C3 pehle
 * compute hona chahiye. Circular hone par wo formulas alag laut jaate hain.
 *
 * @returns {{order: number[], circular: number[]}}
 */
function orderFormulas(formulas) {
  // Cross-question formulas grid me kuch nahi likhte, isliye koi doosra formula
  // unpe depend nahi kar sakta — wo dependency graph se bahar hain aur sabke
  // baad chalte hain (`evaluateFormulas` me).
  const targetOf = formulas.map((f) => (f.target ? cellKey(f.target.row, f.target.col) : ' none'));
  const deps = formulas.map((f) =>
    (f.expr || [])
      .filter((t) => t.cell)
      .map((t) => targetOf.indexOf(cellKey(t.cell.row, t.cell.col)))
      .filter((i) => i >= 0)
  );

  const state = new Array(formulas.length).fill(0); // 0=naya 1=chal raha 2=ho gaya
  const order = [];
  const circular = [];

  function visit(i, stack) {
    if (state[i] === 2) return;
    if (state[i] === 1) { stack.forEach((s) => { if (circular.indexOf(s) < 0) circular.push(s); }); return; }
    state[i] = 1;
    deps[i].forEach((d) => visit(d, stack.concat([i])));
    state[i] = 2;
    if (circular.indexOf(i) < 0) order.push(i);
  }
  formulas.forEach((_, i) => visit(i, []));
  return { order: order.filter((i) => circular.indexOf(i) < 0), circular };
}

/**
 * Save se PEHLE chalana hai — client aur server dono taraf.
 * @param {Array} formulas
 * @param {{rows?:number, cols?:number, subCount?:number}} [gridMeta]
 *        grid ka size aur us option me kitne sub-answers hain (optional)
 * @returns {string[]} khali = sab theek
 */
/**
 * Expression ki shape aur references check karta hai.
 * In-grid aur cross-question dono formulas ke liye ek hi jagah, taaki dono pe
 * ek jaisi sakhti lage.
 *
 * @param {Array} expr
 * @param {number} n         formula ka number (error message ke liye)
 * @param {object} [gridMeta]
 * @param {object} [target]  in-grid target (bounds check me shamil hoga)
 */
function exprShapeErrors(expr, n, gridMeta, target) {
  const errors = [];

  // value aur operator baari-baari aane chahiye
  let depth = 0;
  let expectValue = true;
  expr.forEach((t) => {
    if (t.op === '(') { depth += 1; return; }
    if (t.op === ')') { depth -= 1; return; }
    if (t.op) {
      if (expectValue) errors.push(`Formula ${n}: "${t.op}" se pehle koi cell ya number hona chahiye`);
      expectValue = true;
    } else {
      if (!expectValue) errors.push(`Formula ${n}: do value ke beech operator missing hai`);
      expectValue = false;
    }
  });
  if (expectValue) errors.push(`Formula ${n}: formula operator pe khatam ho raha hai`);
  if (depth !== 0) errors.push(`Formula ${n}: brackets pure nahi hain`);

  // grid ke bahar ke cells
  if (gridMeta && gridMeta.rows !== undefined && gridMeta.cols !== undefined) {
    const cells = expr.filter((t) => t.cell).map((t) => t.cell);
    if (target) cells.push(target);
    cells
      .filter((c) => c.row < 0 || c.col < 0 || c.row >= gridMeta.rows || c.col >= gridMeta.cols)
      .forEach((c) => errors.push(`Formula ${n}: ${cellLabel(c)} grid ke bahar hai`));
  }

  // sub-answer reference maujood hai ya nahi
  if (gridMeta && gridMeta.subCount !== undefined) {
    expr.filter((t) => t.sub).forEach((t) => {
      if (t.sub.index < 0 || t.sub.index >= gridMeta.subCount) {
        errors.push(`Formula ${n}: ${subLabel(t.sub)} naam ka koi sub-answer nahi hai`);
      }
    });
  }

  return errors;
}

function validateFormulas(formulas, gridMeta) {
  const errors = [];
  if (!Array.isArray(formulas) || formulas.length === 0) return errors;

  const seen = {};
  formulas.forEach((f, i) => {
    const n = i + 1;

    // ---- cross-question target: nateeja kisi AUR question ke field me jaata hai ----
    if (f && f.targetQuestion) {
      const tq = f.targetQuestion;
      if (!tq.questionId) errors.push(`Formula ${n}: target question ka id nahi hai`);
      if (tq.subIndex === undefined || tq.subIndex === null || Number(tq.subIndex) < 0) {
        errors.push(`Formula ${n}: target question ka sub-answer index nahi hai`);
      }
      const key = 'Q' + tq.questionId + '.' + (tq.optionIndex || 0) + '.' + tq.subIndex;
      if (seen[key]) errors.push(`Formula ${n}: ${targetQuestionLabel(tq)} pe pehle se ek formula hai`);
      seen[key] = true;

      const e2 = f.expr || [];
      if (!e2.length) { errors.push(`Formula ${n}: formula khali hai`); return; }
      errors.push(...exprShapeErrors(e2, n, gridMeta));
      return;
    }

    if (!f || !f.target || f.target.row === undefined || f.target.col === undefined) {
      errors.push(`Formula ${n}: target cell nahi hai`);
      return;
    }
    const key = cellKey(f.target.row, f.target.col);

    // ek cell pe do formula = kaunsa chale, pata nahi
    if (seen[key]) errors.push(`Formula ${n}: ${cellLabel(f.target)} pe pehle se ek formula hai`);
    seen[key] = true;

    const expr = f.expr || [];
    if (!expr.length) { errors.push(`Formula ${n}: ${cellLabel(f.target)} ka formula khali hai`); return; }

    // apne aap ko reference
    if (expr.some((t) => t.cell && cellKey(t.cell.row, t.cell.col) === key)) {
      errors.push(`Formula ${n}: ${cellLabel(f.target)} khud ko reference kar raha hai`);
    }

    errors.push(...exprShapeErrors(expr, n, gridMeta, f.target));
  });

  const { circular } = orderFormulas(formulas.filter((f) => f && f.target));
  circular.forEach((i) => {
    errors.push(`Formula ${i + 1}: circular reference — ye khud pe ghoom kar wapas aata hai`);
  });

  return errors;
}

/**
 * Formulas chalata hai aur grid ki nayi copy deta hai (input mutate NAHI hota).
 *
 * @param {Array} gridValue  grid rows
 * @param {Array} formulas
 * @param {Array} [subanswar] us option ke saare sub-answers — `{sub:{index}}`
 *                            tokens iske andar se value padhte hain
 * @returns {{gridValue:Array, computed:Object, crossQuestion:Array, warnings:string[]}}
 *          `crossQuestion` un formulas ka nateeja hai jinka target kisi AUR
 *          question me hai. Engine unhe khud nahi likh sakta (uske paas doosre
 *          question ka access nahi hai) — caller ko lagana padta hai.
 */
function evaluateFormulas(gridValue, formulas, subanswar) {
  const warnings = [];
  const computed = {};
  const crossQuestion = [];
  if (!Array.isArray(gridValue) || !Array.isArray(formulas) || !formulas.length) {
    return { gridValue, computed, crossQuestion, warnings };
  }

  const next = JSON.parse(JSON.stringify(gridValue));
  const valid = formulas.filter((f) => f && f.target && Array.isArray(f.expr) && f.expr.length);
  const { order, circular } = orderFormulas(valid);

  circular.forEach((i) => {
    warnings.push(`${cellLabel(valid[i].target)} ka formula circular hai — skip kiya gaya`);
  });

  const getCell = (row, col) => readCell(next, row, col);
  const getSub = (index) => readSub(subanswar, index);

  order.forEach((i) => {
    const f = valid[i];
    const value = evalRPN(toRPN(f.expr), getCell, getSub);

    if (value === null || !Number.isFinite(value)) {
      const hasDiv = f.expr.some((t) => t.op === '/');
      warnings.push(
        hasDiv
          ? `${cellLabel(f.target)}: divide karne wala cell khali ya 0 hai — value blank rakhi gayi`
          : `${cellLabel(f.target)}: value nikal nahi payi — blank rakhi gayi`
      );
      writeCell(next, f.target.row, f.target.col, '');
      computed[cellKey(f.target.row, f.target.col)] = '';
      return;
    }

    const rounded = Math.round(value * 100) / 100;
    writeCell(next, f.target.row, f.target.col, String(rounded));
    computed[cellKey(f.target.row, f.target.col)] = String(rounded);
  });

  // ---- cross-question formulas ----
  // Ye sabse AAKHIR me chalte hain, kyunki inke inputs aksar wahi cells hote
  // hain jo upar abhi compute hue (jaise Renewable % = R6C4 / R7C4 * 100, aur
  // R6C4/R7C4 khud formulas se bhare the).
  formulas
    .filter((f) => f && f.targetQuestion && Array.isArray(f.expr) && f.expr.length)
    .forEach((f) => {
      const value = evalRPN(toRPN(f.expr), getCell, getSub);
      const label = targetQuestionLabel(f.targetQuestion);

      if (value === null || !Number.isFinite(value)) {
        const hasDiv = f.expr.some((t) => t.op === '/');
        warnings.push(
          hasDiv
            ? `${label}: divide karne wala cell khali ya 0 hai — value blank rakhi gayi`
            : `${label}: value nikal nahi payi — blank rakhi gayi`
        );
        crossQuestion.push({ target: f.targetQuestion, value: '' });
        return;
      }

      crossQuestion.push({
        target: f.targetQuestion,
        value: String(Math.round(value * 100) / 100),
      });
    });

  return { gridValue: next, computed, crossQuestion, warnings };
}

/** Cell me value likhna, `{val,type}` shape bachaate hue. */
function writeCell(gridValue, row, col, val) {
  if (!Array.isArray(gridValue)) return;
  if (!gridValue[row]) gridValue[row] = {};
  const key = cellKey(row, col);
  const existing = gridValue[row][key];
  if (existing && typeof existing === 'object') gridValue[row][key] = Object.assign({}, existing, { val });
  else gridValue[row][key] = { val, type: 'number' };
}

/** Kaunse cells formula se bharte hain — unhe UI me disabled karna hai. */
function computedCellKeys(formulas) {
  return (formulas || [])
    .filter((f) => f && f.target)
    .map((f) => cellKey(f.target.row, f.target.col));
}

module.exports = {
  validateFormulas,
  evaluateFormulas,
  computedCellKeys,
  formulaToText,
  tokenText,
  targetText,
  targetQuestionLabel,
  cellLabel,
  subLabel,
  cellKey,
  readCell,
  readSub,
  orderFormulas,
  OPS,
};
