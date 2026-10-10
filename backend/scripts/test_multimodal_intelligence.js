const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Document = require("../models/Document");
const EvidenceObject = require("../models/EvidenceObject");
const { classifyQuery } = require("../services/queryRouterService");
const {
  formatObjectCitation,
  checkMissingObjectFailure,
  buildEvidenceLedger,
} = require("../services/evidenceLedgerService");
const { performHybridSearch } = require("../services/hybridSearchService");
const { processDocument } = require("../services/documentPipelineService");

async function runTests() {
  console.log("================================================================================");
  console.log("  DOCUMIND-AI MULTIMODAL INTELLIGENCE & EVIDENCE GROUNDING TEST SUITE");
  console.log("================================================================================\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/documind";
  await mongoose.connect(mongoUri);
  console.log("[TEST] MongoDB Connected successfully.");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Query Router Classification
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 1: Query Router Intent & Target Classification ---");
  {
    const rTable = classifyQuery("What is shown in Table 2?");
    assert(rTable.queryType === "TABLE_QUERY" && rTable.tableId === "table_2", "Classified 'What is shown in Table 2?' as TABLE_QUERY with table_2");

    const rFig = classifyQuery("What does Figure 1 illustrate in the document?");
    assert(rFig.queryType === "FIGURE_QUERY" && rFig.figureId === "figure_1", "Classified 'What does Figure 1 illustrate?' as FIGURE_QUERY with figure_1");

    const rExt = classifyQuery("List all requirements and every performance target in the proposal.");
    assert(rExt.isCompleteExtraction === true, "Classified complete extraction query with isCompleteExtraction=true");

    const rExact = classifyQuery("What are the specifications for FR-AUTH-004?");
    assert(rExact.queryType === "EXACT_IDENTIFIER_QUERY" && rExact.targetObjectId === "FR-AUTH-004", "Classified exact identifier FR-AUTH-004");

    const rComp = classifyQuery("Compare Table 1 and Table 2 in terms of methodology.");
    assert(rComp.queryType === "COMPARISON_QUERY", "Classified comparison query between tables");
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Missing Object Protection (Topic Protection & Zero Hallucination)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Missing Object Protection (Zero Hallucination) ---");
  {
    const mockDoc = {
      tables: [{ tableId: "table_1", caption: "Table 1: Training Parameters" }],
      figures: [{ figureId: "figure_1", caption: "Figure 1: System Overview" }],
    };

    const failTable = checkMissingObjectFailure("What is the accuracy in Table 99?", [], mockDoc);
    assert(
      failTable.isMissing === true && failTable.failureState === "TABLE_NOT_FOUND",
      "Explicitly reported TABLE_NOT_FOUND for non-existent Table 99"
    );

    const failFig = checkMissingObjectFailure("Explain the architecture in Figure 88.", [], mockDoc);
    assert(
      failFig.isMissing === true && failFig.failureState === "FIGURE_NOT_FOUND",
      "Explicitly reported FIGURE_NOT_FOUND for non-existent Figure 88"
    );

    const validTable = checkMissingObjectFailure(
      "What is in Table 1?",
      [{ objectId: "table_1", objectType: "table", text: "Table 1: Training Parameters" }],
      mockDoc
    );
    assert(validTable.isMissing === false, "Recognized present Table 1 without false failure");
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Object-Level Citations Formatter
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Object-Level Citation Formatting ---");
  {
    const citeTable = formatObjectCitation({
      documentName: "Proposal.pdf",
      pageNumber: 7,
      objectType: "table",
      objectId: "table_2",
    });
    assert(citeTable === "[Proposal.pdf, p. 7, Table 2]", `Table citation formatted correctly: ${citeTable}`);

    const citeFig = formatObjectCitation({
      documentName: "Architecture.pdf",
      pageNumber: 12,
      objectType: "figure",
      objectId: "figure_3",
    });
    assert(citeFig === "[Architecture.pdf, p. 12, Figure 3]", `Figure citation formatted correctly: ${citeFig}`);

    const citeSec = formatObjectCitation({
      documentName: "SRS.docx",
      pageNumber: 4,
      section: "3.2",
    });
    assert(citeSec === "[SRS.docx, p. 4, §3.2]", `Section citation formatted correctly: ${citeSec}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Evidence Ledger & Claim Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Evidence Ledger & High-Risk Claim Verification ---");
  {
    const mockChunks = [
      {
        documentId: "doc_1",
        documentName: "Proposal.pdf",
        pageNumber: 7,
        objectType: "table",
        objectId: "table_2",
        text: "Table 2: Performance metrics. Accuracy achieved was 95.4% across 100 trials.",
      },
    ];

    const answer = "The system achieved 95.4% accuracy across the evaluated trials according to Table 2.";
    const ledger = buildEvidenceLedger(answer, mockChunks);

    assert(ledger.length > 0, `Ledger generated ${ledger.length} verified claims`);
    assert(ledger[0].isHighRisk === true, "High-risk numerical claim flagged for verification");
    assert(ledger[0].verified === true, "High-risk numerical claim verified against source chunk");
    assert(
      ledger[0].evidence && ledger[0].evidence.objectId === "table_2",
      "Ledger claim successfully linked to table_2 evidence object"
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Real Document Multimodal Reprocessing & Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Real Document Multimodal Reprocessing & DB Storage ---");
  {
    // Find the uploaded document irshadprpsel.pdf
    const doc = await Document.findOne({
      $or: [{ name: /irshadprpsel/i }, { originalName: /irshadprpsel/i }],
    });

    if (!doc) {
      console.warn("  ⚠️ Notice: irshadprpsel.pdf document not found in DB. Searching any ready PDF...");
    } else {
      console.log(`[TEST] Reprocessing document "${doc.name}" (${doc._id})...`);
      const reprocessed = await processDocument(String(doc._id), { isReprocess: true });
      assert(reprocessed.status === "ready", `Document reprocessed to status 'ready'`);

      const updated = await Document.findById(doc._id);
      assert(Array.isArray(updated.tables) && updated.tables.length > 0, `Extracted ${updated.tables?.length} tables`);
      assert(Array.isArray(updated.figures) && updated.figures.length > 0, `Extracted ${updated.figures?.length} figures`);
      assert(Array.isArray(updated.evidenceObjects) && updated.evidenceObjects.length > 0, `Stored ${updated.evidenceObjects?.length} evidenceObjects in Document`);
      assert(Boolean(updated.diagnostics), `Document diagnostics recorded: ${JSON.stringify(updated.diagnostics)}`);

      // Verify table structured format and dual representation
      const sampleTable = updated.tables[0];
      const cols = sampleTable.columns || sampleTable.headers || [];
      const rows = sampleTable.rows || [];
      assert(cols.length > 0, `Table ${sampleTable.tableId} has structured columns: ${cols.join(', ')}`);
      assert(rows.length > 0, `Table ${sampleTable.tableId} has ${rows.length} structured rows`);

      // Verify figure visual description & caption
      const sampleFig = updated.figures[0];
      assert(Boolean(sampleFig.visualDescription), `Figure ${sampleFig.figureId} has observable visual description: "${sampleFig.visualDescription.slice(0, 60)}..."`);
      assert(Boolean(sampleFig.caption), `Figure ${sampleFig.figureId} has caption: "${sampleFig.caption}"`);

      // -----------------------------------------------------------------------
      // TEST 6: Multimodal Hybrid Retrieval on Real Reprocessed Document
      // -----------------------------------------------------------------------
      console.log("\n--- TEST 6: Multimodal Hybrid Retrieval on Real Reprocessed Document ---");
      const tableHits = await performHybridSearch({
        query: "What information is shown in Table 1?",
        documentId: String(doc._id),
        limit: 5,
      });

      assert(tableHits.length > 0, `Hybrid search retrieved ${tableHits.length} hits for Table 1 query`);
      const hasTableHit = tableHits.some((h) => h.isTable || h.objectType === "table" || String(h.objectId).includes("table_1") || /\[Table 1\b/i.test(h.text));
      assert(hasTableHit, "Top retrieved results contain verified Table 1 object chunk");

      const figHits = await performHybridSearch({
        query: "What is illustrated in Figure 1?",
        documentId: String(doc._id),
        limit: 5,
      });

      assert(figHits.length > 0, `Hybrid search retrieved ${figHits.length} hits for Figure 1 query`);
      const hasFigHit = figHits.some((h) => h.isFigure || h.objectType === "figure" || String(h.objectId).includes("figure_1") || /\b(?:Figure|Fig\.)\s*1\b/i.test(h.text));
      assert(hasFigHit, "Top retrieved results contain verified Figure 1 object chunk");
    }
  }

  console.log("\n================================================================================");
  console.log(`  RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch((err) => {
  console.error("[TEST SUITE ERROR]", err);
  process.exit(1);
});
