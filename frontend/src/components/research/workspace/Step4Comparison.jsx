import React, { useState } from 'react';
import {
  GitCompare,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

const Step4Comparison = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const matrix = project?.comparisonMatrix || [];
  const compat = project?.benchmarkCompatibility || {
    status: '',
    verdictTitle: '',
    explanation: '',
    factors: [],
    caveatWarning: '',
  };

  const handleGenerateComparison = async () => {
    setError('');
    try {
      await onExecuteStep(4);
    } catch (err) {
      setError(err.message || 'Comparison generation failed');
    }
  };

  const getCompatibilityBadge = (status) => {
    if (status === 'DIRECTLY_COMPARABLE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={13} />
          Directly Comparable
        </span>
      );
    }
    if (status === 'CONDITIONALLY_COMPARABLE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
          <AlertTriangle size={13} />
          Conditionally Comparable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <XCircle size={13} />
        Not Directly Comparable
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Step 4 — Paper Comparison & Compatibility Check</h2>
          <p className="text-sm text-slate-500 mt-1">
            Examine methodological differences across models without assuming identical evaluation
            conditions. Missing values are flagged as "Not reported".
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateComparison}
          disabled={isExecuting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs shrink-0"
        >
          <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
          <span>{isExecuting ? 'Analyzing Cross-Paper Matrix...' : 'Generate Comparison Matrix'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Benchmark Compatibility Warning / Verification Banner */}
      {compat.verdictTitle && (
        <div
          className={`rounded-2xl border p-5 space-y-3 ${
            compat.status === 'DIRECTLY_COMPARABLE'
              ? 'border-emerald-200 bg-emerald-50/50'
              : compat.status === 'CONDITIONALLY_COMPARABLE'
              ? 'border-amber-200 bg-amber-50/60'
              : 'border-rose-200 bg-rose-50/60'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <ShieldAlert
                size={20}
                className={
                  compat.status === 'DIRECTLY_COMPARABLE'
                    ? 'text-emerald-700'
                    : compat.status === 'CONDITIONALLY_COMPARABLE'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }
              />
              <h3 className="text-sm font-bold text-slate-900">
                Benchmark Compatibility Check: {compat.verdictTitle}
              </h3>
            </div>
            {getCompatibilityBadge(compat.status)}
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">{compat.explanation}</p>

          {compat.caveatWarning && (
            <div className="rounded-xl bg-white/80 p-3 border border-slate-200 text-xs text-slate-800 font-medium">
              <span className="font-bold text-amber-800">Critical Guard: </span>
              {compat.caveatWarning}
            </div>
          )}

          {compat.factors && compat.factors.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 grid gap-2 sm:grid-cols-2 text-xs">
              {compat.factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-slate-200/50">
                  <div className="mt-0.5">
                    {factor.pass ? (
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : (
                      <XCircle size={13} className="text-rose-500" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{factor.criterion}: </span>
                    <span className="text-slate-600">{factor.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparison Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Cross-Paper Feature & Methodology Matrix
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {matrix.length} dimension{matrix.length === 1 ? '' : 's'} evaluated
          </span>
        </div>

        {matrix.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <GitCompare size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Comparison Matrix Generated</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Run the analysis above to align objectives, architectures, training strategies, and compute
              requirements across all papers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold sticky left-0 bg-slate-50 z-10 w-44">
                    Comparison Dimension
                  </th>
                  {Object.keys(matrix[0]?.values || {}).map((paperKey, i) => (
                    <th key={i} className="py-3 px-4 font-bold min-w-[200px]">
                      {paperKey}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {matrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900 bg-white sticky left-0 border-r border-slate-100">
                      {row.dimension || row.feature}
                    </td>
                    {Object.values(row.values || {}).map((val, cIdx) => {
                      const isNotReported =
                        !val || val === 'Not reported' || val === 'N/A' || val === 'Unspecified';
                      return (
                        <td key={cIdx} className="py-3 px-4 align-top">
                          <span
                            className={
                              isNotReported
                                ? 'italic text-slate-400 font-mono text-[11px]'
                                : 'text-slate-800'
                            }
                          >
                            {val || 'Not reported'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nav Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Step 3: Related Work</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <span>Continue to Step 5: Research Gap</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step4Comparison;
