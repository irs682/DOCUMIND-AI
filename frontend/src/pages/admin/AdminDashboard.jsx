import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  Users,
  RefreshCw,
  Download,
  Search,
  UserCheck,
  TrendingUp,
  Cpu,
  Database,
  Layers,
  HardDrive,
  Zap,
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { getAvatarUrl } from '../../utils/avatar';

// Mock datasets for different time periods
const periodData = {
  '24h': {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
    queries: [140, 210, 890, 1420, 1890, 1310, 950],
    latency: [38, 42, 45, 52, 41, 39, 42],
    path: '0,150 70,135 140,90 210,50 280,20 350,60 420,80',
    usersGained: 14,
    docsProcessed: 88,
  },
  '7d': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    queries: [2400, 3100, 2800, 4100, 3900, 2100, 2900],
    latency: [41, 44, 40, 46, 43, 38, 42],
    path: '0,110 70,75 140,90 210,35 280,45 350,125 420,85',
    usersGained: 48,
    docsProcessed: 320,
  },
  '30d': {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    queries: [12400, 15800, 18200, 21900],
    latency: [45, 42, 41, 39],
    path: '0,130 140,95 280,60 420,25',
    usersGained: 195,
    docsProcessed: 1420,
  },
  '90d': {
    labels: ['Month 1', 'Month 2', 'Month 3'],
    queries: [38000, 49000, 62000],
    latency: [48, 43, 40],
    path: '0,140 210,80 420,20',
    usersGained: 520,
    docsProcessed: 4300,
  },
};

const activityList = [
  { name: 'Maya Patel', action: 'added 32 documents to Product Research', time: '2 min ago', initials: 'MP', color: 'bg-violet-100 text-violet-700' },
  { name: 'System Engine', action: 'completed nightly vector index re-sync (1,620 chunks)', time: '18 min ago', initials: 'SE', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Owen Wilson', action: 'updated the Finance & Legal knowledge base', time: '42 min ago', initials: 'OW', color: 'bg-sky-100 text-sky-700' },
  { name: 'Security Monitor', action: 'blocked an invalid API key attempt from 192.168.1.45', time: '1 hr ago', initials: 'SEC', color: 'bg-rose-100 text-rose-700' },
  { name: 'Sarah Jenkins', action: 'invited 4 team members to Engineering KB', time: '3 hrs ago', initials: 'SJ', color: 'bg-amber-100 text-amber-700' },
];

const serviceIcons = [Cpu, Database, Layers, Zap];

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index < 2 ? 0 : 1)} ${units[index]}`;
};

const formatRelativeTime = (value) => {
  if (!value) return 'Recent';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;
  return `${Math.round(minutes / 1440)} days ago`;
};

function avatarTone(name) {
  const tones = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-rose-500'];
  return tones[(name || 'U').charCodeAt(0) % tones.length];
}

const AdminDashboard = () => {
  const [period, setPeriod] = useState('7d');
  const [hoverIndex, setHoverIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 128,
    adminCount: 3,
    regularUserCount: 125,
    totalDocuments: 492,
    indexedDocuments: 0,
    processingDocuments: 0,
    failedDocuments: 0,
    totalChunks: 4820,
    totalTokens: 184200,
    storageBytes: 0,
    aiQueriesToday: 18429,
    avgLatencyMs: 42,
    uptime: '99.98%',
  });
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [services, setServices] = useState([
    { name: 'API Gateway', status: 'Operational', latency: '12ms', icon: Cpu },
    { name: 'MongoDB Database', status: 'Operational', latency: '4ms', icon: Database },
    { name: 'Vector Embedding Index', status: 'Operational', latency: '18ms', icon: Layers },
    { name: 'Gemini AI Engine', status: 'Operational', latency: '350ms', icon: Zap },
  ]);
  const [attention, setAttention] = useState({ failedDocuments: 0, processingDocuments: 0, aiFailureRate: 0, recentDocuments: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [toast, setToast] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getDashboardStats();
      if (data && data.stats) {
        setStats(data.stats);
      }
      if (data && data.recentUsers) {
        setUsers(data.recentUsers);
      }
      if (data?.systemServices) {
        setServices(data.systemServices.map((service, index) => ({ ...service, icon: serviceIcons[index] || Activity })));
      }
      if (data?.attention) setAttention(data.attention);
      if (data?.recentAudit) setAuditLogs(data.recentAudit);
    } catch {
      // Fallback user fetch
      try {
        const res = await adminApi.getUsers();
        if (res.data && res.data.users) {
          setUsers(res.data.users.slice(0, 6));
        }
      } catch {
        // Mock default
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await adminApi.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId || u.id === userId ? { ...u, role: newRole } : u))
      );
      triggerToast(`Role updated to ${newRole.toUpperCase()}`);
    } catch {
      triggerToast('Failed to update user role');
    }
  };

  const exportReport = () => {
    const activePeriodData = periodData[period];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Metric,Value',
       `Total Users,${stats.totalUsers}`,
       `Admins,${stats.adminCount}`,
       `Documents Indexed,${stats.totalDocuments}`,
       `Vector Chunks,${stats.totalChunks}`,
       `AI Queries Today,${stats.aiQueriesToday}`,
       `Uptime,${stats.uptime}`,
       `Selected Period,${period}`,
       `New Users (${period}),${activePeriodData.usersGained}`,
       `Docs Processed (${period}),${activePeriodData.docsProcessed}`
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `documind_admin_report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Report CSV downloaded successfully!');
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  const activeTrend = periodData[period];

  return (
    <div className="space-y-8 pb-10">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header & Quick Controls */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            All production services operational
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Enterprise Admin Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Real-time analytics, user access control, vector metrics, and system status across DOCUMIND-AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {['24h', '7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setHoverIndex(null);
                }}
                className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                  period === p ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold' : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDashboardData}
            title="Refresh statistics"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 p-2.5 text-slate-600 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''} />
          </button>

          <button
            onClick={exportReport}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Download size={16} /> Export report
          </button>

          <Link
            to="/admin/users"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <UserCheck size={16} /> Manage team
          </Link>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="group rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
              <Users size={22} />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <TrendingUp size={12} /> +12.5%
            </span>
          </div>
          <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">Total Registered Users</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {stats.totalUsers.toLocaleString()}
            </p>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {stats.adminCount} Admins
            </span>
          </div>
        </article>

        <article className="group rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
              <FileText size={22} />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <TrendingUp size={12} /> +8.2%
            </span>
          </div>
          <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">Documents Indexed</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {stats.totalDocuments.toLocaleString()}
            </p>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {stats.totalChunks.toLocaleString()} vector chunks
            </span>
          </div>
        </article>

        <article className="group rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform">
              <Sparkles size={22} />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <TrendingUp size={12} /> +24.7%
            </span>
          </div>
          <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">AI Requests Today</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {stats.aiQueriesToday.toLocaleString()}
            </p>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Avg {stats.avgLatencyMs}ms
            </span>
          </div>
        </article>

        <article className="group rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <ShieldCheck size={22} />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              100% SLA
            </span>
          </div>
          <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">Platform Uptime</p>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{stats.uptime}</p>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> Operational
            </span>
          </div>
        </article>
      </section>

      {/* Operations command center */}
      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-3xl border border-slate-200/80 bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-200"><Activity size={16} /><span className="text-xs font-bold uppercase tracking-[0.16em]">Operations overview</span></div>
              <h2 className="mt-3 text-xl font-bold">Keep the knowledge base reliable</h2>
              <p className="mt-1 text-sm text-slate-300">Live ingestion, retrieval quality, and AI reliability signals.</p>
            </div>
            <Link to="/admin/ai-monitoring" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20">Open AI monitoring</Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10"><p className="text-xs text-slate-300">Index coverage</p><p className="mt-1 text-2xl font-bold">{stats.totalDocuments ? Math.round((stats.indexedDocuments / stats.totalDocuments) * 100) : 100}%</p><p className="mt-1 text-[11px] text-slate-400">{stats.indexedDocuments || 0} of {stats.totalDocuments} indexed</p></div>
            <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10"><p className="text-xs text-slate-300">AI failure rate · 7d</p><p className="mt-1 text-2xl font-bold">{attention.aiFailureRate || 0}%</p><p className="mt-1 text-[11px] text-slate-400">Target: below 2%</p></div>
            <div className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10"><p className="text-xs text-slate-300">Storage footprint</p><p className="mt-1 text-2xl font-bold">{formatBytes(stats.storageBytes)}</p><p className="mt-1 text-[11px] text-slate-400">{stats.totalTokens?.toLocaleString()} indexed tokens</p></div>
          </div>
        </article>

        <article className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-6 shadow-sm">
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"><AlertTriangle size={20} /></span><div><h2 className="font-bold text-slate-950 dark:text-white">Attention queue</h2><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Items that need an administrator review.</p></div></div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between rounded-xl bg-white/80 dark:bg-slate-900/80 px-3 py-2.5"><span className="text-slate-600 dark:text-slate-400">Failed document jobs</span><span className="font-bold text-rose-600 dark:text-rose-400">{attention.failedDocuments || 0}</span></div>
            <div className="flex justify-between rounded-xl bg-white/80 dark:bg-slate-900/80 px-3 py-2.5"><span className="text-slate-600 dark:text-slate-400">Currently processing</span><span className="font-bold text-amber-700 dark:text-amber-400">{attention.processingDocuments || 0}</span></div>
          </div>
          <Link to="/admin/documents" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-300">Review documents <ArrowUpRight size={14} /></Link>
        </article>
      </section>

      {/* Main Charts & Analytics Grid */}
      <section className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        {/* Interactive SVG Trend Area Chart */}
        <article className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">AI Engine Query Volume</h2>
                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  {period.toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Vector retrieval queries, embedding generation, and response latencies.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Query Volume
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Avg Latency
              </span>
            </div>
          </div>

          {/* Interactive SVG Chart */}
          <div className="relative mt-8">
            <svg
              viewBox="0 0 440 180"
              className="h-56 w-full overflow-visible"
              role="img"
              aria-label="AI query trend chart"
            >
              <defs>
                <linearGradient id="indigoAreaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="440" y2="30" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="4 4" />
              <line x1="0" y1="80" x2="440" y2="80" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="4 4" />
              <line x1="0" y1="130" x2="440" y2="130" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="4 4" />

              {/* Gradient Fill */}
              <path
                d={`M ${activeTrend.path} L 420,180 L 0,180 Z`}
                fill="url(#indigoAreaGradient)"
              />

              {/* Smooth Line */}
              <polyline
                points={activeTrend.path}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Points */}
              {activeTrend.labels.map((label, idx) => {
                const x = (420 / (activeTrend.labels.length - 1)) * idx;
                const points = activeTrend.path.split(' ');
                const pt = points[idx] ? points[idx].split(',') : [x, 80];
                const y = parseFloat(pt[1] || 80);

                return (
                  <g key={label} className="cursor-pointer">
                    <circle
                      cx={x}
                      cy={y}
                      r={hoverIndex === idx ? 7 : 4}
                      fill={hoverIndex === idx ? '#4f46e5' : '#ffffff'}
                      stroke="#4f46e5"
                      strokeWidth={hoverIndex === idx ? 3 : 2}
                      onMouseEnter={() => setHoverIndex(idx)}
                      onMouseLeave={() => setHoverIndex(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoverIndex !== null && (
              <div
                className="absolute z-10 rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-white shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
                style={{
                  left: `${(100 / (activeTrend.labels.length - 1)) * hoverIndex}%`,
                  top: '40px',
                }}
              >
                <p className="font-bold text-indigo-300">{activeTrend.labels[hoverIndex]}</p>
                <div className="mt-1 space-y-1">
                  <p>Queries: <span className="font-bold text-white">{activeTrend.queries[hoverIndex]?.toLocaleString()}</span></p>
                  <p>Latency: <span className="font-bold text-emerald-400">{activeTrend.latency[hoverIndex]}ms</span></p>
                </div>
              </div>
            )}
          </div>

          {/* X Axis Labels */}
          <div className="mt-4 flex justify-between text-xs font-semibold text-slate-400 dark:text-slate-500">
            {activeTrend.labels.map((lbl) => (
              <span key={lbl}>{lbl}</span>
            ))}
          </div>

          {/* Metrics summary footer */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 rounded-2xl bg-slate-50/80 dark:bg-slate-850/80 p-4 text-center">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Period Total Queries</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {activeTrend.queries.reduce((a, b) => a + b, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">New Users Joined</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">+{activeTrend.usersGained}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Docs Indexed</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">+{activeTrend.docsProcessed}</p>
            </div>
          </div>
        </article>

        {/* Document Breakdown & Donut Visual */}
        <article className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Document Mix</h2>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
                Index Types
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Distribution of files in vector knowledge base</p>

            {/* Donut Chart Visual */}
            <div className="relative mx-auto my-8 grid h-44 w-44 place-items-center rounded-full" style={{
              background: 'conic-gradient(#4f46e5 0% 48%, #06b6d4 48% 72%, #8b5cf6 72% 89%, #f59e0b 89% 100%)'
            }}>
              <div className="grid h-32 w-32 place-items-center rounded-full bg-white dark:bg-slate-900 text-center shadow-inner">
                <div>
                  <span className="text-2xl font-bold text-slate-950 dark:text-white">{stats.totalDocuments}</span>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Files</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              {[
                { type: 'PDF Documents', percent: '48%', count: '236 files', color: 'bg-indigo-600' },
                { type: 'DOCX Manuals & Specs', percent: '24%', count: '118 files', color: 'bg-cyan-500' },
                { type: 'CSV & Datasets', percent: '17%', count: '84 files', color: 'bg-violet-500' },
                { type: 'TXT & Markdown', percent: '11%', count: '54 files', color: 'bg-amber-500' },
              ].map(({ type, percent, count, color }) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                    <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                    {type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 dark:text-slate-500">{count}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{percent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Storage Used: <strong className="text-slate-800 dark:text-slate-200">{formatBytes(stats.storageBytes)}</strong></span>
            <Link to="/admin/documents" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1">
              View documents <ArrowUpRight size={14} />
            </Link>
          </div>
        </article>
      </section>

      {/* Live User Management Widget & Audit Stream */}
      <section className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        {/* User Quick Directory */}
        <article className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Active Team Directory</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recent registered users from MongoDB</p>
            </div>
            <div className="relative min-w-[14rem]">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-850 transition"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No matching users found in MongoDB.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u._id || u.id || u.email} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white overflow-hidden shadow-xs ${avatarTone(u.name)}`}>
                            {u.avatar ? (
                              <img src={getAvatarUrl(u.avatar)} alt={u.name} className="h-full w-full object-cover" />
                            ) : (
                              (u.name || u.email || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{u.name || 'User'}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-1 ring-violet-600/20 dark:ring-violet-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {u.role === 'admin' ? 'ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleRoleToggle(u._id || u.id, u.role)}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
                        >
                          Toggle Role
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              View full user management <ArrowUpRight size={14} />
            </Link>
          </div>
        </article>

        {/* System Health & Realtime Audit Feed */}
        <div className="space-y-6">
          {/* Services Health */}
          <article className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">System Health</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Service latencies & availability</p>
              </div>
              <Activity className="text-emerald-500" size={20} />
            </div>

            <div className="mt-5 space-y-3.5">
              {services.map(({ name, status, latency, icon: Icon }) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                    <Icon size={15} className="text-slate-400 dark:text-slate-500" />
                    <span>{name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{latency}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={13} /> {status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Audit Stream */}
          <article className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">Live Audit Activity</h2>
              <Link to="/admin/audit-logs" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                Full logs
              </Link>
            </div>

            <div className="mt-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
              {(auditLogs.length ? auditLogs : activityList).slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 pt-3 first:pt-0">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${item.color || (item.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700')}`}>
                    {item.initials || (item.performedByName || 'SA').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">{item.name || item.performedByName || 'System Admin'}</strong>{' '}
                      {item.action || item.details || item.targetResource || 'updated a platform setting'}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.time || formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
