const router = require('express').Router();
const { auditTrail } = require('../../shared/auditTrail');
const ctrl = require('./notification.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');

// The browser's EventSource API cannot set an Authorization header, so the SSE
// endpoint — and only that endpoint — also accepts the token as a query
// parameter. It is promoted into the normal header here so `authenticate` stays
// the single place that validates tokens. Scoped to /stream on purpose: a
// general query-token fallback would leak credentials into access logs,
// referrers and browser history for every route.
router.use('/stream', (req, res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});

router.use(authenticate, tenantIsolation, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager', 'Auditor', 'Reviewer', 'Risk Manager', 'Document Manager', 'Vendor Manager', 'Employee', 'External Company User', 'CA / Consultant'));
router.use(auditTrail('Notification'));

router.get('/unread-count', ctrl.getUnreadCount);
router.get('/stream', ctrl.stream);
router.post('/mark-all-read', ctrl.markAllRead);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.patch('/:id/read', ctrl.markAsRead);
router.delete('/:id', ctrl.delete);

module.exports = router;
