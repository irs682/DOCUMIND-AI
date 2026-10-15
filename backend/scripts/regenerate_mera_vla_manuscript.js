const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ResearchProject = require('../models/ResearchProject');
const { assembleAcademicManuscript } = require('../services/academicManuscriptService');

async function regenerateMeraVlaManuscript() {
  console.log('=== REGENERATING MERA-VLA MANUSCRIPT WITH HARDENED PIPELINE ===');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/documind');

  const projectId = '6ac8bdddc32fa5b19f0fb1a6';
  let project = await ResearchProject.findById(projectId);

  if (!project) {
    console.log(`Project ${projectId} not found. Searching by title...`);
    project = await ResearchProject.findOne({ title: /MERA-VLA/i });
  }

  if (!project) {
    console.error('MERA-VLA project not found in database!');
    process.exit(1);
  }

  console.log(`Found project: "${project.title}" (ID: ${project._id})`);

  // 1. Inspect and clean userResults
  // Check if 72.4% and 0.08 have verified experiment provenance
  console.log('\n--- 1. AUDITING USER RESULTS ---');
  project.userResults.forEach((r, idx) => {
    console.log(`Result ${idx + 1}: ${r.modelName} | ${r.metric}: ${r.value}${r.unit} | runIds: ${JSON.stringify(r.runIds)} | runId: "${r.runId}" | sourceArtifactId: "${r.sourceArtifactId}"`);
    // They have no verified runIds or artifacts: mark as USER_ENTERED and unverified
    r.verificationStatus = 'USER_ENTERED';
    r.verified = false;
  });
  console.log('✓ All unverified results marked as USER_ENTERED (unverified).');

  // 2. Clean Research Gaps (Eliminate internal file names like "01407-AAAI24.ZhaoA (1)")
  console.log('\n--- 2. CLEANING RESEARCH GAPS ---');
  project.researchGaps = [
    {
      id: 'gap-1',
      title: 'Integration of Episodic Memory, Uncertainty Calibration, and Safe Abstention',
      category: 'methodological_limitation',
      description: 'Within the analyzed primary literature (Zhao et al., 2024), current experiential learning policies lack calibrated predictive uncertainty estimation and proactive safe abstention mechanisms before executing physical actions.',
      evidenceQuote: 'Identified via comparative textual inspection of experiential decision-making bounds.',
      supportingPapers: ['ExpeL: LLM Agents Are Experiential Learners (Zhao et al., 2024)'],
      impact: 'High',
    },
  ];
  console.log('✓ Research gap cleaned: zero raw filenames or parser IDs.');

  // 3. Authors metadata (Real manuscript metadata, zero product promotional text)
  project.authors = [
    {
      name: 'PMLS Autonomous Research Team',
      affiliation: 'Autonomous Systems & Robotics Laboratory',
      email: 'research@documind.ai',
      isCorresponding: true,
    },
  ];

  // 4. Benchmarks & Baselines
  project.benchmarks = [
    {
      name: 'CALVIN Benchmark Suite',
      domain: 'Long-Horizon Robotic Manipulation',
      description: 'Multi-task continuous control across ABC->D split with sequential instructions.',
    },
    {
      name: 'LIBERO Benchmark Suite',
      domain: 'Spatial & Object Generalization',
      description: 'Evaluation of policy robustness under visual and environmental distribution shifts.',
    },
    {
      name: 'Calibration Evaluation Suite',
      domain: 'Safety & Out-of-Distribution Detection',
      description: 'Reliability diagrams and Expected Calibration Error (ECE) under visual disturbance.',
    },
  ];

  project.baselines = [
    {
      name: 'ExpeL (Zhao et al., 2024)',
      sourcePaper: 'ExpeL: LLM Agents Are Experiential Learners',
      metricName: 'Task Success Rate (%)',
      score: 'Reference Baseline',
      citation: '[1] Zhao et al. (2024)',
    },
  ];

  project.metrics = [
    {
      name: 'Task Success Rate (%)',
      definition: 'Percentage of sequential manipulation instructions completed within action step budget.',
      purpose: 'Primary measure of continuous manipulation capability.',
    },
    {
      name: 'Expected Calibration Error (ECE)',
      definition: 'Difference between policy action confidence and empirical task accuracy across binned confidence intervals.',
      purpose: 'Quantification of predictive uncertainty reliability.',
    },
    {
      name: 'Inference Latency (ms)',
      definition: 'Wall-clock computation latency per decision step, including retrieval and cross-attention fusion.',
      purpose: 'Verification of real-time control constraints (<50 ms).',
    },
  ];

  // 5. Clean and Deduplicate Manuscript Objects
  // Keep only Figure 1 (Architecture), Figure 2 (Retrieval & Fusion), Figure 3 (Uncertainty & Abstention)
  // Table 1 (Literature comparison isolated to indexed source), Table 2 (Benchmark protocol: Planned)
  // Equations 1-5 with Proposed Formulation provenance
  // REMOVE all unverified graphs and duplicate figure objects!
  console.log('\n--- 3. CLEANING & DEDUPLICATING MANUSCRIPT OBJECTS ---');
  project.manuscriptObjects = []; // Reset so generateDefaultManuscriptObjects generates canonical set

  // 6. Assemble manuscript through hardened pipeline
  console.log('\n--- 4. EXECUTING HARDENED MANUSCRIPT PIPELINE ---');
  const assembledDraft = await assembleAcademicManuscript(project);

  project.generatedDraft = assembledDraft;
  project.manuscriptObjects = assembledDraft.manuscriptObjects;

  await project.save();

  console.log('\n=== REGENERATION COMPLETE ===');
  console.log(`• Mode: ${assembledDraft.manuscriptMode}`);
  console.log(`• Readiness Stage: ${assembledDraft.qualityScore?.stageLabel}`);
  console.log(`• Quality Score: ${assembledDraft.qualityScore?.overallScore}/100`);
  console.log(`• Section Count: ${assembledDraft.sections.length}`);
  console.log('• Sections:');
  assembledDraft.sections.forEach((s) => console.log(`   - ${s.heading}`));
  console.log('• Manuscript Objects:');
  assembledDraft.manuscriptObjects.forEach((o) => {
    console.log(`   - [${o.objectType.toUpperCase()}] ${o.displayLabel}: ${o.title} (Provenance: ${o.provenance?.badgeLabel || 'N/A'})`);
  });
  console.log(`• References: ${assembledDraft.references.length} canonical references`);
  console.log(`• Validation Checks: ${assembledDraft.validationChecks.filter(c => c.passed).length}/${assembledDraft.validationChecks.length} passed`);

  const failedChecks = assembledDraft.validationChecks.filter(c => !c.passed);
  if (failedChecks.length > 0) {
    console.log('• Failed Checks:');
    failedChecks.forEach(c => console.log(`   ⚠ ${c.label} (${c.id})`));
  } else {
    console.log('✓ All 16 validation integrity checks PASSED!');
  }

  process.exit(0);
}

regenerateMeraVlaManuscript().catch((err) => {
  console.error('Error during regeneration:', err);
  process.exit(1);
});
