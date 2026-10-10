const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { execSync } = require('child_process');

const Document = require('../models/Document');
const { createEmbedding, createEmbeddings } = require('../services/embeddingService');
const { processDocument } = require('../services/documentPipelineService');
const { askDocument } = require('../services/ragService');
const { initializeCollection } = require('../services/vectorService');

async function main() {
  console.log('============================================================');
  console.log('DOCUMIND-AI VERIFICATION: FASTAPI, EMBEDDINGS, REPROCESS, RAG');
  console.log('============================================================\n');

  const report = {};

  // 1. Python Interpreter & MiniLM Direct Test
  console.log('--- 1. VERIFY MINILM DIRECTLY ---');
  const pythonPath = 'C:\\Users\\PMLS\\Desktop\\DOCUMIND-AI\\.venv\\Scripts\\python.exe';
  report.pythonInterpreter = pythonPath;

  try {
    const pyInterp = execSync(`"${pythonPath}" -c "import sys; print(sys.executable)"`, { encoding: 'utf8' }).trim();
    console.log(`[PYTHON] sys.executable: ${pyInterp}`);

    const miniLmTest = execSync(
      `"${pythonPath}" -c "from sentence_transformers import SentenceTransformer; m=SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); v=m.encode(['DOCUMIND test']); print(v.shape)"`,
      { encoding: 'utf8' }
    ).trim();
    console.log(`[MINILM] Output: ${miniLmTest}`);
    report.miniLmShape = miniLmTest;
  } catch (err) {
    console.error(`[PYTHON/MINILM ERROR] ${err.message}`);
    report.miniLmShape = `FAILED: ${err.message}`;
  }

  // 2. FastAPI Connectivity
  console.log('\n--- 2. VERIFY FASTAPI CONNECTIVITY ---');
  const aiUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  report.aiServiceUrl = aiUrl;
  console.log(`[CONFIG] AI_SERVICE_URL: ${aiUrl}`);

  try {
    const docsRes = await fetch(`${aiUrl}/docs`);
    console.log(`[FASTAPI] GET /docs status: ${docsRes.status}`);
    report.docsStatus = docsRes.status;

    const healthRes = await fetch(`${aiUrl}/health`);
    const healthData = await healthRes.json();
    console.log(`[FASTAPI] GET /health:`, JSON.stringify(healthData));
    report.healthData = healthData;
  } catch (err) {
    console.error(`[FASTAPI CONNECTIVITY ERROR] ${err.message}`);
    report.docsStatus = `FAILED: ${err.message}`;
  }

  // 3. Test Embedding Endpoint Directly
  console.log('\n--- 3. TEST EMBEDDING ENDPOINT DIRECTLY ---');
  report.fastApiEndpoint = `${aiUrl}/api/ai/embed-query`;
  report.requestSchema = '{ text: "..." }';
  report.responseSchema = '{ embedding: [...], dimension: 384, model: "..." }';

  try {
    const embedRes = await fetch(`${aiUrl}/api/ai/embed-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'DOCUMIND test' }),
    });
    const embedData = await embedRes.json();
    console.log(`[EMBED-QUERY] status: ${embedRes.status}, dim: ${embedData.dimension}, vector_length: ${embedData.embedding?.length}`);
    report.directEmbeddingTest = {
      status: embedRes.status,
      dimension: embedData.dimension,
      vectorLength: embedData.embedding?.length,
    };
  } catch (err) {
    console.error(`[EMBED-QUERY ERROR] ${err.message}`);
    report.directEmbeddingTest = `FAILED: ${err.message}`;
  }

  // 4. Backend-to-AI Client Test
  console.log('\n--- 4. TEST BACKEND EMBEDDING SERVICE ---');
  try {
    const qVec = await createEmbedding('DOCUMIND query test');
    const batchVecs = await createEmbeddings(['Chunk 1 test', 'Chunk 2 test']);
    console.log(`[BACKEND EMBEDDING] query_dim: ${qVec.length}, batch_count: ${batchVecs.length}`);
    report.backendToAiTest = {
      queryDim: qVec.length,
      batchCount: batchVecs.length,
      batchDims: batchVecs.map((v) => v.length),
    };
  } catch (err) {
    console.error(`[BACKEND EMBEDDING ERROR] ${err.message}`);
    report.backendToAiTest = `FAILED: ${err.message}`;
  }

  // 5. Connect Mongo & Find Informal Reports Document
  console.log('\n--- 5. LOCATE AND REPROCESS INFORMAL REPORTS .DOCX ---');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai';
  await mongoose.connect(mongoUri);

  const doc = await Document.findOne({
    $or: [
      { name: /informal.*report/i },
      { originalName: /informal.*report/i },
      { storedFilename: /file-1788930823964-432691001/ },
      { filePath: /file-1788930823964-432691001/ },
    ],
  });

  if (!doc) {
    console.error('❌ Document "Informal Reports" not found in MongoDB!');
    report.documentFound = false;
  } else {
    console.log(`[FOUND DOCUMENT] ID: ${doc._id}, Name: "${doc.name}", Status: ${doc.status}, Error: "${doc.errorMessage || 'none'}"`);
    report.documentId = String(doc._id);
    report.initialStatus = doc.status;

    // Reprocess document
    console.log(`[REPROCESS] Running processDocument(${doc._id})...`);
    await processDocument(doc._id);

    const updatedDoc = await Document.findById(doc._id);
    console.log(`[AFTER REPROCESS] status: ${updatedDoc.status}, chunks: ${updatedDoc.chunksCount}, vectors: ${updatedDoc.vectorsCount}`);
    report.documentChunkCount = updatedDoc.chunksCount;
    report.vectorsGenerated = updatedDoc.chunksCount;
    report.vectorsIndexed = updatedDoc.vectorsCount;
    report.finalDocumentStatus = updatedDoc.status;
    report.clearedErrors = !updatedDoc.errorMessage && !updatedDoc.error_message;

    // 6. Test Exact Question 1
    console.log('\n--- 6. TEST EXACT QUESTION 1 ---');
    const q1 = 'What is the purpose of the introduction in an informal report?';
    console.log(`[QUESTION 1] "${q1}"`);
    const res1 = await askDocument({
      question: q1,
      documentId: String(doc._id),
      userId: String(doc.owner),
    });
    console.log(`[ANSWER 1]\n${res1.answer}\n`);
    console.log(`[SOURCES 1 count: ${res1.sources?.length}]`);
    report.firstRagQuestion = {
      question: q1,
      sourcesCount: res1.sources?.length,
      answer: res1.answer,
    };

    // 7. Test Exact Question 2
    console.log('\n--- 7. TEST EXACT QUESTION 2 ---');
    const q2 = 'What are the main parts of an informal report?';
    console.log(`[QUESTION 2] "${q2}"`);
    const res2 = await askDocument({
      question: q2,
      documentId: String(doc._id),
      userId: String(doc.owner),
    });
    console.log(`[ANSWER 2]\n${res2.answer}\n`);
    console.log(`[SOURCES 2 count: ${res2.sources?.length}]`);
    report.secondRagQuestion = {
      question: q2,
      sourcesCount: res2.sources?.length,
      answer: res2.answer,
    };
  }

  await mongoose.disconnect();

  console.log('\n============================================================');
  console.log('FINAL EXECUTION REPORT');
  console.log('============================================================');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
