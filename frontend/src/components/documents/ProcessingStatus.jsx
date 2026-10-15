import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 1, label: '01 Upload complete' },
  { id: 2, label: '02 Reading document' },
  { id: 3, label: '03 Extracting text' },
  { id: 4, label: '04 Detecting scanned pages' },
  { id: 5, label: '05 Extracting tables' },
  { id: 6, label: '06 Preparing sections' },
  { id: 7, label: '07 Creating AI index' },
  { id: 8, label: '08 Ready' },
];

const parseStepNumber = (stepVal, status) => {
  if (status === 'completed' || status === 'ready' || status === 'indexed') return 8;
  if (typeof stepVal === 'number') {
    // If old 1..5 scale was passed:
    if (stepVal === 5) return 8;
    if (stepVal === 4) return 7;
    return stepVal;
  }
  if (typeof stepVal === 'string') {
    const match = stepVal.match(/^0?(\d+)/);
    if (match) return parseInt(match[1], 10);
    if (stepVal.toLowerCase().includes('upload')) return 1;
    if (stepVal.toLowerCase().includes('read')) return 2;
    if (stepVal.toLowerCase().includes('extract') && stepVal.toLowerCase().includes('text')) return 3;
    if (stepVal.toLowerCase().includes('scan') || stepVal.toLowerCase().includes('ocr')) return 4;
    if (stepVal.toLowerCase().includes('table')) return 5;
    if (stepVal.toLowerCase().includes('section') || stepVal.toLowerCase().includes('clean')) return 6;
    if (stepVal.toLowerCase().includes('index') || stepVal.toLowerCase().includes('embed')) return 7;
    if (stepVal.toLowerCase().includes('ready')) return 8;
  }
  return 1;
};

const ProcessingStatus = ({ currentStep, processingStep, status = 'completed' }) => {
  const activeStepNum = parseStepNumber(processingStep || currentStep, status);
  const isAllDone = status === 'completed' || status === 'ready' || status === 'indexed' || activeStepNum >= 8;
  const isFailed = status === 'failed' || status === 'error';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Ingestion Pipeline Status
        </h4>
        {isAllDone && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={11} /> Ready
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle size={11} /> Failed
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {PIPELINE_STEPS.map((step) => {
          const isDone = isAllDone || step.id < activeStepNum;
          const isCurrent = !isAllDone && step.id === activeStepNum && !isFailed;

          return (
            <div key={step.id} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 size={16} className="text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
              ) : isFailed && step.id === activeStepNum ? (
                <AlertCircle size={16} className="text-rose-500 dark:text-rose-400 shrink-0" />
              ) : (
                <Circle size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
              )}
              <span
                className={`text-xs font-semibold tracking-tight ${
                  isDone
                    ? 'text-slate-700 dark:text-slate-300'
                    : isCurrent
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : isFailed && step.id === activeStepNum
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessingStatus;
