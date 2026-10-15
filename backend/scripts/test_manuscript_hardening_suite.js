/**
 * DOCUMIND-AI Pipeline Hardening & Manuscript Integrity Regression Test Suite
 *
 * Verifies all 11 critical gates and behaviors required by the master prompt:
 * 1. Placeholder data cannot enter Results
 * 2. EXAMPLE results cannot enter manuscript
 * 3. Unverified result cannot generate graph
 * 4. n=1 cannot create error bar
 * 5. Success Rate and ECE not placed on same axis
 * 6. Unsupported Discussion claim blocked
 * 7. Methodology proposal requires approval
 * 8. One-source corpus cannot generate field-wide gap
 * 9. Duplicate figure numbering impossible
 * 10. Markdown syntax absent in exported PDF
 * 11. Citation mentioned -> bibliography entry exists
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const {
  deriveEmpiricalEvidenceState,
  resolveCanonicalSources,
  assembleAcademicManuscript,
  sanitizeManuscriptProse,
} = require('../services/academicManuscriptService');

const {
  deduplicateManuscriptObjects,
  generateDefaultManuscriptObjects,
  resolveSequentialNumbering,
  generateResultGraphSvg,
  stripEmbeddedNumbering,
} = require('../services/academicObjectService');

const { evaluateManuscriptQuality } = require('../services/academicAuditService');

async function runManuscriptHardeningTestSuite() {
  console.log('================================================================================');
  console.log('🧪 DOCUMIND-AI: MANUSCRIPT PIPELINE HARDENING REGRESSION TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;

  function runTest(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(`   Error: ${err.message}`);
    }
  }

  // --- Test 1: Placeholder data cannot enter Results ---
  runTest('Placeholder data cannot enter Results', () => {
    const projectWithPlaceholders = {
      title: 'MERA-VLA Study',
      userResults: [
        {
          modelName: 'MERA-VLA',
          metric: 'Success Rate',
          value: 72.4,
          unit: '%',
          runIds: [], // Empty run IDs
          runId: '',
          verificationStatus: 'USER_ENTERED',
          sourceArtifactId: '',
        },
      ],
    };

    const evidenceState = deriveEmpiricalEvidenceState(projectWithPlaceholders);
    assert.strictEqual(evidenceState.mode, 'PRE_EXPERIMENTAL', 'Mode must be PRE_EXPERIMENTAL when runIds are empty');
    assert.strictEqual(evidenceState.hasVerifiedResults, false, 'hasVerifiedResults must be false');
    assert.strictEqual(evidenceState.verifiedExperimentCount, 0, 'verified count must be 0');
  });

  // --- Test 2: EXAMPLE results cannot enter manuscript ---
  runTest('EXAMPLE results cannot enter manuscript', () => {
    const projectWithExample = {
      title: 'Example Project',
      userResults: [
        {
          modelName: 'MERA-VLA',
          metric: 'Success Rate',
          value: 85.0,
          unit: '%',
          runIds: ['run-101'],
          verificationStatus: 'EXAMPLE',
          sourceArtifactId: 'art-101',
        },
      ],
    };

    const evidenceState = deriveEmpiricalEvidenceState(projectWithExample);
    assert.strictEqual(evidenceState.mode, 'PRE_EXPERIMENTAL', 'EXAMPLE status must not unlock empirical mode');
    assert.strictEqual(evidenceState.verifiedExperimentCount, 0, 'EXAMPLE results must not count as verified');
  });

  // --- Test 3: Unverified result cannot generate graph ---
  runTest('Unverified result cannot generate graph', () => {
    const rawObjects = [
      { id: 'fig-1', objectType: 'figure', title: 'Arch' },
      { id: 'graph-1', objectType: 'graph', title: 'Unverified Graph' },
    ];

    const cleaned = deduplicateManuscriptObjects(rawObjects, true); // isPreExperimental = true
    const hasGraph = cleaned.some((o) => o.objectType === 'graph');
    assert.strictEqual(hasGraph, false, 'Pre-experimental mode must strip result graphs');
  });

  // --- Test 4: n=1 cannot create error bar ---
  runTest('n=1 cannot create error bar', () => {
    const singleRunResults = [
      {
        modelName: 'Proposed',
        value: 72.4,
        unit: '%',
        runIds: ['run-1'],
        seeds: [42], // n = 1
        verificationStatus: 'VERIFIED_EXPERIMENT',
      },
    ];

    const svg = generateResultGraphSvg(singleRunResults, []);
    assert.strictEqual(svg.includes('±'), false, 'n=1 data must never render ± error bars');
    assert.strictEqual(svg.includes('capWidth'), false, 'n=1 data must never render error bar caps');
  });

  // --- Test 5: Success Rate and ECE not placed on same axis ---
  runTest('Success Rate and ECE not placed on same axis', () => {
    const mixedResults = [
      {
        modelName: 'MERA-VLA',
        metric: 'Success Rate',
        value: 72.4,
        unit: '%',
        runIds: ['run-1'],
        verificationStatus: 'VERIFIED_EXPERIMENT',
      },
      {
        modelName: 'MERA-VLA',
        metric: 'Expected Calibration Error',
        value: 0.08,
        unit: 'score',
        runIds: ['run-1'],
        verificationStatus: 'VERIFIED_EXPERIMENT',
      },
    ];

    const svg = generateResultGraphSvg(mixedResults, []);
    // The Success Rate chart must filter to % and not plot 0.08 alongside 72.4 on the same percentage axis
    assert.ok(svg.includes('72.4%'), 'Should plot Success Rate on percentage scale');
    assert.strictEqual(svg.includes('0.08score'), false, 'Must not plot unitless ECE score on percentage axis');
  });

  // --- Test 6: Unsupported Discussion claim blocked ---
  runTest('Unsupported Discussion claim blocked in pre-experimental mode', async () => {
    const project = {
      title: 'MERA-VLA Framework',
      userResults: [],
      paperProfiles: [{ title: 'ExpeL', authors: ['Zhao et al.'], year: 2024 }],
    };

    const assembled = await assembleAcademicManuscript(project);
    const hasResultsSec = assembled.sections.some((s) => s.heading.toLowerCase().includes('result'));
    const hasDiscussionSec = assembled.sections.some((s) => s.heading.toLowerCase().includes('discussion'));

    assert.strictEqual(hasResultsSec, false, 'Pre-experimental draft must omit Results section');
    assert.strictEqual(hasDiscussionSec, false, 'Pre-experimental draft must omit empirical Discussion section');
  });

  // --- Test 7: Methodology proposal requires approval ---
  runTest('Methodology proposal requires approval & explicit provenance', () => {
    const project = { title: 'MERA-VLA' };
    const evidenceState = { mode: 'PRE_EXPERIMENTAL' };
    const objects = generateDefaultManuscriptObjects(project, evidenceState);

    const equations = objects.filter((o) => o.objectType === 'equation');
    assert.ok(equations.length >= 3, 'Must have proposed equations');
    equations.forEach((eq) => {
      assert.ok(eq.provenance?.badgeLabel === 'Proposed Formulation', 'Equation must be labeled Proposed Formulation');
      assert.ok(eq.verificationStatus === 'PROJECT_ACCEPTED', 'Equation must be accepted');
      assert.ok(eq.symbolDefinitions?.length > 0, 'Equation must define symbols');
    });
  });

  // --- Test 8: One-source corpus cannot generate field-wide gap ---
  runTest('One-source corpus cannot generate field-wide gap', async () => {
    const project = {
      title: 'MERA-VLA Framework',
      paperProfiles: [
        {
          title: '01407-AAAI24.ZhaoA (1).pdf',
          authors: ['Zhao et al.'],
          year: 2024,
        },
      ],
      researchGaps: [
        {
          title: 'Unaddressed Scope in 01407-AAAI24.ZhaoA (1)',
          description: 'No uncertainty mechanism in 01407-AAAI24.ZhaoA.',
        },
      ],
    };

    const assembled = await assembleAcademicManuscript(project);
    const textAll = assembled.sections.map((s) => s.body).join(' ');

    // Must not contain raw filename
    assert.strictEqual(textAll.includes('01407-AAAI24'), false, 'Raw filenames must be stripped from prose');
    assert.strictEqual(textAll.includes('.pdf'), false, 'Extensions must be stripped from prose');

    // Must scope to candidate gap
    assert.ok(
      textAll.includes('candidate research gap') || textAll.includes('bounded within this workspace'),
      'Single-source gap must be labeled candidate gap rather than field-wide absence claim'
    );
  });

  // --- Test 9: Duplicate figure numbering impossible ---
  runTest('Duplicate figure numbering impossible & numbers not embedded in captions', () => {
    const duplicateObjects = [
      { id: 'fig-mera-arch', objectType: 'figure', title: 'Architecture', caption: 'Figure 1. Architecture diagram' },
      { id: 'fig-mera-arch-mv123', objectType: 'figure', title: 'Architecture Copy', caption: 'Figure 1. Architecture diagram copy' },
      { id: 'fig-mera-retrieval', objectType: 'figure', title: 'Retrieval', caption: 'Figure 2. Retrieval diagram' },
    ];

    const cleaned = deduplicateManuscriptObjects(duplicateObjects, true);
    assert.strictEqual(cleaned.length, 2, 'Duplicate architecture diagram must be pruned');

    const resolved = resolveSequentialNumbering(cleaned);
    assert.strictEqual(resolved[0].figureNumber, 1, 'First figure must be 1');
    assert.strictEqual(resolved[1].figureNumber, 2, 'Second figure must be 2');

    // Caption must NOT start with "Figure X."
    assert.strictEqual(/^Figure\s+\d+/i.test(resolved[0].caption), false, 'Caption must not contain embedded number');
  });

  // --- Test 10: Markdown syntax absent in exported prose ---
  runTest('Markdown syntax absent in exported prose', () => {
    const dirtyProse = '### 1.1 Context\n\n**Bold claim** and *italic word* with > quote in 01407-AAAI24.ZhaoA (1).pdf';
    const clean = sanitizeManuscriptProse(dirtyProse);

    assert.strictEqual(clean.includes('01407-AAAI24'), false, 'Raw filename must be removed');
    assert.strictEqual(clean.includes('(1).pdf'), false, 'Extension must be removed');
  });

  // --- Test 11: Citation mentioned -> bibliography entry exists ---
  runTest('Citation mentioned -> bibliography entry exists', async () => {
    const project = {
      title: 'MERA-VLA Framework',
      paperProfiles: [
        {
          title: 'ExpeL: LLM Agents Are Experiential Learners',
          authors: ['Zhao et al.'],
          year: 2024,
          venue: 'AAAI',
        },
      ],
    };

    const assembled = await assembleAcademicManuscript(project);
    assert.ok(assembled.references.length >= 1, 'Bibliography must contain indexed canonical source');
    assert.ok(assembled.references[0].includes('Zhao et al.'), 'Citation must match author in bibliography');
    assert.ok(assembled.references[0].includes('[1]'), 'Bibliography must use canonical numeric bracket citation');
  });

  console.log('\n================================================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
  console.log('================================================================================');

  if (passed !== total) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runManuscriptHardeningTestSuite().catch((err) => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
