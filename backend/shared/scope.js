function orgFilter(orgId) {
  return orgId ? { orgId, deletedAt: null } : { deletedAt: null };
}

function byIdQuery(orgId, id) {
  return orgId ? { _id: id, orgId, deletedAt: null } : { _id: id, deletedAt: null };
}

function escapeRegex(string) {
  return string ? string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') : '';
}

module.exports = { orgFilter, byIdQuery, escapeRegex };

