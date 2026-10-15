import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  ChevronRight,
  ChevronLeft,
  X,
  Send,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Layers,
  BarChart2,
  FileText,
  RotateCcw,
} from 'lucide-react';

const QUICK_PROMPTS = [
  'Why is my research readiness only 72%?',
  'What claims lack citation support?',
  'How do I strengthen the related work matrix?',
  'What benchmark is needed to validate H2?',
];

const COPILOT_RESPONSES = {
  'Why is my research readiness only 72%?':
    'Your workflow progress is 11/11, but readiness is gated at 72% because Step 9 (Empirical Results) has 0 verified benchmark runs. In academic publishing, manuscripts without verified experimental validation remain pre-experimental drafts. Log test metrics in Step 9 to unlock 90%+ readiness.',
  'What claims lack citation support?':
    'In Section 3 (Related Work), paragraph 2 discusses "memory retrieval efficiency in 7B generalist policies" supported by only one unique paper citation. Ingest at least 2 additional baseline papers to substantiate the multi-modal latency claim.',
  'How do I strengthen the related work matrix?':
    'Your Step 4 Comparison Matrix currently compares 2 models across accuracy. Adding throughput (FPS), hardware VRAM requirements, and action chunking dimensions will strengthen your paper against reviewer scrutiny.',
  'What benchmark is needed to validate H2?':
    'Hypothesis H2 specifies closed-loop uncertainty estimation. We recommend adding the CALVIN 5-task sequential manipulation benchmark or LIBERO long-horizon robotic suite.',
};

const ResearchCopilotDrawer = ({ project, isOpen, onToggle }) => {
  const [messages, setMessages] = useState([
    {
      sender: 'copilot',
      text: 'Good evening, Irshad. I am your DOCUMIND Research Copilot. Based on your active MERA-VLA project, here are your highest-leverage actions to reach publication readiness.',
      time: 'Just now',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'chat'

  // Dynamic next actions derived from project status
  const recommendedActions = [
    {
      id: 'a1',
      title: 'Log Verified Benchmark Run',
      priority: 'critical',
      desc: 'Verify at least 1 empirical test run in Step 9 to unlock 90%+ readiness.',
      link: `/research`,
      tag: 'Empirical Gate',
    },
    {
      id: 'a2',
      title: 'Strengthen Related Work Citations',
      priority: 'high',
      desc: 'Add 2 additional VLA papers to substantiate cross-modal memory claims.',
      link: `/documents`,
      tag: 'Literature',
    },
    {
      id: 'a3',
      title: 'Review Equation (4) Nomenclature',
      priority: 'medium',
      desc: 'Ensure all mathematical variables in the action loss objective are formally defined.',
      link: `/research`,
      tag: 'Formulation',
    },
    {
      id: 'a4',
      title: 'Run 19D Quality Audit',
      priority: 'info',
      desc: 'Validate Section 11 manuscript against IEEE/ACM reproducibility standards.',
      link: `/research`,
      tag: 'Integrity',
    },
  ];

  const handleSendPrompt = (promptText) => {
    const textToSend = promptText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: 'Just now',
    };

    const replyText =
      COPILOT_RESPONSES[textToSend] ||
      `DOCUMIND Analysis: Based on "${project?.title || 'MERA-VLA'}", evidence ledger shows high methodology precision (94%), but experimental validation is pending. Focus on adding verified benchmark logs to elevate your research score.`;

    const copilotMsg = {
      sender: 'copilot',
      text: replyText,
      time: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg, copilotMsg]);
    setInputQuery('');
    setActiveTab('chat');
  };

  return (
    <>
      {/* Floating Toggle Button (Always visible on right edge when closed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 px-2.5 py-3 rounded-l-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xl border-y border-l border-indigo-400/40 hover-lift transition-all cursor-pointer group"
          title="Open AI Research Copilot"
        >
          <Sparkles size={16} className="animate-spin-slow" />
          <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] uppercase tracking-wider font-extrabold">
            Research Copilot
          </span>
        </button>
      )}

      {/* Slide-over Drawer Panel */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  DOCUMIND Copilot
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400">
                Context: {project?.title?.slice(0, 22) || 'MERA-VLA Study'}...
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-4 pt-3 gap-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Next Best Actions ({recommendedActions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            AI Analysis Q&amp;A
          </button>
        </div>

        {/* Tab 1: Recommended Actions List */}
        {activeTab === 'actions' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              High-Impact Next Steps
            </div>

            {recommendedActions.map((action) => (
              <div
                key={action.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      action.priority === 'critical'
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                        : action.priority === 'high'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                        : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {action.tag}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Priority: {action.priority}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {action.desc}
                  </p>
                </div>

                <div className="pt-1 flex justify-end">
                  <a
                    href={action.link}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span>Execute in Workflow</span>
                    <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            ))}

            {/* Quick Diagnostic Trigger Card */}
            <div className="mt-4 p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                <HelpCircle size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Ask Copilot About Readiness</span>
              </div>
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300 leading-snug">
                Click any scientific diagnostic below to query the evidence ledger:
              </p>
              <div className="space-y-1.5 pt-1">
                {QUICK_PROMPTS.slice(0, 2).map((q, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => handleSendPrompt(q)}
                    className="w-full text-left p-2 rounded-xl bg-white dark:bg-slate-900 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs"
                  >
                    &quot;{q}&quot;
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Copilot Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">
                  {msg.time}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Quick-Ask Input Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-2">
          {/* Quick Prompts Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
            {QUICK_PROMPTS.map((prompt, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleSendPrompt(prompt)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 whitespace-nowrap shadow-2xs font-medium"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask Copilot about evidence, gaps..."
              className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
};

export default ResearchCopilotDrawer;
