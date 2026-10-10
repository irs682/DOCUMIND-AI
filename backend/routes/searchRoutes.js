const express = require('express');
const { searchDocuments } = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/query', protect, searchDocuments);

module.exports = router;
