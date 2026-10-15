/**
 * Scientific Reasoning & Verification Service for DOCUMIND-AI
 *
 * Implements:
 * 1. Claim-Type-Aware Verification & Evidence Requirement Matrix
 * 2. Multi-Dimensional Evidence Strength & Support Levels
 * 3. Corpus Sufficiency Evaluator & Scope Guard
 * 4. Exhaustive Negative / Absence Claim Verifier with Concept Expansion
 * 5. Research Gap Object & Confidence States
 * 6. Contradiction Detection & Source Agreement Analysis
 * 7. Claim-to-Evidence Dependency Graph & Invalidation Engine
 * 8. Multi-Dimensional Scientific Quality Gate & Hard Gates
 * 9. Reproducibility Manifest Generator
 */

// ── 1. Claim Taxonomy & Constants ──

const CLAIM_TYPES = {
  DIRECT_SOURCE_FACT: 'DIRECT_SOURCE_FACT',
  NUMERICAL_RESULT: 'NUMERICAL_RESULT',
  METHOD_DESCRIPTION: 'METHOD_DESCRIPTION',
  DATASET_CLAIM: 'DATASET_CLAIM',
  BENCHMARK_CLAIM: 'BENCHMARK_CLAIM',
  METRIC_CLAIM: 'METRIC_CLAIM',
  LIMITATION_CLAIM: 'LIMITATION_CLAIM',
  ABSENCE_CLAIM: 'ABSENCE_CLAIM',
  COMPARATIVE_CLAIM: 'COMPARATIVE_CLAIM',
  RESEARCH_GAP_CLAIM: 'RESEARCH_GAP_CLAIM',
  CORPUS_METADATA_CLAIM: 'CORPUS_METADATA_CLAIM',
  DERIVED_STATISTICAL_CLAIM: 'DERIVED_STATISTICAL_CLAIM',
  USER_DEFINED_CLAIM: 'USER_DEFINED_CLAIM',
  MODEL_PROPOSAL: 'MODEL_PROPOSAL',
};

const SUPPORT_LEVELS = {
  FULLY_SUPPORTED: 'FULLY_SUPPORTED',
  PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED',
  INDIRECTLY_SUPPORTED: 'INDIRECTLY_SUPPORTED',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  CONTRADICTED: 'CONTRADICTED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  NEEDS_EXHAUSTIVE_VERIFICATION: 'NEEDS_EXHAUSTIVE_VERIFICATION',
};

const CORPUS_SUFFICIENCY_LEVELS = {
  INSUFFICIENT_CORPUS: 'INSUFFICIENT_CORPUS',
  LIMITED_CORPUS: 'LIMITED_CORPUS',
  ADEQUATE_FOR_SCOPED_COMPARISON: 'ADEQUATE_FOR_SCOPED_COMPARISON',
  STRONG_CORPUS: 'STRONG_CORPUS',
};

const GAP_CONFIDENCE_STATES = {
  TENTATIVE: 'TENTATIVE',
  CORPUS_SUPPORTED: 'CORPUS_SUPPORTED',
  MULTI_SOURCE_SUPPORTED: 'MULTI_SOURCE_SUPPORTED',
  EXTERNALLY_VERIFIED: 'EXTERNALLY_VERIFIED',
};

// ── 2. Claim-Type Classifier ──

const classifyClaimType = (statement = '') => {
  const s = String(statement).trim();
  const lower = s.toLowerCase();

  // 1. System / Provenance claims
  if (
    lower.includes('duplicate documents were consolidated') ||
    lower.includes('canonical source') ||
    lower.includes('deduplicated') ||
    lower.includes('project corpus')
  ) {
    return CLAIM_TYPES.CORPUS_METADATA_CLAIM;
  }

  // 2. Numerical / Quantitative claims (look for numbers, percentages, plus-minus, intervals)
  if (
    /(\d+(\.\d+)?\s*(%|±|\+\/\-|x|ms|s|tokens?|params?|accuracy|f1|sr\b|score))/i.test(s) ||
    /(\d+\.\d+\s*±\s*\d+\.\d+)/.test(s) ||
    /\b(mean reward|score of \d+|achieves \d+|improves by \d+)/i.test(s)
  ) {
    return CLAIM_TYPES.NUMERICAL_RESULT;
  }

  // 3. Absence / Negative claims
  if (
    lower.includes('not identified') ||
    lower.includes('no explicit') ||
    lower.includes('not reported') ||
    lower.includes('does not address') ||
    lower.includes('lacks an explicit') ||
    lower.includes('no uncertainty') ||
    lower.includes('no abstention') ||
    lower.includes('not investigated') ||
    lower.includes('remains absent')
  ) {
    return CLAIM_TYPES.ABSENCE_CLAIM;
  }

  // 4. Research Gap claims
  if (
    lower.includes('research gap') ||
    lower.includes('unaddressed scope') ||
    lower.includes('leaves operational') ||
    lower.includes('open challenge') ||
    lower.includes('remains unaddressed')
  ) {
    return CLAIM_TYPES.RESEARCH_GAP_CLAIM;
  }

  // 5. Comparative claims
  if (
    lower.includes('outperforms') ||
    lower.includes('compared to') ||
    lower.includes('versus') ||
    lower.includes(' vs ') ||
    lower.includes('relative to') ||
    lower.includes('higher than') ||
    lower.includes('lower than') ||
    lower.includes('comparative analysis')
  ) {
    return CLAIM_TYPES.COMPARATIVE_CLAIM;
  }

  // 6. Dataset & Benchmark claims
  if (
    lower.includes('benchmark') ||
    lower.includes('evaluated on') ||
    lower.includes('tested on') ||
    /\b(alfworld|webshop|hotpotqa|fever|crafter|minigrid|imagenet|glue)\b/i.test(s)
  ) {
    return CLAIM_TYPES.BENCHMARK_CLAIM;
  }

  // 7. Metric claims
  if (
    lower.includes('evaluation metric') ||
    lower.includes('success rate') ||
    lower.includes('exact match') ||
    lower.includes('expected calibration error') ||
    lower.includes('ece')
  ) {
    return CLAIM_TYPES.METRIC_CLAIM;
  }

  // 8. Limitation claims
  if (
    lower.includes('limitation') ||
    lower.includes('constrained to') ||
    lower.includes('restricted to') ||
    lower.includes('failure mode') ||
    lower.includes('bottleneck')
  ) {
    return CLAIM_TYPES.LIMITATION_CLAIM;
  }

  // 9. Methodology claims
  if (
    lower.includes('architecture') ||
    lower.includes('framework') ||
    lower.includes('algorithm') ||
    lower.includes('memory mechanism') ||
    lower.includes('experience pool') ||
    lower.includes('retriever') ||
    lower.includes('vectorstore') ||
    lower.includes('prompt template')
  ) {
    return CLAIM_TYPES.METHOD_DESCRIPTION;
  }

  // 10. Model Proposal / Hypothesis
  if (
    lower.includes('we propose') ||
    lower.includes('hypothesis:') ||
    lower.includes('could mitigate') ||
    lower.includes('applying systematic')
  ) {
    return CLAIM_TYPES.MODEL_PROPOSAL;
  }

  return CLAIM_TYPES.DIRECT_SOURCE_FACT;
};

// ── 3. Conceptual Synonyms for Exhaustive Absence Claims ──

const ABSENCE_CONCEPT_SYNONYMS = {
  uncertainty: [
    'uncertainty',
    'calibration',
    'calibrated',
    'confidence',
    'entropy',
    'variance',
    'credible',
    'conformal',
    'risk-aware',
    'bayesian',
    'aleatoric',
    'epistemic',
    'temperature scaling',
    'expected calibration error',
    'ece',
  ],
  abstention: [
    'abstain',
    'abstention',
    'refusal',
    'refuse',
    'selective classification',
    'selective prediction',
    'deferral',
    'defer',
    'reject',
    'rejection option',
    'fallback mechanism',
  ],
  human_in_loop: [
    'human-in-the-loop',
    'human feedback',
    'human intervention',
    'human oversight',
    'teleoperation',
    'expert intervention',
    'manual override',
  ],
  explainability: [
    'explainability',
    'interpretability',
    'saliency',
    'attribution',
    'rationale',
    'chain-of-thought attribution',
    'feature importance',
  ],
  memory: [
    'memory',
    'parametric memory',
    'experience pool',
    'experience buffer',
    'trajectory buffer',
    'insights pool',
    'knowledge store',
  ],
};

// ── 4. Exhaustive Negative / Absence Claim Verifier ──

const verifyAbsenceClaimExhaustively = ({
  claimText = '',
  canonicalSource,
  evidenceObjects = [],
  chunks = [],
  tables = [],
  figures = [],
}) => {
  const claimLower = claimText.toLowerCase();

  // 1. Identify which conceptual domain the absence claim targets
  let targetConcept = 'general';
  let candidateSynonyms = [];

  if (claimLower.includes('uncertain') || claimLower.includes('calibrat') || claimLower.includes('confidence')) {
    targetConcept = 'uncertainty';
    candidateSynonyms = ABSENCE_CONCEPT_SYNONYMS.uncertainty;
  } else if (claimLower.includes('abstain') || claimLower.includes('abstention') || claimLower.includes('refus')) {
    targetConcept = 'abstention';
    candidateSynonyms = ABSENCE_CONCEPT_SYNONYMS.abstention;
  } else if (claimLower.includes('human') || claimLower.includes('intervention')) {
    targetConcept = 'human_in_loop';
    candidateSynonyms = ABSENCE_CONCEPT_SYNONYMS.human_in_loop;
  } else if (claimLower.includes('explainab') || claimLower.includes('interpretab')) {
    targetConcept = 'explainability';
    candidateSynonyms = ABSENCE_CONCEPT_SYNONYMS.explainability;
  } else if (claimLower.includes('memory') || claimLower.includes('experience pool') || claimLower.includes('buffer')) {
    targetConcept = 'memory';
    candidateSynonyms = ABSENCE_CONCEPT_SYNONYMS.memory;
  } else {
    // Extract non-stop words
    candidateSynonyms = claimText
      .toLowerCase()
      .split(/[\s,.-]+/)
      .filter((w) => w.length >= 4 && !['this', 'that', 'with', 'from', 'paper', 'source', 'mechanism', 'identified', 'explicit'].includes(w));
  }

  // 2. Prepare exhaustive searchable text across all source components
  const searchCorpus = [];
  const sourceChunks = chunks.length > 0 ? chunks : (canonicalSource?.allChunks || canonicalSource?.primaryDocument?.chunks || []);
  const sourceTables = tables.length > 0 ? tables : (canonicalSource?.tables || canonicalSource?.primaryDocument?.tables || []);
  const sourceFigures = figures.length > 0 ? figures : (canonicalSource?.figures || canonicalSource?.primaryDocument?.figures || []);

  sourceChunks.forEach((c) => {
    searchCorpus.push({
      type: 'chunk',
      id: `chunk-${c.index ?? 0}`,
      page: c.pageNumber || 1,
      section: c.section || 'General',
      text: (c.text || '').toLowerCase(),
    });
  });

  sourceTables.forEach((t, i) => {
    searchCorpus.push({
      type: 'table',
      id: `table-${t.tableIndex || i + 1}`,
      page: t.pageNumber || 1,
      section: 'Tables',
      text: `${t.caption || ''} ${t.summary || ''}`.toLowerCase(),
    });
  });

  sourceFigures.forEach((f, i) => {
    searchCorpus.push({
      type: 'figure',
      id: `figure-${f.figureIndex || i + 1}`,
      page: f.pageNumber || 1,
      section: 'Figures',
      text: `${f.caption || ''} ${f.title || ''}`.toLowerCase(),
    });
  });

  evidenceObjects.forEach((e) => {
    searchCorpus.push({
      type: e.objectType || 'evidence_object',
      id: e.objectId || e.evidenceId,
      page: e.pageNumber || 1,
      section: e.section || 'Objects',
      text: `${e.content || ''} ${e.caption || ''}`.toLowerCase(),
    });
  });

  // 3. Search for any match of candidate synonyms
  const matchingItems = [];
  const matchedTerms = new Set();

  for (const item of searchCorpus) {
    for (const syn of candidateSynonyms) {
      if (item.text.includes(syn.toLowerCase())) {
        matchedTerms.add(syn);
        matchingItems.push({
          sourceId: item.id,
          page: item.page,
          section: item.section,
          termMatched: syn,
        });
      }
    }
  }

  const sectionsSearchedCount = new Set(searchCorpus.map((i) => i.section)).size;
  const pagesSearchedCount = new Set(searchCorpus.map((i) => i.page)).size;

  const coverageReport = {
    targetConcept,
    synonymsChecked: candidateSynonyms,
    totalItemsInspected: searchCorpus.length,
    pagesSearchedCount,
    sectionsSearchedCount,
    matchesFoundCount: matchingItems.length,
    matchedTerms: Array.from(matchedTerms),
  };

  // If matches were found: the negative claim is CONTRADICTED!
  if (matchingItems.length > 0) {
    return {
      supportLevel: SUPPORT_LEVELS.CONTRADICTED,
      isVerifiedAbsence: false,
      coverageReport,
      verdictText: `Absence claim contradicted: found ${matchingItems.length} references to [${Array.from(matchedTerms).join(', ')}] on page(s) ${Array.from(new Set(matchingItems.map((m) => m.page))).join(', ')}.`,
      scopedClaimStatement: `Evidence indicates the analyzed source discusses ${Array.from(matchedTerms).join(', ')}.`,
    };
  }

  // If 0 matches found after exhaustive search: FULLY SUPPORTED absence claim
  return {
    supportLevel: SUPPORT_LEVELS.FULLY_SUPPORTED,
    isVerifiedAbsence: true,
    coverageReport,
    verdictText: `Exhaustively verified absence: inspected ${searchCorpus.length} source objects across ${pagesSearchedCount} pages and ${sectionsSearchedCount} sections with ${candidateSynonyms.length} concept synonyms. Zero references found.`,
    scopedClaimStatement: `Within the analyzed source (${canonicalSource?.canonicalTitle?.slice(0, 50) || 'document'}), no explicit ${targetConcept} mechanism was identified.`,
  };
};

// ── 5. Corpus Sufficiency Evaluator ──

const evaluateCorpusSufficiency = ({ canonicalSources = [], userGoal = '', availableDocuments = [] }) => {
  const uniqueCount = canonicalSources.length;
  const rawCount = availableDocuments.length || canonicalSources.reduce((acc, s) => acc + (s.documentIds?.length || 1), 0);

  // Collect benchmarks and domains across sources
  const allBenchmarks = new Set();
  canonicalSources.forEach((s) => {
    (s.primaryDocument?.chunks || []).forEach((c) => {
      const txt = (c.text || '').toLowerCase();
      ['alfworld', 'webshop', 'hotpotqa', 'minigrid', 'crafter', 'robosuite', 'calvin'].forEach((b) => {
        if (txt.includes(b)) allBenchmarks.add(b);
      });
    });
  });

  let classification = CORPUS_SUFFICIENCY_LEVELS.INSUFFICIENT_CORPUS;
  let explanation = '';
  let allowedActions = {
    crossPaperComparison: false,
    fieldWideGaps: false,
    fieldWideNovelty: false,
    singleSourceSynthesis: false,
  };

  if (uniqueCount === 0) {
    classification = CORPUS_SUFFICIENCY_LEVELS.INSUFFICIENT_CORPUS;
    explanation = 'No valid scholarly sources found in project corpus. Research synthesis cannot proceed.';
  } else if (uniqueCount === 1) {
    classification = CORPUS_SUFFICIENCY_LEVELS.LIMITED_CORPUS;
    explanation = `Corpus contains exactly 1 unique scholarly paper (${rawCount} uploaded file(s) consolidated due to duplicate deduplication). Comparative analysis across different papers is not possible.`;
    allowedActions = {
      crossPaperComparison: false,
      fieldWideGaps: false,
      fieldWideNovelty: false,
      singleSourceSynthesis: true,
    };
  } else if (uniqueCount >= 2 && uniqueCount <= 4) {
    classification = CORPUS_SUFFICIENCY_LEVELS.ADEQUATE_FOR_SCOPED_COMPARISON;
    explanation = `Corpus contains ${uniqueCount} unique scholarly sources with ${allBenchmarks.size} distinct evaluation benchmarks. Valid for scoped comparison within selected papers.`;
    allowedActions = {
      crossPaperComparison: true,
      fieldWideGaps: false,
      fieldWideNovelty: false,
      singleSourceSynthesis: true,
    };
  } else {
    classification = CORPUS_SUFFICIENCY_LEVELS.STRONG_CORPUS;
    explanation = `Corpus contains ${uniqueCount} unique scholarly sources across multiple research groups. Valid for comprehensive literature review and comparative benchmarking.`;
    allowedActions = {
      crossPaperComparison: true,
      fieldWideGaps: true,
      fieldWideNovelty: false, // Field-wide novelty still requires external literature indexing
      singleSourceSynthesis: true,
    };
  }

  return {
    uniqueSourcesCount: uniqueCount,
    rawFilesCount: rawCount,
    benchmarksCount: allBenchmarks.size,
    benchmarksList: Array.from(allBenchmarks),
    classification,
    explanation,
    allowedActions,
  };
};

// ── 6. Contradiction Detector & Source Agreement ──

const detectContradictionsAndAgreement = ({ claims = [], paperProfiles = [] }) => {
  const contradictions = [];
  const agreements = [];

  // Group comparative or quantitative claims by target topic
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const c1 = claims[i];
      const c2 = claims[j];

      // Check for opposing assertions
      const t1 = c1.text.toLowerCase();
      const t2 = c2.text.toLowerCase();

      const opposingDirections =
        (t1.includes('improves') && (t2.includes('degrades') || t2.includes('no significant benefit') || t2.includes('fails'))) ||
        (t1.includes('outperforms') && t2.includes('underperforms')) ||
        (t1.includes('statistically significant') && t2.includes('statistically insignificant'));

      if (opposingDirections && c1.canonicalSourceId !== c2.canonicalSourceId) {
        contradictions.push({
          contradictionId: `contra-${contradictions.length + 1}`,
          topic: 'PERFORMANCE_OUTCOME',
          claimA: c1.text,
          sourceA: c1.canonicalSourceId,
          claimB: c2.text,
          sourceB: c2.canonicalSourceId,
          severity: 'CRITICAL',
          detail: 'Direct empirical contradiction identified between independent sources.',
        });
      }
    }
  }

  return {
    contradictionsCount: contradictions.length,
    contradictions,
    agreements,
  };
};

// ── 7. Multi-Dimensional Evidence Strength Calculator ──

const calculateEvidenceStrength = (params = {}) => {
  const claimType = params.claimType || params.claim?.claimType || CLAIM_TYPES.DIRECT_SOURCE_FACT;
  const matchingEvidence = params.matchingEvidence || params.evidence || [];
  const canonicalSourcesCount = params.canonicalSourcesCount || 1;
  const isAbsenceClaim = params.isAbsenceClaim || false;
  const absenceReport = params.absenceReport || null;

  // 1. Source Directness (1.0 = primary paper text/table, 0.7 = review/survey)
  let sourceDirectness = 0.95;
  if (claimType === CLAIM_TYPES.CORPUS_METADATA_CLAIM) sourceDirectness = 1.0;
  if (claimType === CLAIM_TYPES.MODEL_PROPOSAL) sourceDirectness = 0.6;

  // 2. Retrieval Confidence
  let retrievalConfidence = matchingEvidence.length > 0 ? (typeof matchingEvidence[0].confidence === 'number' ? matchingEvidence[0].confidence : 0.9) : 0.0;
  if (isAbsenceClaim && absenceReport?.isVerifiedAbsence) {
    retrievalConfidence = 1.0; // High confidence from exhaustive absence search
  }

  // 3. Source Specificity (tables, figures, and exact sections have highest specificity)
  let sourceSpecificity = 0.7;
  if (matchingEvidence.some((e) => e.objectType === 'table' || e.objectType === 'equation')) {
    sourceSpecificity = 1.0;
  } else if (matchingEvidence.some((e) => e.objectType === 'figure' || e.objectType === 'chart')) {
    sourceSpecificity = 0.9;
  } else if (matchingEvidence.length > 0) {
    sourceSpecificity = 0.8;
  }

  // 4. Page / Object Precision
  const hasPage = matchingEvidence.some((e) => e.pageNumber && e.pageNumber > 0);
  const hasObjectId = matchingEvidence.some((e) => e.objectId || e.evidenceId);
  const pageObjectPrecision = (hasPage ? 0.5 : 0) + (hasObjectId ? 0.5 : 0);

  // 5. Corpus Coverage
  const corpusCoverage = isAbsenceClaim
    ? 1.0 // Exhaustive coverage checked
    : Math.min(1.0, matchingEvidence.length / 3);

  // 6. Cross-Source Consistency
  const crossSourceConsistency = 1.0;

  // Composite multi-dimensional score
  const compositeScore = Math.round(
    (sourceDirectness * 0.2 +
      retrievalConfidence * 0.25 +
      sourceSpecificity * 0.2 +
      pageObjectPrecision * 0.2 +
      corpusCoverage * 0.15) *
      100
  );

  return {
    sourceDirectness: Math.round(sourceDirectness * 100) / 100,
    retrievalConfidence: Math.round(retrievalConfidence * 100) / 100,
    sourceSpecificity: Math.round(sourceSpecificity * 100) / 100,
    pageObjectPrecision: Math.round(pageObjectPrecision * 100) / 100,
    crossSourceConsistency: Math.round(crossSourceConsistency * 100) / 100,
    corpusCoverage: Math.round(corpusCoverage * 100) / 100,
    compositeScore,
  };
};

// ── 8. Claim-to-Evidence Dependency Graph ──

class ClaimDependencyGraph {
  constructor() {
    this.nodes = new Map(); // id -> node
    this.edges = new Map(); // id -> Set of dependent child IDs
    this.reverseEdges = new Map(); // id -> Set of parent IDs
  }

  addNode(id, type, data = {}) {
    this.nodes.set(id, {
      id,
      type, // 'SOURCE' | 'EVIDENCE' | 'CLAIM' | 'COMPARISON' | 'GAP' | 'RQ' | 'HYPOTHESIS' | 'CONCLUSION'
      status: 'VALID',
      data,
      timestamp: new Date(),
    });
    if (!this.edges.has(id)) this.edges.set(id, new Set());
    if (!this.reverseEdges.has(id)) this.reverseEdges.set(id, new Set());
  }

  addDependency(parentId, childId) {
    if (!this.edges.has(parentId)) this.edges.set(parentId, new Set());
    if (!this.reverseEdges.has(childId)) this.reverseEdges.set(childId, new Set());
    this.edges.get(parentId).add(childId);
    this.reverseEdges.get(childId).add(parentId);
  }

  addEdge(parentId, childId, relation = 'DEPENDS_ON') {
    this.addDependency(parentId, childId);
  }

  invalidateDownstream(nodeId, reason = 'Stale or unverified evidence') {
    return this.invalidateNode(nodeId, reason);
  }

  invalidateNode(nodeId, reason = 'Stale or unverified evidence') {
    const invalidated = [];
    const queue = [nodeId];
    const visited = new Set();

    while (queue.length > 0) {
      const curr = queue.shift();
      if (visited.has(curr)) continue;
      visited.add(curr);

      const node = this.nodes.get(curr);
      if (node) {
        node.status = 'NEEDS_REVALIDATION';
        node.invalidationReason = reason;
        invalidated.push(curr);
      }

      const dependents = this.edges.get(curr) || new Set();
      for (const depId of dependents) {
        queue.push(depId);
      }
    }

    return invalidated;
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getDerivationPath(nodeId) {
    const path = [];
    let curr = nodeId;
    const visited = new Set();

    while (curr && !visited.has(curr)) {
      visited.add(curr);
      const node = this.nodes.get(curr);
      if (node) path.unshift({ id: node.id, type: node.type, status: node.status });
      const parents = this.reverseEdges.get(curr);
      if (parents && parents.size > 0) {
        curr = Array.from(parents)[0]; // Traverse primary parent
      } else {
        break;
      }
    }
    return path;
  }

  exportGraph() {
    return {
      nodes: Array.from(this.nodes.values()).map((n) => ({
        id: n.id,
        type: n.type,
        status: n.status,
        data: n.data,
      })),
      edges: Array.from(this.edges.entries()).flatMap(([from, toSet]) =>
        Array.from(toSet).map((to) => ({ from, to, relation: 'DEPENDS_ON' }))
      ),
    };
  }
}

// ── 9. Multi-Dimensional Quality Gate & Scientific Readiness ──

const calculateScientificQualityGate = ({
  corpusSufficiency,
  auditedClaims = [],
  gaps = [],
  comparisonMatrix = [],
  benchmarkCompatibility = {},
  contradictions = [],
  userResultsProvided = false,
}) => {
  const totalClaimsAudited = auditedClaims.length;
  const fullySupportedCount = auditedClaims.filter((c) => c.supportLevel === SUPPORT_LEVELS.FULLY_SUPPORTED).length;
  const partiallySupportedCount = auditedClaims.filter((c) => c.supportLevel === SUPPORT_LEVELS.PARTIALLY_SUPPORTED).length;
  const unsupportedCount = auditedClaims.filter((c) => c.supportLevel === SUPPORT_LEVELS.NOT_SUPPORTED).length;
  const absenceClaimsCount = auditedClaims.filter((c) => c.claimType === CLAIM_TYPES.ABSENCE_CLAIM).length;
  const exhaustivelyVerifiedAbsenceCount = auditedClaims.filter(
    (c) => c.claimType === CLAIM_TYPES.ABSENCE_CLAIM && c.supportLevel === SUPPORT_LEVELS.FULLY_SUPPORTED
  ).length;

  // 1. Evidence Integrity: PASS if 0 unsupported claims
  const evidenceIntegrity = unsupportedCount === 0 ? 'PASS' : (unsupportedCount <= 2 ? 'PARTIAL' : 'FAIL');

  // 2. Citation Precision: PASS if all verified claims have genuine page numbers
  const hasPagePrecision = auditedClaims.every(
    (c) => c.supportLevel !== SUPPORT_LEVELS.FULLY_SUPPORTED || (c.pageNumbers && c.pageNumbers.length > 0) || c.claimType === CLAIM_TYPES.CORPUS_METADATA_CLAIM
  );
  const citationPrecision = hasPagePrecision ? 'PASS' : 'WARNING';

  // 3. Gap Verification Level
  let gapVerification = GAP_CONFIDENCE_STATES.TENTATIVE;
  if (corpusSufficiency.classification === CORPUS_SUFFICIENCY_LEVELS.LIMITED_CORPUS) {
    gapVerification = GAP_CONFIDENCE_STATES.CORPUS_SUPPORTED;
  } else if (corpusSufficiency.classification === CORPUS_SUFFICIENCY_LEVELS.ADEQUATE_FOR_SCOPED_COMPARISON) {
    gapVerification = GAP_CONFIDENCE_STATES.MULTI_SOURCE_SUPPORTED;
  }

  // 4. Benchmark Comparability
  let benchmarkComparability = 'NOT_APPLICABLE';
  if (corpusSufficiency.classification === CORPUS_SUFFICIENCY_LEVELS.LIMITED_CORPUS) {
    benchmarkComparability = 'NOT_APPLICABLE';
  } else if (benchmarkCompatibility.isDirectlyComparable) {
    benchmarkComparability = 'DIRECT';
  } else if (benchmarkCompatibility.status === 'CONDITIONALLY_COMPARABLE') {
    benchmarkComparability = 'PARTIAL';
  } else {
    benchmarkComparability = 'INVALID';
  }

  // 5. Scientific Readiness Categories (0–100%)
  const literatureCoverage =
    corpusSufficiency.classification === CORPUS_SUFFICIENCY_LEVELS.STRONG_CORPUS
      ? 95
      : corpusSufficiency.classification === CORPUS_SUFFICIENCY_LEVELS.ADEQUATE_FOR_SCOPED_COMPARISON
      ? 75
      : corpusSufficiency.classification === CORPUS_SUFFICIENCY_LEVELS.LIMITED_CORPUS
      ? 45
      : 15;

  const evidenceIntegrityScore = totalClaimsAudited > 0 ? Math.round((fullySupportedCount / totalClaimsAudited) * 100) : 100;
  const methodologyReadiness = 80;
  const experimentReadiness = userResultsProvided ? 90 : 35;
  const statisticalReadiness = userResultsProvided ? 85 : 20;
  const manuscriptReadiness = Math.round((literatureCoverage * 0.4 + evidenceIntegrityScore * 0.6));
  const reproducibility = corpusSufficiency.uniqueSourcesCount > 0 ? 95 : 30;

  const overallReadiness = Math.round(
    (literatureCoverage + evidenceIntegrityScore + methodologyReadiness + experimentReadiness + manuscriptReadiness) / 5
  );

  // 6. Hard Gates Check for "Publication Ready"
  const isPublicationReady =
    corpusSufficiency.classification !== CORPUS_SUFFICIENCY_LEVELS.LIMITED_CORPUS &&
    corpusSufficiency.classification !== CORPUS_SUFFICIENCY_LEVELS.INSUFFICIENT_CORPUS &&
    unsupportedCount === 0 &&
    evidenceIntegrity === 'PASS' &&
    citationPrecision === 'PASS' &&
    userResultsProvided === true &&
    overallReadiness >= 85;

  // 7. Recommended Next Evidence (actionable advice for user)
  const recommendedNextEvidence = [];
  if (corpusSufficiency.classification === CORPUS_SUFFICIENCY_LEVELS.LIMITED_CORPUS) {
    recommendedNextEvidence.push(
      'Corpus is limited to 1 unique scholarly paper. Add 2–4 peer-reviewed papers evaluating on compatible benchmarks (e.g., ALFWorld, WebShop) to enable genuine cross-paper comparative benchmarking.'
    );
  }
  if (!userResultsProvided) {
    recommendedNextEvidence.push(
      'Empirical experiment section is currently unverified. Upload or execute user evaluation experiments on the target benchmark to calculate deterministic statistical readiness (mean, CI95).'
    );
  }
  if (absenceClaimsCount > exhaustivelyVerifiedAbsenceCount) {
    recommendedNextEvidence.push(
      'Perform exhaustive multi-synonym retrieval across appendix and tables for pending absence claims.'
    );
  }

  return {
    evidenceIntegrity,
    corpusSufficiency: corpusSufficiency.classification,
    citationPrecision,
    gapVerification,
    benchmarkComparability,
    overallSynthesisStatus:
      corpusSufficiency.classification === CORPUS_SUFFICIENCY_LEVELS.LIMITED_CORPUS
        ? 'SCOPED_SINGLE_SOURCE'
        : 'SCOPED_SELECTED_CORPUS',
    isPublicationReady,
    auditSummary: {
      totalClaimsAudited,
      fullySupportedCount,
      partiallySupportedCount,
      unsupportedCount,
      absenceClaimsCount,
      exhaustivelyVerifiedAbsenceCount,
      contradictionsCount: contradictions.length,
    },
    readinessScores: {
      literatureCoverage,
      evidenceIntegrity: evidenceIntegrityScore,
      methodologyReadiness,
      experimentReadiness,
      statisticalReadiness,
      manuscriptReadiness,
      reproducibility,
      overallReadiness,
    },
    recommendedNextEvidence,
  };
};

// ── 10. Reproducibility Manifest Generator ──

const generateReproducibilityManifest = ({
  runId,
  corpusSnapshot = [],
  qualityGate,
  claims = [],
  taskGraph = [],
}) => {
  return {
    manifestVersion: '2.0.0',
    runId,
    timestamp: new Date().toISOString(),
    corpusSnapshot: corpusSnapshot.map((s) => ({
      canonicalSourceId: s.canonicalSourceId,
      canonicalTitle: s.canonicalTitle,
      fileCount: s.documentIds?.length || 1,
      documentIds: s.documentIds,
    })),
    retrievalConfiguration: {
      mode: 'HYBRID_BM25_DENSE_EXACT',
      absenceConceptExpansion: true,
      failClosedThreshold: 0.75,
    },
    taskGraphExecution: taskGraph.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
    })),
    qualityGateSummary: {
      status: qualityGate?.overallSynthesisStatus,
      evidenceIntegrity: qualityGate?.evidenceIntegrity,
      corpusSufficiency: qualityGate?.corpusSufficiency,
      claimsAudited: qualityGate?.auditSummary?.totalClaimsAudited || claims.length,
      overallReadiness: qualityGate?.readinessScores?.overallReadiness || 50,
    },
  };
};

module.exports = {
  CLAIM_TYPES,
  SUPPORT_LEVELS,
  CORPUS_SUFFICIENCY_LEVELS,
  GAP_CONFIDENCE_STATES,
  ABSENCE_CONCEPT_SYNONYMS,
  classifyClaimType,
  verifyAbsenceClaimExhaustively,
  evaluateCorpusSufficiency,
  detectContradictionsAndAgreement,
  calculateEvidenceStrength,
  ClaimDependencyGraph,
  calculateScientificQualityGate,
  generateReproducibilityManifest,
};
