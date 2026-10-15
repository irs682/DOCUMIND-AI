import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Quote,
  Tag,
} from 'lucide-react';

const GAP_CATEGORIES = [
  'Missing variable',
  'Missing dataset',
  'Missing benchmark',
  'Weak generalization',
  'Lack of real-world testing',
  'Missing uncertainty estimation',
  'Missing explainability',
  'No robustness analysis',
  'Missing comparison',
  'High computational cost',
  'Contradictory findings',
  'Limited sample size',
];

const Step5ResearchGap = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const [newGapTitle, setNewGapTitle] = useState('');
  const [newGapCategory, setNewGapCategory] = useState(GAP_CATEGORIES[0]);
  const [newGapDesc, setNewGapDesc] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const gaps = project?.researchGaps || [];

  const handleGenerateGaps = async () => {
    setError('');
    try {
      await onExecuteStep(5);
    } catch (err) {
      setError(err.message || 'Gap analysis generation failed');
    }
  };

  const handleDeleteGap = async (gapId) => {
    const updated = gaps.filter((g) => g.id !== gapId && g._id !== gapId);
    await onUpdateProject({ researchGaps: updated });
  };

  const handleAddCustomGap = async (e) => {
    e.preventDefault();
    if (!newGapTitle.trim()) return;

    const newGap = {
      id: `gap-${Date.now()}`,
      title: newGapTitle.trim(),
      category: newGapCategory,
      description: newGapDesc.trim(),
      evidenceQuote: 'Identified by user through domain analysis.',
      supportingPapers: project?.paperProfiles?.map((p) => (typeof p.title === 'object' && p.title !== null ? (p.title.value || p.title.text || 'Selected Paper') : (p.title || 'Selected Paper'))) || [],
      impact: 'High',
    };

    const updated = [...gaps, newGap];
    await onUpdateProject({ researchGaps: updated });
    setNewGapTitle('');
    setNewGapDesc('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Step 5 — Evidence-Grounded Research Gaps</h2>
          <p className="text-sm text-slate-500 mt-1">
            Isolate unresolved bottlenecks, missing evaluations, and unaddressed variables directly
            from the literature.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
          >
            <Plus size={14} />
            <span>Add Custom Gap</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateGaps}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
          >
            <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
            <span>{isExecuting ? 'Extracting Gaps...' : 'Identify Research Gaps'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Crucial Academic Guard Notice */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert size={18} className="shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Academic Grounding Boundary:</span>
          <p className="text-amber-800 leading-relaxed">
            Within the selected papers, these issues remain unresolved. The agent will not claim "no
            prior research exists in computer science", maintaining sound academic rigor.
          </p>
        </div>
      </div>

      {/* Gaps List */}
      <div className="space-y-4">
        {gaps.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Layers size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Research Gaps Formulated Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click "Identify Research Gaps" to perform automated cross-examination across all
              extracted limitations.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {gaps.map((gap, idx) => (
              <div
                key={gap.id || gap._id || idx}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Tag size={10} />
                        {gap.category || 'General Gap'}
                      </span>
                      {gap.impact && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          Impact: <strong>{gap.impact}</strong>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      GAP-{idx + 1}: {gap.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteGap(gap.id || gap._id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Remove gap"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{gap.description}</p>

                {gap.evidenceQuote && (
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-start gap-2 text-xs text-slate-600 italic">
                    <Quote size={14} className="shrink-0 text-slate-400 mt-0.5" />
                    <p className="line-clamp-2">"{gap.evidenceQuote}"</p>
                  </div>
                )}

                {gap.supportingPapers && gap.supportingPapers.length > 0 && (
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-600">Grounded in:</span>
                    {gap.supportingPapers.map((paperTitle, pIdx) => (
                      <span
                        key={pIdx}
                        className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] truncate max-w-xs"
                      >
                        {paperTitle}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal to add custom gap */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add New Research Gap</h3>
            <form onSubmit={handleAddCustomGap} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Gap Title
                </label>
                <input
                  type="text"
                  required
                  value={newGapTitle}
                  onChange={(e) => setNewGapTitle(e.target.value)}
                  placeholder="e.g. Lack of real-world latency evaluation under jitter"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={newGapCategory}
                  onChange={(e) => setNewGapCategory(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                >
                  {GAP_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  value={newGapDesc}
                  onChange={(e) => setNewGapDesc(e.target.value)}
                  placeholder="Explain why this gap limits current methods..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Save Gap
                </button>
              </div>
            </form>
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
          <span>Step 4: Comparison</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <span>Continue to Step 6: Questions & Hypotheses</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step5ResearchGap;
