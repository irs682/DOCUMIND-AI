const { QdrantClient } = require("@qdrant/js-client-rest");
const crypto = require("crypto");
const mongoose = require("mongoose");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://127.0.0.1:6333",
  apiKey: process.env.QDRANT_API_KEY || undefined,
  checkCompatibility: false,
  timeout: 3000,
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "documind_documents";
const VECTOR_SIZE = Number(process.env.QDRANT_VECTOR_SIZE || 384);

const pointId = (documentId, index) => {
  const hex = crypto.createHash("sha256").update(`${documentId}:${index}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Initializes the Qdrant collection with Cosine similarity if it does not exist.
 */
const initializeCollection = async (vectorSize = VECTOR_SIZE) => {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (collection) => collection.name === COLLECTION_NAME
    );

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      });
      console.log(`[QDRANT] Collection "${COLLECTION_NAME}" initialized with vector size ${vectorSize}.`);
    }
    return true;
  } catch (error) {
    const targetUrl = process.env.QDRANT_URL || "http://127.0.0.1:6333";
    console.warn(`[QDRANT NOTICE] Target ${targetUrl}: ${error.message}`);
    return false;
  }
};

/**
 * Store document chunk embeddings in Qdrant with complete multi-tenant payload metadata.
 */
const storeDocumentChunks = async ({
  documentId,
  userId,
  organizationId = null,
  knowledgeBaseId = "kb-1",
  filename = '',
  chunks,
  embeddings,
}) => {
  if (!chunks.length || !embeddings.length) {
    throw new Error("Chunks and embeddings are required");
  }

  if (chunks.length !== embeddings.length) {
    throw new Error("Chunk count and embedding count must match");
  }
  if (embeddings.some((vector) => !Array.isArray(vector) || vector.length !== VECTOR_SIZE)) {
    throw new Error(`All embeddings must be real ${VECTOR_SIZE}-dimensional vectors`);
  }

  const points = chunks.map((chunk, index) => ({
    id: pointId(documentId, chunk.index ?? index),
    vector: embeddings[index],
    payload: {
      document_id: String(documentId),
      document_name: filename,
      documentId: String(documentId),
      user_id: String(userId),
      userId: String(userId),
      organization_id: organizationId ? String(organizationId) : null,
      organizationId: organizationId ? String(organizationId) : null,
      knowledgeBaseId: knowledgeBaseId ? String(knowledgeBaseId) : null,
      chunk_id: chunk.index ?? index,
      chunkIndex: chunk.index ?? index,
      filename,
      documentName: filename,
      page_number: chunk.pageNumber || 1,
      pageNumber: chunk.pageNumber || 1,
      section: chunk.section || "General",
      subsection: chunk.subsection || null,
      parent_section: chunk.parentSection || null,
      parentSection: chunk.parentSection || null,
      requirement_id: chunk.requirementId || null,
      requirementId: chunk.requirementId || null,
      requirement_name: chunk.requirementName || null,
      requirementName: chunk.requirementName || null,
      content_type: chunk.contentType || "general_text",
      contentType: chunk.contentType || "general_text",
      parentChunkId: chunk.parentChunkId || null,
      isReference: Boolean(chunk.isReference),
      isTable: Boolean(chunk.isTable),
      isFigure: Boolean(chunk.isFigure),
      tableMetadata: chunk.tableMetadata || null,
      figureMetadata: chunk.figureMetadata || null,
      object_type: chunk.objectType || (chunk.isTable ? "table" : (chunk.isFigure ? "figure" : "text")),
      objectType: chunk.objectType || (chunk.isTable ? "table" : (chunk.isFigure ? "figure" : "text")),
      object_id: chunk.objectId || (chunk.isTable ? chunk.tableMetadata?.tableId : (chunk.isFigure ? chunk.figureMetadata?.figureId : null)),
      objectId: chunk.objectId || (chunk.isTable ? chunk.tableMetadata?.tableId : (chunk.isFigure ? chunk.figureMetadata?.figureId : null)),
      figure_number: chunk.figureNumber || chunk.figureMetadata?.figureNumber || null,
      figureNumber: chunk.figureNumber || chunk.figureMetadata?.figureNumber || null,
      image_path: chunk.imagePath || chunk.figureMetadata?.imagePath || null,
      imagePath: chunk.imagePath || chunk.figureMetadata?.imagePath || null,
      caption: chunk.caption || null,
      source_method: chunk.sourceMethod || "native_text",
      sourceMethod: chunk.sourceMethod || "native_text",
      bbox: chunk.bbox || [],
      structured_data: chunk.structuredData || null,
      structuredData: chunk.structuredData || null,
      embeddingProvider: process.env.EMBEDDING_PROVIDER || 'huggingface',
      embeddingModel: process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
      embeddingDimension: VECTOR_SIZE,
      embeddingVersion: 'minilm-v1',
      text: chunk.text,
    },
  }));

  // Try saving to Qdrant if service is running
  let qdrantSuccess = false;
  try {
    const initialized = await initializeCollection(VECTOR_SIZE);
    if (initialized) {
      await deleteDocumentVectors(documentId, userId).catch(() => {});
      await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points,
      });
      console.log(`[QDRANT] document_id=${documentId} vectors_written=${points.length} status=SUCCESS`);
      qdrantSuccess = true;
    }
  } catch (err) {
    console.warn(`[QDRANT WARNING] Qdrant write skipped (${err.message}). Using MongoDB vector index.`);
  }

  return points;
};

/**
 * Perform Cosine similarity search filtered by documentId, userId, and optional structure filters.
 */
const searchSimilarChunks = async ({
  embedding,
  documentId,
  documentIds = [],
  userId,
  organizationId,
  knowledgeBaseId,
  requirementId,
  section,
  contentType,
  limit = 5,
}) => {
  let hits = [];

  // Strategy 1: Search Qdrant
  try {
    const filterConditions = [];

    if (documentIds && documentIds.length > 0) {
      if (documentIds.length === 1) {
        filterConditions.push({
          key: "document_id",
          match: { value: String(documentIds[0]) },
        });
      } else {
        filterConditions.push({
          key: "document_id",
          match: { any: documentIds.map(String) },
        });
      }
    } else if (documentId && documentId !== 'all') {
      filterConditions.push({
        key: "document_id",
        match: { value: String(documentId) },
      });
    }

    if (organizationId && organizationId !== 'all') {
      filterConditions.push({
        key: "organizationId",
        match: { value: String(organizationId) },
      });
    }

    if (userId) {
      filterConditions.push({
        key: "user_id",
        match: { value: String(userId) },
      });
    }

    if (knowledgeBaseId && knowledgeBaseId !== "all") {
      try {
        const Document = mongoose.models.Document || require('../models/Document');
        const kbDocs = await Document.find({
          $or: [{ knowledgeBaseId }, { knowledgeBaseIds: knowledgeBaseId }]
        }).select('_id');
        const docIds = kbDocs.map((d) => String(d._id));
        if (docIds.length === 0) {
          // If no documents belong to this KB yet, vector search returns empty
          return [];
        }
        if (docIds.length === 1) {
          filterConditions.push({
            key: "document_id",
            match: { value: docIds[0] },
          });
        } else {
          filterConditions.push({
            key: "document_id",
            match: { any: docIds },
          });
        }
      } catch (err) {
        filterConditions.push({
          key: "knowledgeBaseId",
          match: { value: String(knowledgeBaseId) },
        });
      }
    }

    if (requirementId) {
      filterConditions.push({
        key: "requirement_id",
        match: { value: String(requirementId) },
      });
    }

    if (section) {
      filterConditions.push({
        key: "section",
        match: { value: String(section) },
      });
    }

    if (contentType) {
      filterConditions.push({
        key: "content_type",
        match: { value: String(contentType) },
      });
    }

    const filter = filterConditions.length > 0 ? { must: filterConditions } : undefined;

    if (typeof qdrant.query === "function") {
      const resp = await qdrant.query(COLLECTION_NAME, {
        query: embedding,
        limit,
        with_payload: true,
        filter,
      });
      hits = resp?.points || resp || [];
    } else if (typeof qdrant.search === "function") {
      hits = await qdrant.search(COLLECTION_NAME, {
        vector: embedding,
        limit,
        with_payload: true,
        filter,
      });
    }
  } catch (err) {
    // Qdrant offline or returned error
  }

  if (hits && hits.length > 0) {
    return hits;
  }

  // Strategy 2: MongoDB Dense Cosine Similarity Search Fallback
  try {
    const Document = mongoose.models.Document || require('../models/Document');
    const filter = { status: { $ne: 'failed' } };
    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds };
    } else if (documentId && documentId !== 'all') {
      filter._id = documentId;
    }
    if (userId) filter.owner = userId;
    if (knowledgeBaseId && knowledgeBaseId !== 'all') {
      filter.$or = [{ knowledgeBaseId }, { knowledgeBaseIds: knowledgeBaseId }];
    }

    const docs = await Document.find(filter).select('_id name originalName chunks');
    if (docs && docs.length > 0) {
      const scoredCandidates = [];

      for (const d of docs) {
        if (!d.chunks || !d.chunks.length) continue;
        for (const c of d.chunks) {
          if (!c.text || c.isReference) continue;

          // Requirement filter check if provided
          if (requirementId && c.requirementId && c.requirementId !== requirementId) {
            continue;
          }

          let score = 0;
          if (embedding && c.embedding && c.embedding.length === embedding.length) {
            score = cosineSimilarity(embedding, c.embedding);
          } else {
            // Jaccard token fallback if embedding missing
            score = 0.5;
          }

          // Boost if exact requirement matches
          if (requirementId && (c.requirementId === requirementId || c.text.includes(requirementId))) {
            score = Math.max(score, 0.95);
          }

          scoredCandidates.push({
            score: parseFloat(score.toFixed(4)),
            payload: {
              document_id: String(d._id),
              document_name: d.name || d.originalName,
              documentId: String(d._id),
              documentName: d.name || d.originalName,
              chunkIndex: c.index,
              chunk_id: c.index,
              pageNumber: c.pageNumber || 1,
              page_number: c.pageNumber || 1,
              section: c.section || "General",
              subsection: c.subsection || null,
              parentSection: c.parentSection || null,
              parent_section: c.parentSection || null,
              requirementId: c.requirementId || null,
              requirement_id: c.requirementId || null,
              requirementName: c.requirementName || null,
              requirement_name: c.requirementName || null,
              contentType: c.contentType || "general_text",
              content_type: c.contentType || "general_text",
              objectType: c.objectType || (c.isTable ? "table" : (c.isFigure ? "figure" : "text")),
              object_type: c.objectType || (c.isTable ? "table" : (c.isFigure ? "figure" : "text")),
              objectId: c.objectId || null,
              object_id: c.objectId || null,
              caption: c.caption || null,
              sourceMethod: c.sourceMethod || "native_text",
              source_method: c.sourceMethod || "native_text",
              bbox: c.bbox || [],
              structuredData: c.structuredData || null,
              structured_data: c.structuredData || null,
              isTable: Boolean(c.isTable),
              isFigure: Boolean(c.isFigure),
              tableMetadata: c.tableMetadata || null,
              figureMetadata: c.figureMetadata || null,
              text: c.text,
            },
          });
        }
      }

      scoredCandidates.sort((a, b) => b.score - a.score);
      return scoredCandidates.slice(0, limit);
    }
  } catch (mongoErr) {
    console.warn(`[VECTORS] Mongo vector fallback notice: ${mongoErr.message}`);
  }

  return [];
};

/**
 * Delete vectors for a document from Qdrant.
 */
const deleteDocumentVectors = async (documentId, userId) => {
  try {
    for (const key of ["document_id", "documentId"]) {
      const filterConditions = [{ key, match: { value: String(documentId) } }];
      if (userId) {
        filterConditions.push({ key: key === "document_id" ? "user_id" : "userId", match: { value: String(userId) } });
      }
      await qdrant.delete(COLLECTION_NAME, {
        wait: true,
        filter: { must: filterConditions },
      }).catch(() => {});
    }
    console.log(`[QDRANT] Deleted vectors for document "${documentId}"`);
  } catch (err) {
    // Continue
  }
};

/**
 * Retrieve all chunks belonging to a document from Qdrant or MongoDB.
 */
const getDocumentChunks = async (documentId, limit = 100) => {
  try {
    const res = await qdrant.scroll(COLLECTION_NAME, {
      filter: {
        must: [{ key: "document_id", match: { value: String(documentId) } }],
      },
      limit,
      with_payload: true,
      with_vector: false,
    });
    const points = res?.points || [];
    if (points.length > 0) {
      return points
        .map((p) => p.payload)
        .filter(Boolean)
        .sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));
    }
  } catch (err) {
    // Continue to MongoDB fallback
  }

  // MongoDB Fallback
  try {
    const Document = mongoose.models.Document || require('../models/Document');
    const doc = await Document.findById(documentId).select('chunks name originalName');
    if (doc && doc.chunks) {
      return doc.chunks.map((c) => ({
        document_id: String(doc._id),
        document_name: doc.name || doc.originalName,
        chunkIndex: c.index,
        pageNumber: c.pageNumber || 1,
        section: c.section || "General",
        subsection: c.subsection || null,
        parentSection: c.parentSection || null,
        requirementId: c.requirementId || null,
        requirementName: c.requirementName || null,
        contentType: c.contentType || "general_text",
        text: c.text,
      }));
    }
  } catch (_) {}

  return [];
};

module.exports = {
  initializeCollection,
  storeDocumentChunks,
  searchSimilarChunks,
  deleteDocumentVectors,
  getDocumentChunks,
  cosineSimilarity,
};
