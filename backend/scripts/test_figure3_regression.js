const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Document = require('../models/Document');
const { classifyQuery } = require('../services/queryRouterService');
const { performHybridSearch } = require('../services/hybridSearchService');
const { answerQuestion } = require('../services/ragService');

async function runRegressionSuite() {
  console.log("================================================================================");
  console.log("  DOCUMIND-AI FIGURE 3 END-TO-END REGRESSION TEST SUITE");
  console.log("================================================================================\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/document-ai";
  await mongoose.connect(mongoUri);
  console.log("[TEST] MongoDB Connected.");

  const doc = await Document.findOne({
    $or: [
      { _id: '6ac65e2a7be3177e5fe6d778' },
      { name: /1-FR-AUTH/i },
      { originalName: /1-FR-AUTH/i },
    ]
  });

  if (!doc) {
    console.error("❌ Document 1-FR-AUTH not found in database!");
    process.exit(1);
  }

  console.log(`[TEST] Target Document: "${doc.name}" (${doc._id})`);
  console.log(`[TEST] Status: ${doc.status}`);
  console.log(`[TEST] Total figures stored: ${doc.figures?.length || doc.figureCount}`);
  console.log(`[TEST] Total chunks: ${doc.chunks?.length || doc.chunksCount}\n`);

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, details = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  ✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `[FAILED: ${details}]` : ''}`);
    }
  }

  // ---------------------------------------------------------------------------
  // VERIFICATION 0: Figure 3 Evidence Object in DB
  // ---------------------------------------------------------------------------
  console.log("--- STAGE 0: Verified Figure 3 Evidence Object in Document ---");
  const fig3 = (doc.figures || []).find(f => 
    String(f.figureNumber) === '3' || 
    String(f.objectId).toLowerCase() === 'figure 3' ||
    String(f.figureId).toLowerCase() === 'figure_3'
  );

  assert(Boolean(fig3), "Figure 3 object present in doc.figures", `Found: ${Boolean(fig3)}`);
  if (fig3) {
    const participants = fig3.participants || fig3.structuredData?.participants || [];
    assert(participants.length >= 4, "Figure 3 has extracted participants", `Count: ${participants.length}`);
    const participantText = participants.join(', ');
    console.log(`  [FIGURE 3 PARTICIPANTS]: ${participantText}`);
    assert(
      participantText.includes("Finance Manager") &&
      participantText.includes("React Client") &&
      participantText.includes("Auth API") &&
      participantText.includes("Redis") &&
      participantText.includes("PostgreSQL"),
      "Figure 3 contains all 5 required participants",
      "Finance Manager, React Client, Auth API, Redis, PostgreSQL"
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Figure 3 Participants Query
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 1: According to Figure 3, list all participants in the authentication sequence diagram and describe the order of interactions between them ---");
  const q1 = "According to Figure 3, list all participants in the authentication sequence diagram and describe the order of interactions between them.";
  
  // Router check
  const route1 = classifyQuery(q1);
  assert(route1.queryType === "FIGURE_QUERY", "Test 1 routed as FIGURE_QUERY", route1.queryType);
  assert(route1.figureNumber === "3" || route1.targetObjectId === "Figure 3", "Test 1 identified Figure 3 target", `id=${route1.targetObjectId}, num=${route1.figureNumber}`);

  // Answer generation
  const res1 = await answerQuestion({
    question: q1,
    documentId: String(doc._id),
    userId: doc.owner,
  });

  console.log(`\n[TEST 1 ANSWER]:\n${res1.answer}\n`);

  // Check sources
  const src1 = res1.sources || [];
  const primarySource = src1[0];
  assert(src1.length > 0, "Test 1 returned evidence sources", `Count: ${src1.length}`);
  assert(
    Boolean(primarySource && (primarySource.objectType === 'figure' || primarySource.isFigure || primarySource.objectId?.includes('Figure'))),
    "Primary retrieved evidence is a Figure object",
    `Type: ${primarySource?.objectType}, ID: ${primarySource?.objectId}`
  );
  assert(
    Boolean(primarySource?.citation?.includes("Figure 3")),
    "Citation explicitly points to Figure 3",
    primarySource?.citation || "(none)"
  );

  // Check answer content
  const a1Lower = res1.answer.toLowerCase();
  assert(
    a1Lower.includes("finance manager") &&
    a1Lower.includes("react client") &&
    a1Lower.includes("auth api") &&
    a1Lower.includes("redis") &&
    a1Lower.includes("postgresql"),
    "Answer contains all 5 participants from Figure 3 evidence",
    "Finance Manager, React Client, Auth API, Redis, PostgreSQL"
  );
  assert(
    !res1.answer.includes("The document does not specify the participants in Figure 3"),
    "Answer does NOT say 'The document does not specify'",
    "Clean grounded response"
  );
  assert(
    !res1.answer.includes("Thinking Process") &&
    !res1.answer.includes("Analyze the Request") &&
    !res1.answer.includes("Let me check") &&
    !res1.answer.includes("<think>") &&
    !res1.answer.includes("scratchpad"),
    "Answer does NOT expose internal thinking process, reasoning, or scratchpad",
    "Zero internal reasoning exposed"
  );
  assert(
    !/\bVisual\b(?!\s*Description)/i.test(res1.answer.split(/interaction/i)[0]),
    "Answer does NOT list 'Visual' as a diagram participant",
    "Generic parser artifact 'Visual' eliminated"
  );
  assert(
    Boolean(res1.evidenceStatus === "VERIFIED"),
    "Response has evidenceStatus === 'VERIFIED'",
    res1.evidenceStatus
  );

  // ---------------------------------------------------------------------------
  // TEST 2: What happens after TOTP code is submitted in Figure 3?
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: What happens after the TOTP code is submitted in Figure 3? ---");
  const q2 = "What happens after the TOTP code is submitted in Figure 3?";
  const res2 = await answerQuestion({
    question: q2,
    documentId: String(doc._id),
    userId: doc.owner,
  });

  console.log(`\n[TEST 2 ANSWER]:\n${res2.answer}\n`);
  const a2Lower = res2.answer.toLowerCase();
  assert(
    a2Lower.includes("token") || a2Lower.includes("session") || a2Lower.includes("mfa") || a2Lower.includes("access"),
    "Answer accurately describes token/session issuance after TOTP verification",
    "Contains token / session / MFA verification"
  );
  assert(
    res2.sources?.some(s => s.citation?.includes("Figure 3") || s.objectId?.includes("Figure 3")),
    "Test 2 retrieved Figure 3 evidence source",
    res2.sources?.[0]?.citation
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Which component checks the failure counter in Figure 3?
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Which component checks the failure counter in Figure 3? ---");
  const q3 = "Which component checks the failure counter in Figure 3?";
  const res3 = await answerQuestion({
    question: q3,
    documentId: String(doc._id),
    userId: doc.owner,
  });

  console.log(`\n[TEST 3 ANSWER]:\n${res3.answer}\n`);
  const a3Lower = res3.answer.toLowerCase();
  assert(
    (a3Lower.includes("auth api") || a3Lower.includes("api")) && a3Lower.includes("redis"),
    "Answer identifies Auth API checking failure counter in Redis",
    "Auth API / Redis identified"
  );

  // ---------------------------------------------------------------------------
  // TEST 4: What happens when the consumed refresh token is reused?
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: What happens when the consumed refresh token is reused? ---");
  const q4 = "What happens when the consumed refresh token is reused in Figure 3?";
  const res4 = await answerQuestion({
    question: q4,
    documentId: String(doc._id),
    userId: doc.owner,
  });

  console.log(`\n[TEST 4 ANSWER]:\n${res4.answer}\n`);
  const a4Lower = res4.answer.toLowerCase();
  assert(
    a4Lower.includes("revok") || a4Lower.includes("err_token_reuse") || a4Lower.includes("401") || a4Lower.includes("family"),
    "Answer identifies token-family revocation or ERR_TOKEN_REUSE upon replay",
    "Revocation / ERR_TOKEN_REUSE / replay detection"
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Compare Figure 3 with FR-AUTH-001
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Compare Figure 3 with FR-AUTH-001 ---");
  const q5 = "Compare Figure 3 with FR-AUTH-001.";
  const res5 = await answerQuestion({
    question: q5,
    documentId: String(doc._id),
    userId: doc.owner,
  });

  console.log(`\n[TEST 5 ANSWER]:\n${res5.answer}\n`);
  const a5Lower = res5.answer.toLowerCase();
  assert(
    (a5Lower.includes("figure 3") || a5Lower.includes("sequence diagram")) && (a5Lower.includes("fr-auth-001") || a5Lower.includes("staff login")),
    "Answer compares Figure 3 authentication flow with FR-AUTH-001 staff login",
    "Comparison grounded in both figure and requirement"
  );

  console.log("\n================================================================================");
  console.log(`  REGRESSION RESULTS: ${passedCount} / ${totalCount} PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log("================================================================================\n");

  await mongoose.disconnect();

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
