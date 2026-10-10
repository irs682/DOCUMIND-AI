import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Bot, CheckCircle2, Clock3, Database, FileText, MessageSquare, Search, Sparkles, Upload } from 'lucide-react';
import StatCard from '../../components/analytics/StatCard';
import Badge from '../../components/common/Badge';
import { fetchDocuments } from '../../api/documentsApi';
import { useAuthContext } from '../../context/AuthContext';

const formatDate = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const statusBadge = (status) => {
  if (status === 'indexed') return <Badge variant="emerald" icon={CheckCircle2}>Indexed</Badge>;
  if (status === 'failed') return <Badge variant="rose" icon={AlertCircle}>Needs attention</Badge>;
  return <Badge variant="amber" icon={Clock3}>Indexing</Badge>;
};

const quickActions = [
  { to: '/search', icon: Search, color: 'bg-blue-50 text-blue-600', title: 'Semantic search', text: 'Find passages across documents' },
  { to: '/agents', icon: Bot, color: 'bg-purple-50 text-purple-600', title: 'Run an AI agent', text: 'Create a research workflow' },
  { to: '/research', icon: Sparkles, color: 'bg-emerald-50 text-emerald-600', title: 'Deep research', text: 'Generate an analysis report' },
];

const Dashboard = () => {
  const { user } = useAuthContext();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setDocuments(await fetchDocuments());
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Your workspace data could not be loaded. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (!documents.some((doc) => doc.status === 'processing')) return undefined;
    const timer = window.setTimeout(loadDashboard, 8000);
    return () => window.clearTimeout(timer);
  }, [documents, loadDashboard]);

  const workspace = useMemo(() => ({
    indexed: documents.filter((doc) => doc.status === 'indexed').length,
    knowledgeBases: new Set(documents.map((doc) => doc.knowledgeBase).filter(Boolean)).size,
    chunks: documents.reduce((total, doc) => total + (doc.chunksCount || 0), 0),
    processing: documents.filter((doc) => doc.status === 'processing').length,
  }), [documents]);

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const recentDocuments = documents.slice(0, 4);

  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-8 text-white shadow-xl">
      <div className="relative z-10 max-w-2xl space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md"><Sparkles size={16} />AI Document Intelligence Active</span>
        <div><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome back, {firstName}</h1><p className="mt-2 text-sm leading-relaxed text-indigo-100">{documents.length ? `Your workspace contains ${documents.length} document${documents.length === 1 ? '' : 's'} ready for AI-assisted research.` : 'Build your knowledge workspace by uploading the first document you want to explore.'}</p></div>
        <div className="flex flex-wrap gap-3 pt-2"><Link to="/documents" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-indigo-600 shadow-md transition hover:bg-indigo-50"><Upload size={16} />Upload documents</Link><Link to="/chat" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-indigo-500/30 px-5 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-indigo-500/50"><MessageSquare size={16} />Start AI chat</Link></div>
      </div>
    </section>

    {error && <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle size={18} /><span>{error}</span><button onClick={loadDashboard} className="ml-auto text-xs font-bold underline">Retry</button></div>}

    <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Indexed Documents" value={loading ? '—' : workspace.indexed} change={workspace.processing ? `${workspace.processing} processing` : 'Ready'} trend="up" icon={FileText} subtitle={`of ${loading ? '—' : documents.length} total documents`} />
      <StatCard title="Knowledge Bases" value={loading ? '—' : workspace.knowledgeBases} change="Active" trend="up" icon={Database} subtitle="Organized knowledge spaces" />
      <StatCard title="Indexed Chunks" value={loading ? '—' : workspace.chunks.toLocaleString()} change="Searchable" trend="up" icon={Search} subtitle="Available for semantic search" />
      <StatCard title="Research Agents" value="Ready" change="Available" trend="up" icon={Bot} subtitle="Generate grounded reports" />
    </section>

    <section className="grid gap-6 lg:grid-cols-3"><div className="space-y-4 lg:col-span-2">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Recent documents</h2><p className="text-xs text-slate-500">Your latest uploads and their indexing status.</p></div><Link to="/documents" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">View all <ArrowRight size={14} /></Link></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">{loading ? <div className="h-44 animate-pulse rounded-xl bg-slate-50" /> : recentDocuments.length ? <div className="divide-y divide-slate-100">{recentDocuments.map((doc) => { const id = doc._id || doc.id; return <div key={id} className="flex items-center justify-between gap-3 rounded-xl p-4 transition hover:bg-slate-50"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><FileText size={20} /></div><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900">{doc.name || doc.originalName}</h3><p className="text-xs font-medium text-slate-500">{doc.knowledgeBase || 'Unassigned'} · {doc.formattedSize || 'Unknown size'} · {formatDate(doc.createdAt)}</p></div></div><div className="flex shrink-0 items-center gap-3">{statusBadge(doc.status)}<Link to={`/documents/${id}`} className="hidden text-xs font-semibold text-indigo-600 sm:block">Details</Link></div></div>; })}</div> : <div className="flex flex-col items-center px-6 py-12 text-center"><div className="mb-3 rounded-xl bg-indigo-50 p-3 text-indigo-600"><FileText size={24} /></div><h3 className="font-bold text-slate-900">No documents yet</h3><p className="mt-1 max-w-sm text-sm text-slate-500">Upload a file to create a searchable, AI-ready knowledge source.</p><Link to="/documents" className="mt-4 text-sm font-bold text-indigo-600">Upload your first document</Link></div>}</div>
    </div><div className="space-y-4"><h2 className="text-lg font-bold text-slate-900">Quick actions</h2><div className="space-y-3">{quickActions.map(({ to, icon: Icon, color, title, text }) => <Link key={to} to={to} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-300 hover:shadow-md"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={20} /></div><div><h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600">{title}</h3><p className="text-xs text-slate-500">{text}</p></div></div><ArrowRight size={16} className="text-slate-400 transition group-hover:text-indigo-600" /></Link>)}</div></div></section>
  </div>;
};

export default Dashboard;
