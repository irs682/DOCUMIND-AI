import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Save,
  AlertCircle,
  HelpCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const Step2ResearchGoal = ({
  project,
  onUpdateProject,
  onSaveGoal,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [researchTopic, setResearchTopic] = useState(
    project?.researchTopic || ''
  );
  const [mainResearchProblem, setMainResearchProblem] = useState(
    project?.mainResearchProblem || project?.researchProblem || ''
  );
  const [improvementGoal, setImprovementGoal] = useState(
    project?.improvementGoal || project?.improvementsDesired || ''
  );
  const [focusAreas, setFocusAreas] = useState(
    project?.focusAreas || ''
  );

  const [suggestion, setSuggestion] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [error, setError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const autoSaveTimerRef = useRef(null);
  const isSavingRef = useRef(false);
  const hasUserEditedRef = useRef(false);

  // Sync state if project changes from outside (e.g. initial load or refetch)
  useEffect(() => {
    if (project && !hasUserEditedRef.current) {
      setResearchTopic(project.researchTopic || '');
      setMainResearchProblem(
        project.mainResearchProblem || project.researchProblem || ''
      );
      setImprovementGoal(
        project.improvementGoal || project.improvementsDesired || ''
      );
      setFocusAreas(project.focusAreas || '');
    }
  }, [project]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const validateGoal = useCallback(() => {
    const topic = researchTopic.trim();
    const problem = mainResearchProblem.trim();
    const improvement = improvementGoal.trim();

    if (!topic) {
      return { valid: false, message: 'Research Topic is required.' };
    }
    if (!problem) {
      return { valid: false, message: 'Main Research Problem is required.' };
    }
    if (!improvement) {
      return { valid: false, message: 'What you want to improve (Improvement Goal) is required.' };
    }

    return {
      valid: true,
      payload: {
        researchTopic: topic,
        mainResearchProblem: problem,
        improvementGoal: improvement,
        focusAreas: focusAreas ? focusAreas.trim() : '',
      },
    };
  }, [researchTopic, mainResearchProblem, improvementGoal, focusAreas]);

  const performSave = useCallback(
    async (isManual = false) => {
      const projectId = project?._id || project?.id;
      if (!projectId) {
        const msg = 'No active research project found. Please select or create a project first.';
        setError(msg);
        setSaveStatus('error');
        throw new Error(msg);
      }

      const { valid, message, payload } = validateGoal();
      if (!valid) {
        if (isManual) {
          setError(message);
          setSaveStatus('error');
        }
        throw new Error(message);
      }

      if (isSavingRef.current) {
        return; // Prevent concurrent requests
      }

      isSavingRef.current = true;
      setSaveStatus('saving');
      setError('');

      try {
        let updated;
        if (typeof onSaveGoal === 'function') {
          updated = await onSaveGoal(payload);
        } else if (typeof onUpdateProject === 'function') {
          updated = await onUpdateProject(payload);
        } else {
          throw new Error('Save handler not provided by workspace shell.');
        }

        hasUserEditedRef.current = false;
        setSaveStatus('saved');
        setLastSavedAt(new Date());

        setTimeout(() => {
          setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
        }, 2500);

        return updated;
      } catch (err) {
        console.error('Research goal save failed:', {
          status: err?.response?.status,
          data: err?.response?.data,
          error: err,
        });

        const errMsg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to save research goal. Please check network connection.';
        setError(errMsg);
        setSaveStatus('error');
        throw err;
      } finally {
        isSavingRef.current = false;
      }
    },
    [project, validateGoal, onSaveGoal, onUpdateProject]
  );

  // Trigger debounced auto-save (800ms) on user edits
  const handleFieldChange = (setter) => (e) => {
    hasUserEditedRef.current = true;
    setter(e.target.value);
    setError('');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      // Auto-save silently in background if required fields are filled
      performSave(false).catch(() => {
        // Silent catch for background autosave if incomplete
      });
    }, 1000);
  };

  // Manual save click handler
  const handleManualSave = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    try {
      await performSave(true);
    } catch (err) {
      // Error is handled and displayed in performSave
    }
  };

  const handleSuggest = async () => {
    setError('');
    try {
      const res = await onExecuteStep(2);
      if (res?.suggestion) {
        setSuggestion(res.suggestion);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'AI suggestion failed';
      setError(errMsg);
    }
  };

  const handleAcceptSuggestion = async () => {
    if (!suggestion) return;
    const topic =
      suggestion.researchTopic ||
      suggestion.suggestedTopic ||
      suggestion.topic ||
      researchTopic;
    const problem =
      suggestion.mainResearchProblem ||
      suggestion.researchProblem ||
      suggestion.problem ||
      mainResearchProblem;
    const improvement =
      suggestion.improvementGoal ||
      suggestion.improvementsDesired ||
      suggestion.improvements ||
      improvementGoal;
    const rawFocus = suggestion.focusAreas || focusAreas;
    const focus = Array.isArray(rawFocus) ? rawFocus.join(', ') : (typeof rawFocus === 'string' ? rawFocus : '');

    setResearchTopic(topic);
    setMainResearchProblem(problem);
    setImprovementGoal(improvement);
    setFocusAreas(focus);
    hasUserEditedRef.current = true;

    setSuggestion(null);

    // Persist accepted suggestion immediately
    const payload = {
      researchTopic: topic,
      mainResearchProblem: problem,
      improvementGoal: improvement,
      focusAreas: focus ? focus.trim() : '',
    };

    setSaveStatus('saving');
    setError('');
    try {
      if (typeof onSaveGoal === 'function') {
        await onSaveGoal(payload);
      } else {
        await onUpdateProject(payload);
      }
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Accept suggestion save failed:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save accepted suggestion';
      setError(errMsg);
      setSaveStatus('error');
    }
  };

  const handleNext = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    try {
      // Must save successfully before proceeding to Step 3
      await performSave(true);
      onNext();
    } catch (err) {
      console.warn('Blocked transition to Step 3 due to validation or save error:', err);
      // Stay on Step 2 and show the real error banner
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Step 2 — Research Goal & Problem Formulation
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Define what you intend to investigate. You can frame your own objectives or let the AI
            synthesize an evidence-backed problem statement from your ingested papers.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={isExecuting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 transition-all shrink-0"
        >
          <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
          <span>{isExecuting ? 'Synthesizing...' : 'Suggest from Literature'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* AI Suggestion Card */}
      {suggestion && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 to-purple-50/50 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
              <Sparkles size={16} className="text-indigo-600" />
              <span>AI Problem Formulation Candidate</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSuggest}
                disabled={isExecuting}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200"
              >
                <RotateCcw size={12} />
                <span>Regenerate</span>
              </button>
              <button
                type="button"
                onClick={handleAcceptSuggestion}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
              >
                <Check size={12} />
                <span>Accept Suggestion</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="font-semibold text-slate-700">Proposed Topic: </span>
              <span className="text-slate-900">
                {suggestion.researchTopic || suggestion.suggestedTopic || suggestion.topic}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Core Problem: </span>
              <p className="mt-1 text-slate-800 bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                {suggestion.mainResearchProblem || suggestion.researchProblem || suggestion.problem}
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Targeted Improvements: </span>
              <span className="text-slate-800">
                {suggestion.improvementGoal || suggestion.improvementsDesired || suggestion.improvements}
              </span>
            </div>
            {suggestion.focusAreas && (
              <div>
                <span className="font-semibold text-slate-700">Focus Areas: </span>
                <span className="text-slate-800">
                  {Array.isArray(suggestion.focusAreas) ? suggestion.focusAreas.join(', ') : String(suggestion.focusAreas)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Research Topic <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={researchTopic}
            onChange={handleFieldChange(setResearchTopic)}
            placeholder="e.g., Sample-Efficient Vision-Language-Action Models for Robotic Manipulation"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Main Research Problem <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            required
            value={mainResearchProblem}
            onChange={handleFieldChange(setMainResearchProblem)}
            placeholder="Describe the unresolved technical challenge, bottleneck, or empirical failure mode observed in current literature..."
            className="w-full rounded-xl border border-slate-200 p-4 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              What do you want to improve? <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={improvementGoal}
              onChange={handleFieldChange(setImprovementGoal)}
              placeholder="e.g., Generalization gap, inference latency, compute budget"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Optional Focus Areas / Constraints
            </label>
            <input
              type="text"
              value={focusAreas}
              onChange={handleFieldChange(setFocusAreas)}
              placeholder="e.g., Low-resource training, zero-shot evaluation, CALVIN benchmark (Optional)"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <HelpCircle size={14} className="shrink-0 text-slate-400" />
            <span>
              {lastSavedAt
                ? `Last saved at ${lastSavedAt.toLocaleTimeString()}`
                : 'All changes auto-sync to project. Manual save available.'}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                saveStatus === 'saved'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : saveStatus === 'saving'
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : saveStatus === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 size={13} className="animate-spin text-indigo-600" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Saved</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle size={13} className="text-rose-600" />
                  <span>Save failed — Retry</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Progress</span>
                </>
              )}
            </button>
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
          <span>Step 1: Papers</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={saveStatus === 'saving'}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
        >
          <span>Continue to Step 3: Related Work</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Step2ResearchGoal;
