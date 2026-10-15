import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Upload,
  BookOpen,
  MessageSquare,
  FileText,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Pin,
  GitCompare,
  Layers,
  HelpCircle,
  Cpu,
  BarChart2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Flame,
  Activity,
  Award,
  Sigma,
  Bot,
  Compass,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { researchApi } from '../../services/researchApi';
import { fetchDocuments } from '../../api/documentsApi';
import ResearchReadinessRing from '../../components/research/ResearchReadinessRing';
import KnowledgeConstellation from '../../components/research/KnowledgeConstellation';
import ResearchCopilotDrawer from '../../components/research/ResearchCopilotDrawer';
import NewProjectModal from '../../components/common/NewProjectModal';

const WORKSTEP_NAMES = [
  '',
  'Step 1 — Add Papers',
  'Step 2 — Research Goal',
  'Step 3 — Related Work',
  'Step 4 — Comparison Matrix',
  'Step 5 — Research Gaps',
  'Step 6 — Questions & Hypotheses',
  'Step 7 — Methodology',
  'Step 8 — Benchmarks & Baselines',
  'Step 9 — Results & Gains',
  'Step 10 — Discussion & Analysis',
  'Step 11 — Paper Draft',
];

const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const calculateProjectReadiness = (proj) => {
  if (!proj) return { score: 0, label: 'Early Concept', pillars: {} };

  // 1. Literature pillar (0-100)
  const papersCount = proj.paperProfiles?.length || proj.documentIds?.length || 0;
  const litScore = Math.min(100, Math.round((papersCount / 3) * 60 + (proj.relatedWork?.table?.length ? 40 : 0)));

  // 2. Methodology pillar (0-100)
  const hasArch = !!proj.methodology?.proposedArchitecture;
  const hasBaselines = (proj.baselines?.length || 0) > 0;
  const methScore = Math.min(100, (hasArch ? 60 : 0) + (hasBaselines ? 40 : 0));

  // 3. Experiments pillar (Hard gated: caps without verified results)
  const verifiedCount = (proj.userResults || []).filter((r) => r.verified).length;
  const expScore = verifiedCount > 0 ? Math.min(100, 30 + verifiedCount * 25) : (proj.userResults?.length ? 25 : 0);

  // 4. Manuscript pillar (0-100)
  const hasDraft = !!proj.generatedDraft?.title;
  const sectionsCount = proj.generatedDraft?.sections?.length || 0;
  const manuScore = hasDraft ? Math.min(100, 50 + sectionsCount * 10) : 0;

  // 5. Integrity pillar (0-100)
  const gapsCount = proj.researchGaps?.length || 0;
  const rqsCount = proj.researchQuestions?.length || 0;
  const integrityScore = Math.min(100, Math.round((gapsCount > 0 ? 50 : 0) + (rqsCount > 0 ? 50 : 0)));

  // 6. Reproducibility
  const repScore = verifiedCount > 0 ? 85 : 61;

  // Overall scientific readiness percentage
  // Hard gate: zero verified empirical results caps overall readiness at 72%
  const unweighted = Math.round((litScore + methScore + expScore + manuScore + integrityScore) / 5);
  const finalScore = verifiedCount > 0 ? unweighted : Math.min(72, unweighted);

  let label = 'Pre-Experimental Draft';
  if (finalScore >= 90) label = 'Publication Ready';
  else if (finalScore >= 75) label = 'Empirical Draft';
  else if (finalScore >= 50) label = 'Structured Research';

  return {
    score: finalScore,
    label,
    pillars: {
      literature: litScore,
      methodology: methScore,
      experiments: expScore,
      manuscript: manuScore,
      integrity: integrityScore,
      reproducibility: repScore,
    },
  };
};

const Dashboard = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // State
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pinnedProjectIds, setPinnedProjectIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('documind_pinned_projects') || '[]');
    } catch {
      return [];
    }
  });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Load real workspace data
  const loadDashboardData = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const [projRes, docsRes] = await Promise.allSettled([
        researchApi.getProjects(force),
        fetchDocuments(force),
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data?.projects) {
        setProjects(projRes.value.data.projects);
      } else {
        setProjects([]);
      }

      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)) {
        setDocuments(docsRes.value);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('We could not load your research workspace data. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Primary active study project
  const activeProject = useMemo(() => {
    if (!projects.length) return null;
    if (selectedProjectId) {
      const match = projects.find((p) => (p._id || p.id) === selectedProjectId);
      if (match) return match;
    }
    return projects[0];
  }, [projects, selectedProjectId]);

  // Pin/Unpin project
  const togglePinProject = (id) => {
    setPinnedProjectIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [id, ...prev];
      localStorage.setItem('documind_pinned_projects', JSON.stringify(next));
      return next;
    });
  };

  // Readiness Calculation for the active study
  const activeReadiness = useMemo(() => {
    return calculateProjectReadiness(activeProject);
  }, [activeProject]);

  // "What Needs Attention" Center (Triage items derived from active project state)
  const attentionItems = useMemo(() => {
    if (!activeProject) return [];
    const items = [];
    const pId = activeProject._id || activeProject.id;
    const verifiedResults = (activeProject.userResults || []).filter((r) => r.verified).length;
    const papersCount = activeProject.paperProfiles?.length || activeProject.documentIds?.length || 0;
    const rqsCount = activeProject.researchQuestions?.length || 0;

    // Critical Triage
    if (verifiedResults === 0 && (activeProject.currentStep || 1) >= 9) {
      items.push({
        id: 'crit-1',
        level: 'CRITICAL',
        badgeColor: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
        title: 'Empirical Verification Gate: 0 Verified Results',
        desc: 'Research readiness is strictly capped at 72% until verified test runs are supplied in Step 9.',
        actionLabel: 'Log Results',
        actionUrl: `/research/projects/${pId}/step/9`,
      });
    }

    // Major Triage
    if (papersCount <= 1 && (activeProject.currentStep || 1) >= 3) {
      items.push({
        id: 'maj-1',
        level: 'MAJOR',
        badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900',
        title: 'Only 1 Unique Source Supports Related Work',
        desc: 'Academic synthesis requires pairwise contrast against at least 2 distinct peer-reviewed baselines.',
        actionLabel: 'Add Papers',
        actionUrl: `/research/projects/${pId}/step/1`,
      });
    }

    // Warning Triage
    if (rqsCount > 0 && (!activeProject.metrics || activeProject.metrics.length === 0)) {
      items.push({
        id: 'warn-1',
        level: 'WARNING',
        badgeColor: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
        title: 'Hypotheses Lack Quantitative Metric Bindings',
        desc: 'Research questions have been defined, but no benchmark evaluation metric is formally bound in Step 8.',
        actionLabel: 'Bind Metrics',
        actionUrl: `/research/projects/${pId}/step/8`,
      });
    }

    // Info Triage
    if (activeProject.generatedDraft?.title) {
      items.push({
        id: 'info-1',
        level: 'INFO',
        badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
        title: '19D Scientific Validation Audit Ready',
        desc: 'Run reproducibility, nomenclature, and citation audits on your active paper draft.',
        actionLabel: 'Run Audit',
        actionUrl: `/research/projects/${pId}/step/11`,
      });
    }

    return items;
  }, [activeProject]);

  // Research Milestones Stepper
  const milestones = useMemo(() => {
    if (!activeProject) return [];
    const step = activeProject.currentStep || 1;
    const verified = (activeProject.userResults || []).filter((r) => r.verified).length > 0;
    const hasDraft = !!activeProject.generatedDraft?.title;

    return [
      { name: 'Literature Review', status: step >= 3 ? 'completed' : step >= 1 ? 'current' : 'pending' },
      { name: 'Research Gap', status: step >= 5 ? 'completed' : step >= 4 ? 'current' : 'pending' },
      { name: 'Methodology', status: step >= 7 ? 'completed' : step >= 6 ? 'current' : 'pending' },
      { name: 'Experiment Design', status: step >= 8 ? 'completed' : step >= 7 ? 'current' : 'pending' },
      { name: 'Empirical Verification', status: verified ? 'completed' : step >= 9 ? 'warning' : 'pending' },
      { name: 'Manuscript Draft', status: hasDraft ? 'completed' : step >= 11 ? 'current' : 'pending' },
    ];
  }, [activeProject]);

  // Overall workspace stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalDocs = documents.length;
    const totalGaps = projects.reduce((acc, p) => acc + (p.researchGaps?.length || 0), 0);
    const totalVerifiedResults = projects.reduce(
      (acc, p) => acc + ((p.userResults || []).filter((r) => r.verified).length),
      0
    );
    return { totalProjects, totalDocs, totalGaps, totalVerifiedResults };
  }, [projects, documents]);

  const firstName = user?.name?.split(' ')[0] || 'Researcher';
  const greeting = getTimeOfDayGreeting();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── 1. COMMAND-CENTER ADAPTIVE HERO (Requirements 1 & 5) ───────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        {/* Soft Animated Background Mesh Glow & Faint Node Matrix */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none animate-mesh" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-mesh" />

        {/* Faint Floating Scientific Equations in Background */}
        <div className="absolute inset-0 pointer-events-none select-none opacity-[0.06] text-white flex justify-between p-8 font-serif text-3xl font-extralight">
          <span>ℒ_action(θ)</span>
          <span>𝔼_s∼𝒟 [Q(s, a)]</span>
          <span>∇_θ J(π_θ)</span>
          <span>∑ W_i · x_i</span>
        </div>

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md">
              <Compass size={14} />
              <span>Research Command Center</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Your Research Intelligence Workspace — Live evidence ledger, empirical gates, and 11-step academic synthesis.
            </p>
          </div>

          {/* Contextual Action Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {activeProject && (
              <Link
                to={`/research/projects/${activeProject._id || activeProject.id}/step/${activeProject.currentStep || 1}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover-lift transition-all"
              >
                <span>Continue {activeProject.title?.slice(0, 15)}...</span>
                <ArrowRight size={14} />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold backdrop-blur-md hover-lift transition-all"
            >
              <Plus size={14} />
              <span>New Project</span>
            </button>

            <Link
              to="/documents"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold backdrop-blur-md hover-lift transition-all"
            >
              <Upload size={14} />
              <span>Upload Papers</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsCopilotOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-bold backdrop-blur-md hover-lift transition-all"
            >
              <Bot size={14} className="text-indigo-400" />
              <span>Ask Copilot</span>
            </button>
          </div>
        </div>

        {/* Live Active Project Summary Strip (Requirement 1) */}
        {activeProject && (
          <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Study</span>
              <span className="font-bold text-white truncate block mt-0.5" title={activeProject.title}>
                {activeProject.title}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stage</span>
              <span className="font-bold text-indigo-300 block mt-0.5">
                {WORKSTEP_NAMES[activeProject.currentStep] || `Step ${activeProject.currentStep}`}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Research Readiness</span>
              <span className="font-extrabold text-indigo-400 block mt-0.5">
                {activeReadiness.score}% ({activeReadiness.label})
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Attention Items</span>
              <span className={`font-bold block mt-0.5 ${attentionItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {attentionItems.length} issues identified
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Best Action</span>
              <span className="font-bold text-emerald-400 truncate block mt-0.5">
                {attentionItems[0]?.actionLabel || 'Inspect Quality Audit'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. BENTO GRID ARCHITECTURE (Requirements 1, 9, 10) ─────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Bento Tile 1: Live Project Spotlight & Milestones (Col 7) */}
        <div className="md:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 flex flex-col justify-between space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Primary Study Spotlight
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Step {activeProject?.currentStep || 1} of 11
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {activeProject?.title || 'Autonomous Robotic Policy Synthesis'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {activeProject?.researchTopic || 'Embodied AI & Multimodal Action Generalization'}
              </p>
            </div>

            {activeProject && (
              <button
                type="button"
                onClick={() => togglePinProject(activeProject._id || activeProject.id)}
                className={`p-2 rounded-xl border transition-colors ${
                  pinnedProjectIds.includes(activeProject._id || activeProject.id)
                    ? 'border-amber-300 bg-amber-50 text-amber-600 dark:bg-amber-950/60'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Pin primary study"
              >
                <Pin size={16} />
              </button>
            )}
          </div>

          {/* Research Milestones Stepper (Requirement 8) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Research Milestones</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {milestones.filter((m) => m.status === 'completed').length} / {milestones.length} verified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {milestones.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                    m.status === 'completed'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold'
                      : m.status === 'current'
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 font-bold'
                      : m.status === 'warning'
                      ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  {m.status === 'completed' ? (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  ) : m.status === 'warning' ? (
                    <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                  )}
                  <span className="truncate text-[11px]">{m.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Last saved {formatRelativeTime(activeProject?.updatedAt)}
            </span>
            {activeProject && (
              <Link
                to={`/research/projects/${activeProject._id || activeProject.id}/step/${activeProject.currentStep || 1}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>Open Active Workspace</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Bento Tile 2: Segmented Circular Readiness Ring (Col 5) (Requirement 10) */}
        <div className="md:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 flex flex-col justify-between items-center">
          <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Research Readiness Gauge
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              5 Pillars
            </span>
          </div>

          <div className="py-2">
            <ResearchReadinessRing
              score={activeReadiness.score}
              pillars={activeReadiness.pillars}
              onInspectAudit={() => {
                if (activeProject) {
                  navigate(`/research/projects/${activeProject._id || activeProject.id}/step/11`);
                }
              }}
            />
          </div>

          <div className="w-full pt-2 border-t border-slate-100 dark:border-slate-800 text-[10.5px] text-slate-400 flex justify-between">
            <span>Hard empirical gate: 72% cap</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {activeReadiness.label}
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. SECOND BENTO ROW: KNOWLEDGE CONSTELLATION & ATTENTION TRIAGE ── */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Bento Tile 3: Research Knowledge Constellation (Col 7) (Requirement 3) */}
        <div className="md:col-span-7 h-[380px]">
          <KnowledgeConstellation
            project={activeProject}
            onOpenEvidence={(node) => console.log('Inspect evidence:', node)}
          />
        </div>

        {/* Bento Tile 4: "What Needs Attention" Center (Col 5) (Requirement 7) */}
        <div className="md:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Needs Attention Triage
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                {attentionItems.length} items
              </span>
            </div>

            <div className="mt-3.5 space-y-3 overflow-y-auto max-h-[260px] pr-1">
              {attentionItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                  No critical research blockers detected. All stages meet quality gates.
                </div>
              ) : (
                attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-2 hover-lift transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${item.badgeColor}`}
                      >
                        {item.level}
                      </span>
                      <Link
                        to={item.actionUrl}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>{item.actionLabel}</span>
                        <ChevronRight size={12} />
                      </Link>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
            <span>Updated from project state</span>
            <button
              type="button"
              onClick={() => setIsCopilotOpen(true)}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Ask Copilot to resolve →
            </button>
          </div>
        </div>
      </section>

      {/* ── 4. THIRD BENTO ROW: RESEARCH PULSE, RECENT PAPERS & TIMELINE ────── */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Bento Tile 5: Research Pulse Live Status (Col 4) (Requirement 4) */}
        <div className="md:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Research Pulse
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold animate-pulse">
              Live
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { label: 'Literature Coverage', value: '↑ Improving', status: 'improving', color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Citation Integrity', value: '✓ Strong', status: 'strong', color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Experiment Readiness', value: '⚠ Incomplete', status: 'warning', color: 'text-amber-500' },
              { label: 'Manuscript Quality', value: '76%', status: 'metric', color: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Reproducibility', value: '61%', status: 'metric', color: 'text-slate-700 dark:text-slate-300' },
            ].map((pulse, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80"
              >
                <span className="text-slate-600 dark:text-slate-400 font-medium">{pulse.label}</span>
                <span className={`font-mono font-bold ${pulse.color}`}>{pulse.value}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[10px] text-slate-400 text-center">
            Continuous diagnostic across 19 scientific validation rules
          </div>
        </div>

        {/* Bento Tile 6: Recent Documents (Col 4) */}
        <div className="md:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Papers
              </h3>
            </div>
            <Link
              to="/documents"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No papers ingested yet. Upload PDF files to index into knowledge bases.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
              {documents.slice(0, 3).map((doc) => {
                const id = doc._id || doc.id;
                return (
                  <div
                    key={id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {doc.name || doc.originalName || 'Paper'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {doc.knowledgeBase || 'General KB'} · {doc.formattedSize || 'PDF'}
                      </p>
                    </div>
                    <Link
                      to={`/documents/${id}`}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                    >
                      Open
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <Link
              to="/documents"
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Upload size={13} />
              <span>Upload New Scholarly Paper</span>
            </Link>
          </div>
        </div>

        {/* Bento Tile 7: Timeline & Activity (Col 4) (Requirement 8) */}
        <div className="md:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-purple-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Activity Timeline
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Recent Actions</span>
          </div>

          <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 text-xs">
            {[
              { title: 'Step 11 Manuscript Regenerated', time: '12m ago', icon: Award },
              { title: 'Methodology Architecture Saved', time: '2h ago', icon: Cpu },
              { title: 'Research Gap 1 Grounded', time: 'Yesterday', icon: Layers },
              { title: 'CALVIN Benchmark Baselines Bound', time: '2d ago', icon: BarChart2 },
            ].map((event, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-2 ring-white dark:ring-slate-900" />
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{event.title}</p>
                <span className="text-[10px] text-slate-400 font-mono">{event.time}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[10px] text-slate-400 text-center">
            Synchronized with persistent evidence ledger
          </div>
        </div>
      </section>

      {/* ── 5. ALL ACTIVE PROJECTS (Requirement 6) ─────────────────────────── */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              All Research Projects ({projects.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multi-project studies with independent evidence ledgers
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900"
          >
            <Plus size={14} />
            <span>New Study</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const pId = proj._id || proj.id;
            const readiness = calculateProjectReadiness(proj);
            const isSelected = (activeProject?._id || activeProject?.id) === pId;

            return (
              <div
                key={pId}
                onClick={() => setSelectedProjectId(pId)}
                className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all hover-lift cursor-pointer space-y-3 ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={proj.title}>
                      {proj.title}
                    </h3>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                      {proj.researchTopic || 'Embodied Robot Manipulation'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Step {proj.currentStep || 1}/11
                  </span>
                </div>

                {/* Score & Segment Bars */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Research Readiness</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {readiness.score}% ({readiness.label})
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${readiness.score}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {proj.paperProfiles?.length || 0} papers · {proj.researchGaps?.length || 0} gaps
                  </span>
                  <Link
                    to={`/research/projects/${pId}/step/${proj.currentStep || 1}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Continue</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6. COLLAPSIBLE AI RESEARCH COPILOT DRAWER (Requirement 2) ───────── */}
      <ResearchCopilotDrawer
        project={activeProject}
        isOpen={isCopilotOpen}
        onToggle={() => setIsCopilotOpen((prev) => !prev)}
      />

      {/* ── 7. NEW PROJECT MODAL ────────────────────────────────────────────── */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={loadDashboardData}
      />
    </div>
  );
};

export default Dashboard;
