import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';

const PROGRESS_STEPS = (paperCount) => [
  { id: 'read', label: `Reading ${paperCount} paper${paperCount === 1 ? '' : 's'}` },
  { id: 'compare', label: 'Comparing methods and datasets' },
  { id: 'extract', label: 'Extracting key findings' },
  { id: 'gaps', label: 'Checking research gaps' },
  { id: 'report', label: 'Preparing report & verified citations' },
];

const ResearchStudioProgress = ({ progress = 35, numberOfPapers = 2 }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const steps = PROGRESS_STEPS(numberOfPapers || 2);

  useEffect(() => {
    const idx = Math.min(
      steps.length - 1,
      Math.floor((progress / 100) * steps.length)
    );
    setCurrentIdx(idx);
  }, [progress, steps.length]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Loader2 size={20} className="animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Analyzing your papers...</h3>
            <p className="text-xs text-slate-500">Cross-document analysis with verified evidence</p>
          </div>
        </div>
        <span className="text-sm font-bold text-indigo-600">{Math.round(progress)}%</span>
      </div>

      {/* Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Simple Checklist */}
      <div className="space-y-3 pt-1">
        {steps.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-colors ${
                isCurrent
                  ? 'border-indigo-200 bg-indigo-50/50 text-indigo-950 font-semibold'
                  : isDone
                  ? 'border-slate-100 bg-slate-50/50 text-slate-700'
                  : 'border-transparent text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                {isDone && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                {isCurrent && <Loader2 size={16} className="animate-spin text-indigo-600 shrink-0" />}
                {isPending && <Clock size={16} className="text-slate-300 shrink-0" />}
                <span>{step.label}</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {isDone ? 'Done' : isCurrent ? 'Working' : 'Queued'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResearchStudioProgress;
