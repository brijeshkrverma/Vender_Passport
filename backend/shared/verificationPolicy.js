const { ForbiddenError, ValidationError } = require('./errors');

const DECISIONS = ['Verified', 'Rejected'];

/**
 * Independence rules for attesting to a piece of evidence, kept free of any
 * database dependency so the policy itself is directly testable.
 *
 * Throws when the attestation must not proceed; returns silently otherwise.
 */
function assertCanVerify({ uploadedBy, verificationStatus }, verifierId, decision = 'Verified') {
  if (!DECISIONS.includes(decision)) {
    throw new ValidationError([{ field: 'decision', message: "Decision must be 'Verified' or 'Rejected'" }]);
  }

  if (verificationStatus === 'Verified') {
    throw new ValidationError([{ field: 'verificationStatus', message: 'Evidence already verified' }]);
  }

  // An unattributable attestation is worthless in an audit file.
  if (!verifierId) {
    throw new ForbiddenError('Cannot verify evidence without an identified reviewer');
  }

  // Segregation of duties: supplying evidence and attesting to it are different
  // jobs. Without this an auditor — or the audited vendor's own user — could
  // mark their own upload "Verified".
  if (uploadedBy && String(uploadedBy) === String(verifierId)) {
    throw new ForbiddenError('You cannot verify evidence that you uploaded yourself');
  }
}

module.exports = { assertCanVerify, DECISIONS };
