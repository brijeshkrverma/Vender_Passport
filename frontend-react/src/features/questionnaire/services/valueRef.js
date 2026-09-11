/**
 * VALUE REFERENCE — the one way anything in this system names a value.
 *
 * ── THE PROBLEM THIS SOLVES ───────────────────────────────────────────────
 *
 * Three mechanisms needed to read values, and each grew its own way of saying
 * where a value comes from:
 *
 *   grid formula   {cell:{row,col}} · {sub:{index}} · a separate `targetQuestion`
 *   mark engine    'answers[0].subAnswers[1].numericTypeVal'  (a parsed string)
 *   trend rule     {row, cols[]} on one side, {questionId, row, cols[]} on the other
 *
 * Three shapes meant three editors, three validators, and three sets of rules
 * about what is valid. Worse, they could not be compared: a formula's output
 * could not be a mark engine's input except by routing it through a grid cell,
 * and a cycle spanning two mechanisms was undetectable because nothing could
 * line their dependencies up.
 *
 * One `Ref` type fixes all of that. Every mechanism reads `Ref`s and declares
 * what it writes, so there is one picker, one resolver, one validator, and one
 * dependency graph.
 *
 * ── WHY KEYS AND NOT INDICES ──────────────────────────────────────────────
 *
 * A Ref addresses an answer or sub-answer by its stable `key`, never by its
 * position. Positions move: the author reorders two options and every rule
 * that pointed at them is now silently reading the wrong one.
 *
 * That is not a hypothetical. The system this replaces keyed its scoring rules
 * on a question's position in the list — `if (i == 9)`, `answers.at(10)` — so
 * inserting one question earlier made 37 cell references wrong, and nothing
 * reported it. An index is the same mistake at a smaller scale.
 *
 * ── REFS ARE DATA ─────────────────────────────────────────────────────────
 *
 * A Ref is resolved by a switch over a closed set of kinds. Nothing is parsed,
 * nothing is executed. Adding a kind means adding a resolver branch and a
 * picker entry — a code change that gets reviewed.
 */

export const REF_KINDS = ['const', 'input', 'option', 'cell', 'self', 'question'];

/* ── constructors ──────────────────────────────────────────────────────── */

export const constRef = (value) => ({ kind: 'const', value: Number(value) || 0 });
/**
 * `questionId` is optional on `input` and `cell`.
 *
 * Without it the reference is to this question's own answer, which is the
 * common case. With it, the same reference reaches into another question's
 * answer — which a trend rule needs and cannot work without: intensity is
 * emissions divided by revenue, and revenue lives in a different question
 * entirely. Making it one optional field rather than a separate kind means the
 * resolver, the picker and the validator all keep working unchanged.
 */
export const inputRef = (answerKey, subKey, questionId) => (
  questionId ? { kind: 'input', answerKey, subKey, questionId }
    : { kind: 'input', answerKey, subKey });
export const optionRef = (answerKey, field = 'score') => ({ kind: 'option', answerKey, field });
export const cellRef = (answerKey, subKey, row, col, questionId) => (
  questionId ? { kind: 'cell', answerKey, subKey, row, col, questionId }
    : { kind: 'cell', answerKey, subKey, row, col });
export const selfRef = (field = 'maxMark') => ({ kind: 'self', field });
export const questionRef = (questionId, field = 'mark') => ({ kind: 'question', questionId, field });

/**
 * A stable string for one Ref — used to dedupe, to key React lists, and as the
 * node id in the dependency graph.
 */
/** Prefix identifying another question, empty for this one. */
const qPrefix = (ref) => (ref.questionId ? `${ref.questionId}:` : '');

export function refKey(ref) {
  if (!ref || !ref.kind) return '?';
  switch (ref.kind) {
    case 'const': return `const:${ref.value}`;
    case 'input': return `input:${qPrefix(ref)}${ref.answerKey}/${ref.subKey}`;
    case 'option': return `option:${ref.answerKey}/${ref.field || 'score'}`;
    case 'cell': return `cell:${qPrefix(ref)}${ref.answerKey}/${ref.subKey}/${ref.row},${ref.col}`;
    case 'self': return `self:${ref.field || 'maxMark'}`;
    case 'question': return `question:${ref.questionId}/${ref.field || 'mark'}`;
    default: return `?:${ref.kind}`;
  }
}

export const sameRef = (a, b) => refKey(a) === refKey(b);

/* ── catalog ───────────────────────────────────────────────────────────── */

/**
 * What a Ref may point at, built from the question being edited.
 *
 * The picker offers only what is in here, so an author cannot construct a Ref
 * to something that does not exist — which is the failure the string-path
 * version had: a rule kept pointing at a field after it was renamed, and only
 * a wrong score revealed it.
 */
export function buildCatalog(form, otherQuestions = []) {
  const answers = (form?.answers || []).map((answer, ai) => ({
    key: answer.key,
    label: answer.answerLabel || answer.displayLabel || `Option ${ai + 1}`,
    score: answer.score,
    subs: (answer.subAnswers || []).map((sub, si) => ({
      key: sub.key,
      label: sub.subAnswerLabel || `Sub-answer ${si + 1}`,
      type: sub.subAnswerType || '',
      inputMode: sub.inputMode || '',
      config: sub.config || null,
    })),
  }));

  return {
    answers,
    questions: otherQuestions.map((q) => ({ id: q.questionId || q.id, label: q.label })),
    maxMark: Number(form?.maxMark) || 0,
  };
}

const findAnswer = (catalog, key) => (catalog?.answers || []).find((a) => a.key === key);
const findSub = (answer, key) => (answer?.subs || []).find((s) => s.key === key);

/** Human-readable name for a Ref — used in pickers, traces and error text. */
export function labelRef(ref, catalog) {
  if (!ref || !ref.kind) return '(nothing chosen)';

  switch (ref.kind) {
    case 'const':
      return String(ref.value);

    case 'self':
      return ref.field === 'mark' ? 'this question’s mark' : 'this question’s max marks';

    case 'input': {
      const answer = findAnswer(catalog, ref.answerKey);
      const sub = findSub(answer, ref.subKey);
      if (!answer || !sub) return '(missing input)';
      return `${answer.label} → ${sub.label}`;
    }

    case 'option': {
      const answer = findAnswer(catalog, ref.answerKey);
      if (!answer) return '(missing option)';
      return ref.field === 'selected' ? `${answer.label} (selected?)` : `${answer.label} (score)`;
    }

    case 'cell': {
      // Name the other question, so a trace does not read as if the value were
      // local — "R1C1" alone is indistinguishable from this question's own cell.
      if (ref.questionId) {
        const other = (catalog?.questions || [])
          .find((x) => String(x.id) === String(ref.questionId));
        return `${other ? other.label : 'another question'} → R${ref.row}C${ref.col}`;
      }
      const answer = findAnswer(catalog, ref.answerKey);
      const sub = findSub(answer, ref.subKey);
      if (!answer || !sub) return '(missing cell)';
      return `${sub.label} R${ref.row}C${ref.col}`;
    }

    case 'question': {
      const q = (catalog?.questions || []).find((x) => String(x.id) === String(ref.questionId));
      const what = ref.field === 'option' ? 'selected option' : 'mark';
      return q ? `${q.label} → ${what}` : `(another question’s ${what})`;
    }

    default:
      return `(unknown reference “${ref.kind}”)`;
  }
}

/**
 * Does this Ref point at something that exists?
 *
 * Run at author time. A Ref that dangles resolves to nothing at scoring time,
 * and a score that quietly treated a missing input as zero is exactly the class
 * of bug this whole design exists to remove.
 */
export function validateRef(ref, catalog) {
  if (!ref || !ref.kind) return ['No value chosen'];
  if (!REF_KINDS.includes(ref.kind)) return [`Unknown reference type “${ref.kind}”`];

  switch (ref.kind) {
    case 'const':
      return Number.isFinite(Number(ref.value)) ? [] : ['A constant must be a number'];

    case 'self':
      return ['maxMark', 'mark'].includes(ref.field || 'maxMark') ? [] : ['Unknown field on this question'];

    case 'input':
    case 'cell': {
      /*
       * A reference into another question is checked only for shape. Its target
       * lives in a document this catalog does not describe, and guessing would
       * mean reporting a perfectly good reference as broken — which is worse
       * than not checking, because the author would delete a working rule.
       * The scoring pass reports it if it fails to resolve.
       */
      if (ref.questionId) {
        return (ref.answerKey && ref.subKey) ? [] : ['That reference is incomplete'];
      }

      const answer = findAnswer(catalog, ref.answerKey);
      if (!answer) return ['The option this points at no longer exists'];
      const sub = findSub(answer, ref.subKey);
      if (!sub) return ['The sub-answer this points at no longer exists'];
      if (ref.kind === 'cell') {
        if (sub.type !== 'Grid') return [`“${sub.label}” is not a grid`];
        const rows = (sub.config?.rows || []).length;
        const cols = (sub.config?.columns || []).length;
        // Coordinates address the stored grid, which carries a header row and a
        // label column — hence the +1 on each axis.
        if (ref.row < 0 || ref.row > rows || ref.col < 0 || ref.col > cols) {
          return [`R${ref.row}C${ref.col} is outside “${sub.label}” (R0..R${rows}, C0..C${cols})`];
        }
      }
      return [];
    }

    case 'option': {
      if (!findAnswer(catalog, ref.answerKey)) return ['The option this points at no longer exists'];
      return ['score', 'selected'].includes(ref.field || 'score') ? [] : ['Unknown field on an option'];
    }

    case 'question': {
      if (!ref.questionId) return ['No question chosen'];
      const known = catalog?.questions?.length
        ? catalog.questions.some((q) => String(q.id) === String(ref.questionId))
        : true;   // the list may not have loaded; do not fail authoring on that
      return known ? [] : ['That question is no longer available'];
    }

    default:
      return [`Unknown reference type “${ref.kind}”`];
  }
}

/* ── resolution ────────────────────────────────────────────────────────── */

const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '';

/**
 * Whose answers this reference reads.
 *
 * Another question's answers are supplied under `ctx.questions[id].answers`;
 * a reference without a `questionId` reads the one being scored.
 */
const answersFor = (ctx, ref) => (ref.questionId
  ? ctx.questions?.[ref.questionId]?.answers
  : ctx.answers);

/**
 * Read the value a Ref names.
 *
 * `ctx` is a normalised view of one respondent's answer:
 *
 *   {
 *     answers:   { [answerKey]: { score, selected, subs: { [subKey]: { value, grid } } } },
 *     self:      { maxMark, mark },
 *     questions: { [questionId]: { mark, option } },
 *   }
 *
 * Returns `{ value, missing, label }`. A missing value is `null`, never `0` —
 * a half-filled questionnaire is the normal state while someone works through
 * it, and a confident zero reads as a real answer. Every consumer decides for
 * itself what missing means; the resolver never guesses.
 */
export function resolveRef(ref, ctx = {}, catalog) {
  const label = labelRef(ref, catalog);
  const miss = () => ({ value: null, missing: true, label });

  if (!ref || !ref.kind) return miss();

  switch (ref.kind) {
    case 'const':
      return { value: Number(ref.value) || 0, missing: false, label };

    case 'self': {
      const v = ctx.self?.[ref.field || 'maxMark'];
      return hasValue(v) ? { value: Number(v), missing: false, label } : miss();
    }

    case 'input': {
      const v = answersFor(ctx, ref)?.[ref.answerKey]?.subs?.[ref.subKey]?.value;
      return hasValue(v) ? { value: v, missing: false, label } : miss();
    }

    case 'option': {
      const answer = ctx.answers?.[ref.answerKey];
      if (!answer) return miss();
      if ((ref.field || 'score') === 'selected') {
        return { value: answer.selected ? 1 : 0, missing: false, label };
      }
      // An unselected option contributes nothing — that is a real 0, not a
      // missing value, so it is reported as present.
      return { value: answer.selected ? (Number(answer.score) || 0) : 0, missing: false, label };
    }

    case 'cell': {
      const grid = answersFor(ctx, ref)?.[ref.answerKey]?.subs?.[ref.subKey]?.grid;
      const rows = Array.isArray(grid) ? grid : null;
      const cell = rows?.[ref.row]?.[`${ref.row}${ref.col}`];
      const v = cell && typeof cell === 'object' ? cell.val : cell;
      return hasValue(v) ? { value: v, missing: false, label } : miss();
    }

    case 'question': {
      const other = ctx.questions?.[ref.questionId];
      const v = other?.[ref.field || 'mark'];
      return hasValue(v) ? { value: v, missing: false, label } : miss();
    }

    default:
      return miss();
  }
}

/** Resolve to a number, treating a missing value as `null` so it propagates. */
export function resolveNumber(ref, ctx, catalog) {
  const out = resolveRef(ref, ctx, catalog);
  if (out.missing) return null;
  const n = Number(out.value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Write a value at the place a Ref names.
 *
 * A grid formula fills a cell, so the same vocabulary that says where to read
 * from has to say where to write to — otherwise a formula's target would need
 * its own addressing scheme, which is the split this whole type exists to
 * remove.
 *
 * Only the kinds that name somewhere writable are handled. `const` and `self`
 * are not places; asking to write to one is a bug in the caller, and returning
 * the context unchanged would hide it.
 */
export function writeRef(ctx, ref, value) {
  if (!ref) return { ctx, written: false };

  const next = { ...ctx, answers: { ...(ctx.answers || {}) }, questions: { ...(ctx.questions || {}) } };

  if (ref.kind === 'cell') {
    const answer = { ...(next.answers[ref.answerKey] || { subs: {} }) };
    answer.subs = { ...(answer.subs || {}) };
    const sub = { ...(answer.subs[ref.subKey] || {}) };
    const grid = Array.isArray(sub.grid) ? sub.grid.slice() : [];
    const row = { ...(grid[ref.row] || {}) };
    const key = `${ref.row}${ref.col}`;
    const existing = row[key];
    row[key] = typeof existing === 'object' && existing !== null
      ? { ...existing, val: value }
      : { val: value, type: 'number' };
    grid[ref.row] = row;
    sub.grid = grid;
    answer.subs[ref.subKey] = sub;
    next.answers[ref.answerKey] = answer;
    return { ctx: next, written: true };
  }

  if (ref.kind === 'input') {
    const answer = { ...(next.answers[ref.answerKey] || { subs: {} }) };
    answer.subs = { ...(answer.subs || {}) };
    answer.subs[ref.subKey] = { ...(answer.subs[ref.subKey] || {}), value };
    next.answers[ref.answerKey] = answer;
    return { ctx: next, written: true };
  }

  if (ref.kind === 'question') {
    next.questions[ref.questionId] = {
      ...(next.questions[ref.questionId] || {}),
      [ref.field || 'mark']: value,
    };
    return { ctx: next, written: true };
  }

  return { ctx, written: false };
}

/** Can a formula write here? Used to keep unwritable targets out of the picker. */
export const isWritable = (ref) => ['cell', 'input', 'question'].includes(ref?.kind);

/* ── areas ─────────────────────────────────────────────────────────────── */

/**
 * A rectangular region of one grid: `{ answerKey, subKey, rows[], cols[] }`.
 *
 * Deliberately NOT a Ref kind. A Ref names one value; an area names many, and
 * bending the vocabulary to cover both would make "resolve this reference"
 * mean two different things. Keeping them separate also keeps the picker
 * honest — you pick a value, or you pick a region, and the UI can say which.
 *
 * It is still addressed by stable keys, and `areaToRefs` expands it so the
 * dependency graph and the validator only ever deal in Refs.
 */
export function areaToRefs(area) {
  if (!area?.answerKey || !area?.subKey) return [];
  const refs = [];
  (area.rows || []).forEach((r) => (area.cols || []).forEach((c) => {
    refs.push(cellRef(area.answerKey, area.subKey, r, c));
  }));
  return refs;
}

export function validateArea(area, catalog) {
  if (!area?.answerKey || !area?.subKey) return ['Choose which grid this reads'];
  if (!(area.rows || []).length) return ['Choose at least one row'];
  if (!(area.cols || []).length) return ['Choose at least one column'];

  // One representative check reports a bad grid without repeating the same
  // message for every cell in the region.
  const first = areaToRefs(area)[0];
  const errors = validateRef(first, catalog);
  return errors.length ? errors : [];
}

export const areaSize = (area) => (area?.rows || []).length * (area?.cols || []).length;

/* ── dependency graph ──────────────────────────────────────────────────── */

/**
 * Pull every Ref out of an arbitrary config object.
 *
 * Mechanisms nest Refs at different depths — a formula's are in a token array,
 * a mark engine's in named fields, a trend rule's in two lists. Rather than
 * each one declaring its own extractor and drifting, this walks the structure
 * and recognises Refs by shape.
 */
export function collectRefs(node, out = []) {
  if (!node || typeof node !== 'object') return out;

  if (typeof node.kind === 'string' && REF_KINDS.includes(node.kind)) {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectRefs(n, out));
    return out;
  }
  Object.values(node).forEach((v) => collectRefs(v, out));
  return out;
}

/**
 * Order rules so that anything a rule reads has already been worked out, and
 * report any cycle instead of looping.
 *
 * `rules` is `[{ id, reads: Ref[], writes: Ref | null }]`.
 *
 * This is only possible because all three mechanisms share the vocabulary — a
 * cycle that runs formula → mark → trend → formula is invisible if each one
 * describes its inputs differently.
 */
export function orderRules(rules = []) {
  const writers = new Map();
  rules.forEach((r) => { if (r.writes) writers.set(refKey(r.writes), r.id); });

  const edges = new Map(rules.map((r) => [r.id, []]));
  rules.forEach((r) => {
    (r.reads || []).forEach((ref) => {
      const producer = writers.get(refKey(ref));
      if (producer && producer !== r.id) edges.get(r.id).push(producer);
    });
  });

  const state = new Map();          // unvisited | visiting | done
  const order = [];
  const cycles = [];

  const visit = (id, stack) => {
    const s = state.get(id);
    if (s === 'done') return;
    if (s === 'visiting') {
      cycles.push([...stack.slice(stack.indexOf(id)), id]);
      return;
    }
    state.set(id, 'visiting');
    (edges.get(id) || []).forEach((dep) => visit(dep, [...stack, id]));
    state.set(id, 'done');
    order.push(id);
  };

  rules.forEach((r) => visit(r.id, []));

  // A rule that reads its own output never settles on a value.
  rules.forEach((r) => {
    if (r.writes && (r.reads || []).some((ref) => sameRef(ref, r.writes))) {
      cycles.push([r.id, r.id]);
    }
  });

  return { order, cycles };
}
