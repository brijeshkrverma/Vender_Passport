/**
 * A titled band of the form.
 *
 * Carries the anchor the section rail scrolls to, and gives the twelve basic
 * fields a visible structure — previously they ran as one undifferentiated
 * column, so finding "Max Marks" meant reading every label on the way down.
 *
 * `scroll-mt` keeps the heading clear of the sticky topbar when jumped to;
 * without it the rail lands you with the title hidden behind the header.
 */
export default function FormSection({ id, title, hint, aside, children }) {
  return (
    <section id={id} className="scroll-mt-[80px] border-t border-[#eceff1] pt-5 first:border-t-0 first:pt-0">
      <header className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <h4 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#002850]">
            {title}
          </h4>
          {hint && <p className="mt-[3px] text-[12px] text-[#9aa0a6]">{hint}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}
