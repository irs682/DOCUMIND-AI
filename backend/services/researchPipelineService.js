/**
 * Autonomous Research Evidence, Relevance, Citation, and Quality-Control Agent
 * for DOCUMIND-AI
 *
 * Implements:
 * 1. Research Intent Extraction (Domain, Entities, Concepts, Objectives)
 * 2. Evidence Decomposition
 * 3. 4-Way Source Classification (DIRECTLY_RELEVANT, PARTIALLY_RELEVANT, TANGENTIALLY_RELEVANT, IRRELEVANT)
 * 4. Evidence Ledger Creation
 * 5. Hard Relevance Gate & Retrieval Failure Detection
 * 6. Anti-Topic-Substitution Protection
 * 7. Research Gap & False Literature Guard
 * 8. Strict Citation Specificity Gate (No generic "[1] All Uploaded Documents")
 * 9. Dual Output Formatting:
 *    - Incomplete/Irrelevant -> "# Research Evidence Assessment"
 *    - Verified/Sufficient  -> "# AI Research Report"
 */

const { generateAnswer } = require("./llmService");
const { detectConflicts } = require("./groundingService");
const { runClaimVerificationPipeline } = require("./claimVerificationService");

/**
 * STEP 1: Understand the User's Actual Research Topic
 */
const extractResearchIntent = (topic = "", questions = "") => {
  const fullText = `${topic} ${questions}`.trim();
  const lowerText = fullText.toLowerCase();

  // Detect domain
  let domain = "General Technology / Engineering";
  if (/\b(vision-language-action|vla|robot|robotics|embodied|manipulation|visuomotor|actuation|end-effector)\b/i.test(fullText)) {
    domain = "Embodied AI / Robotics / Vision-Language-Action";
  } else if (/\b(auth|mfa|totp|jwt|password|rbac|session|pos|erp|token|audit_logs)\b/i.test(fullText)) {
    domain = "Information Security / Enterprise ERP / Authentication";
  } else if (/\b(finance|accounting|ledger|invoice|tax|payment)\b/i.test(fullText)) {
    domain = "Financial Systems / Accounting";
  } else if (/\b(health|medical|clinical|patient|ehr)\b/i.test(fullText)) {
    domain = "Healthcare & Biomedical Informatics";
  }

  // Extract explicit requirement IDs (e.g., FR-AUTH-004)
  const reqMatches = fullText.match(/\b([A-Z]{2,4}-[A-Z0-9]+-\d{2,4})\b/gi) || [];
  const uniqueReqs = Array.from(new Set(reqMatches.map((r) => r.toUpperCase())));

  // Extract core concepts
  const conceptTerms = [
    "vision-language-action", "vla", "episodic memory", "memory retrieval",
    "uncertainty estimation", "uncertainty calibration", "decision-making",
    "trustworthy ai", "action prediction", "robot learning", "totp", "mfa",
    "jwt", "redis", "postgresql", "argon2id", "lockout", "captcha", "session",
  ];
  const detectedConcepts = conceptTerms.filter((c) => lowerText.includes(c));

  // Extract primary entities (capitalized or quoted technical tokens)
  const entityMatches = fullText.match(/\b[A-Z][a-zA-Z0-9_.-]{2,}\b/g) || [];
  const uniqueEntities = Array.from(new Set(entityMatches)).filter(
    (e) => !/^(The|This|What|How|When|Where|Which|Analyze|Explain|Provide)$/i.test(e)
  );

  return {
    rawQuery: fullText,
    exactTopic: topic.trim(),
    domain,
    detectedConcepts,
    keyEntities: uniqueEntities,
    requirementIds: uniqueReqs,
    researchObjective: `Exhaustive, source-grounded research analysis on: ${topic.trim()}`,
  };
};

/**
 * STEP 3: Classify Every Retrieved Chunk into 4 Categories
 * (DIRECTLY_RELEVANT, PARTIALLY_RELEVANT, TANGENTIALLY_RELEVANT, IRRELEVANT)
 * Based on ACTUAL CONTENT, never vector similarity alone.
 */
const classifyChunkRelevance = (chunk = {}, intent = {}) => {
  const text = (chunk.text || chunk.snippet || "").toLowerCase();
  const title = (chunk.documentName || chunk.metadata?.section || "").toLowerCase();
  const queryDomain = intent.domain.toLowerCase();

  // If query is Robotics/VLA, but text is purely about enterprise auth/passwords/JWT
  const isVlaQuery = queryDomain.includes("robotics") || queryDomain.includes("vision-language-action");
  const isAuthText = /\b(auth|mfa|password|jwt|session|login|cashier|pin|bakesuite)\b/i.test(text);
  const isVlaText = /\b(vla|vision-language-action|robot|robotics|embodied|manipulation|visuomotor|actuation)\b/i.test(text);

  if (isVlaQuery && isAuthText && !isVlaText) {
    return {
      classification: "IRRELEVANT",
      reason: "Source concerns enterprise authentication/ERP and contains no robotics or Vision-Language-Action evidence.",
    };
  }

  // Check matching concepts from user intent
  const matchingConcepts = (intent.detectedConcepts || []).filter((c) => text.includes(c));
  const matchingEntities = (intent.keyEntities || []).filter((e) => text.includes(e.toLowerCase()));
  const matchingReqs = (intent.requirementIds || []).filter((r) => text.includes(r.toLowerCase()));

  if (matchingReqs.length > 0 || (matchingConcepts.length >= 2 && matchingEntities.length >= 1)) {
    return {
      classification: "DIRECTLY_RELEVANT",
      reason: `Directly supports core entities/concepts: ${[...matchingReqs, ...matchingConcepts].slice(0, 3).join(", ")}.`,
    };
  }

  if (matchingConcepts.length >= 1 || matchingEntities.length >= 1) {
    return {
      classification: "PARTIALLY_RELEVANT",
      reason: `Partially supports components: ${[...matchingConcepts, ...matchingEntities].slice(0, 2).join(", ")}.`,
    };
  }

  // Check generic technical word overlap
  if (/\b(system|model|architecture|database|algorithm|accuracy|data)\b/i.test(text)) {
    return {
      classification: "TANGENTIALLY_RELEVANT",
      reason: "Shares generic terminology but does not substantively substantiate the requested research topic.",
    };
  }

  return {
    classification: "IRRELEVANT",
    reason: "Content concerns an unrelated problem space.",
  };
};

/**
 * STEP 4 & 5: Hard Relevance Gate, Evidence Ledger, and Retrieval Failure Check
 */
const evaluateRelevanceGate = ({ intent, retrievedChunks = [] }) => {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      decision: "INSUFFICIENT_EVIDENCE",
      evidenceStatus: "INSUFFICIENT",
      directlyRelevantCount: 0,
      partiallyRelevantCount: 0,
      tangentialCount: 0,
      irrelevantCount: 0,
      classifiedChunks: [],
      reason: "No evidence passages were retrieved from the knowledge base.",
      isRetrievalFailure: false,
    };
  }

  const classifiedChunks = retrievedChunks.map((c) => {
    const { classification, reason } = classifyChunkRelevance(c, intent);
    return {
      ...c,
      classification,
      classificationReason: reason,
    };
  });

  const directlyRelevant = classifiedChunks.filter((c) => c.classification === "DIRECTLY_RELEVANT");
  const partiallyRelevant = classifiedChunks.filter((c) => c.classification === "PARTIALLY_RELEVANT");
  const tangential = classifiedChunks.filter((c) => c.classification === "TANGENTIALLY_RELEVANT");
  const irrelevant = classifiedChunks.filter((c) => c.classification === "IRRELEVANT");

  // Topic substitution / retrieval failure detection
  const isAllIrrelevant = directlyRelevant.length === 0 && partiallyRelevant.length === 0;
  const isRetrievalFailure = isAllIrrelevant && irrelevant.length > 0;

  let decision = "INSUFFICIENT_EVIDENCE";
  let evidenceStatus = "INSUFFICIENT";

  if (isRetrievalFailure) {
    decision = "RETRIEVAL_FAILURE";
    evidenceStatus = "INSUFFICIENT";
  } else if (directlyRelevant.length >= 2) {
    decision = "GENERATE_FULL_REPORT";
    evidenceStatus = "SUFFICIENT";
  } else if (directlyRelevant.length >= 1 || partiallyRelevant.length >= 2) {
    decision = "GENERATE_LIMITED_REPORT";
    evidenceStatus = "PARTIAL";
  } else {
    decision = "INSUFFICIENT_EVIDENCE";
    evidenceStatus = "INSUFFICIENT";
  }

  return {
    decision,
    evidenceStatus,
    directlyRelevantCount: directlyRelevant.length,
    partiallyRelevantCount: partiallyRelevant.length,
    tangentialCount: tangential.length,
    irrelevantCount: irrelevant.length,
    classifiedChunks,
    isRetrievalFailure,
    reason: isRetrievalFailure
      ? "Retrieved documents concern a completely different problem space. Semantic vector retrieval failed to locate topic-relevant evidence."
      : directlyRelevant.length > 0
      ? `Identified ${directlyRelevant.length} directly relevant and ${partiallyRelevant.length} partially relevant sources.`
      : "Insufficient directly relevant evidence available in the active knowledge base.",
  };
};

/**
 * STEP 11: Format Incomplete/Insufficient Evidence Report
 * (Outputs strict "# Research Evidence Assessment")
 */
const buildEvidenceAssessmentReport = ({ intent, gateResult, retrievedChunks = [] }) => {
  const rejectedSources = gateResult.classifiedChunks.filter(
    (c) => c.classification === "IRRELEVANT" || c.classification === "TANGENTIALLY_RELEVANT"
  );

  const relevantSources = gateResult.classifiedChunks.filter(
    (c) => c.classification === "DIRECTLY_RELEVANT" || c.classification === "PARTIALLY_RELEVANT"
  );

  const sections = [
    {
      heading: "Requested Research Topic",
      body: `**Topic:** ${intent.exactTopic}\n**Target Domain:** ${intent.domain}\n**Objective:** ${intent.researchObjective}`,
    },
    {
      heading: "Evidence Status",
      body: `**Status:** \`${gateResult.evidenceStatus}\`\n**Pipeline Gate Decision:** \`${gateResult.decision}\`\n\n${gateResult.reason}`,
    },
    {
      heading: "Relevance Assessment",
      body: gateResult.isRetrievalFailure
        ? `The active knowledge base does NOT contain documents substantively addressing **${intent.exactTopic}**. While vector similarity returned ${retrievedChunks.length} passage(s), content analysis confirms that these passages belong to an unrelated domain (${rejectedSources[0]?.documentName || "Enterprise Systems"}) and cannot legitimately support this research inquiry.`
        : `Evaluated ${retrievedChunks.length} candidate passages: ${gateResult.directlyRelevantCount} directly relevant, ${gateResult.partiallyRelevantCount} partially relevant, ${gateResult.irrelevantCount} irrelevant.`,
    },
    {
      heading: "Relevant Evidence Found",
      body:
        relevantSources.length > 0
          ? relevantSources
              .map(
                (c, i) =>
                  `### Relevant Source ${i + 1}: ${c.documentName || "Document"} (${c.metadata?.section || "Section"})\n> ${(c.text || c.snippet).slice(0, 300)}...\n*Classification:* ${c.classification} — ${c.classificationReason}`
              )
              .join("\n\n")
          : "No directly relevant evidence was found.",
    },
    {
      heading: "Rejected Retrieval Evidence (NOT USED AS RESEARCH EVIDENCE)",
      body:
        rejectedSources.length > 0
          ? rejectedSources
              .map(
                (c, i) =>
                  `- **[REJECTED] ${c.documentName || "Source"} (${c.metadata?.section || "Section"})**: ${c.classificationReason}`
              )
              .join("\n")
          : "No sources were rejected.",
    },
    {
      heading: "What Is Missing",
      body: `The following core research evidence categories are absent from the indexed knowledge base:\n- Foundational architectural papers and benchmark datasets for **${intent.exactTopic}**\n- Quantitative empirical baselines, ablation studies, and evaluation metrics\n- Methodological definitions for target entities: ${intent.detectedConcepts.join(", ") || intent.exactTopic}`,
    },
    {
      heading: "Recommended Evidence to Upload",
      body:
        intent.domain.includes("Robotics") || intent.domain.includes("Vision-Language-Action")
          ? `- Vision-Language-Action research papers (e.g., OpenVLA, Octo, RT-2, RT-1, PaLM-E)\n- Robot manipulation benchmark papers (e.g., BridgeData V2, RLBench, LIBERO)\n- Episodic memory mechanisms and retrieval-augmented visuomotor policy literature\n- Epistemic & aleatoric uncertainty calibration and abstention studies in robotics`
          : `- Official technical specifications and architecture diagrams for ${intent.exactTopic}\n- Comprehensive functional requirement catalogs and API specifications\n- Performance benchmarks and deployment constraints`,
    },
    {
      heading: "Important Limitation",
      body: "> **Crucial Scientific Distinction:** The absence of relevant information in the current knowledge base does not establish a research gap in the literature. It only indicates that relevant literature has not yet been indexed into this workspace.",
    },
  ];

  return {
    topic: intent.exactTopic,
    status: gateResult.decision,
    evidenceStatus: gateResult.evidenceStatus,
    qcPassed: false,
    executiveSummary: `Research Evidence Assessment for "${intent.exactTopic}": Evidence status is ${gateResult.evidenceStatus}. Retrieved documents were classified as ${gateResult.isRetrievalFailure ? "IRRELEVANT (Retrieval Failure)" : "INSUFFICIENT"}. No speculative or hallucinated research synthesis was generated.`,
    sections,
    citations: [], // Strictly 0 citations when rejected/insufficient
  };
};

/**
 * STEP 12: Build Full Grounded AI Research Report
 */
const buildSufficientResearchReport = async ({
  intent,
  gateResult,
  retrievedChunks = [],
  allDocChunks = [],
}) => {
  const relevantChunks = gateResult.classifiedChunks.filter(
    (c) => c.classification === "DIRECTLY_RELEVANT" || c.classification === "PARTIALLY_RELEVANT"
  );

  const contextText = relevantChunks
    .map((c) => (c.text || c.snippet || "").trim())
    .filter(Boolean)
    .join("\n\n");

  const reportPrompt = `You are the DOCUMIND-AI Research Agent. Generate an exhaustive, strictly evidence-grounded research report on the topic: "${intent.exactTopic}".
CRITICAL: Use ONLY the following verified source passages. Never invent facts, literature, or numbers:
${contextText}

Generate your response in JSON format with exactly two top-level keys:
1. "executiveSummary": A concise summary (150-250 words) synthesizing only verified findings.
2. "sections": An array of objects, where each object has "heading" (string) and "body" (multi-paragraph markdown string):
   - "1. Research Problem"
   - "2. Existing Approaches & Extracted Data"
   - "3. Technical Methodologies & Architecture"
   - "4. Comparative Analysis"
   - "5. Limitations & Constraints"
   - "6. Proposed Research Directions"`;

  let executiveSummary = "";
  let sections = [];

  try {
    const rawJson = await generateAnswer({
      question: reportPrompt,
      context: contextText,
    });

    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      executiveSummary = parsed.executiveSummary || "";
      sections = parsed.sections || [];
    } else if (rawJson && rawJson.trim()) {
      executiveSummary = rawJson.slice(0, 300) + "...";
      sections = [{ heading: "1. Research Problem", body: rawJson }];
    }
  } catch (err) {
    console.warn("[Research Synthesis Warning]:", err.message);
  }

  if (!executiveSummary) {
    executiveSummary = `Grounded research report on "${intent.exactTopic}". Synthesized from ${relevantChunks.length} verified evidence passages.`;
    sections = [{ heading: "1. Research Problem", body: contextText }];
  }

  // Conflict Detection
  const conflictReport = detectConflicts(relevantChunks, allDocChunks);
  if (conflictReport && conflictReport.conflict_detected) {
    sections.push({
      heading: "Source Conflicts & Discrepancies",
      body: conflictReport.conflicts
        .map(
          (c) =>
            `SOURCE CONFLICT:\n- Location A: ${c.values[0]}\n- Location B: ${c.values[1]}\n- Details: ${c.description}\n- Status: Requires clarification`
        )
        .join("\n\n"),
    });
  }

  // Claim Verification & Fact Checking
  const fullText = `${executiveSummary}\n\n` + sections.map((s) => `## ${s.heading}\n${s.body}`).join("\n\n");
  const verification = runClaimVerificationPipeline({
    answer: fullText,
    sourceText: contextText,
    conflictReport,
  });

  // Strict specific citations (No generic labels)
  const validCitations = relevantChunks.map((c, i) => ({
    citationIndex: i + 1,
    documentName: c.documentName || "Indexed Specification",
    section: c.metadata?.section || c.metadata?.requirement_id || `Passage ${i + 1}`,
    pageNumber: c.chunkIndex != null ? c.chunkIndex + 1 : i + 1,
    snippet: (c.text || c.snippet || "").slice(0, 180) + "...",
  }));

  return {
    topic: intent.exactTopic,
    status: gateResult.decision,
    evidenceStatus: gateResult.evidenceStatus,
    qcPassed: verification.passed,
    executiveSummary: verification.verifiedAnswer ? verification.verifiedAnswer.slice(0, 350) + "..." : executiveSummary,
    sections,
    claimLedger: verification.ledger,
    verificationSummary: verification.summary,
    conflictReport,
    citations: validCitations,
  };
};

/**
 * End-to-End Orchestrator
 */
const executeResearchPipeline = async ({
  topic,
  questions = "",
  retrievedChunks = [],
  allDocChunks = [],
}) => {
  // Step 1: Understand user's actual research topic
  const intent = extractResearchIntent(topic, questions);

  // Step 2-5: Decompose, Classify, Hard Relevance Gate & Retrieval Failure Check
  const gateResult = evaluateRelevanceGate({ intent, retrievedChunks });

  // Branching: If insufficient or retrieval failed -> Build strict Assessment Report
  if (gateResult.decision === "RETRIEVAL_FAILURE" || gateResult.decision === "INSUFFICIENT_EVIDENCE") {
    return buildEvidenceAssessmentReport({ intent, gateResult, retrievedChunks });
  }

  // Branching: If sufficient/partial evidence exists -> Build verified Research Report
  return buildSufficientResearchReport({
    intent,
    gateResult,
    retrievedChunks,
    allDocChunks,
  });
};

module.exports = {
  extractResearchIntent,
  classifyChunkRelevance,
  evaluateRelevanceGate,
  buildEvidenceAssessmentReport,
  buildSufficientResearchReport,
  executeResearchPipeline,
};
