const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ResearchProject = require('../models/ResearchProject');
const { assembleAcademicManuscript } = require('../services/academicManuscriptService');

async function main() {
  console.log('=== HARDENED MERA-VLA REGENERATION SCRIPT ===');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai');

  const projectId = '6acf26284fb74352529d102c';
  let project = await ResearchProject.findById(projectId);

  if (!project) {
    project = await ResearchProject.findOne({ title: /Vision-Language-Action/i }) || await ResearchProject.findOne({});
  }

  if (!project) {
    console.error('Project not found!');
    process.exit(1);
  }

  console.log(`Found active project: "${project.title}" (ID: ${project._id})`);

  // 1. Correct Title & Topic
  const canonicalTitle = 'Memory-Augmented, Retrieval-Augmented, and Uncertainty-Aware Vision-Language-Action Models for Trustworthy Autonomous Robots';
  project.title = canonicalTitle;
  project.researchTopic = canonicalTitle;
  project.mainResearchProblem = 'Addressing sample inefficiency, visual generalization degradation, and overconfident uncalibrated failure modes in Vision-Language-Action policies for continuous robotic manipulation.';

  // 2. Authors Metadata
  project.authors = [
    {
      name: 'Irshad Ahmad',
      affiliation: 'Department of Computer Systems Engineering, University of Engineering and Technology, Peshawar',
      email: 'irshad.uetmardan@gmail.com',
      isCorresponding: true,
    },
  ];

  // 3. Mark unverified user results as USER_ENTERED (Pre-experimental mode: zero fabricated data)
  (project.userResults || []).forEach((r) => {
    r.verificationStatus = 'USER_ENTERED';
    r.verified = false;
  });

  // 4. Populate Defensible 5-Stage Research Gaps
  project.researchGaps = [
    {
      id: 'gap-1',
      title: 'Lack of Episodic Trajectory Memory in Continuous Robot Control',
      category: 'methodological_limitation',
      description: 'Within the surveyed primary literature (RT-1, RT-2, OpenVLA, Octo), prevailing VLA models are memoryless during inference, discarding executed trajectory rollouts and failing to reference past successful solutions.',
      evidenceQuote: 'Surveyed foundation VLA policies map current visual tokens to action tokens without persistent non-parametric experience storage.',
      supportingPapers: ['OpenVLA (Kim et al., 2024)', 'Octo (Octo Model Team, 2024)', 'RT-2 (Brohan et al., 2023)'],
      impact: 'High',
    },
    {
      id: 'gap-2',
      title: 'Absence of Calibrated Predictive Uncertainty and Safe Abstention in VLA Decoders',
      category: 'safety_limitation',
      description: 'Standard VLA action decoders generate overconfident continuous trajectory predictions under visual distribution shifts without calibrated uncertainty decomposition or safe human-in-the-loop abstention mechanisms.',
      evidenceQuote: 'Standard action heads optimize imitation loss without predictive uncertainty calibration or reject options.',
      supportingPapers: ['SelectiveNet (Geifman & El-Yaniv, 2019)', 'Robots That Ask for Help (Ren et al., 2023)'],
      impact: 'High',
    },
    {
      id: 'gap-3',
      title: 'Unified Integration of Continuous Episodic Retrieval and Dual-Dispersion Uncertainty Gating',
      category: 'architectural_gap',
      description: 'Within the analyzed literature corpus, an explicit integration coupling continuous multi-view episodic retrieval with calibrated dual-dispersion uncertainty gating and safe abstention was not identified.',
      evidenceQuote: 'Experiential memory (ExpeL) and selective classification (SelectiveNet) have evolved as disjoint paradigms.',
      supportingPapers: ['ExpeL (Zhao et al., 2024)', 'PaLM-E (Driess et al., 2023)'],
      impact: 'Critical',
    },
  ];

  // 5. Formal Research Questions (RQ1 to RQ5)
  project.researchQuestions = [
    {
      id: 'RQ1',
      text: 'Does conditioning VLA action generation on retrieved episodic experiences improve long-horizon robotic manipulation task completion compared to unaugmented foundation policies?',
      linkedGap: 'gap-1',
    },
    {
      id: 'RQ2',
      text: 'Does retrieval relevance causally determine policy performance, and does thresholded relevance filtering protect the policy against irrelevant or distractor memory entries?',
      linkedGap: 'gap-1',
    },
    {
      id: 'RQ3',
      text: 'Does calibrated dual-dispersion uncertainty estimation with safe abstention significantly reduce high-confidence physical failures under visual domain shift?',
      linkedGap: 'gap-2',
    },
    {
      id: 'RQ4',
      text: 'Do provenance-linked execution traces faithfully reflect the retrieved memory evidence and uncertainty metrics underlying action dispatch decisions?',
      linkedGap: 'gap-3',
    },
    {
      id: 'RQ5',
      text: 'What computational latency and memory footprint overheads are introduced by episodic retrieval and uncertainty estimation, and does the system satisfy real-time robotic control constraints (<50 ms per step)?',
      linkedGap: 'gap-3',
    },
  ];

  // 6. Falsifiable Hypotheses (H1 to H5)
  project.hypotheses = [
    {
      id: 'H1',
      text: 'Conditioning action generation on retrieved k-NN episodic trajectory demonstrations increases sequential task completion rates by >= 15% on CALVIN ABC->D compared to unaugmented baseline policies.',
      linkedQuestion: 'RQ1',
    },
    {
      id: 'H2',
      text: 'Thresholded relevance filtering (theta_sim >= 0.65) significantly mitigates action prediction MSE degradation compared to unfiltered and random memory retrieval.',
      linkedQuestion: 'RQ2',
    },
    {
      id: 'H3',
      text: 'Calibrated dual-dispersion uncertainty gating with threshold tau_safe reduces high-confidence failure rate (HCFR) by >= 60% while maintaining >= 80% autonomous task coverage.',
      linkedQuestion: 'RQ3',
    },
    {
      id: 'H4',
      text: 'Action-level provenance records achieve 100% decision faithfulness with zero hallucinated trajectory IDs, significantly outperforming ungrounded post-hoc LLM rationales.',
      linkedQuestion: 'RQ4',
    },
    {
      id: 'H5',
      text: 'Episodic retrieval and ensemble uncertainty estimation introduce < 15 ms latency overhead per step, maintaining end-to-end control frequency > 20 Hz (< 50 ms budget).',
      linkedQuestion: 'RQ5',
    },
  ];

  // 7. Benchmarks, Baselines & Metrics
  project.benchmarks = [
    {
      name: 'CALVIN Manipulation Suite',
      domain: 'Long-Horizon Robotic Manipulation',
      split: 'ABC->D Split (5 consecutive instructions)',
      metric: 'Task Success Rate (%)',
      description: 'Multi-task continuous tabletop manipulation evaluating sequential instruction following.',
    },
    {
      name: 'LIBERO Lifelong Manipulation Suite',
      domain: 'Spatial, Object, and Goal Generalization',
      split: 'LIBERO-Spatial, LIBERO-Object, LIBERO-Goal',
      metric: 'Task Success Rate (%)',
      description: 'Evaluates policy transfer under spatial layout shifts and novel object geometries.',
    },
    {
      name: 'Uncertainty & Calibration Suite',
      domain: 'Safety & Out-of-Distribution Detection',
      split: 'Visual Perturbations & Occlusion Splits',
      metric: 'Expected Calibration Error (ECE), High-Confidence Failure Rate (HCFR %)',
      description: 'Quantifies predictive uncertainty calibration and selective risk across reliability bins.',
    },
  ];

  project.baselines = [
    {
      name: 'RT-1 (Brohan et al., 2023)',
      sourcePaper: 'RT-1: Robotics Transformer for Real-World Control at Scale',
      metricName: 'Task Success Rate (%)',
      score: 'Reference Baseline',
      citation: '[1]',
    },
    {
      name: 'RT-2 (Brohan et al., 2023)',
      sourcePaper: 'RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control',
      metricName: 'Task Success Rate (%)',
      score: 'Reference Baseline',
      citation: '[2]',
    },
    {
      name: 'OpenVLA (Kim et al., 2024)',
      sourcePaper: 'OpenVLA: An Open-Source Vision-Language-Action Model',
      metricName: 'Task Success Rate (%)',
      score: 'Reference Baseline',
      citation: '[3]',
    },
    {
      name: 'Octo (Octo Model Team, 2024)',
      sourcePaper: 'Octo: An Open-Source Generalist Robot Policy',
      metricName: 'Task Success Rate (%)',
      score: 'Reference Baseline',
      citation: '[4]',
    },
    {
      name: 'ExpeL (Zhao et al., 2024)',
      sourcePaper: 'ExpeL: LLM Agents Are Experiential Learners',
      metricName: 'Task Success Rate (%)',
      score: 'Reference Baseline',
      citation: '[7]',
    },
  ];

  // 7b. Verified Evaluation Profiles for Table 3
  project.evaluationProfiles = [
    {
      id: 'eval_prof_open_x_embodiment',
      modelName: 'Open X-Embodiment Policy',
      paperTitle: 'Open X-Embodiment: Robotic Learning Datasets and RT-X Models (Padalkar et al., 2024)',
      benchmark: 'Open X-Embodiment Benchmark',
      task: 'Multi-Embodiment Manipulation',
      split: 'Cross-Embodiment Test Split',
      metric: 'Success Rate',
      unit: '%',
      evaluationProtocol: 'Standardized Multi-Robot Evaluation',
      checkpoint: 'RT-1-X / RT-2-X Checkpoints',
    },
    {
      id: 'eval_prof_openvla',
      modelName: 'OpenVLA (7B)',
      paperTitle: 'OpenVLA: An Open-Source Vision-Language-Action Model (Kim et al., 2024)',
      benchmark: 'LIBERO Benchmark Suite',
      task: 'Long-Horizon Tabletop Manipulation',
      split: 'LIBERO-Spatial & LIBERO-Object',
      metric: 'Task Success Rate',
      unit: '%',
      evaluationProtocol: '50 Rollouts per Task Category',
      checkpoint: 'openvla/openvla-7b',
    },
    {
      id: 'eval_prof_octo',
      modelName: 'Octo-Base',
      paperTitle: 'Octo: An Open-Source Generalist Robot Policy (Octo Model Team, 2024)',
      benchmark: 'CALVIN Manipulation Suite',
      task: 'Sequential Multi-Instruction Manipulation',
      split: 'ABC->D Split',
      metric: 'Average Sequential Tasks Completed',
      unit: 'Tasks',
      evaluationProtocol: 'Standard CALVIN Evaluation Protocol',
      checkpoint: 'octo-base-1.5',
    },
  ];

  project.metrics = [
    {
      name: 'Task Success Rate (%)',
      definition: 'Percentage of sequential manipulation instructions completed within the action step budget.',
      purpose: 'Primary measure of continuous manipulation capability.',
    },
    {
      name: 'Expected Calibration Error (ECE)',
      definition: 'Difference between policy action confidence and empirical task execution accuracy across binned confidence intervals.',
      purpose: 'Quantification of predictive uncertainty reliability.',
    },
    {
      name: 'High-Confidence Failure Rate (HCFR %)',
      definition: 'Proportion of failed episodes occurring when the policy confidence was high (U_t <= tau_safe).',
      purpose: 'Key safety metric quantifying catastrophic failure reduction.',
    },
    {
      name: 'Area Under Risk-Coverage Curve (AURC)',
      definition: 'Area under the selective risk versus coverage curve across varying safety thresholds tau_safe.',
      purpose: 'Evaluation of selective prediction and abstention quality.',
    },
    {
      name: 'Inference Latency (ms)',
      definition: 'Wall-clock time per control cycle including visual encoding, retrieval, fusion, and uncertainty estimation.',
      purpose: 'Verification of real-time control constraints (<50 ms).',
    },
  ];

  // 8. Methodology specifications
  project.methodology = {
    proposedArchitecture: 'MERA-VLA: Multimodal sensory encoder (ViT-B/16 + Text Transformer) coupled with episodic trajectory buffer, cross-attention fusion head, dual-dispersion uncertainty estimator, and safe abstention gate.',
    dataset: 'CALVIN and LIBERO standardized manipulation benchmarks.',
    model: 'Autoregressive Multimodal Transformer with 7-DoF continuous action head.',
    trainingStrategy: 'Composite multi-task objective: supervised behavioral cloning loss (L_BC), InfoNCE episodic contrastive alignment (L_contrastive), and Expected Calibration Error regularization (L_calibration).',
    algorithm: 'Algorithm 1: Real-time closed-loop inference, k-NN similarity retrieval, dual-dispersion uncertainty decomposition, and adaptive utility-weighted episodic memory update.',
    ablationPlan: '7 modular ablations isolating memory retrieval, relevance thresholding, uncertainty estimation, and safe abstention.',
    statisticalAnalysis: 'Multi-seed evaluation across 5 random seeds (42, 1337, 2024, 7, 99) with programmatic mean, SD, paired t-tests (p < 0.05), Cohen\'s d, and 95% CIs.',
  };

  // 9. Reset manuscript objects so fresh canonical deduplicated objects are created
  project.manuscriptObjects = [];

  // 10. Assemble Academic Manuscript through hardened pipeline
  console.log('\n--- Running assembleAcademicManuscript ---');
  const assembled = await assembleAcademicManuscript(project);

  project.generatedDraft = assembled;
  project.manuscriptObjects = assembled.manuscriptObjects;

  await project.save();

  console.log('\n=== REGENERATION COMPLETE ===');
  console.log(`• Title: "${assembled.title}"`);
  console.log(`• Mode: ${assembled.manuscriptMode}`);
  console.log(`• Readiness Status: ${assembled.qualityScore?.readinessStatus}`);
  console.log(`• Stage Label: ${assembled.qualityScore?.stageLabel}`);
  console.log(`• Overall Score: ${assembled.qualityScore?.overallScore}/100`);
  console.log(`• Canonical Sources: ${assembled.canonicalSources?.length}`);
  console.log(`• References: ${assembled.references?.length}`);
  console.log(`• Sections: ${assembled.sections?.length}`);
  assembled.sections.forEach((s) => console.log(`   - ${s.heading}`));
  console.log('• Manuscript Objects:');
  assembled.manuscriptObjects.forEach((o) => {
    console.log(`   - [${o.objectType.toUpperCase()}] ${o.displayLabel}: ${o.title}`);
  });

  const passedChecks = assembled.validationChecks.filter((c) => c.passed).length;
  console.log(`• Validation Checks: ${passedChecks}/${assembled.validationChecks.length} passed`);
  assembled.validationChecks.forEach((c) => {
    console.log(`   ${c.passed ? '✓' : '✗'} [${c.category}] ${c.label}`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('Error during regeneration:', err);
  process.exit(1);
});
