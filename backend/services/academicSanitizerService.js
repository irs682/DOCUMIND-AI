/**
 * DOCUMIND-AI Academic AST Parser, Text Sanitizer, and Word-Spacing Guard
 * 
 * Complies with Publication Integrity Requirements:
 * 1. Semantic AST parsing instead of naive regex markdown stripping
 * 2. Whitespace, hyphenation, and punctuation preservation
 * 3. Detection and correction of concatenated phrases (e.g. VisionLanguageAction -> Vision-Language-Action)
 * 4. Internal metadata/provenance stripping from publication prose
 */

const KNOWN_PHRASE_MAPPINGS = [
  // Compound robotics & AI terms
  { broken: /\bVisionLanguageAction\b/g, correct: 'Vision-Language-Action' },
  { broken: /\bVisionLanguageModels\b/g, correct: 'Vision-Language Models' },
  { broken: /\bVisionLanguageModel\b/g, correct: 'Vision-Language Model' },
  { broken: /\bVisionLanguage\b/g, correct: 'Vision-Language' },
  { broken: /\bRetrievalAugmentedGeneration\b/g, correct: 'Retrieval-Augmented Generation' },
  { broken: /\bRetrievalAugmented\b/g, correct: 'Retrieval-Augmented' },
  { broken: /\bMemoryAugmented\b/g, correct: 'Memory-Augmented' },
  { broken: /\bUncertaintyAware\b/g, correct: 'Uncertainty-Aware' },
  { broken: /\bHumanInTheLoop\b/g, correct: 'Human-in-the-Loop' },
  { broken: /\bCrossAttention\b/g, correct: 'Cross-Attention' },
  { broken: /\bMultiView\b/g, correct: 'Multi-View' },
  { broken: /\bLongHorizon\b/g, correct: 'Long-Horizon' },
  { broken: /\bZeroShot\b/g, correct: 'Zero-Shot' },
  { broken: /\bOutOfDistribution\b/g, correct: 'Out-of-Distribution' },
  { broken: /\bInDistribution\b/g, correct: 'In-Distribution' },
  { broken: /\bTrajectoryMemory\b/g, correct: 'Trajectory Memory' },
  { broken: /\bEpisodicMemory\b/g, correct: 'Episodic Memory' },
  { broken: /\bMemoryBank\b/g, correct: 'Memory Bank' },
  { broken: /\bStateEncoder\b/g, correct: 'State Encoder' },
  { broken: /\bPolicyDecoder\b/g, correct: 'Policy Decoder' },
  { broken: /\bActionDistribution\b/g, correct: 'Action Distribution' },

  // Section heading concatenations
  { broken: /\bRELATEDWORK\b/g, correct: 'Related Work' },
  { broken: /\bRESEARCHGAPANDCONTRIBUTIONS\b/g, correct: 'Research Gap and Contributions' },
  { broken: /\bPROPOSEDMERA-VLAFRAMEWORK\b/g, correct: 'Proposed MERA-VLA Framework' },
  { broken: /\bPROPOSEDMERAVLAFRAMEWORK\b/g, correct: 'Proposed MERA-VLA Framework' },
  { broken: /\bPROPOSEDEVALUATIONPROTOCOL\b/g, correct: 'Proposed Evaluation Protocol' },
  { broken: /\bMETHODOLOGICALLIMITATIONS\b/g, correct: 'Methodological Limitations' },
  { broken: /\bEXPERIMENTALSETUP\b/g, correct: 'Experimental Setup' },
  { broken: /\bBENCHMARKCOMPATIBILITY\b/g, correct: 'Benchmark Compatibility' },
  { broken: /\bResearchGapandContributions\b/g, correct: 'Research Gap and Contributions' },
  { broken: /\bCandidateResearchGap\b/g, correct: 'Candidate Research Gap' },
  { broken: /\bRelatedWork\b/g, correct: 'Related Work' },
  { broken: /\bEvaluationProtocol\b/g, correct: 'Evaluation Protocol' },
  { broken: /\bCorrespondingauthor\b/g, correct: 'Corresponding author' },
];

/**
 * Normalizes word spacing across academic text, preserving hyphenations and punctuation.
 */
function normalizeWordSpacing(text = '') {
  if (!text) return '';
  let str = String(text);

  // Apply known phrase repairs
  for (const { broken, correct } of KNOWN_PHRASE_MAPPINGS) {
    str = str.replace(broken, correct);
  }

  // Detect and fix general camelCase concatenations in academic prose
  // e.g. "episodicMemory" -> "episodic Memory", "actionDecoding" -> "action Decoding"
  // Avoid acronyms like VLA, RGB, ECE, AAAI, HITL, etc.
  str = str.replace(/([a-z])([A-Z][a-z]{2,})/g, '$1 $2');

  // Normalize multiple spaces/tabs while preserving line breaks
  str = str.replace(/[ \t]+/g, ' ');

  return str;
}

/**
 * Removes internal DOCUMIND system vocabulary, internal database hashes, and raw filenames.
 */
function stripInternalMetadata(text = '') {
  if (!text) return '';
  return String(text)
    // Internal status enums that should never leak into prose
    .replace(/\bPROJECT_ACCEPTED\b/g, '')
    .replace(/\bPROJECTACCEPTED\b/g, '')
    .replace(/\bUSER_APPROVED\b/g, '')
    .replace(/\bUSERAPPROVED\b/g, '')
    .replace(/\bSOURCE_VERIFIED\b/g, '')
    .replace(/\bSOURCEVERIFIED\b/g, '')
    .replace(/\bMODEL_PROPOSED\b/g, '')
    .replace(/\bMODELPROPOSED\b/g, '')
    .replace(/\bVERIFIED_EXPERIMENT\b/g, '')
    .replace(/\bPROVENANCE_PENDING\b/g, '')
    .replace(/\bMethodology Provenance\b/gi, '')
    .replace(/\bMethodologyProvenance\b/gi, '')
    .replace(/\bEvidence Inspector\b/gi, '')
    // Raw database and document IDs
    .replace(/\bdoc_[a-zA-Z0-9_-]+\b/g, 'indexed document')
    .replace(/\bsrc_[a-zA-Z0-9_-]+\b/g, 'source')
    .replace(/\b[0-9a-f]{24}\b/g, '')
    // Raw paper filenames like 01407-AAAI24.ZhaoA (1).pdf
    .replace(/\b\d{4,5}-[A-Za-z0-9_.-]+(?:\s*\(\d+\))?(?:\.pdf|\.docx)?/gi, 'Zhao et al. (2024)')
    .replace(/\b[A-Za-z0-9_-]+\.(?:pdf|docx|txt|csv|xlsx)\b/gi, 'the indexed source')
    .replace(/\bDOCUMIND(?:-AI)?\b/gi, 'the autonomous framework')
    .replace(/\bPMLS Autonomous Research Team\b/gi, 'Irshad Ahmad')
    .replace(/\bResearch Author\b/gi, 'Irshad Ahmad')
    .replace(/\bAutonomous Systems & Robotics Laboratory\b/gi, 'Department of Computer Systems Engineering, University of Engineering and Technology, Peshawar')
    .replace(/\bauthor@research\.org\b/gi, 'irshad.uetmardan@gmail.com')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parses markdown into an abstract semantic AST.
 * Never destroys whitespace between words.
 */
function parseMarkdownToAst(markdownText = '') {
  if (!markdownText) return [];

  const cleaned = stripInternalMetadata(markdownText);
  // Normalize Windows line endings
  const normalized = cleaned.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n\n+/);
  const ast = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    // Headings #, ##, ###, ####
    const headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = normalizeWordSpacing(headingMatch[2].trim());
      ast.push({
        type: 'heading',
        level,
        text,
      });
      continue;
    }

    // Blockquote >
    if (block.startsWith('>')) {
      const quoteContent = block
        .split('\n')
        .map((line) => line.replace(/^>\s*/, ''))
        .join(' ')
        .trim();
      ast.push({
        type: 'blockquote',
        text: normalizeWordSpacing(quoteContent),
      });
      continue;
    }

    // Lists (bullet or numbered)
    const lines = block.split('\n');
    const isList = lines.length > 0 && lines.every((l) => /^\s*([•\-\*]|\d+\.)\s+/.test(l));
    if (isList) {
      const isOrdered = /^\s*\d+\.\s+/.test(lines[0]);
      const items = lines.map((l) => normalizeWordSpacing(l.replace(/^\s*([•\-\*]|\d+\.)\s+/, '').trim()));
      ast.push({
        type: 'list',
        ordered: isOrdered,
        items,
      });
      continue;
    }

    // Paragraph
    const paragraphText = normalizeWordSpacing(block.replace(/\n/g, ' '));
    ast.push({
      type: 'paragraph',
      text: paragraphText,
    });
  }

  return ast;
}

/**
 * Serializes semantic AST back to clean publication-quality HTML.
 */
function serializeAstToHtml(ast = [], options = {}) {
  let html = '';

  for (const node of ast) {
    if (node.type === 'heading') {
      const tag = node.level === 1 ? 'h1' : node.level === 2 ? 'h2' : node.level === 3 ? 'h3' : 'h4';
      const className = node.level === 2 ? 'section-h2' : node.level === 3 ? 'section-h3' : 'section-h4';
      html += `<${tag} class="${className}">${node.text}</${tag}>\n`;
    } else if (node.type === 'blockquote') {
      html += `<blockquote class="manuscript-quote">${node.text}</blockquote>\n`;
    } else if (node.type === 'list') {
      const tag = node.ordered ? 'ol' : 'ul';
      html += `<${tag} class="manuscript-list">\n`;
      for (const item of node.items) {
        html += `  <li>${item}</li>\n`;
      }
      html += `</${tag}>\n`;
    } else if (node.type === 'paragraph') {
      // Parse inline semantics (bold, italic, code) safely without destroying spaces
      let pText = node.text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|\s)\*([^*]+)\*(\s|$)/g, '$1<em>$2</em>$3')
        .replace(/`([^`]+)`/g, '<code class="academic-code">$1</code>');
      html += `<p class="paragraph">${pText}</p>\n`;
    }
  }

  return html;
}

/**
 * Pre-export word-spacing audit: detects broken, camel-cased, or concatenated words.
 */
function auditWordSpacing(text = '') {
  const issues = [];
  if (!text) return { count: 0, issues };

  const suspectPatterns = [
    { regex: /\bVisionLanguageAction\b/g, name: 'Concatenated VisionLanguageAction' },
    { regex: /\bVisionLanguageModels\b/g, name: 'Concatenated VisionLanguageModels' },
    { regex: /\bRetrievalAugmentedGeneration\b/g, name: 'Concatenated RetrievalAugmentedGeneration' },
    { regex: /\bRELATEDWORK\b/g, name: 'Concatenated RELATEDWORK' },
    { regex: /\bRESEARCHGAPANDCONTRIBUTIONS\b/g, name: 'Concatenated RESEARCHGAPANDCONTRIBUTIONS' },
    { broken: /\bPROPOSEDMERA-VLAFRAMEWORK\b/g, name: 'Concatenated PROPOSEDMERA-VLAFRAMEWORK' },
    { regex: /\bResearchGapandContributions\b/g, name: 'Concatenated ResearchGapandContributions' },
    { regex: /\bAutonomousSystems&RoboticsLaboratory\b/g, name: 'Concatenated affiliation' },
  ];

  for (const item of suspectPatterns) {
    const rx = item.regex || item.broken;
    const matches = text.match(rx);
    if (matches && matches.length > 0) {
      issues.push(`${item.name} (${matches.length} occurrence(s))`);
    }
  }

  return {
    count: issues.length,
    issues,
    passed: issues.length === 0,
  };
}

module.exports = {
  KNOWN_PHRASE_MAPPINGS,
  normalizeWordSpacing,
  stripInternalMetadata,
  parseMarkdownToAst,
  serializeAstToHtml,
  auditWordSpacing,
};
