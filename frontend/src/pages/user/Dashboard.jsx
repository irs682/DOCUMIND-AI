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
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { researchApi } from '../../services/researchApi';
import { fetchDocuments } from '../../api/documentsApi';
import Badge from '../../components/common/Badge';
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
  const [dismissedInsights, setDismissedInsights] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('documind_dismissed_insights') || '[]');
    } catch {
      return [];
    }
  });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedProjectForReadiness, setSelectedProjectForReadiness] = useState(null);

  // Load real workspace data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [projRes, docsRes] = await Promise.allSettled([
        researchApi.getProjects(),
        fetchDocuments(),
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

  // Set default selected project for readiness inspection
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectForReadiness) {
      setSelectedProjectForReadiness(projects[0]);
    }
  }, [projects, selectedProjectForReadiness]);

  // Pin/Unpin project
  const togglePinProject = (id) => {
    setPinnedProjectIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [id, ...prev];
      localStorage.setItem('documind_pinned_projects', JSON.stringify(next));
      return next;
    });
  };

  // Dismiss insight
  const handleDismissInsight = (insightId) => {
    setDismissedInsights((prev) => {
      const next = [...prev, insightId];
      localStorage.setItem('documind_dismissed_insights', JSON.stringify(next));
      return next;
    });
  };

  // Sort projects: pinned first, then by updatedAt descending
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aId = a._id || a.id;
      const bId = b._id || b.id;
      const aPinned = pinnedProjectIds.includes(aId);
      const bPinned = pinnedProjectIds.includes(bId);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }, [projects, pinnedProjectIds]);

  // Derive Dynamic AI Insights from actual project state (Section 9)
  const dynamicInsights = useMemo(() => {
    const list = [];
    projects.forEach((proj) => {
      const projId = proj._id || proj.id;
      const title = proj.title || 'Your research project';
      const papersCount = proj.paperProfiles?.length || proj.documentIds?.length || 0;
      const verifiedResults = (proj.userResults || []).filter((r) => r.verified).length;
      const gapsCount = proj.researchGaps?.length || 0;
      const rqsCount = proj.researchQuestions?.length || 0;

      // Insight 1: Literature coverage
      if (papersCount <= 1 && proj.currentStep >= 3) {
        list.push({
          id: `lit-${projId}`,
          projectId: projId,
          type: 'warning',
          title: `Low Literature Coverage in "${title}"`,
          message: `Only ${papersCount} scholarly source supports the Related Work synthesis. Ingest at least 2 additional papers to strengthen baseline comparison.`,
          actionLabel: 'Add Papers',
          actionUrl: `/research/projects/${projId}/step/1`,
        });
      }

      // Insight 2: Hard gate warning for experimental validation
      if (proj.currentStep >= 9 && verifiedResults === 0) {
        list.push({
          id: `exp-${projId}`,
          projectId: projId,
          type: 'warning',
          title: `Empirical Lab Gate: 0 Verified Results in "${title}"`,
          message: `Your research readiness is capped at 72% because no verified empirical experiment metrics have been logged. Supply benchmark test runs to unlock publication draft mode.`,
          actionLabel: 'Log Results',
          actionUrl: `/research/projects/${projId}/step/9`,
        });
      }

      // Insight 3: Missing evaluation metrics for hypotheses
      if (rqsCount > 0 && (!proj.metrics || proj.metrics.length === 0) && proj.currentStep >= 6) {
        list.push({
          id: `metric-${projId}`,
          projectId: projId,
          type: 'info',
          title: `Hypotheses Lack Evaluation Metrics in "${title}"`,
          message: `${rqsCount} research questions defined, but no quantitative evaluation metrics have been linked yet in Step 8.`,
          actionLabel: 'Define Metrics',
          actionUrl: `/research/projects/${projId}/step/8`,
        });
      }

      // Insight 4: Manuscript draft generated
      if (proj.generatedDraft?.title && proj.currentStep === 11) {
        list.push({
          id: `audit-${projId}`,
          projectId: projId,
          type: 'success',
          title: `Manuscript Draft Ready for Audit in "${title}"`,
          message: `Draft is generated. Run the 19-dimensional scientific validation to verify citations, reproducibility checklist, and claims ledger.`,
          actionLabel: 'Inspect Audit',
          actionUrl: `/research/projects/${projId}/step/11`,
        });
      }
    });

    return list.filter((item) => !dismissedInsights.includes(item.id)).slice(0, 3);
  }, [projects, dismissedInsights]);

  // Recent Activity Feed derived from real timestamps
  const recentActivities = useMemo(() => {
    const events = [];

    projects.forEach((proj) => {
      const projId = proj._id || proj.id;
      events.push({
        id: `proj-${projId}`,
        title: `Research Project updated: "${proj.title}"`,
        subtitle: `Currently at ${WORKSTEP_NAMES[proj.currentStep] || `Step ${proj.currentStep}`}`,
        timestamp: proj.updatedAt || proj.createdAt,
        icon: Sparkles,
        iconColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
        link: `/research/projects/${projId}/step/${proj.currentStep || 1}`,
      });
    });

    documents.slice(0, 5).forEach((doc) => {
      const docId = doc._id || doc.id;
      events.push({
        id: `doc-${docId}`,
        title: `Document indexed: "${doc.name || doc.originalName || 'Paper'}"`,
        subtitle: `${doc.knowledgeBase || 'General KB'} · ${doc.status === 'indexed' ? 'Ready for RAG' : 'Processing'}`,
        timestamp: doc.createdAt,
        icon: FileText,
        iconColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
        link: `/documents/${docId}`,
      });
    });

    return events
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 5);
  }, [projects, documents]);

  // Overall workspace stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalDocs = documents.length;
    const totalGaps = projects.reduce((acc, p) => acc + (p.researchGaps?.length || 0), 0);
    const totalRQs = projects.reduce((acc, p) => acc + (p.researchQuestions?.length || 0), 0);
    const totalVerifiedResults = projects.reduce(
      (acc, p) => acc + ((p.userResults || []).filter((r) => r.verified).length),
      0
    );
    const avgReadiness =
      totalProjects > 0
        ? Math.round(
            projects.reduce((acc, p) => acc + calculateProjectReadiness(p).score, 0) /
              totalProjects
          )
        : 0;

    return {
      totalProjects,
      totalDocs,
      totalGaps,
      totalRQs,
      totalVerifiedResults,
      avgReadiness,
    };
  }, [projects, documents]);

  const firstName = user?.name?.split(' ')[0] || 'Researcher';
  const greeting = getTimeOfDayGreeting();

  // Selected project for 5-pillar visualization
  const activeReadiness = useMemo(() => {
    return calculateProjectReadiness(selectedProjectForReadiness || projects[0]);
  }, [selectedProjectForReadiness, projects]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── 1. Hero / Welcome Section (Requirements 2 & 3) ────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-7 sm:p-9 shadow-xl border border-slate-800">
        {/* Subtle animated background mesh glow & nodes */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none animate-mesh" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-mesh" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />

        {/* Ambient floating node indicator dots */}
        <div className="absolute top-8 right-12 hidden lg:flex items-center gap-3 text-xs text-indigo-200/60 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md animate-float">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Autonomous Research Intelligence Active</span>
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md">
            <Sparkles size={14} />
            <span>Academic Intelligence Workspace</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-300">
              Continue your research, analyze documents, and build evidence-grounded academic work across 11 structured workflow steps.
            </p>
          </div>

          {/* Contextual Quick CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-500 transition-all hover-lift"
            >
              <Plus size={16} />
              <span>+ New Research Project</span>
            </button>

            <Link
              to="/documents"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all hover-lift"
            >
              <Upload size={16} />
              <span>Upload Documents</span>
            </Link>

            <Link
              to="/research"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all hover-lift"
            >
              <Sparkles size={16} />
              <span>Open Research Workspace</span>
            </Link>

            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-indigo-200 backdrop-blur-md transition-all"
            >
              <MessageSquare size={16} />
              <span>Ask DOCUMIND</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Error Banner if any ────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-1 font-bold underline hover:no-underline"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ── 2. Workspace Metrics Overview (Requirement 44 & 48) ─────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover-lift transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
            <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '—' : stats.totalProjects}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Evidence-grounded studies
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover-lift transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Indexed Documents</span>
            <FileText size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '—' : stats.totalDocs}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Searchable in vector store
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover-lift transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Research Gaps</span>
            <Layers size={16} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '—' : stats.totalGaps}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Synthesized literature limits
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover-lift transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Results</span>
            <BarChart2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? '—' : stats.totalVerifiedResults}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Empirical benchmark runs
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover-lift transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Readiness</span>
            <Award size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {loading ? '—' : `${stats.avgReadiness}%`}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Across active workflows
          </p>
        </div>
      </section>

      {/* ── 3. Quick Actions Grid (Requirement 4) ─────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Quick Actions</h2>
          <span className="text-xs text-slate-400">Accelerate your academic workflow</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              title: 'New Research Project',
              desc: 'Initialize 11-step pipeline',
              icon: Plus,
              action: () => setShowNewProjectModal(true),
              color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300',
            },
            {
              title: 'Upload Document',
              desc: 'Add papers or PDF articles',
              icon: Upload,
              to: '/documents',
              color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300',
            },
            {
              title: 'Create Knowledge Base',
              desc: 'Group corpus and sources',
              icon: Database,
              to: '/knowledge-bases',
              color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300',
            },
            {
              title: 'Start Deep Research',
              desc: 'Synthesize literature gaps',
              icon: Sparkles,
              to: '/research',
              color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300',
            },
            {
              title: 'Continue Manuscript',
              desc: 'Edit IMRAD paper draft',
              icon: BookOpen,
              to: projects[0]
                ? `/research/projects/${projects[0]._id || projects[0].id}/step/11`
                : '/research',
              color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300',
            },
            {
              title: 'Analyze Paper',
              desc: 'Compare methods & claims',
              icon: GitCompare,
              to: '/compare',
              color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={item.action ? item.action : () => navigate(item.to)}
              className="group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover-lift cursor-pointer flex flex-col justify-between transition-all"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-3 ${item.color} group-hover:scale-110 transition-transform`}
              >
                <item.icon size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Active Research Projects (Requirements 5, 6, 37, 38) ────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Active Research Projects
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track workflow progress, scientific readiness, and evidence artifacts.
            </p>
          </div>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900 transition-colors"
          >
            <Plus size={14} /> New Project
          </button>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-shimmer"
              />
            ))}
          </div>
        ) : sortedProjects.length === 0 ? (
          /* Empty State (Requirement 16) */
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
              <Sparkles size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Start your first research project
            </h3>
            <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Build an evidence-grounded workflow from literature ingestion to methodology, experiments, and an IEEE/ACM compliant academic manuscript.
            </p>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all hover-lift"
            >
              <Plus size={16} />
              <span>Create Research Project</span>
            </button>
          </div>
        ) : (
          /* Project Cards Grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedProjects.map((proj) => {
              const projId = proj._id || proj.id;
              const isPinned = pinnedProjectIds.includes(projId);
              const readiness = calculateProjectReadiness(proj);
              const currentStep = proj.currentStep || 1;
              const stepName = WORKSTEP_NAMES[currentStep] || `Step ${currentStep}`;
              const papersCount = proj.paperProfiles?.length || proj.documentIds?.length || 0;
              const gapsCount = proj.researchGaps?.length || 0;
              const rqsCount = proj.researchQuestions?.length || 0;
              const verifiedResults = (proj.userResults || []).filter((r) => r.verified).length;

              return (
                <div
                  key={projId}
                  onClick={() => setSelectedProjectForReadiness(proj)}
                  className={`relative p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all hover-lift flex flex-col justify-between ${
                    selectedProjectForReadiness?._id === projId ||
                    selectedProjectForReadiness?.id === projId
                      ? 'border-indigo-500 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Header: Title + Domain + Pin */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3
                          className="text-base font-bold text-slate-900 dark:text-slate-100 truncate"
                          title={proj.title}
                        >
                          {proj.title}
                        </h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                          {proj.researchTopic || proj.domain || 'Academic Research Domain'}
                        </p>
                      </div>

                      {/* Pin Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinProject(projId);
                        }}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          isPinned
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                            : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                        title={isPinned ? 'Unpin project' : 'Pin project to top'}
                      >
                        <Pin size={15} className={isPinned ? 'fill-amber-500' : ''} />
                      </button>
                    </div>

                    {/* Step indicator */}
                    <div className="mt-3.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {stepName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Updated {formatRelativeTime(proj.updatedAt)}
                      </span>
                    </div>

                    {/* Visually Separated: Workflow Progress vs Research Readiness (Requirement 5) */}
                    <div className="mt-3 grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
                          <span>Workflow</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {currentStep} / 11
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${Math.round((currentStep / 11) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
                          <span>Readiness</span>
                          <span
                            className={`font-bold ${
                              readiness.score >= 90
                                ? 'text-emerald-600'
                                : readiness.score >= 70
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-amber-500'
                            }`}
                          >
                            {readiness.score}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              readiness.score >= 90
                                ? 'bg-emerald-500'
                                : readiness.score >= 70
                                ? 'bg-indigo-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${readiness.score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Scientific Badges (Papers, Gaps, RQs, Results) */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <FileText size={13} className="text-blue-500" />
                        <span>{papersCount} Papers</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Layers size={13} className="text-purple-500" />
                        <span>{gapsCount} Gaps</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <HelpCircle size={13} className="text-amber-500" />
                        <span>{rqsCount} RQs</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <BarChart2 size={13} className="text-emerald-500" />
                        <span>{verifiedResults} Verified Results</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {readiness.label}
                    </span>
                    <Link
                      to={`/research/projects/${projId}/step/${currentStep}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 group"
                    >
                      <span>Continue Research</span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 5. Research Readiness Visualization & AI Insights (Grid) ───────── */}
      <section className="grid lg:grid-cols-12 gap-6">
        {/* Research Readiness 5-Pillar Inspector (Requirement 7) */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Research Readiness Visualization
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedProjectForReadiness
                  ? `5-Pillar validation for "${selectedProjectForReadiness.title}"`
                  : 'Select an active project above to evaluate completeness'}
              </p>
            </div>
            {selectedProjectForReadiness && (
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                {activeReadiness.score}% Ready
              </span>
            )}
          </div>

          {/* 5 Pillars Progress Bars */}
          <div className="space-y-3.5 pt-2">
            {[
              {
                name: 'Literature Coverage',
                score: activeReadiness.pillars?.literature || 0,
                desc: 'Ingested paper profiles & related work matrix',
                color: 'bg-blue-500',
              },
              {
                name: 'Methodology Precision',
                score: activeReadiness.pillars?.methodology || 0,
                desc: 'Proposed architecture, pipeline & baseline specs',
                color: 'bg-purple-500',
              },
              {
                name: 'Empirical Experiments',
                score: activeReadiness.pillars?.experiments || 0,
                desc: 'Logged benchmark runs with verified results',
                color: 'bg-emerald-500',
              },
              {
                name: 'Manuscript Quality',
                score: activeReadiness.pillars?.manuscript || 0,
                desc: 'IMRAD draft sections, claims ledger & abstracts',
                color: 'bg-amber-500',
              },
              {
                name: 'Academic Integrity',
                score: activeReadiness.pillars?.integrity || 0,
                desc: 'Grounded research gaps and verified questions',
                color: 'bg-indigo-600',
              },
            ].map((pillar, pIdx) => (
              <div key={pIdx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {pillar.name}
                  </div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {pillar.score}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pillar.color}`}
                    style={{ width: `${pillar.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{pillar.desc}</p>
              </div>
            ))}
          </div>

          {selectedProjectForReadiness && (
            <div className="pt-2">
              <Link
                to={`/research/projects/${
                  selectedProjectForReadiness._id || selectedProjectForReadiness.id
                }/step/11`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <ShieldCheck size={16} />
                <span>Open 19-Dimensional Quality Audit</span>
              </Link>
            </div>
          )}
        </div>

        {/* AI Insights & Contextual Recommendations (Requirement 9) */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  DOCUMIND Insights
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Contextual recommendations from active research state
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {dynamicInsights.length} suggestions
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {dynamicInsights.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                All active research projects meet quality benchmarks. No pending alerts.
              </div>
            ) : (
              dynamicInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {insight.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleDismissInsight(insight.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {insight.message}
                  </p>
                  <div className="pt-1 flex items-center justify-end gap-2">
                    <Link
                      to={insight.actionUrl}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>{insight.actionLabel}</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── 6. Activity Timeline & Recent Documents (Grid) ─────────────────── */}
      <section className="grid lg:grid-cols-12 gap-6">
        {/* Recent Activity Timeline (Requirement 10) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Recent Activity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological timeline of academic workflows
              </p>
            </div>
            <Clock size={16} className="text-slate-400" />
          </div>

          <div className="relative pl-5 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {recentActivities.length === 0 ? (
              <div className="text-xs text-slate-400 p-4">No recent activity logged yet.</div>
            ) : (
              recentActivities.map((act) => {
                const Icon = act.icon;
                return (
                  <div key={act.id} className="relative group">
                    <div className="absolute -left-[25px] top-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    </div>
                    <Link to={act.link} className="block">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {act.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {act.subtitle}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {formatRelativeTime(act.timestamp)}
                      </div>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Documents Section (Requirement 8) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Recent Documents
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uploaded papers and knowledge base vectors
              </p>
            </div>
            <Link
              to="/documents"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800">
              <FileText size={24} className="text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No documents uploaded yet
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
                Upload scholarly PDFs to begin semantic search and evidence extraction.
              </p>
              <Link
                to="/documents"
                className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Upload your first document →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {documents.slice(0, 4).map((doc) => {
                const id = doc._id || doc.id;
                const isReady = doc.status === 'indexed';

                return (
                  <div
                    key={id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.name || doc.originalName || 'Paper'}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {doc.knowledgeBase || 'General KB'} · {doc.formattedSize || 'PDF'} ·{' '}
                          {formatRelativeTime(doc.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isReady
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isReady ? 'Ready' : 'Processing'}
                      </span>
                      <Link
                        to={`/documents/${id}`}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Global New Project Modal (Requirement 15) ───────────────────────── */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={loadDashboardData}
      />
    </div>
  );
};

export default Dashboard;
