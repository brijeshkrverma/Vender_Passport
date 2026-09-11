import { cellRef, refKey } from '../../services/valueRef';

/**
 * The respondent's view of a grid.
 *
 * Renders the stored row array directly — `[header, ...rows]`, cells keyed
 * `"11"` — because that is the coordinate space formulas address. Row 0 is the
 * header and column 0 is the row label; neither is answerable.
 *
 * A cell a formula writes is filled in and read-only. Leaving it editable would
 * let the respondent type a number that the next recalculation silently
 * discards, which reads as the form losing their work.
 */
export default function GridInput({
  rows = [],
  answerKey,
  subKey,
  computedKeys = new Set(),
  disabled = false,
  onCellChange,
}) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const colCount = Object.keys(rows[0] || {})
    .filter((k) => /^0\d+$/.test(k)).length;

  const cellOf = (row, r, c) => {
    const raw = row?.[`${r}${c}`];
    if (raw === undefined || raw === null) return { val: '', type: 'text' };
    return typeof raw === 'object' ? raw : { val: raw, type: 'text' };
  };

  return (
    <div className="overflow-x-auto rounded-[6px] border border-[#e6e9ec]">
      <table className="w-full border-collapse text-[13px]">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className={r === 0 ? 'bg-[#f6f8fa]' : ''}>
              {Array.from({ length: colCount + 1 }, (_, c) => {
                const cell = cellOf(row, r, c);
                const isHeader = r === 0;
                const isLabel = c === 0;
                const computed = computedKeys.has(refKey(cellRef(answerKey, subKey, r, c)));

                // Header row and label column carry the author's wording; they
                // are read, not filled.
                if (isHeader || isLabel) {
                  return (
                    <td
                      key={c}
                      className={`border-b border-r border-[#e6e9ec] px-3 py-[9px] last:border-r-0 ${
                        isHeader ? 'font-semibold text-[#002850]' : 'text-[#41474d]'
                      }`}
                    >
                      {cell.val || (isHeader ? '' : '—')}
                    </td>
                  );
                }

                return (
                  <td key={c} className="border-b border-r border-[#e6e9ec] p-0 last:border-r-0">
                    {computed ? (
                      <div
                        title="Calculated automatically"
                        className="flex h-full items-center gap-1 bg-[#fbf3e4] px-3 py-[9px] text-[#8c6526]"
                      >
                        <span className="text-[10px] font-semibold">fx</span>
                        <span>{cell.val === '' ? '—' : cell.val}</span>
                      </div>
                    ) : cell.type === 'dropdown' ? (
                      <select
                        disabled={disabled}
                        value={cell.val ?? ''}
                        onChange={(e) => onCellChange(r, c, e.target.value)}
                        className="w-full border-0 bg-transparent px-3 py-[9px] outline-none disabled:text-[#9aa0a6]"
                      >
                        <option value="">—</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="N/A">N/A</option>
                      </select>
                    ) : (
                      <input
                        type={cell.type === 'number' ? 'number' : 'text'}
                        disabled={disabled}
                        value={cell.val ?? ''}
                        onChange={(e) => onCellChange(r, c, e.target.value)}
                        className="w-full border-0 bg-transparent px-3 py-[9px] outline-none focus:bg-[#f4f8fc] disabled:text-[#9aa0a6]"
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
