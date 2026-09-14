function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  // Default 10, matching the frontend's `usePaginatedApi`. A caller that asks
  // for more still gets it, up to 100.
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function parseSort(query, defaultField = 'createdAt', defaultOrder = -1) {
  const sortField = query.sort || defaultField;
  const sortOrder = query.order === 'asc' ? 1 : defaultOrder;
  return { [sortField]: sortOrder };
}

module.exports = { parsePagination, parseSort };
