import React from 'react';

const mockData = [
  { day: 'Mon', queries: 120, docs: 12 },
  { day: 'Tue', queries: 210, docs: 28 },
  { day: 'Wed', queries: 180, docs: 19 },
  { day: 'Thu', queries: 310, docs: 45 },
  { day: 'Fri', queries: 280, docs: 32 },
  { day: 'Sat', queries: 95, docs: 8 },
  { day: 'Sun', queries: 150, docs: 14 },
];

const ActivityChart = ({ data = mockData, title = 'Weekly RAG Activity' }) => {
  const maxVal = Math.max(...data.map((d) => d.queries), 350);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h4>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-indigo-600">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block" /> AI Queries
          </span>
          <span className="flex items-center gap-1.5 text-purple-600">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600 inline-block" /> Docs Indexed
          </span>
        </div>
      </div>

      {/* SVG Bar Visualizer */}
      <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 px-2">
        {data.map((item, idx) => {
          const queryHeight = Math.round((item.queries / maxVal) * 100);
          const docHeight = Math.round((item.docs / maxVal) * 250);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="w-full flex items-end justify-center gap-1.5 h-full">
                {/* Query Bar */}
                <div
                  style={{ height: `${queryHeight}%` }}
                  className="w-1/2 max-w-[18px] rounded-t-md bg-indigo-600 group-hover:bg-indigo-700 transition-all relative"
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none font-bold">
                    {item.queries}
                  </span>
                </div>
                {/* Doc Bar */}
                <div
                  style={{ height: `${docHeight}%` }}
                  className="w-1/2 max-w-[18px] rounded-t-md bg-purple-400 group-hover:bg-purple-500 transition-all"
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{item.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityChart;
