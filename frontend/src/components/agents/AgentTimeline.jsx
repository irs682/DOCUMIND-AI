import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

const AgentTimeline = ({ steps = [], currentStepIndex = 0, isComplete = false }) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Agent Task Execution Timeline
        </h4>
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          {isComplete ? 'Execution Completed' : `Step ${currentStepIndex + 1} of ${steps.length}`}
        </span>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex || isComplete;
          const isCurrent = idx === currentStepIndex && !isComplete;

          return (
            <div key={idx} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 size={18} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
                ) : (
                  <Circle size={18} className="text-slate-300 dark:text-slate-700" />
                )}
              </div>

              <div className="space-y-0.5">
                <p
                  className={`text-xs font-bold ${
                    isDone
                      ? 'text-slate-900 dark:text-white'
                      : isCurrent
                      ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentTimeline;
