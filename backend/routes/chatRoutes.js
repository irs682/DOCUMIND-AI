const express = require('express');
const {
  createConversation,
  getConversations,
  getConversationById,
  sendMessage,
  sendMessageStream,
  updateConversation,
  pinConversation,
  archiveConversation,
  moveConversation,
  updateSessionDocuments,
  bookmarkMessage,
  deleteConversation,
  getUserMemories,
  deleteUserMemory,
  clearUserMemories,
  toggleMemory,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Conversation Endpoints
router.post('/conversations', protect, createConversation);
router.get('/conversations', protect, getConversations);
router.get('/conversations/:id', protect, getConversationById);
router.post('/conversations/:id/messages', protect, sendMessage);
router.post('/conversations/:id/messages/stream', protect, sendMessageStream);
router.post('/stream', protect, sendMessageStream);
router.patch('/conversations/:id', protect, updateConversation);
router.patch('/conversations/:id/pin', protect, pinConversation);
router.patch('/conversations/:id/archive', protect, archiveConversation);
router.patch('/conversations/:id/move', protect, moveConversation);
router.patch('/conversations/:id/documents', protect, updateSessionDocuments);
router.patch('/conversations/:id/messages/:messageId/bookmark', protect, bookmarkMessage);
router.delete('/conversations/:id', protect, deleteConversation);

// Memory Management Endpoints
router.get('/memories', protect, getUserMemories);
router.delete('/memories/:id', protect, deleteUserMemory);
router.delete('/memories', protect, clearUserMemories);
router.patch('/memories/toggle', protect, toggleMemory);

module.exports = router;

