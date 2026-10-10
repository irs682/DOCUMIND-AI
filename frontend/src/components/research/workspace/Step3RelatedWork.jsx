import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
  ShieldCheck,
} from 'lucide-react';

const Step3RelatedWork = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'synthesis'

  const relatedWork = project?.relatedWork || {
    table: [],
    commonApproaches: '',
    mainDifferences: '',
    strongestMethods: '',
    commonDatasets: '',
    commonBenchmarks: '',
    commonLimitations: '',
  };

  const handleSynthesize = async () => {
    setError('');
    try {
      await onExecuteStep(3);
    } catch (err) {
      setError(err.message || 'Literature synthesis failed');
    }
  };

  const handleUpdateField = async (field, val) => {
    const updated = {
      ...relatedWork,
      [field]: val,
    };
    await onUpdateProject({ relatedWork: updated });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Step 3 — Related Work & Literature Review</h2>
          <p className="text-sm text-slate-500 mt-1">
            Systematic overview of ingested literature. Compares core problems, methods, datasets,
            best results, and recognized limitations across every paper.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSynthesize}
          disabled={isExecuting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs shrink-0"
        >
          <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
          <span>{isExecuting ? 'Synthesizing Literature...' : 'Generate Literature Matrix'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'table'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TableIcon size={14} />
          <span>Structured Literature Table ({relatedWork.table?.length || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('synthesis')}
          className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'synthesis'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={14} />
          <span>Synthesis Insights (Patterns & Limitations)</span>
        </button>
      </div>

      {/* View 1: Structured Table */}
      {activeTab === 'table' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {(!relatedWork.table || relatedWork.table.length === 0) ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Literature Matrix Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click "Generate Literature Matrix" above to extract problems, methods, datasets,
                metrics, and limitations from your ingested papers.
              </p>
              <button
                type="button"
                onClick={handleSynthesize}
                disabled={isExecuting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <Sparkles size={13} />
                <span>Extract from Papers</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Paper Title</th>
                    <th className="py-3 px-4 font-bold">Problem</th>
                    <th className="py-3 px-4 font-bold">Method</th>
                    <th className="py-3 px-4 font-bold">Dataset</th>
                    <th className="py-3 px-4 font-bold">Metric</th>
                    <th className="py-3 px-4 font-bold">Best Result</th>
                    <th className="py-3 px-4 font-bold text-amber-900">Limitation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {relatedWork.table.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-[160px] truncate">
                        {row.paper || `Paper ${idx + 1}`}
                      </td>
                      <td className="py-3 px-4 max-w-[180px]">
                        <p className="line-clamp-2" title={row.problem}>
                          {row.problem || 'Not specified'}
                        </p>
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        <span className="font-medium text-indigo-700">{row.method || '—'}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.dataset || 'Standard'}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {row.metric || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-emerald-700 font-mono">
                        {row.bestResult || '—'}
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="line-clamp-2 text-amber-800 text-[11px]" title={row.limitation}>
                          {row.limitation || 'Not reported'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 2: Synthesis Insights */}
      {activeTab === 'synthesis' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Common Approaches & Techniques</span>
            </h4>
            <textarea
              rows={4}
              value={relatedWork.commonApproaches || ''}
              onChange={(e) => handleUpdateField('commonApproaches', e.target.value)}
              placeholder="Synthesized dominant methodologies across the papers..."
              className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-600" />
              <span>Main Architectural Differences</span>
            </h4>
            <textarea
              rows={4}
              value={relatedWork.mainDifferences || ''}
              onChange={(e) => handleUpdateField('mainDifferences', e.target.value)}
              placeholder="Key distinctions in model formulation, loss functions, tokenization..."
              className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Common Datasets & Benchmarks
            </h4>
            <textarea
              rows={3}
              value={relatedWork.commonDatasets || ''}
              onChange={(e) => handleUpdateField('commonDatasets', e.target.value)}
              placeholder="Primary training corpora and public evaluation benchmarks used..."
              className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Common Limitations (Grounded in Papers)
            </h4>
            <textarea
              rows={3}
              value={relatedWork.commonLimitations || ''}
              onChange={(e) => handleUpdateField('commonLimitations', e.target.value)}
              placeholder="Shared failure modes, computational cost, or unaddressed conditions..."
              className="w-full text-xs text-slate-800 border border-amber-200 bg-white rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Nav Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Step 2: Goal</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <span>Continue to Step 4: Comparison</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step3RelatedWork;
