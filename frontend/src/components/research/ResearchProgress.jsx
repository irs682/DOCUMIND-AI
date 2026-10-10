import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

const ResearchProgress = ({ progress = 45, currentAction = 'Synthesizing vector passages...' }) => {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
        <Loader2 size={28} className="animate-spin" />
      </div>

      <div>
        <h4 className="text-base font-bold text-slate-900">Deep Research in Progress</h4>
        <p className="mt-1 text-xs font-semibold text-indigo-600">{currentAction}</p>
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Vector Search & Extraction</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default ResearchProgress;
