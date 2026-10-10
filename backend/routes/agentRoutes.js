const express = require('express');
const { executeAgentTask, getAgentTasks, getAgentTaskById } = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/execute', protect, executeAgentTask);
router.get('/tasks', protect, getAgentTasks);
router.get('/tasks/:id', protect, getAgentTaskById);

module.exports = router;
