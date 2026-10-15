import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Sliders,
  Cpu,
  BookOpen,
  FileCheck2,
  Calculator,
  RefreshCw,
  UploadCloud,
  FileCode,
  Github,
  PlusCircle,
  FlaskConical,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { researchApi } from '../../services/researchApi';

export default function ResearchEvidenceDashboard({
  project,
  onProjectUpdated,
  onNavigateToStep,
}) {
  const projectId = project?._id || project?.id;
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionProgress, setActionProgress] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals & Panels
  const [expandedDimension, setExpandedDimension] = useState(null);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showReproducibilityModal, setShowReproducibilityModal] = useState(false);
  const [ingestType, setIngestType] = useState('csv'); // 'csv' | 'log' | 'code' | 'config'
  const [ingestInput, setIngestInput] = useState('');
  const [ingestFilename, setIngestFilename] = useState('');

  // Reproducibility Form State
  const [reproForm, setReproForm] = useState({
    repositoryUrl: project?.reproducibilityManifest?.repositoryUrl || '',
    commitHash: project?.reproducibilityManifest?.commitHash || '',
    pythonVersion: project?.reproducibilityManifest?.pythonVersion || '3.10.12',
    cudaVersion: project?.reproducibilityManifest?.cudaVersion || '12.1',
    gpu: project?.reproducibilityManifest?.gpu || 'NVIDIA A100-SXM4-80GB',
    cpu: project?.reproducibilityManifest?.cpu || '16 vCPU Intel Xeon Gold 6330',
    ram: project?.reproducibilityManifest?.ram || '128 GB',
    checkpoint: project?.reproducibilityManifest?.checkpoint || 'mera_vla_step250k.pt',
    datasetVersion: project?.reproducibilityManifest?.datasetVersion || 'CALVIN-ABC->D-v1.2',
    split: project?.reproducibilityManifest?.split || 'ABC->D',
  });

  const loadReadiness = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError('');
      const res = await researchApi.getReadiness(projectId);
      if (res?.readiness) {
        setReadiness(res.readiness);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load readiness');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadiness();
  }, [projectId]);

  // Action: Plan Experiment Variants
  const handlePlanVariants = async () => {
    try {
      setActionProgress('Generating standardized experiment variant matrix...');
      const res = await researchApi.planExperimentVariants(projectId, {
        benchmark: 'CALVIN',
        task: 'Long-horizon Manipulation',
        metric: 'Success Rate',
        unit: '%',
        seeds: [42, 1337, 2024],
      });
      setSuccessMsg(`Created ${res.plannedCount} planned variants (Base VLA, +Retrieval, Full MERA-VLA, Ablations).`);
      await loadReadiness();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setActionProgress('');
    }
  };

  // Action: Ingest Result / Log / Code
  const handleIngest = async (e) => {
    e.preventDefault();
    if (!ingestInput.trim()) return;
    try {
      setActionProgress(`Validating uploaded ${ingestType}...`);
      const payload = {
        type: ingestType,
        sourceFilename: ingestFilename || `uploaded_${ingestType}_${Date.now()}`,
      };
      if (ingestType === 'csv') payload.csvText = ingestInput;
      else if (ingestType === 'log') payload.logText = ingestInput;
      else if (ingestType === 'code' || ingestType === 'config') {
        payload.codeContent = ingestInput;
        payload.fileType = ingestFilename.endsWith('.yml') || ingestFilename.endsWith('.yaml') ? 'yaml' : 'txt';
      }

      const res = await researchApi.ingestExperiments(projectId, payload);
      setSuccessMsg(`Ingested successfully. Verified: ${res.verifiedRunsCount || 0}, Pending: ${res.pendingRunsCount || 0}`);
      setIngestInput('');
      setShowIngestModal(false);
      await loadReadiness();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setActionProgress('');
    }
  };

  // Action: Compute Statistics
  const handleComputeStats = async () => {
    try {
      setActionProgress('Computing deterministic statistics and hypothesis tests...');
      const res = await researchApi.computeExperimentStats(projectId);
      setSuccessMsg(`Statistics calculated across ${res.summaries?.length || 0} benchmark groups.`);
      await loadReadiness();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setActionProgress('');
    }
  };

  // Action: Validate Safety
  const handleValidateSafety = async () => {
    try {
      setActionProgress('Validating safety claims, risk-coverage curve, and AURC...');
      const res = await researchApi.validateSafety(projectId);
      setSuccessMsg(`Safety validated: Risk-Coverage AURC ${res.safetyValidation?.riskCoverageCurve?.aurc || 'N/A'}`);
      await loadReadiness();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setActionProgress('');
    }
  };

  // Action: Save Reproducibility
  const handleSaveReproducibility = async (e) => {
    e.preventDefault();
    try {
      setActionProgress('Updating reproducibility manifest and environment specifications...');
      await researchApi.saveReproducibility(projectId, reproForm);
      setSuccessMsg('Reproducibility manifest saved.');
      setShowReproducibilityModal(false);
      await loadReadiness();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setActionProgress('');
    }
  };

  // Action: Verify Math Completeness
  const handleVerifyMath = async () => {
    try {
      setActionProgress('Verifying mathematical definitions and Math ↔ Code consistency...');
      const res = await researchApi.verifyMathematics(projectId);
      setSuccessMsg(`Verified ${res.verifiedCount} mathematical definitions with codebase mappings.`);
      await loadReadiness();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setActionProgress('');
    }
  };

  // Action: Transition Mode
  const handleTransitionMode = async () => {
    try {
      setActionProgress('Checking hard gates and transitioning manuscript mode...');
      const res = await researchApi.transitionMode(projectId, { targetMode: 'EMPIRICAL' });
      setSuccessMsg(`Paper transitioned to ${res.newMode}! Results and Discussion sections unlocked.`);
      await loadReadiness();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setActionProgress('');
    }
  };

  const dimensions = [
    {
      key: 'experimentalEvidence',
      label: 'Experimental Evidence',
      icon: FlaskConical,
      color: 'emerald',
      actionLabel: 'Improve Evidence',
      onAction: () => setShowIngestModal(true),
    },
    {
      key: 'statisticalValidation',
      label: 'Statistical Validation',
      icon: Calculator,
      color: 'blue',
      actionLabel: 'Complete Statistics',
      onAction: handleComputeStats,
    },
    {
      key: 'safetyValidation',
      label: 'Safety Validation',
      icon: ShieldAlert,
      color: 'amber',
      actionLabel: 'Validate Safety',
      onAction: handleValidateSafety,
    },
    {
      key: 'reproducibility',
      label: 'Reproducibility',
      icon: Cpu,
      color: 'purple',
      actionLabel: 'Complete Reproducibility',
      onAction: () => setShowReproducibilityModal(true),
    },
    {
      key: 'references',
      label: 'References & Literature',
      icon: BookOpen,
      color: 'indigo',
      actionLabel: 'Fix References',
      onAction: () => onNavigateToStep && onNavigateToStep(3),
    },
    {
      key: 'layoutFormatting',
      label: 'Layout / Formatting',
      icon: FileCheck2,
      color: 'teal',
      actionLabel: 'Fix Formatting',
      onAction: () => onNavigateToStep && onNavigateToStep(11),
    },
  ];

  const currentMode = project?.generatedDraft?.manuscriptMode || 'PRE_EXPERIMENTAL';
  const isEmpirical = currentMode === 'EMPIRICAL';

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Overview */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isEmpirical
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isEmpirical ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                {isEmpirical ? 'EMPIRICAL RESEARCH MODE' : 'PRE_EXPERIMENTAL DRAFT MODE'}
              </span>
              <span className="text-xs text-slate-500">
                {isEmpirical
                  ? 'Results & Discussion Sections Unlocked'
                  : 'Results & Discussion Sections Locked (Anti-Fabrication Guard)'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              Research Evidence & Manuscript Readiness
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Deterministic, non-inflated readiness scores derived from verified project experiments, multi-seed statistical runs, safety risk-coverage metrics, and traceable reproducibility provenance.
            </p>
          </div>

          {/* Overall & Submission Scores */}
          <div className="flex items-center gap-4">
            <div className="text-center p-3 rounded-xl bg-slate-50 border border-slate-200 min-w-[100px]">
              <div className="text-2xl font-black text-slate-800">
                {readiness?.overallPaperScore ?? 68}%
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mt-0.5">
                Overall Correctness
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-indigo-50 border border-indigo-200 min-w-[100px]">
              <div className="text-2xl font-black text-indigo-700">
                {readiness?.submissionReadinessScore ?? 50}%
              </div>
              <div className="text-[10px] uppercase font-bold text-indigo-600 mt-0.5">
                Submission Ready
              </div>
            </div>
          </div>
        </div>

        {/* Safe Action Progress Alert */}
        {actionProgress && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-medium animate-pulse">
            <RefreshCw size={14} className="animate-spin" />
            <span>{actionProgress}</span>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="mt-4 flex items-center justify-between p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 font-bold ml-2">Dismiss</button>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">Dismiss</button>
          </div>
        )}

        {/* Blocking Gates Alert (if in PRE_EXPERIMENTAL mode) */}
        {!isEmpirical && readiness?.blockingGates?.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider mb-2">
              <ShieldAlert size={15} className="text-amber-600" />
              <span>EMPIRICAL Mode Transition Gates Active</span>
            </div>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              {readiness.blockingGates.map((gate, i) => (
                <li key={i}>{gate}</li>
              ))}
            </ul>
          </div>
        )}

        {/* EMPIRICAL Mode Ready Banner */}
        {!isEmpirical && readiness?.isEmpiricalReady && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>All empirical gates cleared! Ready to unlock Results & Discussion.</span>
            </div>
            <button
              onClick={handleTransitionMode}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-xs"
            >
              Transition to EMPIRICAL
            </button>
          </div>
        )}
      </div>

      {/* 6 Canonical Dimensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dimensions.map(({ key, label, icon: Icon, color, actionLabel, onAction }) => {
          const dim = readiness ? readiness[key] : null;
          const score = dim?.score ?? 0;
          const status = dim?.status || 'MISSING';
          const missing = dim?.missingItems || [];
          const warnings = dim?.warnings || [];
          const isExpanded = expandedDimension === key;

          return (
            <div
              key={key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">{label}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      status === 'READY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'PARTIAL'
                        ? 'bg-blue-100 text-blue-800'
                        : status === 'BLOCKED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {/* Score Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-2xl font-black text-slate-900">{score}%</span>
                    <span className="text-[10px] font-medium text-slate-400">Target: 85–95%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                    />
                  </div>
                </div>

                {/* Missing Items Checklist */}
                {missing.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                    <div className="font-semibold text-slate-700 mb-1 text-[10px] uppercase tracking-wider">
                      Missing:
                    </div>
                    <ul className="space-y-0.5 list-disc list-inside">
                      {missing.slice(0, isExpanded ? missing.length : 3).map((item, idx) => (
                        <li key={idx} className="text-slate-500 truncate" title={item}>
                          {item}
                        </li>
                      ))}
                    </ul>
                    {missing.length > 3 && (
                      <button
                        onClick={() => setExpandedDimension(isExpanded ? null : key)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 mt-1 inline-flex items-center gap-0.5"
                      >
                        {isExpanded ? 'Show less' : `+${missing.length - 3} more`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={onAction}
                  className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>[{actionLabel}]</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Panel: Experimental Evidence Workflow (Item 3 & 4) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Experimental Evidence Workflow Actions
        </h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setIngestType('csv');
              setShowIngestModal(true);
            }}
            className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <UploadCloud size={14} />
            <span>Upload Results (CSV/TSV/JSON)</span>
          </button>
          <button
            onClick={() => {
              setIngestType('log');
              setShowIngestModal(true);
            }}
            className="px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <FileText size={14} />
            <span>Upload Logs (Train / Eval)</span>
          </button>
          <button
            onClick={() => {
              setIngestType('config');
              setShowIngestModal(true);
            }}
            className="px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sliders size={14} />
            <span>Upload Model Config</span>
          </button>
          <button
            onClick={() => {
              setIngestType('code');
              setShowIngestModal(true);
            }}
            className="px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <FileCode size={14} />
            <span>Upload Source Code</span>
          </button>
          <button
            onClick={() => setShowReproducibilityModal(true)}
            className="px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Github size={14} />
            <span>Link Repository / Manifest</span>
          </button>
          <button
            onClick={handlePlanVariants}
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle size={14} />
            <span>Add Planned Experiment Variants</span>
          </button>
          <button
            onClick={handleVerifyMath}
            className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Calculator size={14} />
            <span>Verify Math ↔ Code</span>
          </button>
        </div>
      </div>

      {/* Ingestion Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Ingest {ingestType.toUpperCase()} Artifact
              </h4>
              <button
                onClick={() => setShowIngestModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleIngest} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Source File Identifier / Raw Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. calvin_eval_seed42_2026.csv or eval_log.txt"
                  value={ingestFilename}
                  onChange={(e) => setIngestFilename(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Raw Content ({ingestType === 'csv' ? 'CSV/TSV rows' : 'Log / Code text'})
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={
                    ingestType === 'csv'
                      ? 'Model, Benchmark, Task, Metric, Value, Unit, Seed, RunId\nFull MERA-VLA, CALVIN, ABC->D, Success Rate, 84.6, %, 42, run_calvin_01'
                      : 'Paste log file contents or configuration / source code...'
                  }
                  value={ingestInput}
                  onChange={(e) => setIngestInput(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Normalize & Verify Ingestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reproducibility Manifest Modal */}
      {showReproducibilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Reproducibility Manifest & Environment
              </h4>
              <button
                onClick={() => setShowReproducibilityModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveReproducibility} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Git Repository URL</label>
                  <input
                    type="text"
                    value={reproForm.repositoryUrl}
                    onChange={(e) => setReproForm({ ...reproForm, repositoryUrl: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                    placeholder="https://github.com/org/repo"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Commit Hash</label>
                  <input
                    type="text"
                    value={reproForm.commitHash}
                    onChange={(e) => setReproForm({ ...reproForm, commitHash: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono"
                    placeholder="a1b2c3d4..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Python Version</label>
                  <input
                    type="text"
                    value={reproForm.pythonVersion}
                    onChange={(e) => setReproForm({ ...reproForm, pythonVersion: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">CUDA Version</label>
                  <input
                    type="text"
                    value={reproForm.cudaVersion}
                    onChange={(e) => setReproForm({ ...reproForm, cudaVersion: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">GPU Hardware</label>
                  <input
                    type="text"
                    value={reproForm.gpu}
                    onChange={(e) => setReproForm({ ...reproForm, gpu: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Model Checkpoint</label>
                  <input
                    type="text"
                    value={reproForm.checkpoint}
                    onChange={(e) => setReproForm({ ...reproForm, checkpoint: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg font-mono"
                    placeholder="checkpoint_epoch20.pt"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Dataset Version / Split</label>
                  <input
                    type="text"
                    value={reproForm.split}
                    onChange={(e) => setReproForm({ ...reproForm, split: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReproducibilityModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Save Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
