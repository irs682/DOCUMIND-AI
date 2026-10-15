/**
 * DOCUMIND-AI: Comprehensive Empirical Evidence, Statistics, Safety & Readiness Test Suite
 *
 * Covers all 12 test cases specified in Item 46 of the Master Prompt:
 * 1. One result only (n=1 blocks error bars, no distribution claims)
 * 2. Multiple seeds (n>=3 computes sample SD, SE, 95% CI, effect size, paired t-test)
 * 3. Missing source file (keeps PROVENANCE_PENDING, blocks VERIFIED_EXPERIMENT)
 * 4. Incompatible benchmarks (blocks direct cross-study numerical ranking)
 * 5. Invalid unit (rejects verification)
 * 6. Duplicate run (flags duplicate run index / seed)
 * 7. Mismatched checkpoint (flags missing / unverified checkpoint)
 * 8. No safety logs (blocks safety claims: safer, reduces unsafe actions, etc.)
 * 9. No repeated runs (caps statistical score <= 30%)
 * 10. Malformed CSV (gracefully reports errors without unhandled exceptions)
 * 11. Partial config (marks missing environment / hyperparameter keys)
 * 12. Empirical claim without verified result (blocked by anti-fabrication validator)
 * 13. Paper Mode Transition Gate (PRE_EXPERIMENTAL -> EMPIRICAL blocked without verified data, unlocks with data)
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
  computeDescriptiveStats,
  pairedTTest,
  welchTTest,
  wilcoxonSignedRankTest,
  bootstrapConfidenceInterval,
  aggregateBenchmarkGroups,
} = require('../services/statisticsEngineService');

const {
  calculateSafetyMetrics,
  generateRiskCoverageCurve,
  calculateAURC,
  validateSafetyClaims,
  computeSafetyReadinessScore,
} = require('../services/safetyValidationService');

const {
  verifyExperimentRun,
  parseResultData,
  generatePlannedExperimentVariants,
  ingestCodeAndConfig,
} = require('../services/resultIngestionService');

const {
  FORMAL_MERA_MATHEMATICAL_DEFINITIONS,
  verifyImplementationConsistency,
  verifyMathematicalCompleteness,
} = require('../services/mathematicalCompletenessService');

const {
  evaluateResearchEvidenceReadiness,
  canTransitionToEmpirical,
} = require('../services/researchEvidenceReadinessService');

const {
  deriveEmpiricalEvidenceState,
  runManuscriptIntegrityValidator,
  assembleAcademicManuscript,
} = require('../services/academicManuscriptService');

async function runEvidenceEmpiricalTestSuite() {
  console.log('================================================================================');
  console.log('🧪 DOCUMIND-AI: EMPIRICAL EVIDENCE & STATISTICAL INTEGRITY TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;

  function runTest(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(`   Error: ${err.message}`);
    }
  }

  // --- Test 1: One Result Only (Blocks error bars, SD=0) ---
  runTest('One result only (n=1 blocks error bars, SD=0, hypothesis tests require n>1)', () => {
    const singleRun = [84.5];
    const stats = computeDescriptiveStats(singleRun);
    assert.strictEqual(stats.n, 1);
    assert.strictEqual(stats.mean, 84.5);
    assert.strictEqual(stats.hasErrorBars, false, 'Single run must NEVER have error bars');
    assert.strictEqual(stats.stdDev, 0, 'Single run must have zero sample standard deviation');
    assert.strictEqual(stats.standardError, 0);

    const tTestRes = pairedTTest([84.5], [80.0]);
    assert.strictEqual(tTestRes.valid, false);
    assert.ok(tTestRes.reason.includes('At least 2'));
  });

  // --- Test 2: Multiple Seeds (n>=3 computes sample SD, SE, 95% CI, effect size) ---
  runTest('Multiple seeds (n>=3 calculates SD with Bessel correction, CI, paired t-test)', () => {
    const baselineRuns = [72.1, 73.4, 71.8, 74.0, 72.5]; // Baseline
    const proposedRuns = [83.2, 84.5, 82.9, 85.1, 84.0]; // MERA-VLA

    const stats = computeDescriptiveStats(proposedRuns);
    assert.strictEqual(stats.n, 5);
    assert.ok(stats.mean > 83.5 && stats.mean < 84.5);
    assert.ok(stats.stdDev > 0, 'Sample SD must be positive');
    assert.strictEqual(stats.hasErrorBars, true, 'Multi-seed runs must enable error bars');
    assert.ok(stats.confidenceInterval95.low < stats.mean);
    assert.ok(stats.confidenceInterval95.high > stats.mean);

    const pairedRes = pairedTTest(proposedRuns, baselineRuns);
    assert.strictEqual(pairedRes.valid, true);
    assert.ok(pairedRes.p < 0.01, 'p-value must be significant for ~11% gain');
    assert.ok(pairedRes.cohensD > 2.0, 'Effect size Cohen d must be large');
    assert.ok(pairedRes.t > 0);
  });

  // --- Test 3: Missing Source File (Keeps PROVENANCE_PENDING) ---
  runTest('Missing source file keeps status PROVENANCE_PENDING', () => {
    const runWithoutFile = {
      modelName: 'MERA-VLA',
      benchmark: 'CALVIN',
      task: 'Long-horizon Manipulation',
      metric: 'Success Rate',
      value: 84.5,
      unit: '%',
      runIndex: 1,
      sourceFileIds: [], // Empty!
      sourceFile: '',
      rawResultFile: '',
    };
    const verified = verifyExperimentRun(runWithoutFile);
    assert.strictEqual(verified.status, 'PROVENANCE_PENDING', 'Run without file must remain pending');
    assert.ok(verified.missingProvenanceFields.includes('sourceFileIds'));
  });

  // --- Test 4: Incompatible Benchmarks (Blocks cross-study ranking) ---
  runTest('Incompatible benchmarks (CALVIN vs LIBERO) cannot be ranked in single score', () => {
    const calvinRun = {
      modelName: 'MERA-VLA',
      benchmark: 'CALVIN',
      task: 'Task-ABC',
      split: 'ABC->D',
      metric: 'Success Rate',
      value: 85.0,
      unit: '%',
      status: 'VERIFIED_EXPERIMENT',
    };
    const liberoRun = {
      modelName: 'Baseline-VLA',
      benchmark: 'LIBERO',
      task: 'Spatial',
      split: 'Held-out',
      metric: 'Success Rate',
      value: 86.0,
      unit: '%',
      status: 'VERIFIED_EXPERIMENT',
    };

    const grouped = aggregateBenchmarkGroups([calvinRun, liberoRun]);
    assert.strictEqual(grouped.length, 2, 'Incompatible benchmarks must be segregated into distinct groups');
    assert.strictEqual(grouped[0].benchmark, 'CALVIN');
    assert.strictEqual(grouped[1].benchmark, 'LIBERO');
  });

  // --- Test 5: Invalid Unit Rejection ---
  runTest('Invalid unit or invalid score is rejected', () => {
    const invalidUnitRun = {
      modelName: 'MERA-VLA',
      benchmark: 'CALVIN',
      task: 'Task-1',
      metric: 'Success Rate',
      value: 85.0,
      unit: 'invalid_widgets',
      sourceFileIds: ['raw_log.txt'],
    };
    const result = verifyExperimentRun(invalidUnitRun);
    assert.strictEqual(result.status, 'REJECTED', 'Unrecognized unit must be rejected');

    const nanRun = {
      modelName: 'MERA-VLA',
      benchmark: 'CALVIN',
      task: 'Task-1',
      metric: 'Success Rate',
      value: NaN,
      unit: '%',
      sourceFileIds: ['raw_log.txt'],
    };
    const res2 = verifyExperimentRun(nanRun);
    assert.strictEqual(res2.status, 'REJECTED');
  });

  // --- Test 6: Duplicate Run Detection ---
  runTest('Duplicate run index and seed flagged', () => {
    const csvContent = `Model,Benchmark,Task,Metric,Value,Unit,Seed,RunId\nMERA-VLA,CALVIN,Task-A,Success Rate,84.0,%,42,run_01\nMERA-VLA,CALVIN,Task-A,Success Rate,84.0,%,42,run_01`;
    const parsed = parseResultData(csvContent, 'csv', 'eval.csv');
    assert.strictEqual(parsed.runs.length, 2);
    assert.strictEqual(parsed.runs[1].isDuplicate, true, 'Second identical run must be flagged duplicate');
  });

  // --- Test 7: Mismatched Checkpoint ---
  runTest('Mismatched checkpoint identified in reproducibility audit', () => {
    const project = {
      experimentRuns: [
        {
          modelName: 'MERA-VLA',
          benchmark: 'CALVIN',
          checkpoint: 'epoch_50_weights.pt',
          sourceFileIds: ['eval.csv'],
          status: 'VERIFIED_EXPERIMENT',
        },
      ],
      reproducibilityManifest: {
        checkpoint: 'different_epoch_10_weights.pt', // Mismatched!
      },
    };
    const readiness = evaluateResearchEvidenceReadiness(project);
    assert.ok(
      readiness.reproducibility.warnings.some((w) => w.includes('Checkpoint mismatch')),
      'Should warn about checkpoint mismatch'
    );
  });

  // --- Test 8: No Safety Logs Blocks Safety Claims ---
  runTest('No safety logs blocks safety claims (e.g. "safer", "prevents failures")', () => {
    const claimCheck = validateSafetyClaims(
      'Our model is significantly safer and prevents failures during deployment.',
      [] // Zero safety events!
    );
    assert.strictEqual(claimCheck.isValid, false, 'Safety claim must be blocked without data');
    assert.ok(claimCheck.blockedClaims.length > 0);

    const safetyScore = computeSafetyReadinessScore([]);
    assert.ok(safetyScore.score <= 45, 'Score without safety data must be <= 45%');
  });

  // --- Test 9: No Repeated Runs Caps Statistical Score ---
  runTest('No repeated runs caps statistical score at <= 30%', () => {
    const projectWithSingleRuns = {
      experimentRuns: [
        { modelName: 'MERA-VLA', benchmark: 'CALVIN', value: 85, status: 'VERIFIED_EXPERIMENT', seed: 42, sourceFileIds: ['f1'] },
      ],
    };
    const readiness = evaluateResearchEvidenceReadiness(projectWithSingleRuns);
    assert.ok(
      readiness.statisticalValidation.score <= 30,
      `Statistical score (${readiness.statisticalValidation.score}) must be capped at 30% without repeated runs`
    );
    assert.ok(readiness.statisticalValidation.missingItems.includes('repeated runs (>= 3 seeds)'));
  });

  // --- Test 10: Malformed CSV Graceful Error Handling ---
  runTest('Malformed CSV returns structured errors without crashing', () => {
    const malformedCsv = `invalid header\nfoo,bar\n1,2,3,4,5,6,7,8,9,10,11`;
    const res = parseResultData(malformedCsv, 'csv', 'bad.csv');
    assert.strictEqual(res.errors.length > 0, true);
    assert.strictEqual(Array.isArray(res.runs), true);
  });

  // --- Test 11: Partial Config Key Extraction ---
  runTest('Partial config marks missing keys in reproducibility manifest', () => {
    const yamlConfig = `
learning_rate: 0.0001
batch_size: 32
model:
  vla: OpenVLA
`;
    const extracted = ingestCodeAndConfig(yamlConfig, 'yaml', 'config.yaml');
    assert.strictEqual(extracted.hyperparameters.learningRate, 0.0001);
    assert.strictEqual(extracted.hyperparameters.batchSize, 32);

    const manifestCheck = evaluateResearchEvidenceReadiness({
      reproducibilityManifest: {
        learningRate: extracted.hyperparameters.learningRate,
      },
    });
    assert.ok(manifestCheck.reproducibility.missingItems.includes('CUDA version'));
    assert.ok(manifestCheck.reproducibility.missingItems.some((i) => i.toLowerCase().includes('checkpoint')));
  });

  // --- Test 12: Empirical Claim Without Verified Result Blocked ---
  runTest('Empirical claim in PRE_EXPERIMENTAL mode blocked by integrity validator', () => {
    const manuscript = {
      title: 'Memory-Augmented, Retrieval-Augmented, and Uncertainty-Aware Vision-Language-Action Models for Trustworthy Autonomous Robots',
      abstract: 'Our system achieves a 85% success rate on CALVIN benchmarks.',
      sections: [
        { heading: '1. Introduction', body: 'The proposed model outperforms RT-2 by 12%.' },
      ],
      references: ['[1] Brohan et al., RT-1'],
      manuscriptObjects: [],
    };
    const evidenceState = { mode: 'PRE_EXPERIMENTAL', hasVerifiedResults: false };
    const audit = runManuscriptIntegrityValidator(manuscript, evidenceState);
    const claimCheck = audit.find((c) => c.id === 'no_unsupported_empirical_claims');
    assert.strictEqual(claimCheck.passed, false, 'Empirical claims must fail integrity check when pre-experimental');
  });

  // --- Test 13: Mode Transition Gate ---
  runTest('Mode transition: PRE_EXPERIMENTAL -> EMPIRICAL blocked without data, succeeds with multi-run verified data', () => {
    const emptyProject = { experimentRuns: [], userResults: [] };
    const gateCheckFail = canTransitionToEmpirical(emptyProject);
    assert.strictEqual(gateCheckFail.allowed, false, 'Transition must be BLOCKED when no verified runs exist');
    assert.ok(gateCheckFail.reasons.length > 0);

    // Provide verified multi-seed runs with raw source file provenance and safety data
    const completeProject = {
      experimentRuns: [
        { id: 'run_1', modelName: 'MERA-VLA', benchmark: 'CALVIN', task: 'ABC->D', metric: 'Success Rate', value: 83.2, unit: '%', seed: 42, sourceFileIds: ['eval_42.csv'], status: 'VERIFIED_EXPERIMENT' },
        { id: 'run_2', modelName: 'MERA-VLA', benchmark: 'CALVIN', task: 'ABC->D', metric: 'Success Rate', value: 84.5, unit: '%', seed: 1337, sourceFileIds: ['eval_1337.csv'], status: 'VERIFIED_EXPERIMENT' },
        { id: 'run_3', modelName: 'MERA-VLA', benchmark: 'CALVIN', task: 'ABC->D', metric: 'Success Rate', value: 84.0, unit: '%', seed: 2024, sourceFileIds: ['eval_2024.csv'], status: 'VERIFIED_EXPERIMENT' },
        { id: 'run_base', modelName: 'Baseline-VLA', benchmark: 'CALVIN', task: 'ABC->D', metric: 'Success Rate', value: 72.0, unit: '%', seed: 42, sourceFileIds: ['base.csv'], status: 'VERIFIED_EXPERIMENT' },
      ],
      safetyEvents: [
        { id: 'se_1', experimentRunId: 'run_1', eventType: 'TASK_FAILURE', confidence: 0.85, uncertainty: 0.65, abstained: true },
        { id: 'se_2', experimentRunId: 'run_1', eventType: 'COLLISION', confidence: 0.30, uncertainty: 0.82, abstained: true },
        { id: 'se_3', experimentRunId: 'run_2', eventType: 'UNSAFE_ACTION', confidence: 0.45, uncertainty: 0.70, abstained: false },
      ],
      reproducibilityManifest: {
        repositoryUrl: 'https://github.com/documind/mera-vla',
        commitHash: '7b2a9e8d4f',
        pythonVersion: '3.10.12',
        cudaVersion: '12.1',
        gpu: 'NVIDIA A100-SXM4-80GB',
        checkpoint: 'mera_vla_step250k.pt',
      },
      evaluationProfiles: [
        { modelName: 'MERA-VLA', benchmark: 'CALVIN', task: 'ABC->D', metric: 'Success Rate', unit: '%' },
      ],
      userResults: [],
    };

    const gateCheckPass = canTransitionToEmpirical(completeProject);
    assert.strictEqual(gateCheckPass.allowed, true, `Transition should be ALLOWED: ${gateCheckPass.reasons.join('; ')}`);

    const evidenceState = deriveEmpiricalEvidenceState(completeProject);
    assert.strictEqual(evidenceState.mode, 'EMPIRICAL', 'Empirical mode must be activated');
    assert.strictEqual(evidenceState.verifiedExperimentCount, 4);
  });

  console.log('\n================================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================================\n');

  if (passed !== total) {
    throw new Error(`Test suite failed: ${total - passed} tests failed.`);
  }
}

if (require.main === module) {
  runEvidenceEmpiricalTestSuite()
    .then(() => {
      console.log('🎉 All 13 Empirical Evidence & Statistics tests passed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}

module.exports = { runEvidenceEmpiricalTestSuite };
