/**
 * THE AUDIT LIFECYCLE — the one list.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 *
 * These twelve labels were written out by hand in five separate places: the
 * model's status enum, the service's stage machine, the assistant's "which
 * statuses count as active", the detail screen's stepper, and a test. Five
 * copies of an ordered list is five chances for one of them to be edited alone,
 * and the failure is silent: a stage renamed in the model but not the service
 * produces a status the schema rejects, which is exactly how six of the twelve
 * stages once became unreachable (`tests/unit/audit-lifecycle.test.js`).
 *
 * Everything on the server now reads this. The stepper in
 * `frontend-react/src/pages/AuditDetail.jsx` cannot — it is an ES module and
 * this is CommonJS — so it keeps its own copy and
 * `tests/unit/audit-lifecycle.test.js` asserts the two are identical. That is
 * the same arrangement, and the same reasoning, as `backend/scoring/engines.js`.
 *
 * ── ORDER IS THE CONTRACT ─────────────────────────────────────────────────
 *
 * `stageIdx` on an audit is an index into this array. Inserting or reordering a
 * stage renumbers every audit already in the database, so a change here is a
 * migration, not an edit.
 */

const LIFECYCLE = [
  'Planning',
  'Scoping',
  'Risk Assessment',
  'Questionnaire',
  'Auditor Assigned',
  'Execution',
  'Evidence Review',
  'Findings',
  'Corrective Actions',
  'Verification',
  'Report',
  'Closed',
];

/** The terminal stage. An audit here is finished and cannot advance. */
const CLOSED = LIFECYCLE[LIFECYCLE.length - 1];

/**
 * Every stage except the terminal one — "still being worked on".
 *
 * Derived rather than listed, so adding a stage cannot leave the assistant
 * quietly treating it as closed.
 */
const ACTIVE_STATUSES = LIFECYCLE.slice(0, -1);

/**
 * The label for a stage index, clamped to the end.
 *
 * Clamped because seed data carries values such as `stageIdx: 25`; returning
 * `undefined` there fails schema validation on save rather than at the point
 * the bad index was introduced.
 */
function statusForStage(stageIdx) {
  return LIFECYCLE[Math.min(Math.max(0, stageIdx | 0), LIFECYCLE.length - 1)];
}

/** How far along, 0-100 — the same number the list and the detail page show. */
function progressPercent(stageIdx) {
  const idx = Math.min(Math.max(0, stageIdx | 0), LIFECYCLE.length - 1);
  return Math.round(((idx + 1) / LIFECYCLE.length) * 100);
}

module.exports = { LIFECYCLE, CLOSED, ACTIVE_STATUSES, statusForStage, progressPercent };
