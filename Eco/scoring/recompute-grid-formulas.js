/**
 * SERVER-SIDE GRID FORMULA RECOMPUTE.
 *
 * KYUN ZAROORI HAI
 *   Applicant ke form me formula-wale cells readonly hote hain, par readonly
 *   sirf UI ki baat hai — koi bhi browser devtools se us field ki value badal
 *   kar save kar sakta hai. Us number pe bharosa nahi kiya ja sakta.
 *
 *   Isliye save se pehle server wahi formulas DOBARA chalata hai aur target
 *   cells ki value apne hisaab se likh deta hai. Jo browser ne bheja tha wo
 *   overwrite ho jaata hai.
 *
 *   Engine wahi hai jo browser me chalta hai (src/app/shared/scoring/grid-formula.js),
 *   isliye dono ka nateeja hamesha ek jaisa rehta hai — koi drift nahi.
 *
 * KAHAN SE CHALTA HAI
 *   ApiController.js — applicant/assessor ka answer save hone se theek pehle.
 */

const { evaluateFormulas } = require('./grid-formula.js');

/**
 * Ek answer array (question ke options) me har Grid sub-answer ke formulas
 * dobara chalata hai.
 *
 * Input mutate nahi hota — nayi copy return hoti hai.
 *
 * @param {Array} answerArray  `answers[i].answer`
 * @returns {{answer: Array, changed: number, warnings: string[]}}
 */
function recomputeAnswerGrids(answerArray) {
  const warnings = [];
  const crossQuestion = [];
  let changed = 0;

  if (!Array.isArray(answerArray)) return { answer: answerArray, changed, crossQuestion, warnings };

  const next = JSON.parse(JSON.stringify(answerArray));

  next.forEach((option) => {
    if (!option || !Array.isArray(option.subanswar)) return;

    option.subanswar.forEach((sub) => {
      if (!sub || sub.subAnswerTypes !== 'Grid') return;

      const formulas = Array.isArray(sub.gridFormulas) ? sub.gridFormulas : [];
      if (!formulas.length) return;

      const rows = sub.grid && Array.isArray(sub.grid.gridValue) ? sub.grid.gridValue : null;
      if (!rows) return;

      // Formula me `{sub:{index}}` ho sakta hai — grid ke bahar wale input
      // (jaise "Consent to operate (KL)"). Isliye poora subanswar array dete hain.
      const out = evaluateFormulas(rows, formulas, option.subanswar);

      // Browser ne jo bheja aur server ne jo nikala — farq ho to server jeetega.
      Object.keys(out.computed).forEach((key) => {
        const sent = findCellVal(rows, key);
        if (String(sent === undefined ? '' : sent) !== String(out.computed[key])) changed += 1;
      });

      sub.grid.gridValue = out.gridValue;
      out.warnings.forEach((w) => warnings.push(w));

      // Jinka target doosre question me hai — caller unhe lagayega
      if (Array.isArray(out.crossQuestion)) {
        out.crossQuestion.forEach((cq) => crossQuestion.push(cq));
      }
    });
  });

  return { answer: next, changed, crossQuestion, warnings };
}

/**
 * Cross-question results ko poore `answers` array pe lagata hai.
 *
 * Ye `recomputeAnswerGrids` se alag isliye hai kyunki wo EK question ka answer
 * array dekhta hai, jabki cross-question ka target DOOSRE question me hota hai —
 * uske liye poora `answers` chahiye.
 *
 * Target `questionId` se dhoondha jaata hai, position se nahi.
 *
 * @param {Array} answers   applicantquestionnaire.answers
 * @param {Array} results   `recomputeAnswerGrids(...).crossQuestion`
 * @returns {{answers: Array, applied: number, warnings: string[]}}
 */
function applyCrossQuestion(answers, results) {
  const warnings = [];
  let applied = 0;
  if (!Array.isArray(answers) || !Array.isArray(results) || !results.length) {
    return { answers, applied, warnings };
  }

  const next = JSON.parse(JSON.stringify(answers));

  results.forEach((r) => {
    const t = r && r.target;
    if (!t || !t.questionId) return;

    const ans = next.find((a) => String(a.questionId) === String(t.questionId));
    if (!ans) { warnings.push(`cross-question target nahi mila: ${t.questionId}`); return; }

    const opt = (ans.answer || [])[Number(t.optionIndex) || 0];
    const sub = opt && (opt.subanswar || [])[Number(t.subIndex)];
    if (!sub) { warnings.push(`cross-question sub-answer nahi mila: ${t.questionId}.sub${t.subIndex}`); return; }

    const field = t.field || 'numericTypeVal';
    if (String(sub[field] === undefined ? '' : sub[field]) !== String(r.value)) applied += 1;
    sub[field] = r.value;
  });

  return { answers: next, applied, warnings };
}

/** Key (`"44"`) se cell ki value dhoondhna — sirf comparison ke liye. */
function findCellVal(rows, key) {
  for (const row of rows) {
    if (row && row[key] !== undefined && row[key] !== null) {
      const c = row[key];
      return typeof c === 'object' ? c.val : c;
    }
  }
  return undefined;
}

module.exports = { recomputeAnswerGrids, applyCrossQuestion };
