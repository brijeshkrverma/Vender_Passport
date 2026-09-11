/**
 * Id filter helper.
 *
 * KYUN CHAHIYE
 *   `applicantquestionnaires.applicant_id` collection me ObjectId hai, lekin
 *   command line se hamesha string aata hai. Seedha `{applicant_id: "66cf..."}`
 *   lagane par kuch match nahi hota aur script "nahi mila" bol deti hai —
 *   jabki document maujood hota hai.
 *
 *   Ye helper dono roop try karta hai (ObjectId aur string), taaki data kis
 *   type me store hai us par script na atke.
 *
 * `financialYear` bhi kuch documents me undefined hai — isliye FY filter tabhi
 * lagana jab user ne explicitly maanga ho.
 */

const { ObjectId } = require('mongodb');

/**
 * Ek id ke liye aisa filter banata hai jo ObjectId aur string dono match kare.
 * @param {string} field  e.g. 'applicant_id'
 * @param {string} value
 * @returns {object|null} mongo filter ka ek hissa, ya null agar value khali hai
 */
function idMatch(field, value) {
  if (!value) return null;
  const variants = [String(value)];
  try {
    variants.push(new ObjectId(String(value)));
  } catch (_e) {
    // valid ObjectId nahi hai — sirf string se match karenge
  }
  return { [field]: { $in: variants } };
}

/**
 * Applicant + FY ka poora filter banata hai.
 * @param {{applicant?: string, fy?: string}} opts
 */
function buildApplicantFilter(opts = {}) {
  const filter = {};
  const idPart = idMatch('applicant_id', opts.applicant);
  if (idPart) Object.assign(filter, idPart);
  if (opts.fy) filter.financialYear = opts.fy;
  return filter;
}

module.exports = { idMatch, buildApplicantFilter };
