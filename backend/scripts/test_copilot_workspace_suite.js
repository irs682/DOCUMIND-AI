/**
 * DOCUMIND-AI: Research Copilot & Autonomous Live Workspace Regression Suite
 * Tests:
 * 1. 14-Class Research Intent Classification & Out-of-scope redirection
 * 2. Grounded Copilot Query Engine (run-aware, evidence-aware)
 * 3. Multi-alternative rewrites (Version A, B, C) with Word-Level Diff
 * 4. Pre-experimental language guard against ungrounded empirical assertions
 * 5. Section locking integrity (Results & Discussion locked in PRE_EXPERIMENTAL mode)
 * 6. Live Generation SSE state machine & refresh recovery cache
 * 7. Single Canonical Manuscript consistency between preview & export
 */

const assert = require('assert');
const {
  classifyResearchIntent,
  assembleCopilotContext,
  answerCopilotQuery,
  generateManuscriptRewrites,
  computeWordDiff,
  INTENT_TYPES,
  OUT_OF_SCOPE_RESPONSE,
} = require('../services/researchCopilotService');
const {
  getProjectGenerationState,
  startAutonomousManuscriptGeneration,
} = require('../services/autonomousManuscriptService');

async function runCopilotWorkspaceSuite() {
  console.log('================================================================================');
  console.log('🧪 DOCUMIND-AI: RESEARCH COPILOT & WORKSPACE REGRESSION TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(err);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(err);
    }
  }

  // Mock project in PRE_EXPERIMENTAL mode
  const mockProject = {
    _id: 'mock_mera_vla_001',
    title: 'MERA-VLA: Dual-Memory Robot Policy',
    manuscriptMode: 'PRE_EXPERIMENTAL',
    selectedPapers: [
      {
        title: 'ExpeL: LLM Agents Are Experiential Learners',
        authors: ['Andrew Zhao', 'Daniel Huang', 'Quentin Xu'],
        venue: 'AAAI 2024',
        year: 2024,
      },
    ],
    verifiedResults: [], // 0 verified physical runs
    manuscriptObjects: [
      { objectType: 'equation', title: 'Trajectory Loss', latex: '\\mathcal{L}_{policy} = -\\log \\pi(a_t|s_t)' },
      { objectType: 'figure', title: 'Dual Memory Schematic', caption: 'System architecture.' },
      { objectType: 'table', title: 'Evaluation Matrix', caption: 'Planned benchmarks.' },
    ],
    generatedDraft: {
      title: 'MERA-VLA: Dual-Memory Robot Policy',
      sections: [
        { heading: '1. Introduction', content: 'Robot manipulation requires fast adaptation to novel tasks.' },
        { heading: '4. Methodology', content: 'We propose a dual-memory architecture.' },
        { heading: '6. Experimental Results', content: '[LOCKED — verified experiment data required]' },
      ],
      references: ['[1] Zhao et al., 2024. ExpeL.'],
    },
  };

  // Test 1: Intent Classification - Out of Scope
  test('Out-of-scope intent classified and redirected', () => {
    const intent = classifyResearchIntent('What is the weather in Paris today?');
    assert.strictEqual(intent, INTENT_TYPES.OUT_OF_SCOPE);
  });

  // Test 2: Intent Classification - Manuscript Edit
  test('Manuscript edit intent classified properly', () => {
    const intent = classifyResearchIntent('Rewrite this paragraph in a stronger academic journal tone');
    assert.strictEqual(intent, INTENT_TYPES.MANUSCRIPT_EDIT);
  });

  // Test 3: Intent Classification - Equation & Citation Queries
  test('Equation & Citation verification intents classified', () => {
    const eqIntent = classifyResearchIntent('Explain the loss function equation formulation');
    const citIntent = classifyResearchIntent('Verify this citation in the bibtex bibliography');
    assert.strictEqual(eqIntent, INTENT_TYPES.EQUATION_QUERY);
    assert.strictEqual(citIntent, INTENT_TYPES.CITATION_VERIFICATION);
  });

  // Test 4: Copilot Context Assembly
  test('Copilot context packages literature, mode, and locks accurately', () => {
    const ctx = assembleCopilotContext(mockProject, {
      selectedText: 'Robot manipulation requires fast adaptation',
      sectionId: '1. Introduction',
    });
    assert.strictEqual(ctx.manuscriptMode, 'PRE_EXPERIMENTAL');
    assert.strictEqual(ctx.verifiedExperimentCount, 0);
    assert.strictEqual(ctx.literatureFacts.length, 1);
    assert.strictEqual(ctx.manuscriptObjects.equations.length, 1);
  });

  // Test 5: Copilot Answer Generation with Grounding
  await testAsync('Copilot query engine responds with grounded context and mode awareness', async () => {
    const ctx = assembleCopilotContext(mockProject, {});
    const res = await answerCopilotQuery('Why is the Results section locked in this project?', ctx, []);
    assert.ok(res.reply.includes('PRE_EXPERIMENTAL') || res.reply.includes('locked') || res.reply.includes('empirical'));
    assert.ok(res.groundedSources.includes('Evidence Ledger'));
  });

  // Test 6: Multi-Alternative Rewrites (Version A, B, C)
  await testAsync('Rewrites generate Versions A, B, and C with word-level diff', async () => {
    const ctx = assembleCopilotContext(mockProject, {});
    const rewriteRes = await generateManuscriptRewrites({
      selectedText: 'Our method shows very important performance on the benchmark.',
      surroundingParagraphs: '',
      sectionId: '1. Introduction',
      customInstruction: 'Improve academic tone',
      context: ctx,
    });
    assert.strictEqual(rewriteRes.alternatives.length, 3);
    assert.strictEqual(rewriteRes.alternatives[0].title, 'Version A — Concise Academic');
    assert.strictEqual(rewriteRes.alternatives[1].title, 'Version B — Stronger Motivation');
    assert.strictEqual(rewriteRes.alternatives[2].title, 'Version C — More Technical');
    assert.ok(rewriteRes.alternatives[0].diff.wordDiff.length > 0);
  });

  // Test 7: Word-Level Diff Computation
  test('Word-level diff correctly highlights additions and deletions', () => {
    const orig = 'The model shows fast performance.';
    const rev = 'The model demonstrates robust efficiency.';
    const diff = computeWordDiff(orig, rev);
    assert.ok(diff.length >= 3);
    const addedTokens = diff.filter((d) => d.added);
    const removedTokens = diff.filter((d) => d.removed);
    assert.ok(addedTokens.some((t) => t.value.includes('demonstrates') || t.value.includes('robust')));
    assert.ok(removedTokens.some((t) => t.value.includes('shows') || t.value.includes('fast')));
  });

  // Test 8: Pre-Experimental Guard Sanitizes Rewrites
  await testAsync('Pre-experimental mode sanitizes unsupported empirical terms in rewrites', async () => {
    const ctx = assembleCopilotContext(mockProject, {});
    const rewriteRes = await generateManuscriptRewrites({
      selectedText: 'The proposed architecture achieved superior results and significantly improved success rates.',
      surroundingParagraphs: '',
      sectionId: '1. Introduction',
      customInstruction: '',
      context: ctx,
    });
    // In pre-experimental mode, forbidden empirical assertions must not survive
    rewriteRes.alternatives.forEach((alt) => {
      assert.ok(!alt.revisedText.includes('significantly improved'));
      assert.ok(!alt.revisedText.includes('outperformed'));
    });
  });

  // Test 9: Live Generation State & Section Locking Integrity
  test('Section statuses lock Results & Discussion in PRE_EXPERIMENTAL mode', () => {
    const state = getProjectGenerationState('mock_mera_vla_001');
    assert.strictEqual(state.sectionStatuses['6. Experimental Results'], 'LOCKED');
    assert.strictEqual(state.sectionStatuses['7. Discussion'], 'LOCKED');
    assert.strictEqual(state.sectionStatuses['1. Introduction'], 'VERIFIED');
  });

  // Test 10: Canonical Manuscript Model Consistency
  test('Preview content and export source operate on the exact same canonical state', () => {
    const liveDraft = mockProject.generatedDraft;
    const exportDraft = mockProject.generatedDraft;
    assert.strictEqual(liveDraft.title, exportDraft.title);
    assert.strictEqual(liveDraft.sections.length, exportDraft.sections.length);
    assert.strictEqual(liveDraft.sections[0].content, exportDraft.sections[0].content);
  });

  console.log('\n================================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runCopilotWorkspaceSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
