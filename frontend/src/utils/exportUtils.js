/**
 * DOCUMIND-AI Export Utilities (SRS Section 51)
 * Supports export to Markdown (.md), JSON (.json), CSV (.csv), and print/PDF.
 */

export const exportToMarkdown = (report, filename = 'research-report.md') => {
  if (!report) return;
  const { title = 'Research Report', generatedAt = new Date().toLocaleDateString(), executiveSummary = '', sections = [], citations = [] } = report;

  let md = `# ${title}\n\n`;
  md += `*Generated: ${generatedAt} by DOCUMIND-AI Research Agent*\n\n`;
  md += `## Executive Summary\n\n${executiveSummary}\n\n`;

  if (sections && sections.length > 0) {
    sections.forEach((sec) => {
      md += `## ${sec.heading}\n\n${sec.body}\n\n`;
    });
  }

  if (citations && citations.length > 0) {
    md += `## Verified Source Citations\n\n`;
    citations.forEach((c, idx) => {
      md += `${idx + 1}. **${c.documentName || 'Document'}** (Page ${c.pageNumber || 1}, Match: ${Math.round((c.similarityScore || 0.9) * 100)}%)\n`;
      if (c.snippet) {
        md += `   > "${c.snippet}"\n\n`;
      }
    });
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.md') ? filename : `${filename}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToJson = (data, filename = 'research-data.json') => {
  if (!data) return;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToCsv = (report, filename = 'research-citations.csv') => {
  if (!report || !report.citations) return;
  const headers = ['Document Name', 'Page', 'Similarity Score', 'Knowledge Base'];
  const rows = (report.citations || []).map((c) => [
    `"${(c.documentName || '').replace(/"/g, '""')}"`,
    c.pageNumber || 1,
    `${Math.round((c.similarityScore || 0.9) * 100)}%`,
    `"${(c.knowledgeBase || 'Default').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printReportAsPdf = () => {
  window.print();
};
