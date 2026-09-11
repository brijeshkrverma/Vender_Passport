/**
 * Single source of truth for role names and who may grant them.
 *
 * Rationale: role strings were previously duplicated across zod schemas, the
 * user model and every route file, and the public /register endpoint accepted
 * an arbitrary role string — which allowed anyone to self-assign 'Super Admin'
 * and, because tenant isolation exempts Super Admin, read and write every
 * tenant's data. Grant rules live here so they cannot drift apart again.
 */

const ALL_ROLES = [
  'Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager',
  'Auditor', 'Reviewer', 'Risk Manager', 'Document Manager', 'Vendor Manager',
  'Employee', 'External Company User', 'CA / Consultant',
];

/**
 * Roles a person may pick for themselves at public sign-up.
 *
 * 'Super Admin' is never here: it bypasses tenant isolation entirely, so
 * self-assigning it is a full platform compromise. 'Organization Admin' IS
 * allowed, but only because sign-up always provisions a brand-new, empty
 * organization — that admin can never reach an existing tenant.
 */
const SELF_SIGNUP_ROLES = [
  'Organization Admin', 'Compliance Manager', 'Audit Manager',
  'Auditor', 'Vendor Manager', 'External Company User', 'CA / Consultant',
];

/** Roles that are never self-assignable, whatever the request says. */
const PRIVILEGED_ROLES = ['Super Admin'];

/**
 * Roles that may be staffed onto an audit as an auditor.
 *
 * Assignment used to accept any typed-in string, so audits could name people
 * who do not exist or who have no audit role at all. Both the picker the UI
 * offers and the server-side check read this one list.
 */
const ASSIGNABLE_AUDITOR_ROLES = ['Auditor', 'Audit Manager', 'CA / Consultant'];

/** Only a Super Admin may create or promote another Super Admin. */
function canGrantRole(actorRole, targetRole) {
  if (PRIVILEGED_ROLES.includes(targetRole)) return actorRole === 'Super Admin';
  return actorRole === 'Super Admin' || actorRole === 'Organization Admin';
}

module.exports = {
  ALL_ROLES, SELF_SIGNUP_ROLES, PRIVILEGED_ROLES, ASSIGNABLE_AUDITOR_ROLES, canGrantRole,
};
