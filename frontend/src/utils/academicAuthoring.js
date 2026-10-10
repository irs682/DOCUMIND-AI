/**
 * DOCUMIND-AI Academic Authoring & Verification Engine
 * Implements Sections 2-15, 20-25 of the academic manuscript specification
 */

/**
 * Supported Citation Styles
 */
export const CITATION_STYLES = [
  { id: 'IEEE', name: 'IEEE', desc: 'Numbered brackets [1], concise engineering standard' },
  { id: 'APA', name: 'APA 7th', desc: 'Author-Year (Brohan et al., 2022), social & behavioral sciences' },
  { id: 'Harvard', name: 'Harvard', desc: 'Author-date formatting with full year attribution' },
  { id: 'Vancouver', name: 'Vancouver', desc: 'Superscript or numbered chronological clinical citations' },
];

/**
 * Formats a reference entry according to the selected citation style
 */
export function formatReferenceByStyle(refString, style = 'IEEE', index = 1) {
  const clean = (refString || '').replace(/^\[\d+\]\s*/, '').trim();

  // Try extracting Author, Year, Title
  const yearMatch = clean.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : 'n.d.';

  switch (style) {
    case 'APA':
      return `${clean.replace(/\((\d{4})\)/, '')} (${year}).`;
    case 'Harvard':
      return `${clean.replace(/\((\d{4})\)/, '')}, ${year}.`;
    case 'Vancouver':
      return `${index}. ${clean}`;
    case 'IEEE':
    default:
      return `[${index}] ${clean}`;
  }
}

/**
 * Formats in-text citations dynamically according to citation style
 */
export function formatInTextCitation(refIndex, author = 'Author', year = '2024', style = 'IEEE') {
  switch (style) {
    case 'APA':
    case 'Harvard':
      return `(${author} et al., ${year})`;
    case 'Vancouver':
      return `(${refIndex})`;
    case 'IEEE':
    default:
      return `[${refIndex}]`;
  }
}

/**
 * Supported Journal & Conference Templates
 */
export const JOURNAL_TEMPLATES = [
  {
    id: 'generic_academic',
    name: 'Generic Academic',
    desc: 'Clean single-column standard for preprints and reviews',
    columns: 1,
    fontFamily: '"Times New Roman", Times, serif',
    defaultCitationStyle: 'IEEE',
  },
  {
    id: 'ieee_trans',
    name: 'IEEE Transactions',
    desc: 'Two-column double-column compact engineering journal format',
    columns: 2,
    fontFamily: '"Times New Roman", Times, serif',
    defaultCitationStyle: 'IEEE',
  },
  {
    id: 'elsevier',
    name: 'Elsevier / ScienceDirect',
    desc: 'Single/1.5-column academic layout with highlighted abstract',
    columns: 1,
    fontFamily: 'Georgia, "Times New Roman", serif',
    defaultCitationStyle: 'APA',
  },
  {
    id: 'springer',
    name: 'Springer Nature (LNCS)',
    desc: 'Lecture Notes in Computer Science publication geometry',
    columns: 1,
    fontFamily: '"Times New Roman", Times, serif',
    defaultCitationStyle: 'IEEE',
  },
];

/**
 * Extracts Nomenclature and Symbol Table from accepted equations (Section 7)
 */
export function extractNomenclatureFromEquations(objects = []) {
  const symbols = [];
  const seenSymbols = new Map();
  const inconsistencies = [];

  const equations = objects.filter((o) => o.objectType === 'equation');

  equations.forEach((eq) => {
    (eq.symbolDefinitions || []).forEach((def) => {
      const sym = def.symbol?.trim();
      const meaning = def.meaning?.trim();
      if (!sym) return;

      if (seenSymbols.has(sym)) {
        const prevMeaning = seenSymbols.get(sym);
        if (prevMeaning.toLowerCase() !== meaning.toLowerCase()) {
          inconsistencies.push({
            symbol: sym,
            issue: `Inconsistent meaning: "${prevMeaning}" vs "${meaning}" in Eq. (${eq.equationNumber || 1})`,
          });
        }
      } else {
        seenSymbols.set(sym, meaning);
        symbols.push({
          symbol: sym,
          meaning: meaning || 'Variable defined in manuscript',
          equationId: eq.id,
          equationNumber: eq.equationNumber || 1,
        });
      }
    });
  });

  return {
    symbols,
    inconsistencies,
  };
}

/**
 * Acronym Manager (Section 8)
 * Scans text, detects acronyms, creates glossary, and verifies first-use definitions
 */
export function auditAcronyms(sections = []) {
  const allText = sections.map((s) => `${s.heading} ${s.body}`).join('\n\n');

  // Detect definitions like "Vision-Language-Action (VLA)"
  const defRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+|-?[A-Za-z]+){1,5})\s*\(([A-Z]{2,6})\)/g;
  const acronymMap = new Map();
  let match;

  while ((match = defRegex.exec(allText)) !== null) {
    const fullTerm = match[1].trim();
    const acronym = match[2].trim();
    if (!acronymMap.has(acronym)) {
      acronymMap.set(acronym, {
        acronym,
        fullTerm,
        firstIndex: match.index,
      });
    }
  }

  // Detect standalone uppercase abbreviations (e.g. VLA, RAG, ECE, HITL)
  const standRegex = /\b([A-Z]{2,6})\b/g;
  const glossary = [];
  const warnings = [];

  acronymMap.forEach((val) => {
    glossary.push(val);
  });

  const seenStandalone = new Set();
  while ((match = standRegex.exec(allText)) !== null) {
    const acr = match[1];
    if (!seenStandalone.has(acr)) {
      seenStandalone.add(acr);
      if (!acronymMap.has(acr) && !['AI', 'ML', 'IEEE', 'USA', 'RGB'].includes(acr)) {
        warnings.push({
          acronym: acr,
          issue: `Acronym "${acr}" appears without prior expanded definition (e.g. "Full Term (${acr})").`,
        });
      }
    }
  }

  return {
    glossary,
    warnings,
  };
}

/**
 * Unit Consistency Checker (Section 9)
 */
export function auditUnitConsistency(userResults = []) {
  const issues = [];
  const unitGroups = new Map();

  userResults.forEach((r) => {
    const key = (r.metric || '').toLowerCase().trim();
    if (!key) return;

    if (!unitGroups.has(key)) {
      unitGroups.set(key, new Set());
    }
    unitGroups.get(key).add(r.unit || 'dimensionless');
  });

  unitGroups.forEach((units, metric) => {
    if (units.size > 1) {
      issues.push({
        metric,
        units: Array.from(units),
        message: `Mixed units for metric "${metric}": ${Array.from(units).join(' vs ')}. Normalize before comparisons.`,
      });
    }
  });

  return issues;
}

/**
 * Automatic Placement Suggestions for Academic Objects (Section 5)
 */
export function suggestObjectPlacements(objects = [], sections = []) {
  const suggestions = [];

  objects.forEach((obj) => {
    let suggestedSection = 'Methodology';
    let rationale = '';

    if (obj.objectType === 'equation') {
      suggestedSection = 'Methodology';
      rationale = 'Mathematical formulations and optimization objectives belong in Methodology.';
    } else if (obj.objectType === 'figure' || obj.objectType === 'graph') {
      const titleLower = (obj.title || '').toLowerCase();
      if (titleLower.includes('arch') || titleLower.includes('flow') || titleLower.includes('pipeline')) {
        suggestedSection = 'Methodology';
        rationale = 'System architectural figures and workflow diagrams belong in Methodology.';
      } else if (titleLower.includes('ablat') || titleLower.includes('result') || titleLower.includes('acc') || titleLower.includes('gain')) {
        suggestedSection = 'Results & Evaluation';
        rationale = 'Empirical performance curves and ablation graphs belong in Results & Evaluation.';
      } else {
        suggestedSection = 'Methodology';
        rationale = 'Conceptual visualizations ground the theoretical formulation in Methodology.';
      }
    } else if (obj.objectType === 'table') {
      const titleLower = (obj.title || '').toLowerCase();
      if (titleLower.includes('hyperparam') || titleLower.includes('detail')) {
        suggestedSection = 'Appendix';
        rationale = 'Extensive hyperparameter configuration tables are standardly placed in Appendix.';
      } else {
        suggestedSection = 'Results & Evaluation';
        rationale = 'Comparative performance matrices belong in Results & Evaluation.';
      }
    } else if (obj.objectType === 'algorithm') {
      suggestedSection = 'Methodology';
      rationale = 'Algorithmic pseudocode specifications belong in Methodology.';
    }

    // Check if currently assigned section matches suggestion
    const currentSec = obj.sectionId || '';
    if (!currentSec.toLowerCase().includes(suggestedSection.toLowerCase().split(' ')[0])) {
      suggestions.push({
        objectId: obj.id,
        objectTitle: obj.title,
        objectType: obj.objectType,
        currentSection: currentSec || 'Unassigned',
        suggestedSection,
        rationale,
      });
    }
  });

  return suggestions;
}

/**
 * Generates Grounded Contribution Statements (Section 14)
 */
export function generateContributionStatements(project) {
  const gaps = project.researchGaps || [];
  const methodology = project.methodology || {};
  const userResults = (project.userResults || []).filter((r) => r.verified);
  const isPreExperimental = userResults.length === 0;

  const contributions = [];

  // Gap-derived contribution
  if (gaps.length > 0) {
    const topGap = gaps[0];
    contributions.push(
      `We systematically address the documented limitation regarding ${topGap.title.toLowerCase()}, formulating a grounded architectural solution.`
    );
  }

  // Methodology-derived contribution
  if (methodology.proposedArchitecture) {
    contributions.push(
      `We propose a unified framework integrating ${methodology.proposedArchitecture.slice(0, 80)}, providing formal optimization objectives.`
    );
  }

  // Empirical-derived contribution (Hard-gated)
  if (!isPreExperimental && userResults.length > 0) {
    contributions.push(
      `We empirically validate our approach across ${userResults.length} benchmark experiments, demonstrating verified quantitative gains over baselines.`
    );
  } else {
    contributions.push(
      `We establish a reproducible evaluation protocol with explicit baselines and metrics to evaluate projected performance gains upon experimental execution.`
    );
  }

  return {
    header: isPreExperimental ? 'Proposed Contributions' : 'Primary Contributions',
    isPreExperimental,
    items: contributions,
  };
}

/**
 * Research Novelty Checker (Section 15)
 * Distinguishes selected-corpus novelty from globally unsupported novelty claims
 */
export function checkResearchNovelty(project) {
  const paperCount = project.paperProfiles?.length || 0;
  const gaps = project.researchGaps || [];

  return {
    corpusSize: paperCount,
    corpusNoveltyClaim: `Novel with respect to the ${paperCount} analyzed peer-reviewed source papers.`,
    isGloballyNovelVerified: false,
    guidance:
      paperCount < 10
        ? `Claim novelty strictly within the scope of analyzed literature ("To our knowledge among the ${paperCount} comparative papers examined..."). Avoid absolute global claims ("First method ever proposed").`
        : `Strong corpus baseline. Formulate claims centered around specific gap resolution rather than unverified global exclusivity.`,
  };
}

/**
 * Generates Claim-to-Evidence map for paragraphs (Section 2, 3)
 */
export function getClaimEvidenceProvenance(sectionHeading, paragraphText, project) {
  const secLower = (sectionHeading || '').toLowerCase();
  const profiles = project.paperProfiles || [];
  const userResults = project.userResults || [];

  if (secLower.includes('relat') || secLower.includes('intro')) {
    const matchedPaper = profiles[0] || null;
    return {
      claimType: 'literature_fact',
      sourceType: 'Canonical Paper Evidence',
      paperTitle: matchedPaper ? matchedPaper.title : 'Literature Base',
      evidenceDetail: matchedPaper ? `${matchedPaper.venue || 'Peer-reviewed venue'} (${matchedPaper.year || 'Published'})` : 'Grounded in extracted paper profiles',
      confidence: 'High',
      verificationStatus: 'Verified Literature Evidence',
    };
  }

  if (secLower.includes('method')) {
    return {
      claimType: 'project_design',
      sourceType: 'User Research Design',
      paperTitle: project.title,
      evidenceDetail: 'Step 7 Accepted Methodology & Formal Equations',
      confidence: 'High',
      verificationStatus: 'Accepted Design',
    };
  }

  if (secLower.includes('result')) {
    if (userResults.length > 0) {
      const res = userResults[0];
      return {
        claimType: 'verified_result',
        sourceType: 'Verified Empirical Measurement',
        paperTitle: res.dataset || 'Benchmark Dataset',
        evidenceDetail: `${res.modelName} ${res.metric}: ${res.value}${res.unit} (Run ${res.runId || '01'})`,
        confidence: 'High',
        verificationStatus: 'Verified Measurement',
      };
    }
    return {
      claimType: 'planned_evaluation',
      sourceType: 'Pre-Experimental Projection',
      paperTitle: 'Step 8 Baselines & Metric Plan',
      evidenceDetail: 'Empirical data pending execution',
      confidence: 'Medium',
      verificationStatus: 'Pending Verification',
    };
  }

  return {
    claimType: 'inference',
    sourceType: 'Model Synthesis',
    paperTitle: project.title,
    evidenceDetail: 'Synthesized from literature review & accepted research design',
    confidence: 'Medium',
    verificationStatus: 'Evidence-Grounded Synthesis',
  };
}
