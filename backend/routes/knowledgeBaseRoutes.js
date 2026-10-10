const express = require('express');
const {
  createKnowledgeBase,
  getKnowledgeBases,
  getKnowledgeBaseById,
  updateKnowledgeBase,
  addDocumentsToKnowledgeBase,
  removeDocumentFromKnowledgeBase,
  deleteKnowledgeBase,
} = require('../controllers/knowledgeBaseController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createKnowledgeBase);
router.get('/', protect, getKnowledgeBases);
router.get('/:id', protect, getKnowledgeBaseById);
router.put('/:id', protect, updateKnowledgeBase);
router.delete('/:id', protect, deleteKnowledgeBase);

// Knowledge Base Document Membership routes
router.post('/:id/documents', protect, addDocumentsToKnowledgeBase);
router.delete('/:id/documents/:documentId', protect, removeDocumentFromKnowledgeBase);

module.exports = router;
