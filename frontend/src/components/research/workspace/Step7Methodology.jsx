import React, { useState } from 'react';
import {
  Cpu,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  GitBranch,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react';

const Step7Methodology = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [methodology, setMethodology] = useState(
    project?.methodology || {
      proposedArchitecture: '',
      dataset: '',
      preprocessing: '',
      model: '',
      trainingStrategy: '',
      algorithm: '',
      ablationPlan: '',
      statisticalAnalysis: '',
      flowchartSteps: [
        'Input Data & Sensor Streams',
        'Feature Preprocessing & Tokenization',
        'Proposed Model Backbone & Attention Mechanism',
        'Optimization & Objective Function',
        'Downstream Evaluation on Test Split',
        'Benchmark Comparison vs SOTA Baselines',
      ],
    }
  );

  const handleDraftMethodology = async () => {
    setError('');
    try {
      const res = await onExecuteStep(7);
      if (res?.methodology) {
        setMethodology(res.methodology);
      }
    } catch (err) {
      setError(err.message || 'Methodology formulation failed');
    }
  };

  const handleFieldChange = (field, val) => {
    setMethodology((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleSave = async () => {
    try {
      await onUpdateProject({ methodology });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError('Failed to save methodology');
    }
  };

  const handleNext = async () => {
    await handleSave();
    onNext();
  };

  const flowchartSteps = methodology.flowchartSteps || [
    'Input Data',
    'Preprocessing',
    'Proposed Model',
    'Training',
    'Evaluation',
    'Benchmark Comparison',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Step 7 — Proposed Methodology Workspace</h2>
          <p className="text-sm text-slate-500 mt-1">
            Formulate your proposed architecture, algorithmic novelty, training pipeline, and
            statistical validation plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
          >
            <Save size={13} />
            <span>{saveSuccess ? 'Saved!' : 'Save Progress'}</span>
          </button>
          <button
            type="button"
            onClick={handleDraftMethodology}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
          >
            <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
            <span>{isExecuting ? 'Drafting Pipeline...' : 'Synthesize Methodology'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Visual Methodology Flowchart */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex items-center gap-2 mb-4 text-indigo-300 text-xs font-bold uppercase tracking-wider">
          <GitBranch size={16} />
          <span>System Pipeline Flowchart</span>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-2 overflow-x-auto pb-2">
          {flowchartSteps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex-1 min-w-[130px] rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 p-3 text-center space-y-1">
                <span className="text-[10px] font-mono text-indigo-300 block">Stage 0{idx + 1}</span>
                <p className="text-xs font-bold leading-tight text-white">{step}</p>
              </div>
              {idx < flowchartSteps.length - 1 && (
                <div className="text-indigo-400 font-bold shrink-0 hidden md:block">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Editable Methodology Form */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Architecture */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Proposed Architecture
          </label>
          <textarea
            rows={4}
            value={methodology.proposedArchitecture || ''}
            onChange={(e) => handleFieldChange('proposedArchitecture', e.target.value)}
            placeholder="Detailed description of the neural architecture, attention layers, encoder-decoder structure..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Algorithm & Algorithmic Novelty */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Algorithm / Pseudocode Description
          </label>
          <textarea
            rows={4}
            value={methodology.algorithm || ''}
            onChange={(e) => handleFieldChange('algorithm', e.target.value)}
            placeholder="Step-by-step mathematical algorithm, policy extraction, or retrieval heuristic..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Dataset & Preprocessing */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Dataset & Feature Preprocessing
          </label>
          <textarea
            rows={4}
            value={methodology.preprocessing || ''}
            onChange={(e) => handleFieldChange('preprocessing', e.target.value)}
            placeholder="Train/val/test splits, normalization, tokenization, data augmentation policies..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Training Strategy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Training Strategy & Loss Functions
          </label>
          <textarea
            rows={4}
            value={methodology.trainingStrategy || ''}
            onChange={(e) => handleFieldChange('trainingStrategy', e.target.value)}
            placeholder="Optimizer (AdamW), learning rate schedule, batch size, loss objective, hardware compute budget..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Ablation Study Plan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Ablation Study Plan
          </label>
          <textarea
            rows={3}
            value={methodology.ablationPlan || ''}
            onChange={(e) => handleFieldChange('ablationPlan', e.target.value)}
            placeholder="Components to isolate: e.g. without attention layer, with frozen backbone, variations of prompt tokens..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Statistical Analysis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Statistical Validation & Significance
          </label>
          <textarea
            rows={3}
            value={methodology.statisticalAnalysis || ''}
            onChange={(e) => handleFieldChange('statisticalAnalysis', e.target.value)}
            placeholder="Multi-seed runs (e.g. 5 random seeds), confidence intervals, paired t-tests or Wilcoxon signed-rank tests..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
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
          <span>Step 6: Questions</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <span>Continue to Step 8: Benchmarks & Baselines</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step7Methodology;
