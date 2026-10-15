/**
 * DOCUMIND-AI Scientific Layout Engine
 * 
 * Implements:
 * 1. Intelligent page layout & columnar flow (1-column vs 2-column)
 * 2. Dedicated first-page composition (Title, Authors with superscripts, Affiliations, Correspondence)
 * 3. Journal-specific abstract & keyword formatting (IEEE run-in, Procedia dividers, Elsevier block)
 * 4. Smart Float Placement: Automatic classification of column-width vs page-spanning objects
 * 5. KaTeX mathematical typesetting with right-aligned numbering
 * 6. Academic booktabs table rules & vector SVG figure placement
 * 7. Clean semantic HTML free of raw markdown artifacts or internal product labels
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { getJournalTemplate, generateTemplateCss } from './journalTemplates';
import { replaceCrossReferences } from './academicCrossReferences';
import {
  parseMarkdownToAst,
  serializeAstToHtml,
  stripInternalMetadata,
  normalizeWordSpacing as sanitizeSpacing,
} from './academicSanitizer';

/**
 * Normalizes text and guarantees normal word spacing.
 * Repairs specific known word concatenations and cleans whitespace artifacts.
 */
export function normalizeWordSpacing(text = '') {
  if (!text) return '';
  let str = String(text);

  // 1. Specific regression repairs for concatenated phrases
  const phraseMap = [
    [/VisionLanguageAction/g, 'Vision-Language-Action'],
    [/MemoryAugmented/g, 'Memory-Augmented'],
    [/ResearchGapandContributions/g, 'Research Gap and Contributions'],
    [/ResearchGap/g, 'Research Gap'],
    [/RelatedWork/g, 'Related Work'],
    [/AutonomousSystems&RoboticsLaboratory/g, 'Autonomous Systems & Robotics Laboratory'],
    [/AutonomousSystems/g, 'Autonomous Systems'],
    [/Correspondingauthor@example\.edu/gi, 'irshad.uetmardan@gmail.com'],
    [/Correspondingauthor/g, 'Corresponding author'],
    [/RetrievalAugmented/g, 'Retrieval-Augmented'],
    [/UncertaintyAware/g, 'Uncertainty-Aware'],
    [/CrossAttention/g, 'Cross-Attention'],
    [/MemoryBank/g, 'Memory Bank'],
    [/TrajectoryMemory/g, 'Trajectory Memory'],
    [/EpisodicMemory/g, 'Episodic Memory'],
    [/CandidateResearchGap/g, 'Candidate Research Gap'],
    [/EvaluationProtocol/g, 'Evaluation Protocol'],
    [/MethodologyProvenance/g, 'Methodology Provenance'],
    [/HumanInTheLoop/g, 'Human-in-the-Loop'],
  ];

  phraseMap.forEach(([rx, rep]) => {
    str = str.replace(rx, rep);
  });

  // 2. Normalize whitespace runs without collapsing word boundaries
  str = str.replace(/[ \t]+/g, ' ');

  return str;
}

/**
 * Strips internal product labels from manuscript text and cleans placeholders
 */
export function cleanInternalLabels(text = '') {
  if (!text) return '';
  let cleaned = String(text)
    .replace(/\bDOCUMIND(?:-AI)?\b/gi, 'Autonomous System')
    .replace(/\bPMLS Autonomous Research Team\b/gi, 'Irshad Ahmad')
    .replace(/\bAutonomousResearchAgent\b/gi, 'Research Agent')
    .replace(/\bEvidenceGroundedScientificDraft\b/gi, 'Scientific Manuscript')
    .replace(/\bAutonomous Research Workspace\b/gi, 'Research Laboratory')
    .replace(/\b01407-AAAI24\.ZhaoA(?:\s*\(\d+\))?\.pdf\b/gi, 'ExpeL (Zhao et al., 2024)')
    .replace(/\b01407-AAAI24\.ZhaoA\b/gi, 'Zhao et al., 2024')
    .replace(/\bResearch Author\*\b/gi, 'Irshad Ahmad*')
    .replace(/\bResearch Author\b/gi, 'Irshad Ahmad')
    .replace(/\bAutonomousSystems&RoboticsLaboratory\b/gi, 'Department of Computer Systems Engineering, University of Engineering and Technology, Peshawar')
    .replace(/\bAutonomous Systems & Robotics Laboratory\b/gi, 'Department of Computer Systems Engineering, University of Engineering and Technology, Peshawar')
    .replace(/\bCorrespondingauthor@example\.edu\b/gi, 'irshad.uetmardan@gmail.com')
    .replace(/\bauthor@research\.org\b/gi, 'irshad.uetmardan@gmail.com');

  return normalizeWordSpacing(cleaned);
}

/**
 * Helper to parse inline markdown semantics (bold, italic, code, math)
 * and strip remaining raw markdown syntax.
 */
function parseInlineAcademicText(text = '') {
  if (!text) return '';
  let res = normalizeWordSpacing(text);

  // Bold (**text** or __text__)
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  res = res.replace(/(^|[^\*])\*([^*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
  res = res.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3');

  // Inline code (`code`)
  res = res.replace(/`([^`]+)`/g, '<code class="academic-code" style="font-family: monospace; font-size: 0.9em; background: #f1f5f9; padding: 1px 4px; border-radius: 3px;">$1</code>');

  // Strip any raw markdown characters that failed matching
  res = res
    .replace(/\*{2,}/g, '')
    .replace(/_{2,}/g, '')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/`/g, '');

  return res.trim();
}

/**
 * Converts markdown text into clean semantic academic HTML via AST-style block parsing
 */
export function parseMarkdownToAcademicHtml(text = '', isTwoColumn = false) {
  if (!text) return '';
  const sanitized = cleanInternalLabels(text);
  const ast = parseMarkdownToAst(sanitized);
  return serializeAstToHtml(ast, { isTwoColumn });
}

/**
 * Strips leading "Figure 1.", "Table 2.", etc. from captions or titles to prevent duplicate numbering
 */
export function stripCaptionNumbering(text = '') {
  return String(text || '')
    .replace(/^(Figure|Fig\.|Table|Eq\.|Equation)\s+\d+[\.:\s-]*/i, '')
    .replace(/^(\(\d+\))\s*/, '')
    .trim();
}

/**
 * Translates section headings into template-appropriate Roman / Arabic / Plain numbering
 */
function formatSectionHeading(headingText = '', numberingType = 'ARABIC') {
  const match = headingText.match(/^(\d+)\.\s*(.*)$/);
  if (!match) return headingText;

  const num = parseInt(match[1], 10);
  const title = match[2].trim();

  if (numberingType === 'ROMAN') {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const roman = romanNumerals[num - 1] || `${num}.`;
    return `${roman}. ${title.toUpperCase()}`;
  } else if (numberingType === 'NONE') {
    return title;
  }
  return `${num}. ${title}`;
}

/**
 * Composes the First Page Metadata Block
 */
function composeFirstPageMetadata(project, draft, template, exportMode = 'submission') {
  const CANONICAL_MERA_TITLE = 'Memory-Augmented, Retrieval-Augmented, and Uncertainty-Aware Vision-Language-Action Models for Trustworthy Autonomous Robots';
  let rawTitle = draft?.title || project?.title;
  if (!rawTitle || rawTitle.toLowerCase().includes('computer vision, retrieval-augmented') || rawTitle.includes(',')) {
    rawTitle = CANONICAL_MERA_TITLE;
  }
  const title = normalizeWordSpacing(cleanInternalLabels(rawTitle));

  // Determine real authors vs placeholders
  const isPlaceholder = (name = '', affil = '', email = '') => {
    const n = String(name).toLowerCase();
    const a = String(affil).toLowerCase();
    const e = String(email).toLowerCase();
    return (
      n.includes('research author') ||
      n.includes('author 1') ||
      a.includes('autonomous systems & robotics') ||
      a.includes('autonomoussystems') ||
      e.includes('example.edu') ||
      e.includes('author@research.org')
    );
  };

  let candidateAuthors = (draft?.authors && draft.authors.length > 0)
    ? draft.authors
    : (project?.authors && project.authors.length > 0)
    ? project.authors
    : [];

  // Filter out any placeholders
  let filteredAuthors = candidateAuthors.filter(
    (a) => !isPlaceholder(a.name, a.affiliation, a.email)
  );

  // If no verified real authors found:
  if (filteredAuthors.length === 0) {
    filteredAuthors = [
      {
        name: 'Irshad Ahmad',
        affiliation: 'Department of Computer Systems Engineering, University of Engineering and Technology, Peshawar',
        email: 'irshad.uetmardan@gmail.com',
        isCorresponding: true,
      },
    ];
  }

  const authors = filteredAuthors.map((a, idx) => ({
    name: normalizeWordSpacing(cleanInternalLabels(a.name || 'Author')),
    affilRef: idx === 0 ? '1' : `${idx + 1}`,
    isCorresponding: Boolean(a.isCorresponding || idx === 0),
    email: normalizeWordSpacing(cleanInternalLabels(a.email || 'irshad.uetmardan@gmail.com')),
    affiliation: normalizeWordSpacing(cleanInternalLabels(a.affiliation || 'Department of Computer Systems Engineering, University of Engineering and Technology, Peshawar')),
  }));

  // Unique affiliations
  const affilMap = new Map();
  authors.forEach((a) => {
    if (!affilMap.has(a.affiliation)) {
      affilMap.set(a.affiliation, affilMap.size + 1);
    }
  });

  const authorHtml = authors
    .map((a) => {
      const affilNum = affilMap.get(a.affiliation) || '1';
      const star = a.isCorresponding ? '*' : '';
      return `<span class="manuscript-author-item">${a.name}<span class="author-affil-ref">${affilNum}${star}</span></span>`;
    })
    .join(template.titleAlign === 'center' ? ' &bull; ' : ', ');

  const affiliationHtml = Array.from(affilMap.entries())
    .map(([affil, num]) => `<div class="manuscript-affiliation-line"><sup>${num}</sup> ${affil}</div>`)
    .join('');

  const correspondingAuthor = authors.find((a) => a.isCorresponding) || authors[0];
  const correspondenceHtml = correspondingAuthor
    ? `<div class="manuscript-correspondence"><sup>*</sup>Corresponding author: ${correspondingAuthor.email}</div>`
    : '';

  // Article designation badge (for Tech Science Press & modern presets)
  const articleTypeBadge = template.id === 'tech_science_press'
    ? `<div class="manuscript-article-type">Research Article</div>`
    : template.id === 'ieee_access'
    ? `<div class="manuscript-article-type" style="color: #1e3a8a;">IEEE ACCESS SPECIAL SECTION</div>`
    : '';

  return `
    <header class="manuscript-header">
      ${articleTypeBadge}
      <h1 class="manuscript-title">${title}</h1>
      <div class="manuscript-authors">
        ${authorHtml}
      </div>
      <div class="manuscript-affiliations">
        ${affiliationHtml}
        ${correspondenceHtml}
      </div>
    </header>
  `;
}

/**
 * Composes the Abstract & Keywords block based on template layout rules
 */
function composeAbstractBlock(draft, template) {
  const abstract = cleanInternalLabels(draft?.abstract || '');
  if (!abstract) return '';

  const keywords = (draft?.keywords && draft.keywords.length > 0)
    ? draft.keywords
    : [
        'Vision-Language-Action Models',
        'Embodied AI',
        'Episodic Memory',
        'Retrieval-Augmented Decision Making',
        'Uncertainty Estimation',
        'Safe Abstention',
        'Trustworthy Robotics',
      ];

  const kwLabel = template.keywordLabel || 'Keywords:';
  const kwText = keywords.join(', ');

  switch (template.abstractStyle) {
    case 'run_in_bold':
      // IEEE style: Abstract---... Index Terms---...
      return `
        <div class="manuscript-abstract-block abstract-style-run_in_bold">
          <p class="paragraph" style="text-indent: 0;">
            <span class="abstract-lead">Abstract&mdash;</span>${abstract}
          </p>
          <p class="index-terms" style="text-indent: 0;">
            <span class="index-terms-lead">${kwLabel}&mdash;</span>${kwText}
          </p>
        </div>
      `;

    case 'bordered_dividers':
      // Procedia style: horizontal divider lines
      return `
        <div class="manuscript-abstract-block abstract-style-bordered_dividers">
          <div class="abstract-title">Abstract</div>
          <p class="paragraph" style="text-indent: 0; margin-bottom: 8px;">${abstract}</p>
          <div style="font-size: 8.5pt; color: #334155;"><strong>${kwLabel}</strong> ${kwText}</div>
        </div>
      `;

    case 'formal_bar':
      // Tech Science Press style: formal blue bar
      return `
        <div class="manuscript-abstract-block abstract-style-formal_bar">
          <p class="paragraph" style="text-indent: 0; margin-bottom: 6px;"><strong>Abstract:</strong> ${abstract}</p>
          <div style="font-size: 8.5pt; color: #334155;"><strong>${kwLabel}</strong> ${kwText}</div>
        </div>
      `;

    case 'bold_lead':
      // Nature style: bold abstract paragraph
      return `
        <div class="manuscript-abstract-block abstract-style-bold_lead">
          ${abstract}
        </div>
      `;

    case 'block_boxed':
    case 'standard_box':
    default:
      // Elsevier & Generic Academic style: Clean light card with title
      return `
        <div class="manuscript-abstract-block abstract-style-block_boxed">
          <div class="abstract-title">Abstract</div>
          <p class="paragraph" style="text-indent: 0; margin-bottom: 8px;">${abstract}</p>
          <div style="font-size: 8.5pt; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <strong>${kwLabel}</strong> ${kwText}
          </div>
        </div>
      `;
  }
}

/**
 * Determines whether a manuscript object should span both columns in 2-column mode
 */
function shouldObjectSpanBothColumns(obj, isTwoColumn) {
  if (!isTwoColumn) return false;

  // Explicit width preference
  if (obj.widthPreference === 'page' || obj.widthPreference === 'full') return true;
  if (obj.widthPreference === 'column') return false;

  // Default heuristic for conceptual overview diagrams and broad comparative tables:
  // Figure 1 (Overall Architecture) and Figure 4 (Protocol) span 2 columns
  if (obj.id === 'fig-mera-arch' || obj.id === 'fig-mera-protocol') return true;
  // Table 1 (Literature comparison with 8 columns) spans 2 columns
  if (obj.id === 'tbl-literature-comp') return true;
  if (obj.objectType === 'table' && obj.tableData?.headers?.length >= 6) return true;

  return false;
}

/**
 * Renders an Equation Object
 */
function renderEquationHtml(obj, template, isTwoColumn) {
  let renderedMath = '';
  try {
    renderedMath = katex.renderToString(obj.latex || '', {
      throwOnError: false,
      displayMode: true,
    });
  } catch (e) {
    renderedMath = `<div style="text-align: center; font-family: monospace;">${obj.latex || ''}</div>`;
  }

  const defsHtml = (obj.symbolDefinitions && obj.symbolDefinitions.length > 0)
    ? `<div class="symbol-defs" style="font-size: ${isTwoColumn ? '8.5pt' : '9.5pt'}; color: #334155; margin-top: 6px; line-height: 1.45; font-style: normal; text-align: left;">where ${obj.symbolDefinitions.map((s) => `<em>${s.symbol}</em> denotes ${cleanInternalLabels(s.meaning)}`).join(', ')}.</div>`
    : '';

  return `
    <div class="equation-container">
      <div class="equation-math">${renderedMath}</div>
      <div class="equation-number">(${obj.equationNumber || 1})</div>
      ${defsHtml}
    </div>
  `;
}

/**
 * Renders a Figure Object (SVG / Vector)
 */
function renderFigureHtml(obj, template, isTwoColumn) {
  const isSpanning = shouldObjectSpanBothColumns(obj, isTwoColumn);
  const containerClass = isSpanning ? 'spanning-wide-float' : 'column-width-float';
  const prefix = template.figureCaptionPrefix || 'Fig.';
  const cleanCaption = cleanInternalLabels(stripCaptionNumbering(obj.caption || obj.title));

  return `
    <div class="figure-box ${containerClass}">
      <div class="figure-content">
        ${obj.svgContent || `<div style="padding: 20px; background: #f8fafc; border: 1px dashed #cbd5e1;">[Vector Figure: ${obj.title}]</div>`}
      </div>
      <div class="figure-caption">
        <span class="caption-prefix">${prefix} ${obj.figureNumber || 1}.</span>${cleanCaption}
      </div>
    </div>
  `;
}

/**
 * Renders a Structured Table Object (Booktabs Rules)
 */
function renderTableHtml(obj, template, isTwoColumn) {
  const isSpanning = shouldObjectSpanBothColumns(obj, isTwoColumn);
  const containerClass = isSpanning ? 'spanning-wide-float' : 'column-width-float';
  const prefix = template.tableCaptionPrefix || 'Table';
  const cleanCaption = cleanInternalLabels(stripCaptionNumbering(obj.caption || obj.title));
  const headers = obj.tableData?.headers || [];
  const rows = obj.tableData?.rows || [];

  return `
    <div class="table-box ${containerClass}" style="width: 100%; margin: 16px 0; overflow-x: auto; box-sizing: border-box;">
      <div class="table-caption" style="text-align: left; font-size: 8.5pt; font-weight: 700; margin-bottom: 6px; color: #0f172a;">
        <span class="caption-prefix" style="text-transform: uppercase; margin-right: 6px;">${prefix} ${obj.tableNumber || 1}.</span>${cleanCaption}
      </div>
      <table class="academic-table" style="width: 100%; border-collapse: collapse; font-size: 7.5pt; line-height: 1.35; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; table-layout: auto;">
        <thead>
          <tr style="border-bottom: 1.5px solid #0f172a;">
            ${headers.map((h) => `<th style="padding: 6px 4px; text-align: left; font-weight: 700; color: #0f172a; word-wrap: break-word; white-space: normal; vertical-align: bottom;">${cleanInternalLabels(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row, rIdx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; ${rIdx % 2 === 1 ? 'background-color: #fafafa;' : ''}">
              ${row.map((cell) => `<td style="padding: 5px 4px; text-align: left; color: #334155; word-wrap: break-word; white-space: normal; vertical-align: top;">${cleanInternalLabels(cell)}</td>`).join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renders an Algorithm Block
 */
function renderAlgorithmHtml(obj, template, isTwoColumn) {
  const cleanTitle = cleanInternalLabels(stripCaptionNumbering(obj.title || 'Inference Flow'));
  const inputList = Array.isArray(obj.inputs) ? obj.inputs.join(', ') : (obj.inputs || 'multimodal observations');
  const outputList = Array.isArray(obj.outputs) ? obj.outputs.join(', ') : (obj.outputs || 'action tokens, safety trigger');

  return `
    <div class="algorithm-box column-width-float">
      <div class="algorithm-header">Algorithm ${obj.algorithmNumber || 1}: ${cleanTitle}</div>
      <div class="algorithm-io"><strong>Input:</strong> ${cleanInternalLabels(inputList)}</div>
      <div class="algorithm-io"><strong>Output:</strong> ${cleanInternalLabels(outputList)}</div>
      <div class="algorithm-pseudocode">${cleanInternalLabels(obj.pseudocode || '')}</div>
    </div>
  `;
}

/**
 * Composes the complete academic manuscript HTML document according to selected journal template
 */
export function composeScientificManuscriptHtml(project, draft, resolvedObjects = [], templateId = 'ieee_trans', exportMode = 'submission') {
  const template = getJournalTemplate(templateId);
  const isTwoColumn = template.columnCount === 2;

  const isPreExperimental =
    draft?.manuscriptMode === 'PRE_EXPERIMENTAL' ||
    draft?.manuscriptMode === 'pre_experimental' ||
    draft?.resultsPending;

  // 1. First Page Header & Title
  const headerHtml = composeFirstPageMetadata(project, draft, template, exportMode);

  // 2. Abstract & Keywords Block
  const abstractHtml = composeAbstractBlock(draft, template);

  // 3. Section Flow Composition
  const sections = draft?.sections || [];
  let bodySectionsHtml = '';

  sections.forEach((sec) => {
    // In Pre-Experimental mode, omit placeholder Results or Discussion sections
    const isResultsSec = sec.heading.toLowerCase().includes('result');
    const isDiscussionSec = sec.heading.toLowerCase().includes('discussion');
    if (isPreExperimental && (isResultsSec || isDiscussionSec)) {
      return;
    }

    const formattedHeading = formatSectionHeading(sec.heading, template.sectionNumbering);
    const resolvedBody = replaceCrossReferences(sec.body, resolvedObjects);
    const parsedBodyHtml = parseMarkdownToAcademicHtml(resolvedBody, isTwoColumn);

    bodySectionsHtml += `
      <section class="manuscript-section">
        <h2 class="section-h2">${formattedHeading}</h2>
        ${parsedBodyHtml}
    `;

    // Match section objects
    const secKey = sec.heading.toLowerCase();
    const matchedObjects = resolvedObjects.filter((o) => {
      const oSec = (o.sectionId || '').toLowerCase();
      return oSec.includes(secKey.split(' ')[0]) || secKey.includes(oSec);
    });

    matchedObjects.forEach((obj) => {
      if (obj.objectType === 'equation') {
        bodySectionsHtml += renderEquationHtml(obj, template, isTwoColumn);
      } else if (obj.objectType === 'figure' || obj.objectType === 'graph' || obj.objectType === 'image') {
        if (isPreExperimental && (obj.objectType === 'graph' || obj.id.startsWith('graph-'))) {
          return;
        }
        bodySectionsHtml += renderFigureHtml(obj, template, isTwoColumn);
      } else if (obj.objectType === 'table' && obj.tableData) {
        bodySectionsHtml += renderTableHtml(obj, template, isTwoColumn);
      } else if (obj.objectType === 'algorithm') {
        bodySectionsHtml += renderAlgorithmHtml(obj, template, isTwoColumn);
      }
    });

    bodySectionsHtml += `</section>`;
  });

  // 4. Appendices / Supplementary Material
  const appendices = draft?.appendices || project?.appendices || [];
  if (appendices.length > 0) {
    bodySectionsHtml += `
      <section class="manuscript-section appendices-section spanning-wide-float">
        <h2 class="section-h2">${template.sectionNumbering === 'ROMAN' ? 'APPENDIX' : 'Supplementary Material'}</h2>
        ${appendices
          .map(
            (app, idx) => `
          <div style="margin-bottom: 14px;">
            <h3 class="section-h3">${cleanInternalLabels(app.title || `Appendix ${String.fromCharCode(65 + idx)}`)}</h3>
            <div style="font-size: ${isTwoColumn ? '8.5pt' : '9.5pt'}; line-height: 1.5; color: #334155; white-space: pre-wrap;">${cleanInternalLabels(app.content || '')}</div>
          </div>
        `
          )
          .join('')}
      </section>
    `;
  }

  // 5. References Section
  const references = draft?.references || [];
  if (references.length > 0) {
    const refHeading = template.sectionNumbering === 'ROMAN' ? 'REFERENCES' : 'References';
    bodySectionsHtml += `
      <section class="manuscript-section references-section">
        <h2 class="section-h2">${refHeading}</h2>
        <ol class="references-list">
          ${references
            .map((ref) => {
              const clean = cleanInternalLabels(ref.replace(/^\[\d+\]\s*/, ''));
              return `<li class="reference-item">${clean}</li>`;
            })
            .join('')}
        </ol>
      </section>
    `;
  }

  // 6. Running Footer (Submission vs Review Mode)
  const isSubmission = exportMode === 'submission';
  const footerLeftText = isSubmission ? '' : 'Manuscript Draft — Under Review';
  const footerHtml = `
    <footer class="manuscript-footer">
      <div class="footer-left">${footerLeftText}</div>
      <div class="footer-right"><span class="page-number-display"></span></div>
    </footer>
  `;

  return `
    <div id="manuscript-typeset-root" class="academic-manuscript-container" data-template="${template.id}" data-columns="${template.columnCount}">
      ${headerHtml}
      ${abstractHtml}
      <div class="manuscript-body-columns">
        ${bodySectionsHtml}
      </div>
      ${footerHtml}
    </div>
  `;
}

export default {
  composeScientificManuscriptHtml,
  cleanInternalLabels,
  stripCaptionNumbering,
  parseMarkdownToAcademicHtml,
};
