const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Document = require("../models/Document");
const { askDocument } = require("../services/ragService");

async function testRAG() {
  console.log("=== TESTING MULTIMODAL RAG ON REAL PROPOSAL DOCUMENT ===");
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/documind";
  await mongoose.connect(mongoUri);

  const doc = await Document.findOne({
    $or: [{ name: /irshadprpsel/i }, { originalName: /irshadprpsel/i }],
  });

  if (!doc) {
    console.error("Document irshadprpsel not found!");
    process.exit(1);
  }

  console.log(`Document found: "${doc.name}" ID: ${doc._id}`);

  // Test 1: Table Query
  console.log("\n[TEST 1: Table Query]");
  const qTable = "What information is shown in Table 1?";
  console.log(`Question: "${qTable}"`);
  const resTable = await askDocument({
    question: qTable,
    documentId: String(doc._id),
  });
  console.log("Answer:\n", resTable.answer);
  console.log("\nSources count:", resTable.sources?.length);
  if (resTable.sources?.length) {
    console.log("Top Source Citation:", resTable.sources[0].citation);
    console.log("Top Source ObjectType:", resTable.sources[0].objectType);
    console.log("Top Source ObjectId:", resTable.sources[0].objectId);
  }
  console.log("Evidence Ledger items:", resTable.ledger?.length);

  // Test 2: Missing Object Protection
  console.log("\n[TEST 2: Missing Object Protection - Non-existent Table 99]");
  const qMissing = "What is the accuracy in Table 99?";
  console.log(`Question: "${qMissing}"`);
  const resMissing = await askDocument({
    question: qMissing,
    documentId: String(doc._id),
  });
  console.log("Answer:\n", resMissing.answer);
  console.log("Failure State:", resMissing.failureState);

  // Test 3: Figure Query
  console.log("\n[TEST 3: Figure Query]");
  const qFig = "What does Figure 1 describe?";
  console.log(`Question: "${qFig}"`);
  const resFig = await askDocument({
    question: qFig,
    documentId: String(doc._id),
  });
  console.log("Answer:\n", resFig.answer);
  console.log("\nSources count:", resFig.sources?.length);
  if (resFig.sources?.length) {
    console.log("Top Source Citation:", resFig.sources[0].citation);
    console.log("Top Source ObjectType:", resFig.sources[0].objectType);
    console.log("Top Source ObjectId:", resFig.sources[0].objectId);
  }

  await mongoose.disconnect();
  console.log("\n=== ALL QA TESTS COMPLETED SUCCESSFULLY ===");
}

testRAG().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
