import { Link } from 'react-router-dom';
import { Brain, Search, ShieldCheck, Sparkles, Workflow, Database, ArrowRight, Zap, BarChart3, Lock } from 'lucide-react';

const features = [
  {
    title: 'AI-powered search',
    description: 'Find the right documents instantly with semantic search, natural language queries, and contextual answers.',
    icon: Search,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Knowledge orchestration',
    description: 'Organize knowledge bases, research materials, and team documents in one intelligent workspace.',
    icon: Database,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    title: 'Secure collaboration',
    description: 'Protect sensitive content with role-based access, audit logs, and enterprise-grade security controls.',
    icon: Lock,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  {
    title: 'Agent-driven workflows',
    description: 'Automate complex research tasks with AI agents for summaries, analysis, and document operations.',
    icon: Workflow,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    title: 'Advanced analytics',
    description: 'Track usage patterns, AI performance, document insights, and team collaboration metrics.',
    icon: BarChart3,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    title: 'RAG-powered insights',
    description: 'Retrieve relevant context from your documents and generate grounded, sourced AI responses.',
    icon: Zap,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
];

const Features = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-linear-to-br from-indigo-600 via-indigo-700 to-slate-900 px-6 py-20 sm:py-32 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
              <Sparkles size={16} />
              Powerful capabilities
            </p>
            <h1 className="mt-6 text-4xl font-bold sm:text-5xl leading-tight">
              Intelligent features for modern knowledge work.
            </h1>
            <p className="mt-5 text-xl text-indigo-100">
              Everything you need to search, analyze, and collaborate on documents using advanced AI.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition hover:-translate-y-1">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.bg} ${feature.color}`}>
                  <Icon size={24} />
                </div>
                <h2 className="mt-5 text-lg font-bold text-slate-900">{feature.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl bg-white p-8 sm:p-12 shadow-lg border border-slate-200">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Ready to get started?</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">Transform your documents with AI.</h3>
                <p className="mt-3 text-slate-600">Join teams already using DOCUMIND-AI to unlock insights from their documents.</p>
              </div>
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700 whitespace-nowrap shadow-lg">
                Create free account <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Features;
