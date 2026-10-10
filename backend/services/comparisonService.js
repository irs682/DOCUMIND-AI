/**
 * Advanced Document Comparison Service for DOCUMIND-AI
 * Phase 6 Module — Mode Detection, Semantic Section Alignment & Precision Analysis
 */
const crypto = require('crypto');
const Document = require('../models/Document');
const DocumentComparison = require('../models/DocumentComparison');
const { callOpenRouter, getMainModel, getFastModel, formatCleanPlainText } = require('./llmService');
const { createEmbedding } = require('./embeddingService');
const { isUsableDocumentText } = require('./textQualityService');

// ── Math & Similarity Utilities ──

const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
};

const textJaccardSimilarity = (textA = '', textB = '') => {
  const wordsA = new Set(textA.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(textB.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
  if (!wordsA.size && !wordsB.size) return 1;
  if (!wordsA.size || !wordsB.size) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
};

// ── Heading Normalization & Synonym Mapping ──

const normalizeHeading = (h = '') => {
  return h
    .toLowerCase()
    .replace(/^[0-9.#\-\s]+/, '')
    .replace(/\b(section|chapter|part|informal|formal|report|notes|an|the|overview of|introduction to)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const HEADING_SYNONYM_GROUPS = [
  ['introduction', 'intro', 'background', 'overview', 'preface', 'preamble', 'informal introduction'],
  ['summary', 'executive summary', 'abstract', 'synopsis', 'key takeaways', 'overview'],
  ['conclusion', 'conclusions', 'recommendation', 'recommendations', 'conclusions and recommendations', 'next steps', 'future work', 'closing'],
  ['discussion', 'analysis', 'findings', 'results', 'body', 'investigation', 'details'],
  ['methodology', 'methods', 'approach', 'process', 'procedure', 'framework'],
  ['requirements', 'specifications', 'functional requirements', 'technical specifications', 'guidelines', 'criteria'],
  ['feasibility', 'feasibility analysis', 'viability', 'evaluation', 'assessment'],
  ['cost', 'financial', 'budget', 'roi', 'pricing', 'commercial'],
  ['market', 'market feasibility', 'industry analysis', 'market analysis', 'demand'],
  ['risk', 'risk analysis', 'risks', 'mitigation', 'constraints'],
];

const areSynonymHeadings = (headingA = '', headingB = '') => {
  const normA = normalizeHeading(headingA);
  const normB = normalizeHeading(headingB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  for (const group of HEADING_SYNONYM_GROUPS) {
    const hasA = group.some((term) => normA.includes(term) || term.includes(normA));
    const hasB = group.some((term) => normB.includes(term) || term.includes(normB));
    if (hasA && hasB) return true;
  }
  return false;
};

// ── Section Extraction & Boundary Validation ──

const STANDARD_HEADING_REGEX =
  /(?:^|\n{2,})(?:(?:(?:[0-9]+(?:\.[0-9]+)*|\b[IVXLCDM]+\b|#+)\s+)?([A-Z][A-Za-z0-9\s,\-&]{2,60}))(?:\n|:)/g;

/**
 * Intelligent section extractor that validates boundaries, respects page ranges,
 * and recovers actual sub-headings when chunks have default uniform labels.
 */
const extractNormalizedSections = (doc) => {
  const sections = [];
  const fileName = doc.name || doc.originalName || 'Document';
  const totalPages = Math.max(doc.pageCount || 1, 1);

  // Strategy 1: Use Document.chunks if available
  if (doc.chunks && Array.isArray(doc.chunks) && doc.chunks.length > 0) {
    const validChunks = doc.chunks.filter((c) => isUsableDocumentText(c.text) && !c.isReference);

    // Check if chunks have uniform default sections (e.g. all "Introduction" or "General")
    const distinctSections = new Set(validChunks.map((c) => (c.section || '').trim()).filter(Boolean));
    const isUniformlyDefaulted = distinctSections.size <= 1 && validChunks.length > 5;

    if (!isUniformlyDefaulted) {
      // Group chunks by actual distinct section + page boundaries
      const groups = new Map();

      for (const chunk of validChunks) {
        const secTitle = chunk.section || 'General';
        const pageNum = Math.min(Math.max(chunk.pageNumber || 1, 1), totalPages);
        const groupKey = `${secTitle.replace(/[^\w]/g, '_')}_p${Math.floor((pageNum - 1) / 3)}`;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            sectionId: `sec_${groupKey}`,
            title: secTitle,
            pageStart: pageNum,
            pageEnd: pageNum,
            texts: [],
            tables: [],
            embedding: chunk.embedding || null,
          });
        }
        const g = groups.get(groupKey);
        g.texts.push(chunk.text);
        g.pageStart = Math.min(g.pageStart, pageNum);
        g.pageEnd = Math.max(g.pageEnd, pageNum);
        if (chunk.isTable && chunk.tableMetadata) {
          g.tables.push(chunk.tableMetadata);
        }
      }

      for (const g of groups.values()) {
        const validatedStart = Math.max(1, Math.min(g.pageStart, totalPages));
        const validatedEnd = Math.max(validatedStart, Math.min(g.pageEnd, totalPages));
        sections.push({
          sectionId: g.sectionId,
          title: g.title,
          pageStart: validatedStart,
          pageEnd: validatedEnd,
          text: g.texts.join('\n\n'),
          tables: g.tables,
          embedding: g.embedding,
          documentId: String(doc._id),
          fileName,
        });
      }
    }
  }

  // Strategy 2: Fallback to fullText or recovery when chunks lacked distinct sections
  if (sections.length === 0 && doc.fullText && doc.fullText.trim().length > 30) {
    const fullText = doc.fullText;
    const paragraphs = fullText.split(/\n{2,}/).filter((p) => p.trim().length > 25);

    let currentTitle = 'Introduction';
    let currentBatch = [];
    let secIdx = 1;
    const estParagraphsPerPage = Math.max(1, Math.round(paragraphs.length / totalPages));

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      const firstLine = p.split('\n')[0].trim();
      const isHeading =
        firstLine.length < 70 &&
        /^([0-9]+(\.[0-9]+)*\s+[A-Z]|#+\s+[A-Z]|[A-Z\s]{4,}:?|(?:Informal\s+)?Introduction|Summary|Executive\s+Summary|Background|Discussion|Conclusions?(?:\s+and\s+Recommendations?)?|Recommendations?|Market\s+Feasibility|Technical\s+Feasibility|Financial\s+Feasibility|Operational\s+Feasibility|Risk\s+Analysis)/i.test(
          firstLine
        );

      if (isHeading && currentBatch.length > 0) {
        const pStart = Math.max(1, Math.min(totalPages, Math.floor((i - currentBatch.length) / estParagraphsPerPage) + 1));
        const pEnd = Math.max(pStart, Math.min(totalPages, Math.floor(i / estParagraphsPerPage) + 1));

        sections.push({
          sectionId: `sec_${secIdx++}`,
          title: currentTitle,
          pageStart: pStart,
          pageEnd: pEnd,
          text: currentBatch.join('\n\n'),
          tables: [],
          embedding: null,
          documentId: String(doc._id),
          fileName,
        });
        currentTitle = firstLine.replace(/^[#0-9.\s]+/, '').replace(/:$/, '').trim() || 'Section';
        currentBatch = [p.slice(firstLine.length).trim()].filter(Boolean);
      } else {
        currentBatch.push(p);
      }
    }

    if (currentBatch.length > 0) {
      const pStart = Math.max(1, Math.min(totalPages, Math.floor((paragraphs.length - currentBatch.length) / estParagraphsPerPage) + 1));
      const pEnd = totalPages;
      sections.push({
        sectionId: `sec_${secIdx}`,
        title: currentTitle,
        pageStart: pStart,
        pageEnd: pEnd,
        text: currentBatch.join('\n\n'),
        tables: [],
        embedding: null,
        documentId: String(doc._id),
        fileName,
      });
    }
  }

  // Final fallback: Single validated section (with strict page limits)
  if (sections.length === 0) {
    sections.push({
      sectionId: 'sec_1',
      title: 'Full Document Content',
      pageStart: 1,
      pageEnd: totalPages,
      text: (doc.fullText || '').slice(0, 8000),
      tables: [],
      embedding: null,
      documentId: String(doc._id),
      fileName,
    });
  }

  // Attach unassigned tables to respective sections
  if (doc.tables && Array.isArray(doc.tables) && doc.tables.length > 0) {
    doc.tables.forEach((tbl) => {
      const page = tbl.pageNumber || 1;
      const targetSec = sections.find((s) => s.pageStart <= page && s.pageEnd >= page) || sections[0];
      if (targetSec && !targetSec.tables.some((t) => t.tableId === tbl.tableId)) {
        targetSec.tables.push(tbl);
      }
    });
  }

  // Strict page boundary sanitation
  sections.forEach((sec) => {
    sec.pageStart = Math.max(1, Math.min(sec.pageStart || 1, totalPages));
    sec.pageEnd = Math.max(sec.pageStart, Math.min(sec.pageEnd || sec.pageStart, totalPages));
  });

  return sections;
};

// ── Relationship Classification & Mode Detection ──

/**
 * Classifies whether two documents are revisions of the same work (VERSION_COMPARISON)
 * or separate educational / informational works (GENERAL_COMPARISON).
 */
const classifyDocumentRelationship = async ({ docA, docB, sectionsA, sectionsB }) => {
  const titleA = (docA.name || docA.originalName || '').toLowerCase();
  const titleB = (docB.name || docB.originalName || '').toLowerCase();

  // 1. Version indicators in filenames
  const versionRegex = /\b(v\d+(\.\d+)*|ver\d+|draft|final|revised|revision|copy|_v\d+|part\s*\d+)\b/i;
  const hasVersionTokens = versionRegex.test(titleA) || versionRegex.test(titleB);

  const stripVersion = (t) =>
    t
      .replace(/\.(pdf|docx|txt|md|csv)$/i, '')
      .replace(versionRegex, '')
      .replace(/[_\-\s]+/g, ' ')
      .trim();

  const stemA = stripVersion(titleA);
  const stemB = stripVersion(titleB);
  const stemTitleSim = textJaccardSimilarity(stemA, stemB);
  const rawTitleSim = textJaccardSimilarity(titleA, titleB);

  // 2. Document-level Semantic Similarity via Embeddings
  let semanticSim = 0;
  try {
    const textSampleA = (docA.summary || docA.fullText || '').slice(0, 1200);
    const textSampleB = (docB.summary || docB.fullText || '').slice(0, 1200);
    const [embA, embB] = await Promise.all([
      createEmbedding(textSampleA),
      createEmbedding(textSampleB),
    ]);
    if (embA && embB && embA.length === embB.length) {
      semanticSim = Math.max(0, cosineSimilarity(embA, embB));
    }
  } catch (err) {
    console.warn(`[COMPARE] Embeddings unavailable for relationship check: ${err.message}`);
    semanticSim = textJaccardSimilarity((docA.fullText || '').slice(0, 1500), (docB.fullText || '').slice(0, 1500));
  }

  // 3. Section match ratio
  let matchedSectionCount = 0;
  for (const secA of sectionsA) {
    const normA = normalizeHeading(secA.title);
    for (const secB of sectionsB) {
      const normB = normalizeHeading(secB.title);
      if (normA === normB || textJaccardSimilarity(normA, normB) >= 0.5 || areSynonymHeadings(normA, normB)) {
        matchedSectionCount++;
        break;
      }
    }
  }
  const sectionMatchRatio = matchedSectionCount / Math.max(sectionsA.length, sectionsB.length, 1);

  // 4. Structure similarity
  const pageRatio =
    Math.min(docA.pageCount || 1, docB.pageCount || 1) / Math.max(docA.pageCount || 1, docB.pageCount || 1);
  const secCountRatio = Math.min(sectionsA.length, sectionsB.length) / Math.max(sectionsA.length, sectionsB.length);
  const structureSimilarity = pageRatio * 0.4 + secCountRatio * 0.6;

  // 5. Decision Rules
  let mode = 'GENERAL_COMPARISON';
  let reasoning = '';

  const isStrongVersionMatch =
    (hasVersionTokens && stemTitleSim >= 0.55 && semanticSim >= 0.65) ||
    (rawTitleSim >= 0.80 && semanticSim >= 0.75) ||
    (sectionMatchRatio >= 0.70 && semanticSim >= 0.80);

  if (isStrongVersionMatch) {
    mode = 'VERSION_COMPARISON';
    reasoning = `Documents exhibit high identity correspondence (${Math.round(
      stemTitleSim * 100
    )}% title stem similarity, ${Math.round(semanticSim * 100)}% semantic overlap, ${Math.round(
      sectionMatchRatio * 100
    )}% section alignment). Analyzed as revisions/versions of the same work.`;
  } else {
    mode = 'GENERAL_COMPARISON';
    reasoning = `Documents represent distinct publications or educational works (${Math.round(
      semanticSim * 100
    )}% estimated topical semantic similarity). Analyzed as separate works evaluating purpose, scope, unique insights, and shared concepts.`;
  }

  return {
    mode,
    reasoning,
    metrics: {
      titleSimilarity: parseFloat(rawTitleSim.toFixed(2)),
      semanticSimilarity: parseFloat(semanticSim.toFixed(2)),
      sectionMatchRatio: parseFloat(sectionMatchRatio.toFixed(2)),
      structureSimilarity: parseFloat(structureSimilarity.toFixed(2)),
    },
  };
};

// ── High-Recall Semantic Section Matching ──

const matchSections = async (sectionsA, sectionsB, comparisonMode = 'GENERAL_COMPARISON') => {
  const matches = [];
  const matchedBIndices = new Set();

  for (let i = 0; i < sectionsA.length; i++) {
    const secA = sectionsA[i];
    const normA = normalizeHeading(secA.title);
    let bestMatchIdx = -1;
    let highestScore = -1;

    for (let j = 0; j < sectionsB.length; j++) {
      if (matchedBIndices.has(j)) continue;
      const secB = sectionsB[j];
      const normB = normalizeHeading(secB.title);

      // 1. Heading score
      let headingScore = 0;
      if (normA === normB) {
        headingScore = 1.0;
      } else if (areSynonymHeadings(normA, normB)) {
        headingScore = 0.85;
      } else {
        headingScore = textJaccardSimilarity(normA, normB);
      }

      // 2. Content similarity
      const contentScore = textJaccardSimilarity(secA.text.slice(0, 1000), secB.text.slice(0, 1000));

      // 3. Combined score
      const combinedScore = headingScore * 0.65 + contentScore * 0.35;

      if (combinedScore > highestScore) {
        highestScore = combinedScore;
        bestMatchIdx = j;
      }
    }

    const confidence = parseFloat(Math.min(1.0, Math.max(0.1, highestScore)).toFixed(2));

    if (bestMatchIdx !== -1 && highestScore >= 0.30) {
      matchedBIndices.add(bestMatchIdx);
      const matchedB = sectionsB[bestMatchIdx];
      const isRenamed = textJaccardSimilarity(secA.title, matchedB.title) < 0.6 && highestScore >= 0.40;

      let status = 'MATCHED';
      if (comparisonMode === 'GENERAL_COMPARISON') {
        status = highestScore >= 0.55 ? 'MATCHED' : 'PARTIAL_MATCH';
      } else {
        status = isRenamed ? 'POSSIBLE_RENAMED' : 'MATCHED';
      }

      matches.push({
        status,
        confidence,
        sectionA: secA,
        sectionB: matchedB,
      });
    } else {
      // Unmatched in Document B
      const status = comparisonMode === 'GENERAL_COMPARISON' ? 'UNIQUE_TO_A' : 'REMOVED_FROM_B';
      matches.push({
        status,
        confidence: 1.0,
        sectionA: secA,
        sectionB: null,
      });
    }
  }

  // Identify sections in B that had no match in A
  for (let j = 0; j < sectionsB.length; j++) {
    if (!matchedBIndices.has(j)) {
      const status = comparisonMode === 'GENERAL_COMPARISON' ? 'UNIQUE_TO_B' : 'ADDED_IN_B';
      matches.push({
        status,
        confidence: 1.0,
        sectionA: null,
        sectionB: sectionsB[j],
      });
    }
  }

  return matches;
};

// ── Check If Section Concept Exists in Document Text ──

const checkTextContainsTopic = (fullText = '', topic = '') => {
  if (!fullText || !topic) return false;
  const cleanTopic = normalizeHeading(topic);
  if (!cleanTopic) return false;
  const regex = new RegExp(`\\b${cleanTopic}\\b`, 'i');
  return regex.test(fullText);
};

// ── Mode-Specific Pairwise LLM Difference Analysis ──

const buildVersionComparisonPrompt = ({ secA, secB, isRenamed }) => {
  const textA = (secA.text || '').slice(0, 4000);
  const textB = (secB.text || '').slice(0, 4000);

  return `You are a precision document revision comparison engine for DOCUMIND-AI.
Compare the following two versions of the section from Document A (older/base) and Document B (newer/revision).

RULES:
1. Ground your comparison STRICTLY in the provided text.
2. Identify specific numbers, metrics, dates, and requirements that changed.
3. Detect additions, removals, modifications, and contradictions.
4. Do NOT invent missing facts or hallucinate differences.
5. Return a valid JSON object ONLY, with no markdown formatting or commentary.

Section A: "${secA.title}" (Page ${secA.pageStart}):
"""
${textA}
"""

Section B: "${secB.title}" (Page ${secB.pageStart}):
"""
${textB}
"""

JSON Structure required:
{
  "similarities": ["Brief summary of what remains identical or consistent"],
  "differences": [
    {
      "category": "modified" | "numericalChanges" | "dateChanges" | "requirementChanges" | "contradictions" | "added" | "removed",
      "title": "Short descriptive title (e.g. Project Duration Changed)",
      "description": "Clear explanation of what changed from A to B",
      "severity": "info" | "low" | "medium" | "high" | "critical",
      "snippetA": "Quote from Section A",
      "snippetB": "Quote from Section B"
    }
  ]
}`;
};

const buildGeneralComparisonPrompt = ({ secA, secB, docAName, docBName }) => {
  const textA = (secA.text || '').slice(0, 4000);
  const textB = (secB.text || '').slice(0, 4000);

  return `You are DOCUMIND-AI's multi-document comparative analysis engine.
Compare the corresponding sections from two distinct documents:
Document A: "${docAName}"
Document B: "${docBName}"

RULES:
1. Ground your analysis STRICTLY in the provided text.
2. These are SEPARATE works, NOT revisions of each other.
3. DO NOT use the words "removed" or "added" as if Document B is an updated edition of Document A.
4. Instead, compare their respective perspectives, scope, methodology, level of detail, and key concepts.
5. Note any shared concepts under similarities, and differing stances, metrics, or recommendations under differences.
6. Return a valid JSON object ONLY, with no markdown formatting or commentary.

Section from Document A: "${secA.title}" (Page ${secA.pageStart}):
"""
${textA}
"""

Section from Document B: "${secB.title}" (Page ${secB.pageStart}):
"""
${textB}
"""

JSON Structure required:
{
  "similarities": ["Key concepts, objectives, or themes shared between both documents"],
  "differences": [
    {
      "category": "differences" | "scopeComparison" | "conceptComparison" | "numericalChanges",
      "title": "Descriptive title (e.g. Scope of Analysis Difference)",
      "description": "Clear explanation of how Document A and Document B differ in this section",
      "severity": "info" | "low" | "medium" | "high",
      "snippetA": "Quote from Document A",
      "snippetB": "Quote from Document B"
    }
  ]
}`;
};

const analyzeSectionDifference = async ({ secA, secB, docAName, docBName, comparisonMode, isRenamed = false }) => {
  const model = getFastModel();
  const prompt =
    comparisonMode === 'VERSION_COMPARISON'
      ? buildVersionComparisonPrompt({ secA, secB, isRenamed })
      : buildGeneralComparisonPrompt({ secA, secB, docAName, docBName });

  try {
    const response = await callOpenRouter({
      messages: [{ role: 'user', content: prompt }],
      model,
      temperature: 0.1,
      maxTokens: 1600,
      task: 'pairwise_section_comparison',
    });

    const clean = response.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return parsed;
  } catch (err) {
    console.warn(`[COMPARE] Pairwise analysis warning for "${secA?.title}": ${err.message}`);
    return { similarities: [], differences: [] };
  }
};

// ── Table Comparison Helper ──

const compareTables = (tablesA = [], tablesB = [], docAName, docBName, comparisonMode = 'GENERAL_COMPARISON') => {
  const tableFindings = [];

  for (let i = 0; i < tablesA.length; i++) {
    const tblA = tablesA[i];
    const tblB = tablesB[i] || null;

    if (!tblB) {
      tableFindings.push({
        id: `tbl_a_${i}`,
        category: comparisonMode === 'VERSION_COMPARISON' ? 'removed' : 'uniqueToA',
        title:
          comparisonMode === 'VERSION_COMPARISON'
            ? `Table Removed in ${docBName}`
            : `Table Unique to ${docAName}`,
        description: `Table "${tblA.headers?.join(', ') || 'Table'}" on page ${tblA.pageNumber || 1} in ${docAName} has no counterpart in ${docBName}.`,
        severity: 'info',
        sourceA: {
          documentName: docAName,
          page: tblA.pageNumber || 1,
          section: 'Tables',
          snippet: `Headers: ${(tblA.headers || []).join(' | ')}`,
        },
        sourceB: null,
      });
      continue;
    }

    const headersA = (tblA.headers || []).join(' | ');
    const headersB = (tblB.headers || []).join(' | ');

    if (headersA !== headersB) {
      tableFindings.push({
        id: `tbl_diff_${i}`,
        category: 'tableChanges',
        title: `Table Column Differences`,
        description: `Table structures differ: [${headersA}] in ${docAName} vs [${headersB}] in ${docBName}.`,
        severity: 'medium',
        sourceA: {
          documentName: docAName,
          page: tblA.pageNumber || 1,
          section: 'Tables',
          snippet: headersA,
        },
        sourceB: {
          documentName: docBName,
          page: tblB.pageNumber || 1,
          section: 'Tables',
          snippet: headersB,
        },
      });
    }
  }

  if (tablesB.length > tablesA.length) {
    for (let j = tablesA.length; j < tablesB.length; j++) {
      const tblB = tablesB[j];
      tableFindings.push({
        id: `tbl_b_${j}`,
        category: comparisonMode === 'VERSION_COMPARISON' ? 'added' : 'uniqueToB',
        title:
          comparisonMode === 'VERSION_COMPARISON'
            ? `New Table Added in ${docBName}`
            : `Table Unique to ${docBName}`,
        description: `Table "${tblB.headers?.join(', ') || 'Table'}" is present on page ${tblB.pageNumber || 1} in ${docBName}.`,
        severity: 'info',
        sourceA: null,
        sourceB: {
          documentName: docBName,
          page: tblB.pageNumber || 1,
          section: 'Tables',
          snippet: `Headers: ${(tblB.headers || []).join(' | ')}`,
        },
      });
    }
  }

  return tableFindings;
};

// ── Mode-Specific Executive Synthesis Generator ──

const buildGeneralExecutiveReportPrompt = ({ docAName, docBName, findingsSummary, similarityScore, modeReasoning }) => {
  return `You are DOCUMIND-AI's executive document intelligence synthesis engine.
Synthesize the structured comparison findings between two distinct documents:
Document A: "${docAName}"
Document B: "${docBName}"

Relationship Context: ${modeReasoning}
Estimated Semantic Similarity: ${similarityScore}%

Structured Findings:
${findingsSummary}

CRITICAL RULES:
1. These documents are separate works, NOT revisions.
2. DO NOT state that either document "removed" or "added" sections from the other.
3. Absence of a topic in Document B means it is unique to Document A or outside Document B's scope—NOT removed.
4. Avoid excessive markdown symbols (no #, ##, or ### headings; use clean capitalized section titles).
5. Avoid decorative emojis.
6. Write concise, direct paragraphs followed by clear numbered points.

MANDATORY STRUCTURE:

Comparison Overview
[State the relationship between Document A and Document B and overall scope]

Purpose of Document A
[Concise summary of the objective, target audience, and function of Document A]

Purpose of Document B
[Concise summary of the objective, target audience, and function of Document B]

Key Similarities
[What concepts, principles, structural elements, or themes do both documents share?]

Key Differences
[How do the documents differ in format, depth, formality, scope, or execution?]

Structure Comparison
[Compare length, organizational layout, and section breakdown]

Topic / Scope Comparison
[Compare domains, subjects covered, and technical vs practical focus]

Unique Information in Document A
[Specific topics, analyses, or data covered exclusively in Document A]

Unique Information in Document B
[Specific topics, guidelines, or formats covered exclusively in Document B]

Common Concepts
[Shared terminology, foundational definitions, or mutual standards]

Important Numerical or Factual Differences
[Any contrasting metrics, dates, or specifications, if present]

Final Assessment
[Executive takeaway summarizing how each document should be utilized]`;
};

const buildVersionExecutiveReportPrompt = ({ docAName, docBName, findingsSummary, similarityScore, modeReasoning }) => {
  return `You are DOCUMIND-AI's executive revision intelligence synthesis engine.
Synthesize the structured findings from comparing two versions of a document:
Base Version (A): "${docAName}"
Revised Version (B): "${docBName}"

Relationship Context: ${modeReasoning}
Estimated Semantic Similarity: ${similarityScore}%

Structured Findings:
${findingsSummary}

STYLE & FORMATTING RULES:
1. Focus on what changed, was added, was removed, or was modified from Version A to Version B.
2. Avoid excessive markdown symbols (no #, ##, or ### headings; use clean capitalized section titles).
3. Avoid decorative emojis.
4. Write concise, direct paragraphs followed by clear numbered points.

MANDATORY STRUCTURE:

Comparison Overview
[Summary of the version transition and magnitude of modifications]

Key Modifications & Highlights
[The most important structural and textual changes made in Version B]

Added Information
[New sections, specifications, or clauses introduced in Version B]

Removed Information
[Content, clauses, or sections omitted from Version A]

Important Numerical and Date Changes
[Specific metric, deadline, or budgetary adjustments]

Requirement Changes & Contradictions
[Direct conflicts or changed obligations between versions]

Final Assessment
[Risk assessment, migration impact, and recommended action]`;
};

const generateFinalSynthesis = async ({
  docAName,
  docBName,
  findings,
  similarityScore,
  comparisonMode,
  modeReasoning,
}) => {
  const model = getMainModel();

  const findingsSummary = findings
    .slice(0, 30)
    .map((f, idx) => `${idx + 1}. [${f.category.toUpperCase()}] ${f.title}: ${f.description}`)
    .join('\n');

  const prompt =
    comparisonMode === 'VERSION_COMPARISON'
      ? buildVersionExecutiveReportPrompt({ docAName, docBName, findingsSummary, similarityScore, modeReasoning })
      : buildGeneralExecutiveReportPrompt({ docAName, docBName, findingsSummary, similarityScore, modeReasoning });

  try {
    const result = await callOpenRouter({
      messages: [{ role: 'user', content: prompt }],
      model,
      temperature: 0.15,
      maxTokens: 2500,
      task: 'final_comparison_synthesis',
    });
    return formatCleanPlainText(result.text);
  } catch (err) {
    console.warn(`[COMPARE] Final synthesis fallback: ${err.message}`);
    return `Comparison Overview\n\nCompared "${docAName}" with "${docBName}". Mode: ${comparisonMode}. Found ${findings.length} findings with an estimated semantic similarity of ${similarityScore}%.`;
  }
};

// ── Code-Calculated Estimated Semantic Similarity ──

const calculateEstimatedSemanticSimilarity = ({
  semanticSim = 0.5,
  matches = [],
  comparisonMode = 'GENERAL_COMPARISON',
  sectionsA = [],
  sectionsB = [],
}) => {
  const matchedSections = matches.filter((m) => m.status === 'MATCHED' || m.status === 'PARTIAL_MATCH');
  const totalSec = Math.max(sectionsA.length, sectionsB.length, 1);
  const sectionCoverage = matchedSections.length / totalSec;

  const matchedConfidenceSum = matchedSections.reduce((acc, m) => acc + (m.confidence || 0.5), 0);
  const avgMatchedConf = matchedSections.length > 0 ? matchedConfidenceSum / matchedSections.length : 0.4;

  let score = 0;
  if (comparisonMode === 'VERSION_COMPARISON') {
    score = semanticSim * 0.45 + avgMatchedConf * 0.35 + sectionCoverage * 0.2;
  } else {
    score = semanticSim * 0.5 + avgMatchedConf * 0.3 + sectionCoverage * 0.2;
  }

  return Math.max(5, Math.min(100, Math.round(score * 100)));
};

// ── Main Compare Documents Pipeline ──

const compareDocuments = async ({ documentAId, documentBId, userId, projectId = null }) => {
  if (!documentAId || !documentBId) {
    throw new Error('Both Document A and Document B IDs are required.');
  }

  if (String(documentAId) === String(documentBId)) {
    throw new Error('Please select two distinct documents to compare.');
  }

  const docFilterA = { _id: documentAId, owner: userId };
  const docFilterB = { _id: documentBId, owner: userId };

  if (projectId) {
    docFilterA.projectId = projectId;
    docFilterB.projectId = projectId;
  }

  const [docA, docB] = await Promise.all([Document.findOne(docFilterA), Document.findOne(docFilterB)]);

  if (!docA) throw new Error(`Document A (${documentAId}) not found or unauthorized.`);
  if (!docB) throw new Error(`Document B (${documentBId}) not found or unauthorized.`);

  const docAName = docA.name || docA.originalName || 'Document A';
  const docBName = docB.name || docB.originalName || 'Document B';

  console.log(`[COMPARE] start docA="${docAName}" (${docA._id}) docB="${docBName}" (${docB._id}) user=${userId}`);

  // Create persistent comparison record in QUEUED / PROCESSING state
  let comparisonRecord = await DocumentComparison.create({
    user: userId,
    documentA: docA._id,
    documentB: docB._id,
    documentAName: docAName,
    documentBName: docBName,
    projectId,
    status: 'PROCESSING',
    processingStep: 'Extracting normalized sections',
  });

  try {
    // 1. Extract Normalized Sections & Boundaries
    const sectionsA = extractNormalizedSections(docA);
    const sectionsB = extractNormalizedSections(docB);

    if (sectionsA.length === 0 || sectionsB.length === 0) {
      throw new Error('One or both documents do not contain sufficient validated text for comparison.');
    }

    // 2. Classify Document Relationship Mode
    await DocumentComparison.findByIdAndUpdate(comparisonRecord._id, {
      processingStep: 'Classifying document relationship mode',
      'stats.sectionsCountA': sectionsA.length,
      'stats.sectionsCountB': sectionsB.length,
    });

    const { mode, reasoning, metrics } = await classifyDocumentRelationship({
      docA,
      docB,
      sectionsA,
      sectionsB,
    });

    console.log(`[COMPARE] relationship_classified mode=${mode} titleSim=${metrics.titleSimilarity} semanticSim=${metrics.semanticSimilarity}`);

    // 3. Match Sections with Mode-Aware Statuses
    await DocumentComparison.findByIdAndUpdate(comparisonRecord._id, {
      processingStep: `Aligning sections under ${mode}`,
      comparisonMode: mode,
      modeReasoning: reasoning,
      metrics,
    });

    const matches = await matchSections(sectionsA, sectionsB, mode);

    const sectionsMatchedRecords = matches.map((m) => ({
      sectionA: m.sectionA?.title || 'None',
      sectionB: m.sectionB?.title || 'None',
      similarity: m.confidence,
      status: m.status,
      pageA: m.sectionA?.pageStart || 1,
      pageB: m.sectionB?.pageStart || 1,
    }));

    // 4. Difference Analysis
    await DocumentComparison.findByIdAndUpdate(comparisonRecord._id, {
      processingStep: 'Conducting precision difference analysis',
      sectionsMatched: sectionsMatchedRecords,
    });

    const allFindings = [];
    let findingCounter = 1;

    for (const match of matches) {
      if (match.status === 'MATCHED' || match.status === 'PARTIAL_MATCH' || match.status === 'POSSIBLE_RENAMED') {
        const diff = await analyzeSectionDifference({
          secA: match.sectionA,
          secB: match.sectionB,
          docAName,
          docBName,
          comparisonMode: mode,
          isRenamed: match.status === 'POSSIBLE_RENAMED',
        });

        // Add similarities
        if (diff.similarities && diff.similarities.length > 0) {
          allFindings.push({
            id: `find_${findingCounter++}`,
            category: 'similarities',
            title: `Shared Concept: ${match.sectionA.title}`,
            description: diff.similarities.join('. '),
            severity: 'info',
            sourceA: {
              documentId: docA._id,
              documentName: docAName,
              page: match.sectionA.pageStart,
              section: match.sectionA.title,
              snippet: match.sectionA.text.slice(0, 250),
            },
            sourceB: {
              documentId: docB._id,
              documentName: docBName,
              page: match.sectionB.pageStart,
              section: match.sectionB.title,
              snippet: match.sectionB.text.slice(0, 250),
            },
          });
        }

        // Add differences
        if (diff.differences && Array.isArray(diff.differences)) {
          for (const item of diff.differences) {
            allFindings.push({
              id: `find_${findingCounter++}`,
              category: item.category || 'differences',
              title: item.title || `Difference in ${match.sectionB.title}`,
              description: item.description || '',
              severity: item.severity || 'medium',
              sourceA: {
                documentId: docA._id,
                documentName: docAName,
                page: match.sectionA.pageStart,
                section: match.sectionA.title,
                snippet: item.snippetA || match.sectionA.text.slice(0, 180),
              },
              sourceB: {
                documentId: docB._id,
                documentName: docBName,
                page: match.sectionB.pageStart,
                section: match.sectionB.title,
                snippet: item.snippetB || match.sectionB.text.slice(0, 180),
              },
            });
          }
        }
      } else if (match.status === 'UNIQUE_TO_A' || match.status === 'REMOVED_FROM_B') {
        const isGeneral = mode === 'GENERAL_COMPARISON';

        // Critical safety check: does Document B actually contain this topic?
        const topicInB = checkTextContainsTopic(docB.fullText, match.sectionA.title);

        if (isGeneral) {
          allFindings.push({
            id: `find_${findingCounter++}`,
            category: 'uniqueToA',
            title: `Unique to ${docAName}: ${match.sectionA.title}`,
            description: topicInB
              ? `"${match.sectionA.title}" is emphasized as a distinct section in ${docAName} (page ${match.sectionA.pageStart}), whereas ${docBName} touches on it in general text without a dedicated corresponding section.`
              : `"${match.sectionA.title}" (page ${match.sectionA.pageStart} in ${docAName}) covers specialized scope not addressed in ${docBName}.`,
            severity: 'info',
            sourceA: {
              documentId: docA._id,
              documentName: docAName,
              page: match.sectionA.pageStart,
              section: match.sectionA.title,
              snippet: match.sectionA.text.slice(0, 250),
            },
            sourceB: null,
          });
        } else {
          allFindings.push({
            id: `find_${findingCounter++}`,
            category: 'removed',
            title: `Section Removed in ${docBName}: ${match.sectionA.title}`,
            description: `The section "${match.sectionA.title}" found on page ${match.sectionA.pageStart} of ${docAName} has been omitted from ${docBName}.`,
            severity: 'medium',
            sourceA: {
              documentId: docA._id,
              documentName: docAName,
              page: match.sectionA.pageStart,
              section: match.sectionA.title,
              snippet: match.sectionA.text.slice(0, 250),
            },
            sourceB: null,
          });
        }
      } else if (match.status === 'UNIQUE_TO_B' || match.status === 'ADDED_IN_B') {
        const isGeneral = mode === 'GENERAL_COMPARISON';

        if (isGeneral) {
          allFindings.push({
            id: `find_${findingCounter++}`,
            category: 'uniqueToB',
            title: `Unique to ${docBName}: ${match.sectionB.title}`,
            description: `"${match.sectionB.title}" (page ${match.sectionB.pageStart} in ${docBName}) provides specialized content or formatting distinct to ${docBName}.`,
            severity: 'info',
            sourceA: null,
            sourceB: {
              documentId: docB._id,
              documentName: docBName,
              page: match.sectionB.pageStart,
              section: match.sectionB.title,
              snippet: match.sectionB.text.slice(0, 250),
            },
          });
        } else {
          allFindings.push({
            id: `find_${findingCounter++}`,
            category: 'added',
            title: `New Section Added in ${docBName}: ${match.sectionB.title}`,
            description: `A new section "${match.sectionB.title}" has been introduced on page ${match.sectionB.pageStart} in ${docBName}.`,
            severity: 'medium',
            sourceA: null,
            sourceB: {
              documentId: docB._id,
              documentName: docBName,
              page: match.sectionB.pageStart,
              section: match.sectionB.title,
              snippet: match.sectionB.text.slice(0, 250),
            },
          });
        }
      }
    }

    // 5. Compare Tables
    const tableFindings = compareTables(docA.tables || [], docB.tables || [], docAName, docBName, mode);
    allFindings.push(...tableFindings);

    // 6. Compute Legitimate Estimated Semantic Similarity Score
    const finalScore = calculateEstimatedSemanticSimilarity({
      semanticSim: metrics.semanticSimilarity,
      matches,
      comparisonMode: mode,
      sectionsA,
      sectionsB,
    });

    // 7. Generate Executive Synthesis Report
    await DocumentComparison.findByIdAndUpdate(comparisonRecord._id, {
      processingStep: 'Synthesizing executive report',
      similarityScore: finalScore,
    });

    const summary = await generateFinalSynthesis({
      docAName,
      docBName,
      findings: allFindings,
      similarityScore: finalScore,
      comparisonMode: mode,
      modeReasoning: reasoning,
    });

    // 8. Compute Detailed Stats Breakdown
    const stats = {
      totalSimilarities: allFindings.filter((f) => f.category === 'similarities').length,
      totalDifferences: allFindings.filter((f) => f.category === 'differences' || f.category === 'modified').length,
      totalAdded: allFindings.filter((f) => f.category === 'added').length,
      totalRemoved: allFindings.filter((f) => f.category === 'removed').length,
      totalModified: allFindings.filter((f) => f.category === 'modified').length,
      totalUniqueToA: allFindings.filter((f) => f.category === 'uniqueToA').length,
      totalUniqueToB: allFindings.filter((f) => f.category === 'uniqueToB').length,
      totalNumericChanges: allFindings.filter((f) => f.category === 'numericalChanges').length,
      totalDateChanges: allFindings.filter((f) => f.category === 'dateChanges').length,
      totalRequirementChanges: allFindings.filter((f) => f.category === 'requirementChanges').length,
      totalTableChanges: allFindings.filter((f) => f.category === 'tableChanges').length,
      totalContradictions: allFindings.filter((f) => f.category === 'contradictions').length,
      sectionsCountA: sectionsA.length,
      sectionsCountB: sectionsB.length,
    };

    // 9. Persist Completed Record
    comparisonRecord = await DocumentComparison.findByIdAndUpdate(
      comparisonRecord._id,
      {
        status: 'COMPLETED',
        processingStep: 'Complete',
        comparisonMode: mode,
        modeReasoning: reasoning,
        metrics,
        similarityScore: finalScore,
        summary,
        findings: allFindings,
        stats,
      },
      { new: true }
    );

    console.log(
      `[COMPARE] comparison_completed id=${comparisonRecord._id} mode=${mode} similarity=${finalScore}% total_findings=${allFindings.length}`
    );
    return comparisonRecord;
  } catch (err) {
    console.error(`[COMPARE ERROR] ${err.message}`);
    await DocumentComparison.findByIdAndUpdate(comparisonRecord._id, {
      status: 'FAILED',
      processingStep: `Failed: ${err.message.slice(0, 100)}`,
      errorMessage: err.message,
    });
    throw err;
  }
};

module.exports = {
  compareDocuments,
  extractNormalizedSections,
  classifyDocumentRelationship,
  matchSections,
  calculateEstimatedSemanticSimilarity,
  normalizeHeading,
  areSynonymHeadings,
};
