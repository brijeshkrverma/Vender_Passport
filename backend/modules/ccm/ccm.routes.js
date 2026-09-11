const router = require('express').Router();
const ctrl = require('./ccm.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');

router.use(authenticate, tenantIsolation, restrictTo('Super Admin', 'Organization Admin', 'Compliance Manager'));

router.get('/dashboard', ctrl.dashboard);
router.get('/alerts', ctrl.alerts);

module.exports = router;
