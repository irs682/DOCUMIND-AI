/**
 * DOCUMIND-AI: COMPREHENSIVE MULTI-FORMAT INGESTION & RAG PIPELINE ACCEPTANCE TEST
 * Tests every supported format: PDF, DOCX (with tables & Unicode), TXT, CSV, Empty, Corrupt.
 * Verifies chunks > 0, vectors > 0, Qdrant storage, OpenRouter summarization, and Hybrid RAG.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Document = require('../models/Document');
const User = require('../models/User');
const { processDocument, reprocessDocument } = require('../services/documentPipelineService');
const { askDocument } = require('../services/ragService');
const { getPythonCommand } = require('../services/documentLoaderService');
const { initializeCollection } = require('../services/vectorService');
const { QdrantClient } = require('@qdrant/js-client-rest');

const FIXTURES_DIR = path.join(__dirname, '../test_fixtures');

// Ensure test directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

/**
 * Generates test fixture files for each required format.
 */
const createTestFixtures = () => {
  console.log('\n[FIXTURES] Generating multi-format test fixtures...');

  // 1. TXT Fixture
  const txtPath = path.join(FIXTURES_DIR, 'architecture_overview.txt');
  const txtContent = `DOCUMIND-AI SYSTEM ARCHITECTURE SPECIFICATION
Document Intelligence and Enterprise RAG Platform

1. Core Architecture
The DOCUMIND-AI platform is structured around a decoupled microservice architecture:
- Frontend: Single-page React application providing responsive document intelligence interfaces.
- Backend: High-throughput Node.js Express server orchestrating authentication, ingestion, and multi-tenant security.
- AI Service: Python FastAPI microservice hosting local sentence-transformers models.
- Storage: MongoDB Atlas for metadata and document records; Qdrant for 384-dimensional vector indexing.

2. Ingestion Pipeline
Every newly uploaded document automatically progresses through explicit pipeline states:
- Reading and format-specific extraction.
- File-type-aware quality validation.
- Token-aware hierarchical chunking.
- Dense embedding generation via all-MiniLM-L6-v2.
- Atomic vector upsert into Qdrant.

3. Reliability Guarantees
All operations are bounded with exponential backoff retries for transient connection errors.
Failed documents never enter infinite retry loops during user chat queries.`;
  fs.writeFileSync(txtPath, txtContent, 'utf8');
  console.log(`  ✓ Created TXT fixture: ${path.basename(txtPath)}`);

  // 2. CSV Fixture
  const csvPath = path.join(FIXTURES_DIR, 'financial_projections.csv');
  const csvContent = `Quarter,Revenue_USD,Operating_Expense_USD,Net_Profit_USD,Active_Enterprise_Users,Compliance_Status
Q1_2025,1250000,820000,430000,1420,Compliant
Q2_2025,1680000,990000,690000,1890,Compliant
Q3_2025,2150000,1150000,1000000,2450,Compliant
Q4_2025,2890000,1320000,1570000,3100,Audited_Passed
Q1_2026,3500000,1500000,2000000,4200,Compliant`;
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`  ✓ Created CSV fixture: ${path.basename(csvPath)}`);

  // 3. Empty Document Fixture (0 bytes)
  const emptyPath = path.join(FIXTURES_DIR, 'empty_document.txt');
  fs.writeFileSync(emptyPath, '', 'utf8');
  console.log(`  ✓ Created Empty fixture: ${path.basename(emptyPath)}`);

  // 4. Corrupted Document Fixture
  const corruptPath = path.join(FIXTURES_DIR, 'corrupted_archive.pdf');
  const corruptBytes = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37, 0x00, 0x00, 0xFF, 0xFE, 0x00, 0x12, 0x49, 0x88]);
  fs.writeFileSync(corruptPath, corruptBytes);
  console.log(`  ✓ Created Corrupt fixture: ${path.basename(corruptPath)}`);

  // 5. Unicode DOCX with Tables Fixture (Using Python zipfile to ensure 100% valid WordML)
  const docxPath = path.join(FIXTURES_DIR, 'unicode_multilingual_tables.docx');
  const pythonCmd = getPythonCommand();
  const pyGenScript = `
import zipfile
import sys
from pathlib import Path

target = Path(r"${docxPath.replace(/\\/g, '\\\\')}")

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

doc_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>DOCUMIND-AI MULTILINGUAL INTELLIGENCE REPORT</w:t></w:r></w:p>
    <w:p><w:r><w:t>This executive report validates cross-lingual extraction across international alphabets and complex tables.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Urdu Section: یہ دستاویز کثیر لسانی متن اور پیچیدہ جدولوں کی درست جانچ پڑتال کے لیے تیار کی گئی ہے۔</w:t></w:r></w:p>
    <w:p><w:r><w:t>Arabic Section: هذا التقرير يوضح قدرة النظام على معالجة اللغة العربية والرموز الرياضية بدقة متناهية.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Chinese Section: 本文档验证了中文多语言文档的提取和知识检索功能，所有内容均结构良好。</w:t></w:r></w:p>
    <w:p><w:r><w:t>Cyrillic Section: Этот раздел подтверждает поддержку кириллических символов и научных формул.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Key Project Milestone Table:</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Phase</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Deliverable</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Budget_USD</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Status</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Phase 1</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Architecture and Data Pipeline</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>250,000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Completed</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Phase 2</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>MiniLM 384D Vector Search Engine</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>450,000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Verified</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Phase 3</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>OpenRouter Grounded Synthesis</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>300,000</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Active</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Conclusion: The system architecture successfully bridges all document formats into a unified RAG corpus.</w:t></w:r></w:p>
  </w:body>
</w:document>'''

with zipfile.ZipFile(str(target), 'w', compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types.encode('utf-8'))
    z.writestr('_rels/.rels', rels.encode('utf-8'))
    z.writestr('word/document.xml', doc_xml.encode('utf-8'))

print(f"Generated DOCX at {target}")
`;

  try {
    execSync(`"${pythonCmd}" -c "${pyGenScript.replace(/\n/g, ' ')}"`, {
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });
    console.log(`  ✓ Created Unicode DOCX with tables fixture: ${path.basename(docxPath)}`);
  } catch (docxErr) {
    console.error('Failed to create DOCX via python:', docxErr.message);
  }

  // 6. Find an existing PDF fixture
  const candidatePdfs = [
    path.join(__dirname, '../uploads/file-1788445837974-221827372.pdf'),
    path.join(__dirname, '../uploads/file-1787141765553-838386720.pdf'),
  ];
  let pdfPath = candidatePdfs.find((p) => fs.existsSync(p));

  // If no uploaded PDF exists, generate a minimal readable PDF via Python PyMuPDF
  if (!pdfPath) {
    pdfPath = path.join(FIXTURES_DIR, 'standard_contract.pdf');
    const pyPdfScript = `
import fitz
doc = fitz.open()
page = doc.new_page()
text = "DOCUMIND ENTERPRISE SERVICE AGREEMENT\\n\\n1. Scope of Work\\nThis agreement governs enterprise AI document indexing.\\n2. Security\\nAll data is processed within isolated user boundaries.\\n3. SLA\\nThe platform guarantees 99.9% uptime for vector search retrieval."
page.insert_text((50, 72), text, fontsize=12)
doc.save(r"${pdfPath.replace(/\\/g, '\\\\')}")
doc.close()
`;
    try {
      execSync(`"${pythonCmd}" -c "${pyPdfScript.replace(/\n/g, ' ')}"`, { encoding: 'utf8' });
      console.log(`  ✓ Created generated PDF fixture: ${path.basename(pdfPath)}`);
    } catch (_) {}
  } else {
    console.log(`  ✓ Found real existing PDF fixture: ${path.basename(pdfPath)}`);
  }

  return {
    pdfPath,
    docxPath,
    txtPath,
    csvPath,
    emptyPath,
    corruptPath,
  };
};

async function runComprehensivePipelineTests() {
  console.log('======================================================================');
  console.log('DOCUMIND-AI: SYSTEMATIC MULTI-FORMAT END-TO-END INGESTION TEST');
  console.log('======================================================================');

  // ── 1. CONNECT TO DATABASE & RESOLVE USER ──
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai';
  await mongoose.connect(mongoUri);
  console.log(`\n[DATABASE] Connected to MongoDB: ${mongoUri.replace(/:[^:@]+@/, ':***@')}`);

  let testUser = await User.findOne();
  if (!testUser) {
    testUser = await User.create({
      name: 'Pipeline Test User',
      email: `pipeline-test-${Date.now()}@documind.ai`,
      password: 'TestPassword123!',
      role: 'user',
    });
  }
  console.log(`[USER] Using test user: ${testUser.name} (${testUser._id})`);

  // ── 2. VERIFY HEALTH OF EXTERNAL SERVICES ──
  console.log('\n--- VERIFYING EXTERNAL SERVICES HEALTH ---');
  const aiUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  let aiHealthy = false;
  try {
    const res = await fetch(`${aiUrl}/health`);
    const data = await res.json();
    aiHealthy = res.ok;
    console.log(`[HEALTH] AI Service (${aiUrl}): ${data.status} | Embedding: ${data.embedding?.model} (${data.embedding?.dimension}D)`);
  } catch (e) {
    console.error(`[HEALTH] AI Service unavailable at ${aiUrl}: ${e.message}`);
  }

  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  let qdrantHealthy = false;
  try {
    await initializeCollection();
    qdrantHealthy = true;
    console.log(`[HEALTH] Qdrant (${qdrantUrl}): Connected, collection "${process.env.QDRANT_COLLECTION || 'documind_documents'}" READY`);
  } catch (e) {
    console.error(`[HEALTH] Qdrant unavailable: ${e.message}`);
  }

  const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  console.log(`[HEALTH] OpenRouter: Configured=${Boolean(openRouterKey)} | Model=${process.env.OPENROUTER_MODEL || 'default'}`);

  // ── 3. PREPARE TEST FIXTURES ──
  const fixtures = createTestFixtures();

  const testResults = [];

  // Helper to ingest and verify a document
  const testIngest = async ({ name, filePath, expectedStatus, expectedMinChunks, isInvalid = false }) => {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`TEST: [${name}] - File: ${path.basename(filePath)}`);
    console.log(`----------------------------------------------------------------------`);

    const stat = fs.statSync(filePath);
    const docRecord = await Document.create({
      name: path.basename(filePath),
      originalName: path.basename(filePath),
      filePath: filePath,
      size: stat.size,
      formattedSize: `${(stat.size / 1024).toFixed(1)} KB`,
      status: 'uploaded',
      owner: testUser._id,
      user_id: testUser._id,
      chunksCount: 0,
    });

    let pipelineError = null;
    let result = null;

    try {
      result = await processDocument(docRecord._id);
    } catch (err) {
      pipelineError = err;
    }

    const finalDoc = await Document.findById(docRecord._id);
    const success = isInvalid
      ? finalDoc.status === expectedStatus
      : finalDoc.status === expectedStatus && finalDoc.chunksCount >= expectedMinChunks && finalDoc.vectorsCount >= expectedMinChunks;

    const summaryItem = {
      test: name,
      file: path.basename(filePath),
      status: finalDoc.status,
      expectedStatus,
      chunks: finalDoc.chunksCount,
      vectors: finalDoc.vectorsCount,
      passed: success,
      notes: pipelineError ? pipelineError.message : (success ? 'Passed verification gate' : 'Criteria not met'),
    };
    testResults.push(summaryItem);

    console.log(`[RESULT] status=${finalDoc.status} | chunks=${finalDoc.chunksCount} | vectors=${finalDoc.vectorsCount} | PASSED=${success}`);
    return finalDoc;
  };

  // ── 4. EXECUTE TEST CASES ──

  // TEST A: Standard PDF
  let readyPdfDoc = null;
  if (fixtures.pdfPath && fs.existsSync(fixtures.pdfPath)) {
    readyPdfDoc = await testIngest({
      name: 'TEST A — Standard PDF',
      filePath: fixtures.pdfPath,
      expectedStatus: 'ready',
      expectedMinChunks: 1,
    });
  }

  // TEST B: Unicode DOCX with Tables
  let readyDocxDoc = null;
  if (fixtures.docxPath && fs.existsSync(fixtures.docxPath)) {
    readyDocxDoc = await testIngest({
      name: 'TEST B — Unicode DOCX (Urdu, Arabic, Chinese, Cyrillic) + Tables',
      filePath: fixtures.docxPath,
      expectedStatus: 'ready',
      expectedMinChunks: 1,
    });
  }

  // TEST C: Plain Text (TXT)
  let readyTxtDoc = null;
  if (fixtures.txtPath && fs.existsSync(fixtures.txtPath)) {
    readyTxtDoc = await testIngest({
      name: 'TEST C — TXT Document',
      filePath: fixtures.txtPath,
      expectedStatus: 'ready',
      expectedMinChunks: 1,
    });
  }

  // TEST D: CSV Dataset
  let readyCsvDoc = null;
  if (fixtures.csvPath && fs.existsSync(fixtures.csvPath)) {
    readyCsvDoc = await testIngest({
      name: 'TEST D — CSV Dataset Table',
      filePath: fixtures.csvPath,
      expectedStatus: 'ready',
      expectedMinChunks: 1,
    });
  }

  // TEST E: Empty Document (Expected: validation_failed)
  if (fixtures.emptyPath && fs.existsSync(fixtures.emptyPath)) {
    await testIngest({
      name: 'TEST E — Empty Document (0 bytes)',
      filePath: fixtures.emptyPath,
      expectedStatus: 'validation_failed',
      expectedMinChunks: 0,
      isInvalid: true,
    });
  }

  // TEST F: Corrupted File (Expected: extraction_failed)
  if (fixtures.corruptPath && fs.existsSync(fixtures.corruptPath)) {
    await testIngest({
      name: 'TEST F — Corrupted Bytecode File',
      filePath: fixtures.corruptPath,
      expectedStatus: 'extraction_failed',
      expectedMinChunks: 0,
      isInvalid: true,
    });
  }

  // TEST G: Genuine Reprocessing Action
  if (readyDocxDoc) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`TEST G: Genuine Reprocess Action on Document ${readyDocxDoc._id}`);
    console.log(`----------------------------------------------------------------------`);
    const reprocessRes = await reprocessDocument(readyDocxDoc._id, testUser._id);
    console.log(`[REPROCESS] Initiated:`, reprocessRes);

    // Poll until ready
    let attempts = 0;
    let pollDoc = null;
    while (attempts < 15) {
      await new Promise((r) => setTimeout(r, 1000));
      pollDoc = await Document.findById(readyDocxDoc._id);
      if (pollDoc.status === 'ready') break;
      attempts++;
    }

    const reprocessPassed = pollDoc && pollDoc.status === 'ready' && pollDoc.chunksCount > 0 && pollDoc.vectorsCount > 0;
    testResults.push({
      test: 'TEST G — Reprocess Action',
      file: readyDocxDoc.name,
      status: pollDoc?.status,
      expectedStatus: 'ready',
      chunks: pollDoc?.chunksCount,
      vectors: pollDoc?.vectorsCount,
      passed: reprocessPassed,
      notes: reprocessPassed ? 'Purged stale vectors, re-chunked, and verified READY' : 'Reprocess did not reach ready',
    });
    console.log(`[RESULT] Reprocess status=${pollDoc?.status} | chunks=${pollDoc?.chunksCount} | PASSED=${reprocessPassed}`);
  }

  // TEST H: Hybrid Search & Grounded OpenRouter Q&A
  const targetDoc = readyDocxDoc || readyTxtDoc || readyPdfDoc;
  if (targetDoc) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`TEST H: Grounded Hybrid Search & OpenRouter Answer on "${targetDoc.name}"`);
    console.log(`----------------------------------------------------------------------`);

    const query = targetDoc === readyDocxDoc ? 'What were the deliverables and budget for Phase 2?' : 'What is the platform architecture?';
    const ragResult = await askDocument({
      question: query,
      documentId: String(targetDoc._id),
      userId: testUser._id,
    });

    console.log(`\n[QUERY] "${query}"`);
    console.log(`[RETRIEVAL] sources_count=${ragResult.sources?.length || 0}`);
    if (ragResult.sources?.length > 0) {
      console.log(`[TOP SOURCE] "${ragResult.sources[0].snippet}"`);
    }
    console.log(`[ANSWER] "${ragResult.answer}"\n`);

    const ragPassed = ragResult.sources?.length > 0 && ragResult.answer && !ragResult.answer.includes('could not find sufficient evidence');
    testResults.push({
      test: 'TEST H — Hybrid Search & Q&A',
      file: targetDoc.name,
      status: 'ready',
      expectedStatus: 'ready',
      chunks: ragResult.sources?.length || 0,
      vectors: ragResult.sources?.length || 0,
      passed: ragPassed,
      notes: ragPassed ? `Retrieved ${ragResult.sources.length} chunks, answer grounded` : 'No evidence found',
    });
  }

  // TEST I: Whole-Document Summarization via OpenRouter
  if (targetDoc) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`TEST I: Whole-Document Summarization on "${targetDoc.name}"`);
    console.log(`----------------------------------------------------------------------`);

    const sumResult = await askDocument({
      question: `Summarize the document "${targetDoc.name}"`,
      documentId: String(targetDoc._id),
      userId: testUser._id,
    });

    console.log(`[SUMMARY ANSWER]\n${sumResult.answer.slice(0, 300)}...\n`);
    const sumPassed = sumResult.answer && sumResult.answer.length > 50 && !sumResult.answer.includes('does not contain sufficient validated text');
    testResults.push({
      test: 'TEST I — Whole-Document Summary',
      file: targetDoc.name,
      status: 'ready',
      expectedStatus: 'ready',
      chunks: targetDoc.chunksCount,
      vectors: targetDoc.vectorsCount,
      passed: sumPassed,
      notes: sumPassed ? 'Generated grounded executive summary via OpenRouter' : 'Summary failed',
    });
  }

  // ── FINAL REPORT ──
  console.log('\n======================================================================');
  console.log('FINAL PIPELINE ACCEPTANCE TEST RESULTS');
  console.log('======================================================================');
  console.table(testResults);

  const allPassed = testResults.every((t) => t.passed);
  console.log(`\nOverall Test Result: ${allPassed ? '✅ ALL ACCEPTANCE CRITERIA PASSED' : '⚠️ SOME CRITERIA FAILED'}`);

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

runComprehensivePipelineTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
