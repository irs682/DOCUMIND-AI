const mongoose = require('mongoose');
const Document = require('../models/Document');
const Project = require('../models/Project');
const InformationExtraction = require('../models/InformationExtraction');
const {
  createExtractionJob,
  runExtractionJob,
  getDocumentExtractions: getDocumentExtractionRecords,
  deleteExtraction: deleteExtractionRecord,
} = require('../services/informationExtractionService');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const hasCustomFields = (customFields) => {
  if (typeof customFields === 'string') return Boolean(customFields.trim());
  if (Array.isArray(customFields)) return customFields.some((field) => String(field || '').trim());
  return Boolean(customFields && typeof customFields === 'object');
};

const normalizeExtractionTypes = (types) => {
  if (!Array.isArray(types)) return null;
  return [...new Set(types.map((type) => String(type || '').trim()).filter(Boolean))];
};

const documentBelongsToProject = (document, project) => {
  if (document.projectId && String(document.projectId) === String(project._id)) return true;
  return (project.documentIds || []).some((documentId) => String(documentId) === String(document._id));
};

const getErrorStatus = (error) => {
  if (Number.isInteger(error?.statusCode)) return error.statusCode;
  if (Number.isInteger(error?.status)) return error.status;
  const message = String(error?.message || '');
  if (/not found/i.test(message)) return 404;
  if (/unauthori[sz]ed|permission denied/i.test(message)) return 403;
  if (/not ready|processing|no usable text/i.test(message)) return 409;
  if (/invalid|required|unsupported|limit/i.test(message)) return 400;
  return 500;
};

const authorizeDocument = async ({ documentId, projectId, userId }) => {
  if (!isValidObjectId(documentId)) {
    const error = new Error('Invalid document id.');
    error.statusCode = 400;
    throw error;
  }

  const document = await Document.findOne({ _id: documentId, owner: userId }).select('_id projectId');
  if (!document) {
    const error = new Error('Document not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!projectId) return document;

  if (!isValidObjectId(projectId)) {
    const error = new Error('Invalid project id.');
    error.statusCode = 400;
    throw error;
  }

  const project = await Project.findOne({ _id: projectId, owner: userId }).select('_id documentIds');
  if (!project) {
    const error = new Error('Project not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!documentBelongsToProject(document, project)) {
    const error = new Error('Document is not available in this project.');
    error.statusCode = 403;
    throw error;
  }

  return document;
};

/**
 * POST /api/extractions
 * Queues a structured, full-document information extraction job.
 */
const initiateInformationExtraction = async (req, res) => {
  try {
    const body = req.body || {};
    const documentId = body.documentId;
    const projectId = body.projectId || null;
    const rawCustomFields = body.customFields ?? null;
    const customPrompt = typeof rawCustomFields === 'string'
      ? rawCustomFields
      : (typeof body.customPrompt === 'string' ? body.customPrompt : '');
    const customFields = typeof rawCustomFields === 'string' ? [] : rawCustomFields;
    const extractionTypes = normalizeExtractionTypes(body.extractionTypes ?? []);

    if (!extractionTypes) {
      return res.status(400).json({ message: 'extractionTypes must be an array.' });
    }
    if (!extractionTypes.length && !hasCustomFields(rawCustomFields || customPrompt)) {
      return res.status(400).json({
        message: 'Select at least one extraction type or provide custom extraction fields.',
      });
    }

    await authorizeDocument({ documentId, projectId, userId: req.user._id });

    const job = await createExtractionJob({
      documentId,
      extractionTypes,
      customFields,
      customPrompt,
      projectId,
      userId: req.user._id,
      force: Boolean(body.force || body.forceRecompute),
    });
    const extraction = job?.extraction || job;
    const cached = Boolean(job?.cached);
    const shouldRun = extraction?.status === 'QUEUED' && !cached;

    if (shouldRun) {
      setImmediate(async () => {
        try {
          await runExtractionJob(extraction._id);
        } catch (error) {
          // The service records an actionable failure status; avoid an
          // unhandled rejection after the HTTP response has been sent.
          console.error('[EXTRACTION JOB ERROR] ' + extraction._id + ': ' + error.message);
        }
      });
    }

    return res.status(shouldRun ? 202 : 200).json({
      extraction,
      cached,
    });
  } catch (error) {
    console.error('[EXTRACTION CONTROLLER ERROR] ' + error.message);
    return res.status(getErrorStatus(error)).json({ message: error.message || 'Unable to start extraction.' });
  }
};

/**
 * GET /api/extractions/:id
 */
const getInformationExtractionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(404).json({ message: 'Extraction not found.' });

    const extraction = await InformationExtraction.findOne({ _id: id, user: req.user._id });
    if (!extraction) return res.status(404).json({ message: 'Extraction not found.' });

    return res.json({ extraction });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load extraction.' });
  }
};

/**
 * GET /api/documents/:id/extractions
 */
const getDocumentExtractions = async (req, res) => {
  try {
    const documentId = req.params.id;
    const projectId = req.query.projectId || null;
    await authorizeDocument({ documentId, projectId, userId: req.user._id });

    const records = await getDocumentExtractionRecords({
      documentId,
      userId: req.user._id,
      projectId,
    });
    const extractions = Array.isArray(records) ? records : records?.extractions || [];
    return res.json({ extractions });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ message: error.message || 'Unable to load extractions.' });
  }
};

/**
 * DELETE /api/extractions/:id
 */
const deleteInformationExtraction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(404).json({ message: 'Extraction not found.' });

    const deleted = await deleteExtractionRecord({ extractionId: id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Extraction not found.' });

    return res.json({ message: 'Extraction deleted successfully.', id: String(deleted._id || id) });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ message: error.message || 'Unable to delete extraction.' });
  }
};

module.exports = {
  initiateInformationExtraction,
  getInformationExtractionById,
  getDocumentExtractions,
  deleteInformationExtraction,
};
