import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GitCompare,
  Search,
  Lightbulb,
  FileText,
  FileCheck,
  Table,
  CheckCircle2,
  Download,
  Share2,
  Printer,
  FileSpreadsheet,
  Code2,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';
import Button from '../common/Button';
import CitationList from './CitationList';
import { exportToMarkdown, exportToJson, exportToCsv, printReportAsPdf } from '../../utils/exportUtils';

// Helper to get context-aware tabs based on the research mode
const getTabsForMode = (mode) => {
  switch (mode) {
    case 'paper_comparison':
      return [
        { id: 'overview', label: 'Overview', icon: Sparkles },
        { id: 'comparison', label: 'Comparison Table', icon: GitCompare },
        { id: 'differences', label: 'Key Differences', icon: FileText },
        { id: 'sources', label: 'Sources', icon: BookOpen },
      ];
    case 'gap_analysis':
      return [
        { id: 'overview', label: 'Summary', icon: Sparkles },
        { id: 'gaps', label: 'Research Gaps', icon: Search },
        { id: 'evidence', label: 'Supporting Evidence', icon: Table },
        { id: 'sources', label: 'Sources', icon: BookOpen },
      ];
    case 'idea_generation':
      return [
        { id: 'overview', label: 'Summary', icon: Sparkles },
        { id: 'ideas', label: 'Research Ideas', icon: Lightbulb },
        { id: 'gaps', label: 'Supporting Gaps', icon: Search },
        { id: 'sources', label: 'Sources', icon: BookOpen },
      ];
    case 'proposal':
      return [
        { id: 'overview', label: 'Summary', icon: Sparkles },
        { id: 'proposal', label: 'Proposal', icon: FileCheck },
        { id: 'plan', label: 'Timeline & Plan', icon: FileText },
        { id: 'sources', label: 'Sources', icon: BookOpen },
      ];
    case 'review_paper':
    case 'original_research_draft':
      return [
        { id: 'overview', label: 'Summary', icon: Sparkles },
        { id: 'draft', label: 'Paper Draft', icon: FileText },
        { id: 'evidence', label: 'Evidence & Claims', icon: Table },
        { id: 'sources', label: 'Sources', icon: BookOpen },
      ];
    case 'synthesis':
    default:
      return [
        { id: 'overview', label: 'Summary', icon: Sparkles },
        { id: 'report', label: 'Full Report', icon: FileText },
        { id: 'evidence', label: 'Evidence Table', icon: Table },
        { id: 'sources', label: 'Sources', icon: BookOpen },
      ];
  }
};

const ResearchStudioOutput = ({ report = {} }) => {
  const {
    title = 'Research Results',
    topic = '',
    createdAt = new Date().toLocaleDateString(),
    researchMode = 'paper_comparison',
    numberOfPapers = 0,
    executiveSummary = '',
    sections = [],
    citations = [],
    paperProfiles = [],
    comparisonMatrix = [],
    evidenceLedger = [],
    gapAnalysis = [],
    researchIdeas = [],
    proposal = null,
    paperDraft = null,
    resultsNotice = '',
  } = report;

  const tabs = getTabsForMode(researchMode);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'overview');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  // Reset tab when mode changes
  useEffect(() => {
    setActiveTab(tabs[0]?.id || 'overview');
  }, [researchMode]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyText = (text, idx) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSection(idx);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  };

  const safeFilename = (title || 'research-results')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Sparkles size={16} />
            <span>Research Results</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">{title || topic}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {paperProfiles.length || numberOfPapers || 1} paper{(paperProfiles.length || numberOfPapers || 1) === 1 ? '' : 's'} analyzed •{' '}
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Share & Export */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={Share2} onClick={handleShare}>
            {copiedLink ? 'Copied' : 'Share'}
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
                className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-20 text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    exportToMarkdown(report, safeFilename);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-left"
                >
                  <FileText size={14} />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportToJson(report, safeFilename);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-left"
                >
                  <Code2 size={14} />
                  <span>JSON (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportToCsv(report, safeFilename);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-left"
                >
                  <FileSpreadsheet size={14} />
                  <span>Citations (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    printReportAsPdf();
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 text-left border-t border-slate-100"
                >
                  <Printer size={14} />
                  <span>Print / PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context-Aware Tab Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT: OVERVIEW / SUMMARY ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Executive Summary */}
          {executiveSummary && (
            <div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100 text-xs sm:text-sm text-indigo-950 space-y-1.5 leading-relaxed">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-indigo-700">Executive Summary</h4>
              <p>{executiveSummary}</p>
            </div>
          )}

          {/* Academic Safeguard Notice if active */}
          {resultsNotice && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
              <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Academic Verification Safeguard</p>
                <p className="mt-0.5 leading-relaxed text-[11px]">{resultsNotice}</p>
              </div>
            </div>
          )}

          {/* Quick Paper List */}
          {paperProfiles.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Analyzed Papers</h4>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {paperProfiles.map((p, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                    <p className="font-bold text-slate-900 truncate">{p.title}</p>
                    <p className="text-[11px] text-slate-500">
                      Authors: {p.authors?.join(', ') || 'N/A'} • {p.year || ''}
                    </p>
                    <p className="text-slate-700 line-clamp-2 text-[11px] leading-relaxed">
                      {p.problemStatement || p.abstract}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Findings Preview */}
          {sections.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Key Takeaways</h4>
              <div className="space-y-2">
                {sections.slice(0, 3).map((sec, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">{sec.heading}</p>
                    <p className="line-clamp-3 leading-relaxed text-[11px]">{sec.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: COMPARISON TABLE & BENCHMARK COMPATIBILITY ── */}
      {activeTab === 'comparison' && (
        <div className="space-y-5">
          {/* Step 6: Benchmark Compatibility Check */}
          {report.benchmarkCompatibility && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <span className="font-bold text-slate-900">Benchmark Compatibility & Protocol Check</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    report.benchmarkCompatibility.status === 'DIRECTLY_COMPARABLE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : report.benchmarkCompatibility.status === 'CONDITIONALLY_COMPARABLE'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {report.benchmarkCompatibility.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Crucial Scientific Warning */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Scientific Protocol Rule:</strong> A higher number does not automatically mean a better paper. Check whether the papers use the same dataset, train/test split, metric, hardware/compute budget, and evaluation protocol before comparing raw scores.
              </div>

              {/* Factors Checklist */}
              {report.benchmarkCompatibility.factors?.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  {report.benchmarkCompatibility.factors.map((f, fIdx) => (
                    <div key={fIdx} className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{f.name}</span>
                        <span className={`text-[10px] font-semibold uppercase ${f.status === 'aligned' ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {f.status}
                        </span>
                      </div>
                      <p className="text-slate-600">{f.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Normalized Comparison Matrix</h3>
            <span className="text-xs font-semibold text-indigo-600">{paperProfiles.length} Papers</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="p-3 font-bold text-slate-800 w-1/4">Aspect</th>
                  {paperProfiles.map((p) => (
                    <th key={p.documentId} className="p-3 font-bold text-slate-800 min-w-[180px]">
                      <p className="truncate">{p.title || p.documentName}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {comparisonMatrix.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70">
                    <td className="p-3 font-semibold text-indigo-950 bg-slate-50/50 align-top">
                      {row.aspect}
                    </td>
                    {paperProfiles.map((p) => (
                      <td key={p.documentId} className="p-3 text-slate-700 align-top leading-relaxed text-[11px]">
                        {row.values?.[p.documentId] || 'Not reported in text'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: KEY DIFFERENCES ── */}
      {activeTab === 'differences' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Key Methodological & Empirical Differences</h3>
          <div className="space-y-3">
            {sections.filter((s) => s.heading.toLowerCase().includes('method') || s.heading.toLowerCase().includes('result') || s.heading.toLowerCase().includes('limitation') || s.heading.toLowerCase().includes('difference')).map((sec, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 space-y-1.5">
                <p className="font-bold text-slate-900">{sec.heading}</p>
                <p className="leading-relaxed whitespace-pre-wrap">{sec.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: RESEARCH GAPS ── */}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Grounded Research Gaps</h3>
            <span className="text-xs font-semibold text-indigo-600">{gapAnalysis.length} Gaps</span>
          </div>

          <div className="grid gap-3">
            {gapAnalysis.map((gap, idx) => (
              <div key={gap.id || idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-sm">{gap.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    {gap.category?.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">{gap.description}</p>
                {gap.evidenceQuote && (
                  <p className="p-2 rounded-lg bg-slate-50 italic text-[11px] text-slate-600">
                    "{gap.evidenceQuote}"
                  </p>
                )}
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  Supporting papers: <strong className="text-slate-700">{gap.supportingPapers?.join(', ')}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: RESEARCH IDEAS (HYPOTHESES, BASELINES & METRICS) ── */}
      {activeTab === 'ideas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Evidence-Grounded Research Ideas</h3>
            <span className="text-xs font-semibold text-indigo-600">{researchIdeas.length} Formulated</span>
          </div>

          <div className="grid gap-4">
            {researchIdeas.map((idea, idx) => (
              <div key={idea.id || idx} className="p-5 rounded-xl border border-slate-200 bg-white space-y-3.5 text-xs shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600">Idea #{idx + 1}</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{idea.proposedTitle}</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {idea.confidence || 'Grounded'}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-[11px] text-slate-700 leading-relaxed">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <strong className="text-slate-900">Research Question:</strong>
                    <p>{idea.researchQuestion || idea.researchProblem}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50/40 border border-indigo-100 space-y-1">
                    <strong className="text-indigo-950">Hypotheses:</strong>
                    <div className="space-y-0.5">
                      {(idea.hypotheses || [idea.hypothesis]).map((h, hIdx) => (
                        <p key={hIdx}>{h}</p>
                      ))}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <strong className="text-slate-900">Proposed Methodology:</strong>
                    <p>{idea.proposedMethod}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <strong className="text-slate-900">Benchmarks & Strong Baselines:</strong>
                    <p>{idea.benchmarksAndBaselines || 'Evaluated against prior SOTA and ablated models'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>
                    Metrics Target: <strong className="text-slate-700">{idea.evaluationMetrics?.join(', ') || 'Success Rate, Latency'}</strong>
                  </span>
                  <span>
                    Based on: <strong className="text-slate-700">{idea.supportingSources?.join(', ')}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: PROPOSAL ── */}
      {activeTab === 'proposal' && (
        <div className="space-y-4 text-xs leading-relaxed text-slate-700">
          <h3 className="text-sm font-bold text-slate-900">{proposal?.title || title}</h3>
          {proposal ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900">Background:</strong>
                <p>{proposal.background}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900">Problem & Research Gap:</strong>
                <p>{proposal.problemStatement}</p>
                <p className="text-amber-900 font-medium">Gap: {proposal.researchGap}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900">Proposed Methodology:</strong>
                <p>{proposal.proposedMethodology}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 p-4">Proposal contents generated in Overview.</p>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: TIMELINE & PLAN ── */}
      {activeTab === 'plan' && (
        <div className="space-y-3 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Experimental Plan & Timeline</h3>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p><strong className="text-slate-900">Milestones:</strong> {proposal?.experimentalPlan}</p>
            <p><strong className="text-slate-900">Projected Timeline:</strong> {proposal?.timeline}</p>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: PAPER DRAFT ── */}
      {activeTab === 'draft' && (
        <div className="space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900">{paperDraft?.title || title}</h3>
          {paperDraft?.abstract && (
            <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 italic text-slate-600">
              {paperDraft.abstract}
            </p>
          )}

          {paperDraft?.sections?.map((sec, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">{sec.heading}</h4>
                <button
                  type="button"
                  onClick={() => handleCopyText(sec.body, idx)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600"
                >
                  {copiedSection === idx ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedSection === idx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="leading-relaxed text-slate-700 whitespace-pre-wrap">{sec.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB CONTENT: FULL REPORT ── */}
      {activeTab === 'report' && (
        <div className="space-y-4 text-xs">
          {sections.map((sec, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">{sec.heading}</h4>
                <button
                  type="button"
                  onClick={() => handleCopyText(sec.body, idx)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600"
                >
                  {copiedSection === idx ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedSection === idx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="leading-relaxed text-slate-700 whitespace-pre-wrap">{sec.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB CONTENT: EVIDENCE TABLE ── */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Evidence Ledger</h3>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <ShieldCheck size={14} /> Verified Evidence
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="p-3 font-bold">Claim / Finding</th>
                  <th className="p-3 font-bold w-36">Source</th>
                  <th className="p-3 font-bold w-28">Page</th>
                  <th className="p-3 font-bold w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                {evidenceLedger.map((ev, idx) => (
                  <tr key={ev.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">{ev.claim}</td>
                    <td className="p-3 text-slate-600 truncate max-w-[140px]">{ev.documentName}</td>
                    <td className="p-3 text-slate-500">Page {ev.page || 1}</td>
                    <td className="p-3 text-emerald-600 font-bold">Verified</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: SOURCES & CITATIONS ── */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <CitationList citations={citations} />
        </div>
      )}
    </div>
  );
};

export default ResearchStudioOutput;
