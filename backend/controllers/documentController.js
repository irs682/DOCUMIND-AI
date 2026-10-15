const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const KnowledgeBase = require('../models/KnowledgeBase');
const Project = require('../models/Project');
const ChatSession = require('../models/ChatSession');
const InformationExtraction = require('../models/InformationExtraction');
const { processDocument, reprocessDocument } = require('../services/documentPipelineService');
const { deleteDocumentVectors } = require('../services/vectorService');
const storageService = require('../services/storageService');

/**
 * POST /api/documents/upload
 * Saves uploaded file, creates Document record, and automatically triggers
 * the central document processing pipeline.
 */
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log(`[UPLOAD] File received: "${req.file.originalname}", size: ${req.file.size} bytes, user_id: ${req.user._id}`);

    const { knowledgeBaseId = null, knowledgeBase: kbNameParam = null, projectId = null } = req.body;
    let knowledgeBase = null;
    let project = null;

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      project = await Project.findOne({ _id: projectId, owner: req.user._id });
      if (!project) return res.status(404).json({ message: 'Project not found' });
    }

    if (knowledgeBaseId && mongoose.Types.ObjectId.isValid(knowledgeBaseId)) {
      knowledgeBase = await KnowledgeBase.findOne({ _id: knowledgeBaseId, owner: req.user._id });
    }

    const kbName = knowledgeBase?.name || kbNameParam || 'Unassigned';
    const kbId = knowledgeBase?._id || (knowledgeBaseId && mongoose.Types.ObjectId.isValid(knowledgeBaseId) ? knowledgeBaseId : null);
    const formattedSize = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`;

    let storageKey = null;
    let storageProvider = storageService.getStorageProvider();
    let storageUrl = null;

    if (storageProvider === 'supabase') {
      try {
        const fileBuf = fs.readFileSync(req.file.path);
        const uploaded = await storageService.uploadFile(fileBuf, {
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          userId: req.user._id,
          folder: 'documents',
        });
        storageKey = uploaded.storageKey;
        storageUrl = uploaded.signedUrl;
      } catch (uploadErr) {
        console.warn(`[STORAGE] Supabase upload error: ${uploadErr.message}. Operating with local copy.`);
        storageProvider = 'local';
      }
    }

    // ── Step 1: Save to MongoDB immediately with status 'uploaded' ──
    const savedDocument = await Document.create({
      name: req.file.originalname,
      originalName: req.file.originalname,
      original_filename: req.file.originalname,
      storedFilename: req.file.filename,
      stored_filename: req.file.filename,
      filePath: req.file.path,
      file_path: req.file.path,
      storageKey,
      storageProvider,
      storageUrl,
      mimeType: req.file.mimetype,
      mime_type: req.file.mimetype,
      size: req.file.size,
      file_size: req.file.size,
      formattedSize,
      status: 'uploaded',
      processingStep: '01 Upload complete',
      knowledgeBase: kbName,
      knowledgeBaseId: kbId,
      knowledgeBaseIds: kbId ? [kbId] : [],
      projectId: project?._id || null,
      owner: req.user._id,
      user_id: req.user._id,
      summary: `Uploaded: ${req.file.originalname}`,
      chunksCount: 0,
    });

    console.log(`[DOCUMENT] Created document record in MongoDB with ID ${savedDocument._id}`);

    // ── Step 2: Return 201 immediately ──
    res.status(201).json({
      document: savedDocument,
      message: 'Document uploaded successfully. Processing pipeline started in background…',
    });

    // ── Step 3: Trigger ONE Central Processing Pipeline ──
    setImmediate(async () => {
      try {
        await processDocument(savedDocument._id);
      } catch (err) {
        console.error(`[PIPELINE] Automatic background processing failed for ${savedDocument._id}: ${err.message}`);
      }
    });
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/documents
 */
const getDocuments = async (req, res) => {
  try {
    const ownerConditions = [{ owner: req.user._id }];
    if (req.user.id && req.user.id !== String(req.user._id)) {
      ownerConditions.push({ owner: req.user.id });
    }
    const docs = await Document.find({ $or: ownerConditions })
      .select('-chunks -evidenceObjects -tables -figures')
      .sort({ createdAt: -1 });
    return res.json({ documents: docs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/documents/:id
 */
const getDocumentById = async (req, res) => {
  try {
    const ownerConditions = [{ owner: req.user._id }];
    if (req.user.id && req.user.id !== String(req.user._id)) {
      ownerConditions.push({ owner: req.user.id });
    }
    const doc = await Document.findOne({ _id: req.params.id, $or: ownerConditions }).select('-chunks');
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    return res.json({ document: doc });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/documents/:id/reindex
 * Genuinely reruns the central document pipeline from the original file.
 */
const reindexDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await reprocessDocument(id, req.user._id);
    return res.json(result);
  } catch (error) {
    console.error(`[REPROCESS ERROR] ${req.params.id}:`, error.message);
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * DELETE /api/documents/:id
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Document.findOneAndDelete({ _id: id, owner: req.user._id });
    if (!deleted) return res.status(404).json({ message: 'Document not found' });

    // Clean vectors from Qdrant
    await deleteDocumentVectors(id, req.user._id).catch(() => {});

    // Clean references from projects and chat sessions
    await Project.updateMany({ owner: req.user._id }, { $pull: { documentIds: id } }).catch(() => {});
    await ChatSession.updateMany({ user: req.user._id }, { $pull: { selectedDocumentIds: id } }).catch(() => {});
    await InformationExtraction.deleteMany({ documentId: id, user: req.user._id }).catch(() => {});

    if (deleted.storageKey) {
      await storageService.deleteFile(deleted.storageKey).catch(() => {});
    }
    if (deleted.filePath && fs.existsSync(deleted.filePath)) {
      try {
        fs.unlinkSync(deleted.filePath);
      } catch (_) {}
    }
    return res.json({ message: 'Document deleted successfully', id });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  reindexDocument,
  deleteDocument,
};
