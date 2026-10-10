import React from 'react';
import { AlertCircle, CheckCircle2, Circle, Loader2 } from 'lucide-react';

const STAGES = [
  { id: 'prepare', label: 'Preparing document', match: ['prepar'] },
  { id: 'extract', label: 'Extracting information', match: ['extract', 'batch'] },
  { id: 'merge', label: 'Merging and validating results', match: ['merg', 'validat', 'deduplic'] },
  { id: 'complete', label: 'Complete', match: ['complete'] },
];

const firstFiniteNumber = (...values) => {
  const value = values.find((candidate) => Number.isFinite(Number(candidate)));
  return value === undefined ? null : Number(value);
};

const resolveStageIndex = (status, processingStep) => {
  const normalizedStatus = String(status || '').toUpperCase();
  if (normalizedStatus === 'COMPLETED') return STAGES.length - 1;
  if (normalizedStatus === 'FAILED') return -1;

  const step = String(processingStep || '').toLowerCase();
  const matchIndex = STAGES.findIndex((stage) => stage.match.some((term) => step.includes(term)));
  return matchIndex >= 0 ? matchIndex : 0;
};

const ExtractionProgress = ({ extraction, compact = false }) => {
  const status = String(extraction?.status || 'QUEUED').toUpperCase();
  const processingStep = extraction?.processingStep || 'Preparing document';
  const batchStats = extraction?.batchStats || {};
  const totalBatches = firstFiniteNumber(batchStats.totalBatches, batchStats.total, extraction?.totalBatches);
  const completedBatches = firstFiniteNumber(
    batchStats.completedBatches,
    batchStats.successfulBatches,
    batchStats.processedBatches,
    extraction?.completedBatches
  );
  const stageIndex = resolveStageIndex(status, processingStep);
  const hasBatchProgress = totalBatches !== null && totalBatches > 0 && completedBatches !== null;
  const batchPercent = hasBatchProgress
    ? Math.max(0, Math.min(100, Math.round((completedBatches / totalBatches) * 100)))
    : null;
  const isFailed = status === 'FAILED';

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-xs ${compact ? 'p-4' : 'p-6 sm:p-8'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex shrink-0 items-center justify-center rounded-xl ${compact ? 'h-9 w-9' : 'h-11 w-11'} ${isFailed ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
          {isFailed ? <AlertCircle size={compact ? 18 : 22} /> : <Loader2 size={compact ? 18 : 22} className="animate-spin" />}
        </div>
        <div className="min-w-0">
          <h2 className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-slate-900`}>
            {isFailed ? 'Extraction could not be completed' : 'Extracting information'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {isFailed
              ? extraction?.errorMessage || 'Some document information could not be extracted. Please try again.'
              : processingStep}
          </p>
        </div>
      </div>

      {!isFailed && (
        <>
          <div className={`grid gap-3 ${compact ? 'mt-5 grid-cols-2 sm:grid-cols-4' : 'mt-7 grid-cols-1 sm:grid-cols-4'}`}>
            {STAGES.map((stage, index) => {
              const isComplete = status === 'COMPLETED' || index < stageIndex;
              const isCurrent = index === stageIndex && status !== 'COMPLETED';

              return (
                <div key={stage.id} className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 size={16} className="shrink-0 animate-spin text-indigo-600" />
                  ) : (
                    <Circle size={16} className="shrink-0 text-slate-300" />
                  )}
                  <span className={`text-xs font-semibold ${isComplete ? 'text-slate-700' : isCurrent ? 'text-indigo-700' : 'text-slate-400'}`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {hasBatchProgress && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Processed document batches</span>
                <span>{Math.min(completedBatches, totalBatches)} of {totalBatches}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${batchPercent}%` }} />
              </div>
            </div>
          )}

          {!compact && !hasBatchProgress && (
            <p className="mt-6 text-xs text-slate-400">
              Progress updates appear as the document extraction service reports completed stages.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ExtractionProgress;
