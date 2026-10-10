const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Document = require("../models/Document");
const { extractDetailedPDF, extractTextFromPDF } = require("../services/pdfService");
const { chunkDocument } = require("../services/chunkService");
const { isUsableDocumentText, validateTextQuality } = require("../services/textQualityService");
const { processDocument, askDocument } = require("../services/ragService");
const { executeCompletion } = require("../services/llmService");

async function runEndToEndTest() {
  console.log("======================================================================");
  console.log("DOCUMIND-AI: PRIMARY END-TO-END ACCEPTANCE TEST ON RESEARCH PROPOSAL");
  console.log("======================================================================\n");

  // 1. Locate Proposal PDF
  const candidatePaths = [
    "C:\\Users\\PMLS\\Desktop\\irshad_Research_Proposal (2).pdf",
    path.join(__dirname, "../uploads/file-1788445837974-221827372.pdf"),
    path.join(__dirname, "../uploads/file-1787141765553-838386720.pdf"),
  ];

  let testPdf = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      testPdf = p;
      break;
    }
  }

  if (!testPdf) {
    console.error("❌ Test proposal PDF not found in expected locations!");
    process.exit(1);
  }

  const stat = fs.statSync(testPdf);
  console.log(`[TEST 1] PDF File: "${path.basename(testPdf)}" (${(stat.size / 1024).toFixed(1)} KB)`);

  // 2. Page-by-Page Extraction Test
  console.log("\n--- STAGE 1: HIGH-FIDELITY EXTRACTION & SECTION DETECTION ---");
  const detailed = await extractDetailedPDF(testPdf);
  console.log(`[PDF] total_pages=${detailed.totalPages}`);
  console.log(`[PDF] extracted_pages=${detailed.pages.length}`);

  if (detailed.pages.length !== 23) {
    console.warn(`⚠️ Expected 23 pages, extracted ${detailed.pages.length}`);
  } else {
    console.log(`✅ Extracted all 23 pages successfully.`);
  }

  // Quality Validation
  let hasBytecode = false;
  let totalChars = 0;
  const sectionsFound = new Set();

  detailed.pages.forEach((p) => {
    totalChars += p.text.length;
    sectionsFound.add(p.section);
    const q = validateTextQuality(p.text);
    if (!q.valid) {
      console.error(`❌ Page ${p.pageNumber} failed quality check: ${q.reason}`);
      hasBytecode = true;
    }
    if (p.text.includes("0000463602") || p.text.includes("endobj") || p.text.includes("xref")) {
      console.error(`❌ Page ${p.pageNumber} contains raw xref/bytecode!`);
      hasBytecode = true;
    }
  });

  if (!hasBytecode) {
    console.log(`✅ 100% of pages passed quality validation. ZERO bytecode detected.`);
  }

  console.log(`[PDF] total_characters=${totalChars}`);
  console.log(`[PDF] detected_sections:`, Array.from(sectionsFound).join(", "));

  // Check References section detection
  const refPages = detailed.pages.filter((p) => p.isReference);
  console.log(`[PDF] references_pages: ${refPages.map((p) => p.pageNumber).join(", ") || "None tagged"}`);

  // 3. Section-Aware Chunking Test
  console.log("\n--- STAGE 2: SECTION-AWARE CHUNKING ---");
  const chunks = chunkDocument({
    pages: detailed.pages,
    documentId: "test-proposal-doc",
    fileName: "irshad_Research_Proposal (2).pdf",
  });

  console.log(`[CHUNKING] total_chunks=${chunks.length}`);
  if (chunks.length <= 3) {
    console.error(`❌ CRITICAL: Produced only ${chunks.length} chunks!`);
  } else {
    console.log(`✅ Healthy chunk distribution: ${chunks.length} chunks generated (>> 3 chunks).`);
  }

  const refChunks = chunks.filter((c) => c.isReference);
  console.log(`[CHUNKING] reference_chunks_isolated=${refChunks.length}`);

  // 4. Database & Qdrant Upsert
  console.log("\n--- STAGE 3: MONGODB & QDRANT RE-INDEXING ---");
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/document-ai");
  console.log("[DATABASE] Connected to MongoDB");

  let doc = await Document.findOne({ name: /irshad/i });
  if (!doc) {
    doc = await Document.findOne();
  }

  if (doc) {
    console.log(`[DATABASE] Updating document record ${doc._id} ("${doc.name}")...`);
    await processDocument({
      documentId: doc._id,
      userId: doc.owner,
      filePath: testPdf,
      knowledgeBaseId: doc.knowledgeBaseId,
    });
    console.log(`✅ Document ${doc._id} reprocessed and indexed.`);
  }

  // 5. OpenRouter Provider Check
  console.log("\n--- STAGE 4: OPENROUTER LLM PROVIDER CHECK ---");
  const apiKey = (process.env.OPENROUTER_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  const apiKeySet = Boolean(apiKey && apiKey.startsWith("sk-or-"));
  console.log(`[LLM] provider=openrouter | model=${process.env.OPENROUTER_MODEL || "NOT_CONFIGURED"}`);
  console.log(`[LLM] apiKeyConfigured=${apiKeySet}`);

  // 6. Whole-Document Summarization Test
  console.log("\n--- STAGE 5: WHOLE-DOCUMENT HIERARCHICAL SUMMARIZATION ---");
  const summaryResult = await askDocument({
    question: "Summarize the main points in irshad_Research_Proposal (2).pdf",
    documentId: doc ? String(doc._id) : null,
    userId: doc ? doc.owner : null,
  });

  console.log("\n=================== GENERATED SUMMARY ===================");
  console.log(summaryResult.answer);
  console.log("=========================================================\n");

  console.log(`[SOURCES] Attached ${summaryResult.sources.length} sources with exact page numbers:`);
  summaryResult.sources.slice(0, 5).forEach((s, idx) => {
    console.log(`  #${idx + 1}: Page ${s.pageNumber} (${s.section}) | Match: ${(s.score * 100).toFixed(0)}%`);
    console.log(`      "${s.snippet}"`);
  });

  // Verification checks on summary
  const summaryText = summaryResult.answer;
  const hasSvgArtifact = summaryText.includes("svg") || summaryText.includes("svgCopy");
  const hasBytecodeSummary = summaryText.includes("0000") && summaryText.includes(" n");
  const mentionsMeraVla = /mera-vla/i.test(summaryText);

  console.log("\n--- QUALITY GATES VERIFICATION ---");
  console.log(`1. Zero SVG / svgCopy artifacts: ${!hasSvgArtifact ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`2. Zero PDF bytecode / xref tables: ${!hasBytecodeSummary ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`3. Mentions core MERA-VLA framework: ${mentionsMeraVla ? "✅ PASS" : "❌ FAIL"}`);

  // 7. Factual Grounding Q&A Test
  console.log("\n--- STAGE 6: FACTUAL GROUNDED Q&A ---");
  const q1 = "What are the three main deficiencies of existing VLA systems identified in the proposal?";
  console.log(`\nQuery 1: "${q1}"`);
  const a1 = await askDocument({
    question: q1,
    documentId: doc ? String(doc._id) : null,
    userId: doc ? doc.owner : null,
  });
  console.log(`Answer:\n${a1.answer}\n`);

  const q2 = "Has the MERA-VLA system already been experimentally proven on a real robot?";
  console.log(`\nQuery 2: "${q2}"`);
  const a2 = await askDocument({
    question: q2,
    documentId: doc ? String(doc._id) : null,
    userId: doc ? doc.owner : null,
  });
  console.log(`Answer:\n${a2.answer}\n`);

  // Table Information Query
  const qTable = "What information is contained in the tables of this proposal?";
  console.log(`\nQuery 4 (Table Retrieval): "${qTable}"`);
  const aTable = await askDocument({
    question: qTable,
    documentId: doc ? String(doc._id) : null,
    userId: doc ? doc.owner : null,
  });
  console.log(`Answer:\n${aTable.answer}\n`);

  // 8. Strict Refusal on Out-of-Document Query
  console.log("\n--- STAGE 7: STRICT OUT-OF-DOCUMENT REFUSAL ---");
  const q3 = "What is the corporate pricing plan and monthly subscription fee for DOCUMIND-AI?";
  console.log(`Query 5 (Out-of-Document): "${q3}"`);
  const a3 = await askDocument({
    question: q3,
    documentId: doc ? String(doc._id) : null,
    userId: doc ? doc.owner : null,
  });
  console.log(`Answer:\n${a3.answer}\n`);

  const refusedProperly = a3.answer.includes("could not find sufficient evidence");
  console.log(`Strict Refusal Guardrail: ${refusedProperly ? "✅ PASS" : "❌ FAIL"}`);

  await mongoose.disconnect();
  console.log("\n======================================================================");
  console.log("TEST COMPLETED");
  console.log("======================================================================");
}

runEndToEndTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

