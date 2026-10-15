const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const InformationExtraction = require('../models/InformationExtraction');
const { loadDocument } = require('./documentLoaderService');
const { validateTextQuality, cleanDocumentText } = require('./textQualityService');
const { chunkDocument } = require('./chunkService');
const { createEmbeddings } = require('./embeddingService');
const { storeDocumentChunks, deleteDocumentVectors } = require('./vectorService');
const { classifyDocument } = require('./classificationService');
const { enrichFiguresWithVision } = require('./visionService');
const storageService = require('./storageService');

// In-memory set to prevent concurrent pipeline executions on the same document
const activeProcessing = new Set();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientError = (err) => {
  const code = err.code || err.cause?.code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'AI_SERVICE_UNAVAILABLE' ||
    code === 'AI_SERVICE_TIMEOUT' ||
    /ECONNREFUSED|ECONNRESET|ETIMEDOUT|timeout/i.test(err.message)
  );
};

/**
 * Validate document meets all readiness criteria for AI queries.
 */
const validateDocumentReady = (doc, vectorsWritten) => {
  if (!doc) {
    throw new Error('DOCUMENT_NOT_FOUND: Document record does not exist');
  }
  if (!doc.fullText || doc.fullText.trim().length === 0) {
    throw new Error('VALIDATION_FAILED: Clean validated document text is missing');
  }
  if (!doc.chunks || doc.chunks.length === 0) {
    throw new Error('CHUNKING_FAILED: Document contains zero chunks');
  }
  if ((!vectorsWritten || vectorsWritten <= 0) && (!doc.chunks || !doc.chunks.some((c) => c.embedding && c.embedding.length > 0))) {
    throw new Error('INDEX_FAILED: Vector index verification failed (0 vectors generated)');
  }
  return true;
};

/**
 * Central Document Processing Pipeline:
 * Controls the entire lifecycle from raw file to verified READY state.
 */
const processDocument = async (documentId, options = {}) => {
  const docIdStr = String(documentId);
  if (activeProcessing.has(docIdStr)) {
    console.log(`[PIPELINE] Document ${docIdStr} is already being processed. Skipping duplicate trigger.`);
    return;
  }

  activeProcessing.add(docIdStr);
  let currentStep = '01 Upload complete';

  try {
    const doc = await Document.findById(docIdStr);
    if (!doc) {
      throw new Error(`DOCUMENT_NOT_FOUND: Document ${docIdStr} not found in database`);
    }

    const fileName = doc.name || doc.originalName || 'Document';
    const filePath = doc.filePath;
    const fileType = (path.extname(fileName) || '').toLowerCase().replace(/^\./, '');

    console.log(`[UPLOAD] file=${fileName} document_id=${docIdStr}`);

    // Resolve file path on disk or retrieve from storage provider
    let resolvedPath = filePath;
    if (resolvedPath && !fs.existsSync(resolvedPath)) {
      const candidate = path.join(__dirname, '..', resolvedPath);
      if (fs.existsSync(candidate)) resolvedPath = candidate;
    }

    if ((!resolvedPath || !fs.existsSync(resolvedPath)) && (doc.storageKey || doc.filePath)) {
      try {
        const fileBuffer = await storageService.getFileBuffer(doc.storageKey || doc.filePath);
        const tempDir = path.join(__dirname, '../uploads/temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, `${docIdStr}-${fileName}`);
        fs.writeFileSync(tempPath, fileBuffer);
        resolvedPath = tempPath;
      } catch (hydrateErr) {
        console.warn(`[PIPELINE] Remote storage retrieval failed: ${hydrateErr.message}`);
      }
    }

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      const missingErr = new Error(`DOCUMENT_EXTRACTION_FAILED: Original file "${fileName}" not found on server disk or storage`);
      missingErr.code = 'EXTRACTION_FAILED';
      throw missingErr;
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.size === 0) {
      const emptyErr = new Error(`VALIDATION_FAILED: Uploaded file "${fileName}" is empty (0 bytes)`);
      emptyErr.code = 'VALIDATION_FAILED';
      throw emptyErr;
    }

    // ── STAGE 1 & 2: READING & EXTRACTION ──
    currentStep = '02 Reading document';
    await Document.findByIdAndUpdate(docIdStr, {
      status: 'processing',
      processingStep: currentStep,
    });

    currentStep = '03 Extracting text';
    await Document.findByIdAndUpdate(docIdStr, {
      status: 'extracting',
      processingStep: currentStep,
    });

    let loaded = null;
    try {
      loaded = await loadDocument(resolvedPath, fileName);
    } catch (loadErr) {
      const extErr = new Error(`DOCUMENT_EXTRACTION_FAILED: ${loadErr.message}`);
      extErr.code = 'EXTRACTION_FAILED';
      throw extErr;
    }

    if (!loaded || !loaded.pages || loaded.pages.length === 0) {
      const noPagesErr = new Error(`DOCUMENT_EXTRACTION_FAILED: No readable pages could be extracted from "${fileName}"`);
      noPagesErr.code = 'EXTRACTION_FAILED';
      throw noPagesErr;
    }

    const fullRawText = loaded.fullText || loaded.pages.map((p) => p.text).join('\f');
    const allTables = loaded.tables || loaded.pages.flatMap((p) => p.tables || []);
    let allFigures = loaded.figures || loaded.pages.flatMap((p) => p.figures || []);
    let allEvidenceObjects = loaded.evidenceObjects || loaded.pages.flatMap((p) => p.evidenceObjects || []);
    const anyOcr = loaded.pages.some((p) => p.ocrUsed || p.extractionMethod === 'ocr');
    const nativePages = loaded.pages.filter((p) => p.extractionMethod === 'native').length;
    const ocrPages = loaded.pages.filter((p) => p.ocrUsed || p.extractionMethod === 'ocr').length;
    const totalChars = fullRawText.length;
    const totalWords = (fullRawText.match(/[\p{L}\p{N}]+/gu) || []).length;
    const docType = (loaded.fileType || fileType || '').toLowerCase();
    const diagnostics = loaded.diagnostics || {
      textBlocks: 0,
      tablesDetected: allTables.length,
      tablesParsed: allTables.length,
      figuresDetected: allFigures.length,
      figuresProcessed: allFigures.length,
      ocrPages,
      failedObjects: 0,
      evidenceObjectsCount: allEvidenceObjects.length,
    };

    console.log(`[INGEST] file=${fileName} document_id=${docIdStr} size=${stat.size} type=${docType}`);
    console.log(`[LAYOUT] pages=${loaded.pages.length} native_pages=${nativePages} ocr_pages=${ocrPages} characters=${totalChars} words=${totalWords}`);
    console.log(`[TABLE] detected=${allTables.length} parsed=${allTables.length}`);
    console.log(`[FIGURE] detected=${allFigures.length} processed=${allFigures.length}`);
    console.log(`[EVIDENCE] total_objects=${allEvidenceObjects.length}`);

    if (loaded.error === 'OCR_UNAVAILABLE' || loaded.errorCode === 'OCR_UNAVAILABLE') {
      console.log(`[OCR] OCR_UNAVAILABLE: Document requires OCR, but OCR dependencies are not available.`);
      const ocrErr = new Error(`OCR_UNAVAILABLE: Scanned document requires OCR, but OCR dependencies (Tesseract OCR) are not available on the server.`);
      ocrErr.code = 'OCR_UNAVAILABLE';
      throw ocrErr;
    }

    if (totalChars === 0 && allTables.length === 0 && allFigures.length === 0) {
      console.log(`[QUALITY] valid=false score=0.0 failed_rules=["NO_USABLE_TEXT_OR_TABLES"]`);
      const emptyErr = new Error(`QUALITY_VALIDATION_FAILED: Document failed quality validation (no usable text, tables, or figures extracted)`);
      emptyErr.code = 'VALIDATION_FAILED';
      throw emptyErr;
    }

    if (anyOcr) {
      await Document.findByIdAndUpdate(docIdStr, {
        status: 'ocr_processing',
        processingStep: '04 Detecting scanned pages',
        ocrUsed: true,
      });
    }

    if (allFigures.length > 0) {
      console.log(`[MULTIMODAL] Enriching ${allFigures.length} figures with vision analysis...`);
      await Document.findByIdAndUpdate(docIdStr, {
        status: 'vision_processing',
        processingStep: `05 Performing multimodal vision & OCR analysis on ${allFigures.length} figures`,
      });
      allFigures = await enrichFiguresWithVision(allFigures, docIdStr);

      // Synchronize enriched figure data to allEvidenceObjects
      for (const fig of allFigures) {
        const evIdx = allEvidenceObjects.findIndex((e) =>
          e.objectId === fig.objectId ||
          e.objectId === fig.figureId ||
          e.figureNumber === fig.figureNumber ||
          (fig.figureNumber && e.id && e.id.includes(`figure_${fig.figureNumber}`))
        );
        if (evIdx !== -1) {
          allEvidenceObjects[evIdx] = {
            ...allEvidenceObjects[evIdx],
            content: fig.rawText,
            ocrText: fig.ocrText,
            visualDescription: fig.visualDescription,
            structuredData: fig.structuredData,
            metadata: {
              ...(allEvidenceObjects[evIdx].metadata || {}),
              participants: fig.participants,
              interactions: fig.interactions,
              labels: fig.labels,
            },
          };
        }
      }

      // Also ensure loaded.pages[].figures has enriched figures
      for (const p of loaded.pages) {
        if (p.figures && p.figures.length > 0) {
          p.figures = allFigures.filter((f) => (f.pageNumber || 1) === (p.pageNumber || 1));
        }
      }
    }

    if (allTables.length > 0 || allFigures.length > 0) {
      await Document.findByIdAndUpdate(docIdStr, {
        status: 'table_extraction',
        processingStep: `05 Extracting multimodal objects (${allTables.length} tables, ${allFigures.length} figures)`,
        tables: allTables,
        tableCount: allTables.length,
        figures: allFigures,
        figureCount: allFigures.length,
      });
    }

    console.log(`[EXTRACTION] characters=${fullRawText.length} tables=${allTables.length} figures=${allFigures.length} status=SUCCESS`);

    // ── STAGE 3: QUALITY VALIDATION ──
    currentStep = 'Validating content';
    await Document.findByIdAndUpdate(docIdStr, {
      status: 'validating',
      processingStep: 'Validating content quality',
    });

    const quality = validateTextQuality(fullRawText, {
      fileType: docType,
      fileName,
      tablesCount: allTables.length,
    });

    if (!quality.valid && allTables.length === 0) {
      console.log(`[QUALITY] valid=false score=${quality.score} failed_rules=[${(quality.failedRules || []).join(',')}]`);
      const valErr = new Error(`QUALITY_VALIDATION_FAILED: ${quality.reason}`);
      valErr.code = 'VALIDATION_FAILED';
      throw valErr;
    }

    // ── STAGE 4: CLEANING & NORMALIZATION ──
    currentStep = '06 Preparing sections';
    const cleanText = cleanDocumentText(fullRawText);

    // ── STAGE 4.5: AUTOMATIC DOCUMENT CLASSIFICATION (SRS Section 15, 43) ──
    let category = 'Other';
    let classificationConfidence = 0.95;
    try {
      const classRes = await classifyDocument(cleanText, fileName);
      category = classRes.category;
      classificationConfidence = classRes.confidence;
      console.log(`[CLASSIFICATION] document_id=${docIdStr} category="${category}" confidence=${classificationConfidence}`);
    } catch (classErr) {
      console.warn('[CLASSIFICATION_WARNING]:', classErr.message);
    }

    // Save fullText, summary, classification category, tables, figures, evidence objects, and diagnostics
    await Document.findByIdAndUpdate(docIdStr, {
      status: 'cleaning',
      processingStep: currentStep,
      fullText: cleanText,
      summary: cleanText.slice(0, 400),
      category,
      classificationConfidence,
      qualityScore: quality.score,
      failedRules: quality.failedRules,
      tables: allTables,
      tableCount: allTables.length,
      figures: allFigures,
      figureCount: allFigures.length,
      evidenceObjects: allEvidenceObjects,
      evidenceObjectsCount: allEvidenceObjects.length,
      diagnostics,
      ocrUsed: anyOcr,
    });

    // ── STAGE 5: SPLITTING / CHUNKING ──
    currentStep = 'Splitting sections';
    await Document.findByIdAndUpdate(docIdStr, {
      status: 'splitting',
      processingStep: '06 Preparing sections',
    });

    let chunks = [];
    try {
      chunks = chunkDocument({
        pages: loaded.pages,
        text: cleanText,
        fileType: loaded.fileType || fileType,
        fileName,
        documentId: docIdStr,
      });
    } catch (chunkErr) {
      const cErr = new Error(`CHUNKING_FAILED: ${chunkErr.message}`);
      cErr.code = 'CHUNKING_FAILED';
      throw cErr;
    }

    if (!chunks || chunks.length === 0) {
      const cErr = new Error(`CHUNKING_FAILED: Zero valid chunks could be created from "${fileName}"`);
      cErr.code = 'CHUNKING_FAILED';
      throw cErr;
    }

    const totalTokens = chunks.reduce((acc, c) => acc + (c.tokenCount || 0), 0);

    // ── STAGE 6: EMBEDDING GENERATION (WITH BOUNDED RETRY) ──
    currentStep = '07 Creating AI index';
    await Document.findByIdAndUpdate(docIdStr, {
      status: 'embedding',
      processingStep: 'Generating AI embeddings',
      chunksCount: chunks.length,
      totalTokens,
    });

    const chunkTexts = chunks.map((c) => c.text);
    let embeddings = null;
    let embedAttempts = 0;
    const maxEmbedRetries = 2;

    while (embedAttempts <= maxEmbedRetries) {
      try {
        embeddings = await createEmbeddings(chunkTexts);
        break;
      } catch (embErr) {
        embedAttempts++;
        if (isTransientError(embErr) && embedAttempts <= maxEmbedRetries) {
          console.warn(`[EMBEDDING] Transient error on attempt ${embedAttempts}. Retrying in 1s...`);
          await sleep(1000);
          continue;
        }
        const err = new Error(`EMBEDDING_FAILED: ${embErr.message}`);
        err.code = 'EMBEDDING_FAILED';
        throw err;
      }
    }

    if (!embeddings || embeddings.length !== chunks.length) {
      const mismatchErr = new Error(`EMBEDDING_FAILED: Generated vector count (${embeddings?.length || 0}) does not match chunk count (${chunks.length})`);
      mismatchErr.code = 'EMBEDDING_FAILED';
      throw mismatchErr;
    }

    // Attach embedding metadata to chunks
    chunks.forEach((chunk, idx) => {
      chunk.embedding = embeddings[idx];
      chunk.embeddingProvider = process.env.EMBEDDING_PROVIDER || 'huggingface';
      chunk.embeddingModel = process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
      chunk.embeddingDimension = 384;
      chunk.embeddingVersion = 'minilm-v1';
    });

    // ── STAGE 7: ATOMIC QDRANT INDEXING ──
    currentStep = 'Writing vector index';
    await Document.findByIdAndUpdate(docIdStr, {
      status: 'indexing',
      processingStep: 'Writing vector index',
      chunks,
    });

    let points = [];
    try {
      points = await storeDocumentChunks({
        documentId: docIdStr,
        userId: doc.owner,
        organizationId: doc.organizationId,
        knowledgeBaseId: doc.knowledgeBaseId,
        filename: fileName,
        chunks,
        embeddings,
      });
    } catch (qErr) {
      const idxErr = new Error(`INDEX_FAILED: ${qErr.message}`);
      idxErr.code = 'INDEX_FAILED';
      throw idxErr;
    }

    // ── STAGE 8: READY GATE VALIDATION ──
    const updatedDoc = await Document.findById(docIdStr);
    validateDocumentReady(updatedDoc, points.length);

    await Document.findByIdAndUpdate(docIdStr, {
      $set: {
        status: 'ready',
        processingStep: '08 Ready',
        chunksCount: chunks.length,
        vectorsCount: points.length,
        totalTokens,
        tables: allTables,
        tableCount: allTables.length,
        figures: allFigures,
        figureCount: allFigures.length,
        evidenceObjects: allEvidenceObjects,
        evidenceObjectsCount: allEvidenceObjects.length,
        diagnostics,
        errorMessage: '',
        error_message: '',
      },
      $unset: {
        processingError: 1,
        failureReason: 1,
        embeddingError: 1,
      },
    });

    console.log(`[DOCUMENT] status=READY document_id=${docIdStr} file="${fileName}" chunks=${chunks.length} vectors=${points.length}`);
    return {
      success: true,
      documentId: docIdStr,
      status: 'ready',
      chunks: chunks.length,
      vectors: points.length,
    };
  } catch (err) {
    const failureCode = (err.code || 'FAILED').toLowerCase();
    const isSemantic = failureCode === 'index_failed' || failureCode === 'embedding_failed';
    const exactStatus = [
      'extraction_failed',
      'validation_failed',
      'chunking_failed',
      'embedding_failed',
      'index_failed',
    ].includes(failureCode)
      ? failureCode
      : 'failed';

    console.error(`[PIPELINE FAILED] document_id=${docIdStr} status=${exactStatus} reason="${err.message}"`);

    // If indexing failed midway, rollback partial vectors from Qdrant
    if (isSemantic || exactStatus === 'index_failed') {
      try {
        const docRecord = await Document.findById(docIdStr);
        if (docRecord) {
          await deleteDocumentVectors(docIdStr, docRecord.owner);
        }
      } catch (_) {}
    }

    await Document.findByIdAndUpdate(docIdStr, {
      status: exactStatus,
      processingStep: `Failed: ${err.message.slice(0, 100)}`,
      errorMessage: err.message,
      error_message: err.message,
      ...(exactStatus === 'extraction_failed' || exactStatus === 'validation_failed'
        ? { chunks: [], chunksCount: 0, vectorsCount: 0 }
        : {}),
    }).catch(() => {});

    throw err;
  } finally {
    activeProcessing.delete(docIdStr);
  }
};

/**
 * Reprocess an existing document cleanly.
 */
const reprocessDocument = async (documentId, userId) => {
  const docIdStr = String(documentId);
  const doc = await Document.findOne({ _id: docIdStr, owner: userId });
  if (!doc) {
    throw new Error('Document not found or unauthorized');
  }

  console.log(`[REPROCESS] Starting clean reprocessing for document "${doc.name}" (${docIdStr})`);

  // Cached findings are tied to the validated document content and must never
  // survive a reprocess which can change text, sections, pages, or tables.
  await InformationExtraction.deleteMany({ documentId: docIdStr, user: userId }).catch((error) => {
    console.warn(`[REPROCESS] Extraction cache invalidation warning: ${error.message}`);
  });

  // Clean stale vectors from Qdrant
  try {
    await deleteDocumentVectors(docIdStr, userId);
  } catch (dErr) {
    console.warn(`[REPROCESS] Vector cleanup warning: ${dErr.message}`);
  }

  // Reset document state in MongoDB
  await Document.findByIdAndUpdate(docIdStr, {
    $set: {
      status: 'processing',
      processingStep: '02 Reading document',
      chunks: [],
      chunksCount: 0,
      vectorsCount: 0,
      errorMessage: '',
      error_message: '',
    },
    $unset: {
      processingError: 1,
      failureReason: 1,
      embeddingError: 1,
    },
  });

  // Run central processing pipeline asynchronously
  setImmediate(async () => {
    try {
      await processDocument(docIdStr, { isReprocess: true });
    } catch (e) {
      console.error(`[REPROCESS ERROR] ${docIdStr}: ${e.message}`);
    }
  });

  return { message: 'Document re-indexing started', status: 'processing', documentId: docIdStr };
};

module.exports = {
  processDocument,
  reprocessDocument,
  validateDocumentReady,
};
