const { ValidationError } = require('../shared/errors');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(new ValidationError(errors));
    }
    // Preserve orgId — tenant isolation is enforced by middleware/services, not entity schemas.
    // Only when the schema explicitly declares orgId: register (self-signup) must NOT trust a client-supplied orgId.
    const data = result.data;
    if (source === 'body' && req.body && req.body.orgId !== undefined && schema.shape && schema.shape.orgId !== undefined) {
      data.orgId = req.body.orgId;
    }
    req[source] = data; // replace with sanitized data
    next();
  };
}

module.exports = { validate };
