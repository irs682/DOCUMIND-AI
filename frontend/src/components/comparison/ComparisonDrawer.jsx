import React from 'react';
import { X, FileText, AlertTriangle, Info, CheckCircle, ArrowRight } from 'lucide-react';

const categoryLabels = {
  similarities: 'Unchanged / Consistent',
  differences: 'Difference',
  added: 'Added in Document B',
  removed: 'Removed from Document B',
  modified: 'Modified Requirement / Text',
  numericalChanges: 'Numerical Change',
  dateChanges: 'Date Change',
  requirementChanges: 'Requirement Change',
  tableChanges: 'Table Difference',
  contradictions: 'Direct Contradiction',
};

const categoryColors = {
  similarities: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  differences: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
  added: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  removed: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
  modified: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  numericalChanges: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
  dateChanges: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
  requirementChanges: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60',
  tableChanges: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
  contradictions: 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 font-bold',
};

const ComparisonDrawer = ({ finding, isOpen, onClose, docAName, docBName }) => {
  if (!isOpen || !finding) return null;

  const {
    title,
    description,
    category = 'modified',
    severity = 'medium',
    sourceA,
    sourceB,
  } = finding;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl transform bg-white dark:bg-slate-900 shadow-2xl transition-all flex flex-col border-l border-transparent dark:border-slate-800">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5 bg-slate-50/70 dark:bg-slate-900/80">
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                    categoryColors[category] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {categoryLabels[category] || category}
                </span>
                <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Severity: {severity}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Explanation */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Explanation of Change
              </h4>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/40 p-4 rounded-xl">
                {description}
              </p>
            </div>

            {/* Side-by-Side Comparison Snippets */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Evidence Comparison
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document A Source */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                      {docAName || 'Document A'}
                    </span>
                    {sourceA && (
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Page {sourceA.page || 1}
                      </span>
                    )}
                  </div>
                  {sourceA?.section && (
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                      Section: {sourceA.section}
                    </div>
                  )}
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 font-mono text-xs text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                    {sourceA?.snippet || 'Content not present in Document A'}
                  </div>
                </div>

                {/* Document B Source */}
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 truncate max-w-[180px]">
                      {docBName || 'Document B'}
                    </span>
                    {sourceB && (
                      <span className="rounded bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        Page {sourceB.page || 1}
                      </span>
                    )}
                  </div>
                  {sourceB?.section && (
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                      Section: {sourceB.section}
                    </div>
                  )}
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-3 font-mono text-xs text-slate-800 dark:text-slate-200 border border-indigo-100 dark:border-indigo-900/40 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                    {sourceB?.snippet || 'Content not present in Document B'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-900 dark:bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-indigo-500 transition shadow-xs"
            >
              Done Inspecting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonDrawer;
