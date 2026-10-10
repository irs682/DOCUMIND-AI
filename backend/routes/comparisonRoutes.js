const express = require('express');
const {
  initiateComparison,
  getComparisons,
  getComparisonById,
  deleteComparison,
} = require('../controllers/comparisonController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, initiateComparison);
router.get('/', protect, getComparisons);
router.get('/:id', protect, getComparisonById);
router.delete('/:id', protect, deleteComparison);

module.exports = router;
