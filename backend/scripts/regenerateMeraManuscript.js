const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Project = require('../models/ResearchProject');
const { assembleAcademicManuscript } = require('../services/academicManuscriptService');
const { generateDefaultManuscriptObjects, deduplicateManuscriptObjects } = require('../services/academicObjectService');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const p = await Project.findById('6ac8bdddc32fa5b19f0fb1a6');
  if (!p) {
    console.error('Project not found');
    process.exit(1);
  }

  // 1. Purge ungrounded results (remove 72.4%, 0.08, and fake Seed 42 run)
  p.userResults = [];
  p.resultComparison = {};
  p.discussion = {};

  // 2. Sanitize authors (no product or team labels)
  p.authors = [
    {
      name: 'Research Author',
      affiliation: 'Autonomous Systems & Robotics Laboratory',
      email: 'author@research.org',
      isCorresponding: true,
    },
  ];

  // 3. Sanitize research gaps
  p.researchGaps = [
    {
      id: 'gap-1',
      title: 'Absence of Continuous Action-Space Memory in VLA Baselines',
      category: 'methodological_limitation',
      description: 'Within the analyzed literature, experiential memory mechanisms operate on discrete textual observations and high-level prompts rather than continuous multi-view robotic trajectory spaces.',
      evidenceQuote: 'Investigated tasks with textual observation, limiting real-world applicability.',
      supportingPapers: ['ExpeL (Zhao et al., 2024)'],
      impact: 'High',
    },
    {
      id: 'gap-2',
      title: 'Lack of Real-Time Calibrated Uncertainty and Safe Abstention',
      category: 'methodological_limitation',
      description: 'Prevailing foundation policies lack calibrated action-uncertainty quantification and human-in-the-loop abstention criteria, leading to failure modes under visual distribution shifts.',
      evidenceQuote: 'Extending to continuous observation spaces and safety mechanisms represents an unaddressed direction in the surveyed baseline.',
      supportingPapers: ['ExpeL (Zhao et al., 2024)'],
      impact: 'High',
    },
  ];

  // 4. Sanitize baselines
  p.baselines = [
    {
      name: 'ReAct',
      sourcePaper: 'ExpeL (Zhao et al., 2024)',
      metricName: 'Success Rate (SR %)',
      score: 'Verified in paper',
      citation: '[1]',
    },
    {
      name: 'ExpeL (Full)',
      sourcePaper: 'ExpeL (Zhao et al., 2024)',
      metricName: 'Success Rate (SR %)',
      score: 'Verified in paper',
      citation: '[1]',
    },
  ];

  // 5. Generate clean manuscript objects from canonical templates
  const defaultObjs = generateDefaultManuscriptObjects(p, { mode: 'PRE_EXPERIMENTAL' });
  const cleanObjs = deduplicateManuscriptObjects(defaultObjs, true);
  p.manuscriptObjects = cleanObjs;

  p.appendices = [
    {
      title: 'Appendix A — Planned Hyperparameters',
      category: 'hyperparameters',
      content: `Planned architectural hyperparameters for MERA-VLA (Proposed Formulation):\n• Vision Transformer Backbone: ViT-B/16 (224x224 input resolution)\n• Language Model Backbone: Pretrained Transformer (embedding dim: 768)\n• Episodic Buffer Capacity: 5,000 transitions\n• Retrieval Top-k: k = 5\n• Similarity Metric: Normalized Cosine Similarity\n• Safety Threshold tau_safe: 0.35 (calibrated on validation split)\n• Loss Weighting: lambda_1 = 0.5, lambda_2 = 0.2, lambda_3 = 0.1\n• Optimizer: AdamW (learning rate: 1e-4, weight decay: 0.01)\n• Random Seeds: 5 initialization seeds (42, 1337, 2024, 7, 99)`,
    },
  ];

  // 6. Assemble academic manuscript via the upgraded service
  const assembled = await assembleAcademicManuscript(p);
  p.generatedDraft = assembled;
  p.manuscriptObjects = assembled.manuscriptObjects;

  await p.save();
  console.log('Project successfully updated in MongoDB!');
  console.log('Mode:', assembled.manuscriptMode);
  console.log('Passed checks:', assembled.qualityScore.passedChecks);
  console.log('Submission Audit:', JSON.stringify(assembled.qualityScore.submissionAudit, null, 2));
  console.log(
    'Manuscript Objects:',
    assembled.manuscriptObjects.map((o) => `${o.displayLabel}: ${o.id}`)
  );
  console.log(
    'Section Headings:',
    assembled.sections.map((s) => s.heading)
  );
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
