/**
 * Honest data-state notices.
 *
 * Several pages used to fall back to hard-coded rows when their API call
 * failed, which made a broken backend look like real organisational data — the
 * worst possible outcome on a compliance screen. Pages now either show the real
 * data, an explicit error, or an explicitly-labelled sample.
 */

/** The API call failed. Say so, and offer a retry. */
export function ApiErrorState({ message, onRetry, entity = 'data' }) {
  return (
    <div
      role="alert"
      className="bg-surface border border-danger/30 rounded-lg p-8 text-center"
    >
      <div className="text-sm font-semibold text-danger mb-1">
        Could not load {entity}
      </div>
      <div className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
        {message || 'The server did not respond as expected. No data is shown rather than showing something inaccurate.'}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold border border-border rounded-lg px-4 py-2 hover:bg-paper"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** There is genuinely nothing to show yet. */
export function EmptyState({ title, hint }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-12 text-center">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      {hint && <div className="text-xs text-gray-400">{hint}</div>}
    </div>
  );
}

/**
 * This screen shows illustrative content, not the viewer's own records.
 * Always render it ABOVE the content it describes.
 */
export function SampleDataBanner({ feature }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-bg/30 px-4 py-2.5">
      <span aria-hidden="true" className="text-warning text-sm leading-5">◆</span>
      <div className="text-[11.5px] leading-relaxed text-ink-900">
        <b>Sample data.</b>{' '}
        {feature || 'This screen'} is not connected to your organization yet — the rows below are
        illustrative examples and must not be used for reporting or evidence.
      </div>
    </div>
  );
}
