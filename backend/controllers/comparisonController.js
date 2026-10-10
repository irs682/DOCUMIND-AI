const DocumentComparison = require('../models/DocumentComparison');
const Document = require('../models/Document');
const Project = require('../models/Project');
const { compareDocuments } = require('../services/comparisonService');

/**
 * POST /api/comparisons
 * Initiates comparison between two documents.
 */
const initiateComparison = async (req, res) => {
  try {
    const { documentAId, documentBId, projectId = null, forceRecompute = false } = req.body;
    const userId = req.user._id;

    if (!documentAId || !documentBId) {
      return res.status(400).json({ message: 'Both documentAId and documentBId are required.' });
    }

    if (String(documentAId) === String(documentBId)) {
      return res.status(400).json({ message: 'Please select two distinct documents to compare.' });
    }

    // Verify project access if provided
    if (projectId) {
      const proj = await Project.findOne({ _id: projectId, owner: userId });
      if (!proj) {
        return res.status(403).json({ message: 'Unauthorized project access.' });
      }
    }

    // Check cache: Return existing completed comparison if within last 24h unless forceRecompute
    if (!forceRecompute) {
      const existing = await DocumentComparison.findOne({
        user: userId,
        status: 'COMPLETED',
        $or: [
          { documentA: documentAId, documentB: documentBId },
          { documentA: documentBId, documentB: documentAId },
        ],
      }).sort({ createdAt: -1 });

      if (existing) {
        console.log(`[COMPARE CACHE] Returning existing comparison ${existing._id}`);
        return res.json(existing);
      }
    }

    const comparison = await compareDocuments({
      documentAId,
      documentBId,
      userId,
      projectId,
    });

    return res.status(201).json(comparison);
  } catch (err) {
    console.error(`[COMPARISON CONTROLLER ERROR] ${err.message}`);
    const status = err.message.includes('not found') ? 404 : err.message.includes('unauthorized') ? 403 : 500;
    return res.status(status).json({ message: err.message });
  }
};

/**
 * GET /api/comparisons
 * Lists all comparison records for the authenticated user.
 */
const getComparisons = async (req, res) => {
  try {
    const userId = req.user._id;
    const { projectId = null } = req.query;

    const filter = { user: userId };
    if (projectId) filter.projectId = projectId;

    const comparisons = await DocumentComparison.find(filter)
      .select('documentA documentB documentAName documentBName similarityScore status stats createdAt updatedAt')
      .sort({ createdAt: -1 });

    return res.json({ comparisons });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/comparisons/:id
 * Fetches single comparison record by ID.
 */
const getComparisonById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const comparison = await DocumentComparison.findOne({ _id: id, user: userId })
      .populate('documentA', 'name originalName size formattedSize status pageCount')
      .populate('documentB', 'name originalName size formattedSize status pageCount');

    if (!comparison) {
      return res.status(404).json({ message: 'Comparison record not found.' });
    }

    return res.json(comparison);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/comparisons/:id
 * Deletes single comparison record.
 */
const deleteComparison = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deleted = await DocumentComparison.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) {
      return res.status(404).json({ message: 'Comparison record not found.' });
    }

    return res.json({ message: 'Comparison deleted successfully.', id });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  initiateComparison,
  getComparisons,
  getComparisonById,
  deleteComparison,
};
