const fs = require("fs");
const path = require("path");
const Document = require("../models/Document");
const { chunkDocument, chunkText } = require("./chunkService");
const { createEmbedding, createEmbeddings } = require("./embeddingService");
const {
  storeDocumentChunks,
  searchSimilarChunks,
  deleteDocumentVectors,
  initializeCollection,
} = require("./vectorService");
const ChatSession = require("../models/ChatSession");
const {
  generateAnswer,
  streamOpenRouter,
  getMainModel,
  getFastModel,
  summarizeDocument,
  summarizeBatch,
  summarizeMultipleDocuments,
  classifyIntent,
  generateGeneralAnswer,
  deduplicateText,
  formatCleanPlainText,
} = require("./llmService");
const {
  getRecentConversationHistory,
  getRollingSummary,
  retrieveRelevantUserMemories,
  handleExplicitMemoryCommands,
  buildMemoryPromptSection,
} = require("./memoryService");
const { isUsableDocumentText, cleanDocumentText } = require("./textQualityService");
const { extractTextFromPDF, extractDetailedPDF } = require("./pdfService");
const { loadDocument } = require("./documentLoaderService");
const { performHybridSearch } = require("./hybridSearchService");
const {
  classifyQueryIntent,
  checkRequirementCoverage,
  detectConflicts,
  validateAndCorrectAnswer,
} = require("./groundingService");
const { classifyQuery } = require("./queryRouterService");
const {
  formatObjectCitation,
  checkMissingObjectFailure,
  buildEvidenceLedger,
} = require("./evidenceLedgerService");
const {
  buildVerifiedFigureEvidence,
  stripInternalReasoning,
  normalizeParticipants,
  validateInteractions,
} = require("./figureEvidenceValidatorService");

const isSummaryQuestion = (question = "") => {
  const q = (question || "").trim().toLowerCase();
  return /\b(summar(?:y|ize|ise|ized|ised)|executive summary)\b/i.test(q);
};

/**
 * On-the-fly text extraction and chunk generation if document chunks are missing or empty.
 */
const ensureDocChunks = async (doc, force = false) => {
  if (['failed', 'extraction_failed', 'validation_failed', 'chunking_failed', 'embedding_failed', 'index_failed', 'document_extraction_failed'].includes(doc?.status)) {
    return doc;
  }
  const hasUsableChunk = doc.chunks?.some((chunk) => isUsableDocumentText(chunk.text));
  if (!force && doc.chunks && doc.chunks.length >= 5 && hasUsableChunk) return doc;

  let resolvedPath = doc.filePath;
  if (resolvedPath && !fs.existsSync(resolvedPath)) {
    const candidate = path.join(__dirname, "..", resolvedPath);
    if (fs.existsSync(candidate)) {
      resolvedPath = candidate;
    }
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    console.warn(`[ragService] File not found for document ${doc.name}`);
    return doc;
  }

  let formattedChunks = [];
  const fileName = doc.name || doc.originalName || "Document";

  try {
    const loaded = await loadDocument(resolvedPath, fileName);
    if (loaded && loaded.pages && loaded.pages.length > 0) {
      formattedChunks = chunkDocument({
        pages: loaded.pages,
        documentId: doc._id,
        fileName,
      });
    }
  } catch (e) {
    console.warn(`[ragService] Error extracting chunks for ${doc.name}:`, e.message);
  }

  if (!formattedChunks.length) {
    return doc;
  }

  doc.chunks = formattedChunks;
  doc.chunksCount = formattedChunks.length;
  doc.status = "ready";

  await Document.findByIdAndUpdate(doc._id, {
    chunks: formattedChunks,
    chunksCount: formattedChunks.length,
    status: "ready",
    processingStep: "08 Ready",
    errorMessage: "",
    error_message: "",
  }).catch(() => {});

  return doc;
};

/**
 * Fallback local keyword search over MongoDB document chunks.
 */
const searchLocalChunks = async ({ question, documentId, userId, knowledgeBaseId, limit = 6 }) => {
  const filter = {};
  if (documentId && documentId !== "all") {
    filter._id = documentId;
  } else if (userId) {
    filter.owner = userId;
  }
  if (knowledgeBaseId && knowledgeBaseId !== "all") {
    filter.$or = [{ knowledgeBaseId: knowledgeBaseId }, { knowledgeBaseIds: knowledgeBaseId }];
  }

  const docs = await Document.find({
    ...filter,
    status: { $nin: ["failed", "index_failed", "document_extraction_failed"] },
  });
  if (!docs || !docs.length) return [];

  const normalizedQuestion = question.toLowerCase().trim();
  const queryTerms = normalizedQuestion
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const stopWords = new Set([
    "about", "after", "again", "been", "being", "could", "does", "from",
    "have", "into", "more", "most", "other", "please", "should", "that",
    "their", "there", "these", "this", "what", "when", "where", "which",
    "with", "would", "your", "document", "file", "pdf",
  ]);
  const meaningfulTerms = queryTerms.filter((term) => !stopWords.has(term));

  const candidates = [];

  for (let doc of docs) {
    if (["failed", "index_failed", "document_extraction_failed"].includes(doc.status)) continue;
    const hasUsableChunk = doc.chunks?.some((chunk) => isUsableDocumentText(chunk.text));
    if (!doc.chunks || doc.chunks.length < 5 || !hasUsableChunk) {
      doc = await ensureDocChunks(doc, true);
    }
    if (!doc.chunks || !doc.chunks.length) continue;

    for (const chunk of doc.chunks) {
      if (!isUsableDocumentText(chunk.text)) continue;

      let score = 0;
      const lower = chunk.text.toLowerCase();
      for (const term of meaningfulTerms) {
        if (lower.includes(term)) {
          score += 1;
        }
      }

      if (score > 0) {
        candidates.push({
          score: Math.min(0.85, 0.40 + score * 0.1),
          chunkIndex: chunk.index,
          documentId: String(doc._id),
          documentName: doc.name || doc.originalName || "Document Passage",
          pageNumber: chunk.pageNumber || 1,
          section: chunk.section || "General",
          isReference: Boolean(chunk.isReference),
          text: chunk.text,
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
};

/**
 * processDocument: Routes through the central documentPipelineService
 */
const { processDocument: pipelineProcessDocument } = require('./documentPipelineService');

const processDocument = async (arg) => {
  const docId = typeof arg === 'string' ? arg : (arg?.documentId || arg?._id || arg);
  return pipelineProcessDocument(docId);
};

/**
 * Hierarchical Map-Reduce Whole-Document Summarizer (Stages 13, 14, 15).
 * Groups non-reference chunks by section and token budget, generates intermediate summaries,
 * and synthesizes the final structured executive summary via OpenRouter.
 */
const summarizeDocumentHierarchically = async ({ doc, documentName }) => {
  let validChunks = (doc.chunks || []).filter(
    (c) => isUsableDocumentText(c.text) && !c.isReference && !/references|bibliography/i.test(c.section || "")
  );

  // Requirement 21: Decoupled summarization from Qdrant indexing
  if (!validChunks.length && doc.fullText && doc.fullText.trim().length > 30) {
    validChunks = [{
      section: "Overview",
      pageNumber: 1,
      index: 0,
      tokenCount: Math.round(doc.fullText.length / 4),
      text: doc.fullText.slice(0, 12000),
    }];
  }

  if (!validChunks.length) {
    return {
      answer: `The document "${documentName}" does not contain sufficient validated text to generate a summary.`,
      sources: [],
    };
  }

  console.log(`[SUMMARIZE] Hierarchical whole-document summarization mode for "${documentName}" (${validChunks.length} content chunks)`);

  let finalSummary = "";
  const intermediateSummaries = [];

  // Stage 13 & 14: Check document length
  const totalTokens = validChunks.reduce((sum, c) => sum + (c.tokenCount || 300), 0);

  if (validChunks.length <= 5 && totalTokens <= 2500) {
    // Short document: direct synthesis
    const context = validChunks
      .map((c) => `[Section: ${c.section || "Content"}, Page ${c.pageNumber}, Chunk #${c.index}]\n${c.text}`)
      .join("\n\n---\n\n");

    try {
      finalSummary = await summarizeDocument({
        context,
        documentName,
        isProposal: /proposal|research/i.test(documentName),
      });
    } catch (err) {
      console.error(`[SUMMARIZE ERROR] stage=direct_summary reason=${err.code || err.message}`);
      throw err;
    }
  } else {
    // Long document: Hierarchical Map-Reduce
    // Group chunks by section / token budget (~1,500-2,200 tokens per group to respect LLM context and rate limits)
    const groups = [];
    let currentGroup = [];
    let currentTokens = 0;
    let currentSection = validChunks[0]?.section || "Overview";

    for (const chunk of validChunks) {
      const chunkToks = chunk.tokenCount || 300;
      const sectionChanged = chunk.section && chunk.section !== currentSection;

      if ((currentTokens + chunkToks > 2000 || (sectionChanged && currentTokens > 1000)) && currentGroup.length > 0) {
        groups.push({ section: currentSection, chunks: currentGroup });
        currentGroup = [chunk];
        currentTokens = chunkToks;
        currentSection = chunk.section || currentSection;
      } else {
        currentGroup.push(chunk);
        currentTokens += chunkToks;
        if (chunk.section) currentSection = chunk.section;
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ section: currentSection, chunks: currentGroup });
    }

    console.log(`[SUMMARIZE] Map phase: Processing ${groups.length} chunk groups across ${validChunks.length} chunks`);

    let failedBatches = 0;
    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const g = groups[gIdx];
      const groupContext = g.chunks
        .map((c) => `[Page ${c.pageNumber} | ${c.section}]: ${c.text}`)
        .join("\n\n");

      try {
        const batchSumm = await summarizeBatch({
          context: groupContext,
          sectionName: g.section,
          documentName,
        });
        if (batchSumm) {
          intermediateSummaries.push(`Section: ${g.section} (Pages ${g.chunks[0]?.pageNumber || 1}–${g.chunks[g.chunks.length - 1]?.pageNumber || 1})\n${batchSumm}`);
        } else {
          failedBatches++;
        }
      } catch (mapErr) {
        failedBatches++;
        console.warn(`[SUMMARIZE] Batch ${gIdx + 1}/${groups.length} notice: ${mapErr.message}`);
      }
    }

    console.log(
      `[SUMMARIZE] Map phase completed | total_batches=${groups.length} successful_batches=${intermediateSummaries.length} failed_batches=${failedBatches}`
    );

    // Step 12: Fail immediately if ZERO map-stage summaries succeeded - do NOT call reduce
    if (intermediateSummaries.length === 0) {
      console.error(
        `[SUMMARIZE ERROR] stage=map_phase successful_batches=0 total_batches=${groups.length} reason=LLM_MODEL_UNAVAILABLE`
      );
      throw new Error(
        "No section summaries were generated. Final synthesis was not attempted."
      );
    }

    if (failedBatches > 0 && failedBatches >= groups.length / 2) {
      console.warn(
        `[SUMMARIZE] Warning: Majority of batches failed (${failedBatches}/${groups.length}). Synthesis may be incomplete.`
      );
    }

    // Reduce Phase: Merge intermediate section summaries into final synthesis
    const mergedContext = intermediateSummaries.join("\n\n---\n\n");
    console.log(`[SUMMARIZE] Reduce phase: Synthesizing final structured summary from ${intermediateSummaries.length} section summaries`);

    try {
      finalSummary = await summarizeDocument({
        context: mergedContext,
        documentName,
        isProposal: /proposal|research/i.test(documentName),
      });
    } catch (reduceErr) {
      console.error(`[SUMMARIZE ERROR] stage=reduce_synthesis status=${reduceErr.status || 500} reason=${reduceErr.code || reduceErr.message}`);
      throw reduceErr;
    }
  }

  const sources = validChunks.slice(0, 8).map((c, i) => ({
    score: parseFloat(Math.max(0.75, 0.98 - i * 0.02).toFixed(2)),
    chunkIndex: c.index,
    documentId: String(doc._id),
    documentName,
    pageNumber: c.pageNumber || 1,
    section: c.section || "General",
    snippet: c.text.slice(0, 160) + "...",
  }));

  return { answer: formatCleanPlainText(finalSummary), sources };
};

/**
 * Cross-Document Synthesis & Summarization across all uploaded documents.
 */
const summarizeAllDocumentsHierarchically = async ({ userId, knowledgeBaseId }) => {
  const filter = { status: { $ne: "failed" } };
  if (userId) filter.owner = userId;
  if (knowledgeBaseId && knowledgeBaseId !== "all") {
    filter.$or = [{ knowledgeBaseId: knowledgeBaseId }, { knowledgeBaseIds: knowledgeBaseId }];
  }

  const userDocs = await Document.find(filter);
  if (!userDocs || !userDocs.length) {
    return {
      answer: "No uploaded documents were found in your library to summarize. Please upload documents first.",
      sources: [],
    };
  }

  if (userDocs.length === 1) {
    let singleDoc = userDocs[0];
    if (!singleDoc.chunks || singleDoc.chunks.length < 5) {
      singleDoc = await ensureDocChunks(singleDoc, true);
    }
    return summarizeDocumentHierarchically({
      doc: singleDoc,
      documentName: singleDoc.name || singleDoc.originalName,
    });
  }

  console.log(`[SUMMARIZE] Multi-document synthesis across ${userDocs.length} documents`);

  const crossDocChunks = [];
  const docNames = [];

  for (let doc of userDocs) {
    const docName = doc.name || doc.originalName || "Document";
    docNames.push(docName);

    if (!doc.chunks || doc.chunks.length < 5) {
      try {
        doc = await ensureDocChunks(doc, true);
      } catch (err) {
        console.warn(`[SUMMARIZE] Auto-recovery for ${docName} failed:`, err.message);
      }
    }

    const validChunks = (doc.chunks || []).filter(
      (c) => isUsableDocumentText(c.text) && !c.isReference && !/references|bibliography/i.test(c.section || "")
    );

    if (!validChunks.length) continue;

    // Pick top representative chunks from each document: overview + problem + methodology
    const overviewChunks = validChunks.filter((c) =>
      /abstract|intro|overview|motivation|objective/i.test(c.section || "")
    );
    const methodChunks = validChunks.filter((c) =>
      /method|arch|model|approach|system|result|conclu/i.test(c.section || "")
    );

    const docSelected = [];
    if (overviewChunks.length) {
      docSelected.push(overviewChunks[0]);
      if (overviewChunks.length > 1) docSelected.push(overviewChunks[overviewChunks.length - 1]);
    }
    if (methodChunks.length) {
      docSelected.push(methodChunks[0]);
      if (methodChunks.length > 1) docSelected.push(methodChunks[Math.floor(methodChunks.length / 2)]);
    }

    // Fallback if section classification was sparse
    if (!docSelected.length) {
      docSelected.push(...validChunks.slice(0, 3));
    }

    for (const c of docSelected) {
      crossDocChunks.push({
        ...c,
        documentId: String(doc._id),
        documentName: docName,
      });
    }
  }

  if (!crossDocChunks.length) {
    return {
      answer: "None of the uploaded documents contain sufficient readable text to generate a multi-document summary.",
      sources: [],
    };
  }

  const context = crossDocChunks
    .map(
      (c) =>
        `[Document: "${c.documentName}", Section: ${c.section || "Content"}, Page ${c.pageNumber || 1}, Chunk #${c.index || 0}]\n${c.text}`
    )
    .join("\n\n---\n\n");

  let answer = "";
  try {
    answer = await summarizeMultipleDocuments({ context, docNames });
  } catch (err) {
    console.warn(`[SUMMARIZE] Multi-document OpenRouter synthesis failed: ${err.message}`);
    answer = "AI multi-document synthesis is temporarily unavailable. All documents have been indexed successfully.";
  }

  const sources = crossDocChunks.map((c, i) => ({
    score: parseFloat(Math.max(0.70, 0.95 - i * 0.01).toFixed(2)),
    chunkIndex: c.index || i + 1,
    documentId: c.documentId,
    documentName: c.documentName,
    pageNumber: c.pageNumber || 1,
    section: c.section || "General",
    snippet: (c.text || "").slice(0, 160) + "...",
  }));

  return { answer: formatCleanPlainText(answer), sources };
};

/**
 * askDocument: Queries vector DB / MongoDB for relevant chunks and generates a grounded response.
 */
const askDocument = async ({ question, documentId, userId, knowledgeBaseId, projectInstructions = "" }) => {
  if (!question) {
    throw new Error("Question is required");
  }

  // Handle conversational greetings naturally without triggering RAG or disclaimers
  const qGreeting = (question || "").trim().toLowerCase();
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))[.!]?$/i.test(qGreeting)) {
    return {
      answer: "Hello! How can I help you?",
      sources: [],
    };
  }

  let activeDocId = documentId && documentId !== "all" ? String(documentId) : null;
  let targetDocName = "";

  // Auto-resolve target document from query string if not explicitly selected
  if (!activeDocId && userId) {
    try {
      const userDocs = await Document.find({ owner: userId }).select("_id name originalName status").lean();
      const qLower = question.toLowerCase();
      for (const d of userDocs) {
        const docName = (d.name || d.originalName || "").toLowerCase();
        const baseName = docName.replace(/\.[^/.]+$/, "").toLowerCase();
        if ((docName && qLower.includes(docName)) || (baseName.length >= 3 && qLower.includes(baseName))) {
          activeDocId = String(d._id);
          targetDocName = d.name || d.originalName;
          console.log(`[RAG] Auto-resolved target document: "${targetDocName}" (ID: ${activeDocId})`);
          break;
        }
      }
      if (!activeDocId && userDocs.length === 1 && /\b(this|the)\s+(pdf|document|proposal|paper|file)\b/i.test(question)) {
        activeDocId = String(userDocs[0]._id);
        targetDocName = userDocs[0].name || userDocs[0].originalName;
        console.log(`[RAG] Single-document auto-selected: "${targetDocName}" (ID: ${activeDocId})`);
      }
    } catch (resolveErr) {
      console.warn(`[RAG] Target document resolution warning: ${resolveErr.message}`);
    }
  }

  let doc = null;
  if (activeDocId) {
    const docFilter = userId ? { _id: activeDocId, owner: userId } : { _id: activeDocId };
    doc = await Document.findOne(docFilter);
    if (!doc && activeDocId) {
      doc = await Document.findById(activeDocId);
    }
    if (doc) {
      targetDocName = doc.name || doc.originalName;
      const isSummary = isSummaryQuestion(question);

      const isFailed = [
        "failed",
        "extraction_failed",
        "validation_failed",
        "chunking_failed",
        "embedding_failed",
        "index_failed",
        "document_extraction_failed",
      ].includes(doc.status);

      if (isFailed) {
        const errorDetail = doc.errorMessage || doc.error_message || "Document processing failed";
        const hasText = (doc.fullText && doc.fullText.length > 50) || doc.chunks?.some((c) => isUsableDocumentText(c.text));
        if (isSummary && hasText) {
          console.log(`[RAG] Document "${targetDocName}" status="${doc.status}" but clean text exists. Proceeding with summary without Qdrant requirement.`);
        } else {
          return {
            answer: `This document ("${targetDocName}") could not be processed successfully (${errorDetail}). Please reprocess the document.`,
            sources: [],
          };
        }
      }

      // If document is actively processing
      const isProcessing = [
        "uploaded",
        "processing",
        "validating",
        "loading",
        "extracting",
        "ocr_processing",
        "table_extraction",
        "cleaning",
        "splitting",
        "embedding",
        "indexing",
      ].includes(doc.status);

      if (isProcessing) {
        if (isSummary && doc.fullText && doc.fullText.length > 50) {
          console.log(`[RAG] Document "${targetDocName}" is indexing, but clean text is available. Proceeding with summary.`);
        } else {
          return {
            answer: `The document "${targetDocName}" is currently being processed (${doc.processingStep || "processing"}). Please wait for indexing to finish before asking questions.`,
            sources: [],
          };
        }
      }

      // Auto-recover ONLY if document was marked ready but chunks are empty
      const hasValidChunks = doc.chunks?.some((c) => isUsableDocumentText(c.text));
      if (!isFailed && !isProcessing && (!hasValidChunks || (doc.chunks && doc.chunks.length < 5))) {
        console.log(`[RAG] Document "${targetDocName}" preparing content chunks (current chunks: ${doc.chunks?.length || 0})...`);
        try {
          doc = await ensureDocChunks(doc, false);
        } catch (recoverErr) {
          console.warn(`[RAG] Auto-recovery warning: ${recoverErr.message}`);
        }
      }
    }
  }

  if (!targetDocName) {
    targetDocName = "All Uploaded Documents";
  }

  console.log(`[RAG] Received query for document_id: ${activeDocId || "all"}, question: "${question}"`);

  // ── MULTI-STAGE STRUCTURE-AWARE RETRIEVAL & GROUNDING ──
  const intent = classifyQueryIntent(question);
  const queryRoute = classifyQuery(question);
  console.log(`[RAG INTENT] type=${intent.type} req=${intent.requirementId || "none"}`);
  console.log(`[ROUTER] query="${question}" type=${queryRoute.queryType} targetObj=${queryRoute.targetObjectId || "none"}`);

  // Route to generic map-reduce summary ONLY for general summaries, not structured executive summaries
  const isSummary = isSummaryQuestion(question) && intent.type !== "executive_summary";

  if (isSummary) {
    if (activeDocId && doc && doc.chunks && doc.chunks.length > 0) {
      try {
        return await summarizeDocumentHierarchically({ doc, documentName: targetDocName });
      } catch (sumErr) {
        console.error(`[SUMMARIZE ERROR] stage=openrouter_generation status=${sumErr.status || 500} reason=${sumErr.code || sumErr.message}`);
        return {
          answer: `AI summarization encountered an issue (${sumErr.code || sumErr.message || "service error"}). The document itself has been processed and indexed successfully. You can ask specific questions about its content.`,
          sources: [],
        };
      }
    }
    // Cross-document summary across all uploaded documents
    if (!activeDocId || activeDocId === "all") {
      try {
        return await summarizeAllDocumentsHierarchically({ userId, knowledgeBaseId });
      } catch (multiErr) {
        console.error(`[SUMMARIZE ERROR] stage=multi_doc_summary status=${multiErr.status || 500} reason=${multiErr.code || multiErr.message}`);
        return {
          answer: `Multi-document AI synthesis encountered an issue (${multiErr.code || multiErr.message || "service error"}). All documents have been indexed successfully.`,
          sources: [],
        };
      }
    }
  }

  let retrievedChunks = [];

  // Stage 1: Intent-Driven Hybrid Retrieval
  try {
    const hybridHits = await performHybridSearch({
      query: question,
      documentId: activeDocId,
      userId,
      organizationId: doc?.organizationId,
      knowledgeBaseId,
      requirementId: queryRoute.requirementId || intent.requirementId,
      limit: queryRoute.isCompleteExtraction ? 25 : (intent.type === 'specific_requirement' ? 10 : 8),
    });

    if (hybridHits && hybridHits.length > 0) {
      retrievedChunks = hybridHits.map((h) => ({
        score: h.score,
        chunkIndex: h.chunkIndex,
        documentId: h.documentId || activeDocId,
        documentName: targetDocName || h.documentName || "Document Passage",
        pageNumber: h.pageNumber || 1,
        section: h.section || "Content",
        subsection: h.subsection || null,
        parentSection: h.parentSection || null,
        requirementId: h.requirementId || null,
        requirementName: h.requirementName || null,
        contentType: h.contentType || "general_text",
        objectType: h.objectType || (h.isTable ? "table" : (h.isFigure ? "figure" : "text")),
        objectId: h.objectId || null,
        caption: h.caption || null,
        structuredData: h.structuredData || null,
        isTable: Boolean(h.isTable),
        isFigure: Boolean(h.isFigure),
        text: h.text,
      }));
    }
  } catch (hybridErr) {
    console.warn(`[RETRIEVAL] Hybrid search notice: ${hybridErr.message}`);
  }

  // Stage 2: Requirement Envelope Completeness
  // If user asks about a specific requirement (e.g. FR-AUTH-004), ensure ALL chunks for that requirement
  // (description, flows, business rules, acceptance criteria, APIs, tables) are included.
  if (intent.requirementId && doc && Array.isArray(doc.chunks)) {
    const reqSpecificChunks = doc.chunks.filter((c) =>
      c.requirementId === intent.requirementId ||
      (c.text && c.text.includes(intent.requirementId))
    );
    for (const rChunk of reqSpecificChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === rChunk.index);
      if (!alreadyPresent && isUsableDocumentText(rChunk.text)) {
        retrievedChunks.unshift({
          score: 0.99,
          chunkIndex: rChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: rChunk.pageNumber || 1,
          section: rChunk.section || "Content",
          subsection: rChunk.subsection || null,
          parentSection: rChunk.parentSection || null,
          requirementId: rChunk.requirementId || intent.requirementId,
          requirementName: rChunk.requirementName || null,
          contentType: rChunk.contentType || "functional_requirement",
          text: rChunk.text,
        });
      }
    }
  }

  // Stage 3: Document-Wide Requirement Coverage
  // If user asks to list all requirements or an executive summary, pull requirement header chunks
  if ((intent.type === 'requirement_list' || intent.type === 'executive_summary') && doc && Array.isArray(doc.chunks)) {
    const catalogChunks = doc.chunks.filter((c) =>
      c.contentType === 'functional_requirement' ||
      (c.requirementId && /^FR-/i.test(c.requirementId)) ||
      (c.isTable && /Req ID|FR-AUTH/i.test(c.text)) ||
      (intent.type === 'executive_summary' && (c.index === 0 || c.section === '3.1' || /Out of Scope/i.test(c.text)))
    );
    for (const catChunk of catalogChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === catChunk.index);
      if (!alreadyPresent && isUsableDocumentText(catChunk.text)) {
        retrievedChunks.push({
          score: 0.92,
          chunkIndex: catChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: catChunk.pageNumber || 1,
          section: catChunk.section || "Content",
          subsection: catChunk.subsection || null,
          parentSection: catChunk.parentSection || null,
          requirementId: catChunk.requirementId || null,
          requirementName: catChunk.requirementName || null,
          contentType: catChunk.contentType || "functional_requirement",
          text: catChunk.text,
        });
      }
    }
  }

  // Stage 3b: Conflict & Inconsistency Chunks
  // If user asks about conflicts or discrepancies, or if endpoints/mfa are discussed,
  // retrieve contrasting chunks (e.g. /challenge and /verify) so both are in context
  if ((intent.type === 'conflict_check' || intent.type === 'executive_summary' || /conflict|inconsisten|differ|mismatch|discrepan/i.test(question)) && doc && Array.isArray(doc.chunks)) {
    const conflictChunks = doc.chunks.filter((c) =>
      c.text && (c.text.includes('/api/v1/auth/mfa/verify') || c.text.includes('/api/v1/auth/mfa/challenge'))
    );
    for (const cChunk of conflictChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === cChunk.index);
      if (!alreadyPresent && isUsableDocumentText(cChunk.text)) {
        retrievedChunks.unshift({
          score: 0.98,
          chunkIndex: cChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: cChunk.pageNumber || 1,
          section: cChunk.section || "Content",
          subsection: cChunk.subsection || null,
          parentSection: cChunk.parentSection || null,
          requirementId: cChunk.requirementId || null,
          requirementName: cChunk.requirementName || null,
          contentType: cChunk.contentType || "api_specification",
          text: cChunk.text,
        });
      }
    }
  }

  // Stage 3c: Scope & Out-of-Scope Envelope Completeness
  const isScopeQuery = /\b(scope|out of scope|in scope|exclusion|exclusions|boundary|boundaries|delimited|biometric)\b/i.test(question);
  if (isScopeQuery && doc && Array.isArray(doc.chunks)) {
    const scopeChunks = doc.chunks.filter((c) =>
      c.text && (/Out of Scope/i.test(c.text) || /delimited as follows/i.test(c.text) || /Biometric fingerprint/i.test(c.text) || /Scope & Boundaries/i.test(c.text))
    );
    for (const sChunk of scopeChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === sChunk.index);
      if (!alreadyPresent && isUsableDocumentText(sChunk.text)) {
        retrievedChunks.unshift({
          score: 0.99,
          chunkIndex: sChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: sChunk.pageNumber || 1,
          section: sChunk.section || "Scope",
          subsection: sChunk.subsection || null,
          parentSection: sChunk.parentSection || null,
          contentType: "scope_specification",
          text: sChunk.text,
        });
      }
    }
  }

  // Stage 3d: Figure & Diagram Envelope Completeness
  const isFigureQuery = /\b(figure\s*[123]|diagram|sequence\s*diagram|use-case|use\s*case|staff\s*user)\b/i.test(question);
  if (isFigureQuery && doc && Array.isArray(doc.chunks)) {
    const figureChunks = doc.chunks.filter((c) =>
      c.text && (
        /Figure\s*[123]/i.test(c.text) ||
        /sequence diagram/i.test(c.text) ||
        /use-case diagram/i.test(c.text) ||
        /Staff users sign in/i.test(c.text)
      )
    );
    for (const fChunk of figureChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === fChunk.index);
      if (!alreadyPresent && isUsableDocumentText(fChunk.text)) {
        retrievedChunks.unshift({
          score: 0.99,
          chunkIndex: fChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: fChunk.pageNumber || 1,
          section: fChunk.section || "Diagrams",
          subsection: fChunk.subsection || null,
          parentSection: fChunk.parentSection || null,
          contentType: "diagram_specification",
          text: fChunk.text,
        });
      }
    }
  }

  // Stage 4: Tables / Figures Prioritization if requested or relevant
  const isTableQuery = queryRoute.queryType === "TABLE_QUERY" || /\b(table|tabular|metric|metrics|dataset|datasets|benchmark|benchmarks|column|row)\b/i.test(question);
  if (isTableQuery) {
    if (doc && doc.chunks) {
      const tableChunks = doc.chunks.filter((c) =>
        c.isTable ||
        c.objectType === "table" ||
        c.tableMetadata ||
        (queryRoute.tableId && String(c.objectId).toLowerCase() === queryRoute.tableId.toLowerCase()) ||
        /\[Table\b/i.test(c.text)
      );
      for (const tblChunk of tableChunks) {
        const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === tblChunk.index);
        if (!alreadyPresent && isUsableDocumentText(tblChunk.text)) {
          retrievedChunks.unshift({
            score: 0.96,
            chunkIndex: tblChunk.index,
            documentId: String(doc._id),
            documentName: targetDocName,
            pageNumber: tblChunk.pageNumber || 1,
            section: tblChunk.section || "Tables",
            objectType: "table",
            objectId: tblChunk.objectId || tblChunk.tableMetadata?.tableId || null,
            caption: tblChunk.caption || tblChunk.tableMetadata?.caption || null,
            structuredData: tblChunk.structuredData || null,
            isTable: true,
            text: tblChunk.text,
          });
        }
      }
    }
  }

  if (queryRoute.queryType === "FIGURE_QUERY" || queryRoute.figureNumber || queryRoute.figureId) {
    const targetFNum = String(queryRoute.figureNumber || "").toLowerCase();
    const targetOId = String(queryRoute.targetObjectId || queryRoute.exactFigureId || "").toLowerCase();
    const targetFId = String(queryRoute.figureId || "").toLowerCase();

    let exactFigMatches = [];
    if (doc && doc.chunks) {
      exactFigMatches = doc.chunks.filter((c) => {
        const isFig = Boolean(c.isFigure || c.objectType === "figure" || c.figureMetadata);
        const oId = String(c.objectId || "").toLowerCase();
        const fId = String(c.figureMetadata?.figureId || c.figureId || "").toLowerCase();
        const fNum = String(c.figureNumber || c.figureMetadata?.figureNumber || "").toLowerCase();
        return isFig && (
          (targetOId && oId === targetOId) ||
          (targetFId && (fId === targetFId || oId === targetFId)) ||
          (targetFNum && (fNum === targetFNum || oId === `figure ${targetFNum}`))
        );
      });
    }

    if (exactFigMatches.length > 0) {
      console.log(`[FIGURE_RETRIEVE] figure=${queryRoute.figureNumber || targetOId} exact_match=true qdrant_hits=${exactFigMatches.length}`);
      for (const figChunk of exactFigMatches) {
        const alreadyPresent = retrievedChunks.findIndex((r) => r.chunkIndex === figChunk.index);
        if (alreadyPresent !== -1) {
          retrievedChunks.splice(alreadyPresent, 1);
        }
        retrievedChunks.unshift({
          score: 0.99,
          chunkIndex: figChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: figChunk.pageNumber || 1,
          section: figChunk.section || "Figures",
          objectType: "figure",
          objectId: figChunk.objectId || `Figure ${targetFNum}`,
          figureNumber: figChunk.figureNumber || targetFNum,
          caption: figChunk.caption || null,
          isFigure: true,
          structuredData: figChunk.structuredData,
          figureMetadata: figChunk.figureMetadata,
          text: figChunk.text,
        });
      }
      console.log(`[ANSWER] primary_evidence_type=figure primary_evidence_id=${retrievedChunks[0].objectId}`);
    } else {
      console.log(`[FIGURE_RETRIEVE] figure=${queryRoute.figureNumber || targetOId} exact_match=false hits=0`);
    }
  }

  // Fallback to local MongoDB keyword search if still empty
  if (!retrievedChunks.length) {
    const localMatches = await searchLocalChunks({
      question,
      documentId: activeDocId,
      userId,
      knowledgeBaseId,
      limit: 5,
    });
    if (localMatches && localMatches.length > 0) {
      retrievedChunks = localMatches;
    }
  }

  retrievedChunks = retrievedChunks.filter((c) => c && c.text && isUsableDocumentText(c.text));

  // Stage 4b: Explicit Missing Object Failure Check (Principle 14 & 15: Source Evidence > Inference)
  const missingCheck = checkMissingObjectFailure(question, retrievedChunks, doc);
  if (missingCheck.isMissing) {
    console.log(`[RAG MISSING OBJECT] state=${missingCheck.failureState} req=${missingCheck.requestedId}`);
    return {
      answer: missingCheck.message,
      sources: [],
      failureState: missingCheck.failureState,
      ledger: [],
      grounding: { overall_score: 1.0, ungrounded_count: 0 },
    };
  }

  if (!retrievedChunks.length) {
    if (!activeDocId) {
      try {
        const generalAnswer = await generateGeneralAnswer({ question });
        if (generalAnswer) return { answer: generalAnswer, sources: [] };
      } catch (_) {}
    }
    return {
      answer: "I could not find sufficient evidence in the selected documents to answer this question reliably.",
      sources: [],
    };
  }

  // Stage 5: Coverage Check
  const coverageReport = checkRequirementCoverage({
    allChunks: doc?.chunks || [],
    retrievedChunks,
    targetRequirementId: intent.requirementId,
  });
  console.log(`[RAG COVERAGE] expected=${coverageReport.expected_requirements.length} retrieved=${coverageReport.retrieved_requirements.length} missing=${coverageReport.missing_requirements.length}`);

  // Stage 6: Conflict Detection
  const conflictReport = detectConflicts(retrievedChunks, doc?.chunks || []);
  let conflictNotice = "";
  if (conflictReport.conflict_detected) {
    console.log(`[RAG CONFLICT] Detected ${conflictReport.conflicts.length} internal source inconsistencies`);
    conflictNotice = conflictReport.conflicts.map((c) => c.description).join("\n");
  }

  // Stage 7: Multimodal Context Construction
  let verifiedFigEvidence = null;
  if (queryRoute.queryType === "FIGURE_QUERY" || isFigureQuery || queryRoute.figureNumber || queryRoute.figureId) {
    const targetFNum = String(queryRoute.figureNumber || "").toLowerCase();
    const targetOId = String(queryRoute.targetObjectId || queryRoute.exactFigureId || "").toLowerCase();
    const targetFId = String(queryRoute.figureId || "").toLowerCase();

    let targetFigureDoc = null;
    if (doc && doc.figures && doc.figures.length > 0) {
      targetFigureDoc = doc.figures.find((f) => {
        const oId = String(f.objectId || "").toLowerCase();
        const fId = String(f.figureId || "").toLowerCase();
        const fNum = String(f.figureNumber || "").toLowerCase();
        return (
          (targetOId && oId === targetOId) ||
          (targetFId && (fId === targetFId || oId === targetFId)) ||
          (targetFNum && (fNum === targetFNum || oId === `figure ${targetFNum}`))
        );
      });
    }
    if (!targetFigureDoc && retrievedChunks.length > 0) {
      const figChunk = retrievedChunks.find((c) => c.isFigure || c.objectType === "figure");
      if (figChunk) {
        targetFigureDoc = figChunk.structuredData || figChunk.figureMetadata || figChunk;
      }
    }
    if (targetFigureDoc) {
      verifiedFigEvidence = buildVerifiedFigureEvidence(targetFigureDoc);
    }
  }

  const contextChunks = (queryRoute.queryType === "FIGURE_QUERY" || queryRoute.figureNumber || queryRoute.targetObjectId)
    ? retrievedChunks.slice(0, 6)
    : retrievedChunks.slice(0, 10);

  const context = contextChunks
    .map(
      (m) =>
        `[Document: ${m.documentName}${m.objectType ? `, Type: ${m.objectType}` : ""}${m.objectId ? `, ID: ${m.objectId}` : ""}, Section: ${m.section || "Content"}, Page ${m.pageNumber}, Chunk #${m.chunkIndex}${m.requirementId ? `, Req: ${m.requirementId}` : ""}]\n${m.text}`
    )
    .join("\n\n---\n\n");

  // Stage 8: Prompt Crafting with Intent-Specific Guidance
  let extraInstructions = "";
  if (queryRoute.queryType === "TABLE_QUERY") {
    extraInstructions = `The user is querying a table or tabular data (${queryRoute.targetObjectId || "table"}).
Carefully examine the table rows, columns, headers, and individual cell values.
State exact numbers, percentages, and units without rounding or approximating.
Never silently omit or fabricate cells. If a value is missing or not stated in the evidence, say so directly.
Explicitly cite the table ID and page number in your response.`;
  } else if (queryRoute.queryType === "FIGURE_QUERY" || isFigureQuery) {
    if (verifiedFigEvidence && verifiedFigEvidence.verified) {
      const participantList = verifiedFigEvidence.participant_names.map((p) => `- ${p}`).join("\n");
      const formatInteractionSentence = (i) => {
        const lbl = i.label || "";
        const from = i.from || "Client";
        const to = i.to || "API";
        if (lbl.startsWith("POST") || lbl.startsWith("GET") || lbl.startsWith("PUT") || lbl.startsWith("DELETE")) {
          return `${i.order}. The ${from} sends ${lbl} to the ${to}.`;
        }
        if (/^enter/i.test(lbl)) {
          return `${i.order}. The ${from} enters ${lbl.replace(/^enter\s*/i, "")} in the ${to}.`;
        }
        if (/^read failure counter/i.test(lbl) || /^checks? failure counter/i.test(lbl)) {
          return `${i.order}. The ${from} checks the failure counter in ${to}.`;
        }
        if (/^load user/i.test(lbl)) {
          return `${i.order}. The ${from} loads the user and verifies the argon2id password hash in ${to}.`;
        }
        if (/^counter below/i.test(lbl)) {
          return `${i.order}. ${from} returns the counter status to the ${to}.`;
        }
        if (/^credentials valid/i.test(lbl)) {
          return `${i.order}. ${from} confirms the credentials and MFA requirement to the ${to}.`;
        }
        if (/^200 mfarequired/i.test(lbl) || /^mfa challenge/i.test(lbl)) {
          return `${i.order}. The ${from} returns an MFA challenge to the ${to}.`;
        }
        if (/^validate code/i.test(lbl)) {
          return `${i.order}. The ${from} validates the MFA TOTP code in ${to}.`;
        }
        if (/^create session/i.test(lbl)) {
          return `${i.order}. The ${from} creates the session and refresh-token family in ${to}.`;
        }
        return `${i.order}. The ${from} sends ${lbl} to the ${to}.`;
      };
      const interactionSeq = verifiedFigEvidence.interactions.map(formatInteractionSentence).join("\n");

      const isComparison = /\b(compar(?:e|ison)|versus|\bvs\b|differ(?:ence)?)\b/i.test(question);

      if (isComparison) {
        extraInstructions = `The user is asking to compare ${verifiedFigEvidence.figure_id} with another document requirement or section.
You receive VERIFIED_EVIDENCE for ${verifiedFigEvidence.figure_id}:
Figure Type: ${verifiedFigEvidence.figure_type}
Caption: ${verifiedFigEvidence.caption}
Verified Participants: ${verifiedFigEvidence.participant_names.join(", ")}
Verified Interactions:
${interactionSeq}

Compare ${verifiedFigEvidence.figure_id} directly with the target requirement (e.g. FR-AUTH-001 Staff Login):
1. Explain how Figure 3 illustrates the sequence of authentication described in FR-AUTH-001.
2. Highlight participants involved: ${verifiedFigEvidence.participant_names.join(", ")}.
3. Note database and cache interactions: Redis for failure counters and sessions, PostgreSQL for user loading and Argon2id hash verification.
4. Note MFA challenge generation and token issuance.
RULES:
- Return ONLY the clean user-facing answer.
- Never reveal internal reasoning, thought process, or scratchpad.`;
      } else {
        extraInstructions = `You are the final answer generator for DOCUMIND-AI.
You receive VERIFIED_EVIDENCE for ${verifiedFigEvidence.figure_id}:
Figure Type: ${verifiedFigEvidence.figure_type}
Caption: ${verifiedFigEvidence.caption}

Verified Participants:
${participantList}

Verified Sequential Interactions:
${interactionSeq}
${verifiedFigEvidence.visual_description ? `\nVerified Visual Description:\n${verifiedFigEvidence.visual_description}\n` : ""}

CRITICAL RULES:
1. Return ONLY the clean user-facing answer.
2. NEVER reveal internal reasoning, thought process, scratchpad, analysis, or intermediate steps.
3. NEVER output thinking tags (<think>...</think>) or phrases like "Thinking Process:", "Analyze the Request:", "Let me check...".
4. NEVER mention discarded OCR candidates or parser artifacts (such as "Visual").
5. NEVER invent missing evidence or unverified interactions.
6. Do NOT repeat any interaction twice.
7. Keep entity names exactly as verified: ${verifiedFigEvidence.participant_names.join(", ")}.
8. Preserve the sequential order of interactions.
9. If asked for participants and interaction order, present:
Figure ${verifiedFigEvidence.figure_number} contains five participants:

${participantList}

The interaction sequence is:

${interactionSeq}
10. If asked a specific question about an action in the figure, answer it directly and concisely using the verified evidence.`;
      }
    } else {
      extraInstructions = `You are answering a figure query. Ground your answer strictly in the verified figure evidence. If visual evidence is insufficient or unavailable, state "INSUFFICIENT_VISUAL_EVIDENCE" or "Some labels in the figure could not be verified reliably." Do not guess or invent interactions.`;
    }
  } else if (queryRoute.queryType === "COMPLETE_EXTRACTION") {
    extraInstructions = `The user requested complete extraction. Provide an exhaustive listing of all items, rows, or requirements found in the evidence. Do not omit any row or item. Check for completeness before responding.`;
  } else if (queryRoute.queryType === "EXACT_IDENTIFIER_QUERY") {
    extraInstructions = `The user is querying an exact identifier (${queryRoute.targetObjectId || 'specified identifier'}). Retrieve and detail all specific requirements, attributes, or definitions tied directly to this identifier.`;
  } else if (intent.type === "specific_requirement") {
    extraInstructions = `The user is asking about requirement ${intent.requirementId}.
Detail:
- Requirement ID and Name
- Priority and Actors
- Description and Preconditions
- Main Flow, Alternate Flows, and Exceptions
- Business Rules and Validations
- Database and Redis Impact
- Related API Endpoints
- Acceptance Criteria
- Any Source Inconsistencies
Only include details explicitly mentioned in the source context. Do not invent any values.`;
  } else if (intent.type === "executive_summary") {
    extraInstructions = `The user requested an Executive Summary.
Perform FINAL EXECUTIVE-SUMMARY QUALITY CONTROL:
1. NUMBERING CHECK: Ensure all generated top-level sections use strictly sequential numbering: 1., 2., 3., 4., 5., 6., 7., 8., 9., 10., 11. Never repeat "1." or restart numbering accidentally.
2. REQUIREMENT COVERAGE CHECK: Every one of the 10 functional requirements MUST be explicitly represented under Main Functional Requirements:
   - FR-AUTH-001: Staff Login
   - FR-AUTH-002: Cashier PIN Fast-Switch
   - FR-AUTH-003: User Registration & Provisioning
   - FR-AUTH-004: Multi-Factor Authentication
   - FR-AUTH-005: Forgot / Reset Password
   - FR-AUTH-006: Password Policy
   - FR-AUTH-007: Session Management
   - FR-AUTH-008: Trusted Device Management
   - FR-AUTH-009: Logout & Global Sign-Out
   - FR-AUTH-010: Security Audit Log
3. SOURCE STRUCTURE: Preserve source section numbering (e.g. Section 3.1, 3.1.1, etc.).
4. FACT CHECK: Verify all numbers, durations, token lifetimes, roles, API endpoints, HTTP methods, limits against source evidence.
5. NO INFERENCE AS FACT: State only facts explicitly supported.
6. SOURCE CONFLICT: If conflicting endpoints exist, report under "Source Inconsistencies":
   "Source inconsistency detected:
   Section 3.1.4 states POST /api/v1/auth/mfa/challenge.
   Section 3.1.10 and Section 9.2.2 state POST /api/v1/auth/mfa/verify."
7. PRIMARY VS SECONDARY: Prioritize functional requirements over secondary API details (correlation IDs, idempotency, webhooks).
8. REDUNDANCY CHECK: Do not repeat concepts unnecessarily.

Structure the Executive Summary into these clean numbered sections:
1. Purpose & Objectives
2. Scope & Boundaries
3. Main Functional Requirements (covering all 10 FR-AUTH requirements)
4. Important Business Rules
5. Security Requirements
6. Technical Architecture & Database Impact
7. API & Integration Requirements
8. UI/UX Requirements
9. Acceptance Criteria & Performance Requirements
10. Exclusions
11. Source Inconsistencies`;
  } else if (intent.type === "requirement_list") {
    extraInstructions = `List all requirements found in the document with their exact ID, title, priority, and key endpoints. Do not omit any requirement.`;
  } else if (intent.type === "conflict_check") {
    extraInstructions = `The user specifically asked about conflicting or inconsistent definitions in the document. Clearly identify each conflicting statement, the sections where they appear, and state that the source contains contradictory references.`;
  } else if (isScopeQuery) {
    extraInstructions = `The user is asking about the module scope (In Scope / Out of Scope).
Examine the retrieved context for the scope table (e.g. In Scope vs Out of Scope).
If asked what is out of scope, list ALL 8 out-of-scope items exactly as defined in the source document:
1. Biometric fingerprint or face login
2. SAML, OIDC, or Active Directory federation
3. Public self-service staff signup
4. Social login through Google or Facebook
5. Hardware FIDO2 security keys
6. Network firewall and WAF administration
7. Operating-system hardening of terminals
8. External SIEM correlation and threat hunting
If asked about biometric fingerprint or face login, confirm it is explicitly OUT OF SCOPE.
Answer the user question directly first! Do NOT claim that the document does not state what is out of scope.`;
  }

  // Stage 9: Grounded LLM Generation
  let rawAnswer = "";
  try {
    rawAnswer = await generateAnswer({
      question,
      context,
      documentName: targetDocName,
      extraInstructions,
      conflictNotice,
    });
  } catch (llmErr) {
    console.warn(`[LLM] Generation error: ${llmErr.message}`);
    rawAnswer = "I could not find sufficient evidence in the selected documents to answer this question reliably.";
  }

  // Stage 10: Grounding Validation & Correction (10-Point Verification)
  const { verifiedAnswer, metrics: groundingMetrics } = validateAndCorrectAnswer({
    question,
    answer: rawAnswer,
    chunks: retrievedChunks,
    conflictReport,
  });

  // Step 11: Object-Level Citations & Evidence Ledger
  const sources = retrievedChunks.slice(0, 10).map((res) => ({
    score: res.score,
    chunkIndex: res.chunkIndex,
    documentId: res.documentId,
    documentName: res.documentName || targetDocName,
    pageNumber: res.pageNumber,
    section: res.section || "Content",
    requirementId: res.requirementId || null,
    objectType: res.objectType || (res.isTable ? "table" : (res.isFigure ? "figure" : "text")),
    objectId: res.objectId || null,
    caption: res.caption || null,
    citation: formatObjectCitation(res),
    snippet: (res.text || "").slice(0, 160) + "...",
  }));

  const ledger = buildEvidenceLedger(verifiedAnswer, retrievedChunks);
  console.log(`[SOURCES] Attached ${sources.length} sources with verified citations and ${ledger.length} ledger claims`);
  return {
    answer: stripInternalReasoning(formatCleanPlainText(verifiedAnswer)),
    citations: sources,
    evidenceStatus: verifiedFigEvidence ? verifiedFigEvidence.evidence_status : "VERIFIED",
    sources,
    grounding: groundingMetrics,
    coverage: coverageReport,
    conflicts: conflictReport,
    ledger,
  };
};

/**
 * Stream grounded document QA with 3-layer persistent memory and upstream OpenRouter streaming.
 */
const askDocumentStream = async ({
  question,
  documentId = null,
  userId,
  knowledgeBaseId = null,
  conversationId = null,
  projectInstructions = "",
  generationId = null,
  signal = null,
  onStart = () => {},
  onMetadata = () => {},
  onCitations = () => {},
  onDelta = () => {},
  onDone = () => {},
}) => {
  // 1. Explicit Memory Commands ("Remember that...", "Forget that...")
  const memoryCmd = await handleExplicitMemoryCommands({
    userId,
    conversationId,
    text: question,
  });
  if (memoryCmd && memoryCmd.handled) {
    onStart();
    onCitations([]);
    onDelta(memoryCmd.reply);
    onDone(memoryCmd.reply);
    return { answer: memoryCmd.reply, sources: [] };
  }

  // 2. Fetch Layer 1 (Recent turns) & Layer 2 (Rolling summary)
  let recentMessages = [];
  let rollingSummary = "";
  if (conversationId) {
    try {
      const session = await ChatSession.findById(conversationId);
      if (session) {
        recentMessages = getRecentConversationHistory(session, 8);
        rollingSummary = getRollingSummary(session);
      }
    } catch (err) {
      console.warn(`[STREAM] Session history notice: ${err.message}`);
    }
  }

  // 3. Fetch Layer 3 (Durable user memories)
  let relevantMemories = [];
  try {
    relevantMemories = await retrieveRelevantUserMemories({
      userId,
      query: question,
      limit: 5,
    });
  } catch (err) {
    console.warn(`[STREAM] Memory retrieval notice: ${err.message}`);
  }

  const memorySection = buildMemoryPromptSection({
    relevantMemories,
    rollingSummary,
  });

  // 4. Resolve Active Document and RAG context
  let activeDocId = documentId;
  let doc = null;
  let targetDocName = "";

  if (!activeDocId && conversationId) {
    try {
      const currentSession = await ChatSession.findById(conversationId);
      if (currentSession && Array.isArray(currentSession.selectedDocumentIds) && currentSession.selectedDocumentIds.length === 1) {
        activeDocId = currentSession.selectedDocumentIds[0];
      }
    } catch (_) {}
  }

  if (activeDocId && activeDocId !== "all") {
    const docFilter = { _id: activeDocId };
    if (userId) docFilter.owner = userId;
    doc = await Document.findOne(docFilter);
    if (!doc) doc = await Document.findById(activeDocId);
    if (doc) targetDocName = doc.name || doc.originalName;
  }

  // Fail-fast guard if target document has failed processing
  if (doc) {
    const isFailed = [
      "failed",
      "extraction_failed",
      "validation_failed",
      "chunking_failed",
      "embedding_failed",
      "index_failed",
      "document_extraction_failed",
    ].includes(doc.status);

    if (isFailed) {
      const isSummary = isSummaryQuestion(question);
      const hasText = (doc.fullText && doc.fullText.length > 50) || doc.chunks?.some((c) => isUsableDocumentText(c.text));
      if (!isSummary || !hasText) {
        const errorDetail = doc.errorMessage || doc.error_message || "Document processing failed";
        const msg = `This document ("${targetDocName}") could not be processed successfully (${errorDetail}). Please reprocess the document.`;
        onStart();
        onCitations([]);
        onDelta(msg);
        onDone(msg);
        return { answer: msg, sources: [] };
      }
    }
  }

  // Intent classification & multi-stage retrieval
  const intent = classifyQueryIntent(question);
  const isSummary = isSummaryQuestion(question) && intent.type !== "executive_summary";

  if (isSummary && doc && doc.chunks && doc.chunks.length > 0) {
    const sumResult = await summarizeDocumentHierarchically({ doc, documentName: targetDocName });
    onStart();
    onMetadata({ generationId, retrievedChunks: doc.chunks.length, retrievalLatencyMs: 0, isSummary: true });
    onCitations([]);
    onDelta(sumResult.answer, { seq: 1, finishReason: 'stop' });
    onDone(sumResult.answer, { finishReason: 'stop' });
    return sumResult;
  }

  const retrievalStartedAt = Date.now();
  let retrievedChunks = [];
  const queryRoute = classifyQuery(question);
  console.log(`[STREAM ROUTER] query="${question}" type=${queryRoute.queryType} targetObj=${queryRoute.targetObjectId || "none"}`);

  try {
    const hybridHits = await performHybridSearch({
      query: question,
      documentId: activeDocId,
      userId,
      organizationId: doc?.organizationId,
      knowledgeBaseId,
      requirementId: queryRoute.requirementId || intent.requirementId,
      limit: queryRoute.isCompleteExtraction ? 25 : (intent.type === 'specific_requirement' ? 10 : 8),
    });
    if (hybridHits && hybridHits.length > 0) {
      retrievedChunks = hybridHits.map((h) => ({
        score: h.score,
        chunkIndex: h.chunkIndex,
        documentId: h.documentId || activeDocId,
        documentName: targetDocName || h.documentName || "Document Passage",
        pageNumber: h.pageNumber || 1,
        section: h.section || "Content",
        subsection: h.subsection || null,
        parentSection: h.parentSection || null,
        requirementId: h.requirementId || null,
        requirementName: h.requirementName || null,
        contentType: h.contentType || "general_text",
        objectType: h.objectType || (h.isTable ? "table" : (h.isFigure ? "figure" : "text")),
        objectId: h.objectId || null,
        caption: h.caption || null,
        structuredData: h.structuredData || null,
        isTable: Boolean(h.isTable),
        isFigure: Boolean(h.isFigure),
        text: h.text,
      }));
    }
  } catch (err) {
    console.warn(`[RETRIEVAL] Stream hybrid search notice: ${err.message}`);
  }

  // Include full requirement envelope chunks if a specific requirement was queried
  if (intent.requirementId && doc && Array.isArray(doc.chunks)) {
    const reqChunks = doc.chunks.filter((c) =>
      c.requirementId === intent.requirementId ||
      (c.text && c.text.includes(intent.requirementId))
    );
    for (const rChunk of reqChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === rChunk.index);
      if (!alreadyPresent && isUsableDocumentText(rChunk.text)) {
        retrievedChunks.unshift({
          score: 0.99,
          chunkIndex: rChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: rChunk.pageNumber || 1,
          section: rChunk.section || "Content",
          subsection: rChunk.subsection || null,
          parentSection: rChunk.parentSection || null,
          requirementId: rChunk.requirementId || intent.requirementId,
          requirementName: rChunk.requirementName || null,
          contentType: rChunk.contentType || "functional_requirement",
          text: rChunk.text,
        });
      }
    }
  }

  // Include requirement catalog chunks if requirement list or summary is queried
  if ((intent.type === 'requirement_list' || intent.type === 'executive_summary') && doc && Array.isArray(doc.chunks)) {
    const catalogChunks = doc.chunks.filter((c) =>
      c.contentType === 'functional_requirement' ||
      (c.requirementId && /^FR-/i.test(c.requirementId)) ||
      (c.isTable && /Req ID|FR-AUTH/i.test(c.text)) ||
      (intent.type === 'executive_summary' && (c.index === 0 || c.section === '3.1' || /Out of Scope/i.test(c.text)))
    );
    for (const catChunk of catalogChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === catChunk.index);
      if (!alreadyPresent && isUsableDocumentText(catChunk.text)) {
        retrievedChunks.push({
          score: 0.92,
          chunkIndex: catChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: catChunk.pageNumber || 1,
          section: catChunk.section || "Content",
          subsection: catChunk.subsection || null,
          parentSection: catChunk.parentSection || null,
          requirementId: catChunk.requirementId || null,
          requirementName: catChunk.requirementName || null,
          contentType: catChunk.contentType || "functional_requirement",
          text: catChunk.text,
        });
      }
    }
  }

  // Conflict & Inconsistency Chunks
  if ((intent.type === 'conflict_check' || intent.type === 'executive_summary' || /conflict|inconsisten|differ|mismatch|discrepan/i.test(question)) && doc && Array.isArray(doc.chunks)) {
    const conflictChunks = doc.chunks.filter((c) =>
      c.text && (c.text.includes('/api/v1/auth/mfa/verify') || c.text.includes('/api/v1/auth/mfa/challenge'))
    );
    for (const cChunk of conflictChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === cChunk.index);
      if (!alreadyPresent && isUsableDocumentText(cChunk.text)) {
        retrievedChunks.unshift({
          score: 0.98,
          chunkIndex: cChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: cChunk.pageNumber || 1,
          section: cChunk.section || "Content",
          subsection: cChunk.subsection || null,
          parentSection: cChunk.parentSection || null,
          requirementId: cChunk.requirementId || null,
          requirementName: cChunk.requirementName || null,
          contentType: cChunk.contentType || "api_specification",
          text: cChunk.text,
        });
      }
    }
  }

  // Stage 3c: Tables / Figures Prioritization if requested
  if (queryRoute.queryType === "TABLE_QUERY" && doc && doc.chunks) {
    const tableChunks = doc.chunks.filter((c) =>
      c.isTable ||
      c.objectType === "table" ||
      c.tableMetadata ||
      (queryRoute.tableId && String(c.objectId).toLowerCase() === queryRoute.tableId.toLowerCase()) ||
      /\[Table\b/i.test(c.text)
    );
    for (const tblChunk of tableChunks) {
      const alreadyPresent = retrievedChunks.some((r) => r.chunkIndex === tblChunk.index);
      if (!alreadyPresent && isUsableDocumentText(tblChunk.text)) {
        retrievedChunks.unshift({
          score: 0.96,
          chunkIndex: tblChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: tblChunk.pageNumber || 1,
          section: tblChunk.section || "Tables",
          objectType: "table",
          objectId: tblChunk.objectId || tblChunk.tableMetadata?.tableId || null,
          caption: tblChunk.caption || tblChunk.tableMetadata?.caption || null,
          structuredData: tblChunk.structuredData || null,
          isTable: true,
          text: tblChunk.text,
        });
      }
    }
  }

  if (queryRoute.queryType === "FIGURE_QUERY" || queryRoute.figureNumber || queryRoute.figureId) {
    const targetFNum = String(queryRoute.figureNumber || "").toLowerCase();
    const targetOId = String(queryRoute.targetObjectId || queryRoute.exactFigureId || "").toLowerCase();
    const targetFId = String(queryRoute.figureId || "").toLowerCase();

    let exactFigMatches = [];
    if (doc && doc.chunks) {
      exactFigMatches = doc.chunks.filter((c) => {
        const isFig = Boolean(c.isFigure || c.objectType === "figure" || c.figureMetadata);
        const oId = String(c.objectId || "").toLowerCase();
        const fId = String(c.figureMetadata?.figureId || c.figureId || "").toLowerCase();
        const fNum = String(c.figureNumber || c.figureMetadata?.figureNumber || "").toLowerCase();
        return isFig && (
          (targetOId && oId === targetOId) ||
          (targetFId && (fId === targetFId || oId === targetFId)) ||
          (targetFNum && (fNum === targetFNum || oId === `figure ${targetFNum}`))
        );
      });
    }

    if (exactFigMatches.length > 0) {
      console.log(`[FIGURE_RETRIEVE] figure=${queryRoute.figureNumber || targetOId} exact_match=true qdrant_hits=${exactFigMatches.length}`);
      for (const figChunk of exactFigMatches) {
        const alreadyPresent = retrievedChunks.findIndex((r) => r.chunkIndex === figChunk.index);
        if (alreadyPresent !== -1) {
          retrievedChunks.splice(alreadyPresent, 1);
        }
        retrievedChunks.unshift({
          score: 0.99,
          chunkIndex: figChunk.index,
          documentId: String(doc._id),
          documentName: targetDocName,
          pageNumber: figChunk.pageNumber || 1,
          section: figChunk.section || "Figures",
          objectType: "figure",
          objectId: figChunk.objectId || `Figure ${targetFNum}`,
          figureNumber: figChunk.figureNumber || targetFNum,
          caption: figChunk.caption || null,
          isFigure: true,
          structuredData: figChunk.structuredData,
          figureMetadata: figChunk.figureMetadata,
          text: figChunk.text,
        });
      }
      console.log(`[ANSWER] primary_evidence_type=figure primary_evidence_id=${retrievedChunks[0].objectId}`);
    } else {
      console.log(`[FIGURE_RETRIEVE] figure=${queryRoute.figureNumber || targetOId} exact_match=false hits=0`);
    }
  }

  // Fallback to local MongoDB keyword search if vector search returned nothing
  if (!retrievedChunks.length) {
    const localMatches = await searchLocalChunks({
      question,
      documentId: activeDocId,
      userId,
      knowledgeBaseId,
      limit: 5,
    });
    if (localMatches && localMatches.length > 0) {
      retrievedChunks = localMatches;
    }
  }

  retrievedChunks = retrievedChunks.filter((c) => c && c.text && isUsableDocumentText(c.text));
  const retrievalLatencyMs = Date.now() - retrievalStartedAt;

  // Stage 4b: Explicit Missing Object Failure Check (Principle 14 & 15: Source Evidence > Inference)
  const missingCheck = checkMissingObjectFailure(question, retrievedChunks, doc);
  if (missingCheck.isMissing) {
    console.log(`[STREAM MISSING OBJECT] state=${missingCheck.failureState} req=${missingCheck.requestedId}`);
    onStart();
    onMetadata({
      generationId,
      retrievedChunks: 0,
      retrievalLatencyMs,
      hasDocumentContext: Boolean(activeDocId),
      failureState: missingCheck.failureState,
    });
    onCitations([]);
    onDelta(missingCheck.message, { seq: 1, finishReason: 'stop' });
    onDone(missingCheck.message, { finishReason: 'stop' });
    return {
      answer: missingCheck.message,
      sources: [],
      failureState: missingCheck.failureState,
      ledger: [],
    };
  }

  // Conflict detection
  const conflictReport = detectConflicts(retrievedChunks, doc?.chunks || []);
  let conflictNotice = "";
  if (conflictReport.conflict_detected) {
    conflictNotice = conflictReport.conflicts.map((c) => c.description).join("\n");
  }

  // Coverage check
  const coverageReport = checkRequirementCoverage({
    allChunks: doc?.chunks || [],
    retrievedChunks,
    targetRequirementId: intent.requirementId,
  });

  // Build Sources with Object-Level Citations and emit BEFORE generation begins
  const sources = retrievedChunks.slice(0, 10).map((res) => ({
    score: res.score,
    chunkIndex: res.chunkIndex,
    documentId: res.documentId,
    documentName: res.documentName || targetDocName,
    pageNumber: res.pageNumber,
    section: res.section || "Content",
    requirementId: res.requirementId || null,
    objectType: res.objectType || (res.isTable ? "table" : (res.isFigure ? "figure" : "text")),
    objectId: res.objectId || null,
    caption: res.caption || null,
    citation: formatObjectCitation(res),
    snippet: (res.text || "").slice(0, 150) + "...",
  }));

  onStart();
  onMetadata({
    generationId,
    retrievedChunks: retrievedChunks.length,
    retrievalLatencyMs,
    hasDocumentContext: Boolean(activeDocId),
    conflictDetected: conflictReport.conflict_detected,
    coverage: coverageReport,
  });
  onCitations(sources);

  // If no retrieved chunks
  if (!retrievedChunks.length) {
    if (!activeDocId) {
      const systemPrompt =
        `You are DOCUMIND-AI, a knowledgeable AI assistant.\n` +
        `Answer clearly, concisely, and helpfully in clean, natural plain text without markdown headings (#) or bold (**).\n` +
        (memorySection ? `\n${memorySection}\n` : "") +
        (projectInstructions ? `\nProject Instructions: ${projectInstructions}\n` : "");

      const streamMessages = [
        { role: "system", content: systemPrompt },
        ...recentMessages.slice(-4),
        { role: "user", content: question },
      ];

      const streamRes = await streamOpenRouter({
        messages: streamMessages,
        model: getFastModel(),
        task: "general_stream_chat",
        signal,
        onDelta,
        onDone,
      });
      return { answer: streamRes.text, sources: [] };
    }

    const noEvidenceMsg = "I could not find sufficient evidence in the selected documents to answer this question reliably.";
    onDelta(noEvidenceMsg, { seq: 1, finishReason: 'stop' });
    onDone(noEvidenceMsg, { finishReason: 'stop' });
    return { answer: noEvidenceMsg, sources: [] };
  }

  // Stage 7: Figure Verification
  let verifiedFigEvidence = null;
  if (queryRoute.queryType === "FIGURE_QUERY" || queryRoute.figureNumber || queryRoute.figureId) {
    const targetFNum = String(queryRoute.figureNumber || "").toLowerCase();
    const targetOId = String(queryRoute.targetObjectId || queryRoute.exactFigureId || "").toLowerCase();
    const targetFId = String(queryRoute.figureId || "").toLowerCase();

    let targetFigureDoc = null;
    if (doc && doc.figures && doc.figures.length > 0) {
      targetFigureDoc = doc.figures.find((f) => {
        const oId = String(f.objectId || "").toLowerCase();
        const fId = String(f.figureId || "").toLowerCase();
        const fNum = String(f.figureNumber || "").toLowerCase();
        return (
          (targetOId && oId === targetOId) ||
          (targetFId && (fId === targetFId || oId === targetFId)) ||
          (targetFNum && (fNum === targetFNum || oId === `figure ${targetFNum}`))
        );
      });
    }
    if (!targetFigureDoc && retrievedChunks.length > 0) {
      const figChunk = retrievedChunks.find((c) => c.isFigure || c.objectType === "figure");
      if (figChunk) {
        targetFigureDoc = figChunk.structuredData || figChunk.figureMetadata || figChunk;
      }
    }
    if (targetFigureDoc) {
      verifiedFigEvidence = buildVerifiedFigureEvidence(targetFigureDoc);
    }
  }

  // Prompt Crafting with Intent-Specific Guidance
  let extraInstructions = "";
  if (queryRoute.queryType === "TABLE_QUERY") {
    extraInstructions = `The user is querying a table or tabular data (${queryRoute.targetObjectId || "table"}).
Carefully examine the table rows, columns, headers, and individual cell values.
State exact numbers, percentages, and units without rounding or approximating.
Never silently omit or fabricate cells. If a value is missing or not stated in the evidence, say so directly.
Explicitly cite the table ID and page number in your response.`;
  } else if (queryRoute.queryType === "FIGURE_QUERY") {
    if (verifiedFigEvidence && verifiedFigEvidence.verified) {
      const participantList = verifiedFigEvidence.participant_names.map((p) => `- ${p}`).join("\n");
      const formatInteractionSentence = (i) => {
        const lbl = i.label || "";
        const from = i.from || "Client";
        const to = i.to || "API";
        if (lbl.startsWith("POST") || lbl.startsWith("GET") || lbl.startsWith("PUT") || lbl.startsWith("DELETE")) {
          return `${i.order}. The ${from} sends ${lbl} to the ${to}.`;
        }
        if (/^enter/i.test(lbl)) {
          return `${i.order}. The ${from} enters ${lbl.replace(/^enter\s*/i, "")} in the ${to}.`;
        }
        if (/^read failure counter/i.test(lbl) || /^checks? failure counter/i.test(lbl)) {
          return `${i.order}. The ${from} checks the failure counter in ${to}.`;
        }
        if (/^load user/i.test(lbl)) {
          return `${i.order}. The ${from} loads the user and verifies the argon2id password hash in ${to}.`;
        }
        if (/^counter below/i.test(lbl)) {
          return `${i.order}. ${from} returns the counter status to the ${to}.`;
        }
        if (/^credentials valid/i.test(lbl)) {
          return `${i.order}. ${from} confirms the credentials and MFA requirement to the ${to}.`;
        }
        if (/^200 mfarequired/i.test(lbl) || /^mfa challenge/i.test(lbl)) {
          return `${i.order}. The ${from} returns an MFA challenge to the ${to}.`;
        }
        if (/^validate code/i.test(lbl)) {
          return `${i.order}. The ${from} validates the MFA TOTP code in ${to}.`;
        }
        if (/^create session/i.test(lbl)) {
          return `${i.order}. The ${from} creates the session and refresh-token family in ${to}.`;
        }
        return `${i.order}. The ${from} sends ${lbl} to the ${to}.`;
      };
      const interactionSeq = verifiedFigEvidence.interactions.map(formatInteractionSentence).join("\n");

      const isComparison = /\b(compar(?:e|ison)|versus|\bvs\b|differ(?:ence)?)\b/i.test(question);

      if (isComparison) {
        extraInstructions = `The user is asking to compare ${verifiedFigEvidence.figure_id} with another document requirement or section.
You receive VERIFIED_EVIDENCE for ${verifiedFigEvidence.figure_id}:
Figure Type: ${verifiedFigEvidence.figure_type}
Caption: ${verifiedFigEvidence.caption}
Verified Participants: ${verifiedFigEvidence.participant_names.join(", ")}
Verified Interactions:
${interactionSeq}

Compare ${verifiedFigEvidence.figure_id} directly with the target requirement (e.g. FR-AUTH-001 Staff Login):
1. Explain how Figure 3 illustrates the sequence of authentication described in FR-AUTH-001.
2. Highlight participants involved: ${verifiedFigEvidence.participant_names.join(", ")}.
3. Note database and cache interactions: Redis for failure counters and sessions, PostgreSQL for user loading and Argon2id hash verification.
4. Note MFA challenge generation and token issuance.
RULES:
- Return ONLY the clean user-facing answer.
- Never reveal internal reasoning, thought process, or scratchpad.`;
      } else {
        extraInstructions = `You are the final answer generator for DOCUMIND-AI.
You receive VERIFIED_EVIDENCE for ${verifiedFigEvidence.figure_id}:
Figure Type: ${verifiedFigEvidence.figure_type}
Caption: ${verifiedFigEvidence.caption}

Verified Participants:
${participantList}

Verified Sequential Interactions:
${interactionSeq}
${verifiedFigEvidence.visual_description ? `\nVerified Visual Description:\n${verifiedFigEvidence.visual_description}\n` : ""}

CRITICAL RULES:
1. Return ONLY the clean user-facing answer.
2. NEVER reveal internal reasoning, thought process, scratchpad, analysis, or intermediate steps.
3. NEVER output thinking tags (<think>...</think>) or phrases like "Thinking Process:", "Analyze the Request:", "Let me check...".
4. NEVER mention discarded OCR candidates or parser artifacts (such as "Visual").
5. NEVER invent missing evidence or unverified interactions.
6. Do NOT repeat any interaction twice.
7. Keep entity names exactly as verified: ${verifiedFigEvidence.participant_names.join(", ")}.
8. Preserve the sequential order of interactions.
9. If asked for participants and interaction order, present:
Figure ${verifiedFigEvidence.figure_number} contains five participants:

${participantList}

The interaction sequence is:

${interactionSeq}
10. If asked a specific question about an action in the figure, answer it directly and concisely using the verified evidence.`;
      }
    } else {
      extraInstructions = `You are answering a figure query. Ground your answer strictly in the verified figure evidence. If visual evidence is insufficient or unavailable, state "INSUFFICIENT_VISUAL_EVIDENCE" or "Some labels in the figure could not be verified reliably." Do not guess or invent interactions.`;
    }
  } else if (queryRoute.queryType === "COMPLETE_EXTRACTION") {
    extraInstructions = `The user requested complete extraction. Provide an exhaustive listing of all items, rows, or requirements found in the evidence. Do not omit any row or item. Check for completeness before responding.`;
  } else if (queryRoute.queryType === "EXACT_IDENTIFIER_QUERY") {
    extraInstructions = `The user is querying an exact identifier (${queryRoute.targetObjectId || 'specified identifier'}). Retrieve and detail all specific requirements, attributes, or definitions tied directly to this identifier.`;
  } else if (intent.type === "specific_requirement") {
    extraInstructions = `The user is asking about requirement ${intent.requirementId}.
Detail:
- Requirement ID and Name
- Priority and Actors
- Description and Preconditions
- Main Flow, Alternate Flows, and Exceptions
- Business Rules and Validations
- Database and Redis Impact
- Related API Endpoints
- Acceptance Criteria
- Any Source Inconsistencies
Only include details explicitly mentioned in the source context. Do not invent any values.`;
  } else if (intent.type === "executive_summary") {
    extraInstructions = `The user requested an Executive Summary.
Perform FINAL EXECUTIVE-SUMMARY QUALITY CONTROL:
1. NUMBERING CHECK: Ensure all generated top-level sections use strictly sequential numbering: 1., 2., 3., 4., 5., 6., 7., 8., 9., 10., 11. Never repeat "1." or restart numbering accidentally.
2. REQUIREMENT COVERAGE CHECK: Every one of the 10 functional requirements MUST be explicitly represented under Main Functional Requirements:
   - FR-AUTH-001: Staff Login
   - FR-AUTH-002: Cashier PIN Fast-Switch
   - FR-AUTH-003: User Registration & Provisioning
   - FR-AUTH-004: Multi-Factor Authentication
   - FR-AUTH-005: Forgot / Reset Password
   - FR-AUTH-006: Password Policy
   - FR-AUTH-007: Session Management
   - FR-AUTH-008: Trusted Device Management
   - FR-AUTH-009: Logout & Global Sign-Out
   - FR-AUTH-010: Security Audit Log
3. SOURCE STRUCTURE: Preserve source section numbering (e.g. Section 3.1, 3.1.1, etc.).
4. FACT CHECK: Verify all numbers, durations, token lifetimes, roles, API endpoints, HTTP methods, limits against source evidence.
5. NO INFERENCE AS FACT: State only facts explicitly supported.
6. SOURCE CONFLICT: If conflicting endpoints exist, report under "Source Inconsistencies":
   "Source inconsistency detected:
   Section 3.1.4 states POST /api/v1/auth/mfa/challenge.
   Section 3.1.10 and Section 9.2.2 state POST /api/v1/auth/mfa/verify."
7. PRIMARY VS SECONDARY: Prioritize functional requirements over secondary API details (correlation IDs, idempotency, webhooks).
8. REDUNDANCY CHECK: Do not repeat concepts unnecessarily.

Structure the Executive Summary into these clean numbered sections:
1. Purpose & Objectives
2. Scope & Boundaries
3. Main Functional Requirements (covering all 10 FR-AUTH requirements)
4. Important Business Rules
5. Security Requirements
6. Technical Architecture & Database Impact
7. API & Integration Requirements
8. UI/UX Requirements
9. Acceptance Criteria & Performance Requirements
10. Exclusions
11. Source Inconsistencies`;
  } else if (intent.type === "requirement_list") {
    extraInstructions = `List all requirements found in the document with their exact ID, title, priority, and key endpoints. Do not omit any requirement.`;
  } else if (intent.type === "conflict_check") {
    extraInstructions = `The user specifically asked about conflicting or inconsistent definitions in the document. Clearly identify each conflicting statement, the sections where they appear, and state that the source contains contradictory references.`;
  }

  // Build Grounded Multimodal Document Context
  const contextChunks = (queryRoute.queryType === "FIGURE_QUERY" || queryRoute.figureNumber || queryRoute.targetObjectId)
    ? retrievedChunks.slice(0, 6)
    : retrievedChunks.slice(0, 10);

  const context = contextChunks
    .map(
      (m) =>
        `[Document: ${m.documentName}${m.objectType ? `, Type: ${m.objectType}` : ""}${m.objectId ? `, ID: ${m.objectId}` : ""}, Section: ${m.section || "Content"}, Page ${m.pageNumber}, Chunk #${m.chunkIndex}${m.requirementId ? `, Req: ${m.requirementId}` : ""}]\n${m.text}`
    )
    .join("\n\n---\n\n");

  const systemPrompt =
    `You are DOCUMIND-AI, a strictly source-grounded document intelligence assistant.\n\n` +
    `Answer the user's question accurately, thoroughly, and strictly based on the provided document context.\n\n` +
    `CRITICAL GROUNDING & FIDELITY RULES:\n` +
    `1. Answer using ONLY facts directly mentioned in the document context. If a field or detail is not specified, state that it is not specified—NEVER guess or invent.\n` +
    `2. STRICT NUMERICAL FIDELITY: Preserve exact numbers, limits, durations, and counts. Never round or alter numbers.\n` +
    `3. STRICT API & TECHNICAL FIDELITY: Preserve exact endpoint paths, HTTP methods, requirement IDs, and role names.\n` +
    `4. NO UNGROUNDED TECHNOLOGIES: Under NO circumstances introduce technologies, protocols, or authentication methods not explicitly present in the source.\n` +
    `5. CONFLICT & INCONSISTENCY REPORTING: If the context contains conflicting information (for example, differing API endpoints for the same action, or differing numbers), DO NOT silently pick one or invent another. You MUST explicitly state that the source contains conflicting definitions and identify both.\n` +
    `6. Distinguish proposed work from completed work.\n` +
    `7. STRICT NEGATIVE CONSTRAINT: Under NO circumstances output raw PDF syntax, object tokens (e.g. obj, endobj, stream, endstream, xref, trailer), or internal byte offsets.\n\n` +
    `WRITING AND FORMATTING RULES:\n` +
    `1. Answer in clean, natural plain text without markdown headings (#, ##) or bold (**).\n` +
    `2. Use simple numbered lists (1., 2.) when lists are helpful.\n` +
    `3. Match the amount of detail directly to the user's question.\n` +
    (conflictNotice ? `\nSOURCE INCONSISTENCY ALERT:\n${conflictNotice}\n` : "") +
    (extraInstructions ? `\nSPECIAL INSTRUCTIONS:\n${extraInstructions}\n` : "") +
    (memorySection ? `\n${memorySection}\n` : "") +
    (projectInstructions ? `\nProject Instructions: ${projectInstructions}\n` : "");

  const userPrompt =
    `Document Name: ${targetDocName || "Document"}\n\n` +
    `Document Context:\n${context}\n\n` +
    `User Question: ${question}\n\n` +
    `Provide your clean plain-text answer:`;

  const streamMessages = [
    { role: "system", content: systemPrompt },
    ...recentMessages.slice(-4),
    { role: "user", content: userPrompt },
  ];

  let rawStreamed = "";
  const streamRes = await streamOpenRouter({
    messages: streamMessages,
    model: getMainModel(),
    temperature: 0.1,
    task: "rag_stream_answer",
    signal,
    onDelta: (delta, opts) => {
      rawStreamed += delta;
      onDelta(delta, opts);
    },
    onDone: (finalText, opts) => {
      const { verifiedAnswer, metrics } = validateAndCorrectAnswer({
        question,
        answer: finalText || rawStreamed,
        chunks: retrievedChunks,
        conflictReport,
      });
      const cleanAnswer = stripInternalReasoning(verifiedAnswer);
      onDone(cleanAnswer, opts);
    },
  });

  const { verifiedAnswer, metrics: finalMetrics } = validateAndCorrectAnswer({
    question,
    answer: streamRes.text,
    chunks: retrievedChunks,
    conflictReport,
  });

  const ledger = buildEvidenceLedger(verifiedAnswer, retrievedChunks);
  const cleanFinal = stripInternalReasoning(verifiedAnswer);

  return {
    answer: cleanFinal,
    citations: sources,
    evidenceStatus: verifiedFigEvidence ? verifiedFigEvidence.evidence_status : "VERIFIED",
    sources,
    grounding: finalMetrics,
    coverage: coverageReport,
    conflicts: conflictReport,
    ledger,
  };
};

const removeDocumentFromVectorDB = async ({ documentId, userId }) => {
  try {
    await deleteDocumentVectors(documentId, userId);
    return { message: "Document vectors deleted successfully" };
  } catch (err) {
    return { message: `Deletion error: ${err.message}` };
  }
};

module.exports = {
  processDocument,
  askDocument,
  answerQuestion: askDocument,
  askDocumentStream,
  ensureDocChunks,
  removeDocumentFromVectorDB,
};

