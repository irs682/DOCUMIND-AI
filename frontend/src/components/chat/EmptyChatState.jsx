import React from 'react';
import { Sparkles, FileText, Send, ArrowRight, Layers, FileSearch } from 'lucide-react';

/**
 * EmptyChatState - Modern, production-grade welcome view with contextual prompt suggestions
 */
const EmptyChatState = ({
  sessionDocCount = 0,
  selectedDocName = '',
  onSelectPrompt,
}) => {
  const suggestions =
    sessionDocCount > 0
      ? [
          {
            title: 'Summarize Document',
            description: 'Extract executive overview, core themes, and conclusions',
            prompt: `Provide a detailed executive summary of the attached document(s), highlighting key takeaways and structure.`,
            icon: FileText,
          },
          {
            title: 'Identify Key Findings',
            description: 'Find important numbers, deadlines, metrics, and commitments',
            prompt: `What are the most critical findings, dates, metrics, and actionable items in these documents?`,
            icon: FileSearch,
          },
          {
            title: 'Risk & Gap Analysis',
            description: 'Identify potential risks, missing sections, and discrepancies',
            prompt: `Analyze the attached document(s) for any potential risks, liabilities, gaps, or inconsistencies.`,
            icon: Layers,
          },
          {
            title: 'Plain-English Explanation',
            description: 'Translate complex jargon into simple, actionable language',
            prompt: `Explain the main concepts in these documents simply and concisely for a general audience.`,
            icon: Sparkles,
          },
        ]
      : [
          {
            title: 'Summarize All Files',
            description: 'Synthesize overarching themes across all uploaded documents',
            prompt: 'Summarize the main themes and insights across all my uploaded documents.',
            icon: Layers,
          },
          {
            title: 'Extract Deadlines & Metrics',
            description: 'Compile financial figures, dates, and quantitative data',
            prompt: 'Find any key dates, milestones, financial figures, or deliverables in my files.',
            icon: FileSearch,
          },
          {
            title: 'Cross-Document Comparison',
            description: 'Compare methodologies or specifications across files',
            prompt: 'Compare the main findings and differences between my uploaded documents.',
            icon: FileText,
          },
          {
            title: 'General Knowledge Q&A',
            description: 'Ask anything about document intelligence and RAG pipelines',
            prompt: 'How does DOCUMIND-AI use RAG and hybrid search to query documents?',
            icon: Sparkles,
          },
        ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] h-full text-center max-w-2xl mx-auto px-4 py-8 select-none animate-in fade-in duration-200">
      {/* Brand Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200/50 mb-4">
        <Sparkles size={28} />
      </div>

      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
        DOCUMIND AI
      </h2>
      <p className="mt-1.5 text-xs text-slate-500 max-w-md leading-relaxed">
        {sessionDocCount > 0
          ? `Grounded across ${sessionDocCount} attached session document(s). Ask questions or select an action below.`
          : 'Grounded document assistant. Query single or multi-document corpuses with vector search and memory.'}
      </p>

      {/* Suggestion Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-6 text-left">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex flex-col justify-between p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-xs transition cursor-pointer text-left"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 group-hover:text-indigo-700 transition">
                  <Icon size={14} className="text-indigo-500 shrink-0" />
                  <span>{item.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-end text-[10px] font-semibold text-slate-300 group-hover:text-indigo-600 transition">
                <span className="opacity-0 group-hover:opacity-100 transition mr-1">Ask this</span>
                <ArrowRight size={12} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(EmptyChatState);
