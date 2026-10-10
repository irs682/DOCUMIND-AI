const { searchSimilarChunks } = require('./vectorService');
const { createEmbedding } = require('./embeddingService');
const Document = require('../models/Document');
const { isUsableDocumentText } = require('./textQualityService');

/**
 * Tokenize and normalize text into meaningful terms.
 */
const tokenize = (text = '') => {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
    'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
};

/**
 * BM25 scoring implementation over in-memory / MongoDB document chunks.
 */
const scoreBM25 = (queryTerms, chunkText, avgDocLen, totalDocs, docFreqMap, k1 = 1.5, b = 0.75) => {
  const chunkTerms = tokenize(chunkText);
  const docLen = chunkTerms.length;
  if (docLen === 0) return 0;

  // Compute term frequencies in current chunk
  const tfMap = {};
  for (const t of chunkTerms) {
    tfMap[t] = (tfMap[t] || 0) + 1;
  }

  let score = 0;
  for (const term of queryTerms) {
    const tf = tfMap[term] || 0;
    if (tf === 0) continue;

    const df = docFreqMap[term] || 1;
    // Robertson-Sparck Jones IDF formula
    const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));

    // BM25 term weighting
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLen / Math.max(avgDocLen, 1)));
    score += idf * (numerator / denominator);
  }

  return score;
};

/**
 * Perform Reciprocal Rank Fusion (RRF) between dense vector results and lexical BM25 results.
 */
const reciprocalRankFusion = (denseResults, bm25Results, k = 60) => {
  const fusionMap = new Map();

  // Process dense vector rankings
  denseResults.forEach((item, rank) => {
    const key = `${item.documentId}:${item.chunkIndex}`;
    const denseScore = 1 / (k + (rank + 1));
    fusionMap.set(key, {
      ...item,
      denseRank: rank + 1,
      denseScore,
      bm25Rank: null,
      bm25Score: 0,
      rrfScore: denseScore,
    });
  });

  // Process BM25 rankings
  bm25Results.forEach((item, rank) => {
    const key = `${item.documentId}:${item.chunkIndex}`;
    const bm25Score = 1 / (k + (rank + 1));
    if (fusionMap.has(key)) {
      const existing = fusionMap.get(key);
      existing.bm25Rank = rank + 1;
      existing.bm25Score = bm25Score;
      existing.rrfScore += bm25Score;
    } else {
      fusionMap.set(key, {
        ...item,
        denseRank: null,
        denseScore: 0,
        bm25Rank: rank + 1,
        bm25Score,
        rrfScore: bm25Score,
      });
    }
  });

  const merged = Array.from(fusionMap.values());
  merged.sort((a, b) => b.rrfScore - a.rrfScore);

  // Normalize final score to [0.0, 1.0] range
  const maxScore = merged[0]?.rrfScore || 1;
  return merged.map((item) => ({
    ...item,
    score: parseFloat((item.rrfScore / maxScore).toFixed(2)),
  }));
};

/**
 * Hybrid Search Engine combining:
 * 1. Dense Vector Search via Qdrant / MongoDB Cosine (Sentence Transformers all-MiniLM-L6-v2)
 * 2. Lexical BM25 Search with Exact Requirement ID boosting
 * 3. Structure & Requirement-aware filtering
 * 4. Reciprocal Rank Fusion (RRF) & Reranking
 */
const { classifyQuery } = require('./queryRouterService');

/**
 * Hybrid Search Engine combining:
 * 1. Exact Identifier Lookup (Table ID, Figure ID, Requirement ID)
 * 2. Object Type-Specific Filtering & Boosting (TABLE_QUERY, FIGURE_QUERY)
 * 3. Dense Vector Search via Qdrant / MongoDB Cosine (Sentence Transformers all-MiniLM-L6-v2)
 * 4. Lexical BM25 Search with Exact Requirement & Object Boosting
 * 5. Complete Extraction Mode (omission checks, all rows in table, all requirements)
 * 6. Reciprocal Rank Fusion (RRF) & Reranking
 */
const performHybridSearch = async ({
  query,
  documentId,
  userId,
  organizationId,
  knowledgeBaseId,
  requirementId = null,
  section = null,
  contentType = null,
  limit = 8,
}) => {
  if (!query || !query.trim()) {
    return [];
  }

  // Stage 0: Query routing and intent classification
  const routerPlan = classifyQuery(query);
  const queryReqId = requirementId || routerPlan.requirementId;
  const targetTableId = routerPlan.tableId;
  const targetFigId = routerPlan.figureId;
  const isCompleteMode = routerPlan.isCompleteExtraction;
  const effectiveLimit = isCompleteMode ? Math.max(limit, 20) : limit;

  console.log(`[RETRIEVE] query="${query.slice(0, 50)}" type=${routerPlan.queryType} tableTarget=${targetTableId || 'none'} figTarget=${targetFigId || 'none'}`);

  const queryTerms = tokenize(query);

  // 1. Dense Vector Retrieval
  let denseResults = [];
  try {
    const queryVector = await createEmbedding(query);
    const hits = await searchSimilarChunks({
      embedding: queryVector,
      documentId,
      userId,
      organizationId,
      knowledgeBaseId,
      requirementId: queryReqId,
      section: section || routerPlan.sectionNumber,
      contentType,
      limit: effectiveLimit * 2,
    });

    denseResults = hits
      .filter((hit) => isUsableDocumentText(hit.payload?.text))
      .map((hit) => ({
        documentId: hit.payload?.documentId || hit.payload?.document_id,
        documentName: hit.payload?.documentName || hit.payload?.document_name || hit.payload?.filename || 'Document',
        chunkIndex: hit.payload?.chunkIndex ?? hit.payload?.chunk_id ?? 0,
        pageNumber: hit.payload?.pageNumber || hit.payload?.page_number || 1,
        section: hit.payload?.section || 'Content',
        subsection: hit.payload?.subsection || null,
        parentSection: hit.payload?.parentSection || hit.payload?.parent_section || null,
        requirementId: hit.payload?.requirementId || hit.payload?.requirement_id || null,
        requirementName: hit.payload?.requirementName || hit.payload?.requirement_name || null,
        contentType: hit.payload?.contentType || hit.payload?.content_type || 'general_text',
        objectType: hit.payload?.objectType || hit.payload?.object_type || (hit.payload?.isTable ? 'table' : (hit.payload?.isFigure ? 'figure' : 'text')),
        objectId: hit.payload?.objectId || hit.payload?.object_id || null,
        caption: hit.payload?.caption || null,
        sourceMethod: hit.payload?.sourceMethod || hit.payload?.source_method || 'native_text',
        bbox: hit.payload?.bbox || [],
        structuredData: hit.payload?.structuredData || hit.payload?.structured_data || null,
        isReference: Boolean(hit.payload?.isReference),
        isTable: Boolean(hit.payload?.isTable),
        isFigure: Boolean(hit.payload?.isFigure),
        tableMetadata: hit.payload?.tableMetadata || null,
        figureMetadata: hit.payload?.figureMetadata || null,
        text: hit.payload?.text || '',
        rawVectorScore: hit.score,
      }));
  } catch (err) {
    console.warn('[HybridSearch] Dense retrieval warning:', err.message);
  }

  // 2. Lexical BM25 Retrieval & Exact Object / Requirement Matching
  let bm25Results = [];
  try {
    const filter = { status: { $ne: 'failed' } };
    if (documentId && documentId !== 'all') {
      filter._id = documentId;
    }
    if (organizationId && organizationId !== 'all') {
      filter.organizationId = organizationId;
    }
    if (userId) {
      filter.owner = userId;
    }
    if (knowledgeBaseId && knowledgeBaseId !== 'all') {
      filter.$or = [{ knowledgeBaseId }, { knowledgeBaseIds: knowledgeBaseId }];
    }

    const docs = await Document.find(filter).select('_id name originalName chunks');
    if (docs && docs.length > 0) {
      const allChunks = [];
      for (const d of docs) {
        if (!d.chunks) continue;
        for (const c of d.chunks) {
          if (isUsableDocumentText(c.text)) {
            allChunks.push({
              documentId: String(d._id),
              documentName: d.name || d.originalName,
              chunkIndex: c.index,
              pageNumber: c.pageNumber || 1,
              section: c.section || 'Content',
              subsection: c.subsection || null,
              parentSection: c.parentSection || null,
              requirementId: c.requirementId || null,
              requirementName: c.requirementName || null,
              contentType: c.contentType || 'general_text',
              objectType: c.objectType || (c.isTable ? 'table' : (c.isFigure ? 'figure' : 'text')),
              objectId: c.objectId || (c.isTable ? c.tableMetadata?.tableId : (c.isFigure ? c.figureMetadata?.figureId : null)),
              caption: c.caption || null,
              sourceMethod: c.sourceMethod || 'native_text',
              bbox: c.bbox || [],
              structuredData: c.structuredData || null,
              isReference: Boolean(c.isReference),
              isTable: Boolean(c.isTable),
              isFigure: Boolean(c.isFigure),
              tableMetadata: c.tableMetadata || null,
              figureMetadata: c.figureMetadata || null,
              text: c.text,
            });
          }
        }
      }

      if (allChunks.length > 0) {
        const totalDocs = allChunks.length;
        const avgDocLen = allChunks.reduce((acc, c) => acc + tokenize(c.text).length, 0) / totalDocs;

        const docFreqMap = {};
        for (const term of queryTerms) {
          docFreqMap[term] = allChunks.filter((c) => c.text.toLowerCase().includes(term)).length;
        }

        const scoredChunks = allChunks.map((chunk) => {
          const bm25 = scoreBM25(queryTerms, chunk.text, avgDocLen, totalDocs, docFreqMap);
          const phraseBonus = chunk.text.toLowerCase().includes(query.toLowerCase()) ? 2.5 : 0;
          
          let priorityBonus = 0;

          // Requirement exact match bonus
          if (queryReqId) {
            if (chunk.requirementId === queryReqId) {
              priorityBonus += 12.0;
            } else if (chunk.text.includes(queryReqId)) {
              priorityBonus += 8.0;
            }
          }

          // Exact Table ID match bonus
          if (targetTableId) {
            const cleanTid = targetTableId.replace('table_', '');
            const matchById = chunk.objectId === targetTableId || chunk.tableMetadata?.tableId === targetTableId;
            const matchByText = new RegExp(`\\btable\\s+${cleanTid}\\b`, 'i').test(chunk.text);
            if (matchById || matchByText) {
              priorityBonus += 15.0;
            }
          }

          // Exact Figure ID match bonus
          if (targetFigId || routerPlan.figureNumber || routerPlan.exactFigureId) {
            const cleanFid = (targetFigId || '').replace('figure_', '') || routerPlan.figureNumber;
            const matchById = chunk.objectId === targetFigId ||
                              chunk.objectId === routerPlan.exactFigureId ||
                              chunk.objectId === `Figure ${cleanFid}` ||
                              chunk.figureMetadata?.figureId === targetFigId ||
                              chunk.figureMetadata?.objectId === `Figure ${cleanFid}` ||
                              chunk.figureMetadata?.figureNumber === cleanFid ||
                              chunk.figureNumber === cleanFid;
            const matchByText = cleanFid ? new RegExp(`\\b(?:figure|fig\\.)\\s+${cleanFid}\\b`, 'i').test(chunk.text || '') : false;
            if (matchById) {
              priorityBonus += 30.0;
            } else if (matchByText) {
              priorityBonus += 15.0;
            }
          }

          // Object-Type specific boosting
          if (routerPlan.queryType === 'TABLE_QUERY' && (chunk.isTable || chunk.objectType === 'table')) {
            priorityBonus += 8.0;
          }
          if (routerPlan.queryType === 'FIGURE_QUERY' && (chunk.isFigure || chunk.objectType === 'figure')) {
            priorityBonus += 12.0;
          }

          return {
            ...chunk,
            rawBm25Score: bm25 + phraseBonus + priorityBonus,
          };
        });

        scoredChunks.sort((a, b) => b.rawBm25Score - a.rawBm25Score);
        bm25Results = scoredChunks.filter((c) => c.rawBm25Score > 0).slice(0, effectiveLimit * 2);
      }
    }
  } catch (err) {
    console.warn('[HybridSearch] Lexical BM25 retrieval warning:', err.message);
  }

  // 3. Score Fusion: Reciprocal Rank Fusion (RRF)
  let fusedResults = [];
  if (denseResults.length > 0 && bm25Results.length > 0) {
    fusedResults = reciprocalRankFusion(denseResults, bm25Results);
  } else if (denseResults.length > 0) {
    fusedResults = denseResults.map((item, idx) => ({
      ...item,
      score: parseFloat((item.rawVectorScore || (0.95 - idx * 0.05)).toFixed(2)),
    }));
  } else if (bm25Results.length > 0) {
    const maxBm25 = bm25Results[0]?.rawBm25Score || 1;
    fusedResults = bm25Results.map((item) => ({
      ...item,
      score: parseFloat(Math.min(0.99, 0.4 + (item.rawBm25Score / maxBm25) * 0.55).toFixed(2)),
    }));
  }

  // 4. Exact Identifier & Complete Mode Re-Ranking
  fusedResults.sort((a, b) => {
    // Exact table match to top
    if (targetTableId) {
      const cleanT = targetTableId.replace('table_', '');
      const aT = a.objectId === targetTableId || a.tableMetadata?.tableId === targetTableId || new RegExp(`\\btable\\s+${cleanT}\\b`, 'i').test(a.text);
      const bT = b.objectId === targetTableId || b.tableMetadata?.tableId === targetTableId || new RegExp(`\\btable\\s+${cleanT}\\b`, 'i').test(b.text);
      if (aT && !bT) return -1;
      if (!aT && bT) return 1;
    }
    // Exact figure match to top
    if (targetFigId) {
      const cleanF = targetFigId.replace('figure_', '');
      const aF = a.objectId === targetFigId || a.figureMetadata?.figureId === targetFigId || new RegExp(`\\b(?:figure|fig\\.)\\s+${cleanF}\\b`, 'i').test(a.text);
      const bF = b.objectId === targetFigId || b.figureMetadata?.figureId === targetFigId || new RegExp(`\\b(?:figure|fig\\.)\\s+${cleanF}\\b`, 'i').test(b.text);
      if (aF && !bF) return -1;
      if (!aF && bF) return 1;
    }
    // Requirement match to top
    if (queryReqId) {
      const aR = a.requirementId === queryReqId || a.text.includes(queryReqId);
      const bR = b.requirementId === queryReqId || b.text.includes(queryReqId);
      if (aR && !bR) return -1;
      if (!aR && bR) return 1;
    }
    return (b.score || 0) - (a.score || 0);
  });

  const asksForReferences = /\b(referenc|bibliograph|cited|citations?)\b/i.test(query);
  const cleanFused = asksForReferences ? fusedResults : fusedResults.filter((item) => !item.isReference);
  const finalHits = (cleanFused.length > 0 ? cleanFused : fusedResults).slice(0, effectiveLimit);

  console.log(`[RERANK] returned=${finalHits.length} top_type=${finalHits[0]?.objectType || 'none'} top_id=${finalHits[0]?.objectId || 'none'}`);
  return finalHits;
};

module.exports = {
  performHybridSearch,
  reciprocalRankFusion,
  tokenize,
};
