/**
 * DOCUMIND-AI Journal Template Engine & Style Presets
 * 
 * Provides structured configuration and CSS styles for 9 publication presets:
 * 1. Generic Academic (Standard single-column peer-review submission)
 * 2. IEEE-Style (Two-column classic IEEE Transactions standard)
 * 3. IEEE Access-Style (Two-column modern open access with index terms)
 * 4. Elsevier-Style (Single-column ScienceDirect standard)
 * 5. Procedia-Style (Elsevier Procedia conference/symposium format with metadata rules)
 * 6. Tech Science Press-Style (Formal article designation, DOI bar, structured layout)
 * 7. Springer LNCS-Style (Lecture Notes in Computer Science compact book geometry)
 * 8. Nature-Style (Two-column numbered layout with lead bold abstract)
 * 9. Custom (User-configurable parameters)
 */

export const JOURNAL_STYLE_PRESETS = [
  {
    id: 'ieee_trans',
    name: 'IEEE-Style',
    category: 'two_column',
    desc: 'IEEE Transactions double-column standard with Roman numeral headings & Index Terms',
    pageSize: 'A4',
    columnCount: 2,
    columnGap: '18pt',
    fontFamily: '"Times New Roman", Times, "Cambria", Georgia, serif',
    baseFontSize: '9.5pt',
    lineHeight: 1.45,
    titleAlign: 'center',
    abstractStyle: 'run_in_bold', // Abstract---...
    keywordLabel: 'Index Terms',
    sectionNumbering: 'ROMAN', // I. INTRODUCTION
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'Fig.',
    tableCaptionPrefix: 'TABLE',
    citationStyle: 'IEEE',
    referenceStyle: 'ieee',
    headerRule: true,
    footerStyle: 'page_only',
  },
  {
    id: 'ieee_access',
    name: 'IEEE Access-Style',
    category: 'two_column',
    desc: 'Modern IEEE Access two-column layout with bold colored accent rules',
    pageSize: 'A4',
    columnCount: 2,
    columnGap: '20pt',
    fontFamily: '"Times New Roman", Times, "Cambria", Georgia, serif',
    baseFontSize: '9.5pt',
    lineHeight: 1.5,
    titleAlign: 'left',
    abstractStyle: 'run_in_bold',
    keywordLabel: 'INDEX TERMS',
    sectionNumbering: 'ROMAN',
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'FIGURE',
    tableCaptionPrefix: 'TABLE',
    citationStyle: 'IEEE',
    referenceStyle: 'ieee',
    accentColor: '#1e3a8a',
    headerRule: true,
    footerStyle: 'running_title',
  },
  {
    id: 'elsevier_style',
    name: 'Elsevier-Style',
    category: 'single_column',
    desc: 'Elsevier ScienceDirect single-column layout with author affiliation footnotes & highlights',
    pageSize: 'A4',
    columnCount: 1,
    columnGap: '0pt',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    baseFontSize: '10.5pt',
    lineHeight: 1.6,
    titleAlign: 'left',
    abstractStyle: 'block_boxed',
    keywordLabel: 'Keywords:',
    sectionNumbering: 'ARABIC', // 1. Introduction
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'Fig.',
    tableCaptionPrefix: 'Table',
    citationStyle: 'APA',
    referenceStyle: 'author_year',
    headerRule: true,
    footerStyle: 'running_journal',
  },
  {
    id: 'procedia_style',
    name: 'Procedia-Style',
    category: 'single_column',
    desc: 'Procedia Computer Science single-column conference format with horizontal divider rules',
    pageSize: 'A4',
    columnCount: 1,
    columnGap: '0pt',
    fontFamily: '"Times New Roman", Times, "Cambria", serif',
    baseFontSize: '10pt',
    lineHeight: 1.55,
    titleAlign: 'center',
    abstractStyle: 'bordered_dividers', // Horizontal lines above and below abstract
    keywordLabel: 'Keywords:',
    sectionNumbering: 'ARABIC',
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'Fig.',
    tableCaptionPrefix: 'Table',
    citationStyle: 'IEEE',
    referenceStyle: 'ieee',
    headerRule: true,
    footerStyle: 'procedia',
  },
  {
    id: 'tech_science_press',
    name: 'Tech Science Press-Style',
    category: 'single_column',
    desc: 'Formal article layout with publication metadata bar and structured section hierarchy',
    pageSize: 'A4',
    columnCount: 1,
    columnGap: '0pt',
    fontFamily: '"Times New Roman", Times, "Cambria", serif',
    baseFontSize: '10.5pt',
    lineHeight: 1.6,
    titleAlign: 'left',
    abstractStyle: 'formal_bar',
    keywordLabel: 'Keywords:',
    sectionNumbering: 'ARABIC',
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'Figure',
    tableCaptionPrefix: 'Table',
    citationStyle: 'IEEE',
    referenceStyle: 'ieee',
    headerRule: true,
    footerStyle: 'formal',
  },
  {
    id: 'springer_lncs',
    name: 'Springer-Style',
    category: 'single_column',
    desc: 'Springer Lecture Notes in Computer Science (LNCS) compact readable geometry',
    pageSize: 'A4',
    columnCount: 1,
    columnGap: '0pt',
    fontFamily: '"Times New Roman", Times, serif',
    baseFontSize: '10pt',
    lineHeight: 1.5,
    titleAlign: 'center',
    abstractStyle: 'indented_lead',
    keywordLabel: 'Keywords:',
    sectionNumbering: 'ARABIC',
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'Fig.',
    tableCaptionPrefix: 'Table',
    citationStyle: 'IEEE',
    referenceStyle: 'ieee',
    headerRule: false,
    footerStyle: 'page_only',
  },
  {
    id: 'nature_style',
    name: 'Nature-Style',
    category: 'two_column',
    desc: 'Two-column format with sans-serif section headings and compact lead abstract',
    pageSize: 'A4',
    columnCount: 2,
    columnGap: '16pt',
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    headingFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    baseFontSize: '9pt',
    lineHeight: 1.45,
    titleAlign: 'left',
    abstractStyle: 'bold_lead',
    keywordLabel: 'Keywords:',
    sectionNumbering: 'NONE', // Unnumbered headings in Nature style
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'Figure',
    tableCaptionPrefix: 'Table',
    citationStyle: 'IEEE',
    referenceStyle: 'nature',
    headerRule: true,
    footerStyle: 'page_only',
  },
  {
    id: 'generic_academic',
    name: 'Generic Academic',
    category: 'single_column',
    desc: 'Standard clean single-column submission manuscript for peer-review and preprints',
    pageSize: 'A4',
    columnCount: 1,
    columnGap: '0pt',
    fontFamily: '"Times New Roman", Times, "Cambria", Georgia, serif',
    baseFontSize: '11pt',
    lineHeight: 1.6,
    titleAlign: 'center',
    abstractStyle: 'standard_box',
    keywordLabel: 'Keywords:',
    sectionNumbering: 'ARABIC',
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'Figure',
    tableCaptionPrefix: 'Table',
    citationStyle: 'IEEE',
    referenceStyle: 'ieee',
    headerRule: true,
    footerStyle: 'page_only',
  },
  {
    id: 'custom',
    name: 'Custom',
    category: 'two_column',
    desc: 'User-customized layout and typographic parameters',
    pageSize: 'A4',
    columnCount: 2,
    columnGap: '18pt',
    fontFamily: '"Times New Roman", Times, serif',
    baseFontSize: '10pt',
    lineHeight: 1.5,
    titleAlign: 'center',
    abstractStyle: 'run_in_bold',
    keywordLabel: 'Keywords:',
    sectionNumbering: 'ARABIC',
    tableCaptionPosition: 'top',
    figureCaptionPosition: 'bottom',
    figureCaptionPrefix: 'Figure',
    tableCaptionPrefix: 'Table',
    citationStyle: 'IEEE',
    referenceStyle: 'ieee',
    headerRule: true,
    footerStyle: 'page_only',
  },
];

/**
 * Resolves a template preset by identifier
 */
export function getJournalTemplate(templateId = 'ieee_trans') {
  const norm = String(templateId || '').toLowerCase().trim();
  const match = JOURNAL_STYLE_PRESETS.find(
    (t) => t.id.toLowerCase() === norm || t.name.toLowerCase() === norm
  );
  return match || JOURNAL_STYLE_PRESETS[0]; // Default to IEEE-Style
}

/**
 * Generates custom CSS rules based on selected journal template
 */
export function generateTemplateCss(template) {
  const isTwoColumn = template.columnCount === 2;
  const colGap = template.columnGap || '18pt';
  const fontFamily = template.fontFamily || '"Times New Roman", Times, serif';
  const headingFont = template.headingFont || fontFamily;
  const fontSize = template.baseFontSize || '10pt';
  const lineHeight = template.lineHeight || 1.5;

  return `
    .academic-manuscript-container {
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      color: #111827;
      background: #ffffff;
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 24px 36px;
      box-sizing: border-box;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: antialiased;
      word-spacing: normal !important;
      letter-spacing: normal !important;
    }

    /* Word spacing & font metrics guarantee */
    .academic-manuscript-container,
    .manuscript-title,
    .manuscript-authors,
    .manuscript-author-item,
    .manuscript-affiliations,
    .manuscript-abstract-block,
    .manuscript-body-columns,
    .manuscript-section,
    .section-h2,
    .section-h3,
    .section-h4,
    .paragraph,
    .figure-caption,
    .table-caption,
    .reference-item {
      word-spacing: normal !important;
      letter-spacing: normal !important;
      text-rendering: geometricPrecision !important;
      -webkit-font-smoothing: antialiased;
      font-feature-settings: "kern" 1, "liga" 1;
    }

    /* First Page Header */
    .manuscript-header {
      width: 100%;
      text-align: ${template.titleAlign || 'center'};
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: ${template.headerRule ? '1px solid #cbd5e1' : 'none'};
    }

    .manuscript-article-type {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
      margin-bottom: 8px;
    }

    .manuscript-title {
      font-size: ${isTwoColumn ? '20pt' : '22pt'};
      font-weight: 700;
      line-height: 1.25;
      color: #0f172a;
      margin: 0 0 12px 0;
      word-spacing: normal !important;
      letter-spacing: normal !important;
    }

    .manuscript-authors {
      font-size: 10.5pt;
      color: #1e293b;
      margin-bottom: 6px;
    }

    .manuscript-author-item {
      display: inline-block;
      margin: 0 6px;
      font-weight: 600;
    }

    .author-affil-ref {
      font-size: 8pt;
      vertical-align: super;
      font-weight: 700;
      color: #4338ca;
      margin-left: 1px;
    }

    .manuscript-affiliations {
      font-size: 8.5pt;
      font-style: italic;
      color: #475569;
      margin-top: 6px;
      line-height: 1.4;
    }

    .manuscript-affiliation-line {
      margin-bottom: 2px;
    }

    .manuscript-correspondence {
      font-size: 8pt;
      color: #64748b;
      margin-top: 6px;
      font-style: normal;
    }

    /* Abstract Block Styling based on Template */
    .manuscript-abstract-block {
      width: 100%;
      margin: 16px 0 20px 0;
      box-sizing: border-box;
    }

    /* IEEE run-in bold abstract */
    .abstract-style-run_in_bold {
      font-size: 9pt;
      line-height: 1.45;
      text-align: justify;
      text-justify: inter-word;
      padding: 0 8px;
    }
    .abstract-style-run_in_bold .abstract-lead {
      font-weight: 700;
      font-style: italic;
      margin-right: 4px;
    }
    .abstract-style-run_in_bold .index-terms {
      margin-top: 6px;
      font-size: 9pt;
    }
    .abstract-style-run_in_bold .index-terms-lead {
      font-weight: 700;
      font-style: italic;
      margin-right: 4px;
    }

    /* Elsevier & Standard Boxed */
    .abstract-style-block_boxed, .abstract-style-standard_box {
      background: #f8fafc;
      border-left: 3.5px solid #0f172a;
      padding: 12px 18px;
      border-radius: 4px;
      font-size: 9.5pt;
      line-height: 1.55;
      text-align: justify;
    }
    .abstract-style-block_boxed .abstract-title, .abstract-style-standard_box .abstract-title {
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0f172a;
      margin-bottom: 6px;
    }

    /* Procedia Dividers */
    .abstract-style-bordered_dividers {
      border-top: 1px solid #0f172a;
      border-bottom: 1px solid #0f172a;
      padding: 12px 6px;
      font-size: 9.5pt;
      line-height: 1.5;
      text-align: justify;
    }
    .abstract-style-bordered_dividers .abstract-title {
      font-weight: 700;
      margin-bottom: 4px;
    }

    /* Tech Science Press Formal Bar */
    .abstract-style-formal_bar {
      border-left: 2.5px solid #2563eb;
      padding: 8px 14px;
      font-size: 9.5pt;
      line-height: 1.55;
      text-align: justify;
    }

    /* Nature bold lead */
    .abstract-style-bold_lead {
      font-size: 9.5pt;
      line-height: 1.5;
      font-weight: 600;
      color: #0f172a;
      text-align: justify;
      margin-bottom: 16px;
    }

    /* Main Columnar Body */
    .manuscript-body-columns {
      ${
        isTwoColumn
          ? `
        column-count: 2;
        column-gap: ${colGap};
        column-fill: balance;
        text-align: justify;
        text-justify: inter-word;
      `
          : `
        column-count: 1;
        text-align: justify;
        text-justify: inter-word;
      `
      }
      margin-top: 14px;
    }

    /* Spanning Floats across Two Columns */
    .spanning-wide-float {
      column-span: all;
      width: 100%;
      margin: 18px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Column-Width Objects */
    .column-width-float {
      column-span: none;
      width: 100%;
      margin: 14px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Section Headings */
    .manuscript-section {
      margin-bottom: 14px;
      break-inside: auto;
    }

    .section-h2 {
      font-family: ${headingFont};
      font-size: ${isTwoColumn ? '11pt' : '12.5pt'};
      font-weight: 700;
      color: #0f172a;
      margin: 16px 0 8px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
      page-break-after: avoid;
      break-after: avoid;
      ${
        template.sectionNumbering === 'ROMAN'
          ? 'text-transform: uppercase; letter-spacing: 0.04em;'
          : ''
      }
    }

    .section-h3 {
      font-family: ${headingFont};
      font-size: ${isTwoColumn ? '9.5pt' : '10.5pt'};
      font-weight: 700;
      font-style: ${isTwoColumn ? 'italic' : 'normal'};
      color: #1e293b;
      margin: 12px 0 5px 0;
      page-break-after: avoid;
      break-after: avoid;
    }

    .section-h4 {
      font-family: ${headingFont};
      font-size: 9pt;
      font-weight: 600;
      color: #334155;
      margin: 8px 0 3px 0;
      page-break-after: avoid;
      break-after: avoid;
    }

    .paragraph {
      margin: 0 0 10px 0;
      text-indent: ${isTwoColumn ? '12pt' : '0'};
      text-align: justify;
      text-justify: inter-word;
      word-break: normal;
      hyphens: auto;
      page-break-inside: auto;
      break-inside: auto;
      orphans: 2;
      widows: 2;
    }

    .paragraph:first-of-type {
      text-indent: 0;
    }

    /* KaTeX Mathematical Equations */
    .equation-container {
      position: relative;
      margin: 12px 0;
      padding: 6px 12px;
      background: #fafafa;
      border: 1px solid #f1f5f9;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
    }

    .equation-math {
      text-align: center;
      overflow-x: auto;
      font-size: ${isTwoColumn ? '9.5pt' : '10.5pt'};
    }

    .equation-number {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      font-family: "Times New Roman", Times, serif;
    }

    .symbol-defs {
      font-size: 8pt;
      color: #64748b;
      margin-top: 4px;
      font-style: italic;
      line-height: 1.35;
    }

    /* Figures & Vector Visuals */
    .figure-box {
      text-align: center;
      margin: 16px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .figure-content {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 6px;
    }

    .figure-content svg {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }

    .figure-caption {
      font-size: 8.5pt;
      line-height: 1.4;
      color: #1e293b;
      text-align: ${isTwoColumn ? 'justify' : 'center'};
      margin-top: 6px;
    }

    .caption-prefix {
      font-weight: 700;
      margin-right: 4px;
    }

    /* Academic Tables (Booktabs Rule Standard) */
    .table-box {
      margin: 18px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      width: 100%;
      overflow-x: auto;
    }

    .table-caption {
      font-size: 8.5pt;
      font-weight: 600;
      color: #0f172a;
      text-align: ${template.tableCaptionPosition === 'top' ? (isTwoColumn ? 'left' : 'center') : 'left'};
      margin-bottom: 6px;
      line-height: 1.35;
    }

    .academic-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${isTwoColumn ? '8pt' : '9pt'};
      line-height: 1.35;
      margin: 0 auto;
    }

    .academic-table th {
      border-top: 2px solid #0f172a;
      border-bottom: 1.25px solid #0f172a;
      padding: 5px 7px;
      background: #f8fafc;
      text-align: left;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
    }

    .academic-table td {
      border-bottom: 1px solid #e2e8f0;
      padding: 4px 7px;
      color: #334155;
    }

    .academic-table tbody tr:last-child td {
      border-bottom: 2px solid #0f172a;
    }

    /* Algorithm Blocks */
    .algorithm-box {
      border: 1px solid #cbd5e1;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      padding: 10px 14px;
      background: #f8fafc;
      margin: 14px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
      border-radius: 2px;
    }

    .algorithm-header {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .algorithm-io {
      font-size: 8.5pt;
      color: #334155;
      margin-bottom: 2px;
    }

    .algorithm-pseudocode {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 4px;
      font-family: 'Consolas', 'Menlo', monospace;
      white-space: pre-wrap;
      line-height: 1.45;
      color: #1e293b;
    }

    /* Bibliography & References */
    .references-section {
      margin-top: 22px;
      border-top: ${isTwoColumn ? 'none' : '1px solid #cbd5e1'};
      padding-top: 8px;
    }

    .references-list {
      padding-left: ${isTwoColumn ? '14px' : '20px'};
      margin: 8px 0;
      font-size: ${isTwoColumn ? '8pt' : '9pt'};
      line-height: 1.45;
      color: #334155;
    }

    .reference-item {
      margin-bottom: 5px;
      text-align: justify;
      word-break: normal;
    }

    /* Running Header & Footer */
    .manuscript-footer {
      width: 100%;
      margin-top: 28px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #64748b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media print {
      body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .academic-manuscript-container {
        max-width: 100% !important;
        padding: 10mm 12mm !important;
      }
      .equation-container, .figure-box, .table-box, .algorithm-box {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .section-h2, .section-h3 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  `;
}
