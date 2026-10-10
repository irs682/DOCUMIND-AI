const mongoose = require('mongoose');
const KnowledgeBase = require('../models/KnowledgeBase');
const Document = require('../models/Document');
const { logAudit } = require('../services/auditService');

/**
 * Automatically seeds the 3 default Knowledge Bases if a user currently has none.
 */
const seedDefaultKbs = async (userId) => {
  const defaults = [
    {
      name: 'Finance & Legal',
      description: 'Quarterly financial statements, audit reports, regulatory compliance, and contracts.',
      isPrivate: true,
      embeddingModel: 'text-embedding-3-small',
      owner: userId,
    },
    {
      name: 'Engineering & Architecture',
      description: 'Technical spec sheets, API documentation, system diagrams, and research papers.',
      isPrivate: false,
      embeddingModel: 'text-embedding-3-small',
      owner: userId,
    },
    {
      name: 'Product & Customer Insights',
      description: 'User survey data, product roadmap features, market research, and feature feedback.',
      isPrivate: false,
      embeddingModel: 'bge-m3',
      owner: userId,
    },
  ];

  for (const item of defaults) {
    try {
      const existing = await KnowledgeBase.findOne({ owner: userId, name: item.name });
      if (!existing) {
        const created = await KnowledgeBase.create(item);
        // Link any preexisting documents matching this name
        await Document.updateMany(
          { owner: userId, knowledgeBase: item.name },
          { $addToSet: { knowledgeBaseIds: created._id }, $set: { knowledgeBaseId: created._id } }
        );
      }
    } catch (_) {}
  }
};

/**
 * Dynamically synchronizes real document and vector counts on a KnowledgeBase.
 */
const syncKnowledgeBaseStats = async (kbId, userId) => {
  const docs = await Document.find({
    owner: userId,
    $or: [{ knowledgeBaseId: kbId }, { knowledgeBaseIds: kbId }],
  }).select('chunksCount vectorsCount');

  const docCount = docs.length;
  const vectorCount = docs.reduce((acc, d) => acc + (d.chunksCount || d.vectorsCount || 0), 0);

  await KnowledgeBase.updateOne({ _id: kbId }, { $set: { docCount, vectorCount } });
  return { docCount, vectorCount };
};

const createKnowledgeBase = async (req, res) => {
  try {
    const { name, description = '', isPrivate = true, embeddingModel = 'text-embedding-3-small' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Knowledge base name is required' });

    const knowledgeBase = await KnowledgeBase.create({
      name: name.trim(),
      description,
      isPrivate,
      embeddingModel,
      owner: req.user._id,
      docCount: 0,
      vectorCount: 0,
    });

    await logAudit(req, 'knowledge_base.created', 'KnowledgeBase', knowledgeBase._id);
    return res.status(201).json({
      knowledgeBase,
      message: 'Knowledge base created successfully',
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already have a knowledge base with this name' });
    return res.status(500).json({ message: error.message });
  }
};

const getKnowledgeBases = async (req, res) => {
  try {
    let knowledgeBases = await KnowledgeBase.find({ owner: req.user._id }).sort({ updatedAt: -1 });

    if (!knowledgeBases || knowledgeBases.length === 0) {
      await seedDefaultKbs(req.user._id);
      knowledgeBases = await KnowledgeBase.find({ owner: req.user._id }).sort({ updatedAt: -1 });
    }

    // Refresh live counts for all KBs
    const enriched = await Promise.all(
      knowledgeBases.map(async (kb) => {
        const stats = await syncKnowledgeBaseStats(kb._id, req.user._id);
        const kbObj = kb.toObject();
        kbObj.docCount = stats.docCount;
        kbObj.vectorCount = stats.vectorCount;
        return kbObj;
      })
    );

    return res.json({ knowledgeBases: enriched });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getKnowledgeBaseById = async (req, res) => {
  try {
    const knowledgeBase = await KnowledgeBase.findOne({ _id: req.params.id, owner: req.user._id });
    if (!knowledgeBase) return res.status(404).json({ message: 'Knowledge base not found' });

    const documents = await Document.find({
      owner: req.user._id,
      $or: [{ knowledgeBaseId: knowledgeBase._id }, { knowledgeBaseIds: knowledgeBase._id }],
    })
      .select('-chunks')
      .sort({ createdAt: -1 });

    // Update real stats
    const stats = await syncKnowledgeBaseStats(knowledgeBase._id, req.user._id);
    const kbObj = knowledgeBase.toObject();
    kbObj.docCount = stats.docCount;
    kbObj.vectorCount = stats.vectorCount;

    return res.json({ knowledgeBase: kbObj, documents });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateKnowledgeBase = async (req, res) => {
  try {
    const allowed = ['name', 'description', 'isPrivate', 'embeddingModel'];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const knowledgeBase = await KnowledgeBase.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      update,
      { new: true, runValidators: true }
    );
    if (!knowledgeBase) return res.status(404).json({ message: 'Knowledge base not found' });
    await logAudit(req, 'knowledge_base.updated', 'KnowledgeBase', knowledgeBase._id);
    return res.json({ knowledgeBase, message: 'Knowledge base updated' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Adds one or more existing documents to a Knowledge Base without duplicating files or vectors.
 */
const addDocumentsToKnowledgeBase = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentIds } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: 'documentIds array is required' });
    }

    const knowledgeBase = await KnowledgeBase.findOne({ _id: id, owner: req.user._id });
    if (!knowledgeBase) return res.status(404).json({ message: 'Knowledge base not found' });

    const validDocObjectIds = documentIds
      .filter((docId) => mongoose.Types.ObjectId.isValid(docId))
      .map((docId) => new mongoose.Types.ObjectId(docId));

    if (validDocObjectIds.length === 0) {
      return res.status(400).json({ message: 'No valid document IDs provided' });
    }

    const existingDocs = await Document.find({
      _id: { $in: validDocObjectIds },
      owner: req.user._id,
    });

    let addedCount = 0;
    let alreadyPresentCount = 0;

    for (const doc of existingDocs) {
      const alreadyHas =
        (doc.knowledgeBaseIds && doc.knowledgeBaseIds.some((kbRef) => String(kbRef) === String(knowledgeBase._id))) ||
        (doc.knowledgeBaseId && String(doc.knowledgeBaseId) === String(knowledgeBase._id));

      if (alreadyHas) {
        alreadyPresentCount++;
      } else {
        await Document.updateOne(
          { _id: doc._id },
          {
            $addToSet: { knowledgeBaseIds: knowledgeBase._id },
            $set: {
              ...(!doc.knowledgeBaseId ? { knowledgeBaseId: knowledgeBase._id } : {}),
              ...(!doc.knowledgeBase || doc.knowledgeBase === 'Unassigned' || doc.knowledgeBase === 'General KB'
                ? { knowledgeBase: knowledgeBase.name }
                : {}),
            },
          }
        );
        addedCount++;
      }
    }

    const stats = await syncKnowledgeBaseStats(knowledgeBase._id, req.user._id);
    await logAudit(req, 'knowledge_base.documents_added', 'KnowledgeBase', knowledgeBase._id);

    return res.json({
      message: `Successfully added ${addedCount} document(s) to ${knowledgeBase.name}.`,
      addedCount,
      alreadyPresentCount,
      docCount: stats.docCount,
      vectorCount: stats.vectorCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Removes a document from this Knowledge Base only. The original document and its vectors remain intact in the platform.
 */
const removeDocumentFromKnowledgeBase = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const knowledgeBase = await KnowledgeBase.findOne({ _id: id, owner: req.user._id });
    if (!knowledgeBase) return res.status(404).json({ message: 'Knowledge base not found' });

    const doc = await Document.findOne({ _id: documentId, owner: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Pull knowledge base ID from document
    await Document.updateOne(
      { _id: doc._id },
      {
        $pull: { knowledgeBaseIds: knowledgeBase._id },
      }
    );

    // If primary knowledgeBaseId was this KB, switch to remaining or null
    if (doc.knowledgeBaseId && String(doc.knowledgeBaseId) === String(knowledgeBase._id)) {
      const remainingKbIds = (doc.knowledgeBaseIds || []).filter(
        (kbRef) => String(kbRef) !== String(knowledgeBase._id)
      );
      const nextKbId = remainingKbIds[0] || null;
      let nextKbName = 'General KB';
      if (nextKbId) {
        const nextKb = await KnowledgeBase.findById(nextKbId);
        if (nextKb) nextKbName = nextKb.name;
      }
      await Document.updateOne(
        { _id: doc._id },
        {
          $set: {
            knowledgeBaseId: nextKbId,
            knowledgeBase: nextKbName,
          },
        }
      );
    }

    const stats = await syncKnowledgeBaseStats(knowledgeBase._id, req.user._id);
    await logAudit(req, 'knowledge_base.document_removed', 'KnowledgeBase', knowledgeBase._id);

    return res.json({
      message: `Removed "${doc.name}" from ${knowledgeBase.name}. The document remains available in your global Documents library.`,
      documentId,
      docCount: stats.docCount,
      vectorCount: stats.vectorCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Deletes a Knowledge Base and cleanly detaches all document references without deleting the documents themselves.
 */
const deleteKnowledgeBase = async (req, res) => {
  try {
    const { id } = req.params;
    const knowledgeBase = await KnowledgeBase.findOne({ _id: id, owner: req.user._id });
    if (!knowledgeBase) return res.status(404).json({ message: 'Knowledge base not found' });

    // Detach all documents from this KB
    await Document.updateMany(
      { owner: req.user._id, $or: [{ knowledgeBaseId: knowledgeBase._id }, { knowledgeBaseIds: knowledgeBase._id }] },
      {
        $pull: { knowledgeBaseIds: knowledgeBase._id },
      }
    );
    await Document.updateMany(
      { owner: req.user._id, knowledgeBaseId: knowledgeBase._id },
      {
        $set: { knowledgeBaseId: null, knowledgeBase: 'General KB' },
      }
    );

    await KnowledgeBase.deleteOne({ _id: id });
    await logAudit(req, 'knowledge_base.deleted', 'KnowledgeBase', knowledgeBase._id);

    return res.json({
      message: `Knowledge base "${knowledgeBase.name}" deleted. Any associated documents remain preserved in your Documents library.`,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createKnowledgeBase,
  getKnowledgeBases,
  getKnowledgeBaseById,
  updateKnowledgeBase,
  addDocumentsToKnowledgeBase,
  removeDocumentFromKnowledgeBase,
  deleteKnowledgeBase,
};
