import { BarChart3, LineChart, Activity, ShieldCheck } from 'lucide-react';

const adminMetrics = [
  { label: 'Queries per day', value: '820', icon: Activity },
  { label: 'Search accuracy', value: '93%', icon: LineChart },
  { label: 'System uptime', value: '99.9%', icon: ShieldCheck },
  { label: 'Documents scanned', value: '4.9K', icon: BarChart3 },
];

const Analytics = () => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-400">Admin analytics</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">Operational insights</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">View usage and performance metrics for your organization.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {adminMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Icon size={20} />
              </div>
              <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Key trends</h2>
        <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">Platform usage continues to grow across AI queries and document processing. This data helps you plan resource allocation for the next quarter.</p>
      </div>
    </div>
  );
};

export default Analytics;
