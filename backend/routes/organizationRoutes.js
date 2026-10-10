const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { tenantMiddleware, requireRole } = require('../middleware/tenantMiddleware');
const {
  getCurrentOrganization,
  getUserOrganizations,
  createOrganization,
  addMember,
  getUsageMetrics,
} = require('../controllers/organizationController');

router.use(protect);
router.use(tenantMiddleware);

router.get('/', getUserOrganizations);
router.post('/', createOrganization);
router.get('/current', getCurrentOrganization);
router.get('/usage', getUsageMetrics);
router.post('/members', requireRole(['org_admin', 'manager']), addMember);

module.exports = router;
