/**
 * Automated Scientific Benchmark Compatibility & Step 4 Test Suite
 * Tests Cases A through F as specified in Requirement 27.
 */
const assert = require('assert');
const {
  compareEvaluationProfiles,
  evaluateProjectCompatibility,
  buildEvaluationProfile,
  normalizeBenchmark,
  normalizeMetric,
  normalizeUnit,
  normalizeSplit,
  normalizeTask,
  isEfficiencyMetric,
} = require('../services/benchmarkCompatibilityService');
const { generateBenchmarkCompatibilityTable } = require('../services/academicObjectService');

console.log('── Running Benchmark Compatibility Verification Suite ──\n');

// ── Test Case A: Directly Comparable ──
// CALVIN, same task, same split, same metric, same protocol
(() => {
  console.log('Running Test Case A: Directly Comparable (CALVIN vs CALVIN matching protocol)...');
  const profileA = {
    sourceId: 'src-paper-a',
    modelName: 'OpenVLA',
    benchmark: 'CALVIN',
    dataset: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Success Rate',
    metricDefinition: 'Task completion rate across 5 consecutive sub-goals',
    unit: '%',
    evaluationEpisodes: 500,
    runs: 5,
    evaluationProtocol: 'Standard zero-shot evaluation protocol',
    checkpoint: 'release_v1',
    hardware: 'A100',
    computeBudget: '8x A100',
  };

  const profileB = {
    sourceId: 'src-paper-b',
    modelName: 'MERA-VLA',
    benchmark: 'CALVIN',
    dataset: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Success Rate',
    metricDefinition: 'Task completion rate across 5 consecutive sub-goals',
    unit: '%',
    evaluationEpisodes: 500,
    runs: 5,
    evaluationProtocol: 'Standard zero-shot evaluation protocol',
    checkpoint: 'release_v1',
    hardware: 'A100',
    computeBudget: '8x A100',
  };

  const result = compareEvaluationProfiles(profileA, profileB);
  assert.strictEqual(
    result.overallStatus,
    'DIRECTLY_COMPARABLE',
    `Expected DIRECTLY_COMPARABLE for matching CALVIN protocols, got ${result.overallStatus}`
  );
  assert.strictEqual(result.fields.benchmark, 'MATCH');
  assert.strictEqual(result.fields.task, 'MATCH');
  assert.strictEqual(result.fields.metric, 'MATCH');
  assert.strictEqual(result.fields.unit, 'MATCH');
  assert.strictEqual(result.fields.split, 'MATCH');
  console.log('✓ Case A Passed: DIRECTLY_COMPARABLE confirmed.\n');
})();

// ── Test Case B: Incompatible Benchmarks ──
// CALVIN vs LIBERO
(() => {
  console.log('Running Test Case B: Incompatible Benchmarks (CALVIN vs LIBERO)...');
  const profileA = {
    modelName: 'OpenVLA',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Success Rate',
    unit: '%',
  };

  const profileB = {
    modelName: 'Octo',
    benchmark: 'LIBERO',
    task: 'Spatial generalization',
    split: 'LIBERO-Spatial',
    metric: 'Task Success',
    unit: '%',
  };

  const result = compareEvaluationProfiles(profileA, profileB);
  assert.strictEqual(
    result.overallStatus,
    'NOT_DIRECTLY_COMPARABLE',
    `Expected NOT_DIRECTLY_COMPARABLE for CALVIN vs LIBERO, got ${result.overallStatus}`
  );
  assert.strictEqual(result.fields.benchmark, 'DIFFERENT');
  assert.ok(result.blockers.some((b) => b.includes('CALVIN') && b.includes('LIBERO')));
  console.log('✓ Case B Passed: NOT_DIRECTLY_COMPARABLE confirmed with explicit blocker.\n');
})();

// ── Test Case C: Partially Comparable ──
// CALVIN vs CALVIN, same metric, different split (e.g. ABC-D vs ABCD-D)
(() => {
  console.log('Running Test Case C: Partially Comparable (CALVIN same metric, different split)...');
  const profileA = {
    modelName: 'OpenVLA',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Success Rate',
    unit: '%',
    evaluationEpisodes: 500,
    runs: 5,
  };

  const profileB = {
    modelName: 'RoboAgent',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABCD-D',
    metric: 'Success Rate',
    unit: '%',
    evaluationEpisodes: 500,
    runs: 5,
  };

  const result = compareEvaluationProfiles(profileA, profileB);
  assert.strictEqual(
    result.overallStatus,
    'PARTIALLY_COMPARABLE',
    `Expected PARTIALLY_COMPARABLE for differing split, got ${result.overallStatus}`
  );
  assert.strictEqual(result.fields.benchmark, 'MATCH');
  assert.strictEqual(result.fields.split, 'DIFFERENT');
  console.log('✓ Case C Passed: PARTIALLY_COMPARABLE confirmed for differing split.\n');
})();

// ── Test Case D: Insufficient Information ──
// Same benchmark, split not reported
(() => {
  console.log('Running Test Case D: Insufficient Information (split NOT_REPORTED)...');
  const profileA = {
    modelName: 'Model 1',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Success Rate',
    unit: '%',
  };

  const profileB = {
    modelName: 'Model 2',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'NOT_REPORTED',
    metric: 'Success Rate',
    unit: '%',
  };

  const result = compareEvaluationProfiles(profileA, profileB);
  assert.strictEqual(
    result.overallStatus,
    'INSUFFICIENT_INFORMATION',
    `Expected INSUFFICIENT_INFORMATION when split is NOT_REPORTED, got ${result.overallStatus}`
  );
  assert.ok(result.reasons.some((r) => r.toLowerCase().includes('sufficient evaluation details')));
  console.log('✓ Case D Passed: INSUFFICIENT_INFORMATION confirmed.\n');
})();

// ── Test Case E: Heterogeneous Metrics on Same Benchmark ──
// Success Rate vs ECE (Expected Calibration Error)
(() => {
  console.log('Running Test Case E: Heterogeneous Metrics (Success Rate vs ECE)...');
  const profileA = {
    modelName: 'Model A',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Success Rate',
    unit: '%',
  };

  const profileB = {
    modelName: 'Model B',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Expected Calibration Error',
    unit: 'score',
  };

  const result = compareEvaluationProfiles(profileA, profileB);
  assert.strictEqual(
    result.overallStatus,
    'NOT_DIRECTLY_COMPARABLE',
    `Expected NOT_DIRECTLY_COMPARABLE for Success Rate vs ECE, got ${result.overallStatus}`
  );
  assert.strictEqual(result.fields.metric, 'DIFFERENT');
  console.log('✓ Case E Passed: NOT_DIRECTLY_COMPARABLE confirmed for heterogeneous metrics.\n');
})();

// ── Test Case F: Hardware Distinction (Performance vs Efficiency) ──
// Same performance protocol, different GPU -> task performance remains comparable with caveat.
// Same efficiency metric (latency/FPS), different GPU -> efficiency is NOT_DIRECTLY_COMPARABLE.
(() => {
  console.log('Running Test Case F: Hardware Distinction (Task Performance vs Latency/Efficiency)...');

  // Subcase F1: Task Performance (Success Rate) with different GPUs
  const perfA = {
    modelName: 'Model A',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Task Success Rate',
    unit: '%',
    evaluationEpisodes: 500,
    runs: 5,
    hardware: 'NVIDIA RTX 4090',
  };

  const perfB = {
    modelName: 'Model B',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Task Success Rate',
    unit: '%',
    evaluationEpisodes: 500,
    runs: 5,
    hardware: 'NVIDIA A100',
  };

  const resPerf = compareEvaluationProfiles(perfA, perfB);
  assert.strictEqual(
    resPerf.overallStatus,
    'DIRECTLY_COMPARABLE',
    `Expected task performance to remain DIRECTLY_COMPARABLE despite GPU differences, got ${resPerf.overallStatus}`
  );
  assert.ok(
    resPerf.warnings.some((w) => w.includes('Hardware difference')),
    'Expected caveat warning regarding hardware difference'
  );

  // Subcase F2: Efficiency Metric (Inference Latency) with different GPUs
  const effA = {
    modelName: 'Model A',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Inference Latency',
    unit: 'ms',
    evaluationEpisodes: 500,
    runs: 5,
    hardware: 'NVIDIA RTX 4090',
  };

  const effB = {
    modelName: 'Model B',
    benchmark: 'CALVIN',
    task: 'Long-horizon manipulation',
    split: 'ABC-D',
    metric: 'Inference Latency',
    unit: 'ms',
    evaluationEpisodes: 500,
    runs: 5,
    hardware: 'NVIDIA A100',
  };

  const resEff = compareEvaluationProfiles(effA, effB);
  assert.strictEqual(
    resEff.overallStatus,
    'NOT_DIRECTLY_COMPARABLE',
    `Expected efficiency metric with different GPUs to be NOT_DIRECTLY_COMPARABLE, got ${resEff.overallStatus}`
  );
  assert.ok(
    resEff.blockers.some((b) => b.includes('Hardware incompatibility for efficiency metric')),
    'Expected blocker for efficiency metric across differing hardware'
  );

  console.log('✓ Case F Passed: Task performance allows hardware caveat, while efficiency strictly requires matching hardware.\n');
})();

// ── Multi-Profile Clustering & Compatibility Table Generation ──
(() => {
  console.log('Testing Multi-Profile Clustering and Table Generation...');
  const profiles = [
    {
      modelName: 'OpenVLA',
      benchmark: 'CALVIN',
      task: 'Manipulation',
      split: 'ABC-D',
      metric: 'Success Rate',
      unit: '%',
    },
    {
      modelName: 'MERA-VLA',
      benchmark: 'CALVIN',
      task: 'Manipulation',
      split: 'ABC-D',
      metric: 'Success Rate',
      unit: '%',
    },
    {
      modelName: 'Octo',
      benchmark: 'LIBERO',
      task: 'Spatial Gen',
      split: 'LIBERO-Spatial',
      metric: 'Task Success',
      unit: '%',
    },
  ];

  const evalResult = evaluateProjectCompatibility(profiles);
  assert.strictEqual(evalResult.overallStatus, 'NOT_DIRECTLY_COMPARABLE');
  assert.strictEqual(evalResult.groups.length, 2, 'Expected 2 distinct clusters (CALVIN group and LIBERO group)');
  console.log(`✓ Grouping verified: Group A (${evalResult.groups[0].groupName}) and Group B (${evalResult.groups[1].groupName})`);

  const mockProject = {
    evaluationProfiles: profiles,
    benchmarkCompatibility: evalResult,
  };
  const tableObj = generateBenchmarkCompatibilityTable(mockProject);
  assert.strictEqual(tableObj.id, 'tbl-benchmark-compatibility');
  assert.ok(tableObj.latex.includes('CALVIN'));
  assert.ok(tableObj.latex.includes('LIBERO'));
  console.log('✓ Table Generation verified: tbl-benchmark-compatibility generated successfully.');
})();

console.log('\n🎉 ALL BENCHMARK COMPATIBILITY TESTS PASSED SUCCESSFULLY! 🎉');
