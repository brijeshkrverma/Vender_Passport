/**
 * GRID MODEL — pure table operations, plus translation to the stored shape.
 *
 * WHY A TRANSLATION LAYER EXISTS
 *
 * The stored grid is an array whose first element is the header row and whose
 * every row is an object keyed by concatenated coordinates:
 *
 *   [ { "00": "Name of the Policy",              // column-0 header, a bare string
 *       "01": { val: "Available (Y/N)", type: "text" } },
 *     { "10": { val: "Code of conduct", type: "text" },
 *       "11": { val: "", type: "dropdown" },
 *       assessorOption: [...] } ]
 *
 * That shape is hostile to edit: the key `"11"` means row 1 column 1, so
 * inserting a column renumbers every cell in the table, and it silently breaks
 * at ten columns because `"110"` is ambiguous. It is also why the Angular
 * screen had no grid builder at all — grids could only be created by hand in
 * the database.
 *
 * So the editor works on an explicit `{ columns, rows }` model with stable
 * keys, and this module converts at the boundary. Existing documents keep
 * loading; new ones keep the same on-disk shape.
 */

import {
  emptyGridColumn, emptyGridRow, emptyAssessorOption,
} from '../config/questionnaireSchema.js';

/* ── Structural edits (all immutable) ──────────────────────────────────── */

export function addColumn(grid, label = '') {
  const column = emptyGridColumn(label);
  return {
    ...grid,
    columns: [...grid.columns, column],
    rows: grid.rows.map((r) => ({ ...r, cells: { ...r.cells, [column.key]: '' } })),
  };
}

export function removeColumn(grid, columnKey) {
  // A grid with no data columns cannot be answered.
  if (grid.columns.length <= 1) return grid;
  return {
    ...grid,
    columns: grid.columns.filter((c) => c.key !== columnKey),
    rows: grid.rows.map((r) => {
      const cells = { ...r.cells };
      delete cells[columnKey];
      return { ...r, cells };
    }),
    formulas: grid.formulas.filter((f) => String(f.targetCol) !== String(colIndexOf(grid, columnKey) + 1)),
  };
}

export function updateColumn(grid, columnKey, patch) {
  return {
    ...grid,
    columns: grid.columns.map((c) => (c.key === columnKey ? { ...c, ...patch } : c)),
  };
}

export function moveColumn(grid, from, to) {
  if (from === to || to < 0 || to >= grid.columns.length) return grid;
  const columns = grid.columns.slice();
  const [moved] = columns.splice(from, 1);
  columns.splice(to, 0, moved);
  return { ...grid, columns };
}

export const addRow = (grid) => ({ ...grid, rows: [...grid.rows, emptyGridRow(grid.columns)] });

export function removeRow(grid, rowKey) {
  if (grid.rows.length <= 1) return grid;
  return { ...grid, rows: grid.rows.filter((r) => r.key !== rowKey) };
}

export function updateRow(grid, rowKey, patch) {
  return { ...grid, rows: grid.rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)) };
}

export function setCell(grid, rowKey, columnKey, value) {
  return {
    ...grid,
    rows: grid.rows.map((r) =>
      r.key === rowKey ? { ...r, cells: { ...r.cells, [columnKey]: value } } : r),
  };
}

/**
 * Mark or unmark a cell as available to the formula builder.
 *
 * The builder only lets the author click marked cells. Without that filter
 * every cell of an 8×5 table is a candidate target, and the label column and
 * header row — which are never calculated — are the easiest to hit by mistake.
 * Marking is deliberately a separate, explicit step.
 */
export function setCellCalc(grid, rowKey, columnKey, on) {
  return {
    ...grid,
    rows: grid.rows.map((r) => {
      if (r.key !== rowKey) return r;
      const calc = { ...(r.calc || {}) };
      if (on) calc[columnKey] = true; else delete calc[columnKey];
      return { ...r, calc };
    }),
  };
}

export const isCellCalc = (row, columnKey) => !!row?.calc?.[columnKey];

/** How many cells are available to the formula builder. */
export const calcCellCount = (grid) =>
  (grid?.rows || []).reduce((n, r) => n + Object.keys(r.calc || {}).length, 0);

/** Per-row assessor options — the marking scheme for that table row. */
export function addRowAssessorOption(grid, rowKey) {
  return updateRowOptions(grid, rowKey, (opts) => [...opts, emptyAssessorOption()]);
}

export function removeRowAssessorOption(grid, rowKey, optionKey) {
  return updateRowOptions(grid, rowKey, (opts) => opts.filter((o) => o.key !== optionKey));
}

export function updateRowAssessorOption(grid, rowKey, optionKey, patch) {
  return updateRowOptions(grid, rowKey, (opts) =>
    opts.map((o) => (o.key === optionKey ? { ...o, ...patch } : o)));
}

function updateRowOptions(grid, rowKey, fn) {
  return {
    ...grid,
    rows: grid.rows.map((r) =>
      r.key === rowKey ? { ...r, assessorOptions: fn(r.assessorOptions || []) } : r),
  };
}

const colIndexOf = (grid, columnKey) => grid.columns.findIndex((c) => c.key === columnKey);

/* ── Stored-shape translation ──────────────────────────────────────────── */

const cell = (val, type) => ({ val: val ?? '', type: type || 'text' });

/**
 * Editor model -> stored array.
 * `index` is the sub-answer's position, which the stored shape uses as the key
 * holding the row array.
 */
export function toStoredGrid(grid, index) {
  if (!grid) return null;

  const header = { '00': grid.rowHeaderLabel || '' };
  grid.columns.forEach((c, ci) => { header[`0${ci + 1}`] = cell(c.label, 'text'); });

  const rows = grid.rows.map((r, ri) => {
    const R = ri + 1;
    const out = { [`${R}0`]: cell(r.label, 'text') };
    grid.columns.forEach((c, ci) => {
      out[`${R}${ci + 1}`] = {
        ...cell(r.cells?.[c.key], c.type),
        disabled: !!r.disabled,
        // Marks the cell as available to the formula builder. Kept on the cell
        // rather than in a side list so a column insert carries it along with
        // the value it belongs to.
        isCalc: !!r.calc?.[c.key],
      };
    });
    out.assessorOption = (r.assessorOptions || []).map((o) =>
      toStoredAssessorOption({ ...o, assessorOptionType: r.assessorOptionType }));
    return out;
  });

  return {
    [String(index)]: [header, ...rows],
    // Already in the stored token shape — the builder writes it directly, so
    // there is nothing to convert and no second representation to keep in sync.
    gridFormulas: grid.formulas || [],
  };
}

/** Stored array -> editor model. Tolerates missing cells and ragged rows. */
export function fromStoredGrid(sub, index) {
  const stored = sub?.[String(index)] || sub?.grid?.gridValue;
  if (!Array.isArray(stored) || stored.length === 0) return null;

  const [header, ...dataRows] = stored;

  const columnKeys = Object.keys(header || {})
    .filter((k) => /^0\d+$/.test(k) && k !== '00')
    .sort((a, b) => Number(a) - Number(b));

  const columns = columnKeys.map((k, i) => {
    const h = header[k];
    // The editor type lives on the data cells, not the header cell.
    const firstData = dataRows[0]?.[`1${i + 1}`];
    return {
      ...emptyGridColumn(typeof h === 'string' ? h : h?.val || ''),
      type: firstData?.type || 'text',
    };
  });

  const rows = dataRows.map((row, ri) => {
    const R = ri + 1;
    const cells = {};
    const calc = {};
    columns.forEach((c, ci) => {
      const stored = row?.[`${R}${ci + 1}`];
      cells[c.key] = stored?.val ?? '';
      if (stored?.isCalc === true) calc[c.key] = true;
    });
    return {
      ...emptyGridRow(columns),
      cells,
      calc,
      label: row?.[`${R}0`]?.val ?? '',
      disabled: !!row?.[`${R}0`]?.disabled,
      assessorOptions: (row?.assessorOption || []).map(fromStoredAssessorOption),
    };
  });

  return {
    rowHeaderLabel: typeof header['00'] === 'string' ? header['00'] : header['00']?.val || '',
    columns,
    rows: rows.length ? rows : [emptyGridRow(columns)],
    formulas: sub?.gridFormulas || [],
  };
}

/* ── Assessor options ──────────────────────────────────────────────────── */

const numOrBlank = (v) => (v === '' || v === null || v === undefined ? '' : Number(v));

export function toStoredAssessorOption(option) {
  return {
    assessorOptionType: option.assessorOptionType || '',
    assessorGuidence: option.assessorGuidance || '',
    option: option.option || '',
    isSelected: false,
    marksnotapplicable: !!option.marksNotApplicable,
    marks: numOrBlank(option.marks),
    subOption: (option.subOptions || []).map((s) => ({
      option: s.option || '',
      isSelected: false,
      marksnotapplicable: !!s.marksNotApplicable,
      marks: numOrBlank(s.marks),
    })),
  };
}

export function fromStoredAssessorOption(stored) {
  return {
    ...emptyAssessorOption(),
    option: stored?.option || '',
    marks: stored?.marks === '' || stored?.marks == null ? '' : String(stored.marks),
    marksNotApplicable: !!stored?.marksnotapplicable,
    assessorGuidance: stored?.assessorGuidence || '',
    subOptions: (stored?.subOption || []).map((s) => ({
      key: `${Math.abs(Number(s?.marks) || 0)}_${s?.option || ''}`.slice(0, 40) || 'so',
      option: s?.option || '',
      marks: s?.marks === '' || s?.marks == null ? '' : String(s.marks),
      marksNotApplicable: !!s?.marksnotapplicable,
    })),
  };
}
