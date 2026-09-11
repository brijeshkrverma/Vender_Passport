const router = require('express').Router();
const ctrl = require('./report.controller');
const { authenticate } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { tenantIsolation } = require('../../middleware/tenant');

const reportRoles = ['Super Admin','Organization Admin','Compliance Manager','Audit Manager','Risk Manager','CA / Consultant'];

router.get('/summary', authenticate, tenantIsolation, restrictTo(...reportRoles), ctrl.summary);
router.get('/export/:type', authenticate, tenantIsolation, restrictTo(...reportRoles), ctrl.exportCsv);

module.exports = router;
