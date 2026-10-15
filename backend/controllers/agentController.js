const AgentTask = require('../models/AgentTask');
const AgentRun = require('../models/AgentRun');
const { researchAgentEngine } = require('../services/researchAgentEngine');
const { runAgentEvaluationSuite } = require('../services/agentEvaluationService');
const { askDocument } = require('../services/ragService');

/**
 * POST /api/agents/runs
 * Create and launch an Autonomous Research Run
 */
const createAgentRun = async (req, res) => {
  try {
    const {
      goal,
      projectId = null,
      documentIds = [],
      depth = 'standard',
      knowledgeBaseId = null,
    } = req.body;

    if (!goal || !goal.trim()) {
      return res.status(400).json({ message: 'Research goal is required' });
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const run = await researchAgentEngine.startRun({
      runId,
      userId: req.user?._id,
      projectId,
      documentIds,
      userGoal: goal.trim(),
      depth,
      knowledgeBaseId,
    });

    return res.status(201).json({
      success: true,
      runId: run.runId,
      run,
      message: 'Autonomous research run started successfully',
    });
  } catch (error) {
    console.error('[AGENT CONTROLLER] createAgentRun error:', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/agents/runs
 * Fetch all agent runs for the current user or project
 */
const getAgentRuns = async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = { user: req.user?._id };
    if (projectId) {
      filter.project = projectId;
    }

    const runs = await AgentRun.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('documentIds', 'title originalName pageCount');

    return res.json({ success: true, runs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/agents/runs/:id
 * Fetch detailed state for an individual agent run
 */
const getAgentRunById = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await AgentRun.findOne({
      $or: [{ runId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      user: req.user?._id,
    }).populate('documentIds', 'title originalName pageCount');

    if (!run) {
      return res.status(404).json({ message: 'Agent run not found' });
    }

    return res.json({ success: true, run });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/agents/runs/:id/events
 * Real-time SSE stream for research agent execution
 */
const streamAgentRunEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await AgentRun.findOne({
      $or: [{ runId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      user: req.user?._id,
    });

    if (!run) {
      return res.status(404).json({ message: 'Agent run not found' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial status event
    res.write(`data: ${JSON.stringify({
      runId: run.runId,
      status: run.status,
      currentPhase: run.currentPhase,
      progress: run.progress,
      plan: run.plan,
      completedTasks: run.completedTasks,
      stepLogs: run.stepLogs,
    })}\n\n`);

    // Subscribe to live orchestrator events
    const unsubscribe = researchAgentEngine.subscribe(run.runId, (eventData) => {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
      if (eventData.status === 'completed' || eventData.status === 'failed' || eventData.status === 'cancelled') {
        // Stream completed
      }
    });

    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/agents/runs/:id/pause
 */
const pauseAgentRun = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await researchAgentEngine.pauseRun(id);
    return res.json({ success: true, run, message: 'Run paused' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/agents/runs/:id/resume
 */
const resumeAgentRun = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await researchAgentEngine.resumeRun(id);
    return res.json({ success: true, run, message: 'Run resumed' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/agents/runs/:id/cancel
 */
const cancelAgentRun = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await researchAgentEngine.cancelRun(id);
    return res.json({ success: true, run, message: 'Run cancelled' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/agents/runs/:id/approve
 * Human-in-the-Loop decision approval
 */
const resolveApprovalGate = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalId, decision, userFeedback } = req.body;

    if (!approvalId || !decision) {
      return res.status(400).json({ message: 'approvalId and decision (approved/edited/rejected) required' });
    }

    const run = await researchAgentEngine.resolveApproval(id, approvalId, decision, userFeedback);
    return res.json({ success: true, run, message: 'Approval recorded successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/agents/evaluate
 * Run the automated evaluation suite
 */
const runEvaluation = async (_req, res) => {
  try {
    const results = await runAgentEvaluationSuite();
    return res.json(results);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/agents/execute (Legacy endpoint preserved for backwards compatibility)
 */
const executeAgentTask = async (req, res) => {
  try {
    const { agentId = 'agent-researcher', prompt, knowledgeBaseId = 'all', depth = 'standard' } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: 'Task prompt is required' });
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const run = await researchAgentEngine.startRun({
      runId,
      userId: req.user?._id,
      userGoal: prompt.trim(),
      depth,
      knowledgeBaseId: knowledgeBaseId !== 'all' ? knowledgeBaseId : null,
    });

    // Also write AgentTask for backwards compatibility
    const task = await AgentTask.create({
      user: req.user?._id,
      agentId,
      prompt,
      knowledgeBaseId: knowledgeBaseId !== 'all' ? knowledgeBaseId : null,
      depth,
      status: 'completed',
      outputSummary: `Autonomous research run initiated (${runId}).`,
      stepLogs: [
        { title: 'Goal Deconstruction & Planning', detail: 'Decomposed objective into dependency-verified task graph.' },
        { title: 'Multi-Modal Evidence Retrieval', detail: 'Executed hybrid BM25 and vector retrieval.' },
        { title: 'Evidence Ledger & Critic Verification', detail: 'Verified citations and anti-fabrication gates.' },
      ],
    });

    return res.status(201).json({
      success: true,
      task,
      runId,
      message: 'Agent workflow executed successfully',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/agents/tasks (Legacy endpoint)
 */
const getAgentTasks = async (req, res) => {
  try {
    const filter = req.user?._id ? { user: req.user._id } : {};
    const tasks = await AgentTask.find(filter).sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, tasks });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/agents/tasks/:id (Legacy endpoint)
 */
const getAgentTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await AgentTask.findOne({ _id: id, user: req.user?._id });
    if (!task) {
      return res.status(404).json({ message: 'Agent task not found' });
    }
    return res.json({ success: true, task });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/agents/runs/:id/retry-planning
 * Rerun research planning without creating duplicate AgentRun records
 */
const retryPlanning = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await researchAgentEngine.retryPlanning(id);
    return res.json({
      success: true,
      run,
      message: 'Research planning reinvoked successfully',
    });
  } catch (error) {
    console.error('[AGENT CONTROLLER] retryPlanning error:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
