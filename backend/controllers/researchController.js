const ResearchReport = require("../models/ResearchReport");
const ResearchDataset = require("../models/ResearchDataset");
const EvaluationResult = require("../models/EvaluationResult");
const { askDocument } = require("../services/ragService");
const { generateAnswer } = require("../services/llmService");
const { runBenchmarkEvaluation } = require("../services/evaluationService");

const { executeResearchPipeline } = require("../services/researchPipelineService");
const { executeAutonomousResearchStudio } = require("../services/researchStudioService");

/**
 * POST /api/research/generate
 * Autonomous Research Studio Generator with multi-paper comparison, extraction,
 * genuine gap analysis, proposals, reviews, and verified original drafts.
 */
const generateReport = async (req, res) => {
  try {
    const {
      topic,
      title,
      questions = "",
      researchMode = "synthesis",
      sourceMode = "combined",
      documentIds = [],
      knowledgeBaseId = "all",
      knowledgeBaseIds = [],
      depth = "standard",
      paperType = "Review Paper",
      formatStyle = "Generic Academic",
      userResults = {},
    } = req.body;

    const finalTopic = (topic || title || "").trim();
    if (!finalTopic) {
      return res.status(400).json({ message: "Research topic/title is required." });
    }

    // Normalize knowledge base IDs
    let resolvedKbIds = [...(Array.isArray(knowledgeBaseIds) ? knowledgeBaseIds : [])];
    if (knowledgeBaseId && knowledgeBaseId !== "all" && !resolvedKbIds.includes(knowledgeBaseId)) {
      resolvedKbIds.push(knowledgeBaseId);
    }

    // Determine if this is a structured Research Studio request
    const isStudioRequest =
      Boolean(researchMode && researchMode !== "simple") ||
      (documentIds && documentIds.length > 0) ||
      resolvedKbIds.length > 0;

    if (isStudioRequest) {
      const studioResult = await executeAutonomousResearchStudio({
        userId: req.user?._id,
        topic: finalTopic,
        questions,
        researchMode,
        sourceMode,
        documentIds,
        knowledgeBaseIds: resolvedKbIds,
        depth,
        paperType,
        formatStyle,
        userResults,
      });

      const newReport = await ResearchReport.create({
        user: req.user?._id,
        knowledgeBaseId: resolvedKbIds[0] || null,
        knowledgeBaseIds: resolvedKbIds,
        documentIds: documentIds || [],
        topic: finalTopic,
        title: finalTopic,
        researchMode: studioResult.researchMode,
        sourceMode: studioResult.sourceMode,
        depth: studioResult.depth,
        paperType: studioResult.paperType,
        formatStyle: studioResult.formatStyle,
        numberOfPapers: studioResult.numberOfPapers,
        status: studioResult.status,
        executiveSummary: studioResult.executiveSummary,
        sections: studioResult.sections,
        citations: studioResult.citations,
        paperProfiles: studioResult.paperProfiles,
        comparisonMatrix: studioResult.comparisonMatrix,
        benchmarkCompatibility: studioResult.benchmarkCompatibility,
        evidenceLedger: studioResult.evidenceLedger,
        gapAnalysis: studioResult.gapAnalysis,
        researchIdeas: studioResult.researchIdeas,
        proposal: studioResult.proposal,
        paperDraft: studioResult.paperDraft,
        userResultsProvided: studioResult.userResultsProvided,
        resultsNotice: studioResult.resultsNotice,
        metrics: studioResult.metrics,
      });

      return res.status(201).json({
        success: true,
        report: newReport,
        paperProfiles: studioResult.paperProfiles,
        comparisonMatrix: studioResult.comparisonMatrix,
        benchmarkCompatibility: studioResult.benchmarkCompatibility,
        evidenceLedger: studioResult.evidenceLedger,
        gapAnalysis: studioResult.gapAnalysis,
        researchIdeas: studioResult.researchIdeas,
        proposal: studioResult.proposal,
        paperDraft: studioResult.paperDraft,
        metrics: studioResult.metrics,
      });
    }

    // Legacy fallback: Query RAG for passages relevant to topic & questions
    const searchQuery = `${finalTopic} ${questions}`.trim();
    const ragResult = await askDocument({
      question: searchQuery,
      userId: req.user?._id,
      knowledgeBaseId: knowledgeBaseId !== "all" ? knowledgeBaseId : undefined,
    });

    const sources = ragResult.sources || [];
    const retrievedChunks = sources.map((s) => ({
      text: s.snippet,
      snippet: s.snippet,
      documentName: s.documentName,
      chunkIndex: s.chunkIndex,
      score: s.score,
      metadata: { section: s.section || s.documentName },
    }));

    const pipelineResult = await executeResearchPipeline({
      topic: finalTopic,
      questions,
      retrievedChunks,
      threshold: 0.5,
    });

    const legacyReport = await ResearchReport.create({
      user: req.user?._id,
      knowledgeBaseId: knowledgeBaseId !== "all" ? knowledgeBaseId : null,
      topic: finalTopic,
      title: finalTopic,
      researchMode: "synthesis",
      executiveSummary: pipelineResult.executiveSummary,
      sections: pipelineResult.sections,
      citations: pipelineResult.citations,
    });

    return res.status(201).json({
      success: true,
      status: pipelineResult.status,
      qcPassed: pipelineResult.qcPassed,
      evidenceGate: pipelineResult.evidenceGate,
      claimLedger: pipelineResult.claimLedger,
      verificationSummary: pipelineResult.verificationSummary,
      conflictReport: pipelineResult.conflictReport,
      report: legacyReport,
    });
  } catch (error) {
    console.error("[RESEARCH CONTROLLER ERROR]:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/research/reports
 * Fetch all research reports owned by the user.
 */
const getReports = async (req, res) => {
  try {
    const filter = req.user?._id ? { user: req.user._id } : {};
    const reports = await ResearchReport.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, reports });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/research/reports/:id
 */
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await ResearchReport.findOne({ _id: id, user: req.user?._id });
    if (!report) {
      return res.status(404).json({ message: 'Research report not found' });
    }
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/research/datasets
 * Create or register a benchmark evaluation dataset (SRS Section 37)
 */
const createDataset = async (req, res) => {
  try {
    const { name, description = '', items = [] } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Dataset name is required' });
    }

    const dataset = await ResearchDataset.create({
      user: req.user._id,
      name: name.trim(),
      description,
      items,
    });

    return res.status(201).json({ success: true, dataset });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/research/datasets
 * List benchmark evaluation datasets (SRS Section 37)
 */
const getDatasets = async (req, res) => {
  try {
    const filter = req.user?._id ? { user: req.user._id } : {};
    const datasets = await ResearchDataset.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, datasets });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/research/evaluate
 * Execute scientific comparative evaluation across RAG baselines & strategies (SRS Sections 35, 36)
 */
const evaluateRAG = async (req, res) => {
  try {
    const { datasetId, k = 5 } = req.body;
    let dataset = null;

    if (datasetId && datasetId !== 'default') {
      dataset = await ResearchDataset.findOne({ _id: datasetId, user: req.user?._id });
    }

    // Run evaluation across all 5 strategies
    const { comparison, totalQuestions } = await runBenchmarkEvaluation({
      dataset,
      userId: req.user?._id,
      k: Number(k) || 5,
    });

    // Save evaluation run in MongoDB
    const evalRecord = await EvaluationResult.create({
      user: req.user._id,
      datasetId: dataset?._id || null,
      datasetName: dataset?.name || 'Standard Cross-Document Test Suite',
      comparison,
      status: 'completed',
    });

    return res.status(201).json({
      success: true,
      evaluation: evalRecord,
      message: 'Benchmark evaluation completed successfully across all 5 strategies',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/research/results
 * Fetch previous scientific benchmark evaluations (SRS Section 44)
 */
const getEvaluationResults = async (req, res) => {
  try {
    const filter = req.user?._id ? { user: req.user._id } : {};
    const results = await EvaluationResult.find(filter).sort({ createdAt: -1 }).limit(20);
    return res.json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generateReport,
  getReports,
  getReportById,
  createDataset,
  getDatasets,
  evaluateRAG,
  getEvaluationResults,
};

