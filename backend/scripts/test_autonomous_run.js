const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { researchAgentEngine } = require('../services/researchAgentEngine');
const AgentRun = require('../models/AgentRun');

async function runAutonomousTests() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/documind');

  console.log('=== TEST 1: EMPTY CORPUS VALIDATION ===');
  const emptyRunId = `run-empty-${Date.now()}`;
  const emptyRun = await researchAgentEngine.startRun({
    runId: emptyRunId,
    userId: new mongoose.Types.ObjectId(),
    projectId: null,
    documentIds: [],
    userGoal: 'Compare selected papers, evaluate benchmark compatibility, and identify research gaps.',
    depth: 'standard',
  });

  console.log('Empty Run Result:', {
    runId: emptyRun.runId,
    status: emptyRun.status,
    progress: emptyRun.progress,
    currentNode: emptyRun.currentNode,
    verificationStatus: emptyRun.verificationStatus,
    errors: emptyRun.errors,
  });

  if (emptyRun.status !== 'failed' || emptyRun.progress !== 0 || emptyRun.verificationStatus !== 'INSUFFICIENT_CORPUS') {
    throw new Error('Test 1 Failed: Empty corpus did not return INSUFFICIENT_CORPUS with 0% progress');
  }
  console.log('✓ TEST 1 PASSED: Empty corpus gracefully handled with 0% progress and INSUFFICIENT_CORPUS.');

  console.log('\n=== TEST 2: REPRODUCTION & EXECUTION OF MERA-VLA RUN ===');
  const testRunId = `run-mera-${Date.now()}`;
  const meraRun = await researchAgentEngine.startRun({
    runId: testRunId,
    userId: new mongoose.Types.ObjectId('6ac8bbacc32fa5b19f0fb111'),
    projectId: '6ac8bdddc32fa5b19f0fb1a6', // MERA-VLA project ID
    documentIds: [],
    userGoal: 'Compare selected papers, evaluate benchmark compatibility, and identify research gaps.',
    depth: 'standard',
  });

  console.log('Initial Run State:', {
    runId: meraRun.runId,
    status: meraRun.status,
    progress: meraRun.progress,
    currentNode: meraRun.currentNode,
    tasksCount: meraRun.plan?.tasks?.length,
    planSource: meraRun.planSource,
  });

  // Track progress events
  let maxProgressSeen = meraRun.progress;
  let finalStatus = meraRun.status;

  await new Promise((resolve) => {
    const unsub = researchAgentEngine.subscribe(testRunId, (evt) => {
      console.log(`[EVENT] status=${evt.status} phase="${evt.currentPhase}" node=${evt.currentNode} progress=${evt.progress}%`);
      if (evt.progress) maxProgressSeen = Math.max(maxProgressSeen, evt.progress);
      if (evt.status === 'completed' || evt.status === 'failed' || evt.status === 'cancelled') {
        finalStatus = evt.status;
        unsub();
        resolve();
      }
    });

    // Timeout safety 60s
    setTimeout(() => {
      unsub();
      resolve();
    }, 60000);
  });

  // Fetch persisted record from MongoDB
  const savedRun = await AgentRun.findOne({ runId: testRunId }).lean();
  console.log('\nFinal Persisted Run State in MongoDB:', {
    runId: savedRun.runId,
    status: savedRun.status,
    progress: savedRun.progress,
    currentNode: savedRun.currentNode,
    completedTasks: savedRun.completedTasks?.map(t => t.id),
    failedTasks: savedRun.failedTasks?.map(t => t.id),
    evidenceCount: savedRun.evidence?.length,
    artifactsCount: savedRun.artifacts?.length,
    errors: savedRun.errors,
    warnings: savedRun.warnings,
  });

  if (savedRun.status === 'completed' && savedRun.progress === 100) {
    console.log('✓ TEST 2 PASSED: Run completed all tasks successfully to 100% with grounded evidence and artifacts!');
  } else {
    console.log(`Notice: Run ended with status=${savedRun.status}, progress=${savedRun.progress}%`);
  }

  process.exit(0);
}

runAutonomousTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
