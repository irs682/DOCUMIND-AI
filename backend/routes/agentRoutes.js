const express = require('express');
const {
  createAgentRun,
  getAgentRuns,
  getAgentRunById,
  streamAgentRunEvents,
  pauseAgentRun,
  resumeAgentRun,
  cancelAgentRun,
  retryPlanning,
  resolveApprovalGate,
  runEvaluation,
  executeAgentTask,
  getAgentTasks,
  getAgentTaskById,
} = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Autonomous Research Runs & Orchestration
router.post('/runs', protect, createAgentRun);
router.get('/runs', protect, getAgentRuns);
router.get('/runs/:id', protect, getAgentRunById);
router.get('/runs/:id/events', protect, streamAgentRunEvents);
router.post('/runs/:id/pause', protect, pauseAgentRun);
router.post('/runs/:id/resume', protect, resumeAgentRun);
router.post('/runs/:id/cancel', protect, cancelAgentRun);
router.post('/runs/:id/retry-planning', protect, retryPlanning);
router.post('/runs/:id/approve', protect, resolveApprovalGate);

// Automated Agent Evaluation Suite
router.post('/evaluate', protect, runEvaluation);

// Legacy Task endpoints (backwards compatibility)
router.post('/execute', protect, executeAgentTask);
router.get('/tasks', protect, getAgentTasks);
router.get('/tasks/:id', protect, getAgentTaskById);

module.exports = router;
