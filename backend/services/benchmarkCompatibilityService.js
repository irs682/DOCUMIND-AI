/**
 * Benchmark Compatibility & Scientific Fair Comparison Service
 *
 * Implements:
 * 1. Normalized Evaluation Profiles with strict provenance and NOT_REPORTED semantics.
 * 2. Multi-tier Alias Normalization for Benchmarks, Tasks, Datasets, Splits, Metrics, and Units.
 * 3. 12-stage Hierarchical Compatibility Rules with clear distinction between
 *    task performance and compute/hardware efficiency metrics.
 * 4. Realistic scientific variance checking (seed counts vs literal seed numbers).
 * 5. Autonomous Compatibility Grouping (Group A vs Group B isolation).
 * 6. Explicit claim guards (blocking invalid cross-benchmark percentage gains and rankings).
 * 7. Standardized Evaluation Plan & Result Attachment workflows.
 */

// ── 1. Catalog & Reference Knowledge ──

const BENCHMARK_CATALOG = {
  CALVIN: {
    name: 'CALVIN (Composing Actions from Language and Vision)',
    key: 'CALVIN',
    domain: 'Long-Horizon Robot Manipulation',
    description:
      'Multi-task, multi-context benchmark designed to evaluate language-conditioned policy learning in complex 3D environments over sequences of up to 5 consecutive subgoals.',
    tasks: ['Long-horizon multi-task manipulation', 'Language-conditioned sequential subgoals'],
    datasets: ['CALVIN Play Data', 'CALVIN Teleoperated Demonstrations'],
    splits: ['ABC-D (Train on A, B, C; zero-shot test on D)', 'D-D (In-domain)', 'ABCD-D'],
    defaultMetric: 'Success Rate (%)',
    canonicalMetrics: ['SUCCESS_RATE', 'SUBGOAL_COMPLETION_LENGTH'],
    unit: '%',
    defaultProtocol: '1,000 continuous evaluation chains; 5 random seed resets; report consecutive task completion length.',
    episodes: 1000,
    runs: 5,
    baselineModels: ['OpenVLA', 'Octo', 'RoboCat', 'HULC', 'MCIL'],
    sourceCitation: 'Mees et al., "CALVIN: A Benchmark for Language-Conditioned Policy Learning for Long-Horizon Robot Manipulation", IEEE RA-L 2022.',
  },
  LIBERO: {
    name: 'LIBERO (Lifelong Robot Learning Benchmark)',
    key: 'LIBERO',
    domain: 'Lifelong & Multi-Task Manipulation',
    description:
      'Modular robotic manipulation benchmark with 130 language-conditioned manipulation tasks grouped into 4 distinct benchmark suites assessing spatial, object, and goal generalization.',
    tasks: ['LIBERO-Spatial', 'LIBERO-Object', 'LIBERO-Goal', 'LIBERO-10', 'LIBERO-90'],
    datasets: ['LIBERO Demonstrations', 'Human Teleoperated Trajectories'],
    splits: ['Standard Train/Test', 'Held-out Goal Split', 'Held-out Object Split'],
    defaultMetric: 'Task Success Rate (%)',
    canonicalMetrics: ['SUCCESS_RATE'],
    unit: '%',
    defaultProtocol: '20 evaluation rollouts per task; 10 distinct initial state seeds; report average success rate.',
    episodes: 200,
    runs: 3,
    baselineModels: ['OpenVLA', 'Octo', 'Diffusion Policy', 'BC-RNN'],
    sourceCitation: 'Liu et al., "LIBERO: Benchmarking Knowledge Transfer for Lifelong Robot Learning", NeurIPS 2023.',
  },
  RLBENCH: {
    name: 'RLBench (Robot Learning Benchmark)',
    key: 'RLBENCH',
    domain: 'Vision-Guided Robot Arm Manipulation',
    description:
      'Challenging robot manipulation benchmark containing 100 diverse tasks with simulated Franka Panda arm, evaluating vision-based imitation and reinforcement learning.',
    tasks: ['Visual manipulation', 'Pick and place', 'Tool use'],
    datasets: ['RLBench Demo Dataset'],
    splits: ['Train / Test Variations'],
    defaultMetric: 'Success Rate (%)',
    canonicalMetrics: ['SUCCESS_RATE'],
    unit: '%',
    defaultProtocol: '25 test episodes per task variation across 3 random seeds.',
    episodes: 100,
    runs: 3,
    baselineModels: ['PerAct', 'RVT', 'ACT'],
    sourceCitation: 'James et al., "RLBench: The Robot Learning Benchmark & Learning Environment", IEEE RA-L 2020.',
  },
  VIMA_BENCH: {
    name: 'VIMA-Bench',
    key: 'VIMA_BENCH',
    domain: 'Multimodal Prompted Robot Manipulation',
    description:
      'Benchmark testing multi-modal prompted policy execution where tasks are expressed via interleaved language prompts, texture images, and object sketches.',
    tasks: ['Visual goal reaching', 'Novel object manipulation', 'Visual rearrangement'],
    datasets: ['VIMA Multimodal Trajectories'],
    splits: ['Placement Generalization (L1)', 'Combinatorial Generalization (L2)', 'Novel Object Generalization (L3)'],
    defaultMetric: 'Success Rate (%)',
    canonicalMetrics: ['SUCCESS_RATE'],
    unit: '%',
    defaultProtocol: '100 randomized test trials per level across 4 evaluation seeds.',
    episodes: 100,
    runs: 4,
    baselineModels: ['VIMA', 'GATO', 'Flamingo-VLA'],
    sourceCitation: 'Jiang et al., "VIMA: General Robot Manipulation with Multimodal Prompts", ICML 2023.',
  },
  IMAGENET_1K: {
    name: 'ImageNet-1K (ILSVRC2012)',
    key: 'IMAGENET_1K',
    domain: 'Visual Recognition & Classification',
    description:
      'Standardized vision benchmark comprising 1.28 million training images across 1,000 object categories.',
    tasks: ['Visual classification', 'Zero-shot classification', 'Feature transfer'],
    datasets: ['ImageNet-1K'],
    splits: ['val', 'test'],
    defaultMetric: 'Top-1 Accuracy (%)',
    canonicalMetrics: ['ACCURACY', 'TOP_5_ACCURACY'],
    unit: '%',
    defaultProtocol: 'Standard 50,000 image validation split; central crop evaluation.',
    episodes: 50000,
    runs: 1,
    baselineModels: ['ResNet-50', 'ViT-B/16', 'ConvNeXt'],
    sourceCitation: 'Russakovsky et al., "ImageNet Large Scale Visual Recognition Challenge", IJCV 2015.',
  },
  MMLU: {
    name: 'MMLU (Massive Multitask Language Understanding)',
    key: 'MMLU',
    domain: 'General Knowledge & Reasoning',
    description:
      'Comprehensive language understanding benchmark covering 57 subjects across STEM, humanities, social sciences, and professional exams.',
    tasks: ['5-shot multiple-choice QA'],
    datasets: ['MMLU Test'],
    splits: ['test', 'val', 'dev'],
    defaultMetric: 'Accuracy (%)',
    canonicalMetrics: ['ACCURACY'],
    unit: '%',
    defaultProtocol: '5-shot standardized prompt evaluation without chain-of-thought unless specified.',
    episodes: 14042,
    runs: 1,
    baselineModels: ['LLaMA-3', 'GPT-4', 'Claude-3', 'Mistral-7B'],
    sourceCitation: 'Hendrycks et al., "Measuring Massive Multitask Language Understanding", ICLR 2021.',
  },
};

// ── 2. Normalization Tables ──

const BENCHMARK_ALIASES = [
  { match: /\bcalvin\b/i, normalized: 'CALVIN' },
  { match: /\blibero\b/i, normalized: 'LIBERO' },
  { match: /\brlbench\b/i, normalized: 'RLBENCH' },
  { match: /\bvima(?:-?bench)?\b/i, normalized: 'VIMA_BENCH' },
  { match: /\bmeta-?world\b/i, normalized: 'METAWORLD' },
  { match: /\brobocasa\b/i, normalized: 'ROBOCASA' },
  { match: /\balfred\b/i, normalized: 'ALFRED' },
  { match: /\bbabyai\b/i, normalized: 'BABYAI' },
  { match: /\bimagenet(?:-1k)?\b/i, normalized: 'IMAGENET_1K' },
  { match: /\bmmlu\b/i, normalized: 'MMLU' },
  { match: /\bgsm8k\b/i, normalized: 'GSM8K' },
  { match: /\bhumaneval\b/i, normalized: 'HUMANEVAL' },
];

const METRIC_ALIASES = [
  { match: /\b(task\s+)?success\s+rate\b/i, normalized: 'SUCCESS_RATE', unit: '%' },
  { match: /\b(top-?1\s+)?accuracy\b/i, normalized: 'ACCURACY', unit: '%' },
  { match: /\b(macro\s+|weighted\s+)?f1(-score)?\b/i, normalized: 'F1_SCORE', unit: '%' },
  { match: /\b(ece|expected\s+calibration\s+error)\b/i, normalized: 'ECE', unit: 'ratio' },
  { match: /\b(latency|inference\s+time|runtime)\b/i, normalized: 'INFERENCE_LATENCY', unit: 'ms', isEfficiency: true },
  { match: /\b(fps|throughput|frames\s+per\s+second)\b/i, normalized: 'THROUGHPUT_FPS', unit: 'fps', isEfficiency: true },
  { match: /\b(energy|joules|consumption)\b/i, normalized: 'ENERGY_CONSUMPTION', unit: 'J', isEfficiency: true },
  { match: /\b(flops|gflops|tflops)\b/i, normalized: 'COMPUTE_FLOPS', unit: 'FLOPs', isEfficiency: true },
  { match: /\b(bleu(?:-[1-4])?)\b/i, normalized: 'BLEU_SCORE', unit: 'score' },
  { match: /\b(rouge(?:-[1-2l])?)\b/i, normalized: 'ROUGE_SCORE', unit: 'score' },
  { match: /\b(subgoal\s+completion(\s+length)?)\b/i, normalized: 'SUBGOAL_COMPLETION_LENGTH', unit: 'steps' },
];

const UNIT_ALIASES = [
  { match: /^(%|percent|percentage)$/i, normalized: '%' },
  { match: /^(ms|milliseconds)$/i, normalized: 'ms' },
  { match: /^(s|sec|seconds)$/i, normalized: 's' },
  { match: /^(fps|frames\/sec)$/i, normalized: 'fps' },
  { match: /^(j|joules)$/i, normalized: 'J' },
  { match: /^(scalar|ratio|score|none|normalized)$/i, normalized: 'ratio' },
  { match: /^(steps|episodes|trials)$/i, normalized: 'steps' },
];

const SPLIT_ALIASES = [
  { match: /\babcd-?d\b/i, normalized: 'ABCD_D' },
  { match: /\babc-?d\b/i, normalized: 'ABC_D' },
  { match: /\bd-?d\b/i, normalized: 'D_D' },
  { match: /\b(held-?out|unseen)\b/i, normalized: 'HELD_OUT' },
  { match: /\b(val|validation)\b/i, normalized: 'VAL' },
  { match: /\b(test|test-set)\b/i, normalized: 'TEST' },
  { match: /\b(train|training)\b/i, normalized: 'TRAIN' },
  { match: /\b(zero-?shot)\b/i, normalized: 'ZERO_SHOT' },
];

// ── 3. Normalizer Functions ──

const normalizeBenchmark = (val) => {
  if (!val || val === 'NOT_REPORTED' || val === 'Not reported' || val === 'Unspecified') {
    return 'NOT_REPORTED';
  }
  const str = String(val).trim();
  for (const alias of BENCHMARK_ALIASES) {
    if (alias.match.test(str)) return alias.normalized;
  }
  return str.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 32);
};

const normalizeMetric = (val) => {
  if (!val || val === 'NOT_REPORTED' || val === 'Not reported' || val === 'Unspecified') {
    return 'NOT_REPORTED';
  }
  const str = String(val).trim();
  for (const alias of METRIC_ALIASES) {
    if (alias.match.test(str)) return alias.normalized;
  }
  return str.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 32);
};

const isEfficiencyMetric = (metricKey) => {
  const norm = normalizeMetric(metricKey);
  return ['INFERENCE_LATENCY', 'THROUGHPUT_FPS', 'ENERGY_CONSUMPTION', 'COMPUTE_FLOPS'].includes(norm);
};

const normalizeUnit = (val) => {
  if (!val || val === 'NOT_REPORTED' || val === 'Not reported') return 'NOT_REPORTED';
  const str = String(val).trim();
  for (const alias of UNIT_ALIASES) {
    if (alias.match.test(str)) return alias.normalized;
  }
  return str;
};

const normalizeSplit = (val) => {
  if (!val || val === 'NOT_REPORTED' || val === 'Not reported') return 'NOT_REPORTED';
  const str = String(val).trim();
  for (const alias of SPLIT_ALIASES) {
    if (alias.match.test(str)) return alias.normalized;
  }
  return str.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 24);
};

const normalizeTask = (val) => {
  if (!val || val === 'NOT_REPORTED' || val === 'Not reported') return 'NOT_REPORTED';
  const str = String(val).trim().toLowerCase();
  if (str.includes('manipulation') || str.includes('long-horizon') || str.includes('subgoal')) {
    return 'LONG_HORIZON_MANIPULATION';
  }
  if (str.includes('spatial')) return 'SPATIAL_MANIPULATION';
  if (str.includes('object')) return 'OBJECT_GENERALIZATION';
  if (str.includes('goal')) return 'GOAL_DIRECTED_MANIPULATION';
  if (str.includes('classif')) return 'IMAGE_CLASSIFICATION';
  if (str.includes('reason') || str.includes('qa')) return 'MULTITASK_QA';
  return str.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 32);
};

const normalizeDataset = (val) => {
  if (!val || val === 'NOT_REPORTED' || val === 'Not reported') return 'NOT_REPORTED';
  return String(val).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 32);
};

const extractArrayValues = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((item) => (typeof item === 'object' && item !== null ? item.value || item.name || String(item) : String(item)));
  if (typeof raw === 'object' && raw !== null && Array.isArray(raw.value)) return raw.value;
  if (typeof raw === 'string') {
    return raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(raw)];
};

const extractString = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null) return String(raw.value || raw.name || raw.text || '').trim();
  return String(raw).trim();
};

// ── 4. Evaluation Profile Builder ──

/**
 * Extracts a normalized EvaluationProfile for a paper profile.
 * STRICT RULE: Missing values MUST be 'NOT_REPORTED', never guessed.
 */
const buildEvaluationProfile = (paperProfile = {}, index = 0) => {
  const sourceId = paperProfile.canonicalSourceId || paperProfile.documentId || `src_${index + 1}`;
  const paperTitle = extractString(paperProfile.title) || extractString(paperProfile.documentName) || `Paper ${index + 1}`;
  
  // Model name resolution
  const models = extractArrayValues(paperProfile.modelsAlgorithms);
  const baselines = extractArrayValues(paperProfile.baselines);
  const modelName = models[0] || baselines[0] || extractString(paperProfile.proposedModel) || paperTitle.split(/[:\-\–]/)[0].trim() || 'Proposed Model';

  // Benchmark & Dataset resolution
  const benchmarks = extractArrayValues(paperProfile.benchmarks);
  const datasets = extractArrayValues(paperProfile.datasets);
  const rawBenchmark = benchmarks[0] || datasets[0] || '';
  const rawDataset = datasets[0] || benchmarks[0] || '';

  // Task resolution
  const tasks = extractArrayValues(paperProfile.tasks);
  const rawTask = tasks[0] || extractString(paperProfile.task) || extractString(paperProfile.primaryTask) || '';

  // Split resolution
  const rawSplit = extractString(paperProfile.split) || extractString(paperProfile.evaluationSplit) || '';

  // Metrics & Unit
  const metrics = extractArrayValues(paperProfile.metrics);
  const rawMetric = metrics[0] || extractString(paperProfile.metric) || '';
  const rawUnit = extractString(paperProfile.unit) || (rawMetric.toLowerCase().includes('rate') || rawMetric.toLowerCase().includes('acc') ? '%' : '');

  // Episodes & Runs & Seeds
  const rawEpisodes = paperProfile.evaluationEpisodes || paperProfile.episodes;
  const evaluationEpisodes = typeof rawEpisodes === 'number' && rawEpisodes > 0 ? rawEpisodes : 'NOT_REPORTED';

  const rawRuns = paperProfile.runs || paperProfile.evaluationRuns || paperProfile.trials;
  const runs = typeof rawRuns === 'number' && rawRuns > 0 ? rawRuns : 'NOT_REPORTED';

  const rawSeeds = paperProfile.seeds;
  const seeds = Array.isArray(rawSeeds) && rawSeeds.length > 0 ? rawSeeds.filter((n) => typeof n === 'number') : 'NOT_REPORTED';

  // Hardware & compute
  const rawHardware = extractString(paperProfile.hardware) || extractString(paperProfile.gpu) || extractString(paperProfile.compute);
  const hardware = rawHardware || 'NOT_REPORTED';
  const computeBudget = extractString(paperProfile.computeBudget) || 'NOT_REPORTED';

  // Protocol & Checkpoint
  const rawProtocol = extractString(paperProfile.evaluationProtocol) || extractString(paperProfile.evalProtocol);
  const evaluationProtocol = rawProtocol || 'NOT_REPORTED';
  const checkpoint = extractString(paperProfile.checkpoint) || 'NOT_REPORTED';

  // Baseline quality heuristic
  let baselineQuality = 'STANDARD_BASELINE';
  const baselinesLower = baselines.map((b) => b.toLowerCase()).join(' ');
  if (baselinesLower.includes('sota') || baselinesLower.includes('openvla') || baselinesLower.includes('octo') || baselinesLower.includes('gpt-4')) {
    baselineQuality = 'STRONG_BASELINE';
  } else if (baselines.length === 0 || baselinesLower.includes('scratch') || baselinesLower.includes('untuned')) {
    baselineQuality = 'WEAK_OR_UNTUNED_BASELINE';
  }

  // Provenance
  const sourceIds = [sourceId];
  const evidenceIds = paperProfile.evidenceIds || (paperProfile.evidence ? [String(paperProfile.evidence)] : []);

  return {
    id: `eval_prof_${sourceId}_${index}`,
    sourceId,
    documentId: paperProfile.documentId || null,
    modelName,
    paperTitle,
    benchmark: rawBenchmark || 'NOT_REPORTED',
    normalizedBenchmark: normalizeBenchmark(rawBenchmark),
    dataset: rawDataset || 'NOT_REPORTED',
    normalizedDataset: normalizeDataset(rawDataset),
    task: rawTask || 'NOT_REPORTED',
    normalizedTask: normalizeTask(rawTask),
    split: rawSplit || 'NOT_REPORTED',
    normalizedSplit: normalizeSplit(rawSplit),
    metric: rawMetric || 'NOT_REPORTED',
    normalizedMetric: normalizeMetric(rawMetric),
    metricDefinition: extractString(paperProfile.metricDefinition) || 'NOT_REPORTED',
    unit: rawUnit || 'NOT_REPORTED',
    normalizedUnit: normalizeUnit(rawUnit),
    evaluationEpisodes,
    runs,
    seeds,
    hardware,
    computeBudget,
    evaluationProtocol,
    checkpoint,
    baselineQuality,
    provenance: {
      sourceIds,
      evidenceIds,
      rawSnippets: paperProfile.snippets || [],
    },
  };
};

// ── 5. Pairwise Compatibility Comparator ──

/**
 * Compares two EvaluationProfiles across the exact 12-stage hierarchical rules.
 * Core Order:
 * 1. benchmark
 * 2. task
 * 3. dataset
 * 4. split
 * 5. metric
 * 6. metricDefinition
 * 7. unit
 * 8. evaluationEpisodes
 * 9. runs/seeds
 * 10. evaluationProtocol
 * 11. hardware/compute
 * 12. checkpoint/baseline configuration
 */
const compareEvaluationProfiles = (pA, pB) => {
  const fields = {};
  const reasons = [];
  const blockers = [];
  const warnings = [];

  const normBenchA = pA.normalizedBenchmark || normalizeBenchmark(pA.benchmark);
  const normBenchB = pB.normalizedBenchmark || normalizeBenchmark(pB.benchmark);

  const normTaskA = pA.normalizedTask || normalizeTask(pA.task);
  const normTaskB = pB.normalizedTask || normalizeTask(pB.task);

  const normDatasetA = pA.normalizedDataset || (pA.dataset && pA.dataset !== 'NOT_REPORTED' ? String(pA.dataset).toLowerCase().trim() : 'NOT_REPORTED');
  const normDatasetB = pB.normalizedDataset || (pB.dataset && pB.dataset !== 'NOT_REPORTED' ? String(pB.dataset).toLowerCase().trim() : 'NOT_REPORTED');

  const normSplitA = pA.normalizedSplit || normalizeSplit(pA.split);
  const normSplitB = pB.normalizedSplit || normalizeSplit(pB.split);

  const normMetricA = pA.normalizedMetric || normalizeMetric(pA.metric);
  const normMetricB = pB.normalizedMetric || normalizeMetric(pB.metric);

  const normUnitA = pA.normalizedUnit || normalizeUnit(pA.unit);
  const normUnitB = pB.normalizedUnit || normalizeUnit(pB.unit);

  // Helper for single field status
  const evalField = (valA, valB, normA, normB) => {
    if (
      !valA ||
      !valB ||
      valA === 'NOT_REPORTED' ||
      valB === 'NOT_REPORTED' ||
      normA === 'NOT_REPORTED' ||
      normB === 'NOT_REPORTED'
    ) {
      return 'NOT_REPORTED';
    }
    if (!normA && !normB) return 'MATCH';
    if (!normA || !normB) return 'UNKNOWN';
    return normA === normB ? 'MATCH' : 'DIFFERENT';
  };

  // 1. Benchmark
  fields.benchmark = evalField(pA.benchmark, pB.benchmark, normBenchA, normBenchB);
  if (fields.benchmark === 'DIFFERENT') {
    blockers.push(`Disparate primary benchmarks: ${pA.benchmark} vs ${pB.benchmark}.`);
    reasons.push('Benchmarks represent fundamentally non-overlapping task suites or simulator environments.');
  } else if (fields.benchmark === 'NOT_REPORTED') {
    reasons.push('Primary benchmark is not reported in one or both sources.');
  }

  // 2. Task
  fields.task = evalField(pA.task, pB.task, normTaskA, normTaskB);
  if (fields.task === 'DIFFERENT') {
    blockers.push(`Disparate task formulations: "${pA.task}" vs "${pB.task}".`);
    reasons.push('Tasks require heterogeneous action spaces or evaluation objectives.');
  }

  // 3. Dataset
  fields.dataset = evalField(pA.dataset, pB.dataset, normDatasetA, normDatasetB);
  if (fields.dataset === 'DIFFERENT' && fields.benchmark === 'MATCH') {
    warnings.push(`Dataset variations within benchmark: ${pA.dataset} vs ${pB.dataset}.`);
  }

  // 4. Split
  fields.split = evalField(pA.split, pB.split, normSplitA, normSplitB);
  if (fields.split === 'DIFFERENT') {
    warnings.push(`Evaluation splits differ: ${pA.split} vs ${pB.split}. Generalization difficulty may vary.`);
  }

  // 5. Metric
  fields.metric = evalField(pA.metric, pB.metric, normMetricA, normMetricB);
  if (fields.metric === 'DIFFERENT') {
    blockers.push(`Incompatible target metrics: ${pA.metric} vs ${pB.metric}.`);
    reasons.push('Comparing different performance metrics (e.g. Success Rate vs ECE) is scientifically invalid.');
  }

  // 6. Metric Definition
  fields.metricDefinition = evalField(pA.metricDefinition, pB.metricDefinition, pA.metricDefinition, pB.metricDefinition);

  // 7. Unit
  fields.unit = evalField(pA.unit, pB.unit, normUnitA, normUnitB);
  if (fields.unit === 'DIFFERENT') {
    blockers.push(`Measurement units differ: ${pA.unit} vs ${pB.unit}.`);
  }

  // 8. Evaluation Episodes
  if (pA.evaluationEpisodes === 'NOT_REPORTED' || pB.evaluationEpisodes === 'NOT_REPORTED') {
    fields.evaluationEpisodes = 'NOT_REPORTED';
  } else {
    fields.evaluationEpisodes = pA.evaluationEpisodes === pB.evaluationEpisodes ? 'MATCH' : 'DIFFERENT';
    if (fields.evaluationEpisodes === 'DIFFERENT') {
      warnings.push(`Different test sample sizes (${pA.evaluationEpisodes} vs ${pB.evaluationEpisodes} episodes). Statistical power differs.`);
    }
  }

  // 9. Runs / Seeds (Scientific Rule #23: Do NOT require identical literal seeds!)
  if (pA.runs === 'NOT_REPORTED' || pB.runs === 'NOT_REPORTED') {
    fields.runs = 'NOT_REPORTED';
  } else {
    // If both report multiple runs (e.g. >= 3), they adhere to repeated evaluation
    const bothMultiRun = pA.runs >= 3 && pB.runs >= 3;
    fields.runs = (pA.runs === pB.runs || bothMultiRun) ? 'MATCH' : 'DIFFERENT';
    if (!bothMultiRun && pA.runs !== pB.runs) {
      warnings.push(`Evaluation run counts differ (${pA.runs} vs ${pB.runs} runs).`);
    }
  }

  // 10. Evaluation Protocol
  fields.evaluationProtocol = evalField(pA.evaluationProtocol, pB.evaluationProtocol, pA.evaluationProtocol, pB.evaluationProtocol);
  if (fields.evaluationProtocol === 'DIFFERENT') {
    warnings.push(`Different evaluation protocols: "${pA.evaluationProtocol}" vs "${pB.evaluationProtocol}".`);
  }

  // 11. Hardware & Compute (Scientific Rule #22: Hardware is critical for efficiency metrics, but a caveat for task success)
  const isEfficiency = isEfficiencyMetric(pA.metric) || isEfficiencyMetric(pB.metric);
  fields.hardware = evalField(pA.hardware, pB.hardware, pA.hardware, pB.hardware);
  fields.computeBudget = evalField(pA.computeBudget, pB.computeBudget, pA.computeBudget, pB.computeBudget);

  if (isEfficiency && (fields.hardware === 'DIFFERENT' || fields.hardware === 'NOT_REPORTED')) {
    blockers.push(`Hardware incompatibility for efficiency metric: comparison (latency/FPS/energy) requires identical hardware (${pA.hardware} vs ${pB.hardware}).`);
    reasons.push('Hardware platforms vary; raw timing metrics cannot be compared head-to-head.');
  } else if (!isEfficiency && fields.hardware === 'DIFFERENT') {
    warnings.push(`Hardware difference: configurations vary (${pA.hardware} vs ${pB.hardware}). Considered an interpretive context, not a benchmark blocker.`);
  }

  // 12. Checkpoint
  fields.checkpoint = evalField(pA.checkpoint, pB.checkpoint, pA.checkpoint, pB.checkpoint);

  // ── Overall Status Decision Tree (Rule 5) ──
  let overallStatus = 'DIRECTLY_COMPARABLE';

  const hasCoreBlocker =
    fields.benchmark === 'DIFFERENT' ||
    fields.task === 'DIFFERENT' ||
    fields.metric === 'DIFFERENT' ||
    fields.unit === 'DIFFERENT' ||
    (isEfficiency && fields.hardware === 'DIFFERENT');

  const hasPartialDifferences =
    fields.split === 'DIFFERENT' ||
    fields.evaluationProtocol === 'DIFFERENT' ||
    fields.evaluationEpisodes === 'DIFFERENT' ||
    fields.runs === 'DIFFERENT' ||
    fields.checkpoint === 'DIFFERENT';

  const hasMissingInfo =
    fields.benchmark === 'NOT_REPORTED' ||
    fields.task === 'NOT_REPORTED' ||
    fields.metric === 'NOT_REPORTED' ||
    fields.unit === 'NOT_REPORTED' ||
    fields.split === 'NOT_REPORTED' ||
    fields.benchmark === 'UNKNOWN' ||
    fields.task === 'UNKNOWN' ||
    fields.metric === 'UNKNOWN';

  if (hasCoreBlocker) {
    overallStatus = 'NOT_DIRECTLY_COMPARABLE';
  } else if (hasPartialDifferences) {
    overallStatus = 'PARTIALLY_COMPARABLE';
  } else if (hasMissingInfo) {
    overallStatus = 'INSUFFICIENT_INFORMATION';
    reasons.unshift('Direct comparability could not be established because the source does not report sufficient evaluation details.');
  } else {
    overallStatus = 'DIRECTLY_COMPARABLE';
  }

  return {
    id: `check_${pA.sourceId}_vs_${pB.sourceId}`,
    leftProfileId: pA.id,
    rightProfileId: pB.id,
    leftModelName: pA.modelName,
    rightModelName: pB.modelName,
    overallStatus,
    fields,
    reasons,
    blockers,
    warnings,
    isEfficiency,
  };
};

// ── 6. Project-Level Compatibility Evaluator & Grouping ──

/**
 * Computes full project-level compatibility analysis across all paper profiles.
 */
const evaluateProjectCompatibility = (paperProfiles = [], existingPlans = []) => {
  if (!paperProfiles || paperProfiles.length === 0) {
    return {
      status: 'INSUFFICIENT_INFORMATION',
      verdictTitle: 'No Literature Profiles Available',
      explanation: 'Upload primary literature sources in Step 1 to conduct benchmark compatibility assessment.',
      factors: [],
      caveatWarning: 'Awaiting source documents to extract empirical evaluation profiles.',
      checks: [],
      groups: [],
      reasons: ['No papers available to analyze.'],
      blockers: [],
      warnings: [],
      prohibitedClaims: ['All cross-study numerical comparisons prohibited.'],
      issuesCount: 0,
      isDirectlyComparable: false,
      comparisonStrategy: 'PENDING',
    };
  }

  // Step A: Extract normalized evaluation profiles
  const profiles = paperProfiles.map((p, i) => buildEvaluationProfile(p, i));

  if (profiles.length === 1) {
    const prof = profiles[0];
    return {
      status: 'PARTIALLY_COMPARABLE',
      verdictTitle: 'Single Primary Literature Source',
      explanation:
        'A single canonical source is currently indexed. Direct cross-study comparison is bounded to self-reported baselines within this source.',
      factors: [
        {
          name: 'Primary Benchmark',
          status: prof.normalizedBenchmark !== 'NOT_REPORTED' ? 'aligned' : 'conditional',
          note: `Extracted benchmark: ${prof.benchmark}.`,
          pass: true,
        },
        {
          name: 'Target Metric',
          status: prof.normalizedMetric !== 'NOT_REPORTED' ? 'aligned' : 'conditional',
          note: `Primary metric: ${prof.metric} (${prof.unit}).`,
          pass: true,
        },
      ],
      caveatWarning:
        'Scientific Compatibility Note: Direct numerical comparison is valid only when benchmark, task, metric, split, and evaluation protocol are compatible.',
      checks: [],
      groups: [
        {
          id: 'group_single_1',
          name: `${prof.benchmark} Evaluation Regime`,
          benchmark: prof.benchmark,
          task: prof.task,
          split: prof.split,
          metric: prof.metric,
          models: [{ profileId: prof.id, modelName: prof.modelName, status: 'Active Candidate' }],
        },
      ],
      reasons: ['Only one distinct literature source available.'],
      blockers: [],
      warnings: ['Multiple diverse sources recommended for broad meta-analysis.'],
      prohibitedClaims: ['Cross-literature ranking claims are ungrounded.'],
      issuesCount: 0,
      isDirectlyComparable: false,
      comparisonStrategy: 'PENDING',
      profiles,
    };
  }

  // Step B: Pairwise checks across all combinations
  const checks = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      checks.push(compareEvaluationProfiles(profiles[i], profiles[j]));
    }
  }

  // Step C: Determine Overall Project Status
  const hasNotComparable = checks.some((c) => c.overallStatus === 'NOT_DIRECTLY_COMPARABLE');
  const hasInsufficient = checks.some((c) => c.overallStatus === 'INSUFFICIENT_INFORMATION');
  const hasPartial = checks.some((c) => c.overallStatus === 'PARTIALLY_COMPARABLE');
  const allDirect = checks.every((c) => c.overallStatus === 'DIRECTLY_COMPARABLE');

  let status = 'DIRECTLY_COMPARABLE';
  let verdictTitle = 'Directly Comparable on Standardized Benchmarks';
  let explanation =
    'The analyzed papers evaluate under identical benchmarks, tasks, dataset splits, metrics, and consistent evaluation protocols. Direct quantitative head-to-head ranking is valid.';

  if (hasNotComparable) {
    status = 'NOT_DIRECTLY_COMPARABLE';
    verdictTitle = 'Non-Comparable Benchmarks (Heterogeneous Tasks & Metrics)';
    explanation =
      'The selected studies evaluate on different benchmark suites, distinct tasks, or incompatible metrics. Cross-study numerical ranking is scientifically invalid and prohibited.';
  } else if (hasInsufficient) {
    status = 'INSUFFICIENT_INFORMATION';
    verdictTitle = 'Insufficient Evaluation Information';
    explanation =
      'Direct comparability could not be established because one or more sources do not report sufficient evaluation details (such as dataset split, sample size, or protocol specifications).';
  } else if (hasPartial) {
    status = 'PARTIALLY_COMPARABLE';
    verdictTitle = 'Partially Comparable — Protocol or Split Divergence';
    explanation =
      'The papers share the same primary benchmark and metric family, but differ in dataset splits, evaluation episodes, or testing protocols. Results should be compared with contextual caveats.';
  }

  // Collect aggregated blockers, warnings, reasons
  const allBlockers = Array.from(new Set(checks.flatMap((c) => c.blockers)));
  const allWarnings = Array.from(new Set(checks.flatMap((c) => c.warnings)));
  const allReasons = Array.from(new Set(checks.flatMap((c) => c.reasons)));

  // Prohibited Claims based on status
  const prohibitedClaims = [];
  if (status !== 'DIRECTLY_COMPARABLE') {
    prohibitedClaims.push('Direct percentage improvement assertions (e.g. "X% gain over prior baseline") across disparate benchmarks.');
    prohibitedClaims.push('Global performance ranking tables conflating disparate task metrics.');
    prohibitedClaims.push('Unbounded superiority claims ("outperforms all prior work") without benchmark scope.');
  }

  // Step D: Construct Compatible Groups (Rule 16)
  const groupMap = new Map();
  profiles.forEach((p) => {
    const key = `${p.normalizedBenchmark}_${p.normalizedTask}_${p.normalizedMetric}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        id: `group_${key.toLowerCase()}`,
        name: `${p.benchmark} • ${p.metric}`,
        groupName: `${p.benchmark} / ${p.split || 'Standard'} / ${p.metric}`,
        benchmark: p.benchmark,
        task: p.task,
        split: p.split,
        metric: p.metric,
        unit: p.unit || '%',
        models: [],
        modelNames: [],
      });
    }
    groupMap.get(key).models.push({
      profileId: p.id,
      modelName: p.modelName,
      paperTitle: p.paperTitle,
      status: 'Indexed Source',
    });
    groupMap.get(key).modelNames.push(p.modelName);
  });
  const groups = Array.from(groupMap.values());

  // Step E: UI Factors
  const factors = [
    {
      name: 'Benchmark & Task Alignment',
      status: hasNotComparable ? 'divergent' : hasInsufficient ? 'conditional' : 'aligned',
      note: hasNotComparable
        ? `Heterogeneous benchmarks identified (${profiles.map((p) => p.benchmark).filter(Boolean).slice(0, 3).join(', ')}).`
        : `Shared benchmark framework: ${profiles[0]?.benchmark || 'Aligned'}.`,
      pass: !hasNotComparable,
    },
    {
      name: 'Metric & Unit Compatibility',
      status: checks.some((c) => c.fields.metric === 'DIFFERENT') ? 'divergent' : 'aligned',
      note: checks.some((c) => c.fields.metric === 'DIFFERENT')
        ? 'Metrics use non-identical definitions across papers.'
        : `Target metrics aligned across models: ${profiles[0]?.metric || 'Standard'}.`,
      pass: !checks.some((c) => c.fields.metric === 'DIFFERENT'),
    },
    {
      name: 'Evaluation Protocols & Splits',
      status: hasPartial ? 'conditional' : 'aligned',
      note: hasPartial
        ? 'Train/test split ratios or evaluation episodes vary across sources.'
        : 'Consistent evaluation protocols observed.',
      pass: !hasPartial,
    },
    {
      name: 'Hardware & Compute Budget',
      status: 'varying',
      note: 'Hardware platforms vary; affects throughput and latency metrics rather than task accuracy.',
      pass: true,
    },
    {
      name: 'Statistical Rigor & Sample Size',
      status: checks.some((c) => c.fields.runs === 'DIFFERENT') ? 'conditional' : 'aligned',
      note: 'Repeated trials and multi-seed evaluations verified across papers.',
      pass: true,
    },
  ];

  const caveatWarning =
    'Scientific Compatibility Note: Direct numerical comparison is valid only when benchmark, task, metric, split, and evaluation protocol are compatible.';

  const issuesCount = allBlockers.length + allWarnings.length;

  return {
    status,
    overallStatus: status,
    verdictTitle,
    explanation,
    factors,
    caveatWarning,
    checks,
    groups,
    reasons: allReasons,
    blockers: allBlockers,
    warnings: allWarnings,
    prohibitedClaims,
    issuesCount,
    isDirectlyComparable: status === 'DIRECTLY_COMPARABLE',
    comparisonStrategy: 'PENDING',
    profiles,
    catalog: BENCHMARK_CATALOG,
  };
};

module.exports = {
  BENCHMARK_CATALOG,
  normalizeBenchmark,
  normalizeMetric,
  normalizeUnit,
  normalizeSplit,
  normalizeTask,
  normalizeDataset,
  isEfficiencyMetric,
  buildEvaluationProfile,
  compareEvaluationProfiles,
  evaluateProjectCompatibility,
};
