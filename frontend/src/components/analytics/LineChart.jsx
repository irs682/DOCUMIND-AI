import React from 'react';

const mockPoints = [
  { label: '00:00', val: 40 },
  { label: '04:00', val: 25 },
  { label: '08:00', val: 85 },
  { label: '12:00', val: 140 },
  { label: '16:00', val: 190 },
  { label: '20:00', val: 110 },
];

const LineChart = ({ title = 'Embedding Latency Trend (ms)', points = mockPoints }) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>

      <div className="h-36 w-full relative flex items-end justify-between px-2">
        <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#4f46e5"
            strokeWidth="3"
            points="10,90 70,110 130,50 190,20 250,10 310,60"
          />
        </svg>
        {points.map((p, i) => (
          <div key={i} className="z-10 flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{p.val}ms</span>
            <div className="h-2 w-2 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/60" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LineChart;
