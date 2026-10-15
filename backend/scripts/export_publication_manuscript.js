/**
 * DOCUMIND-AI Publication-Ready Manuscript Exporter
 * 
 * Exports the complete MERA-VLA manuscript to research/MERA_VLA_Research_Paper.md
 * with full typesetting, equations, tables, figures, algorithm, and references.
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ResearchProject = require('../models/ResearchProject');
const { CANONICAL_SCHOLARLY_BIBLIOGRAPHY } = require('../services/academicManuscriptService');

async function exportPublicationManuscript() {
  console.log('=== Exporting Publication-Ready MERA-VLA Manuscript ===');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai');

  const projectId = '6acf26284fb74352529d102c';
  let project = await ResearchProject.findById(projectId);
  if (!project) {
    project = await ResearchProject.findOne({});
  }
  if (!project) {
    console.error('Project not found!');
    process.exit(1);
  }

  const draft = project.generatedDraft;
  const sections = draft.sections || [];
  const objects = draft.manuscriptObjects || [];

  const outDir = path.join(__dirname, '../../research');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const mdLines = [];

  // Title Block
  mdLines.push(`# ${project.title}`);
  mdLines.push('');
  mdLines.push(`**Author:** Irshad Ahmad  `);
  mdLines.push(`*Department of Computer Systems Engineering, University of Engineering and Technology, Peshawar*  `);
  mdLines.push(`*Correspondence:* irshad.uetmardan@gmail.com  `);
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  // Abstract Block
  mdLines.push('## Abstract');
  mdLines.push(draft.abstract || '');
  mdLines.push('');
  mdLines.push('**Keywords:** Vision-Language-Action Models, Embodied AI, Episodic Memory, Non-Parametric Retrieval, Calibrated Uncertainty, Safe Abstention, Human-in-the-Loop Control, Robot Manipulation.');
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  // Sections
  sections.forEach((sec) => {
    mdLines.push(`## ${sec.heading}`);
    mdLines.push('');
    
    // Format body: replace internal placeholders with clean representations
    let body = sec.body || '';

    // Insert Table 1 after 2.6 or inside Section 2
    if (sec.heading.includes('Related Work')) {
      const table1Obj = objects.find(o => o.id === 'tbl-literature-comp');
      if (table1Obj && table1Obj.tableData) {
        body += '\n\n### Table 1: Architectural Characteristics of Analyzed Literature and Proposed Framework\n\n';
        body += '| ' + table1Obj.tableData.headers.join(' | ') + ' |\n';
        body += '| ' + table1Obj.tableData.headers.map(() => '---').join(' | ') + ' |\n';
        table1Obj.tableData.rows.forEach(row => {
          body += '| ' + row.map(c => String(c).replace(/\|/g, '\\|')).join(' | ') + ' |\n';
        });
        body += `\n*Note: Table 1 compares verified primary literature sources indexed in this study with the proposed MERA-VLA framework across memory, retrieval, uncertainty, abstention, explainability, and primary limitations. Missing information in surveyed works is rigorously designated as "Not reported" to prevent conjecture.*\n`;
      }
    }

    // Insert Tables 2 and 3 into Section 5
    if (sec.heading.includes('Proposed Evaluation Protocol')) {
      const table2Obj = objects.find(o => o.id === 'tbl-evaluation-benchmarks');
      if (table2Obj && table2Obj.tableData) {
        body += '\n\n### Table 2: Standardized Evaluation Benchmarks & Planned Protocol\n\n';
        body += '| ' + table2Obj.tableData.headers.join(' | ') + ' |\n';
        body += '| ' + table2Obj.tableData.headers.map(() => '---').join(' | ') + ' |\n';
        table2Obj.tableData.rows.forEach(row => {
          body += '| ' + row.map(c => String(c).replace(/\|/g, '\\|')).join(' | ') + ' |\n';
        });
        body += `\n*Note: Standardized benchmarks selected for planned empirical evaluation of MERA-VLA.*\n`;
      }

      const table3Obj = objects.find(o => o.id === 'tbl-benchmark-compatibility');
      if (table3Obj && table3Obj.tableData) {
        body += '\n\n### Table 3: Benchmark Compatibility Assessment across Surveyed Literature\n\n';
        body += '| ' + table3Obj.tableData.headers.join(' | ') + ' |\n';
        body += '| ' + table3Obj.tableData.headers.map(() => '---').join(' | ') + ' |\n';
        table3Obj.tableData.rows.forEach(row => {
          body += '| ' + row.map(c => String(c).replace(/\|/g, '\\|')).join(' | ') + ' |\n';
        });
        body += `\n*Note: Strict taxonomy of benchmark compatibility. Quantitative cross-system comparisons are restricted to directly comparable regimes.*\n`;
      }
    }

    mdLines.push(body);
    mdLines.push('');
  });

  // References Section
  mdLines.push('## References');
  mdLines.push('');
  (draft.references || []).forEach((ref, idx) => {
    if (typeof ref === 'string') {
      mdLines.push(ref.startsWith('[') ? ref : `[${idx + 1}] ${ref}`);
    } else if (ref && ref.text) {
      mdLines.push(ref.text.startsWith('[') ? ref.text : `[${idx + 1}] ${ref.text}`);
    }
  });
  mdLines.push('');

  // Appendices
  if (draft.appendices && draft.appendices.length > 0) {
    draft.appendices.forEach((app) => {
      const heading = app.title || app.heading || 'Appendix';
      const content = app.content || app.body || '';
      mdLines.push(`## ${heading}`);
      mdLines.push('');
      mdLines.push(content);
      mdLines.push('');
    });
  }

  const fullText = mdLines.join('\n');
  const targetFile = path.join(outDir, 'MERA_VLA_Research_Paper.md');
  fs.writeFileSync(targetFile, fullText, 'utf8');

  console.log(`Successfully exported manuscript to: ${targetFile}`);
  console.log(`Total Length: ${fullText.length} characters, ${mdLines.length} lines.`);
  process.exit(0);
}

exportPublicationManuscript().catch((err) => {
  console.error(err);
  process.exit(1);
});
