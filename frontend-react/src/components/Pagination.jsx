/**
 * Row count, and page buttons when there is more than one page.
 *
 * The whole bar used to disappear below two pages, which took the count with
 * it: a list of ten was indistinguishable from a list of ten thousand cut off
 * at ten. The buttons are what become pointless on a single page — the count
 * never does.
 */
export default function Pagination({ page, totalPages, total, onPageChange, limit }) {
  if (total === undefined || total === null) return null;

  const pages = Array.from({ length: totalPages || 1 }, (_, i) => i + 1);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-paper/30">
      <div className="text-[11px] text-gray-500">
        {total === 0 ? 'No records' : `Showing ${start}–${end} of ${total}`}
      </div>
      {totalPages > 1 && (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2.5 py-1 text-xs rounded border border-border bg-surface disabled:opacity-40 hover:bg-paper"
        >
          Prev
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[28px] px-2 py-1 text-xs rounded border ${
              p === page
                ? 'bg-seal text-white border-seal'
                : 'border-border bg-surface hover:bg-paper text-ink-900'
            }`}
          >
            {p}
        </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2.5 py-1 text-xs rounded border border-border bg-surface disabled:opacity-40 hover:bg-paper"
        >
          Next
        </button>
      </div>
      )}
    </div>
  );
}
