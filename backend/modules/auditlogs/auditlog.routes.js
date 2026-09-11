const router = require('express').Router();
const ctrl = require('./auditlog.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');

router.use(authenticate, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager', 'Audit Manager'));
router.get('/', tenantIsolation, ctrl.list);

module.exports = router;
