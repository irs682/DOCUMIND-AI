const express = require('express');
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  reindexDocument,
  deleteDocument,
} = require('../controllers/documentController');
const { getDocumentExtractions } = require('../controllers/informationExtractionController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.get('/:id/extractions', protect, getDocumentExtractions);
router.get('/:id', protect, getDocumentById);
router.post('/:id/reindex', protect, reindexDocument);
router.post('/:id/reprocess', protect, reindexDocument);
router.delete('/:id', protect, deleteDocument);

module.exports = router;
