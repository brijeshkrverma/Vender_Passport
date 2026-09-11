/**
 * Scoring ke teen modes — ek jagah.
 *
 * Is project me "scoring" ek cheez nahi hai, TEEN alag calculations hain jo
 * alag jawab dete hain (30 applicants pe measure kiya gaya: 26/30 me teeno alag
 * the). Inhe kabhi ek maankar mat chalna:
 *
 *   applicant     -> applicant ne khud jo bhara, uske marks
 *   assessorOnly  -> sirf assessor ke diye marks
 *   final         -> combined/final score (yahi scorecard pe dikhta hai)
 *
 * FY branching bhi yahin handle hoti hai: components `financialYear !== '2024'`
 * par `filterQuestionaireMarksForAssessor` chalate hain, warna
 * `filterQuestionaireMarksForAssessorYear2024`. Ye script bhi wahi karti hai
 * taaki baseline asli behaviour se match kare.
 */

const MODES = ['applicant', 'assessorOnly', 'final'];

/** Deep clone jo scoring functions ke mutation se input ko bachata hai. */
const clone = (o) => JSON.parse(JSON.stringify(o));

/**
 * Ek engine (FE ya BE) ko diye gaye mode me chalata hai.
 *
 * @param {object} engine  MarkService.js ya loadFrontendScoring() ka result
 * @param {Array}  answers applicantquestionnaire ka answers array
 * @param {string} mode    'applicant' | 'assessorOnly' | 'final'
 * @param {string} financialYear
 * @returns {{ok: boolean, result?: object, error?: string, fn: string}}
 */
function runMode(engine, answers, mode, financialYear) {
  let fnName;
  if (mode === 'applicant') {
    fnName = 'filterQuestionaireMarks';
  } else if (mode === 'assessorOnly') {
    fnName = 'filterQuestionaireMarksOnlyForAssessor';
  } else if (mode === 'final') {
    // Wahi FY branching jo components me hai
    fnName = String(financialYear) === '2024'
      ? 'filterQuestionaireMarksForAssessorYear2024'
      : 'filterQuestionaireMarksForAssessor';
  } else {
    return { ok: false, error: `Unknown mode "${mode}"`, fn: '' };
  }

  const fn = engine[fnName];
  if (typeof fn !== 'function') {
    return { ok: false, error: `Engine me ${fnName} nahi hai`, fn: fnName };
  }

  try {
    // Har call ko apni fresh copy — engine input ko mutate karta hai
    const out = fn([{ answers: clone(answers) }]);
    if (!Array.isArray(out) || !out[0]) {
      return { ok: false, error: 'Engine ne khali result diya', fn: fnName };
    }
    return { ok: true, result: out[0], fn: fnName };
  } catch (err) {
    return { ok: false, error: err.message, fn: fnName };
  }
}

/** Engine ke result se per-question / per-category / total nikaalta hai. */
function summarise(result) {
  const perQuestion = [];
  const catMap = {};
  let total = 0;
  let maxTotal = 0;

  (result.answers || []).forEach((a) => {
    if (!a || typeof a !== 'object') return;
    const qid = String(a.questionId || '');
    const category = a.category || 'UNKNOWN';
    const obtained = Number(a.obtendMark);
    const max = Number(a.maxMark);
    const o = Number.isFinite(obtained) ? obtained : 0;
    const m = Number.isFinite(max) ? max : 0;

    perQuestion.push({ questionId: qid, category, obtainedMark: o, maxMark: m });

    if (!catMap[category]) catMap[category] = { category, obtained: 0, max: 0, count: 0 };
    catMap[category].obtained += o;
    catMap[category].max += m;
    catMap[category].count += 1;

    total += o;
    maxTotal += m;
  });

  perQuestion.sort((a, b) => a.questionId.localeCompare(b.questionId));

  return {
    perQuestion,
    perCategory: Object.values(catMap).sort((a, b) => a.category.localeCompare(b.category)),
    total: Number(total.toFixed(4)),
    maxTotal: Number(maxTotal.toFixed(4)),
    // Engine khud bhi ek total deta hai — dono match karne chahiye
    engineReportedTotal: Number(result.obtendMark) || 0,
  };
}

module.exports = { MODES, runMode, summarise, clone };
