import React, { useState } from 'react';
import {
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

const Step6Questions = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const [editingRQ, setEditingRQ] = useState(null);
  const [editingH, setEditingH] = useState(null);
  const [newRQText, setNewRQText] = useState('');
  const [newHText, setNewHText] = useState('');

  const questions = project?.researchQuestions || [];
  const hypotheses = project?.hypotheses || [];

  const handleGenerate = async () => {
    setError('');
    try {
      await onExecuteStep(6);
    } catch (err) {
      setError(err.message || 'Generation of questions & hypotheses failed');
    }
  };

  const handleAddRQ = async (e) => {
    e.preventDefault();
    if (!newRQText.trim()) return;
    const newRQ = {
      id: `rq-${Date.now()}`,
      text: newRQText.trim(),
      linkedGap: project?.researchGaps?.[0]?.title || 'Core Research Gap',
    };
    const updated = [...questions, newRQ];
    await onUpdateProject({ researchQuestions: updated });
    setNewRQText('');
  };

  const handleDeleteRQ = async (rqId) => {
    const updated = questions.filter((q) => q.id !== rqId && q._id !== rqId);
    await onUpdateProject({ researchQuestions: updated });
  };

  const handleSaveEditRQ = async (rqId, newText) => {
    const updated = questions.map((q) =>
      q.id === rqId || q._id === rqId ? { ...q, text: newText } : q
    );
    await onUpdateProject({ researchQuestions: updated });
    setEditingRQ(null);
  };

  const handleAddH = async (e) => {
    e.preventDefault();
    if (!newHText.trim()) return;
    const newH = {
      id: `h-${Date.now()}`,
      text: newHText.trim(),
      linkedQuestion: questions?.[0]?.text ? `RQ-1` : 'Primary RQ',
    };
    const updated = [...hypotheses, newH];
    await onUpdateProject({ hypotheses: updated });
    setNewHText('');
  };

  const handleDeleteH = async (hId) => {
    const updated = hypotheses.filter((h) => h.id !== hId && h._id !== hId);
    await onUpdateProject({ hypotheses: updated });
  };

  const handleSaveEditH = async (hId, newText) => {
    const updated = hypotheses.map((h) =>
      h.id === hId || h._id === hId ? { ...h, text: newText } : h
    );
    await onUpdateProject({ hypotheses: updated });
    setEditingH(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Step 6 — Research Questions & Testable Hypotheses
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Formulate formal research questions (RQ1–RQ3) and falsifiable hypotheses (H1–H3) directly
            linked to the identified gaps.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isExecuting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs shrink-0"
        >
          <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
          <span>{isExecuting ? 'Synthesizing Questions...' : 'Generate RQs & Hypotheses'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* Grid: Left = Research Questions, Right = Hypotheses */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Research Questions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Research Questions (RQ)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">{questions.length} questions</span>
          </div>

          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No research questions generated yet. Click above to generate or add below.
              </p>
            ) : (
              questions.map((rq, idx) => (
                <div
                  key={rq.id || rq._id || idx}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      RQ-{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingRQ(editingRQ === rq.id ? null : rq.id)}
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRQ(rq.id || rq._id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {editingRQ === rq.id ? (
                    <div className="space-y-2">
                      <textarea
                        defaultValue={rq.text}
                        id={`edit-rq-${rq.id}`}
                        rows={2}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = document.getElementById(`edit-rq-${rq.id}`)?.value;
                          if (val) handleSaveEditRQ(rq.id, val);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 px-2.5 py-1 rounded"
                      >
                        <Check size={11} /> Save
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-800">{rq.text}</p>
                  )}

                  {rq.linkedGap && (
                    <p className="text-[10px] text-slate-400 italic">
                      Linked Gap: {rq.linkedGap}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add RQ input */}
          <form onSubmit={handleAddRQ} className="pt-2 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={newRQText}
              onChange={(e) => setNewRQText(e.target.value)}
              placeholder="Add new research question..."
              className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Add RQ
            </button>
          </form>
        </div>

        {/* Right Column: Hypotheses */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Falsifiable Hypotheses (H)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">{hypotheses.length} hypotheses</span>
          </div>

          <div className="space-y-3">
            {hypotheses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No hypotheses generated yet. Click above to formulate.
              </p>
            ) : (
              hypotheses.map((h, idx) => (
                <div
                  key={h.id || h._id || idx}
                  className="rounded-xl border border-slate-100 bg-amber-50/30 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      H-{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingH(editingH === h.id ? null : h.id)}
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteH(h.id || h._id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {editingH === h.id ? (
                    <div className="space-y-2">
                      <textarea
                        defaultValue={h.text}
                        id={`edit-h-${h.id}`}
                        rows={2}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = document.getElementById(`edit-h-${h.id}`)?.value;
                          if (val) handleSaveEditH(h.id, val);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 px-2.5 py-1 rounded"
                      >
                        <Check size={11} /> Save
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-800">{h.text}</p>
                  )}

                  {h.linkedQuestion && (
                    <p className="text-[10px] text-slate-400 italic">
                      Linked to: {h.linkedQuestion}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Hypothesis input */}
          <form onSubmit={handleAddH} className="pt-2 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={newHText}
              onChange={(e) => setNewHText(e.target.value)}
              placeholder="Add new hypothesis..."
              className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Add Hypothesis
            </button>
          </form>
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
          <span>Step 5: Gaps</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <span>Continue to Step 7: Methodology</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step6Questions;
