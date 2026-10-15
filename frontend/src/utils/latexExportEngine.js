/**
 * DOCUMIND-AI Production LaTeX Export Engine
 * 
 * Generates compile-ready LaTeX manuscripts compatible with:
 * - IEEE Transactions (IEEEtran.cls)
 * - Elsevier ScienceDirect (elsarticle.cls)
 * - Springer LNCS (llncs.cls)
 * - Standard multi-column academic articles
 * 
 * Supports:
 * - \begin{figure*} for two-column spanning diagrams
 * - \begin{table*} for broad comparative tables
 * - \begin{equation} with right-aligned numbering and stable \label{} / \eqref{}
 * - \begin{algorithm} with input/output blocks
 * - \cite{} linked to references.bib
 */

import { cleanInternalLabels, stripCaptionNumbering } from './scientificLayoutEngine';
import { getJournalTemplate } from './journalTemplates';

/**
 * Escapes special LaTeX characters in plain text
 */
export function escapeLatex(text = '') {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Formats a LaTeX citation key from canonical reference
 */
export function getCitationBibKey(refIndex = 1) {
  return `ref_canonical_${refIndex}`;
}

/**
 * Generates the complete BibTeX file (references.bib)
 */
export function generateBibtexContent(project, draft) {
  const references = draft?.references || [];

  let bib = `% ==============================================================================\n`;
  bib += `% Academic Bibliography Database (references.bib)\n`;
  bib += `% Formatted for DOCUMIND-AI Scientific Submission Engine\n`;
  bib += `% ==============================================================================\n\n`;

  if (references.length > 0) {
    references.forEach((ref, idx) => {
      const citeKey = getCitationBibKey(idx + 1);
      const isExpel = ref.toLowerCase().includes('expel') || ref.toLowerCase().includes('zhao');

      if (isExpel) {
        bib += `@inproceedings{${citeKey},\n`;
        bib += `  author    = {Andrew Zhao and Daniel Huang and Quentin Xu and Matthieu Lin and Yong-Jin Liu and Gao Huang},\n`;
        bib += `  title     = {{ExpeL: LLM Agents Are Experiential Learners}},\n`;
        bib += `  booktitle = {Proceedings of the 38th AAAI Conference on Artificial Intelligence (AAAI-24)},\n`;
        bib += `  year      = {2024},\n`;
        bib += `  pages     = {19632--19640},\n`;
        bib += `  doi       = {10.1609/aaai.v38i17.29936}\n`;
        bib += `}\n\n`;
      } else {
        const cleanRef = escapeLatex(ref.replace(/^\[\d+\]\s*/, ''));
        bib += `@misc{${citeKey},\n`;
        bib += `  title = {{Scholarly Source}},\n`;
        bib += `  note  = {${cleanRef}}\n`;
        bib += `}\n\n`;
      }
    });
  } else {
    bib += `% No references currently recorded.\n`;
  }

  return bib;
}

/**
 * Generates complete compilable main.tex file
 */
export function generateLatexProject(project, draft, resolvedObjects = [], templateId = 'ieee_trans') {
  const template = getJournalTemplate(templateId);
  const isTwoColumn = template.columnCount === 2;

  const rawTitle = draft?.title || project?.title || 'Academic Research Manuscript';
  const title = cleanInternalLabels(rawTitle);
  const abstract = cleanInternalLabels(draft?.abstract || '');
  const sections = draft?.sections || [];
  const appendices = draft?.appendices || project?.appendices || [];

  const isPreExperimental =
    draft?.manuscriptMode === 'PRE_EXPERIMENTAL' ||
    draft?.manuscriptMode === 'pre_experimental' ||
    draft?.resultsPending;

  // Authors (Use verified project/draft authors, never dummy placeholders)
  let rawAuthorsList = (draft?.authors && draft.authors.length > 0)
    ? draft.authors
    : (project?.authors && project.authors.length > 0)
    ? project.authors
    : [];

  const isPlaceholder = (a) => {
    const n = (a?.name || '').toLowerCase();
    const aff = (a?.affiliation || '').toLowerCase();
    const em = (a?.email || '').toLowerCase();
    return n.includes('research author') || aff.includes('autonomous systems & robotics') || em.includes('example.edu');
  };

  let authorsList = rawAuthorsList.filter((a) => !isPlaceholder(a));
  if (authorsList.length === 0) {
    authorsList = [
      {
        name: 'Irshad Ahmad',
        affiliation: 'Department of Computer Systems Engineering, University of Engineering and Technology, Peshawar',
        email: 'irshad.uetmardan@gmail.com',
      },
    ];
  }

  let tex = '';

  // 1. Preamble & Document Class
  if (template.id === 'ieee_trans' || template.id === 'ieee_access') {
    tex += `\\documentclass[10pt,journal,compsoc]{IEEEtran}\n`;
  } else if (template.id === 'elsevier_style' || template.id === 'procedia_style') {
    tex += `\\documentclass[preprint,11pt]{elsarticle}\n`;
  } else if (template.id === 'springer_lncs') {
    tex += `\\documentclass[runningheads]{llncs}\n`;
  } else {
    tex += `\\documentclass[10pt,${isTwoColumn ? 'twocolumn' : 'onecolumn'}]{article}\n`;
    tex += `\\usepackage[a4paper,margin=20mm]{geometry}\n`;
  }

  tex += `\\usepackage{amsmath,amssymb,amsfonts}\n`;
  tex += `\\usepackage{graphicx}\n`;
  tex += `\\usepackage{booktabs}\n`;
  tex += `\\usepackage{microtype}\n`;
  tex += `\\usepackage{hyperref}\n`;
  tex += `\\usepackage{cite}\n`;
  tex += `\\usepackage{algorithm}\n`;
  tex += `\\usepackage{algpseudocode}\n`;
  tex += `\\usepackage{url}\n\n`;

  // 2. Title & Authors
  tex += `\\title{${escapeLatex(title)}}\n\n`;

  if (template.id === 'ieee_trans' || template.id === 'ieee_access') {
    tex += `\\author{\n`;
    tex += `  \\IEEEauthorblockN{${escapeLatex(authorsList[0].name)}}\\\\\n`;
    tex += `  \\IEEEauthorblockA{\\textit{${escapeLatex(authorsList[0].affiliation)}}\\\\\n`;
    tex += `  Email: ${escapeLatex(authorsList[0].email)}}\n`;
    tex += `}\n\n`;
  } else {
    tex += `\\author{${escapeLatex(authorsList[0].name)}\\\\ \\small ${escapeLatex(authorsList[0].affiliation)}\\\\ \\small \\texttt{${escapeLatex(authorsList[0].email)}}}\n`;
    tex += `\\date{\\today}\n\n`;
  }

  tex += `\\begin{document}\n\n`;
  tex += `\\maketitle\n\n`;

  // 3. Abstract & Keywords
  tex += `\\begin{abstract}\n`;
  tex += `${escapeLatex(abstract)}\n`;
  tex += `\\end{abstract}\n\n`;

  const keywords = draft?.keywords || [
    'Vision-Language-Action Models',
    'Embodied AI',
    'Episodic Memory',
    'Uncertainty Estimation',
    'Safe Abstention',
  ];

  if (template.id === 'ieee_trans' || template.id === 'ieee_access') {
    tex += `\\begin{IEEEkeywords}\n`;
    tex += `${keywords.map((k) => escapeLatex(k)).join(', ')}\n`;
    tex += `\\end{IEEEkeywords}\n\n`;
  }

  // 4. Sections & Floats
  sections.forEach((sec) => {
    // In pre-experimental mode, omit empirical Results / Discussion
    const isResultsSec = sec.heading.toLowerCase().includes('result');
    const isDiscussionSec = sec.heading.toLowerCase().includes('discussion');
    if (isPreExperimental && (isResultsSec || isDiscussionSec)) {
      return;
    }

    const secTitle = sec.heading.replace(/^\d+\.\s*/, '');
    tex += `\\section{${escapeLatex(secTitle)}}\n`;

    // Process body text & cross-references
    let bodyTex = cleanInternalLabels(sec.body)
      .replace(/\{\{EQUATION:([^}]+)\}\}/g, '\\eqref{eq:$1}')
      .replace(/\{\{FIGURE:([^}]+)\}\}/g, 'Fig.~\\ref{fig:$1}')
      .replace(/\{\{TABLE:([^}]+)\}\}/g, 'Table~\\ref{tab:$1}')
      .replace(/\[1\]/g, '\\cite{ref_canonical_1}')
      .replace(/\[2\]/g, '\\cite{ref_canonical_2}')
      .replace(/\[3\]/g, '\\cite{ref_canonical_3}');

    // Split markdown headers
    bodyTex = bodyTex
      .replace(/^###\s+(.*)$/gm, '\\subsection{$1}')
      .replace(/^####\s+(.*)$/gm, '\\subsubsection{$1}')
      .replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}')
      .replace(/\*([^*]+)\*/g, '\\textit{$1}');

    tex += `${bodyTex}\n\n`;

    // Matched section objects
    const secKey = secTitle.toLowerCase();
    const matchedObjects = resolvedObjects.filter((o) => {
      const oSec = (o.sectionId || '').toLowerCase();
      return oSec.includes(secKey.split(' ')[0]) || secKey.includes(oSec);
    });

    matchedObjects.forEach((obj) => {
      const cleanCap = escapeLatex(stripCaptionNumbering(obj.caption || obj.title));

      if (obj.objectType === 'equation') {
        tex += `\\begin{equation}\n`;
        tex += `${obj.latex || ''}\n`;
        tex += `\\label{eq:${obj.id}}\n`;
        tex += `\\end{equation}\n\n`;
      } else if (obj.objectType === 'figure' || obj.objectType === 'graph' || obj.objectType === 'image') {
        if (isPreExperimental && (obj.objectType === 'graph' || obj.id.startsWith('graph-'))) {
          return;
        }

        // Broad figures span two columns in IEEE mode (\begin{figure*})
        const isSpanning = isTwoColumn && (obj.id === 'fig-mera-arch' || obj.id === 'fig-mera-protocol');
        const figEnv = isSpanning ? 'figure*' : 'figure';

        tex += `\\begin{${figEnv}}[htbp]\n`;
        tex += `\\centering\n`;
        tex += `% Vector SVG Asset: figures/${obj.id}.svg\n`;
        tex += `\\caption{${cleanCap}}\n`;
        tex += `\\label{fig:${obj.id}}\n`;
        tex += `\\end{${figEnv}}\n\n`;
      } else if (obj.objectType === 'table' && obj.tableData) {
        const isSpanning = isTwoColumn && (obj.id === 'tbl-literature-comp' || (obj.tableData.headers || []).length >= 6);
        const tblEnv = isSpanning ? 'table*' : 'table';
        const colCount = (obj.tableData.headers || []).length || 1;
        const colAlign = 'l'.repeat(colCount);

        tex += `\\begin{${tblEnv}}[htbp]\n`;
        tex += `\\centering\n`;
        tex += `\\caption{${cleanCap}}\n`;
        tex += `\\label{tab:${obj.id}}\n`;
        tex += `\\begin{tabular}{${colAlign}}\n`;
        tex += `\\toprule\n`;
        tex += `${(obj.tableData.headers || []).map((h) => escapeLatex(cleanInternalLabels(h))).join(' & ')} \\\\\n`;
        tex += `\\midrule\n`;
        (obj.tableData.rows || []).forEach((row) => {
          tex += `${row.map((c) => escapeLatex(cleanInternalLabels(c))).join(' & ')} \\\\\n`;
        });
        tex += `\\bottomrule\n`;
        tex += `\\end{tabular}\n`;
        tex += `\\end{${tblEnv}}\n\n`;
      } else if (obj.objectType === 'algorithm') {
        const inList = escapeLatex(cleanInternalLabels(Array.isArray(obj.inputs) ? obj.inputs.join(', ') : (obj.inputs || 'N/A')));
        const outList = escapeLatex(cleanInternalLabels(Array.isArray(obj.outputs) ? obj.outputs.join(', ') : (obj.outputs || 'N/A')));
        const cleanAlgTitle = escapeLatex(stripCaptionNumbering(obj.title || 'Inference Flow'));

        tex += `\\begin{algorithm}[htbp]\n`;
        tex += `\\caption{${cleanAlgTitle}}\n`;
        tex += `\\label{alg:${obj.id}}\n`;
        tex += `\\begin{algorithmic}[1]\n`;
        tex += `\\Require ${inList}\n`;
        tex += `\\Ensure ${outList}\n`;
        const codeLines = (obj.pseudocode || '').split('\n').filter(Boolean);
        codeLines.forEach((l) => {
          const cleanLine = escapeLatex(l.replace(/^\d+:\s*/, ''));
          tex += `\\State ${cleanLine}\n`;
        });
        tex += `\\end{algorithmic}\n`;
        tex += `\\end{algorithm}\n\n`;
      }
    });
  });

  // 5. Appendices
  if (appendices.length > 0) {
    tex += `\\appendices\n`;
    appendices.forEach((app) => {
      const cleanAppTitle = escapeLatex(cleanInternalLabels(app.title || 'Supplementary Material'));
      tex += `\\section{${cleanAppTitle}}\n`;
      tex += `${escapeLatex(cleanInternalLabels(app.content || ''))}\n\n`;
    });
  }

  // 6. Bibliography
  tex += `\\bibliographystyle{IEEEtran}\n`;
  tex += `\\bibliography{references}\n\n`;

  tex += `\\end{document}\n`;

  return tex;
}

export default {
  generateLatexProject,
  generateBibtexContent,
  escapeLatex,
};
