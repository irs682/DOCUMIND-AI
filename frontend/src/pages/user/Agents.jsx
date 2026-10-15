import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Sparkles,
  FileText,
  Search,
  ShieldCheck,
  Database,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  ListTree,
  FileCheck,
  GitCompare,
  Sliders,
  Award,
  RefreshCw,
  ExternalLink,
  Table,
  Check,
  X,
  Eye,
  Info,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { safeString } from '../../utils/safeRender';
import { agentApi } from '../../services/agentApi';
import { researchApi } from '../../services/researchApi';
import api from '../../services/api';

const SPECIALIST_AGENTS = [
  { id: 'retrieval-agent', name: 'Retrieval Agent', role: 'Hybrid BM25 + Dense RRF + Exact Lookup', icon: Search, tools: ['HybridSearch', 'ExactObjectLookup', 'Reranker'] },
  { id: 'literature-agent', name: 'Literature Agent', role: 'Canonical Paper Profiles & Limitations', icon: FileText, tools: ['extractPaperProfile', 'sourceNormalization'] },
  { id: 'comparison-agent', name: 'Comparison Agent', role: 'Multi-Criteria Normalized Matrix', icon: GitCompare, tools: ['generateComparisonMatrix', 'normalizeCriteria'] },
  { id: 'gap-agent', name: 'Research Gap Agent', role: 'Defensible Literature Gaps & RQs', icon: Sparkles, tools: ['performGapAnalysis', 'falsifiableHypotheses'] },
  { id: 'benchmark-agent', name: 'Benchmark Agent', role: 'Evaluation Protocol Compatibility', icon: Cpu, tools: ['evaluateBenchmarkCompatibility', 'splitValidation'] },
  { id: 'results-agent', name: 'Results & Statistics Agent', role: 'Deterministic Math & Provenance', icon: Table, tools: ['calculateDeterministicStatistics', 'resultProvenance'] },
  { id: 'critic-agent', name: 'Critic & Verifier Agent', role: 'Hallucination & Citation QC Gate', icon: ShieldCheck, tools: ['runCriticAgent', 'antiFabricationCheck'] },
  { id: 'manuscript-agent', name: 'Manuscript Agent', role: 'Evidence-Gated Section Synthesis', icon: Layers, tools: ['assembleAcademicManuscript', 'integrityAudit'] },
];

const PRESET_GOALS = [
  'Compare selected papers, evaluate benchmark compatibility, and identify research gaps.',
  'Extract canonical methodology, datasets, and baseline metrics into a comparison matrix.',
  'Analyze literature limitations and formulate falsifiable research questions with hypotheses.',
  'Perform full autonomous research synthesis and compile an evidence-grounded research brief.',
];

const Agents = () => {
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'history' | 'evaluation' | 'registry'
  const [userGoal, setUserGoal] = useState('');
  const [selectedDepth, setSelectedDepth] = useState('standard'); // 'quick' | 'standard' | 'deep_research'
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);

  // Active Execution State
  const [activeRun, setActiveRun] = useState(null);
  const [activeRunId, setActiveRunId] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeArtifactTab, setActiveArtifactTab] = useState('synthesis'); // 'synthesis' | 'matrix' | 'gaps' | 'evidence' | 'critic'
  const [selectedClaimEvidence, setSelectedClaimEvidence] = useState(null);

  // Past Runs & Evaluation
  const [pastRuns, setPastRuns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [evalResults, setEvalResults] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // SSE event subscriber ref
  const unsubscribeRef = useRef(null);

  // Load Projects, Documents & Previous Runs
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const [projRes, docRes, runsRes] = await Promise.allSettled([
        researchApi.getProjects(),
        api.get('/documents'),
        agentApi.getRuns(),
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data?.projects) {
        setProjects(projRes.value.data.projects);
      }
      if (docRes.status === 'fulfilled' && docRes.value?.data?.documents) {
        setDocuments(docRes.value.data.documents);
      }
      if (runsRes.status === 'fulfilled' && runsRes.value?.data?.runs) {
        setPastRuns(runsRes.value.data.runs);
      }
    } catch (err) {
      console.warn('Failed to load initial agent data:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Cleanup SSE subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Connect SSE for active run
  const connectSSE = useCallback((runId) => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsub = agentApi.subscribeRunEvents(
      runId,
      (eventData) => {
        setActiveRun((prev) => {
          if (!prev) return eventData;
          return {
            ...prev,
            ...eventData,
            plan: eventData.plan || prev.plan,
            completedTasks: eventData.completedTasks || prev.completedTasks || [],
            failedTasks: eventData.failedTasks || prev.failedTasks || [],
            stepLogs: eventData.stepLogs || prev.stepLogs || [],
            finalOutput: eventData.finalOutput || prev.finalOutput,
          };
        });

        if (eventData.status === 'completed' || eventData.status === 'failed' || eventData.status === 'cancelled') {
          // Refresh past runs list
          agentApi.getRuns().then((res) => {
            if (res.data?.runs) setPastRuns(res.data.runs);
          });
        }
      },
      (err) => {
        console.warn('SSE stream disconnected, polling fallback will handle updates:', err);
      }
    );

    unsubscribeRef.current = unsub;
  }, []);

  // Fallback Polling Effect: Ensures UI stays updated if SSE drops
  useEffect(() => {
    if (!activeRunId) return;
    if (activeRun?.status !== 'running' && activeRun?.status !== 'planning') return;

    const interval = setInterval(async () => {
      try {
        const res = await agentApi.getRunById(activeRunId);
        if (res.data?.run) {
          setActiveRun((prev) => ({
            ...(prev || {}),
            ...res.data.run,
          }));
        }
      } catch (err) {
        // Silent fallback failure
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeRunId, activeRun?.status]);

  // Start Autonomous Research Run
  const handleStartRun = async (e) => {
    e?.preventDefault();
    if (!userGoal.trim() || isStarting) return;

    setErrorMessage('');
    setIsStarting(true);
    setActiveRun(null);

    try {
      const payload = {
        goal: userGoal.trim(),
        projectId: selectedProjectId || undefined,
        documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        depth: selectedDepth,
      };

      const res = await agentApi.startRun(payload);
      if (res.data?.run) {
        setActiveRun(res.data.run);
        setActiveRunId(res.data.runId);
        connectSSE(res.data.runId);
        setPastRuns((prev) => [res.data.run, ...prev]);
      }
    } catch (err) {
      console.error('Failed to start autonomous run:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Could not start research run.');
    } finally {
      setIsStarting(false);
    }
  };

  // Retry Planning Controller
  const handleRetryPlanning = async () => {
    if (!activeRunId) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await agentApi.retryPlanning(activeRunId);
      if (res.data?.run) {
        setActiveRun(res.data.run);
        connectSSE(activeRunId);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to retry planning.');
    } finally {
      setActionLoading(false);
    }
  };

  // Pause / Resume / Cancel Controls
  const handlePause = async () => {
    if (!activeRunId) return;
    setActionLoading(true);
    try {
      const res = await agentApi.pauseRun(activeRunId);
      if (res.data?.run) setActiveRun(res.data.run);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!activeRunId) return;
    setActionLoading(true);
    try {
      const res = await agentApi.resumeRun(activeRunId);
      if (res.data?.run) {
        setActiveRun(res.data.run);
        connectSSE(activeRunId);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeRunId) return;
    setActionLoading(true);
    try {
      const res = await agentApi.cancelRun(activeRunId);
      if (res.data?.run) setActiveRun(res.data.run);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Human-in-the-Loop Approval Decision
  const handleApprovalDecision = async (approvalId, decision) => {
    if (!activeRunId) return;
    try {
      const res = await agentApi.approveGate(activeRunId, {
        approvalId,
        decision,
      });
      if (res.data?.run) setActiveRun(res.data.run);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Load Past Run Details
  const handleOpenPastRun = async (run) => {
    setActiveRunId(run.runId);
    try {
      const res = await agentApi.getRunById(run.runId || run._id);
      if (res.data?.run) {
        setActiveRun(res.data.run);
        setActiveTab('studio');
        if (res.data.run.status === 'running') {
          connectSSE(res.data.run.runId);
        }
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Trigger Evaluation Suite
  const handleRunEvaluation = async () => {
    setEvalLoading(true);
    try {
      const res = await agentApi.runEvaluation();
      setEvalResults(res.data);
      setActiveTab('evaluation');
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setEvalLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Bot size={16} />
            <span>Autonomous Intelligence Layer</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Autonomous Research Agent
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Deconstructs complex research goals, routes across specialist agents, grounds claims in verified evidence, and produces structured artifacts.
          </p>
        </div>

        {/* Global Evaluation Trigger */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunEvaluation}
            loading={evalLoading}
            leftIcon={Award}
          >
            Run Agent Evaluation Suite
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'studio'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Research Studio
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Run History</span>
          {pastRuns.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-mono">
              {pastRuns.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('evaluation')}
          className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'evaluation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Evaluation Suite
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('registry')}
          className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'registry'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Specialist Agents ({SPECIALIST_AGENTS.length})
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <p className="flex-1">{errorMessage}</p>
          <button type="button" onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── TAB 1: RESEARCH STUDIO ── */}
      {activeTab === 'studio' && (
        <div className="space-y-6">
          {/* Launcher Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" />
                  <span>Start Autonomous Research Task</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The agent will construct a task graph, verify evidence, check benchmarks, and produce a defensible synthesis.
                </p>
              </div>

              {/* Research Depth Switcher */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                {[
                  { id: 'quick', label: 'Quick', desc: 'Fast analysis' },
                  { id: 'standard', label: 'Standard', desc: 'Thorough verification' },
                  { id: 'deep_research', label: 'Deep Research', desc: 'Exhaustive + HITL Gates' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDepth(d.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedDepth === d.id
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title={d.desc}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleStartRun} className="space-y-4">
              {/* Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400">Presets:</span>
                {PRESET_GOALS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setUserGoal(preset)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors text-left truncate max-w-xs"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Goal Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Research Goal or Scientific Inquiry
                </label>
                <textarea
                  required
                  rows={3}
                  value={userGoal}
                  onChange={(e) => setUserGoal(e.target.value)}
                  placeholder="e.g. Compare selected VLA papers, verify benchmark compatibility, extract limitations, and synthesize candidate research gaps..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Project & Scope Selectors */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Link to Research Project (Optional)
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">No linked project (Standalone research run)</option>
                    {projects.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.title} ({p.researchTopic || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Target Corpus Scope
                  </label>
                  <div className="text-xs text-slate-500 pt-2.5">
                    {selectedDocIds.length > 0
                      ? `${selectedDocIds.length} custom documents selected`
                      : 'All project papers & indexed knowledge base documents'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  loading={isStarting}
                  leftIcon={Play}
                  className="px-6"
                >
                  Start Autonomous Research
                </Button>
              </div>
            </form>
          </div>

          {/* Active Observable Run Monitor */}
          {activeRun && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/20 p-6 shadow-sm space-y-5">
              {/* Status & Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-indigo-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Run ID: <span className="font-mono">{activeRun.runId}</span>
                    </span>
                    <Badge
                      variant={
                        activeRun.status === 'completed'
                          ? 'success'
                          : activeRun.status === 'failed'
                          ? 'danger'
                          : activeRun.status === 'paused'
                          ? 'warning'
                          : 'primary'
                      }
                    >
                      {activeRun.status.toUpperCase()}
                    </Badge>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">
                    "{activeRun.userGoal}"
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Phase: <span className="font-semibold text-indigo-600">{activeRun.currentPhase || 'Running'}</span> • Node: <span className="font-mono text-slate-700">{activeRun.currentNode || 'START'}</span>
                  </p>
                </div>

                {/* Pause / Resume / Cancel Controls */}
                <div className="flex items-center gap-2">
                  {activeRun.status === 'running' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handlePause}
                      loading={actionLoading}
                      leftIcon={Pause}
                    >
                      Pause
                    </Button>
                  )}
                  {activeRun.status === 'paused' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleResume}
                      loading={actionLoading}
                      leftIcon={Play}
                    >
                      Resume
                    </Button>
                  )}
                  {activeRun.status !== 'completed' && activeRun.status !== 'cancelled' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleCancel}
                      loading={actionLoading}
                      leftIcon={XCircle}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Execution Progress</span>
                  <span>{activeRun.progress || 0}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${activeRun.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Human-in-the-Loop Approval Banner */}
              {Array.isArray(activeRun.approvalRequests) &&
                activeRun.approvalRequests.filter((r) => r.status === 'pending').map((req) => (
                  <div key={req.id} className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                        <AlertCircle size={16} />
                        <span>Human-in-the-Loop Gate Required</span>
                      </div>
                      <span className="text-xs text-amber-700 font-semibold">{req.title}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{req.description}</p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApprovalDecision(req.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprovalDecision(req.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={14} />
                        <span>Approve & Proceed</span>
                      </button>
                    </div>
                  </div>
                ))}

              {/* Enhanced Failure / Attention Banner */}
              {(activeRun.status === 'failed' || activeRun.status === 'waiting_for_retry' || activeRun.status === 'stalled') && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-800">
                      <AlertCircle size={16} />
                      <span>
                        {activeRun.verificationStatus === 'INSUFFICIENT_CORPUS'
                          ? 'Corpus Scope Notice'
                          : activeRun.status === 'stalled'
                          ? 'Run Stalled (Inactivity)'
                          : 'Planning Requires Attention'}
                      </span>
                    </div>
                    <Badge variant="danger" size="sm">
                      {activeRun.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-rose-950">
                      {activeRun.verificationStatus === 'INSUFFICIENT_CORPUS'
                        ? 'No indexed papers were found for this research scope.'
                        : (activeRun.completedTasks?.length === 0 || !activeRun.completedTasks)
                        ? 'Research planning could not complete.'
                        : `Task ${activeRun.currentNode} encountered an execution error.`}
                    </h3>
                    <div className="mt-1.5 text-xs text-rose-800 space-y-1">
                      <p>
                        <span className="font-semibold">Stage:</span>{' '}
                        {(activeRun.completedTasks?.length === 0 || !activeRun.completedTasks)
                          ? 'Building research task graph'
                          : activeRun.currentPhase || activeRun.currentNode}
                      </p>
                      <p>
                        <span className="font-semibold">Reason:</span>{' '}
                        {activeRun.errors?.[0] || 'Planner output could not be validated.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200">
                    {activeRun.verificationStatus === 'INSUFFICIENT_CORPUS' ? (
                      <a
                        href="/documents"
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition"
                      >
                        Manage Papers
                      </a>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleRetryPlanning}
                        loading={actionLoading}
                        leftIcon={RefreshCw}
                      >
                        Retry Planning
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveArtifactTab('critic')}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleCancel}
                      loading={actionLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Task Graph & Dependency Cards */}
              {activeRun.plan?.tasks && activeRun.plan.tasks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ListTree size={14} className="text-indigo-600" />
                    <span>Dependency Task Graph</span>
                  </h4>
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {activeRun.plan.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                          task.status === 'completed'
                            ? 'border-emerald-200 bg-emerald-50/50 text-slate-800'
                            : task.status === 'in_progress'
                            ? 'border-indigo-300 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                            : task.status === 'failed'
                            ? 'border-rose-200 bg-rose-50 text-rose-900'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="font-mono">{task.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              task.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : task.status === 'in_progress'
                                ? 'bg-indigo-200 text-indigo-800 animate-pulse'
                                : task.status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <p className="font-medium text-slate-900 leading-snug">{task.title}</p>
                        {task.dependencies?.length > 0 && (
                          <p className="text-[10px] text-slate-400">
                            Depends on: <span className="font-mono">{task.dependencies.join(', ')}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artifacts & Output Viewers */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <FileCheck size={16} className="text-indigo-600" />
                    <span>Agent Research Artifacts</span>
                  </div>

                  {/* Artifact Sub-Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    {[
                      { id: 'synthesis', label: 'Synthesis Brief' },
                      { id: 'matrix', label: 'Comparison Matrix' },
                      { id: 'gaps', label: 'Research Gaps' },
                      { id: 'evidence', label: `Evidence Ledger (${activeRun.evidence?.length || 0})` },
                      { id: 'critic', label: 'Critic & QC' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveArtifactTab(tab.id)}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          activeArtifactTab === tab.id
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab: Synthesis Brief */}
                {activeArtifactTab === 'synthesis' && (
                  <div className="space-y-4">
                    <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100">
                      {activeRun.finalOutput?.summary ? (
                        <div className="whitespace-pre-wrap font-sans text-slate-800">
                          {activeRun.finalOutput.summary}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">
                          {activeRun.status === 'completed'
                            ? 'Autonomous brief compiled successfully.'
                            : 'Research brief will be compiled once upstream verification tasks finish.'}
                        </div>
                      )}
                    </div>

                    {/* Evidence Inspector Ledger for Claims */}
                    {activeRun.finalOutput?.claims?.length > 0 && (
                      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                            <ShieldCheck size={16} className="text-emerald-600" />
                            <span>Scientific Claim Grounding Ledger ({activeRun.finalOutput.claims.length} claims audited)</span>
                          </div>
                          {activeRun.finalOutput?.qualityGate && (
                            <Badge variant={activeRun.finalOutput.qualityGate.evidenceIntegrity === 'PASS' ? 'success' : 'warning'} size="sm">
                              {activeRun.finalOutput.qualityGate.evidenceIntegrity === 'PASS' ? 'Evidence Integrity: PASS' : 'Integrity: REVIEW'}
                            </Badge>
                          )}
                        </div>

                        <div className="grid gap-2">
                          {activeRun.finalOutput.claims.map((claim, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3 rounded-lg border border-slate-150 bg-slate-50/50 hover:bg-white text-xs space-y-2 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-slate-800 leading-snug">"{claim.text}"</p>
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Provenance Badge */}
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                                    {claim.provenanceType === 'SYSTEM_PROVENANCE' ? 'System Metadata' : 'Source Fact'}
                                  </span>
                                  {/* Support Level Badge */}
                                  <Badge
                                    variant={
                                      claim.supportLevel === 'FULLY_SUPPORTED' || claim.status === 'VERIFIED'
                                        ? 'success'
                                        : claim.supportLevel === 'CONTRADICTED'
                                        ? 'danger'
                                        : 'warning'
                                    }
                                    size="sm"
                                  >
                                    {claim.supportLevel || claim.status}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                    {claim.claimType || 'DIRECT_SOURCE_FACT'}
                                  </span>
                                  <span>
                                    Source: <span className="font-semibold text-slate-700">{claim.canonicalSourceId}</span>
                                    {claim.pageNumbers?.length > 0 && <span> (p. {claim.pageNumbers.join(', ')})</span>}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setSelectedClaimEvidence(claim)}
                                    leftIcon={Eye}
                                  >
                                    Why is this here?
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Comparison Matrix */}
                {activeArtifactTab === 'matrix' && (
                  <div className="space-y-3">
                    {(activeRun.finalOutput?.canonicalSourcesCount === 1 || activeRun.finalOutput?.comparisonMatrix?.isSingleSourceCorpus) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Single Canonical Source Notice:</span>{' '}
                          Comparative analysis is limited because only one unique scholarly source is currently available. Duplicate files were deduplicated into a single canonical source.
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      {activeRun.finalOutput?.comparisonMatrix?.length > 0 ? (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                              <th className="p-3">Criterion</th>
                              {activeRun.finalOutput.paperProfiles?.map((p, idx) => (
                                <th key={idx} className="p-3">{p.title?.value || p.title || p.documentName}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {activeRun.finalOutput.comparisonMatrix.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-900">{row.aspect || row.criterion}</td>
                                {activeRun.finalOutput.paperProfiles?.map((p, pIdx) => {
                                  const docKey = p.canonicalSourceId || p.documentId;
                                  const rawVal = row.values ? row.values[docKey] || row.values[p.documentId] || (Array.isArray(row.values) ? row.values[pIdx] : 'N/A') : 'N/A';
                                  const val = safeString(rawVal, 'Not reported in source');
                                  return (
                                    <td key={pIdx} className="p-3">{val}</td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400 italic">
                          Comparison matrix in progress or pending paper extraction.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Research Gaps & RQs */}
                {activeArtifactTab === 'gaps' && (
                  <div className="space-y-3">
                    {activeRun.finalOutput?.gapAnalysis?.gaps?.length > 0 ? (
                      activeRun.finalOutput.gapAnalysis.gaps.map((gap, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-indigo-900">
                            <span>Gap {idx + 1}: {gap.title}</span>
                            <Badge variant="primary">{gap.category || 'Methodological'}</Badge>
                          </div>
                          <p className="text-slate-700">{gap.description}</p>
                          {gap.supportingPapers?.length > 0 && (
                            <p className="text-[11px] text-slate-500">
                              Grounded in: <span className="font-semibold">{gap.supportingPapers.join(', ')}</span>
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        No gaps extracted yet.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Evidence Ledger */}
                {activeArtifactTab === 'evidence' && (
                  <div className="overflow-x-auto max-h-96">
                    {activeRun.evidence?.length > 0 ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                            <th className="p-3">Citation</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Page</th>
                            <th className="p-3">Verbatim Content</th>
                            <th className="p-3">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {activeRun.evidence.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono font-semibold text-indigo-600">{item.citation || '[Doc]'}</td>
                              <td className="p-3 uppercase text-[10px] font-bold text-slate-500">{item.objectType}</td>
                              <td className="p-3 font-mono">p. {item.pageNumber}</td>
                              <td className="p-3 max-w-md truncate" title={item.content}>{item.content}</td>
                              <td className="p-3 font-mono text-emerald-600">{(item.confidence * 100).toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        Evidence ledger tokens will populate during retrieval and extraction.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Critic & QC */}
                {activeArtifactTab === 'critic' && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Award size={16} className="text-indigo-600" />
                        <span>Multi-Dimensional Scientific Quality Gate</span>
                      </div>
                      <Badge variant={activeRun.finalOutput?.qualityGate?.isPublicationReady ? 'success' : 'warning'}>
                        {activeRun.finalOutput?.qualityGate?.isPublicationReady ? 'Publication Ready: PASS' : 'Scoped / Partial Research Status'}
                      </Badge>
                    </div>

                    {/* Multi-Dimensional Verdict Matrix */}
                    {activeRun.finalOutput?.qualityGate && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Evidence Integrity</span>
                          <span className="text-xs font-bold text-emerald-600">{activeRun.finalOutput.qualityGate.evidenceIntegrity || 'PASS'}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Corpus Sufficiency</span>
                          <span className="text-xs font-bold text-amber-600">{activeRun.finalOutput.qualityGate.corpusSufficiency || 'LIMITED'}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Citation Precision</span>
                          <span className="text-xs font-bold text-emerald-600">{activeRun.finalOutput.qualityGate.citationPrecision || 'PASS'}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Gap Verification</span>
                          <span className="text-xs font-bold text-indigo-600">{activeRun.finalOutput.qualityGate.gapVerification || 'CORPUS_SUPPORTED'}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Benchmark Comparability</span>
                          <span className="text-xs font-bold text-slate-600">{activeRun.finalOutput.qualityGate.benchmarkComparability || 'NOT_APPLICABLE'}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Synthesis Scope</span>
                          <span className="text-xs font-bold text-slate-700">{activeRun.finalOutput.qualityGate.overallSynthesisStatus || 'SCOPED_SINGLE_SOURCE'}</span>
                        </div>
                      </div>
                    )}

                    {/* Scientific Readiness Categories */}
                    {activeRun.finalOutput?.qualityGate?.readinessScores && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-800 text-[11px] block">Scientific Readiness Breakdown (By Dimension):</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Literature Coverage:</span>
                            <span className="font-bold text-slate-700">{activeRun.finalOutput.qualityGate.readinessScores.literatureCoverage}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Evidence Integrity:</span>
                            <span className="font-bold text-emerald-600">{activeRun.finalOutput.qualityGate.readinessScores.evidenceIntegrity}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Methodology:</span>
                            <span className="font-bold text-slate-700">{activeRun.finalOutput.qualityGate.readinessScores.methodologyReadiness}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Empirical Experiment:</span>
                            <span className="font-bold text-amber-600">{activeRun.finalOutput.qualityGate.readinessScores.experimentReadiness}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Statistical Readiness:</span>
                            <span className="font-bold text-amber-600">{activeRun.finalOutput.qualityGate.readinessScores.statisticalReadiness}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Manuscript Integrity:</span>
                            <span className="font-bold text-slate-700">{activeRun.finalOutput.qualityGate.readinessScores.manuscriptReadiness}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Reproducibility:</span>
                            <span className="font-bold text-emerald-600">{activeRun.finalOutput.qualityGate.readinessScores.reproducibility}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold">Overall Readiness:</span>
                            <span className="font-bold text-indigo-600">{activeRun.finalOutput.qualityGate.readinessScores.overallReadiness}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recommended Next Evidence (Requirement 51) */}
                    {activeRun.finalOutput?.recommendedNextEvidence?.length > 0 && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                        <span className="font-bold text-amber-900 block flex items-center gap-1.5">
                          <Info size={14} className="text-amber-700" />
                          Recommended Next Evidence to Strengthen Scientific Readiness:
                        </span>
                        <ul className="list-disc list-inside text-amber-950 space-y-1 pl-1">
                          {activeRun.finalOutput.recommendedNextEvidence.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {activeRun.warnings?.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-semibold text-amber-700">Audit Flags:</span>
                        {activeRun.warnings.map((w, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: RUN HISTORY ── */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              <span>Persistent Agent Runs</span>
            </h3>
            <span className="text-xs text-slate-500">{pastRuns.length} total runs recorded</span>
          </div>

          {pastRuns.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              No previous agent runs found. Launch your first autonomous research run in the Studio.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pastRuns.map((run) => (
                <div
                  key={run.runId || run._id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 p-3 rounded-xl transition"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-indigo-600 font-bold">{run.runId}</span>
                      <Badge
                        variant={
                          run.status === 'completed'
                            ? 'success'
                            : run.status === 'failed'
                            ? 'danger'
                            : run.status === 'paused'
                            ? 'warning'
                            : 'primary'
                        }
                      >
                        {run.status}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        {run.createdAt ? new Date(run.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{run.userGoal}</p>
                    <p className="text-xs text-slate-500">
                      Phase: {run.currentPhase || 'Completed'} • Tasks: {run.completedTasks?.length || 0} finished • Artifacts: {run.artifacts?.length || 0}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenPastRun(run)}
                    rightIcon={ChevronRight}
                  >
                    Open Run
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: EVALUATION SUITE ── */}
      {activeTab === 'evaluation' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award size={18} className="text-indigo-600" />
                <span>Autonomous Agent Scenario Evaluation Suite</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated tests verifying factual accuracy, citation format, deterministic statistics, anti-fabrication, and error recovery.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunEvaluation}
              loading={evalLoading}
              leftIcon={RefreshCw}
            >
              Re-run Suite
            </Button>
          </div>

          {evalResults ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs font-semibold">
                <div>
                  Overall Status: <span className="text-emerald-700 font-bold">{evalResults.success ? 'ALL PASSED' : 'ISSUES DETECTED'}</span>
                </div>
                <div>
                  Tests Passed: <span className="font-bold">{evalResults.passedTests} / {evalResults.totalTests}</span>
                </div>
                <div>
                  Executed at: {new Date(evalResults.timestamp).toLocaleTimeString()}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {evalResults.results?.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      res.status === 'PASSED'
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-rose-200 bg-rose-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900">{res.testName}</span>
                      <Badge variant={res.status === 'PASSED' ? 'success' : 'danger'}>
                        {res.status}
                      </Badge>
                    </div>
                    <p className="text-slate-600">{res.detail}</p>
                    {res.ci95 && (
                      <p className="font-mono text-[11px] text-slate-500">
                        Mean: {res.calculatedMean} • 95% CI: [{res.ci95.join(', ')}]
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              Click "Run Agent Evaluation Suite" to execute scenario verification tests.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SPECIALIST AGENTS REGISTRY ── */}
      {activeTab === 'registry' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Specialist Agent Architecture & Tool Permissions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Each specialized agent operates under strict principle of least privilege with bound capabilities.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SPECIALIST_AGENTS.map((agent) => {
              const Icon = agent.icon;
              return (
                <div key={agent.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{agent.name}</h4>
                    <p className="text-xs text-slate-500">{agent.role}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Permitted Tools:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {agent.tools.map((t, idx) => (
                        <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Evidence Inspector Modal ── */}
      {selectedClaimEvidence && (
        <Modal
          isOpen={Boolean(selectedClaimEvidence)}
          onClose={() => setSelectedClaimEvidence(null)}
          title="Evidence Inspector — Claim Grounding & Provenance"
        >
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold uppercase tracking-wider text-slate-500 block">Claim Statement:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                    {selectedClaimEvidence.provenanceType === 'SYSTEM_PROVENANCE' ? 'System Metadata' : 'Source Fact'}
                  </span>
                  <Badge variant={selectedClaimEvidence.supportLevel === 'FULLY_SUPPORTED' || selectedClaimEvidence.status === 'VERIFIED' ? 'success' : selectedClaimEvidence.supportLevel === 'CONTRADICTED' ? 'danger' : 'warning'} size="sm">
                    {selectedClaimEvidence.supportLevel || selectedClaimEvidence.status}
                  </Badge>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900 p-3 bg-slate-50 rounded-xl border border-slate-200">
                "{selectedClaimEvidence.text}"
              </p>
            </div>

            {/* Why is this here? Derivation Path */}
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
              <span className="font-bold uppercase tracking-wider text-indigo-900 text-[10px] block flex items-center gap-1">
                <Info size={12} className="text-indigo-600" />
                Why is this here? (Derivation Path):
              </span>
              <p className="font-mono text-[11px] text-indigo-950 font-medium">
                {selectedClaimEvidence.whyIsThisHere?.derivationPath || `Source -> Evidence [${selectedClaimEvidence.evidenceIds?.[0] || 'chunk'}] -> Claim [${selectedClaimEvidence.claimId}]`}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold block text-slate-400 text-[10px] uppercase">Claim Type:</span>
                <span className="font-mono text-slate-800 font-bold text-[10px]">{selectedClaimEvidence.claimType || 'DIRECT_SOURCE_FACT'}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold block text-slate-400 text-[10px] uppercase">Source ID:</span>
                <span className="font-mono text-slate-800 font-bold text-[10px]">{selectedClaimEvidence.canonicalSourceId}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold block text-slate-400 text-[10px] uppercase">Page Number(s):</span>
                <span className="font-mono text-slate-800 font-bold text-[10px]">
                  {selectedClaimEvidence.pageNumbers?.length > 0 ? `Page ${selectedClaimEvidence.pageNumbers.join(', ')}` : 'N/A'}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold block text-slate-400 text-[10px] uppercase">Object Type:</span>
                <span className="font-mono text-slate-800 font-bold text-[10px] uppercase">{selectedClaimEvidence.objectType || 'TEXT'}</span>
              </div>
            </div>

            {/* Multi-Dimensional Evidence Strength */}
            {selectedClaimEvidence.evidenceStrength && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                  Structured Evidence Strength Dimensions (0.00 - 1.00):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-[10px]">
                  <div className="p-1.5 bg-white rounded border border-slate-100">
                    <span className="text-slate-400 block">Directness</span>
                    <span className="font-bold text-slate-700">{selectedClaimEvidence.evidenceStrength.sourceDirectness}</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-100">
                    <span className="text-slate-400 block">Retrieval Conf.</span>
                    <span className="font-bold text-slate-700">{selectedClaimEvidence.evidenceStrength.retrievalConfidence}</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-100">
                    <span className="text-slate-400 block">Specificity</span>
                    <span className="font-bold text-slate-700">{selectedClaimEvidence.evidenceStrength.sourceSpecificity}</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-100">
                    <span className="text-slate-400 block">Precision</span>
                    <span className="font-bold text-slate-700">{selectedClaimEvidence.evidenceStrength.pageObjectPrecision}</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-100">
                    <span className="text-slate-400 block">Composite</span>
                    <span className="font-bold text-emerald-600">{selectedClaimEvidence.evidenceStrength.compositeScore}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Exhaustive Absence Coverage Report */}
            {selectedClaimEvidence.absenceReport && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-emerald-950">
                <span className="font-bold uppercase tracking-wider text-[10px] block text-emerald-800">
                  Exhaustive Absence Verification Proof:
                </span>
                <p className="text-[11px] leading-relaxed">
                  Inspected {selectedClaimEvidence.absenceReport.totalItemsInspected} document objects across {selectedClaimEvidence.absenceReport.pagesSearchedCount} page(s) and {selectedClaimEvidence.absenceReport.sectionsSearchedCount} section(s) with expanded concept synonyms [{selectedClaimEvidence.absenceReport.synonymsChecked?.slice(0, 5).join(', ')}...]. Exactly 0 matching occurrences found in full paper text, tables, figures, or appendix.
                </p>
              </div>
            )}

            {/* Verbatim Source Evidence */}
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1">Verbatim Source Evidence:</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-serif leading-relaxed italic">
                {selectedClaimEvidence.quote || `Anchored to EvidenceObject ID: ${selectedClaimEvidence.evidenceIds?.[0] || 'N/A'}`}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setSelectedClaimEvidence(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Agents;
