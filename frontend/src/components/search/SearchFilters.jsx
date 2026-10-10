import React from 'react';
import { Filter, Sliders, Database, FileText } from 'lucide-react';
import Badge from '../common/Badge';

const SearchFilters = ({
  knowledgeBases = [],
  selectedKbs = [],
  onToggleKb,
  minScore = 0.7,
  onMinScoreChange,
  fileTypes = ['pdf', 'docx', 'csv', 'txt'],
  selectedFileTypes = [],
  onToggleFileType,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
          <Filter size={16} className="text-indigo-600" />
          <span>Search Filters</span>
        </div>
      </div>

      {/* Minimum Similarity Score Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-700">Min Vector Match Score</span>
          <span className="text-indigo-600 font-bold">{Math.round(minScore * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="0.95"
          step="0.05"
          value={minScore}
          onChange={(e) => onMinScoreChange(parseFloat(e.target.value))}
          className="w-full accent-indigo-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Broad (50%)</span>
          <span>Exact (95%)</span>
        </div>
      </div>

      {/* Knowledge Base Checkboxes */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Target Knowledge Bases
        </label>
        <div className="space-y-2">
          {knowledgeBases.map((kb) => {
            const isChecked = selectedKbs.includes(kb.name);
            return (
              <label
                key={kb.id}
                className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer hover:text-slate-900"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleKb(kb.name)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="truncate">{kb.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* File Format Filter */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          File Formats
        </label>
        <div className="flex flex-wrap gap-2">
          {fileTypes.map((type) => {
            const isSelected = selectedFileTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => onToggleFileType(type)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase transition border ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;
