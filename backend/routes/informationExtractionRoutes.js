const express = require('express');
const {
  initiateInformationExtraction,
  getInformationExtractionById,
  deleteInformationExtraction,
} = require('../controllers/informationExtractionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, initiateInformationExtraction);
router.get('/:id', protect, getInformationExtractionById);
router.delete('/:id', protect, deleteInformationExtraction);

module.exports = router;
