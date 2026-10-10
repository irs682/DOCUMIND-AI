const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Document = require("../models/Document");
const { loadDocument, getPythonCommand } = require("../services/documentLoaderService");
const { chunkDocument } = require("../services/chunkService");
const { validateTextQuality, isUsableDocumentText } = require("../services/textQualityService");
const { createEmbedding, createEmbeddings } = require("../services/embeddingService");
const { storeDocumentChunks, searchSimilarChunks, deleteDocumentVectors } = require("../services/vectorService");
const { performHybridSearch } = require("../services/hybridSearchService");
const { askDocument } = require("../services/ragService");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);

async function runTests() {
  console.log("======================================================================");
  console.log("DOCUMIND-AI: DOCX UNICODE & AI-SERVICE EMBEDDING VERIFICATION SUITE");
  console.log("======================================================================\n");

  const results = {};

  // 1. Locate DOCX file
  const docxCandidates = [
    path.join(__dirname, "../uploads/users/6a99057f5a0ab7b95f192b90/file-1788861599218-353850856.docx"),
    path.join(__dirname, "../uploads/users/6a9854f7444c05b831392156/file-1788859897388-407266223.docx"),
  ];

  let docxPath = docxCandidates.find((p) => fs.existsSync(p));
  if (!docxPath) {
    console.error("❌ Risk Analysis DOCX not found at expected paths");
    process.exit(1);
  }
  console.log(`[FILE] Located DOCX at: ${docxPath} (${fs.statSync(docxPath).size} bytes)`);

  // ====================================================================
  // TEST 2 — Direct Python Loader Invocation
  // ====================================================================
  console.log("\n--- TEST 2: DIRECT PYTHON LOADER (CLI --json) ---");
  const pythonCmd = getPythonCommand();
  const scriptPath = path.resolve(__dirname, "document_loader.py");
  console.log(`[EXEC] Running: ${pythonCmd} "${scriptPath}" "${docxPath}" --json`);

  let directJson = null;
  try {
    const { stdout, stderr } = await execFileAsync(
      pythonCmd,
      [scriptPath, path.resolve(docxPath), "--json"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1",
        },
        timeout: 30000,
      }
    );
    if (stderr) {
      console.log(`[PYTHON STDERR]: ${stderr.trim()}`);
    }
    directJson = JSON.parse(stdout.trim());
    console.log(`✅ Direct Python loader succeeded! Exit code 0.`);
    console.log(`   Document ID: ${directJson.documentId}`);
    console.log(`   File Name: ${directJson.fileName}`);
    console.log(`   Total Pages: ${directJson.totalPages}`);
    console.log(`   Full text length: ${directJson.fullText?.length} chars`);
    console.log(`   Tables extracted: ${directJson.pages[0]?.tables?.length || 0}`);
    results.test2_direct_python = "SUCCESS";
  } catch (err) {
    console.error(`❌ Direct Python loader failed: ${err.message}`);
    results.test2_direct_python = `FAILED: ${err.message}`;
  }

  // ====================================================================
  // TEST 1 — Node DocumentLoader Service
  // ====================================================================
  console.log("\n--- TEST 1: NODE DOCUMENTLOADER SERVICE ---");
  let loadedDoc = null;
  try {
    loadedDoc = await loadDocument(docxPath, "Risk Analysis Explained Simply.docx");
    const charCount = loadedDoc.fullText.length;
    const wordCount = loadedDoc.fullText.split(/\s+/).length;
    console.log(`✅ Node loadDocument succeeded!`);
    console.log(`   Pages: ${loadedDoc.pages.length}`);
    console.log(`   Total Characters: ${charCount}`);
    console.log(`   Total Words: ${wordCount}`);
    console.log(`   Tables: ${loadedDoc.pages[0]?.tables?.length || 0}`);
    console.log(`   Quality valid: ${isUsableDocumentText(loadedDoc.fullText)}`);
    console.log(`   Snippet: "${loadedDoc.fullText.slice(0, 150).replace(/\n/g, " ")}..."`);
    results.test1_node_loader = {
      status: "SUCCESS",
      chars: charCount,
      words: wordCount,
      tables: loadedDoc.pages[0]?.tables?.length || 0,
    };
  } catch (err) {
    console.error(`❌ Node loadDocument failed: ${err.message}`);
    results.test1_node_loader = `FAILED: ${err.message}`;
  }

  // ====================================================================
  // TEST 3 & 4 — FastAPI Embedding Endpoint & Node Client
  // ====================================================================
  console.log("\n--- TEST 3 & 4: FASTAPI EMBEDDING CONNECTION & REAL 384D VECTORS ---");
  const aiUrl = (process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  console.log(`[CONFIG] AI_SERVICE_URL = ${aiUrl}`);

  try {
    // Direct HTTP fetch
    console.log(`[HTTP] Testing POST ${aiUrl}/api/ai/embed-query...`);
    const directRes = await fetch(`${aiUrl}/api/ai/embed-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "DOCUMIND test" }),
    });
    const directData = await directRes.json();
    console.log(`[HTTP] Response status: ${directRes.status}`);
    console.log(`   model: ${directData.model}`);
    console.log(`   dimension: ${directData.dimension}`);
    console.log(`   vector length: ${directData.embedding?.length}`);
    if (directRes.status === 200 && directData.embedding?.length === 384) {
      console.log(`✅ Direct FastAPI embedding test passed (384 dimensions).`);
      results.test3_direct_embedding = "SUCCESS (dim=384)";
    } else {
      results.test3_direct_embedding = `FAILED: status=${directRes.status}`;
    }

    // Node embeddingService.createEmbedding
    console.log(`\n[SERVICE] Testing embeddingService.createEmbedding("DOCUMIND embedding test")...`);
    const queryVector = await createEmbedding("DOCUMIND embedding test");
    console.log(`✅ Node createEmbedding succeeded! Vector length = ${queryVector.length}`);
    results.test4_node_embedding = `SUCCESS (len=${queryVector.length})`;
  } catch (err) {
    console.error(`❌ Embedding test failed: ${err.message}`);
    results.test3_direct_embedding = `FAILED: ${err.message}`;
    results.test4_node_embedding = `FAILED: ${err.message}`;
  }

  // ====================================================================
  // TEST 10 — Multilingual Unicode Document Loading
  // ====================================================================
  console.log("\n--- TEST 10: UNICODE LANGUAGES TEXT QUALITY & ENCODING ---");
  const multilingualSample = `
  # DOCUMIND Multi-Lingual Risk Analysis
  
  English: Risk management is the identification, evaluation, and prioritization of risks.
  Urdu: رسک مینجمنٹ خطرات کی نشاندہی، تشخیص اور ترجیح کا عمل ہے۔
  Chinese: 风险管理是识别、评估和优先处理风险的过程。
  Arabic: إدارة المخاطر هي تحديد وتقييم وتحديد أولويات المخاطر.
  Cyrillic: Управление рисками — это процесс идентификации и оценки рисков (Ѷ ѣ).
  Math & Symbols: Risk Score = P(E) × Severity ≥ 0.95 ± 0.02.
  `;
  const isMultiUsable = isUsableDocumentText(multilingualSample);
  const multiQuality = validateTextQuality(multilingualSample);
  console.log(`[UNICODE TEST] Usable: ${isMultiUsable}, Score: ${multiQuality.score}, Reason: ${multiQuality.reason}`);
  if (isMultiUsable) {
    console.log(`✅ Multilingual Unicode text validation PASSED.`);
    results.test10_unicode = "SUCCESS";
  } else {
    console.warn(`⚠️ Multilingual Unicode validation failed: ${multiQuality.reason}`);
    results.test10_unicode = `FAILED: ${multiQuality.reason}`;
  }

  // ====================================================================
  // TEST 5, 6, 7, 8 — Full Chunking, Indexing, Retrieval, and RAG
  // ====================================================================
  console.log("\n--- TEST 5-8: CHUNKING, QDRANT INDEXING, RETRIEVAL, AND RAG ---");
  let mongoConnected = false;
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/document-ai";
    await mongoose.connect(mongoUri);
    mongoConnected = true;
    console.log(`[MONGO] Connected to ${mongoUri}`);
  } catch (mErr) {
    console.warn(`[MONGO] Connect warning: ${mErr.message}`);
  }

  if (loadedDoc && loadedDoc.pages && loadedDoc.pages.length > 0) {
    // Find or create document in MongoDB
    let testDoc = await Document.findOne({
      $or: [
        { name: /Risk Analysis/i },
        { originalName: /Risk Analysis/i },
      ],
    });

    const targetDocId = testDoc ? String(testDoc._id) : "6a9905b55a0ab7b95f192b9e";
    const targetUserId = testDoc?.owner ? String(testDoc.owner) : "6a99057f5a0ab7b95f192b90";

    console.log(`[DOCUMENT] Target Document ID: ${targetDocId}, User ID: ${targetUserId}`);

    // Chunking
    const chunks = chunkDocument({
      pages: loadedDoc.pages,
      documentId: targetDocId,
      fileName: "Risk Analysis Explained Simply.docx",
      chunkSizeTokens: 400,
      overlapTokens: 60,
    });
    console.log(`[CHUNKS] Generated ${chunks.length} chunks from DOCX.`);
    results.chunk_count = chunks.length;

    // Delete stale vectors for THIS document
    console.log(`[QDRANT] Cleaning stale vectors for document ${targetDocId}...`);
    await deleteDocumentVectors(targetDocId, targetUserId);

    // Generate real MiniLM embeddings for all chunks
    console.log(`[EMBEDDING] Generating embeddings for ${chunks.length} chunks...`);
    const chunkTexts = chunks.map((c) => c.text);
    const chunkEmbeddings = await createEmbeddings(chunkTexts);
    console.log(`[EMBEDDING] Generated ${chunkEmbeddings.length} vectors of dim=${chunkEmbeddings[0]?.length}`);

    // Store in Qdrant
    console.log(`[QDRANT] Upserting vectors into Qdrant...`);
    const points = await storeDocumentChunks({
      documentId: targetDocId,
      userId: targetUserId,
      filename: "Risk Analysis Explained Simply.docx",
      chunks,
      embeddings: chunkEmbeddings,
    });
    console.log(`✅ TEST 5: Successfully indexed ${points.length} vectors into Qdrant.`);
    results.test5_indexing = `SUCCESS (${points.length} vectors)`;

    // Update MongoDB document if connected
    if (mongoConnected && testDoc) {
      await Document.findByIdAndUpdate(targetDocId, {
        status: "ready",
        processingStep: "08 Ready",
        chunks,
        chunksCount: chunks.length,
        errorMessage: "",
        error_message: "",
      });
      console.log(`[MONGO] Updated document status to 'ready'.`);
    }

    // TEST 6: Qdrant Dense Retrieval
    console.log("\n[TEST 6] Testing Dense Retrieval on DOCX...");
    const sampleQuery = "What is risk analysis and risk management?";
    const queryVec = await createEmbedding(sampleQuery);
    const denseHits = await searchSimilarChunks({
      embedding: queryVec,
      documentId: targetDocId,
      userId: targetUserId,
      limit: 5,
    });
    console.log(`[DENSE SEARCH] Retrieved ${denseHits.length} points.`);
    if (denseHits.length > 0) {
      console.log(`✅ TEST 6: Dense retrieval succeeded! Top score: ${denseHits[0]?.score || "N/A"}`);
      console.log(`   Snippet: "${(denseHits[0]?.payload?.text || "").slice(0, 120)}..."`);
      results.test6_dense = `SUCCESS (${denseHits.length} hits)`;
    } else {
      console.warn(`⚠️ Dense search returned 0 results.`);
      results.test6_dense = "0 hits";
    }

    // TEST 7: Hybrid Retrieval
    console.log("\n[TEST 7] Testing Hybrid Retrieval on DOCX...");
    const hybridHits = await performHybridSearch({
      query: sampleQuery,
      documentId: targetDocId,
      userId: targetUserId,
      limit: 5,
    });
    console.log(`[HYBRID SEARCH] Retrieved ${hybridHits.length} fused points.`);
    if (hybridHits.length > 0) {
      console.log(`✅ TEST 7: Hybrid retrieval succeeded! Top score: ${hybridHits[0]?.score}`);
      console.log(`   Source: ${hybridHits[0]?.documentName} (Page ${hybridHits[0]?.pageNumber})`);
      results.test7_hybrid = `SUCCESS (${hybridHits.length} hits)`;
    } else {
      results.test7_hybrid = "0 hits";
    }

    // TEST 8: RAG Grounded Answer via OpenRouter
    console.log("\n[TEST 8] Testing RAG Answer Generation...");
    try {
      const ragResponse = await askDocument({
        question: "Explain the main steps of risk analysis according to this document.",
        documentId: targetDocId,
        userId: targetUserId,
      });
      console.log(`✅ TEST 8: RAG generation succeeded!`);
      console.log(`   Answer snippet: "${ragResponse.answer?.slice(0, 200)}..."`);
      console.log(`   Sources attached: ${ragResponse.sources?.length}`);
      results.test8_rag = `SUCCESS (${ragResponse.sources?.length} sources)`;
    } catch (rErr) {
      console.error(`❌ RAG generation error: ${rErr.message}`);
      results.test8_rag = `FAILED: ${rErr.message}`;
    }
  }

  // ====================================================================
  // TEST 9 — PDF Regression Test
  // ====================================================================
  console.log("\n--- TEST 9: PDF REGRESSION TEST (irshadprpsel.pdf) ---");
  const pdfCandidates = [
    "C:\\Users\\PMLS\\Desktop\\irshad_Research_Proposal (2).pdf",
    path.join(__dirname, "../uploads/file-1788445837974-221827372.pdf"),
    path.join(__dirname, "../uploads/file-1787141765553-838386720.pdf"),
  ];
  const pdfPath = pdfCandidates.find((p) => fs.existsSync(p));
  if (pdfPath) {
    try {
      const loadedPdf = await loadDocument(pdfPath);
      console.log(`✅ PDF loader succeeded! Pages: ${loadedPdf.pages.length}, Chars: ${loadedPdf.fullText.length}`);
      results.test9_pdf_regression = `SUCCESS (${loadedPdf.pages.length} pages)`;
    } catch (pErr) {
      console.warn(`⚠️ PDF regression warning: ${pErr.message}`);
      results.test9_pdf_regression = `WARNING: ${pErr.message}`;
    }
  } else {
    console.log(`ℹ️ Test proposal PDF not found on disk at checked locations; skipping PDF load.`);
    results.test9_pdf_regression = "SKIPPED (PDF path not found)";
  }

  // Close Mongo
  if (mongoConnected) {
    await mongoose.disconnect();
  }

  console.log("\n======================================================================");
  console.log("TEST SUMMARY RESULTS");
  console.log("======================================================================");
  console.log(JSON.stringify(results, null, 2));
}

runTests().catch((e) => {
  console.error("Test runner encountered an error:", e);
  process.exit(1);
});
