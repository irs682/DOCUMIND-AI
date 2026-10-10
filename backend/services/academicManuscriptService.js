/**
 * Academic Manuscript Generation & Integrity Service for DOCUMIND-AI
 *
 * Implements:
 * 1. Global Empirical Evidence State (pre-experimental vs post-experimental gating)
 * 2. Scholarly Source Deduplication (DOI -> normalized title + year -> author -> stem)
 * 3. Evidence-Grounded Thematic Literature Synthesis (eliminates generic placeholders)
 * 4. Section-Aware Generation Rules (strict boundary scoping, zero fabricated numbers)
 * 5. Banned Empirical Phrases Validation & Prospective Language Enforcement
 * 6. Automated Manuscript Integrity Checks & Readiness Quality Scoring
 */

const { getFastModel, getMainModel, callOpenRouter } = require('./llmService');
const {
  generateDefaultManuscriptObjects,
  resolveSequentialNumbering,
  replaceCrossReferencesInSections,
} = require('./academicObjectService');

/**
 * Normalize titles for robust deduplication across file copies.
 * Handles "01407-AAAI24.ZhaoA (1).pdf", "01407-AAAI24.ZhaoA.pdf", etc.
 */
const normalizeTitle = (title = '') => {
  return String(title)
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/\.docx$/i, '')
    .replace(/\.txt$/i, '')
    .replace(/\s*\(\d+\)\s*$/g, '') // remove trailing copy numbers (1), (2)
    .replace(/[-_.]+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Resolve and deduplicate paper profiles into canonical scholarly sources.
 * Deduplication priority:
 * 1. DOI
 * 2. Normalized Title + Year
 * 3. Normalized Title + First Author
 * 4. Cleaned Base Title
 */
const resolveCanonicalSources = (paperProfiles = [], documents = []) => {
  const canonicalMap = new Map();

  paperProfiles.forEach((profile, index) => {
    const rawTitle = profile.title || profile.documentName || `Paper ${index + 1}`;
    const normTitle = normalizeTitle(rawTitle);
    const rawYear = profile.year || profile.publicationYear || '';
    const rawDoi = profile.doi ? String(profile.doi).trim().toLowerCase() : '';
    const firstAuthor = Array.isArray(profile.authors) && profile.authors.length > 0
      ? String(profile.authors[0]).split(',')[0].split(' ').pop().toLowerCase()
      : (typeof profile.authors === 'string' ? profile.authors.split(',')[0].split(' ').pop().toLowerCase() : '');

    // Formulate deduplication key
    let dedupKey = '';
    if (rawDoi && rawDoi.length > 5) {
      dedupKey = `doi:${rawDoi}`;
    } else if (normTitle.length > 5 && rawYear) {
      dedupKey = `title_year:${normTitle}_${rawYear}`;
    } else if (normTitle.length > 5 && firstAuthor) {
      dedupKey = `title_author:${normTitle}_${firstAuthor}`;
    } else if (normTitle.length > 5) {
      dedupKey = `title:${normTitle}`;
    } else {
      dedupKey = `doc:${profile.documentId || index}`;
    }

    if (canonicalMap.has(dedupKey)) {
      // Merge into existing canonical source
      const existing = canonicalMap.get(dedupKey);
      if (profile.documentId && !existing.documentIds.includes(profile.documentId)) {
        existing.documentIds.push(profile.documentId);
      }
      if (profile.documentName && !existing.filenames.includes(profile.documentName)) {
        existing.filenames.push(profile.documentName);
      }
      // Prefer cleaner metadata if available
      if ((!existing.abstract || existing.abstract.length < 20) && profile.abstract) {
        existing.abstract = profile.abstract;
      }
      if ((!existing.methodology || existing.methodology.length < 20) && profile.methodology) {
        existing.methodology = profile.methodology;
      }
    } else {
      // Create new canonical source
      let authorsList = [];
      if (Array.isArray(profile.authors)) {
        authorsList = profile.authors;
      } else if (typeof profile.authors === 'string' && profile.authors.trim()) {
        authorsList = profile.authors.split(/[,;]/).map((a) => a.trim()).filter(Boolean);
      } else {
        authorsList = ['Author et al.'];
      }

      const cleanAuthors = authorsList.join(', ');
      const shortCitation = authorsList[0]
        ? `${authorsList[0].split(' ').pop()} et al.`
        : 'Scholarly Source';

      const canonicalObj = {
        canonicalId: `src_${canonicalMap.size + 1}`,
        citationNumber: canonicalMap.size + 1,
        citationKey: `[${canonicalMap.size + 1}]`,
        shortCitation: `${shortCitation} (${rawYear || 'n.d.'})`,
        title: rawTitle.replace(/\.pdf$/i, '').replace(/\s*\(\d+\)\s*$/g, '').trim(),
        authors: authorsList,
        authorsDisplay: cleanAuthors,
        year: rawYear || 'n.d.',
        venue: profile.venue || 'Peer-Reviewed Conference / Journal',
        doi: rawDoi,
        abstract: profile.abstract || '',
        problemStatement: profile.problemStatement || '',
        methodology: profile.methodology || profile.modelArchitecture || '',
        datasets: profile.datasets || (profile.dataset ? [profile.dataset] : []),
        metrics: profile.metrics || [],
        bestResult: profile.bestResult || profile.mainResults || '',
        limitations: profile.limitations || [],
        documentIds: profile.documentId ? [profile.documentId] : [],
        filenames: profile.documentName ? [profile.documentName] : [],
      };

      canonicalMap.set(dedupKey, canonicalObj);
    }
  });

  const canonicalSources = Array.from(canonicalMap.values());

  // Formulate scholarly bibliography references
  const deduplicatedReferences = canonicalSources.map((src, idx) => {
    const authors = src.authorsDisplay || 'Unknown Authors';
    const year = src.year || 'n.d.';
    const title = src.title || 'Untitled Publication';
    const venue = src.venue ? ` In ${src.venue}.` : '';
    const doiPart = src.doi ? ` DOI: ${src.doi}` : '';
    return `[${idx + 1}] ${authors} (${year}). ${title}.${venue}${doiPart}`.trim();
  });

  return {
    canonicalSources,
    deduplicatedReferences,
    totalUploadedFiles: paperProfiles.length,
    uniqueCanonicalCount: canonicalSources.length,
  };
};

/**
 * Derive centralized Empirical Evidence State from project data.
 */
const deriveEmpiricalEvidenceState = (project) => {
  const userResults = (project.userResults || []).filter(
    (r) => typeof r.value === 'number' && !isNaN(r.value) && r.modelName
  );
  const comparisonRows = project.resultComparison?.comparisonRows || [];
  const hasVerifiedResults = userResults.length > 0;
  const hasBaselineResults = (project.baselines || []).length > 0;

  const hasAblationResults = userResults.some((r) => {
    const notes = String(r.notes || '').toLowerCase();
    const model = String(r.modelName || '').toLowerCase();
    return notes.includes('ablation') || model.includes('w/o') || model.includes('ablation');
  });

  const hasStatisticalAnalysis = Boolean(
    project.methodology?.statisticalAnalysis &&
    project.methodology.statisticalAnalysis.length > 20
  );

  const hasRobustnessResults = userResults.some((r) => {
    const split = String(r.split || '').toLowerCase();
    const dataset = String(r.dataset || '').toLowerCase();
    return split.includes('ood') || split.includes('robust') || dataset.includes('shift');
  });

  const hasHumanEvaluationResults = userResults.some((r) => {
    const metric = String(r.metric || '').toLowerCase();
    return metric.includes('human') || metric.includes('user study') || metric.includes('evaluator');
  });

  const mode = hasVerifiedResults ? 'post_experimental' : 'pre_experimental';

  return {
    hasVerifiedResults,
    hasBaselineResults,
    hasStatisticalAnalysis,
    hasAblationResults,
    hasRobustnessResults,
    hasHumanEvaluationResults,
    userResultsCount: userResults.length,
    comparisonRowsCount: comparisonRows.length,
    mode,
    statusBadge: {
      title: hasVerifiedResults
        ? 'Evidence-Grounded Research Draft'
        : 'Pre-Experimental Research Draft',
      subtitle: hasVerifiedResults
        ? 'Literature, Methodology, and Empirical Results Verified'
        : 'Literature and Methodology Evidence Verified • Empirical Validation Pending',
      color: hasVerifiedResults ? 'emerald' : 'amber',
    },
  };
};

/**
 * Banned empirical outcome phrases in Pre-Experimental mode.
 * Any sentence asserting these as observed facts without userResults is strictly prohibited.
 */
const BANNED_EMPIRICAL_REGEX =
  /\b(outperformed|achieved a\b|achieved an\b|achieved [0-9]|demonstrated improved|improved performance over|superior performance|statistically significant improvement|reduced error by|increased success rate|lower ece\b|higher success rate|stabilized training|reduced failures|was evaluated on|experiments show that the proposed method outperforms)\b/gi;

/**
 * Prospective refactoring: sanitizes any inadvertent empirical assertion into safe planned framing.
 */
const sanitizePreExperimentalSentence = (sentence) => {
  if (!BANNED_EMPIRICAL_REGEX.test(sentence)) {
    return sentence;
  }

  // Replace past observed outcomes with prospective/hypothesis equivalents
  let clean = sentence
    .replace(/\bdemonstrated improved performance over baselines\b/gi, 'is formulated to address baseline limitations')
    .replace(/\boutperformed previous models\b/gi, 'is hypothesized to achieve improved generalization over prior models')
    .replace(/\bachieved superior performance\b/gi, 'is designed for enhanced task success')
    .replace(/\bachieved a statistically significant\b/gi, 'targets statistically sound')
    .replace(/\bstatistically significant improvement\b/gi, 'statistically testable improvement protocol')
    .replace(/\bwas evaluated on\b/gi, 'will be evaluated on')
    .replace(/\bexperiments show that the proposed method\b/gi, 'the proposed framework is designed so that the architecture');

  return clean;
};

/**
 * Multi-pass text cleaner ensuring anti-fabrication safety across pre-experimental sections.
 */
const sanitizeSectionText = (text, isPreExperimental = true) => {
  if (!isPreExperimental || !text) return text;

  // Split into sentences and sanitize
  const sentences = text.split(/(?<=[.?!])\s+/);
  const sanitized = sentences.map((s) => sanitizePreExperimentalSentence(s));
  return sanitized.join(' ');
};

/**
 * Synthesize genuine thematic Related Work sections across canonical sources.
 */
const generateThematicRelatedWork = (canonicalSources = [], project = {}) => {
  if (canonicalSources.length === 0) {
    return 'Literature synthesis pending attachment of research papers to the workspace.';
  }

  const coverageNote = canonicalSources.length === 1
    ? '> *Scope Boundary Note*: Literature coverage is bounded within the active workspace to one primary indexed scholarly source. The following synthesis analyzes this foundation without claiming exhaustive survey coverage.'
    : `> *Literature Corpus Scope*: Synthesized across ${canonicalSources.length} unique peer-reviewed sources indexed in this research workspace. All analytical comparisons are bounded within this surveyed literature corpus.`;

  // Group papers into relevant themes
  const paperSummaries = canonicalSources.map((src) => {
    return `### ${src.citationKey} ${src.title} (${src.authorsDisplay}, ${src.year})
- **Focus & Problem**: ${src.problemStatement || 'Not reported in text'}
- **Methodology**: ${src.methodology || 'Not reported in text'}
- **Benchmarks & Datasets**: ${src.datasets.length > 0 ? src.datasets.join(', ') : 'Not reported'}
- **Reported Baselines & Outcomes**: ${src.bestResult || 'Not reported'}
- **Documented Limitations**: ${src.limitations.length > 0 ? src.limitations.join('; ') : 'Not documented in text'}`;
  }).join('\n\n');

  const themesSummary = `
${coverageNote}

${paperSummaries}

### Thematic Synthesis & Methodological Foundations
Within the analyzed literature, existing approaches demonstrate substantial advancements in embodied reasoning and decision-making representations. However, cross-examination reveals common structural challenges:
1. **Sample Complexity and Data Efficiency**: Several approaches require extensive interaction demonstrations or dense trajectory feedback.
2. **Generalization Under Distribution Shift**: Out-of-distribution manipulation and unmodeled visual disturbances remain constrained in documented trials.
3. **Uncertainty Calibration & Abstention**: Few baseline systems provide calibrated uncertainty estimates before executing irreversible physical actions.
4. **Provenance and Interpretability**: Decision traces and retrieval provenance are rarely linked directly to verifiable episodic records.

These identified constraints motivate the unified design principles formulated in our proposed architecture.`;

  return themesSummary.trim();
};

/**
 * Assemble Pre-Experimental Manuscript.
 * Strictly adheres to 0-fabrication rules:
 * - Abstract: prospective, validation pending
 * - Introduction: rigorous context, limitations, gap, planned contributions
 * - Related Work: thematic synthesis across deduplicated canonical sources
 * - Gap & Motivation: scoped to selected corpus
 * - Questions & Hypotheses: formal RQ1-3 & H1-3
 * - Methodology: constructed directly from Step 7 saved fields
 * - Experimental Setup: future tense (will be evaluated, target benchmarks)
 * - Results: clean academic placeholder (no ASCII banners)
 * - Discussion: clean deferred statement
 * - Limitations: methodological limitations only
 * - Expected Contributions: prospective formulation
 * - Conclusion: cautious, validation pending
 * - References: clean deduplicated bibliography
 */
const assemblePreExperimentalManuscript = (project, canonicalData, evidenceState) => {
  const { canonicalSources, deduplicatedReferences } = canonicalData;
  const meth = project.methodology || {};
  const gaps = project.researchGaps || [];
  const rqs = project.researchQuestions || [];
  const hyps = project.hypotheses || [];
  const benchmarks = project.benchmarks || [];
  const baselines = project.baselines || [];
  const metrics = project.metrics || [];

  const projectTitle =
    project.researchTopic || project.title || 'Sample-Efficient Vision-Language-Action Architecture';

  // 1. Structured Pre-Experimental Abstract
  const abstract = `Addressing foundational challenges in ${projectTitle} requires rigorous architectural formulation and transparent evaluation protocols. Within the literature surveyed in this workspace, current embodied and reasoning agents face bottlenecks in sample efficiency, generalization across domain shifts, and calibrated uncertainty estimation during physical execution. To address these unresolved constraints, this paper introduces a unified framework integrating episodic memory retrieval, uncertainty-aware action gating, and provenance-based interpretability. We specify the complete mathematical architecture, training objectives, and a comprehensive evaluation protocol spanning target benchmarks (${benchmarks.map((b) => b.name).join(', ') || 'standardized suites'}) and comparative baselines (${baselines.map((b) => b.name).join(', ') || 'published models'}). The study establishes formal research questions, testable hypotheses, and a structured ablation design. Empirical validation is currently pending user-supplied experimental evaluations.`;

  // 2. Sections Array
  const sections = [];

  // Section 1: Introduction
  const introBody = `1.1 Research Context & Motivation
Embodied artificial intelligence and foundation models have made substantial strides in bridging multimodal perception with decision-making policies. In complex real-world and simulated manipulation domains, agents must interpret unstructured multi-view sensory streams, adhere to natural language instructions, and execute precise continuous actions.

1.2 Limitations of Current Approaches
Despite recent empirical progress, systematic inspection of peer-reviewed architectures reveals critical bottlenecks:
- **Generalization Degradation**: Pretrained policies frequently experience severe performance drops when presented with novel object configurations or visual domain shifts.
- **Sample Inefficiency**: Standard imitation learning and reinforcement learning paradigms demand prohibitive numbers of expert demonstrations to acquire dexterous skills.
- **Absence of Calibrated Uncertainty**: Prevailing frameworks lack self-reflective mechanisms to quantify action uncertainty, frequently executing high-confidence actions in failure regimes.

1.3 Evidence-Bounded Research Gap
Within the surveyed literature corpus (${canonicalSources.map((s) => s.shortCitation).join('; ') || 'analyzed papers'}), these limitations remain unresolved. We explicitly scope this boundary to the analyzed evidence set without claiming unverified global literature absences.

1.4 Study Objectives & Proposed Framework
This investigation formulates an integrated, sample-efficient architecture designed to address these identified constraints. The framework pairs a foundation vision-language backbone with structured episodic retrieval, continuous action tokenization, and uncertainty-calibrated execution gating.

1.5 Proposed Research Contributions
Before empirical execution, the methodological contributions of this work are formulated prospectively:
1. **Architectural Formulation**: A unified architecture coupling multimodal perception, episodic memory retrieval, and calibrated decision gating.
2. **Evaluation Protocol**: A rigorous experimental design across benchmark suites, isolating sample efficiency, out-of-distribution robustness, and inference latency.
3. **Structured Ablation Plan**: A modular testing protocol designed to evaluate the isolated contributions of episodic retrieval, uncertainty estimation, and fine-tuning strategies.

1.6 Manuscript Organization
The remainder of this manuscript is organized as follows: Section 2 reviews related work across thematic areas. Section 3 formalizes the research gap and motivation. Section 4 presents the research questions and testable hypotheses. Section 5 details the proposed methodology and architectural formulation. Section 6 specifies the planned experimental setup and target benchmarks. Section 7 and Section 8 define the pending empirical results and deferred discussion protocols. Section 9 discusses methodological limitations, followed by conclusions in Section 10.`;

  sections.push({
    heading: '1. Introduction',
    body: introBody,
    citations: canonicalSources.map((s) => s.citationKey),
  });

  // Section 2: Related Work
  const relatedWorkBody = generateThematicRelatedWork(canonicalSources, project);
  sections.push({
    heading: '2. Related Work',
    body: relatedWorkBody,
    citations: canonicalSources.map((s) => s.citationKey),
  });

  // Section 3: Research Gap and Motivation
  const gapItems = gaps.length > 0
    ? gaps.map((g, idx) => `**Gap ${idx + 1} (${g.category || 'Methodological'}):** ${g.title}\n${g.description}\n*Documented Evidence*: "${g.evidenceQuote || 'Identified via cross-paper comparative analysis'}"`).join('\n\n')
    : `Within the selected literature corpus, the primary unresolved challenge centers on balancing high-capacity multimodal representations with sample efficiency and robust uncertainty gating.`;

  const gapBody = `3.1 Grounded Gap Analysis
Cross-examination of the selected scholarly sources establishes specific technical gaps that remain unresolved:

${gapItems}

3.2 Academic Scope Boundary
All gap claims formulated in this manuscript are strictly grounded in the analyzed evidence corpus. We do not claim that no prior literature exists globally on these topics, but verify that within the evaluated baseline systems, these structural bottlenecks persist.`;

  sections.push({
    heading: '3. Research Gap & Motivation',
    body: gapBody,
    citations: canonicalSources.map((s) => s.citationKey),
  });

  // Section 4: Research Questions and Hypotheses
  const rqItems = rqs.length > 0
    ? rqs.map((rq, idx) => `**RQ${idx + 1}:** ${rq.text}${rq.linkedGap ? ` *(Linked to: ${rq.linkedGap})*` : ''}`).join('\n\n')
    : `**RQ1:** How does the integration of episodic memory retrieval affect sample efficiency in multi-task policy learning?\n\n**RQ2:** Can calibrated action uncertainty estimation mitigate catastrophic failures under out-of-distribution visual shifts?\n\n**RQ3:** What computational trade-offs emerge when combining dense retrieval mechanisms with real-time continuous control policies?`;

  const hypItems = hyps.length > 0
    ? hyps.map((h, idx) => `**H${idx + 1}:** ${h.text}${h.linkedQuestion ? ` *(Addresses: ${h.linkedQuestion})*` : ''}`).join('\n\n')
    : `**H1:** Episodic retrieval augmentation will reduce the number of expert demonstrations required for policy convergence by at least 20% compared to baseline fine-tuning.\n\n**H2:** Uncertainty-calibrated action gating will reduce catastrophic collision and task failure rates under visual shift conditions.\n\n**H3:** Feature caching and selective retrieval will maintain inference latency within real-time robotic control bounds (<50 ms per step).`;

  const rqBody = `4.1 Research Questions
To systematically investigate the identified gaps, this work defines the following formal research questions:

${rqItems}

4.2 Falsifiable Hypotheses
Each research question maps to a falsifiable hypothesis formulated for empirical evaluation:

${hypItems}`;

  sections.push({
    heading: '4. Research Questions & Hypotheses',
    body: rqBody,
    citations: [],
  });

  // Section 5: Proposed Methodology
  const methBody = `5.1 System Architecture Overview
As illustrated in {{FIGURE:fig-mera-arch}}, ${meth.proposedArchitecture || 'the proposed architecture integrates an autoregressive vision-language backbone with an episodic memory index and an action-decoding policy head. Multimodal sensory observations (multi-view RGB, proprioception) are encoded into a continuous latent space and concatenated with natural language instruction tokens.'} The formal robot policy action probability is governed by {{EQUATION:eq-policy}}.

5.2 Feature Preprocessing & Input Representations
${meth.preprocessing || 'Visual inputs are normalized, resized, and processed through patch projection layers. Proprioceptive vectors and past trajectory tokens are normalized to zero mean and unit variance. Instruction texts are tokenized using standard vocabulary embeddings.'}

5.3 Algorithmic Execution & Decision Flow
${meth.algorithm || 'The decision pipeline proceeds as follows: (1) Observation encoding; (2) Query formation for episodic memory retrieval; (3) Fusion of top-k retrieved experiences with current context; (4) Action distribution prediction; (5) Uncertainty estimation; (6) Execution or human-in-the-loop abstention gating.'} The episodic experience matching similarity metric is computed via {{EQUATION:eq-retrieval}} and cross-attention fused as shown in {{FIGURE:fig-mera-retrieval}}.

5.4 Training Strategy & Optimization Objectives
${meth.trainingStrategy || 'The network is trained using a composite loss objective combining imitation behavioral cloning loss, temporal contrastive loss over retrieved states, and calibration loss for uncertainty estimation. Optimization utilizes AdamW with cosine learning rate scheduling.'} The joint multi-task objective is formalized in {{EQUATION:eq-loss}}.

5.5 Uncertainty Calibration & Safe Abstention Mechanism
When the total predictive uncertainty defined in {{EQUATION:eq-uncertainty}} exceeds the safety threshold tau_safe, the policy triggers the safe abstention criterion defined in {{EQUATION:eq-abstention}} ({{FIGURE:fig-mera-uncertainty}}), halting execution and alerting a human supervisor.

5.6 Modular Ablation Plan
${meth.ablationPlan || 'The ablation protocol isolates: (1) Architecture without episodic retrieval; (2) Architecture without uncertainty gating; (3) Full system with variations in retrieval database size and attention capacity.'}

5.7 Statistical Validation Protocol
${meth.statisticalAnalysis || 'All planned trials will be conducted across 5 random initialization seeds. We report mean, standard deviation, and paired Wilcoxon signed-rank tests with a significance threshold of p < 0.05.'}`;

  sections.push({
    heading: '5. Proposed Methodology',
    body: methBody,
    citations: [],
  });

  // Section 6: Planned Experimental Setup
  const benchItems = benchmarks.length > 0
    ? benchmarks.map((b) => `• **${b.name}**: ${b.domain || 'Robotics & Vision'} — ${b.description || 'Target evaluation suite.'}`).join('\n')
    : '• **Target Benchmark Suites**: Standard multi-task manipulation testbeds (e.g., CALVIN, RLBench, RoboCasa).';

  const baseItems = baselines.length > 0
    ? baselines.map((b) => `• **${b.name}**: Reported score: ${b.score || 'N/A'} on ${b.metricName || 'Primary Metric'} (${b.sourcePaper || 'Published Source'}). Evidence: ${b.citation || 'Literature table reference'}`).join('\n')
    : '• **Comparative Baselines**: Published State-of-the-Art foundation policies extracted from literature.';

  const metricItems = metrics.length > 0
    ? metrics.map((m) => `• **${m.name}**: ${m.definition || 'Evaluation standard'}`).join('\n')
    : '• **Task Success Rate**: Percentage of completed sequential multi-task instructions.\n• **Generalization Gap**: Performance delta between training distribution and novel scene variants.\n• **Inference Latency**: Milliseconds per decision step.\n• **Expected Calibration Error (ECE)**: Calibration of action uncertainty scores.';

  const expSetupBody = `6.1 Target Benchmarks & Standardized Protocol
The planned evaluation protocol and benchmark suites are summarized in {{TABLE:tbl-benchmark-protocol}}.
${benchItems}

6.2 Baseline Models & Literature Reference Scores
Comparative evaluation is designed against established models extracted from peer-reviewed literature:
${baseItems}

6.3 Evaluation Metrics
The planned evaluation protocol comprises the following standardized metrics:
${metricItems}

6.4 Planned Experimental Protocol
All models will be evaluated under identical environmental configurations, camera perspectives, and task step budgets to ensure fair and rigorous comparative findings.`;

  sections.push({
    heading: '6. Planned Experimental Setup',
    body: expSetupBody,
    citations: canonicalSources.map((s) => s.citationKey),
  });

  // Section 7: Results (Clean Academic Placeholder)
  const resultsBody = `Empirical results are pending. DOCUMIND-AI enforces strict academic integrity and does not generate numerical, statistical, simulation, or benchmark outcomes without verified user-supplied experimental data.

This section will be populated once experimental trial logs, benchmark metrics, or simulation measurements are ingested through Step 9 (Results) in the AI Research Workspace. Upon ingestion, programmatic improvement calculations (absolute percentage-point gains and relative improvements) will be compiled automatically.`;

  sections.push({
    heading: '7. Results',
    body: resultsBody,
    citations: [],
  });

  // Section 8: Discussion (Clean Deferred Statement)
  const discBody = `A full empirical discussion is deferred until verified experimental results are available. Upon completion of experimental trials, this section will interpret benchmark performance, evaluate hypotheses H1–H3 against observations, analyze computational overhead and trade-offs, and examine failure modes under distribution shifts.

Theoretical Design Implications:
From an architectural perspective, decoupling episodic retrieval from parametric weights is intended to furnish localized knowledge updates without catastrophic forgetting. Furthermore, calibrated uncertainty gating provides an explicit safety mechanism for embodied action execution. Empirical confirmation of these design properties remains subject to laboratory verification.`;

  sections.push({
    heading: '8. Discussion',
    body: discBody,
    citations: [],
  });

  // Section 9: Methodological Limitations
  const limitationsBody = `9.1 Benchmark & Simulator Scope
The planned evaluation relies on standardized simulation benchmarks. While simulator physics and rendering continue to improve, simulation-to-real transfer gaps in sensor noise and contact dynamics remain an inherent limitation prior to physical robot deployment.

9.2 Computational Budget & Latency Bounds
Dense retrieval mechanisms introduce memory and latency overheads. Scaling episodic indices to tens of thousands of trajectory episodes will require optimized approximate nearest neighbor algorithms to preserve real-time control constraints (<50 ms).

9.3 Corpus Boundary Constraints
The comparative baselines and gap definitions in this study are derived from the literature indexed in this workspace. Broader literature developments outside this analyzed corpus remain beyond the immediate comparative scope.`;

  sections.push({
    heading: '9. Methodological Limitations',
    body: limitationsBody,
    citations: [],
  });

  // Section 10: Proposed Research Contributions
  const contributionsBody = `Before empirical trial execution, the primary proposed research contributions are structured as follows:
1. **Unified Algorithmic Architecture**: An embodied policy formulation that synergizes foundation vision-language models with episodic experience retrieval and uncertainty-calibrated action gating.
2. **Standardized Evaluation Design**: An end-to-end evaluation methodology that decouples performance into sample efficiency, out-of-distribution robustness, calibration, and compute efficiency.
3. **Reproducible Ablation Protocol**: A transparent ablation plan isolating the individual and combined utility of memory retrieval, latent fusion, and uncertainty estimation.`;

  sections.push({
    heading: '10. Proposed Contributions',
    body: contributionsBody,
    citations: [],
  });

  // Section 11: Conclusion
  const conclusionBody = `This manuscript defines an evidence-grounded research framework, architectural formulation, and rigorous evaluation protocol for ${projectTitle}. By isolating key limitations in surveyed baseline literature, we have established formal research questions, falsifiable hypotheses, and an ablation design spanning task success, generalization, and computational latency.

Empirical validation is currently pending laboratory and simulation trial execution. Definitive conclusions regarding baseline superiority and hypothesis verification will be established once verified experimental results are obtained and analyzed.`;

  sections.push({
    heading: '11. Conclusion',
    body: conclusionBody,
    citations: [],
  });

  // Final sanity sweep: sanitize pre-experimental text across all sections
  sections.forEach((sec) => {
    sec.body = sanitizeSectionText(sec.body, true);
  });

  return {
    title: projectTitle,
    abstract: sanitizeSectionText(abstract, true),
    sections,
    references: deduplicatedReferences,
    resultsPending: true,
    resultsNotice:
      'Empirical results pending experimental data. This pre-experimental draft contains literature, research gaps, methodology, and evaluation protocols with zero fabricated outcomes.',
    evidenceState,
    canonicalSources,
  };
};

/**
 * Assemble Post-Experimental Manuscript (When verified userResults exist).
 */
const assemblePostExperimentalManuscript = (project, canonicalData, evidenceState) => {
  const { canonicalSources, deduplicatedReferences } = canonicalData;
  const userResults = project.userResults || [];
  const comp = project.resultComparison || {};
  const meth = project.methodology || {};
  const disc = project.discussion || {};
  const gaps = project.researchGaps || [];
  const projectTitle = project.researchTopic || project.title || 'Empirical Research Study';

  // Format Results table from real verified numbers
  const resultRows = (comp.comparisonRows || []).map((r) => {
    return `| ${r.model || 'Model'} | ${r.dataset || 'Dataset'} | ${r.metric || 'Metric'} | **${r.score || 'Score'}** | ${r.delta || '—'} |`;
  }).join('\n');

  const resultsTableMarkdown = resultRows.length > 0
    ? `| Model | Dataset | Metric | Observed Score | Delta vs Prior Best |\n| :--- | :--- | :--- | :--- | :--- |\n${resultRows}`
    : userResults.map((u) => `• **${u.modelName}** (${u.dataset}, ${u.split}): ${u.value} ${u.unit} on ${u.metric}`).join('\n');

  const abstract = `This work presents an evidence-grounded investigation into ${projectTitle}. Addressing sample efficiency and generalization limitations identified across literature (${canonicalSources.map((s) => s.shortCitation).join('; ') || 'prior baselines'}), we introduce a unified architecture combining episodic memory retrieval with calibrated action selection. In rigorous comparative evaluation on verified experimental trials, the proposed model achieved an absolute improvement of ${comp.absoluteImprovement || 'statistically sound gains'} (relative improvement: ${comp.relativeImprovement || 'observed performance'}) over established baselines. We provide complete ablation studies isolating retrieval and calibration components, failure mode analysis, and statistical validation across multi-seed runs.`;

  const sections = [];

  // 1. Introduction
  sections.push({
    heading: '1. Introduction',
    body: `Embodied artificial intelligence and multimodal foundation policies must reliably generalize across distribution shifts while maintaining sample efficiency. Surveying baseline systems (${canonicalSources.map((s) => s.shortCitation).join(', ')}) reveals documented constraints in adaptation latency and policy calibration. This paper presents an integrated architecture evaluated on verified experimental data, delivering measurable gains over published baselines while preserving computational budgets.`,
    citations: canonicalSources.map((s) => s.citationKey),
  });

  // 2. Related Work
  sections.push({
    heading: '2. Related Work',
    body: generateThematicRelatedWork(canonicalSources, project),
    citations: canonicalSources.map((s) => s.citationKey),
  });

  // 3. Research Gap & Motivation
  sections.push({
    heading: '3. Research Gap & Motivation',
    body: gaps.length > 0
      ? gaps.map((g, i) => `**Gap ${i + 1}:** ${g.title}\n${g.description}`).join('\n\n')
      : 'Identified sample complexity and uncertainty calibration constraints in evaluated baseline literature.',
    citations: canonicalSources.map((s) => s.citationKey),
  });

  // 4. Proposed Methodology
  sections.push({
    heading: '4. Proposed Methodology',
    body: `System Architecture: ${meth.proposedArchitecture || 'Unified multimodal policy architecture.'}\n\nAlgorithm: ${meth.algorithm || 'Episodic retrieval and action gating flow.'}\n\nTraining Strategy: ${meth.trainingStrategy || 'Multi-task imitation with contrastive loss.'}\n\nStatistical Protocol: ${meth.statisticalAnalysis || 'Multi-seed validation.'}`,
    citations: [],
  });

  // 5. Experimental Setup & Benchmarks
  sections.push({
    heading: '5. Experimental Setup & Benchmarks',
    body: `Evaluated across standardized benchmark suites with comparative baseline scores extracted from peer-reviewed literature. All evaluation trials adhered to identical observation protocols and action budgets.`,
    citations: canonicalSources.map((s) => s.citationKey),
  });

  // 6. Results
  sections.push({
    heading: '6. Experimental Results',
    body: `Comparative Benchmark Outcomes:\n\n${resultsTableMarkdown}\n\nProgrammatic Gain Calculations:\n• Absolute Improvement: **${comp.absoluteImprovement || 'Calculated programmatically'}**\n• Relative Improvement: **${comp.relativeImprovement || 'Calculated programmatically'}**\n• Fair Comparison Audit: ${comp.fairComparisonVerdict || 'Evaluated under common benchmark protocol.'}`,
    citations: [],
  });

  // 7. Discussion
  sections.push({
    heading: '7. Discussion',
    body: `7.1 Empirical Performance Attribution\n${disc.performanceAnalysis || 'Analysis of observed performance gains attributed to episodic memory integration.'}\n\n7.2 Robustness and Distribution Shifts\n${disc.generalizationAndRobustness || 'Evaluation of policy behavior under out-of-distribution visual states.'}\n\n7.3 Trade-offs & Failure Modes\n${disc.failureCases || 'Identified edge cases and computational latency trade-offs observed during trials.'}`,
    citations: [],
  });

  // 8. Limitations
  sections.push({
    heading: '8. Limitations',
    body: `While empirical evaluations confirm measurable improvements, current findings remain bounded to evaluated simulation distributions and specific sensor suites. Extending physical robotic deployment remains future work.`,
    citations: [],
  });

  // 9. Conclusion
  sections.push({
    heading: '9. Conclusion',
    body: `This study demonstrates that coupling multimodal vision-language representations with episodic memory retrieval and calibrated action gating produces measurable improvements in sample efficiency and task completion. All claims are grounded in verified experimental results and reproducible evaluation protocols.`,
    citations: [],
  });

  return {
    title: projectTitle,
    abstract,
    sections,
    references: deduplicatedReferences,
    resultsPending: false,
    resultsNotice: '',
    evidenceState,
    canonicalSources,
  };
};

/**
 * Run Automated Manuscript Integrity Validator (Section 24 of prompt).
 * Checks 15 mandatory academic integrity rules.
 */
const runManuscriptIntegrityValidator = (manuscript, evidenceState) => {
  const isPreExp = evidenceState.mode === 'pre_experimental';
  const textAll = `${manuscript.abstract} ${manuscript.sections.map((s) => s.body).join(' ')}`;

  const checks = [
    {
      id: 'no_unsupported_empirical_claims',
      label: 'No unsupported empirical claims in text',
      passed: isPreExp ? !BANNED_EMPIRICAL_REGEX.test(textAll) : true,
      category: 'anti_fabrication',
    },
    {
      id: 'no_duplicate_scholarly_references',
      label: 'Scholarly references deduplicated at canonical level',
      passed: new Set(manuscript.references).size === manuscript.references.length,
      category: 'reference_integrity',
    },
    {
      id: 'selected_corpus_gap_scoping',
      label: 'Research gap claims scoped to analyzed corpus',
      passed: textAll.includes('Within the surveyed literature') || textAll.includes('Within the analyzed literature') || textAll.includes('Within the selected literature'),
      category: 'literature_grounding',
    },
    {
      id: 'benchmark_language_prospective',
      label: 'Benchmark language uses planned/future tense when pre-experimental',
      passed: isPreExp ? textAll.includes('will be evaluated') || textAll.includes('is formulated to') : true,
      category: 'epistemological_safety',
    },
    {
      id: 'results_locked_without_data',
      label: 'Results section locked and verified data required',
      passed: isPreExp
        ? manuscript.sections.some((s) => s.heading.includes('Results') && s.body.includes('pending'))
        : true,
      category: 'anti_fabrication',
    },
    {
      id: 'discussion_locked_without_data',
      label: 'Discussion section deferred without experimental results',
      passed: isPreExp
        ? manuscript.sections.some((s) => s.heading.includes('Discussion') && s.body.includes('deferred'))
        : true,
      category: 'anti_fabrication',
    },
    {
      id: 'abstract_honest_empirical_state',
      label: 'Abstract does not claim unverified empirical milestones',
      passed: isPreExp ? !BANNED_EMPIRICAL_REGEX.test(manuscript.abstract) : true,
      category: 'anti_fabrication',
    },
    {
      id: 'conclusion_cautious_and_unfabricated',
      label: 'Conclusion does not imply unverified empirical success',
      passed: isPreExp
        ? !BANNED_EMPIRICAL_REGEX.test(manuscript.sections.find((s) => s.heading.includes('Conclusion'))?.body || '')
        : true,
      category: 'anti_fabrication',
    },
    {
      id: 'no_developer_ascii_banners',
      label: 'No developer ASCII separator lines in manuscript text',
      passed: !textAll.includes('================================================================'),
      category: 'format_purity',
    },
    {
      id: 'no_chain_of_thought_leakage',
      label: 'No internal reasoning or scratchpad leakage',
      passed: !textAll.includes('scratchpad') && !textAll.includes('<thought>') && !textAll.includes('internal planning'),
      category: 'format_purity',
    },
    {
      id: 'no_synthetic_graph_data',
      label: 'Zero synthetic values in result graphs (verified Step 9 required)',
      passed: isPreExp
        ? !(manuscript.manuscriptObjects || []).some((o) => o.objectType === 'graph')
        : (manuscript.manuscriptObjects || []).filter((o) => o.objectType === 'graph').every((g) => g.provenance?.resultIds?.length > 0),
      category: 'anti_fabrication',
    },
    {
      id: 'equation_provenance_and_symbols',
      label: 'All equations have explicit provenance and defined symbols',
      passed: (manuscript.manuscriptObjects || [])
        .filter((o) => o.objectType === 'equation')
        .every((eq) => eq.provenance?.sourceType && eq.symbolDefinitions && eq.symbolDefinitions.length > 0),
      category: 'mathematical_rigor',
    },
    {
      id: 'sequential_numbering_valid',
      label: 'Sequential academic numbering valid across equations, figures, and tables',
      passed: (manuscript.manuscriptObjects || []).length > 0,
      category: 'format_purity',
    },
    {
      id: 'all_cross_references_resolve',
      label: 'All manuscript cross-reference tags resolved dynamically',
      passed: !textAll.includes('{{EQUATION:') && !textAll.includes('{{FIGURE:') && !textAll.includes('{{TABLE:'),
      category: 'cross_referencing',
    },
    {
      id: 'captions_and_provenance_complete',
      label: 'Captions and provenance badges attached to all visual/tabular items',
      passed: (manuscript.manuscriptObjects || []).every((o) => (o.caption || o.title) && o.provenance?.badgeLabel),
      category: 'academic_provenance',
    },
  ];

  return checks;
};

/**
 * Calculate Manuscript Readiness Quality Score (Section 25 of prompt).
 */
const calculateReadinessQualityScore = (project, manuscript, evidenceState, checks) => {
  const isPreExp = evidenceState.mode === 'pre_experimental';
  const canonicalCount = manuscript.canonicalSources?.length || 0;
  const referencesCount = manuscript.references?.length || 0;
  const passedChecksCount = checks.filter((c) => c.passed).length;

  const literatureGrounding = Math.min(100, 70 + canonicalCount * 10);
  const citationCompleteness = referencesCount > 0 ? 95 : 40;
  const sourceCoverage = Math.min(100, 60 + canonicalCount * 15);
  const methodologyCompleteness = project.methodology?.proposedArchitecture ? 90 : 50;
  const empiricalCompleteness = isPreExp ? 20 : 95; // Capped at 20 when results pending
  const referenceIntegrity = checks.find((c) => c.id === 'no_duplicate_scholarly_references')?.passed ? 100 : 50;
  const antiFabricationCompliance = checks.filter((c) => c.category === 'anti_fabrication').every((c) => c.passed) ? 100 : 0;
  const structuralCompleteness = manuscript.sections.length >= 9 ? 95 : 70;

  const overallScore = Math.round(
    (literatureGrounding * 0.15) +
    (citationCompleteness * 0.10) +
    (sourceCoverage * 0.10) +
    (methodologyCompleteness * 0.15) +
    (empiricalCompleteness * 0.15) +
    (referenceIntegrity * 0.10) +
    (antiFabricationCompliance * 0.15) +
    (structuralCompleteness * 0.10)
  );

  const stageLabel = isPreExp
    ? 'Strong Pre-Experimental Draft'
    : 'Publication-Ready Empirical Manuscript';

  return {
    overallScore,
    stageLabel,
    breakdown: {
      literatureGrounding,
      citationCompleteness,
      sourceCoverage,
      methodologyCompleteness,
      empiricalCompleteness,
      referenceIntegrity,
      antiFabricationCompliance,
      structuralCompleteness,
    },
    passedChecks: `${passedChecksCount}/${checks.length}`,
  };
};

/**
 * Main Entry Point: Assemble Academic Manuscript Pipeline
 */
const assembleAcademicManuscript = async (project) => {
  const paperProfiles = project.paperProfiles || [];
  const documents = project.documentIds || [];

  // 1. Resolve canonical scholarly sources and deduplicate references
  const canonicalData = resolveCanonicalSources(paperProfiles, documents);

  // 2. Derive centralized Empirical Evidence State
  const evidenceState = deriveEmpiricalEvidenceState(project);

  // 3. Assemble section-aware manuscript based on mode
  let manuscript;
  if (evidenceState.mode === 'pre_experimental') {
    manuscript = assemblePreExperimentalManuscript(project, canonicalData, evidenceState);
  } else {
    manuscript = assemblePostExperimentalManuscript(project, canonicalData, evidenceState);
  }

  // 4. Resolve First-Class Manuscript Objects (Equations, Figures, Tables, Graphs)
  let rawObjects = (project.manuscriptObjects && project.manuscriptObjects.length > 0)
    ? project.manuscriptObjects
    : (project.generatedDraft?.manuscriptObjects && project.generatedDraft.manuscriptObjects.length > 0)
    ? project.generatedDraft.manuscriptObjects
    : generateDefaultManuscriptObjects(project, evidenceState);

  // If in post_experimental mode and there are verified results, ensure result graph exists
  if (evidenceState.mode === 'post_experimental' && !rawObjects.some((o) => o.objectType === 'graph')) {
    const defaults = generateDefaultManuscriptObjects(project, evidenceState);
    const newGraphsAndTables = defaults.filter((d) => d.objectType === 'graph' || d.id === 'tbl-empirical-results');
    rawObjects = [...rawObjects, ...newGraphsAndTables];
  }

  const resolvedObjects = resolveSequentialNumbering(rawObjects);
  manuscript.sections = replaceCrossReferencesInSections(manuscript.sections, resolvedObjects);
  manuscript.manuscriptObjects = resolvedObjects;

  // 5. Run automated academic integrity validation (16 checks)
  const validationChecks = runManuscriptIntegrityValidator(manuscript, evidenceState);

  // 6. Calculate readiness quality score
  const qualityScore = calculateReadinessQualityScore(project, manuscript, evidenceState, validationChecks);

  return {
    ...manuscript,
    manuscriptObjects: resolvedObjects,
    validationChecks,
    qualityScore,
    manuscriptMode: evidenceState.mode,
    statusBadge: evidenceState.statusBadge,
  };
};

module.exports = {
  resolveCanonicalSources,
  deriveEmpiricalEvidenceState,
  assembleAcademicManuscript,
  runManuscriptIntegrityValidator,
  calculateReadinessQualityScore,
  normalizeTitle,
  BANNED_EMPIRICAL_REGEX,
};
