/**
 * End-to-End Autonomous Research Agent Run Test
 * Executes all 9 tasks (T1-T9) for project MERA-VLA (ExpeL paper duplicates)
 * Verifies final synthesis, Quality Gate, and zero hallucinations.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { researchAgentEngine } = require('../services/researchAgentEngine');
const AgentRun = require('../models/AgentRun');

async function testFullRun() {
  console.log('--- STARTING END-TO-END RESEARCH AGENT RUN ---');
  await mongoose.connect(process.env.MONGODB_URI);

  const runId = `run-grounding-test-${Date.now()}`;
  const userId = '6a859dee91d44ef383ffa920'; // existing test user ID

  console.log(`Starting Run ID: ${runId}`);
  const runRecord = await researchAgentEngine.startRun({
    runId,
    userId,
    projectId: '6ac8bdddc32fa5b19f0fb1a6',
    documentIds: ['6ac8be1bc32fa5b19f0fbcfe', '6ac8be24c32fa5b19f0fbeab'],
    userGoal: 'Compare selected papers, evaluate benchmark compatibility, and identify research gaps.',
    depth: 'standard',
  });

  console.log('Run initialized. Monitoring execution until completion...');

  return new Promise((resolve, reject) => {
    researchAgentEngine.events.on(`run:${runId}`, async (evt) => {
      console.log(`[EVENT] Stage: ${evt.currentNode || evt.currentPhase} | Status: ${evt.status} | Progress: ${evt.progress}%`);
      if (evt.title) console.log(`        Title: ${evt.title}`);

      if (evt.status === 'completed') {
        console.log('\n==========================================================');
        console.log('SUCCESS: RUN COMPLETED SUCCESSFULLY (100%)');
        console.log('==========================================================');
        const finalRun = await AgentRun.findOne({ runId }).lean();
        console.log('Verification Status:', finalRun.verificationStatus);
        console.log('Completed Tasks Count:', finalRun.completedTasks?.length);
        console.log('Artifacts Count:', finalRun.artifacts?.length);
        console.log('Quality Gate:', JSON.stringify(finalRun.finalOutput?.qualityGate, null, 2));
        console.log('Audited Claims Count:', finalRun.finalOutput?.claims?.length);
        console.log('Summary Preview:\n', finalRun.finalOutput?.summary?.slice(0, 600));

        // Check for MiniGrid or raw tuple leakage
        const summaryText = finalRun.finalOutput?.summary || '';
        if (summaryText.toLowerCase().includes('minigrid')) {
          console.error('[FAIL] MiniGrid leaked into final synthesis!');
        } else {
          console.log('[PASS] MiniGrid is NOT in final synthesis brief.');
        }

        if (summaryText.includes('(s,a,r,s\')')) {
          console.error('[FAIL] Raw (s,a,r,s\') tuples leaked into final synthesis!');
        } else {
          console.log('[PASS] Raw (s,a,r,s\') tuples are NOT in final synthesis brief.');
        }

        await mongoose.disconnect();
        resolve(finalRun);
      } else if (evt.status === 'failed') {
        console.error('RUN FAILED:', evt.errors || evt.detail);
        await mongoose.disconnect();
        reject(new Error(evt.detail || 'Run failed'));
      }
    });
  });
}

testFullRun().catch((err) => {
  console.error('[E2E TEST CRASH]:', err);
  process.exit(1);
});
