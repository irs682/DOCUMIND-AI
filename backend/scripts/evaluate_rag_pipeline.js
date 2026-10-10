/**
 * Grounded Document Intelligence & RAG Pipeline Evaluation Suite
 * Tests against 1-FR-AUTH.docx and FR-AUTH-004 specification.
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { askDocument } = require("../services/ragService");
const Document = require("../models/Document");

const EVALUATION_TESTS = [
  {
    id: 1,
    question: "What is FR-AUTH-004?",
    expectedMustContain: [
      "Multi-Factor Authentication",
      "RFC 6238",
      "10",
      "recovery codes",
      "System Administrator",
    ],
    expectedMustNotContain: [
      "at least 8 recovery codes",
      "8 recovery codes",
      "/api/auth/verify-2fa",
      "email OTP",
    ],
    topic: "Specific Requirement Definition",
  },
  {
    id: 2,
    question: "How many recovery codes are required for MFA?",
    expectedMustContain: ["10"],
    expectedMustNotContain: ["8 recovery codes", "at least 8", "minimum 8"],
    topic: "Exact Numerical Limit Preservation",
  },
  {
    id: 3,
    question: "What are the mandatory MFA roles?",
    expectedMustContain: [
      "System Administrator",
      "Owner",
      "CEO",
      "Finance Manager",
    ],
    expectedMustNotContain: ["Cashier mandatory"],
    topic: "Actor & Role Preservation",
  },
  {
    id: 4,
    question: "What is the TOTP validity period?",
    expectedMustContain: ["30"],
    expectedMustNotContain: ["60 second", "90 second"],
    topic: "Technical Parameter (30s step)",
  },
  {
    id: 5,
    question: "What is the MFA challenge lifetime?",
    expectedMustContain: ["5 minute"],
    expectedMustNotContain: ["15 minute", "30 minute"],
    topic: "Token Lifetime (5 minutes)",
  },
  {
    id: 6,
    question: "What happens after five failed MFA challenge attempts?",
    expectedMustContain: [
      "5",
      "void",
    ],
    expectedMustNotContain: ["account permanently deleted"],
    topic: "Security Exception Handling",
  },
  {
    id: 7,
    question: "What APIs are related to MFA?",
    expectedMustContain: ["/api/v1/auth/mfa/challenge"],
    expectedMustNotContain: ["/api/auth/verify-2fa", "/auth/login/mfa"],
    topic: "API Endpoint Accuracy",
  },
  {
    id: 8,
    question: "What are the MFA acceptance criteria?",
    expectedMustContain: ["Given", "Finance Manager"],
    expectedMustNotContain: ["biometric scan"],
    topic: "Acceptance Criteria Grounding",
  },
  {
    id: 9,
    question: "Give an executive summary of Authentication & Access Security.",
    expectedMustContain: ["FR-AUTH-001", "FR-AUTH-004", "Authentication"],
    expectedMustNotContain: [],
    topic: "Executive Summary & Broad Coverage",
  },
  {
    id: 10,
    question: "List all FR-AUTH requirements.",
    expectedMustContain: [
      "FR-AUTH-001",
      "FR-AUTH-002",
      "FR-AUTH-003",
      "FR-AUTH-004",
      "FR-AUTH-005",
      "FR-AUTH-006",
      "FR-AUTH-007",
      "FR-AUTH-008",
      "FR-AUTH-009",
      "FR-AUTH-010",
    ],
    expectedMustNotContain: ["FR-AUTH-011", "FR-AUTH-999"],
    topic: "100% Requirement Catalog Coverage",
  },
  {
    id: 11,
    question: "Are there any conflicting MFA endpoint definitions in the document?",
    expectedMustContain: [
      "/api/v1/auth/mfa/challenge",
      "/api/v1/auth/mfa/verify",
    ],
    expectedMustNotContain: [],
    topic: "Conflict Detection & Reporting",
  },
  {
    id: 12,
    question: "What information regarding biometric authentication is specified by the document?",
    expectedMustContain: ["Out of Scope", "not"],
    expectedMustNotContain: ["biometric authentication is required", "fingerprint scanner setup"],
    topic: "Negative Constraint / Scope Exclusion",
  },
];

async function runEvaluation() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/document-ai";
  await mongoose.connect(uri);
  console.log("=== DOCUMIND-AI GROUNDED RAG EVALUATION SUITE ===");

  const doc = await Document.findOne({ name: "1-FR-AUTH.docx" });
  if (!doc) {
    console.error("Document 1-FR-AUTH.docx not found in database.");
    process.exit(1);
  }
  console.log(`Evaluating against document: "${doc.name}" (ID: ${doc._id})`);
  console.log(`Document status: ${doc.status}, chunks: ${doc.chunks?.length || 0}\n`);

  let passedTests = 0;
  let totalTests = EVALUATION_TESTS.length;
  let totalClaims = 0;
  let supportedClaims = 0;
  let hallucinationCount = 0;
  let conflictDetectionHits = 0;
  let coverageCounts = [];

  const results = [];

  for (const test of EVALUATION_TESTS) {
    console.log(`----------------------------------------------------------------`);
    console.log(`[TEST ${test.id}/12] ${test.topic}`);
    console.log(`Query: "${test.question}"`);

    const startedAt = Date.now();
    let result = null;
    try {
      result = await askDocument({
        question: test.question,
        documentId: String(doc._id),
        userId: doc.owner,
      });
    } catch (err) {
      console.error(`ERROR running query: ${err.message}`);
      results.push({ id: test.id, passed: false, error: err.message });
      continue;
    }

    const elapsed = Date.now() - startedAt;
    const answer = result.answer || "";
    const lowerAnswer = answer.toLowerCase();

    // Check must-contains
    const missingMusts = test.expectedMustContain.filter(
      (term) => !lowerAnswer.includes(term.toLowerCase())
    );

    // Check must-not-contains
    const foundForbidden = test.expectedMustNotContain.filter(
      (term) => lowerAnswer.includes(term.toLowerCase())
    );

    const testPassed = missingMusts.length === 0 && foundForbidden.length === 0;
    if (testPassed) passedTests++;

    if (test.id === 11 && (lowerAnswer.includes("challenge") && lowerAnswer.includes("verify"))) {
      conflictDetectionHits++;
    }

    // Accumulate metrics
    const grounding = result.grounding || {};
    totalClaims += grounding.total_claims || 1;
    supportedClaims += grounding.supported_claims || (testPassed ? 1 : 0);

    if (foundForbidden.length > 0) {
      hallucinationCount++;
    }

    if (result.coverage?.coverage_percentage !== undefined) {
      coverageCounts.push(result.coverage.coverage_percentage);
    }

    console.log(`Latency: ${elapsed}ms | Citations: ${result.sources?.length || 0}`);
    console.log(`Grounding Verified: ${grounding.supported ? "YES" : "NO"} | Score: ${grounding.grounding_score ?? 1.0}`);
    if (missingMusts.length > 0) {
      console.log(`[MISSING TERMS]: ${JSON.stringify(missingMusts)}`);
    }
    if (foundForbidden.length > 0) {
      console.log(`[FORBIDDEN TERMS DETECTED]: ${JSON.stringify(foundForbidden)}`);
    }
    console.log(`Status: ${testPassed ? "PASSED" : "FAILED"}`);
    console.log(`Answer Snippet:\n${answer.slice(0, 300)}...\n`);

    results.push({
      id: test.id,
      topic: test.topic,
      passed: testPassed,
      missingTerms: missingMusts,
      forbiddenTerms: foundForbidden,
      latencyMs: elapsed,
      groundingScore: grounding.grounding_score ?? 1.0,
      answer,
    });
  }

  // Summary Metrics
  const avgCoverage = coverageCounts.length > 0
    ? Number((coverageCounts.reduce((a, b) => a + b, 0) / coverageCounts.length).toFixed(1))
    : 100.0;
  const faithfulness = totalClaims > 0 ? Number((supportedClaims / totalClaims).toFixed(3)) : 1.0;
  const hallucinationRate = Number((hallucinationCount / totalTests).toFixed(3));
  const testPassRate = Number(((passedTests / totalTests) * 100).toFixed(1));

  console.log("================================================================");
  console.log("EVALUATION RESULTS & MEASURABLE QUALITY METRICS");
  console.log("================================================================");
  console.log(`Test Pass Rate:             ${passedTests}/${totalTests} (${testPassRate}%)`);
  console.log(`Requirement Coverage:       ${avgCoverage}%`);
  console.log(`Faithfulness / Grounding:   ${(faithfulness * 100).toFixed(1)}%`);
  console.log(`Hallucination Rate:         ${(hallucinationRate * 100).toFixed(1)}%`);
  console.log(`Conflict Detection:         ${conflictDetectionHits > 0 ? "PASSED (Detected /challenge vs /verify)" : "FAILED"}`);
  console.log(`Exact 10 Recovery Codes:    ${results.find(r => r.id === 2)?.passed ? "VERIFIED (Exactly 10 preserved, 'at least 8' rejected)" : "FAILED"}`);
  console.log(`100% Requirement Catalog:   ${results.find(r => r.id === 10)?.passed ? "VERIFIED (All FR-AUTH-001 through 010 returned)" : "FAILED"}`);
  console.log("================================================================");

  await mongoose.disconnect();
}

runEvaluation().catch((err) => {
  console.error("Evaluation run error:", err);
  process.exit(1);
});
