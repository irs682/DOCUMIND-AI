/**
 * DOCUMIND-AI Evidence Grounding & Anti-Fabrication Regression Suite
 *
 * Validates:
 * 1. Canonical source deduplication (duplicate PDFs consolidated into 1 scholarly source).
 * 2. No model-knowledge backfill (0 MiniGrid, 0 raw (s,a,r,s') tuples, 0 path length metric).
 * 3. Verified benchmark identification (ALFWorld, WebShop, HotpotQA).
 * 4. Missing field handling (uncertaintyMethod -> NOT_FOUND, NOT_REPORTED).
 * 5. Single-source comparative notice (no fictitious second comparison paper).
 * 6. Scoped gap language ("Within the analyzed source(s)...").
 * 7. Critic agent claim-level audit & quality gate.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Document = require('../models/Document');
const {
  canonicalizeDocuments,
  extractPaperProfile,
  generateComparisonMatrix,
  evaluateBenchmarkCompatibility,
  performGapAnalysis,
} = require('../services/researchStudioService');

const { runCriticAgent } = require('../services/researchAgentEngine');

async function runRegressionSuite() {
  console.log('===============================================================');
  console.log('DOCUMIND-AI: EVIDENCE GROUNDING & ANTI-FABRICATION TEST SUITE');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, errorDetails = '') {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (errorDetails) console.error(`         Detail: ${errorDetails}`);
    }
  }

  // ── Test 1: Canonical Source Deduplication ──
  console.log('[Test 1] Canonical Source Deduplication Test');
  const doc1 = await Document.findById('6ac8be1bc32fa5b19f0fbcfe').lean();
  const doc2 = await Document.findById('6ac8be24c32fa5b19f0fbeab').lean();

  if (!doc1 || !doc2) {
    throw new Error('ExpeL documents not found in test database.');
  }

  const canonicalSources = canonicalizeDocuments([doc1, doc2]);
  assert(canonicalSources.length === 1, 'Two duplicate ExpeL PDFs consolidated into exactly 1 canonical source', `Found ${canonicalSources.length}`);
  assert(canonicalSources[0].isDuplicate === true, 'Merged source marked as duplicate across file uploads');
  assert(canonicalSources[0].documentIds.length === 2, 'Canonical source retains both underlying document IDs');

  // ── Test 2: Strict VerifiedField Extraction for ExpeL ──
  console.log('\n[Test 2] ExpeL Extraction & Anti-Fabrication Test');
  const profile = await extractPaperProfile(canonicalSources[0]);

  // Assert 1: Benchmarks
  const benchmarksList = (profile.benchmarks?.value || []).map((b) => String(b).toLowerCase());
  const datasetsList = (profile.datasets?.value || []).map((d) => String(d).toLowerCase());
  const combinedList = [...benchmarksList, ...datasetsList];

  assert(
    !combinedList.some((b) => b.includes('minigrid')),
    'MiniGrid is NOT present in extracted benchmarks/datasets (Zero Hallucination)',
    `Found: ${combinedList.join(', ')}`
  );

  assert(
    combinedList.some((b) => b.includes('alfworld') || b.includes('hotpotqa') || b.includes('webshop')),
    'Actual verified benchmarks identified (ALFWorld, HotpotQA, or WebShop)',
    `Found: ${combinedList.join(', ')}`
  );

  // Assert 2: Experience Representation
  const memValue = String(profile.memoryMechanism?.value || '').toLowerCase();
  assert(
    !memValue.includes('(s,a,r,s\')') && !memValue.includes('(s, a, r, s\')') && !memValue.includes('raw experience tuples'),
    'Memory mechanism does NOT hallucinate raw (s,a,r,s\') experience tuples',
    `Found: ${memValue}`
  );

  // Assert 3: Metrics
  const metricsList = (profile.metrics?.value || []).map((m) => String(m).toLowerCase());
  assert(
    !metricsList.some((m) => m.includes('path length')),
    'Metrics do NOT contain invented "path length"',
    `Found: ${metricsList.join(', ')}`
  );

  // Assert 4: Missing Uncertainty Module (Fail Closed)
  assert(
    profile.uncertaintyMethod?.status === 'NOT_FOUND',
    'Uncertainty module status is strictly NOT_FOUND',
    `Status was: ${profile.uncertaintyMethod?.status}`
  );
  assert(
    profile.uncertaintyMethod?.value === 'NOT_REPORTED',
    'Uncertainty module value is strictly NOT_REPORTED (No model backfill)',
    `Value was: ${profile.uncertaintyMethod?.value}`
  );

  // Assert 5: Verified Citation Metadata
  assert(
    profile.title?.status === 'VERIFIED' && profile.title?.evidenceIds?.length > 0,
    'Paper title is VERIFIED and anchored to EvidenceObject ID',
    `Evidence IDs: ${profile.title?.evidenceIds?.join(', ')}`
  );

  // ── Test 3: Single-Source Comparative Guardrail ──
  console.log('\n[Test 3] Single-Source Comparative Matrix & Benchmark Compatibility');
  const compMatrix = generateComparisonMatrix([profile]);
  const compatibility = evaluateBenchmarkCompatibility([profile]);

  assert(compMatrix.isSingleSourceCorpus === true, 'Comparison matrix identifies single-canonical-source corpus');
  assert(
    compatibility.status === 'SINGLE_CANONICAL_SOURCE',
    'Benchmark compatibility returns SINGLE_CANONICAL_SOURCE notice',
    `Status was: ${compatibility.status}`
  );
  assert(
    compatibility.explanation.includes('Comparative analysis is limited'),
    'Compatibility explanation includes explicit single-source limitation warning'
  );

  // ── Test 4: Genuine Scoped Gap Analysis ──
  console.log('\n[Test 4] Scoped Research Gap Analysis Test');
  const gaps = await performGapAnalysis({
    paperProfiles: [profile],
    topic: 'LLM experiential learning without parameter updates',
    questions: 'Uncertainty and memory retrieval',
  });

  const gapDescriptions = (gaps || []).map((g) => g.description || '').join(' ');
  assert(
    !gapDescriptions.toLowerCase().includes('never before studied') &&
    !gapDescriptions.toLowerCase().includes('globally unexplored') &&
    !gapDescriptions.toLowerCase().includes('no one has ever'),
    'Gaps contain NO uncalibrated universal novelty claims ("globally unexplored")'
  );

  assert(
    gapDescriptions.toLowerCase().includes('within the selected') ||
    gapDescriptions.toLowerCase().includes('within the analyzed') ||
    (gaps.length > 0 && gaps[0].scope === 'GAP IN SELECTED SOURCES'),
    'Gaps explicitly scoped to "GAP IN SELECTED SOURCES" / analyzed documents'
  );

  // ── Test 5: Critic Agent & Quality Gate Test ──
  console.log('\n[Test 5] Critic Agent Claim Verification & Quality Gate');

  const mockEvidence = [
    { evidenceId: 'chunk-21', pageNumber: 6, content: 'We evaluate ExpeL on ALFWorld, WebShop, and HotpotQA.' },
    { evidenceId: 'chunk-24', pageNumber: 7, content: 'Task success rates (SR %) across domains.' },
  ];

  // 5a. Grounded Synthesis Check
  const groundedDraft = 'ExpeL is evaluated across ALFWorld, WebShop, and HotpotQA using task success rate [ExpeL, p. 6].';
  const criticPass = await runCriticAgent({
    synthesisDraft: groundedDraft,
    evidence: mockEvidence,
    paperProfiles: [profile],
  });

  assert(criticPass.qualityGate.fabricatedEntityCount === 0, 'Grounded synthesis: 0 fabricated entities detected');
  assert(criticPass.qualityGate.invalidCitationCount === 0, 'Grounded synthesis: valid citation page accepted');

  // 5b. Fabricated Synthesis Negative Check
  const hallucinatedDraft = 'ExpeL was evaluated on MiniGrid benchmark measuring path length and storing raw (s,a,r,s\') tuples [ExpeL, p. 99].';
  const criticFail = await runCriticAgent({
    synthesisDraft: hallucinatedDraft,
    evidence: mockEvidence,
    paperProfiles: [profile],
  });

  assert(
    criticFail.qualityGate.fabricatedEntityCount >= 2,
    'Negative test: Critic catches MiniGrid, raw (s,a,r,s\'), and ungrounded entities',
    `Fabricated count: ${criticFail.qualityGate.fabricatedEntityCount}`
  );
  assert(
    criticFail.qualityGate.invalidCitationCount >= 1,
    'Negative test: Critic catches invented page number [p. 99]',
    `Invalid citations: ${criticFail.qualityGate.invalidCitationCount}`
  );
  assert(
    criticFail.qualityGate.verified === false,
    'Negative test: Quality gate strictly blocks hallucinated synthesis from being marked verified'
  );

  // ── Final Summary ──
  console.log('\n===============================================================');
  console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================');

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runRegressionSuite().catch((err) => {
  console.error('[TEST SUITE CRASH]:', err);
  process.exit(1);
});
