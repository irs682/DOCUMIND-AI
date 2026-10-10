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
  similarities: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  differences: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  added: 'bg-blue-50 text-blue-700 border-blue-200',
  removed: 'bg-rose-50 text-rose-700 border-rose-200',
  modified: 'bg-amber-50 text-amber-700 border-amber-200',
  numericalChanges: 'bg-purple-50 text-purple-700 border-purple-200',
  dateChanges: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  requirementChanges: 'bg-orange-50 text-orange-700 border-orange-200',
  tableChanges: 'bg-teal-50 text-teal-700 border-teal-200',
  contradictions: 'bg-red-100 text-red-800 border-red-300 font-bold',
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl transform bg-white shadow-2xl transition-all flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 bg-slate-50/70">
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                    categoryColors[category] || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {categoryLabels[category] || category}
                </span>
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  Severity: {severity}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Explanation */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Explanation of Change
              </h4>
              <p className="text-sm leading-relaxed text-slate-700 bg-indigo-50/40 border border-indigo-100/80 p-4 rounded-xl">
                {description}
              </p>
            </div>

            {/* Side-by-Side Comparison Snippets */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Evidence Comparison
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document A Source */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">
                      {docAName || 'Document A'}
                    </span>
                    {sourceA && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Page {sourceA.page || 1}
                      </span>
                    )}
                  </div>
                  {sourceA?.section && (
                    <div className="text-[11px] text-indigo-600 font-medium truncate">
                      Section: {sourceA.section}
                    </div>
                  )}
                  <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800 border border-slate-100 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                    {sourceA?.snippet || 'Content not present in Document A'}
                  </div>
                </div>

                {/* Document B Source */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 truncate max-w-[180px]">
                      {docBName || 'Document B'}
                    </span>
                    {sourceB && (
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        Page {sourceB.page || 1}
                      </span>
                    )}
                  </div>
                  {sourceB?.section && (
                    <div className="text-[11px] text-indigo-600 font-medium truncate">
                      Section: {sourceB.section}
                    </div>
                  )}
                  <div className="rounded-lg bg-white p-3 font-mono text-xs text-slate-800 border border-indigo-100 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                    {sourceB?.snippet || 'Content not present in Document B'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-xs"
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
