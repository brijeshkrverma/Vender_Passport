function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function parseSort(query, defaultField = 'createdAt', defaultOrder = -1) {
  const sortField = query.sort || defaultField;
  const sortOrder = query.order === 'asc' ? 1 : defaultOrder;
  return { [sortField]: sortOrder };
}

module.exports = { parsePagination, parseSort };
