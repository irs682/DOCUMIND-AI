import React, { useState } from 'react';
import {
  BarChart2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  FileCheck,
  AlertCircle,
  Database,
  Quote,
} from 'lucide-react';

const Step8Benchmarks = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const [newBaselineName, setNewBaselineName] = useState('');
  const [newBaselineMetric, setNewBaselineMetric] = useState('');
  const [newBaselineScore, setNewBaselineScore] = useState('');
  const [newBaselineCitation, setNewBaselineCitation] = useState('');

  const baselines = project?.baselines || [];
  const benchmarks = project?.benchmarks || [];
  const metrics = project?.metrics || [];

  const handleExtractBaselines = async () => {
    setError('');
    try {
      await onExecuteStep(8);
    } catch (err) {
      setError(err.message || 'Baselines extraction failed');
    }
  };

  const handleAddBaseline = async (e) => {
    e.preventDefault();
    if (!newBaselineName.trim() || !newBaselineScore.trim()) return;

    const newBaseline = {
      name: newBaselineName.trim(),
      sourcePaper: 'User Specified',
      metricName: newBaselineMetric.trim() || 'Primary Metric',
      score: newBaselineScore.trim(),
      citation: newBaselineCitation.trim() || 'Manual reference',
    };

    const updated = [...baselines, newBaseline];
    await onUpdateProject({ baselines: updated });
    setNewBaselineName('');
    setNewBaselineMetric('');
    setNewBaselineScore('');
    setNewBaselineCitation('');
  };

  const handleDeleteBaseline = async (idx) => {
    const updated = baselines.filter((_, i) => i !== idx);
    await onUpdateProject({ baselines: updated });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Step 8 — Benchmarks, Baselines & Extracted Prior Results
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Establish evaluation protocols and extract published scores directly from the papers with
            strict page/table citation citations. No synthetic scores will be invented.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExtractBaselines}
          disabled={isExecuting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs shrink-0"
        >
          <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
          <span>{isExecuting ? 'Extracting SOTA Scores...' : 'Extract Baselines from Papers'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Extracted Baselines Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Published Baseline Models & Reported Scores
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">{baselines.length} baselines registered</span>
        </div>

        {baselines.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2">
            <Database size={24} className="text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">No prior model scores extracted yet.</p>
            <p className="text-[11px] text-slate-400">
              Click "Extract Baselines from Papers" above to pull numbers from tables and text.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Baseline Model</th>
                  <th className="py-3 px-4 font-bold">Source Paper</th>
                  <th className="py-3 px-4 font-bold">Target Metric</th>
                  <th className="py-3 px-4 font-bold">Reported Score</th>
                  <th className="py-3 px-4 font-bold">Source Evidence Citation</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {baselines.map((base, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{base.name}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{base.sourcePaper}</td>
                    <td className="py-3 px-4 font-medium text-indigo-700">{base.metricName}</td>
                    <td className="py-3 px-4 font-bold font-mono text-emerald-700 text-xs">
                      {base.score}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                        <FileCheck size={11} className="text-indigo-600" />
                        {base.citation || 'Page & Table reference'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteBaseline(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Manual Baseline Addition Form */}
        <form
          onSubmit={handleAddBaseline}
          className="p-4 bg-slate-50/60 border-t border-slate-100 grid gap-2 sm:grid-cols-5 items-end"
        >
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Model Name</label>
            <input
              type="text"
              required
              value={newBaselineName}
              onChange={(e) => setNewBaselineName(e.target.value)}
              placeholder="e.g. OpenVLA-7B"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Metric</label>
            <input
              type="text"
              value={newBaselineMetric}
              onChange={(e) => setNewBaselineMetric(e.target.value)}
              placeholder="e.g. Success Rate"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Score</label>
            <input
              type="text"
              required
              value={newBaselineScore}
              onChange={(e) => setNewBaselineScore(e.target.value)}
              placeholder="e.g. 91.2%"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Evidence Citation</label>
            <input
              type="text"
              value={newBaselineCitation}
              onChange={(e) => setNewBaselineCitation(e.target.value)}
              placeholder="e.g. Page 7, Table 2"
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 p-2 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <Plus size={13} /> Add Baseline
            </button>
          </div>
        </form>
      </div>

      {/* Target Benchmarks & Metrics Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Target Evaluation Benchmarks ({benchmarks.length})
          </h4>
          <div className="space-y-2">
            {benchmarks.length === 0 ? (
              <p className="text-xs text-slate-400">Extracting baselines will populate benchmarks.</p>
            ) : (
              benchmarks.map((bm, bIdx) => (
                <div
                  key={bIdx}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-800">{bm.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{bm.domain || 'Robotics / Vision'}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Standardized Evaluation Metrics ({metrics.length})
          </h4>
          <div className="space-y-2">
            {metrics.length === 0 ? (
              <p className="text-xs text-slate-400">Standard metrics will be aligned with baselines.</p>
            ) : (
              metrics.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-800">{m.name}</span>
                  <span className="text-[11px] text-slate-500">{m.definition || 'Primary evaluation standard'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Step 7: Methodology</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <span>Continue to Step 9: User Results</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step8Benchmarks;
