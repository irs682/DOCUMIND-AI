const express = require('express');
const {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAllDocuments,
  deleteAdminDocument,
  getAIMonitoringStats,
  getAuditLogs,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes protected by JWT and Admin Role Access Control (RBAC)
router.use(protect, adminOnly);

router.get('/dashboard-stats', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.get('/documents', getAllDocuments);
router.delete('/documents/:id', deleteAdminDocument);
router.get('/ai-monitoring', getAIMonitoringStats);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
