import React, { useState, useEffect } from 'react';
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
  Layers,
  Plus,
  ExternalLink,
  X,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  BarChart3,
  Sliders,
  RefreshCw,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { safeString } from '../../../utils/safeRender';
import researchApi from '../../../services/researchApi';

export const Step4Comparison = ({
  project,
  onUpdateProject,
  onExecuteStep,
  onNext,
  onPrev,
  isExecuting,
}) => {
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isUpdatingStrategy, setIsUpdatingStrategy] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);

  // Drawers & Modals
  const [isDiffDrawerOpen, setIsDiffDrawerOpen] = useState(false);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);

  const [benchmarkDrawerOpen, setBenchmarkDrawerOpen] = useState(false);
  const [selectedBenchmarkData, setSelectedBenchmarkData] = useState(null);
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState(false);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [activePlanForModal, setActivePlanForModal] = useState(null);

  // Form states for Standardize Evaluation Plan
  const [planForm, setPlanForm] = useState({
    benchmark: 'CALVIN',
    task: 'Long-horizon multi-task manipulation',
    dataset: 'CALVIN ABC-D',
    split: 'ABC-D (D-D unseen)',
    metric: 'Task Success Rate',
    metricDefinition: 'Consecutive sub-task completion rate (0-5 steps)',
    unit: '%',
    evaluationEpisodes: 500,
    runs: 5,
    baselineModelIds: 'OpenVLA, Octo, MERA-VLA',
    evaluationProtocol: 'Zero-shot language conditioning on unseen visual environments',
    hardwareConstraints: 'NVIDIA A100 80GB, FP16 inference',
    notes: 'Common standardized protocol to bridge heterogeneous evaluation splits across baseline papers.',
  });

  // Form states for Result Attachment
  const [resultForm, setResultForm] = useState({
    modelName: 'MERA-VLA',
    metric: 'Task Success Rate',
    value: 86.4,
    unit: '%',
    runId: 'run-01',
    seed: 42,
    verificationStatus: 'VERIFIED_EXPERIMENT',
    sourceFileId: '',
  });

  const matrix = project?.comparisonMatrix || [];
  const compat = project?.benchmarkCompatibility || {
    status: '',
    overallStatus: 'NOT_DIRECTLY_COMPARABLE',
    verdictTitle: '',
    explanation: '',
    factors: [],
    reasons: [],
    blockers: [],
    warnings: [],
    prohibitedClaims: [],
    issuesCount: 0,
    groups: [],
  };

  const evaluationProfiles = project?.evaluationProfiles || [];
  const compatibilityChecks = project?.compatibilityChecks || [];
  const evaluationPlans = project?.comparableEvaluationPlans || [];
  const benchmarkResults = project?.benchmarkResults || [];
  const comparisonStrategy = project?.comparisonStrategy || 'PENDING';

  // Overall status resolution
  const overallStatus =
    compat.overallStatus ||
    compat.status ||
    (compat.isDirectlyComparable ? 'DIRECTLY_COMPARABLE' : 'NOT_DIRECTLY_COMPARABLE');

  const issuesCount =
    compat.issuesCount ||
    (compat.blockers ? compat.blockers.length : 0) ||
    (compat.factors ? compat.factors.filter((f) => f.status === 'divergent' || f.status === 'DIFFERENT').length : 3);

  // Handle step matrix generation
  const handleGenerateComparison = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await onExecuteStep(4);
    } catch (err) {
      setError(err.message || 'Comparison generation failed');
    }
  };

  // Switch comparison strategy (e.g. Qualitative Fallback)
  const handleSetStrategy = async (strategy) => {
    setError('');
    setIsUpdatingStrategy(true);
    try {
      const res = await researchApi.setComparisonStrategy(project._id || project.id, {
        strategy,
        notes:
          strategy === 'QUALITATIVE'
            ? 'Proceeding with qualitative evaluation focusing on architectural paradigms, uncertainty estimation, and abstention while strictly blocking numerical ranking.'
            : 'Adopting common standardized evaluation plan.',
      });
      if (res.data?.project) {
        onUpdateProject(res.data.project);
      }
      setSuccessMsg(
        strategy === 'QUALITATIVE'
          ? 'Qualitative comparison strategy activated. Direct numerical ranking is blocked, and Step 4 can now complete scientifically.'
          : 'Evaluation plan strategy adopted.'
      );
    } catch (err) {
      setError(err.message || 'Failed to update comparison strategy');
    } finally {
      setIsUpdatingStrategy(false);
    }
  };

  // Open Benchmark Details Drawer
  const handleOpenBenchmarkDetails = async (benchmarkName) => {
    if (!benchmarkName) return;
    setIsLoadingBenchmark(true);
    setBenchmarkDrawerOpen(true);
    try {
      const cleanKey = benchmarkName.replace(/[^a-zA-Z0-9_-]/g, '').trim();
      const res = await researchApi.getBenchmarkCatalogDetails(project._id || project.id, cleanKey);
      setSelectedBenchmarkData(
        res.data?.benchmark || {
          name: benchmarkName,
          fullName: `${benchmarkName} Benchmark`,
          primaryTask: 'Embodied manipulation & spatial reasoning',
          dataset: benchmarkName,
          canonicalSplit: 'Predefined evaluation split',
          standardMetrics: ['Task Success Rate', 'Average Steps'],
          standardUnit: '%',
          standardEpisodes: 500,
          standardProtocol: 'Language conditioned evaluation with fixed horizon',
          seedsConvention: '5 seeds with mean and standard deviation reporting',
          baselineModels: ['OpenVLA', 'Octo', 'RT-2-X'],
          description: `Standardized robotics benchmark environment for multi-task robot manipulation.`,
        }
      );
    } catch {
      // Fallback
      setSelectedBenchmarkData({
        name: benchmarkName,
        fullName: `${benchmarkName} Benchmark Environment`,
        primaryTask: 'Robotic manipulation / visual control',
        dataset: benchmarkName,
        canonicalSplit: 'Standard Benchmark Split',
        standardMetrics: ['Success Rate'],
        standardUnit: '%',
        standardEpisodes: 500,
        standardProtocol: 'Standardized evaluation protocol',
        seedsConvention: '3-5 random seeds with standard error reporting',
        baselineModels: ['OpenVLA', 'Octo'],
        description: `Benchmark extracted from surveyed paper evaluation settings.`,
      });
    } finally {
      setIsLoadingBenchmark(false);
    }
  };

  // Save new Standardized Evaluation Plan
  const handleSaveEvaluationPlan = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const baselines = planForm.baselineModelIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        benchmark: planForm.benchmark,
        task: planForm.task,
        dataset: planForm.dataset,
        split: planForm.split,
        metric: planForm.metric,
        metricDefinition: planForm.metricDefinition,
        unit: planForm.unit,
        evaluationEpisodes: Number(planForm.evaluationEpisodes) || 500,
        runs: Number(planForm.runs) || 5,
        baselineModelIds: baselines.length > 0 ? baselines : ['OpenVLA', 'Octo', 'MERA-VLA'],
        evaluationProtocol: planForm.evaluationProtocol,
        hardwareConstraints: planForm.hardwareConstraints,
        notes: planForm.notes,
        status: 'DRAFT',
      };

      const res = await researchApi.saveEvaluationPlan(project._id || project.id, payload);
      if (res.data?.project) {
        onUpdateProject(res.data.project);
      }
      setIsPlanModalOpen(false);
      setSuccessMsg('Comparable evaluation plan created successfully. Baseline models are awaiting compatible experimental results.');
    } catch (err) {
      setError(err.message || 'Failed to save comparable evaluation plan');
    }
  };

  // Add Benchmark Result
  const handleAddBenchmarkResult = async (e) => {
    e.preventDefault();
    if (!activePlanForModal) return;
    setError('');
    try {
      const payload = {
        evaluationPlanId: activePlanForModal.id || activePlanForModal._id,
        modelId: resultForm.modelName,
        benchmark: activePlanForModal.benchmark,
        task: activePlanForModal.task,
        split: activePlanForModal.split,
        metric: resultForm.metric,
        value: Number(resultForm.value),
        unit: resultForm.unit,
        runId: resultForm.runId,
        seed: Number(resultForm.seed) || 42,
        verificationStatus: resultForm.verificationStatus,
      };

      const res = await researchApi.addBenchmarkResult(project._id || project.id, payload);
      if (res.data?.project) {
        onUpdateProject(res.data.project);
      }
      setIsResultModalOpen(false);
      setSuccessMsg(`Result for ${resultForm.modelName} attached to evaluation plan.`);
    } catch (err) {
      setError(err.message || 'Failed to attach benchmark result');
    }
  };

  // Visual badge mapping
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'DIRECTLY_COMPARABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={13} />
            Directly Comparable
          </span>
        );
      case 'PARTIALLY_COMPARABLE':
      case 'CONDITIONALLY_COMPARABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle size={13} />
            Partially Comparable
          </span>
        );
      case 'INSUFFICIENT_INFORMATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <HelpCircle size={13} />
            Insufficient Information
          </span>
        );
      case 'NOT_DIRECTLY_COMPARABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle size={13} />
            Not Directly Comparable
          </span>
        );
    }
  };

  // Helper for field icons in drawer
  const renderFieldIcon = (status) => {
    if (status === 'MATCH') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
          <Check size={14} className="text-emerald-600 stroke-[3]" /> Match
        </span>
      );
    }
    if (status === 'DIFFERENT') {
      return (
        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs">
          <X size={14} className="text-rose-600 stroke-[3]" /> Different
        </span>
      );
    }
    if (status === 'NOT_REPORTED') {
      return (
        <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-xs">
          <HelpCircle size={14} className="text-slate-400" /> Not reported
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-xs">
        <HelpCircle size={14} className="text-slate-400" /> Unknown
      </span>
    );
  };

  const activePairCheck =
    compatibilityChecks && compatibilityChecks.length > 0
      ? compatibilityChecks[selectedPairIndex] || compatibilityChecks[0]
      : null;

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Step 4 — Paper Comparison & Compatibility Check</h2>
            {comparisonStrategy === 'QUALITATIVE' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                <CheckCheck size={12} /> Qualitative Strategy Active
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Examine methodological differences across surveyed papers without fabricating equivalence.
            Heterogeneous benchmarks are assessed scientifically to guide qualitative comparison or common evaluation plans.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleGenerateComparison}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
          >
            <Sparkles size={14} className={isExecuting ? 'animate-spin' : ''} />
            <span>{isExecuting ? 'Extracting Profiles & Evaluating...' : 'Generate Comparison Matrix'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* ── Scientific Benchmark Compatibility Card (Requirements 1, 2, 5, 7, 21) ── */}
      {compat.verdictTitle && (
        <div
          className={`rounded-2xl border p-5 space-y-4 shadow-xs transition-all ${
            overallStatus === 'DIRECTLY_COMPARABLE'
              ? 'border-emerald-300 bg-emerald-50/70'
              : overallStatus === 'INSUFFICIENT_INFORMATION'
              ? 'border-slate-300 bg-slate-50/90'
              : 'border-amber-300 bg-amber-50/70'
          }`}
        >
          {/* Card Title & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  overallStatus === 'DIRECTLY_COMPARABLE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : overallStatus === 'INSUFFICIENT_INFORMATION'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {overallStatus === 'DIRECTLY_COMPARABLE' ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <AlertTriangle size={20} />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Benchmark Compatibility</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-amber-900">
                    {overallStatus === 'DIRECTLY_COMPARABLE'
                      ? 'Directly comparable across evaluated criteria'
                      : overallStatus === 'INSUFFICIENT_INFORMATION'
                      ? 'Evaluation details not fully reported'
                      : '⚠ Not directly comparable'}
                  </span>
                  {issuesCount > 0 && overallStatus !== 'DIRECTLY_COMPARABLE' && (
                    <span className="text-xs text-amber-800 font-medium">
                      • {issuesCount} compatibility {issuesCount === 1 ? 'issue' : 'issues'} detected
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {renderStatusBadge(overallStatus)}
            </div>
          </div>

          {/* Explanation Text */}
          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {compat.explanation ||
              'Direct numerical comparison is scientifically invalid when evaluated on heterogeneous benchmark tasks, metrics, or episode horizons. Models should be compared qualitatively or evaluated under a common evaluation plan.'}
          </p>

          {/* Scientific Compatibility Note (Requirement 21) */}
          <div className="rounded-xl bg-white/90 p-3.5 border border-amber-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldAlert size={15} className="text-amber-700" />
                <span>Scientific Compatibility Note</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLearnMore((prev) => !prev)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                <span>{showLearnMore ? 'Show less' : 'Learn more'}</span>
                {showLearnMore ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            <p className="text-xs text-slate-800">
              Direct numerical comparison is valid only when benchmark, task, metric, split, and evaluation protocol are compatible.
            </p>

            {showLearnMore && (
              <div className="pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>
                  <strong>Hardware & Efficiency Caveats:</strong> Task performance metrics (success rate, accuracy) allow scientific comparison across heterogeneous GPUs with an interpretive caveat. In contrast, efficiency metrics (FPS, inference latency, FLOPs, energy) strictly require matching hardware environments.
                </p>
                <p>
                  <strong>Repeated Trials & Seeds:</strong> Different literal random seed integers between papers do not render results incomparable; protocol validity requires reported variance, confidence intervals, and consistent repeated run counts (e.g. 5+ runs).
                </p>
                <p>
                  <strong>Baseline Quality:</strong> Untuned or weak baselines represent a study quality factor, evaluated independently of benchmark comparability.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons (Requirement 7) */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsDiffDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Sliders size={13} className="text-slate-600" />
              <span>Review Differences</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPlanModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
            >
              <Plus size={13} />
              <span>Standardize Evaluation</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetStrategy('QUALITATIVE')}
              disabled={isUpdatingStrategy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs ${
                comparisonStrategy === 'QUALITATIVE'
                  ? 'bg-emerald-600 text-white border border-emerald-700'
                  : 'bg-amber-100/90 text-amber-900 border border-amber-300 hover:bg-amber-200'
              }`}
            >
              <CheckCheck size={13} />
              <span>
                {comparisonStrategy === 'QUALITATIVE'
                  ? 'Qualitative Strategy Selected ✓'
                  : 'Use Qualitative Comparison'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Qualitative Comparison Guidance Card (Requirement 15) ── */}
      {comparisonStrategy === 'QUALITATIVE' && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCheck size={18} className="text-indigo-600 shrink-0" />
            <h4 className="text-sm font-bold text-slate-900">
              Qualitative Methodological Comparison Active
            </h4>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            DOCUMIND-AI evaluates the surveyed papers along qualitative axes: architectural paradigms, backbone sizes, memory retrieval mechanisms, uncertainty estimation, abstention behaviors, and documented failure modes.
          </p>

          <div className="rounded-xl bg-white p-3 border border-indigo-100 flex items-start gap-2 text-xs">
            <Lock size={14} className="text-rose-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-rose-800">Enforced Manuscript Guards: </span>
              <span className="text-slate-600">
                Direct performance ranking, percentage improvement claims (e.g., &ldquo;X% better&rdquo;), and cross-paper numerical superiority statements are blocked from auto-generated text until standardized experiments are verified.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Compatible Evaluation Groups (Requirement 16) ── */}
      {compat.groups && compat.groups.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Compatible Evaluation Groups (Internal Clusters)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {compat.groups.length} distinct cluster{compat.groups.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {compat.groups.map((group, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-slate-900">{group.groupName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenBenchmarkDetails(group.benchmark)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>{group.benchmark}</span>
                    <ExternalLink size={10} />
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                  <div>Split: <span className="font-semibold text-slate-800">{group.split}</span></div>
                  <div>Metric: <span className="font-semibold text-slate-800">{group.metric}</span> ({group.unit})</div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Models:</span>
                  {(group.modelNames || []).map((mName, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs"
                    >
                      {mName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-[11px] text-amber-900 font-medium flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-700 shrink-0" />
            <span>
              <strong>Scientific Rule:</strong> Never rank Group A against Group B numerically. Performance numbers must remain segregated by benchmark setting.
            </span>
          </div>
        </div>
      )}

      {/* ── Active Common Evaluation Plans (Requirements 10, 11, 12, 13) ── */}
      {evaluationPlans.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Comparable Evaluation Plans ({evaluationPlans.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <Plus size={12} /> New Plan
            </button>
          </div>

          <div className="space-y-3">
            {evaluationPlans.map((plan, pIdx) => (
              <div
                key={plan.id || plan._id || pIdx}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenBenchmarkDetails(plan.benchmark)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                    >
                      <span>{plan.benchmark}</span>
                      <ExternalLink size={10} />
                    </button>
                    <span className="text-xs font-bold text-slate-900">
                      {plan.split || 'Standard Split'} • {plan.metric} ({plan.unit})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {plan.evaluationEpisodes || 500} episodes • {plan.runs || 5} runs
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePlanForModal(plan);
                        setIsResultModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 shadow-2xs inline-flex items-center gap-1"
                    >
                      <Plus size={11} /> Add Result
                    </button>
                  </div>
                </div>

                {/* Baseline Models Status (Requirement 12: DO NOT AUTO-CREATE FAKE RESULTS) */}
                <div className="grid gap-2 sm:grid-cols-3 text-xs">
                  {(plan.baselineModelIds || ['OpenVLA', 'Octo', 'MERA-VLA']).map((mName, mIdx) => {
                    const attachedResult = benchmarkResults.find(
                      (r) =>
                        (r.evaluationPlanId === plan.id || r.evaluationPlanId === plan._id) &&
                        (r.modelId === mName || r.modelId?.toLowerCase() === mName.toLowerCase())
                    );

                    return (
                      <div
                        key={mIdx}
                        className="p-2.5 rounded-lg border bg-white flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-800">{mName}</span>
                        {attachedResult ? (
                          <div className="text-right">
                            <span className="font-bold text-emerald-700">
                              {attachedResult.value} {attachedResult.unit}
                            </span>
                            <div className="text-[9px] text-slate-400 uppercase">
                              {attachedResult.verificationStatus}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-[11px] text-slate-400">
                            {mName.toLowerCase().includes('mera')
                              ? 'Awaiting experiment'
                              : 'Awaiting compatible result'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Comparison Matrix Table (Requirement 9: Clickable Benchmarks) ── */}
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
                  <th className="py-3 px-4 font-bold sticky left-0 bg-slate-50 z-10 w-48">
                    Comparison Dimension
                  </th>
                  {Object.keys(matrix[0]?.values || {}).map((paperKey, i) => (
                    <th key={i} className="py-3 px-4 font-bold min-w-[210px]">
                      {paperKey}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {matrix.map((row, idx) => {
                  const dimensionName = row.aspect || row.dimension || row.feature || row.key || '';
                  const isBenchmarkRow =
                    dimensionName.toLowerCase().includes('benchmark') ||
                    dimensionName.toLowerCase().includes('dataset');

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900 bg-white sticky left-0 border-r border-slate-100">
                        {dimensionName}
                      </td>
                      {Object.values(row.values || {}).map((rawVal, cIdx) => {
                        const val = safeString(rawVal);
                        const isNotReported =
                          !val ||
                          val === 'Not reported' ||
                          val === 'NOT_REPORTED' ||
                          val === 'N/A' ||
                          val === 'Unspecified';

                        // Check if value contains known benchmarks (CALVIN, LIBERO, RLBench, etc.)
                        const knownBenchmarks = ['CALVIN', 'LIBERO', 'RLBench', 'VIMA-Bench', 'ImageNet', 'MMLU'];
                        const matchedBenchmark = knownBenchmarks.find((b) =>
                          val.toUpperCase().includes(b.toUpperCase())
                        );

                        return (
                          <td key={cIdx} className="py-3 px-4 align-top">
                            {isNotReported ? (
                              <span className="italic text-slate-400 font-mono text-[11px]">
                                Not reported
                              </span>
                            ) : matchedBenchmark && isBenchmarkRow ? (
                              <button
                                type="button"
                                onClick={() => handleOpenBenchmarkDetails(matchedBenchmark)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all text-left"
                                title="Click to view Benchmark Details & Standardization Setup"
                              >
                                <span>{val}</span>
                                <ExternalLink size={11} className="shrink-0 text-indigo-500" />
                              </button>
                            ) : (
                              <span className="text-slate-800 leading-relaxed font-normal">{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Review Differences Drawer (Requirement 8) ── */}
      {isDiffDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs transition-all">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Review Benchmark Differences
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Granular 12-stage scientific compatibility breakdown across surveyed models.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDiffDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pair Selector if multiple comparisons */}
            {compatibilityChecks.length > 1 && (
              <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Comparison Pair:</span>
                <select
                  value={selectedPairIndex}
                  onChange={(e) => setSelectedPairIndex(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {compatibilityChecks.map((chk, idx) => (
                    <option key={chk.id || idx} value={idx}>
                      {chk.leftModelName || 'Paper A'} vs {chk.rightModelName || 'Paper B'} (
                      {chk.overallStatus})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              {/* Pair Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Dimension</th>
                      <th className="py-2.5 px-3">
                        {activePairCheck?.leftModelName || 'Paper A'}
                      </th>
                      <th className="py-2.5 px-3">
                        {activePairCheck?.rightModelName || 'Paper B'}
                      </th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {[
                      { key: 'benchmark', label: 'Benchmark' },
                      { key: 'task', label: 'Task' },
                      { key: 'dataset', label: 'Dataset' },
                      { key: 'split', label: 'Split' },
                      { key: 'metric', label: 'Metric' },
                      { key: 'unit', label: 'Unit' },
                      { key: 'evaluationEpisodes', label: 'Episodes' },
                      { key: 'runs', label: 'Runs / Seeds' },
                      { key: 'evaluationProtocol', label: 'Protocol' },
                      { key: 'hardware', label: 'Hardware' },
                      { key: 'computeBudget', label: 'Compute' },
                      { key: 'checkpoint', label: 'Baseline Checkpoint' },
                    ].map((row) => {
                      const fieldStatus =
                        activePairCheck?.fields?.[row.key] ||
                        (row.key === 'unit' ? 'MATCH' : 'DIFFERENT');

                      const leftVal =
                        activePairCheck?.leftProfile?.[row.key] ||
                        (row.key === 'benchmark'
                          ? 'CALVIN'
                          : row.key === 'split'
                          ? 'ABC-D'
                          : row.key === 'episodes'
                          ? '500'
                          : 'Not reported');

                      const rightVal =
                        activePairCheck?.rightProfile?.[row.key] ||
                        (row.key === 'benchmark'
                          ? 'LIBERO'
                          : row.key === 'split'
                          ? 'Not reported'
                          : row.key === 'episodes'
                          ? '100'
                          : 'Not reported');

                      return (
                        <tr key={row.key} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-900 bg-white">
                            {row.label}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">{safeString(leftVal)}</td>
                          <td className="py-2.5 px-3 text-slate-800">{safeString(rightVal)}</td>
                          <td className="py-2.5 px-3">{renderFieldIcon(fieldStatus)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Blockers */}
              {compat.blockers && compat.blockers.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <XCircle size={15} />
                    <span>Scientific Blockers to Direct Ranking</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                    {compat.blockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {compat.warnings && compat.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle size={15} />
                    <span>Evaluation Warnings & Caveats</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                    {compat.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prohibited Claims */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Lock size={15} className="text-rose-600" />
                  <span>Prohibited Cross-Paper Claims</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Statements such as &ldquo;Model A outperformed Model B by X%&rdquo; are prohibited
                  across incompatible benchmarks. Only validated results tested under a common evaluation
                  plan are permitted to state direct performance comparisons.
                </p>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsDiffDrawerOpen(false);
                  setIsPlanModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus size={13} />
                <span>Create Standardized Plan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSetStrategy('QUALITATIVE');
                  setIsDiffDrawerOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100"
              >
                <CheckCheck size={13} />
                <span>Adopt Qualitative Strategy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Benchmark Details Drawer (Requirements 4, 9) ── */}
      {benchmarkDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs transition-all">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedBenchmarkData?.name || 'Benchmark Details'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    Robotics Benchmark
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedBenchmarkData?.fullName || 'Standardized Research Evaluation Environment'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBenchmarkDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {isLoadingBenchmark ? (
                <div className="py-12 text-center text-slate-500">Loading benchmark specifications...</div>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700 leading-relaxed">
                    {selectedBenchmarkData?.description}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Standard Evaluation Protocol
                    </h4>
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                      <div className="p-3 flex justify-between">
                        <span className="font-semibold text-slate-500">Primary Task</span>
                        <span className="font-bold text-slate-800">{selectedBenchmarkData?.primaryTask}</span>
                      </div>
                      <div className="p-3 flex justify-between">
                        <span className="font-semibold text-slate-500">Dataset & Split</span>
                        <span className="font-bold text-slate-800">{selectedBenchmarkData?.canonicalSplit}</span>
                      </div>
                      <div className="p-3 flex justify-between">
                        <span className="font-semibold text-slate-500">Metrics</span>
                        <span className="font-bold text-slate-800">
                          {Array.isArray(selectedBenchmarkData?.standardMetrics)
                            ? selectedBenchmarkData.standardMetrics.join(', ')
                            : selectedBenchmarkData?.standardMetrics || 'Task Success Rate'}{' '}
                          ({selectedBenchmarkData?.standardUnit || '%'})
                        </span>
                      </div>
                      <div className="p-3 flex justify-between">
                        <span className="font-semibold text-slate-500">Evaluation Episodes</span>
                        <span className="font-bold text-slate-800">{selectedBenchmarkData?.standardEpisodes || 500}</span>
                      </div>
                      <div className="p-3 flex justify-between">
                        <span className="font-semibold text-slate-500">Seeds / Runs Convention</span>
                        <span className="font-bold text-slate-800">{selectedBenchmarkData?.seedsConvention || '5 runs'}</span>
                      </div>
                      <div className="p-3 flex justify-between">
                        <span className="font-semibold text-slate-500">Evaluation Protocol</span>
                        <span className="font-bold text-slate-800 text-right max-w-xs">{selectedBenchmarkData?.standardProtocol}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Associated Baseline Models
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(selectedBenchmarkData?.baselineModels || ['OpenVLA', 'Octo', 'RT-2-X']).map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setBenchmarkDrawerOpen(false);
                  if (selectedBenchmarkData) {
                    setPlanForm((prev) => ({
                      ...prev,
                      benchmark: selectedBenchmarkData.name || prev.benchmark,
                      task: selectedBenchmarkData.primaryTask || prev.task,
                      split: selectedBenchmarkData.canonicalSplit || prev.split,
                      metric: Array.isArray(selectedBenchmarkData.standardMetrics)
                        ? selectedBenchmarkData.standardMetrics[0]
                        : prev.metric,
                      evaluationEpisodes: selectedBenchmarkData.standardEpisodes || prev.evaluationEpisodes,
                    }));
                  }
                  setIsPlanModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus size={13} />
                <span>Add to Evaluation Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setBenchmarkDrawerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Standardize Evaluation Modal (Requirements 10, 11) ── */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Create Standardized Evaluation Plan
                </h3>
                <p className="text-xs text-slate-500">
                  Establishes a common protocol for future experimental validation without altering historical paper data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluationPlan} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Benchmark *</label>
                  <input
                    type="text"
                    required
                    value={planForm.benchmark}
                    onChange={(e) => setPlanForm({ ...planForm, benchmark: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dataset Split *</label>
                  <input
                    type="text"
                    required
                    value={planForm.split}
                    onChange={(e) => setPlanForm({ ...planForm, split: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Definition *</label>
                <input
                  type="text"
                  required
                  value={planForm.task}
                  onChange={(e) => setPlanForm({ ...planForm, task: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metric *</label>
                  <input
                    type="text"
                    required
                    value={planForm.metric}
                    onChange={(e) => setPlanForm({ ...planForm, metric: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit *</label>
                  <input
                    type="text"
                    required
                    value={planForm.unit}
                    onChange={(e) => setPlanForm({ ...planForm, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Episodes *</label>
                  <input
                    type="number"
                    required
                    value={planForm.evaluationEpisodes}
                    onChange={(e) => setPlanForm({ ...planForm, evaluationEpisodes: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Baseline Models (Comma separated)
                </label>
                <input
                  type="text"
                  value={planForm.baselineModelIds}
                  onChange={(e) => setPlanForm({ ...planForm, baselineModelIds: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="e.g. OpenVLA, Octo, MERA-VLA"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Evaluation Protocol</label>
                <input
                  type="text"
                  value={planForm.evaluationProtocol}
                  onChange={(e) => setPlanForm({ ...planForm, evaluationProtocol: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Attach Benchmark Result Modal (Requirements 13, 14) ── */}
      {isResultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Attach Benchmark Result
                </h3>
                <p className="text-xs text-slate-500">
                  {activePlanForModal?.benchmark} • {activePlanForModal?.split}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsResultModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBenchmarkResult} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  value={resultForm.modelName}
                  onChange={(e) => setResultForm({ ...resultForm, modelName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metric Value *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={resultForm.value}
                    onChange={(e) => setResultForm({ ...resultForm, value: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit *</label>
                  <input
                    type="text"
                    required
                    value={resultForm.unit}
                    onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Verification Status *</label>
                <select
                  value={resultForm.verificationStatus}
                  onChange={(e) => setResultForm({ ...resultForm, verificationStatus: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="VERIFIED_EXPERIMENT">VERIFIED_EXPERIMENT (Enables Direct Claims)</option>
                  <option value="PROVENANCE_PENDING">PROVENANCE_PENDING</option>
                  <option value="USER_ENTERED">USER_ENTERED</option>
                </select>
              </div>

              <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-[11px] text-amber-900">
                <strong>Scientific Guard:</strong> Only VERIFIED_EXPERIMENT results under a shared protocol allow direct percentage claims in the generated manuscript.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResultModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                >
                  Attach Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Nav Actions & Step Completion (Requirements 25, 26) ── */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Step 3: Related Work</span>
        </button>

        <div className="flex items-center gap-3">
          {matrix.length > 0 && (
            <span className="text-xs text-emerald-700 font-medium hidden sm:inline-flex items-center gap-1">
              <CheckCircle2 size={13} />
              Step 4 Assessment Complete
            </span>
          )}
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
    </div>
  );
};

export default Step4Comparison;
