import React from 'react';

const mockCategories = [
  { label: 'PDF Documents', percent: 65, color: 'bg-indigo-600' },
  { label: 'DOCX Specs', percent: 20, color: 'bg-purple-600' },
  { label: 'CSV Datasets', percent: 10, color: 'bg-emerald-600' },
  { label: 'TXT Files', percent: 5, color: 'bg-amber-500' },
];

const BarChart = ({ title = 'Document Type Breakdown', categories = mockCategories }) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>

      <div className="space-y-3">
        {categories.map((cat, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{cat.label}</span>
              <span>{cat.percent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                style={{ width: `${cat.percent}%` }}
                className={`h-full ${cat.color} transition-all duration-500`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarChart;
