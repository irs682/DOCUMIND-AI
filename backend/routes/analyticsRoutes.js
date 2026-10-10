const express = require('express');
const { getAnalyticsOverview } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/overview', protect, getAnalyticsOverview);

module.exports = router;
