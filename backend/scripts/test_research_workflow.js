const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/documind');
  console.log('✓ Connected to MongoDB');

  const ResearchProject = require('../models/ResearchProject');
  const User = require('../models/User');

  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      name: 'Test Researcher',
      email: 'researcher@documind.test',
      password: 'password123',
    });
  }
  console.log('✓ Testing with User ID:', user._id.toString());

  // 1. CREATE PROJECT A
  const projA = await ResearchProject.create({
    title: 'MERA-VLA: Retrieval-Augmented Vision-Language-Action',
    owner: user._id,
    researchTopic: 'Embodied AI / Memory Retrieval',
    description: 'Autonomous manipulation under perceptual uncertainty',
    status: 'active',
    currentStep: 1,
    manuscriptObjects: [
      {
        id: 'eq-loss-1',
        objectType: 'equation',
        title: 'Compound Training Objective',
        latex: '\\mathcal{L} = \\mathcal{L}_{BC} + \\lambda_1\\mathcal{L}_{contrastive} + \\lambda_2\\mathcal{L}_{calibration}',
        equationNumber: 1,
      },
      {
        id: 'fig-arch-1',
        objectType: 'figure',
        title: 'MERA-VLA Neural Pipeline',
        svgContent: '<svg width="400" height="120"><rect width="400" height="120" fill="#e0e7ff"/><text x="20" y="60" fill="#3730a3">MERA-VLA Architecture</text></svg>',
        figureNumber: 1,
        caption: 'Dual-stream retrieval-augmented policy architecture.',
      },
      {
        id: 'tab-results-1',
        objectType: 'table',
        title: 'Comparative Performance Benchmark',
        tableNumber: 1,
        caption: 'Success rates (%) on CALVIN multi-task benchmark.',
        tableData: {
          headers: ['Method', 'Success Rate (%)', 'Calib Error'],
          rows: [
            ['Baseline VLA', '61.2', '0.14'],
            ['MERA-VLA (Ours)', '72.4', '0.08'],
          ],
        },
      },
    ],
    generatedDraft: {
      title: 'MERA-VLA: Retrieval-Augmented Vision-Language-Action Policy with Calibrated Memory',
      abstract: 'Robotic manipulation models often hallucinate affordances under noisy observations.',
      sections: [
        {
          heading: '1. Introduction',
          body: 'We introduce MERA-VLA for embodied manipulation. See {{FIGURE:fig-arch-1}} for overview.',
        },
        {
          heading: '2. Methodology',
          body: 'The compound optimization is formulated in {{EQUATION:eq-loss-1}}.',
        },
        {
          heading: '3. Results & Evaluation',
          body: 'Empirical gains are reported in {{TABLE:tab-results-1}}.',
        },
      ],
      references: [
        '[1] Brohan, A., et al. (2022). RT-1: Robotics Transformer. arXiv:2212.06817.',
        '[2] Padalkar, A., et al. (2023). Open X-Embodiment. arXiv:2310.08864.',
      ],
    },
  });

  console.log('✓ Project A created:', projA._id.toString(), '| Status:', projA.status, '| Current Step:', projA.currentStep);

  // 2. CREATE PROJECT B (PROJECT ISOLATION TEST)
  const projB = await ResearchProject.create({
    title: 'Project B: Graph Neural Networks in Molecular Design',
    owner: user._id,
    researchTopic: 'Biomedical AI',
    description: 'De novo molecule generation',
    status: 'active',
    currentStep: 1,
  });

  console.log('✓ Project B created:', projB._id.toString(), '| Status:', projB.status, '| Current Step:', projB.currentStep);

  // VERIFY COMPLETE PROJECT ISOLATION (Section 20)
  if (projB.manuscriptObjects.length !== 0) {
    throw new Error('Project B inherited manuscriptObjects from Project A!');
  }
  if (projB.generatedDraft.title !== '') {
    throw new Error('Project B inherited generatedDraft from Project A!');
  }
  if (projB.paperProfiles.length !== 0 || projB.userResults.length !== 0) {
    throw new Error('Project B inherited papers or results from Project A!');
  }
  console.log('✓ PASSED: Project B is completely clean and isolated.');

  // 3. TEST STEP NAVIGATION & REOPENING AT SAVED STEP (Section 22, 25)
  projA.currentStep = 8;
  await projA.save();
  const reloadedA_8 = await ResearchProject.findById(projA._id);
  console.log('✓ Project A navigated to Step 8. Verified currentStep:', reloadedA_8.currentStep);

  // Back navigation without data loss: Step 8 -> Step 7
  reloadedA_8.currentStep = 7;
  await reloadedA_8.save();
  const reloadedA_7 = await ResearchProject.findById(projA._id);
  console.log('✓ Project A navigated Back to Step 7. Verified currentStep:', reloadedA_7.currentStep);

  // Verify all equations, figures, tables remain intact in Project A
  if (reloadedA_7.manuscriptObjects.length !== 3) {
    throw new Error('Project A lost manuscript objects after back navigation!');
  }
  console.log('✓ PASSED: Project A preserved all 3 manuscript objects through navigation.');

  // 4. TEST CONTROLLER EXPORT & VALIDATION LOGIC
  const { validateProjectManuscript, exportProjectPdf } = require('../controllers/researchProjectController');
  
  // Test mock request / response for export
  let exportResponse = null;
  const mockReqOwner = {
    params: { id: projA._id.toString() },
    user: { _id: user._id },
  };
  const mockRes = {
    json: (data) => { exportResponse = data; return mockRes; },
    status: (code) => {
      return {
        json: (data) => { exportResponse = { statusCode: code, ...data }; return mockRes; },
      };
    },
  };

  await exportProjectPdf(mockReqOwner, mockRes);
  if (!exportResponse || !exportResponse.success) {
    throw new Error(`Export PDF failed: ${JSON.stringify(exportResponse)}`);
  }
  console.log('✓ PASSED: Export PDF endpoint succeeded. Filename:', exportResponse.filename);
  console.log('✓ PASSED: Validation summary:', exportResponse.validation.summary);

  // 5. TEST OWNERSHIP SECURITY CHECK (Section 31)
  const fakeOtherUserId = new mongoose.Types.ObjectId();
  const mockReqAttacker = {
    params: { id: projA._id.toString() },
    user: { _id: fakeOtherUserId },
  };
  let attackerResponse = null;
  const mockAttackerRes = {
    status: (code) => ({
      json: (data) => { attackerResponse = { statusCode: code, ...data }; },
    }),
  };

  await exportProjectPdf(mockReqAttacker, mockAttackerRes);
  if (!attackerResponse || attackerResponse.statusCode !== 403) {
    throw new Error('SECURITY BREACH: Unauthorized user was not blocked with 403 Forbidden!');
  }
  console.log('✓ PASSED: Export Security verified — Unauthorized export blocked with HTTP 403.');

  // Clean up
  await ResearchProject.findByIdAndDelete(projA._id);
  await ResearchProject.findByIdAndDelete(projB._id);
  console.log('✓ Test projects cleaned up.');

  console.log('\n========================================');
  console.log('ALL WORKSPACE & EXPORT INTEGRATION TESTS PASSED!');
  console.log('========================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
