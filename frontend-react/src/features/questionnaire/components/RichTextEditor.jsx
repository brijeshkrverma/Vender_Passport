import { useRef, useEffect, useState } from 'react';

/**
 * Rich text editor — the @kolkov/angular-editor replacement.
 *
 * Deliberately dependency-free: the stored questions are plain HTML fragments
 * (`<font size="3">…`, `<p class="MsoNormal">…` pasted out of Word), so the
 * requirement is faithful HTML in and out, not a document model. A heavier
 * editor would normalise that markup on load and silently rewrite thousands of
 * existing questions.
 *
 * `document.execCommand` is formally deprecated but is still the only
 * cross-browser contentEditable formatting API, and is what the original used.
 * It is isolated here so replacing it later touches one file.
 */

const TOOLBAR = [
  { cmd: 'bold', label: 'B', title: 'Bold', className: 'font-bold' },
  { cmd: 'italic', label: 'I', title: 'Italic', className: 'italic' },
  { cmd: 'underline', label: 'U', title: 'Underline', className: 'underline' },
  { cmd: 'insertUnorderedList', label: '•', title: 'Bulleted list' },
  { cmd: 'insertOrderedList', label: '1.', title: 'Numbered list' },
  { cmd: 'justifyLeft', label: '⭰', title: 'Align left' },
  { cmd: 'justifyCenter', label: '⭤', title: 'Align center' },
  { cmd: 'removeFormat', label: '⌫', title: 'Clear formatting' },
];

export default function RichTextEditor({
  value = '',
  onChange,
  onBlur,
  placeholder = 'Enter text here...',
  // Grows with what is typed. A fixed 10rem box meant an empty question
  // reserved 160px of blank space on a form that was already too long.
  minHeight = '6.5rem',
  invalid = false,
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  // Write into the DOM only when the incoming value genuinely differs from
  // what is on screen. Assigning innerHTML on every keystroke would move the
  // caret to the start of the field on each character typed.
  useEffect(() => {
    const el = ref.current;
    if (el && value !== el.innerHTML) el.innerHTML = value || '';
  }, [value]);

  const exec = (cmd) => {
    ref.current?.focus();
    document.execCommand(cmd, false, undefined);
    onChange(ref.current?.innerHTML || '');
  };

  const isEmpty = !value || value.replace(/<[^>]*>/g, '').trim() === '';

  return (
    <div
      className={`overflow-hidden rounded-[6px] border bg-white transition-colors ${
        invalid ? 'border-[#ff0000]' : focused ? 'border-[#86b7fe]' : 'border-[#ced4da]'
      }`}
    >
      <div className="flex flex-wrap items-center gap-[2px] border-b border-[#e6e9ec] bg-[#fafbfc] px-2 py-[5px]">
        {TOOLBAR.map((btn) => (
          <button
            key={btn.cmd}
            type="button"
            title={btn.title}
            // Keep focus in the editable area so the command applies to the
            // current selection instead of being lost on button focus.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(btn.cmd)}
            className={`h-[26px] min-w-[28px] rounded-[4px] px-[6px] text-[13px] text-[#41474d] transition-colors hover:bg-[#e9edf1] ${btn.className || ''}`}
          >
            {btn.label}
          </button>
        ))}

        <select
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (!e.target.value) return;
            ref.current?.focus();
            document.execCommand('formatBlock', false, e.target.value);
            onChange(ref.current?.innerHTML || '');
            e.target.value = '';
          }}
          className="ml-1 h-[26px] rounded-[4px] border border-[#dde1e5] bg-white px-1 text-[12px] text-[#41474d]"
          defaultValue=""
        >
          <option value="">Format</option>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>

      <div className="relative">
        {isEmpty && !focused && (
          <span className="pointer-events-none absolute left-3 top-[10px] text-[14px] text-[#a6acb3]">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          style={{ minHeight }}
          className="px-3 py-[10px] text-[14px] leading-[1.6] text-[#212529] outline-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
        />
      </div>
    </div>
  );
}
