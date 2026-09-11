/**
 * SECTION RAIL — navigation, progress and error location in one column.
 *
 * The column this replaces held a heading, one line of caption, and then two
 * thousand pixels of nothing, while the form beside it ran long enough that the
 * Submit button scrolled out of reach and "7 fields need attention" appeared at
 * the very bottom with no way to find which seven.
 *
 * So the rail does the three things that were missing: says where you are,
 * says what is wrong and where, and gets you there in one click.
 */
export default function SectionRail({ sections, activeId, onJump }) {
  return (
    <nav className="space-y-[2px]">
      {sections.map((s) => {
        const active = s.id === activeId;
        const hasErrors = s.errors > 0;

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onJump(s.id)}
            className={`group flex w-full items-start gap-[10px] rounded-[7px] px-[10px] py-[9px] text-left transition-colors ${
              active ? 'bg-[#eef3f8]' : 'hover:bg-[#f5f7f9]'
            }`}
          >
            {/*
              One dot carries three states, because three separate badges in a
              narrow column is noise: red = something is wrong, filled = done,
              hollow = not started.
            */}
            <span
              className={`mt-[3px] flex h-[13px] w-[13px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[8px] font-bold leading-none ${
                hasErrors ? 'border-[#b0362a] bg-[#b0362a] text-white'
                  : s.complete ? 'border-[#1f7a4d] bg-[#1f7a4d] text-white'
                    : 'border-[#c6cdd9] bg-white'
              }`}
            >
              {hasErrors ? '!' : s.complete ? '✓' : ''}
            </span>

            <span className="min-w-0 flex-1">
              <span className={`block text-[12.5px] leading-tight ${active ? 'font-semibold text-[#002850]' : 'font-medium text-[#41474d]'}`}>
                {s.title}
              </span>
              {hasErrors ? (
                <span className="mt-[2px] block text-[11px] text-[#b0362a]">
                  {s.errors} need{s.errors === 1 ? 's' : ''} attention
                </span>
              ) : s.summary ? (
                <span className="mt-[2px] block truncate text-[11px] text-[#9aa0a6]">{s.summary}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
