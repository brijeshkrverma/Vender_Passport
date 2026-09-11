/**
 * Escapes HTML characters in a string to prevent XSS.
 * Returns an empty string for falsy values.
 *
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
