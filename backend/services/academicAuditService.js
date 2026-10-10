/**
 * DOCUMIND-AI Academic Audit & Reviewer Engine
 * Implements Section 1, 16, 17, 31, 44 of product requirements
 */

/**
 * 19-Dimensional Manuscript Quality Audit with Hard Gates
 */
function evaluateManuscriptQuality(project) {
  const draft = project.generatedDraft || {};
  const sections = draft.sections || [];
  const references = draft.references || [];
  const rawObjects = project.manuscriptObjects || draft.manuscriptObjects || [];
  const paperProfiles = project.paperProfiles || [];
  const gaps = project.researchGaps || [];
  const rqs = project.researchQuestions || [];
  const hypotheses = project.hypotheses || [];
  const baselines = project.baselines || [];
  const userResults = project.userResults || [];
  const verifiedResults = userResults.filter((r) => r.verified);
  const methodology = project.methodology || {};
  const discussion = project.discussion || {};
  const reproducibility = project.reproducibilityChecklist || {};

  const hardGateFailures = [];

  // Dimension 1: Academic Integrity (Anti-Fabrication Gate)
  let integrityScore = 100;
  const isPreExperimental =
    draft.manuscriptMode === 'pre_experimental' || draft.resultsPending || verifiedResults.length === 0;

  // Scan section text for ungrounded empirical claims
  const resultsSection = sections.find((s) => s.heading.toLowerCase().includes('result'));
  if (resultsSection && isPreExperimental) {
    if (resultsSection.body && !resultsSection.body.toLowerCase().includes('pending')) {
      integrityScore -= 30;
      hardGateFailures.push({
        dimension: 'Academic Integrity',
        gate: 'anti_fabrication',
        message: 'Draft contains empirical claims in Results section while zero verified experiments exist.',
      });
    }
  }

  // Dimension 2: Citation Completeness
  let citationScore = 100;
  const inTextCitations = new Set();
  sections.forEach((sec) => {
    (sec.citations || []).forEach((c) => inTextCitations.add(c));
    const inlineMatches = (sec.body || '').match(/\[\d+\]|\[[A-Za-z]+(?:\s+et\s+al\.)?,\s*\d{4}\]/g) || [];
    inlineMatches.forEach((m) => inTextCitations.add(m));
  });

  if (references.length === 0 && inTextCitations.size > 0) {
    citationScore = 30;
    hardGateFailures.push({
      dimension: 'Citation Completeness',
      gate: 'unresolved_citations',
      message: 'In-text citations exist but bibliography/references list is empty.',
    });
  } else if (references.length > 0 && inTextCitations.size === 0) {
    citationScore = 60;
  }

  // Dimension 3: Literature Coverage
  const litCount = paperProfiles.length;
  const litScore = Math.min(100, Math.round((litCount / 5) * 100));

  // Dimension 4: Source Diversity
  const venues = new Set(paperProfiles.map((p) => p.venue || p.year).filter(Boolean));
  const sourceDiversityScore = Math.min(100, Math.round(((venues.size || 1) / Math.max(1, litCount)) * 100));

  // Dimension 5: Research Gap Grounding
  const gapGroundingScore = gaps.length > 0 ? (gaps.some((g) => g.evidenceQuote) ? 100 : 75) : 30;

  // Dimension 6: Research Question Quality
  const rqScore = rqs.length > 0 ? 95 : 40;

  // Dimension 7: Hypothesis Testability
  const hypScore = hypotheses.length > 0 ? 90 : 35;

  // Dimension 8: Methodology Completeness
  let methScore = 40;
  if (methodology.proposedArchitecture) methScore += 25;
  if (methodology.algorithm || methodology.flowchartSteps?.length > 0) methScore += 20;
  if (rawObjects.some((o) => o.objectType === 'equation')) methScore += 15;
  methScore = Math.min(100, methScore);

  // Dimension 9: Benchmark Compatibility
  const benchmarkScore = baselines.length > 0 ? 92 : 45;

  // Dimension 10: Result Verification (Hard Gate)
  let resultVerificationScore = 0;
  let resultVerificationStatus = 'Pending Verification';
  if (verifiedResults.length > 0) {
    resultVerificationScore = Math.min(100, Math.round(verifiedResults.length * 35));
    resultVerificationStatus = `${verifiedResults.length} Verified Experiments`;
  } else {
    hardGateFailures.push({
      dimension: 'Result Verification',
      gate: 'zero_empirical_results',
      message: 'No verified empirical results uploaded. Manuscript restricted to Pre-Experimental status.',
    });
  }

  // Dimension 11: Statistical Rigor
  const statScore = verifiedResults.length >= 3 ? 90 : verifiedResults.length > 0 ? 70 : 50;

  // Dimension 12: Equation Consistency
  const equations = rawObjects.filter((o) => o.objectType === 'equation');
  let eqScore = 100;
  equations.forEach((eq) => {
    if (!eq.latex || !eq.latex.trim()) eqScore -= 25;
  });
  eqScore = Math.max(40, eqScore);

  // Dimension 13: Figure Quality
  const figures = rawObjects.filter((o) => o.objectType === 'figure' || o.objectType === 'graph');
  const figScore = figures.length > 0 ? 95 : 60;

  // Dimension 14: Table Quality
  const tables = rawObjects.filter((o) => o.objectType === 'table');
  const tableScore = tables.length > 0 ? 92 : 55;

  // Dimension 15: Reproducibility
  let repScore = 50;
  if (reproducibility.randomSeed) repScore += 15;
  if (reproducibility.hardwareConfig) repScore += 15;
  if (reproducibility.softwareEnvironment) repScore += 10;
  if (reproducibility.codeRepoUrl || reproducibility.dataRepoUrl) repScore += 10;
  repScore = Math.min(100, repScore);

  // Dimension 16: Discussion Grounding
  const discScore = discussion.performanceAnalysis ? 90 : 50;

  // Dimension 17: Conclusion Grounding
  const conclusionSec = sections.find((s) => s.heading.toLowerCase().includes('conclusion'));
  const concScore = conclusionSec ? 95 : 60;

  // Dimension 18: Reference Integrity
  const seenRefs = new Set();
  let refIntegrityScore = 100;
  references.forEach((r) => {
    const norm = r.toLowerCase().trim().replace(/^\[\d+\]\s*/, '');
    if (seenRefs.has(norm)) refIntegrityScore -= 20;
    seenRefs.add(norm);
  });
  refIntegrityScore = Math.max(30, refIntegrityScore);

  // Dimension 19: Formatting Consistency
  const formatScore = sections.length >= 4 ? 98 : 70;

  // Compute Overall Manuscript Readiness Status using HARD GATES
  let overallStatus = 'Early Research Draft';
  let isPublicationReady = false;

  if (verifiedResults.length > 0 && hardGateFailures.length === 0 && integrityScore >= 90) {
    if (repScore >= 80 && methScore >= 80 && litScore >= 80) {
      overallStatus = 'Publication Ready Empirical Manuscript';
      isPublicationReady = true;
    } else {
      overallStatus = 'Empirical Research Draft';
    }
  } else if (hardGateFailures.some((f) => f.gate === 'zero_empirical_results') && integrityScore >= 90) {
    if (methScore >= 70 && litScore >= 60 && gapGroundingScore >= 70) {
      overallStatus = 'Strong Pre-Experimental Draft';
    } else {
      overallStatus = 'Structured Research Draft';
    }
  }

  const dimensions = {
    'Academic Integrity': integrityScore,
    'Citation Completeness': citationScore,
    'Literature Coverage': litScore,
    'Source Diversity': sourceDiversityScore,
    'Research Gap Grounding': gapGroundingScore,
    'Research Question Quality': rqScore,
    'Hypothesis Testability': hypScore,
    'Methodology Completeness': methScore,
    'Benchmark Compatibility': benchmarkScore,
    'Result Verification': resultVerificationScore,
    'Statistical Rigor': statScore,
    'Equation Consistency': eqScore,
    'Figure Quality': figScore,
    'Table Quality': tableScore,
    'Reproducibility': repScore,
    'Discussion Grounding': discScore,
    'Conclusion Grounding': concScore,
    'Reference Integrity': refIntegrityScore,
    'Formatting Consistency': formatScore,
  };

  // Mean score across non-pending dimensions
  const scoreValues = Object.values(dimensions);
  const overallScore = Math.round(
    scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
  );

  return {
    overallStatus,
    overallScore,
    isPublicationReady,
    resultVerificationStatus,
    hardGateFailures,
    dimensions,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Academic Peer Reviewer Simulation (Section 16)
 */
function runAcademicReviewerAudit(project) {
  const audit = evaluateManuscriptQuality(project);
  const draft = project.generatedDraft || {};
  const sections = draft.sections || [];
  const verifiedResults = (project.userResults || []).filter((r) => r.verified);
  const objects = project.manuscriptObjects || [];
  const findings = [];

  // Critical checks
  if (verifiedResults.length === 0) {
    findings.push({
      severity: 'Critical',
      category: 'Experimental Evidence',
      title: 'Missing Verified Experimental Grounding',
      message:
        'Manuscript lacks empirical verification data. All performance gains must remain labeled as projected or hypotheses until benchmark results are recorded.',
      section: 'Results & Evaluation',
      remedy: 'Upload or record verified empirical results in Step 9 or retain Pre-Experimental framing.',
    });
  }

  // Check equation definitions
  const equations = objects.filter((o) => o.objectType === 'equation');
  equations.forEach((eq) => {
    if (!eq.symbolDefinitions || eq.symbolDefinitions.length === 0) {
      findings.push({
        severity: 'Major',
        category: 'Mathematical Rigor',
        title: `Undefined Notation in Equation (${eq.equationNumber || 1})`,
        message: `Equation "${eq.title || 'Formulation'}" does not provide formal symbol nomenclature definitions for all operators.`,
        section: 'Methodology',
        remedy: 'Add symbol breakdown (e.g. policy parameters, action space, state space).',
      });
    }
  });

  // Check cross references
  sections.forEach((sec) => {
    const unres = (sec.body || '').match(/\{\{(EQUATION|FIGURE|TABLE):([^}]+)\}\}/g) || [];
    if (unres.length > 0) {
      findings.push({
        severity: 'Major',
        category: 'Cross-Referencing',
        title: `Unresolved Reference Tags in ${sec.heading}`,
        message: `Found raw template markers: ${unres.join(', ')}`,
        section: sec.heading,
        remedy: 'Ensure linked academic objects are accepted and numbered in Step 11 manager.',
      });
    }
  });

  // Minor / Suggestion checks
  if (!project.reproducibilityChecklist?.randomSeed) {
    findings.push({
      severity: 'Minor',
      category: 'Reproducibility',
      title: 'Missing Random Seed Specification',
      message: 'Peer reviewers standardly expect random seed and initialization protocol reporting.',
      section: 'Experimental Setup',
      remedy: 'Complete the reproducibility checklist.',
    });
  }

  if (project.paperProfiles?.length < 3) {
    findings.push({
      severity: 'Suggestion',
      category: 'Literature Grounding',
      title: 'Broaden Primary Literature Base',
      message: 'Fewer than 3 foundational papers analyzed. Incorporating additional baselines improves survey strength.',
      section: 'Related Work',
      remedy: 'Attach and ingest 1-2 additional comparative papers in Step 1.',
    });
  }

  return {
    reviewerVerdict:
      findings.some((f) => f.severity === 'Critical')
        ? 'Major Revision Required'
        : findings.some((f) => f.severity === 'Major')
        ? 'Minor Revision Required'
        : 'Accept with Formatting Polish',
    findings,
    qualityAudit: audit,
  };
}

/**
 * Generates BibTeX bibliography string from scholarly references (Section 40)
 */
function generateBibtexBundle(project) {
  const draft = project.generatedDraft || {};
  const references = draft.references || [];
  const profiles = project.paperProfiles || [];

  let bibtex = `% ==============================================================================
% BibTeX Bibliography Generated by DOCUMIND-AI Research Workspace
% Project: ${project.title || 'Academic Manuscript'}
% ==============================================================================

`;

  // First generate from structured paper profiles if available
  const citedTitles = new Set();
  profiles.forEach((p, idx) => {
    const key = (p.title || `paper_${idx + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 24);
    citedTitles.add(p.title.toLowerCase().trim());

    bibtex += `@article{${key}_${p.year || '2024'},\n`;
    bibtex += `  title = {${p.title}},\n`;
    bibtex += `  author = {${p.authors && p.authors.length > 0 ? p.authors.join(' and ') : 'DOCUMIND-AI Grounded Source'}},\n`;
    if (p.year) bibtex += `  year = {${p.year}},\n`;
    if (p.venue) bibtex += `  journal = {${p.venue}},\n`;
    bibtex += `  note = {Verified literature ground in DOCUMIND-AI}\n`;
    bibtex += `}\n\n`;
  });

  // Then add any additional references from draft list
  references.forEach((ref, idx) => {
    const clean = ref.replace(/^\[\d+\]\s*/, '').trim();
    if (!citedTitles.has(clean.toLowerCase().trim())) {
      const key = `ref_${idx + 1}_${Date.now().toString(36).slice(2, 6)}`;
      bibtex += `@misc{${key},\n`;
      bibtex += `  note = {${clean.replace(/([{}])/g, '\\$1')}}\n`;
      bibtex += `}\n\n`;
    }
  });

  return bibtex;
}

module.exports = {
  evaluateManuscriptQuality,
  runAcademicReviewerAudit,
  generateBibtexBundle,
};
