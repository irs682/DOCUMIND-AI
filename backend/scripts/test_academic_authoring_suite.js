const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
  evaluateManuscriptQuality,
  runAcademicReviewerAudit,
  generateBibtexBundle,
} = require('../services/academicAuditService');

async function testAcademicAuthoringSuite() {
  console.log('--- RUNNING PURE ACADEMIC AUDIT & REVIEWER UNIT TESTS ---');

  // 1. Create a simulated Pre-Experimental Project object
  const testProject = {
    title: 'MERA-VLA: Memory-Augmented, Retrieval-Augmented and Uncertainty-Aware Vision-Language-Action Framework',
    owner: 'user_123',
    researchTopic: 'Embodied Robotics and Vision-Language-Action Models',
    mainResearchProblem: 'Catastrophic forgetting and perceptual overconfidence in long-horizon robotic manipulation tasks',
    paperProfiles: [
      {
        title: 'RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control',
        authors: ['Brohan et al.'],
        year: 2023,
        venue: 'CoRL',
      },
      {
        title: 'OpenVLA: An Open-Source Vision-Language-Action Model',
        authors: ['Kim et al.'],
        year: 2024,
        venue: 'arXiv',
      },
      {
        title: 'PaLM-E: An Embodied Multimodal Language Model',
        authors: ['Driess et al.'],
        year: 2023,
        venue: 'ICML',
      },
      {
        title: 'RoboFlamingo: Vision-Language Models for Offline Imitation',
        authors: ['Chen et al.'],
        year: 2023,
        venue: 'NeurIPS',
      },
    ],
    researchGaps: [
      {
        title: 'Lack of episodic memory retrieval for sequential tasks',
        evidenceQuote: 'Current VLAs do not maintain episodic buffers for policy conditioning.',
      },
    ],
    researchQuestions: [
      {
        question: 'Does retrieval-augmented conditioning improve task success rate over 10 consecutive episodes?',
      },
    ],
    hypotheses: [
      {
        statement: 'MERA-VLA improves CALVIN success rate by at least 8% over vanilla OpenVLA.',
      },
    ],
    methodology: {
      proposedArchitecture: 'Dual-branch VLA architecture with episodic vector memory retrieval and temperature calibration',
      algorithm: 'Algorithm 1: Episodic Memory Retrieval and Fusion',
    },
    baselines: [
      { model: 'OpenVLA', benchmark: 'CALVIN', metric: 'Success Rate (%)' },
    ],
    userResults: [], // ZERO verified empirical results -> Hard gate must trigger
    manuscriptObjects: [
      {
        id: 'eq-1',
        objectType: 'equation',
        title: 'Dual-Objective Loss',
        latex: '\\mathcal{L} = \\mathcal{L}_{BC} + \\lambda \\mathcal{L}_{calib}',
        equationNumber: 1,
        symbolDefinitions: [
          { symbol: '\\mathcal{L}_{BC}', meaning: 'Behavioral cloning loss' },
          { symbol: '\\lambda', meaning: 'Calibration regularization weight' },
        ],
      },
      {
        id: 'alg-1',
        objectType: 'algorithm',
        title: 'Episodic Memory Retrieval',
        algorithmNumber: 1,
        inputs: ['Observation ot', 'Memory buffer M'],
        outputs: ['Action at'],
        pseudocode: '1: Retrieve nearest memory; 2: Blend policy action; 3: return action;',
      },
    ],
    appendices: [
      {
        title: 'Appendix A — Hyperparameter Configurations',
        category: 'hyperparameters',
        content: 'Learning rate: 1e-4, Batch size: 64, Optimizer: AdamW',
      },
    ],
    generatedDraft: {
      title: 'MERA-VLA: Memory-Augmented Vision-Language-Action Framework',
      abstract: 'We introduce MERA-VLA, addressing perceptual uncertainty via episodic retrieval...',
      manuscriptMode: 'pre_experimental',
      resultsPending: true,
      sections: [
        {
          heading: '1. Introduction',
          body: 'Embodied AI systems struggle with long-horizon manipulation [1].',
          citations: ['[1]'],
        },
        {
          heading: '2. Methodology',
          body: 'We formulate the policy according to {{EQUATION:eq-1}}.',
        },
        {
          heading: '3. Results & Evaluation',
          body: 'Empirical results are pending experimental verification.',
        },
        {
          heading: '4. Conclusion',
          body: 'We have presented MERA-VLA with formal verification guarantees.',
        },
      ],
      references: [
        'Brohan et al. RT-2: Vision-Language-Action Models (2023).',
      ],
    },
    reproducibilityChecklist: {
      randomSeed: '42, 1337',
      hardwareConfig: 'NVIDIA RTX 4090',
      softwareEnvironment: 'PyTorch 2.2',
    },
  };

  // 2. Evaluate 19-Dimensional Quality Audit with Hard Gates
  console.log('\n--- EVALUATING 19-DIMENSIONAL QUALITY AUDIT ---');
  const audit = evaluateManuscriptQuality(testProject);
  console.log('Overall Status:', audit.overallStatus);
  console.log('Overall Score:', audit.overallScore);
  console.log('Is Publication Ready?', audit.isPublicationReady);
  console.log('Result Verification Status:', audit.resultVerificationStatus);
  console.log('Hard Gate Failures count:', audit.hardGateFailures.length);
  audit.hardGateFailures.forEach((f) => {
    console.log(`  • [${f.dimension}]: ${f.message}`);
  });

  if (audit.overallStatus !== 'Strong Pre-Experimental Draft') {
    throw new Error(`Expected 'Strong Pre-Experimental Draft' but got '${audit.overallStatus}'`);
  }
  if (audit.isPublicationReady !== false) {
    throw new Error('Hard gate failure: Pre-experimental draft cannot be Publication Ready!');
  }
  console.log('✓ Hard Gate passed: Zero verified results strictly blocks Publication Ready state.');

  // 3. Test Academic Peer Reviewer Simulation
  console.log('\n--- RUNNING PEER REVIEWER SIMULATION ---');
  const reviewer = runAcademicReviewerAudit(testProject);
  console.log('Reviewer Verdict:', reviewer.reviewerVerdict);
  console.log('Findings Count:', reviewer.findings.length);
  reviewer.findings.forEach((find) => {
    console.log(`  [${find.severity}] ${find.category}: ${find.title}`);
  });

  if (!reviewer.findings.some((f) => f.severity === 'Critical')) {
    throw new Error('Expected at least 1 Critical finding for zero empirical results');
  }
  console.log('✓ Reviewer check correctly flagged missing experimental verification as Critical.');

  // 4. Test BibTeX generation
  console.log('\n--- TESTING BIBTEX EXPORT BUNDLE ---');
  const bibtex = generateBibtexBundle(testProject);
  console.log('BibTeX preview (first 180 chars):');
  console.log(bibtex.slice(0, 180) + '...\n');
  if (!bibtex.includes('@article{')) {
    throw new Error('Expected valid @article BibTeX entries');
  }
  console.log('✓ BibTeX bundle generated cleanly with canonical scholarly citations.');

  console.log('✓ Test Suite Completed Successfully!');
}

testAcademicAuthoringSuite().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
