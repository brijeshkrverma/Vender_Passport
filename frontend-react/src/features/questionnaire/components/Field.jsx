/**
 * Shared field chrome: label, required marker, control slot, error line.
 *
 * Every control on the page goes through this so the label/error treatment can
 * never drift between the basic block and the nested answer cards.
 */

/** Bootstrap-equivalent input styling, matched to the original screen. */
export const inputClass =
  'w-full rounded-[6px] border border-[#ced4da] bg-white px-3 py-[7px] text-[14px] ' +
  'text-[#212529] placeholder:text-[#a6acb3] outline-none transition-colors ' +
  'focus:border-[#86b7fe] focus:ring-2 focus:ring-[#0d6efd]/15 disabled:bg-[#e9ecef]';

export const labelClass = 'mb-[6px] block text-[14px] text-[#41474d]';

export function FieldError({ message }) {
  if (!message) return null;
  return <div className="mt-1 text-[12px] text-[#ff0000]">{message}</div>;
}

/**
 * `anchor` is the field's error key (`maxMark`, `answers.0.answerLabel`).
 *
 * It doubles as the DOM id, which is what lets "9 fields need attention" become
 * a button that puts the caret in the first of them. Without an anchor the
 * count is a number the author then has to go hunting for, on a form long
 * enough that hunting is the whole problem.
 *
 * `scroll-mt` clears the sticky topbar; jumping without it lands with the
 * label hidden behind the header.
 */
export default function Field({ label, required, error, className = '', children, hint, anchor }) {
  return (
    <div
      id={anchor ? `field-${anchor}` : undefined}
      className={`mb-3 scroll-mt-[90px] ${className}`}
    >
      {label && (
        <label className={labelClass}>
          {label}
          {required && <span className="text-[#ff0000]">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="mt-1 text-[11px] text-[#9aa0a6]">{hint}</div>}
      <FieldError message={error} />
    </div>
  );
}
