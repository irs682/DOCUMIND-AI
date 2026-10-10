import React, { useState } from 'react';
import {
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Save,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const Step10Discussion = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [discussion, setDiscussion] = useState(
    project?.discussion || {
      performanceAnalysis: '',
      generalizationAndRobustness: '',
      tradeoffsAndCosts: '',
      failureCases: '',
      hypothesesValidation: '',
      literatureRelationship: '',
      speculationDisclaimer:
        'All causal claims are framed as plausible interpretations subject to empirical bounds.',
    }
  );

  const handleGenerateDiscussion = async () => {
    setError('');
    try {
      const res = await onExecuteStep(10);
      if (res?.discussion) {
        setDiscussion(res.discussion);
      }
    } catch (err) {
      setError(err.message || 'Discussion synthesis failed');
    }
  };

  const handleFieldChange = (field, val) => {
    setDiscussion((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleSave = async () => {
    try {
      await onUpdateProject({ discussion });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError('Failed to save discussion');
    }
  };

  const handleNext = async () => {
    await handleSave();
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Step 10 — Evidence-Grounded Scientific Discussion
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Interpret experimental outcomes, evaluate hypotheses validation, discuss trade-offs, and
            contextualize findings against literature.
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
            onClick={handleGenerateDiscussion}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
          >
            <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
            <span>{isExecuting ? 'Synthesizing Discussion...' : 'Generate Discussion Section'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Epistemological Rigor Guard */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start gap-3 text-xs text-indigo-950">
        <ShieldCheck size={18} className="shrink-0 text-indigo-600 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Epistemological Rigor Boundary:</span>
          <p className="text-indigo-900 leading-relaxed">
            Claims are segregated into verified empirical evidence, plausible mechanistic
            interpretations, and clearly labeled speculative hypotheses to prevent ungrounded
            causal assertions.
          </p>
        </div>
      </div>

      {/* Discussion Subsections */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Performance Analysis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Why Performance Improved (Mechanistic Factors)
          </label>
          <textarea
            rows={4}
            value={discussion.performanceAnalysis || ''}
            onChange={(e) => handleFieldChange('performanceAnalysis', e.target.value)}
            placeholder="Attribution of performance gains to specific architectural components or training representations..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Hypotheses Validation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Hypotheses Validation (H1–H3 Evaluation)
          </label>
          <textarea
            rows={4}
            value={discussion.hypothesesValidation || ''}
            onChange={(e) => handleFieldChange('hypothesesValidation', e.target.value)}
            placeholder="Assess whether empirical evidence supports or refutes initial hypotheses H1, H2, and H3..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Trade-offs & Computational Costs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Trade-offs & Computational Overhead
          </label>
          <textarea
            rows={4}
            value={discussion.tradeoffsAndCosts || ''}
            onChange={(e) => handleFieldChange('tradeoffsAndCosts', e.target.value)}
            placeholder="Inference latency, parameter count, FLOPs, memory footprint, or sample complexity trade-offs..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Generalization & Robustness */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Generalization & Robustness Under Distribution Shift
          </label>
          <textarea
            rows={4}
            value={discussion.generalizationAndRobustness || ''}
            onChange={(e) => handleFieldChange('generalizationAndRobustness', e.target.value)}
            placeholder="Performance on out-of-distribution environments, sensor noise, or unseen task variants..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Failure Modes & Edge Cases */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Identified Failure Cases & Bottlenecks
          </label>
          <textarea
            rows={3}
            value={discussion.failureCases || ''}
            onChange={(e) => handleFieldChange('failureCases', e.target.value)}
            placeholder="Specific tasks or conditions where the proposed model fails or underperforms baseline..."
            className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Relationship to Prior Literature */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Relationship to Prior Literature
          </label>
          <textarea
            rows={3}
            value={discussion.literatureRelationship || ''}
            onChange={(e) => handleFieldChange('literatureRelationship', e.target.value)}
            placeholder="Comparison of findings with published literature: corroborations, contradictions, and new insights..."
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
          <span>Step 9: Results</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <span>Continue to Step 11: Paper Draft</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step10Discussion;
