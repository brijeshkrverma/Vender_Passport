import { emptyGrid } from '../config/questionnaireSchema';
import { toStoredGrid, fromStoredGrid } from '../services/gridModel';
import { validateFormulas } from '../services/gridFormula';
import { validateTrendRule } from '../services/trendRule';
import { cellRef } from '../services/valueRef';

/**
 * A table. 177 of the 1186 stored sub-answers, and the only type that carries a
 * configuration of its own.
 *
 * ── THIS FILE IS WHY THE CONTRACT EXISTS ──────────────────────────────────
 *
 * Grid needs four things no other type does: a table to build, a translation to
 * the stored coordinate-keyed shape, formulas, and per-row marking. Before the
 * contract those four lived as `subAnswerTypes === 'Grid'` checks in the
 * serializer (twice), the validator, the form reducer (three times) and a
 * component — seven places, and a type that needed the same treatment would
 * have had to find all seven.
 *
 * They are all here now. Adding a type with its own configuration is one file.
 */
export default {
  id: 'Grid',
  label: 'Grid',
  hint: 'A table of rows and columns',

  capabilities: {
    hasOptions: true,
    allowsSubAnswer: true,
    allowsScore: true,
    allowsInputMode: false,
  },

  /**
   * A grid arrives usable — one label column, one data column, one row.
   *
   * An empty table would leave the author with a type selected and nothing to
   * fill in, which is what choosing Grid used to do before the builder existed.
   */
  createConfig: () => emptyGrid(),

  /**
   * The stored shape keys every cell by concatenated coordinates (`"11"` = row
   * 1, column 1) and hangs the row array off the sub-answer's own index. Both
   * are hostile to edit — inserting a column renumbers every cell to its right —
   * so the editor works on `{ columns, rows }` and converts here.
   */
  toStored: (config, { index = 0 } = {}) => (config ? toStoredGrid(config, index) : {}),
  fromStored: (stored, { index = 0 } = {}) => fromStoredGrid(stored, index),

  validate(config, ctx = {}) {
    if (!config) return ['Grid selected but no table has been built'];

    const errors = [];
    if (!(config.columns || []).length) errors.push('Add at least one column');
    if (!(config.rows || []).length) errors.push('Add at least one row');

    (config.columns || []).forEach((c, i) => {
      if (!String(c.label || '').trim()) errors.push(`Column ${i + 1} has no heading`);
    });

    /*
     * Formula coordinates address the *stored* grid, which carries a header row
     * and a label column the editor model keeps separately — hence the +1 on
     * each axis.
     */
    errors.push(...validateFormulas(config.formulas, ctx.catalog, {
      rows: (config.rows || []).length + 1,
      cols: (config.columns || []).length + 1,
    }));

    if (ctx.trendRule) {
      const trendErrors = validateTrendRule(ctx.trendRule, ctx.catalog);
      // A band naming an option this sub-answer does not have can never fire,
      // so the rule would quietly award nothing on that branch.
      const available = (ctx.assessorOptions || []).map((o) => o.option).filter(Boolean);
      (ctx.trendRule.bands || []).forEach((b, i) => {
        if (b.option && available.length && !available.includes(b.option)) {
          trendErrors.push(`Band ${i + 1}'s option “${b.option}” does not exist on this sub-answer`);
        }
      });
      errors.push(...trendErrors);
    }

    return [...new Set(errors)];
  },

  /**
   * Every cell is referenceable, in the stored coordinate space so the
   * references a formula builds here mean the same thing everywhere else.
   */
  refs(config, { answerKey, subKey, questionId } = {}) {
    if (!config) return [];
    const out = [];
    const rows = (config.rows || []).length;
    const cols = (config.columns || []).length;

    for (let r = 0; r <= rows; r += 1) {
      for (let c = 0; c <= cols; c += 1) {
        out.push(cellRef(answerKey, subKey, r, c, questionId));
      }
    }
    return out;
  },
};
