import React from 'react';
import { BarChart3, FileText, Database, MessageSquare, Cpu, Layers } from 'lucide-react';
import StatCard from '../../components/analytics/StatCard';
import ActivityChart from '../../components/analytics/ActivityChart';
import LineChart from '../../components/analytics/LineChart';
import BarChart from '../../components/analytics/BarChart';

const Analytics = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <BarChart3 size={16} />
          <span>System Insights & Usage</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Analytics & Usage Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Monitor vector ingestion metrics, RAG query volumes, token consumption, and retrieval latencies.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value="45"
          change="+12.5%"
          trend="up"
          icon={FileText}
          subtitle="Indexed in vector stores"
        />
        <StatCard
          title="Vector Chunks"
          value="1,620"
          change="+18.2%"
          trend="up"
          icon={Layers}
          subtitle="Stored in Pinecone index"
        />
        <StatCard
          title="Total AI Queries"
          value="1,345"
          change="+24.8%"
          trend="up"
          icon={MessageSquare}
          subtitle="Executed this month"
        />
        <StatCard
          title="Avg Query Latency"
          value="42 ms"
          change="-8.4%"
          trend="up"
          icon={Cpu}
          subtitle="Cosine retrieval speed"
        />
      </div>

      {/* Main Charts Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ActivityChart />
          <LineChart />
        </div>

        <div className="space-y-6">
          <BarChart />

          {/* Recent Query Logs snippet */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent RAG Queries
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="truncate max-w-[200px] font-medium text-slate-800 dark:text-slate-200">"Q2 Financial revenue findings"</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">96% match</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="truncate max-w-[200px] font-medium text-slate-800 dark:text-slate-200">"AI Safety compliance requirements"</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">92% match</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="truncate max-w-[200px] font-medium text-slate-800 dark:text-slate-200">"Product architecture spec"</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">88% match</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
