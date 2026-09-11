function success(res, data, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...meta },
  });
}

function paginated(res, data, { page, limit, total }) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    meta: { timestamp: new Date().toISOString() },
  });
}

function created(res, data) {
  return success(res, data, {}, 201);
}

function noContent(res) {
  return res.status(204).send();
}

module.exports = { success, paginated, created, noContent };
