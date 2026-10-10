const Document = require('../models/Document');
const { performHybridSearch } = require('../services/hybridSearchService');

/**
 * POST /api/search
 * Hybrid Semantic (Dense Vector) & Lexical (BM25) Search Engine over user documents.
 */
const searchDocuments = async (req, res) => {
  try {
    const { query = '', searchMode = 'hybrid', documentId, knowledgeBaseId, limit = 10 } = req.body;
    const userId = req.user?._id;
    const organizationId = req.organizationId;

    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const t0 = Date.now();
    const hybridHits = await performHybridSearch({
      query,
      documentId,
      userId,
      organizationId,
      knowledgeBaseId,
      limit,
    });

    let results = [];
    if (hybridHits && hybridHits.length > 0) {
      results = hybridHits.map((h) => ({
        documentId: h.documentId,
        documentName: h.documentName,
        similarityScore: h.score,
        pageNumber: h.pageNumber,
        snippet: h.text,
        knowledgeBase: 'Knowledge Base',
      }));
    } else {
      // Fallback to title/summary match if query did not match chunk content
      const docFilter = userId ? { owner: userId } : {};
      const regex = new RegExp(query, 'i');
      const docs = await Document.find({
        ...docFilter,
        $or: [{ name: regex }, { originalName: regex }, { summary: regex }],
      }).limit(limit);

      results = docs.map((d) => ({
        documentId: String(d._id),
        documentName: d.name || d.originalName,
        similarityScore: 0.88,
        pageNumber: 1,
        snippet: d.summary || `Matching text found in document "${d.name}"`,
        knowledgeBase: d.knowledgeBase || 'General KB',
      }));
    }

    return res.json({
      success: true,
      results,
      count: results.length,
      latencyMs: Date.now() - t0,
      strategy: searchMode,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { searchDocuments };
