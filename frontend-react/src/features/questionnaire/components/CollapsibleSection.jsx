import { useState, useEffect } from 'react';

/**
 * Optional block that starts closed.
 *
 * The authoring form carries a lot of fields that most questions never use —
 * assessor marking, tooltips, grid formulas. Showing all of them at once is why
 * the original screen simply omitted them; collapsing keeps the common path as
 * short as it was while making the rest reachable.
 *
 * `count` surfaces what is inside, so a closed section never hides work.
 */
export default function CollapsibleSection({
  title, subtitle, count = 0, defaultOpen = false, tone = 'plain', hasError = false, children,
}) {
  const [open, setOpen] = useState(defaultOpen || hasError);

  /**
   * A problem inside a closed block opens it.
   *
   * Errors appear on submit, after this has already mounted closed — so a
   * mount-time default is not enough. Leaving it closed would both hide the
   * problem and leave the field out of the DOM, which is where "go to the first
   * error" would then fail silently.
   *
   * It only ever opens: an author who closed a section while fixing something
   * should not have it spring shut under them.
   */
  useEffect(() => { if (hasError) setOpen(true); }, [hasError]);

  const shell = tone === 'tint'
    ? 'rounded-[8px] bg-[#0000ff08]'
    : 'rounded-[8px] border border-[#e6e9ec] bg-white';

  return (
    <div className={`my-3 ${shell}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-[10px] text-left"
      >
        <span className={`text-[11px] leading-none text-[#7c7d7e] transition-transform ${open ? 'rotate-90' : ''}`}>
          &#9654;
        </span>
        <span className="text-[13px] font-semibold text-[#002850]">{title}</span>
        {count > 0 && (
          <span className="rounded-[10px] bg-[#e6edf4] px-[7px] py-[1px] text-[11px] font-semibold text-[#002850]">
            {count}
          </span>
        )}
        {hasError && (
          <span className="rounded-[10px] bg-[#fbeae7] px-[7px] py-[1px] text-[11px] font-semibold text-[#b0362a]">
            needs attention
          </span>
        )}
        {subtitle && <span className="ml-auto text-[11px] text-[#9aa0a6]">{subtitle}</span>}
      </button>

      {open && <div className="border-t border-[#eceff1] px-4 py-3">{children}</div>}
    </div>
  );
}
