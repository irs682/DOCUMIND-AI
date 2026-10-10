import React, { useState } from 'react';
import { Download, FileText, Share2, Sparkles, Printer, FileSpreadsheet, Code2 } from 'lucide-react';
import Button from '../common/Button';
import CitationList from './CitationList';
import { exportToMarkdown, exportToJson, exportToCsv, printReportAsPdf } from '../../utils/exportUtils';

const ResearchReport = ({ report }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    title = 'Executive Analysis: Research Study',
    generatedAt = new Date().toLocaleDateString(),
    executiveSummary = '',
    sections = [],
    citations = [],
  } = report || {};

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const safeFilename = (title || 'research-report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Sparkles size={16} />
            <span>Generated AI Research Report</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Generated on {generatedAt}</p>
        </div>

        <div className="relative flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={Share2} onClick={handleShare}>
            {copied ? 'Link Copied!' : 'Share'}
          </Button>

          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              leftIcon={Download}
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              Export
            </Button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-20 text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    exportToMarkdown(report, safeFilename);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-left"
                >
                  <FileText size={15} />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportToJson(report, safeFilename);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-left"
                >
                  <Code2 size={15} />
                  <span>JSON (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportToCsv(report, safeFilename);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-left"
                >
                  <FileSpreadsheet size={15} />
                  <span>Citations CSV (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    printReportAsPdf();
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-left border-t border-slate-100"
                >
                  <Printer size={15} />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Executive summary block */}
      {executiveSummary && (
        <div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100 text-sm text-indigo-950 space-y-1.5">
          <h4 className="font-bold uppercase tracking-wider text-xs text-indigo-700">
            Executive Summary
          </h4>
          <p className="leading-relaxed">{executiveSummary}</p>
        </div>
      )}

      {/* Report Sections */}
      <div className="space-y-5">
        {sections.map((sec, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">{sec.heading}</h3>
            <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
              {sec.body}
            </div>
          </div>
        ))}
      </div>

      {/* Citations section */}
      {citations && citations.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <CitationList citations={citations} />
        </div>
      )}
    </div>
  );
};

export default ResearchReport;
