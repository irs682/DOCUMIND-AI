require('dotenv').config({ path: './backend/.env' });

const {
  extractResearchIntent,
  evaluateRelevanceAndEvidenceGate,
  executeResearchPipeline,
} = require("../services/researchPipelineService");

async function testGate() {
  console.log("=== TEST 1: Intent Extraction ===");
  const intent = extractResearchIntent(
    "Analyze FR-AUTH-004 Multi-Factor Authentication and TOTP algorithms",
    "What are the timeout limits and recovery code formats?"
  );
  console.log("Extracted requirement IDs:", intent.requirementIds);
  console.log("Extracted entities:", intent.keyEntities);
  console.log("Extracted target dimensions:", intent.targetDimensions.map((d) => d.name));

  console.log("\n=== TEST 2: Evidence Gate with INSUFFICIENT evidence ===");
  const sparseChunks = [
    { text: "This is a random note about baking bread and cakes.", score: 0.1 },
  ];
  const sparseGate = evaluateRelevanceAndEvidenceGate({
    intent,
    retrievedChunks: sparseChunks,
    threshold: 0.5,
  });
  console.log("Sparse Gate Result isSufficient:", sparseGate.isSufficient);
  console.log("Sparse Gate Score:", sparseGate.score);
  console.log("Missing Dimensions:", sparseGate.missingDimensions);

  console.log("\n=== TEST 3: Full Pipeline with INSUFFICIENT evidence (Branch B) ===");
  const warningReport = await executeResearchPipeline({
    topic: "Quantum Blockchain Consensus in BakeSuite",
    questions: "How is proof of stake implemented?",
    retrievedChunks: sparseChunks,
  });
  console.log("Warning Report Status:", warningReport.status);
  console.log("Warning Summary Snippet:", warningReport.executiveSummary.slice(0, 100));
  console.log("Sections count:", warningReport.sections.length);
  console.log("First Section Heading:", warningReport.sections[0].heading);

  console.log("\n=== TEST 4: Full Pipeline with SUFFICIENT evidence (Branch A) ===");
  const richChunks = [
    {
      text: "Section 3.1.4 FR-AUTH-004: Multi-Factor Authentication. The system shall provide multi-factor authentication with TOTP per RFC 6238 as the primary factor, SMS OTP as fallback, and exactly 10 single-use recovery codes. Mandatory for System Administrator, Owner, CEO, and Finance Manager. Challenge token valid for 5 minutes. Endpoint POST /api/v1/auth/mfa/challenge.",
      score: 0.95,
      metadata: { section: "3.1.4 FR-AUTH-004" },
    },
    {
      text: "Section 3.1.10 API Endpoints: POST /api/v1/auth/mfa/verify. TOTP step is 30 seconds with ±1 window tolerance. Session management maintained in Redis with 30-minute idle timeout. Database PostgreSQL audit_logs.",
      score: 0.92,
      metadata: { section: "3.1.10 API Endpoints" },
    },
  ];

  const successReport = await executeResearchPipeline({
    topic: "Multi-Factor Authentication and Session Security",
    questions: "What are the MFA factors, mandatory roles, and endpoints?",
    retrievedChunks: richChunks,
    allDocChunks: richChunks,
  });
  console.log("Success Report Status:", successReport.status);
  console.log("QC Passed:", successReport.qcPassed);
  console.log("Gate Score:", successReport.evidenceGate.score);
  console.log("Conflict Detected:", successReport.conflictReport?.conflict_detected);
  console.log("Claims Verified in Ledger:", successReport.claimLedger?.length);
  console.log("Verified Sections count:", successReport.sections.length);
}

testGate().catch(console.error);
