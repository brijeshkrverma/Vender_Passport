import { useState, useRef, useEffect } from 'react';

/**
 * Token select — the ng-select replacement.
 *
 * Handles both the single and multiple cases because the original screen used
 * the same widget for both (`[multiple]="true"` on Type, plain on Category),
 * and keeping one component keeps the two visually identical.
 */
export default function MultiSelect({
  options = [],
  value,
  onChange,
  onBlur,
  multiple = false,
  placeholder = 'Select',
  invalid = false,
  searchable = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  const selected = multiple ? (value || []) : (value ? [value] : []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onBlur]);

  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const pick = (option) => {
    if (multiple) {
      const next = selected.includes(option.value)
        ? selected.filter((v) => v !== option.value)
        : [...selected, option.value];
      onChange(next);
    } else {
      onChange(option.value);
      setOpen(false);
      setQuery('');
      onBlur?.();
    }
  };

  const clearOne = (e, v) => {
    e.stopPropagation();
    onChange(multiple ? selected.filter((x) => x !== v) : '');
  };

  const labelOf = (v) => options.find((o) => o.value === v)?.label ?? v;

  return (
    <div ref={boxRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}
        className={`flex min-h-[38px] w-full cursor-pointer flex-wrap items-center gap-1 rounded-[6px] border bg-white px-2 py-1 text-[14px] transition-colors ${
          invalid ? 'border-[#ff0000]' : open ? 'border-[#86b7fe]' : 'border-[#ced4da]'
        }`}
      >
        {selected.length === 0 && (
          <span className="px-1 text-[#a6acb3]">{placeholder}</span>
        )}

        {selected.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-[2px] border border-[#c2e0ff] bg-[#ebf5ff] px-[6px] py-[2px] text-[13px] text-[#0f1b2d]"
          >
            {labelOf(v)}
            <button
              type="button"
              onClick={(e) => clearOne(e, v)}
              className="text-[#5a7896] hover:text-[#b0362a]"
              aria-label={`Remove ${labelOf(v)}`}
            >
              &times;
            </button>
          </span>
        ))}

        <span className="ml-auto select-none pr-1 text-[10px] text-[#7c7d7e]">&#9660;</span>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-30 max-h-[240px] overflow-y-auto rounded-[6px] border border-[#ced4da] bg-white shadow-lg">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full border-b border-[#eceff1] px-3 py-2 text-[13px] outline-none"
            />
          )}
          {visible.length === 0 && (
            <div className="px-3 py-3 text-[13px] text-[#9aa0a6]">No items found</div>
          )}
          {visible.map((option) => {
            const isOn = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => pick(option)}
                className={`flex w-full items-center gap-2 px-3 py-[7px] text-left text-[14px] transition-colors hover:bg-[#f5f8fb] ${
                  isOn ? 'bg-[#ebf5ff] text-[#0f1b2d]' : 'text-[#41474d]'
                }`}
              >
                {multiple && (
                  <span
                    className={`flex h-[14px] w-[14px] items-center justify-center rounded-[3px] border text-[10px] leading-none ${
                      isOn ? 'border-[#002850] bg-[#002850] text-white' : 'border-[#ced4da]'
                    }`}
                  >
                    {isOn ? '✓' : ''}
                  </span>
                )}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
