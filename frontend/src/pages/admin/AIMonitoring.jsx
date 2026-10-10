import { Activity, Cpu, ShieldCheck, Signal } from 'lucide-react';

const monitors = [
  { title: 'Model health', value: 'Stable', icon: Signal },
  { title: 'API latency', value: '235 ms', icon: Activity },
  { title: 'Inference errors', value: '3', icon: Cpu },
  { title: 'Security status', value: 'No alerts', icon: ShieldCheck },
];

const AIMonitoring = () => {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-indigo-600">AI Monitoring</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Model performance</h1>
        <p className="mt-2 text-sm text-slate-500">Monitor inference health, latency, and production usage for your AI workflows.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {monitors.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon size={20} />
              </div>
              <p className="mt-5 text-sm text-slate-500">{item.title}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIMonitoring;
