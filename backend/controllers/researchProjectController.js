const mongoose = require('mongoose');
const ResearchProject = require('../models/ResearchProject');
const Document = require('../models/Document');
const {
  executeStep1ExtractProfiles,
  executeStep2SuggestGoal,
  executeStep3RelatedWork,
  executeStep4Comparison,
  executeStep5Gaps,
  executeStep6QuestionsAndHypotheses,
  executeStep7Methodology,
  executeStep8BaselinesAndBenchmarks,
  executeStep9CalculateComparison,
  executeStep10GenerateDiscussion,
  executeStep11AssembleFullPaper,
} = require('../services/researchWorkspaceService');
const {
  evaluateManuscriptQuality,
  runAcademicReviewerAudit,
  generateBibtexBundle,
} = require('../services/academicAuditService');

/**
 * GET /api/research/projects
 * List user's research projects
 */
const getProjects = async (req, res) => {
  try {
    const projects = await ResearchProject.find({ owner: req.user._id })
      .populate('documentIds', 'name originalName size status')
      .sort({ updatedAt: -1 });

    return res.json({ success: true, projects });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/research/projects/:id
 * Get single research project
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await ResearchProject.findOne({ _id: id, owner: req.user._id })
      .populate('documentIds', 'name originalName size status');

    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    return res.json({ success: true, project });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects
 * Create a new research project
 */
const createProject = async (req, res) => {
  try {
    const { title, researchTopic = '', description = '', documentIds = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Project title is required.' });
    }

    const project = await ResearchProject.create({
      title: title.trim(),
      owner: req.user._id,
      researchTopic: (researchTopic || title).trim(),
      description: (description || '').trim(),
      documentIds: Array.isArray(documentIds) ? documentIds : [],
      status: 'active',
      currentStep: 1,
    });

    const populated = await ResearchProject.findById(project._id)
      .populate('documentIds', 'name originalName size status');

    return res.status(201).json({ success: true, project: populated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /api/research/projects/:id
 * Update project state or step
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PROJECT_ID',
        message: 'A valid research project ID is required.',
      });
    }

    const updates = { ...req.body };

    // Remove protected fields
    delete updates.owner;
    delete updates._id;

    // Harmonize Step 2 aliases if present
    if (updates.mainResearchProblem && !updates.researchProblem) {
      updates.researchProblem = updates.mainResearchProblem;
    } else if (updates.researchProblem && !updates.mainResearchProblem) {
      updates.mainResearchProblem = updates.researchProblem;
    }

    if (updates.improvementGoal && !updates.improvementsDesired) {
      updates.improvementsDesired = updates.improvementGoal;
    } else if (updates.improvementsDesired && !updates.improvementGoal) {
      updates.improvementGoal = updates.improvementsDesired;
    }

    if (updates.userResults && Array.isArray(updates.userResults)) {
      updates.userResults = updates.userResults.map((r) => {
        const mName = (r.modelName || r.model || 'Proposed Model').trim();
        const numVal = typeof r.value === 'number' ? r.value : parseFloat(r.value);
        return {
          id: r.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          modelName: mName,
          model: mName,
          dataset: (r.dataset || 'Benchmark Dataset').trim(),
          split: (r.split || 'Test').trim(),
          metric: (r.metric || 'Metric').trim(),
          value: Number.isFinite(numVal) ? numVal : 0,
          unit: (r.unit || '%').trim(),
          runId: (r.runId || '').trim(),
          sourceFile: (r.sourceFile || '').trim(),
          notes: (r.notes || '').trim(),
          sourceType: r.sourceType || 'user_supplied_result',
          verified: r.verified !== undefined ? Boolean(r.verified) : true,
        };
      });
    }

    const project = await ResearchProject.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('documentIds', 'name originalName size status');

    if (!project) {
      return res.status(404).json({
        success: false,
        code: 'RESEARCH_PROJECT_NOT_FOUND',
        message: 'Research project not found',
      });
    }

    return res.json({ success: true, project });
  } catch (err) {
    console.error('[PROJECT_UPDATE_ERROR]', err);
    return res.status(500).json({
      success: false,
      code: 'PROJECT_UPDATE_FAILED',
      message: err.message || 'Failed to update research project',
    });
  }
};

/**
 * PATCH /api/research/projects/:id/goal
 * Dedicated handler for Step 2 — Research Goal & Problem Formulation
 */
const updateProjectGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PROJECT_ID',
        message: 'A valid research project ID is required.',
      });
    }

    const {
      researchTopic,
      mainResearchProblem,
      researchProblem,
      improvementGoal,
      improvementsDesired,
      focusAreas = '',
    } = req.body;

    const topic = (researchTopic || '').trim();
    const problem = (mainResearchProblem || researchProblem || '').trim();
    const improvement = (improvementGoal || improvementsDesired || '').trim();
    const focus = (focusAreas || '').trim();

    // Required fields validation
    if (!topic) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Research Topic is required.',
        field: 'researchTopic',
      });
    }

    if (!problem) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Main Research Problem is required.',
        field: 'mainResearchProblem',
      });
    }

    if (!improvement) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Improvement Goal ("What do you want to improve?") is required.',
        field: 'improvementGoal',
      });
    }

    // Verify project exists and belongs to the authenticated user
    const existing = await ResearchProject.findOne({ _id: id, owner: userId });
    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'RESEARCH_PROJECT_NOT_FOUND',
        message: 'Research project not found',
      });
    }

    const nextStep = Math.max(existing.currentStep || 1, 2);

    const project = await ResearchProject.findOneAndUpdate(
      { _id: id, owner: userId },
      {
        $set: {
          researchTopic: topic,
          mainResearchProblem: problem,
          researchProblem: problem,
          improvementGoal: improvement,
          improvementsDesired: improvement,
          focusAreas: focus,
          currentStep: nextStep,
        },
      },
      { new: true, runValidators: true }
    ).populate('documentIds', 'name originalName size status');

    return res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('[RESEARCH_GOAL_SAVE]', error);
    return res.status(500).json({
      success: false,
      code: 'RESEARCH_GOAL_SAVE_FAILED',
      message: 'Unable to save research goal: ' + (error.message || 'Internal server error'),
    });
  }
};

/**
 * DELETE /api/research/projects/:id
 * Delete research project
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ResearchProject.findOneAndDelete({ _id: id, owner: req.user._id });
    if (!result) {
      return res.status(404).json({ message: 'Research project not found.' });
    }
    return res.json({ success: true, message: 'Research project deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/step/:stepNumber/execute
 * Execute AI for a specific workflow step
 */
const executeProjectStep = async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    const step = parseInt(stepNumber, 10);

    const project = await ResearchProject.findOne({ _id: id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Research project not found.' });
    }

    let updates = {};

    switch (step) {
      case 1: {
        // Step 1: Extract Profiles from Attached Papers
        const { documentIds = [] } = req.body;
        if (documentIds.length > 0) {
          project.documentIds = documentIds;
        }
        const step1Result = await executeStep1ExtractProfiles(project);
        updates = {
          documentIds: project.documentIds,
          paperProfiles: step1Result.paperProfiles,
          evidenceLedger: step1Result.evidenceLedger,
          currentStep: Math.max(project.currentStep, 2),
        };
        break;
      }

      case 2: {
        // Step 2: Research Goal
        const goalSuggestion = await executeStep2SuggestGoal(project);
        updates = {
          currentStep: Math.max(project.currentStep, 3),
        };
        return res.json({ success: true, suggestion: goalSuggestion });
      }

      case 3: {
        // Step 3: Related Work Synthesis
        const relatedWork = await executeStep3RelatedWork(project);
        updates = {
          relatedWork,
          currentStep: Math.max(project.currentStep, 4),
        };
        break;
      }

      case 4: {
        // Step 4: Comparison Matrix & Benchmark Compatibility
        const compResult = await executeStep4Comparison(project);
        updates = {
          comparisonMatrix: compResult.comparisonMatrix,
          benchmarkCompatibility: compResult.benchmarkCompatibility,
          currentStep: Math.max(project.currentStep, 5),
        };
        break;
      }

      case 5: {
        // Step 5: Research Gaps
        const gaps = await executeStep5Gaps(project);
        updates = {
          researchGaps: gaps,
          currentStep: Math.max(project.currentStep, 6),
        };
        break;
      }

      case 6: {
        // Step 6: Questions & Hypotheses
        const qh = await executeStep6QuestionsAndHypotheses(project);
        updates = {
          researchQuestions: qh.questions,
          hypotheses: qh.hypotheses,
          currentStep: Math.max(project.currentStep, 7),
        };
        break;
      }

      case 7: {
        // Step 7: Methodology
        const methodology = await executeStep7Methodology(project);
        updates = {
          methodology,
          currentStep: Math.max(project.currentStep, 8),
        };
        break;
      }

      case 8: {
        // Step 8: Benchmarks, Baselines & Metrics
        const bb = await executeStep8BaselinesAndBenchmarks(project);
        updates = {
          baselines: bb.baselines,
          benchmarks: bb.benchmarks,
          metrics: bb.metrics,
          currentStep: Math.max(project.currentStep, 9),
        };
        break;
      }

      case 9: {
        // Step 9: User Result Comparison
        const existingResults = project.userResults || [];
        const userResultsToUse =
          req.body.userResults && Array.isArray(req.body.userResults) && req.body.userResults.length > 0
            ? req.body.userResults
            : existingResults;
        const resultComp = executeStep9CalculateComparison(userResultsToUse, project.baselines || []);
        updates = {
          userResults: userResultsToUse,
          resultComparison: resultComp,
          currentStep: Math.max(project.currentStep, 10),
        };
        break;
      }

      case 10: {
        // Step 10: Discussion
        const discussion = await executeStep10GenerateDiscussion(project);
        updates = {
          discussion,
          currentStep: Math.max(project.currentStep, 11),
        };
        break;
      }

      case 11: {
        // Step 11: Full Paper Draft
        const draft = await executeStep11AssembleFullPaper(project);
        updates = {
          generatedDraft: draft,
          // Note: Maintain active status; do not automatically mark completed per Section 17
          status: project.status === 'archived' ? 'archived' : 'active',
        };
        break;
      }

      default:
        return res.status(400).json({ message: `Invalid step number: ${step}` });
    }

    const updatedProject = await ResearchProject.findByIdAndUpdate(
      project._id,
      { $set: updates },
      { new: true }
    ).populate('documentIds', 'name originalName size status');

    return res.json({ success: true, project: updatedProject, updates });
  } catch (err) {
    console.error(`[EXECUTE PROJECT STEP ERROR]: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/manuscript-objects
 * Add or update a unified manuscript object (equation, figure, graph, table, image)
 */
const saveManuscriptObject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const objectData = req.body;

    if (!objectData || !objectData.objectType) {
      return res.status(400).json({ message: 'Valid manuscript object data is required.' });
    }

    const project = await ResearchProject.findOne({ _id: id, owner: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const existingObjects = project.manuscriptObjects || [];
    const objId = objectData.id || `${objectData.objectType}-${Date.now().toString(36)}`;
    const normalizedObj = { ...objectData, id: objId };

    const idx = existingObjects.findIndex((o) => o.id === objId);
    let updatedObjects;
    if (idx >= 0) {
      updatedObjects = [...existingObjects];
      updatedObjects[idx] = normalizedObj;
    } else {
      updatedObjects = [...existingObjects, normalizedObj];
    }

    project.manuscriptObjects = updatedObjects;
    if (project.generatedDraft) {
      project.generatedDraft.manuscriptObjects = updatedObjects;
    }
    await project.save();

    return res.json({ success: true, project, object: normalizedObj });
  } catch (err) {
    console.error('[SAVE_MANUSCRIPT_OBJECT_ERROR]', err);
    return res.status(500).json({ message: err.message || 'Failed to save manuscript object' });
  }
};

/**
 * DELETE /api/research/projects/:id/manuscript-objects/:objId
 */
const deleteManuscriptObject = async (req, res) => {
  try {
    const { id, objId } = req.params;
    const userId = req.user?._id || req.user?.id;

    const project = await ResearchProject.findOne({ _id: id, owner: userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const updated = (project.manuscriptObjects || []).filter((o) => o.id !== objId);
    project.manuscriptObjects = updated;
    if (project.generatedDraft) {
      project.generatedDraft.manuscriptObjects = updated;
    }
    await project.save();

    return res.json({ success: true, project });
  } catch (err) {
    console.error('[DELETE_MANUSCRIPT_OBJECT_ERROR]', err);
    return res.status(500).json({ message: err.message || 'Failed to delete manuscript object' });
  }
};

/**
 * Sanitizes project title for file generation
 */
const sanitizeFilename = (name) => {
  return (name || 'Research_Manuscript')
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

/**
 * Validates saved canonical manuscript data
 */
const validateManuscriptData = (project) => {
  const draft = project.generatedDraft || {};
  const rawObjects = project.manuscriptObjects || draft.manuscriptObjects || [];
  const sections = draft.sections || [];
  const references = draft.references || [];

  const criticalErrors = [];
  const warnings = [];

  if (!draft.title && !project.title) {
    criticalErrors.push('Manuscript title is missing.');
  }

  if (!sections || sections.length === 0) {
    criticalErrors.push('Manuscript contains no sections. Please generate or compile the draft in Step 11 first.');
  }

  // Validate objects
  const objMap = new Map();
  rawObjects.forEach((obj, idx) => {
    const objId = obj.id || `obj-${idx}`;
    objMap.set(objId, obj);

    if (obj.objectType === 'equation') {
      if (!obj.latex || !obj.latex.trim()) {
        criticalErrors.push(`Equation "${obj.title || objId}" has empty LaTeX formulation.`);
      }
    } else if (obj.objectType === 'figure' || obj.objectType === 'graph') {
      if (!obj.svgContent || !obj.svgContent.trim()) {
        criticalErrors.push(`Figure/Graph "${obj.title || objId}" is missing vector SVG content.`);
      }
    } else if (obj.objectType === 'table') {
      if (!obj.tableData || !Array.isArray(obj.tableData.headers) || obj.tableData.headers.length === 0) {
        criticalErrors.push(`Table "${obj.title || objId}" has invalid or empty table headers.`);
      }
    } else if (obj.objectType === 'image') {
      if (!obj.fileRef) {
        criticalErrors.push(`Image figure "${obj.title || objId}" has missing image source.`);
      }
    }
  });

  // Check unresolved cross references in sections
  sections.forEach((sec) => {
    const text = sec.body || '';
    const crossRefMatches = text.match(/\{\{(EQUATION|FIGURE|TABLE):([^}]+)\}\}/g) || [];
    crossRefMatches.forEach((m) => {
      const matchKey = m.replace(/\{\{(EQUATION|FIGURE|TABLE):/, '').replace(/\}\}$/, '');
      if (!objMap.has(matchKey)) {
        warnings.push(`Unresolved manuscript cross-reference ${m} in section "${sec.heading}".`);
      }
    });
  });

  // Check duplicate references
  const seenRefs = new Set();
  references.forEach((ref) => {
    const norm = ref.toLowerCase().trim().replace(/^\[\d+\]\s*/, '');
    if (seenRefs.has(norm)) {
      warnings.push(`Duplicate reference found: "${ref.slice(0, 50)}..."`);
    } else {
      seenRefs.add(norm);
    }
  });

  if (!references || references.length === 0) {
    warnings.push('Manuscript has no bibliography or references cited.');
  }

  return {
    isValid: criticalErrors.length === 0,
    criticalErrors,
    warnings,
    hasWarnings: warnings.length > 0,
    warningCount: warnings.length,
    summary:
      criticalErrors.length > 0
        ? `Blocked: ${criticalErrors.length} critical issue(s)`
        : warnings.length > 0
        ? `Exporting with ${warnings.length} warning(s)`
        : 'Manuscript validated cleanly',
  };
};

/**
 * GET /api/research/projects/:id/validate
 * Validate manuscript objects, citations, equations, figures prior to export
 */
const validateProjectManuscript = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const project = await ResearchProject.findOne({ _id: id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Research project not found.' });
    }

    if (project.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Security check failed: You do not own this project.' });
    }

    const validation = validateManuscriptData(project);
    return res.json({ success: true, validation });
  } catch (err) {
    console.error('[VALIDATE_PROJECT_MANUSCRIPT_ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/research/projects/:id/export/pdf
 * POST /api/research/projects/:id/export
 * Canonical export endpoint with ownership security check & validation
 */
const exportProjectPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const project = await ResearchProject.findOne({ _id: id })
      .populate('documentIds', 'name originalName size status');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Research project not found.' });
    }

    // Ownership security verification (Section 31)
    if (project.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Security error: You do not have permission to export this research project.',
      });
    }

    const validation = validateManuscriptData(project);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        code: 'MANUSCRIPT_VALIDATION_FAILED',
        message: 'Manuscript has critical validation errors that block export.',
        criticalErrors: validation.criticalErrors,
        warnings: validation.warnings,
      });
    }

    const safeTitle = sanitizeFilename(project.title || project.researchTopic || 'Research');
    const filename = `${safeTitle}_Research_Manuscript.pdf`;

    return res.json({
      success: true,
      filename,
      validation,
      project: {
        _id: project._id,
        id: project._id,
        title: project.title,
        researchTopic: project.researchTopic,
        description: project.description,
        status: project.status,
        currentStep: project.currentStep,
        generatedDraft: project.generatedDraft,
        manuscriptObjects: project.manuscriptObjects,
        userResults: project.userResults,
        methodology: project.methodology,
        baselines: project.baselines,
        documentIds: project.documentIds,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (err) {
    console.error('[EXPORT_PROJECT_PDF_ERROR]', err);
    return res.status(500).json({ success: false, message: err.message || 'Export failed.' });
  }
};

/**
 * POST /api/research/projects/:id/audit
 * Run 19-Dimensional Research Paper Quality Audit with Hard Gates
 */
const runQualityAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const project = await ResearchProject.findOne({ _id: id, owner: userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Research project not found.' });
    }

    const audit = evaluateManuscriptQuality(project);
    return res.json({ success: true, audit });
  } catch (err) {
    console.error('[RUN_QUALITY_AUDIT_ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/reviewer-check
 * Run Academic Peer Reviewer Simulation
 */
const runReviewerCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const project = await ResearchProject.findOne({ _id: id, owner: userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Research project not found.' });
    }

    const reviewerReport = runAcademicReviewerAudit(project);
    return res.json({ success: true, reviewerReport });
  } catch (err) {
    console.error('[RUN_REVIEWER_CHECK_ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/revisions
 * Save manuscript version snapshot
 */
const createManuscriptRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;
    const { label, summary } = req.body;

    const project = await ResearchProject.findOne({ _id: id, owner: userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const revisions = project.manuscriptRevisions || [];
    const nextVer = revisions.length + 1;

    const newRevision = {
      versionNumber: nextVer,
      label: label || `Version ${nextVer}`,
      summary: summary || `Snapshot at ${new Date().toLocaleTimeString()}`,
      draftSnapshot: project.generatedDraft || {},
      objectsSnapshot: project.manuscriptObjects || [],
      createdAt: new Date(),
    };

    project.manuscriptRevisions.push(newRevision);
    await project.save();

    return res.status(201).json({ success: true, revision: newRevision, revisions: project.manuscriptRevisions });
  } catch (err) {
    console.error('[CREATE_REVISION_ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/research/projects/:id/revisions/:versionNumber/restore
 * Restore manuscript draft from a saved version
 */
const restoreManuscriptRevision = async (req, res) => {
  try {
    const { id, versionNumber } = req.params;
    const userId = req.user?._id || req.user?.id;
    const vNum = parseInt(versionNumber, 10);

    const project = await ResearchProject.findOne({ _id: id, owner: userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const revision = (project.manuscriptRevisions || []).find((r) => r.versionNumber === vNum);
    if (!revision) {
      return res.status(404).json({ success: false, message: `Revision version ${versionNumber} not found.` });
    }

    project.generatedDraft = revision.draftSnapshot;
    project.manuscriptObjects = revision.objectsSnapshot;
    await project.save();

    return res.json({ success: true, message: `Restored to Version ${versionNumber}`, project });
  } catch (err) {
    console.error('[RESTORE_REVISION_ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/research/projects/:id/export/bibtex
 * Export BibTeX bibliography
 */
const exportBibtex = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const project = await ResearchProject.findOne({ _id: id, owner: userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const bibtex = generateBibtexBundle(project);
    const safeTitle = sanitizeFilename(project.title || 'references');
    const filename = `${safeTitle}.bib`;

    return res.json({ success: true, bibtex, filename });
  } catch (err) {
    console.error('[EXPORT_BIBTEX_ERROR]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectGoal,
  deleteProject,
  executeProjectStep,
  saveManuscriptObject,
  deleteManuscriptObject,
  validateProjectManuscript,
  exportProjectPdf,
  runQualityAudit,
  runReviewerCheck,
  createManuscriptRevision,
  restoreManuscriptRevision,
  exportBibtex,
};
